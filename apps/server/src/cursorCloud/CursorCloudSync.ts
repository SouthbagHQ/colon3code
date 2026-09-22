/**
 * CursorCloudSync — keeps this environment's threads in step with the Cursor
 * Cloud agents the configured API key can see.
 *
 * Cloud agents belong to a Cursor account, not to a machine, so the sweep is
 * a poll rather than a subscription: list the account's agents, look up the
 * repository each one works on, and mirror it into a thread under the project
 * that shares that repository. An agent whose repository no project on this
 * environment has checked out is counted and skipped — a mirror with nowhere
 * to live would be a project with no files behind it.
 *
 * Every write goes through `thread.external.mirror`, which is idempotent, so
 * a sweep that learns nothing new dispatches nothing and the sidebar does not
 * churn.
 *
 * @module cursorCloud/CursorCloudSync
 */
import {
  CommandId,
  CURSOR_CLOUD_DRIVER_KIND,
  CURSOR_CLOUD_MODEL,
  DEFAULT_PROVIDER_INTERACTION_MODE,
  DEFAULT_RUNTIME_MODE,
  defaultInstanceIdForDriver,
  type CursorCloudStatus,
  type OrchestrationProjectShell,
} from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import type * as Scope from "effect/Scope";
import { HttpClient } from "effect/unstable/http";

import * as OrchestrationEngine from "../orchestration/Services/OrchestrationEngine.ts";
import * as ProjectionSnapshotQuery from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import { forkParked } from "../serverActivation.ts";
import { ServerSettingsService } from "../serverSettings.ts";
import {
  makeCursorCloudApiClient,
  type CursorCloudAgentSummary,
  type CursorCloudApiClient,
} from "./CursorCloudApi.ts";
import { buildCursorCloudMirrorPlan, matchCursorCloudProject } from "./cursorCloudMirror.ts";

/**
 * Cloud agents are minutes-long, not seconds-long, and each sweep costs one
 * request per agent. A minute keeps a running agent's replies arriving while
 * the poll stays well inside Cursor's rate limits.
 */
const SWEEP_INTERVAL = Schedule.spaced("1 minute");

/** Agents mirrored per sweep. Older agents stay readable in Cursor. */
const MAX_AGENTS_PER_SWEEP = 100;

const nowIso = Effect.map(DateTime.now, DateTime.formatIso);

const CURSOR_CLOUD_MODEL_SELECTION = {
  instanceId: defaultInstanceIdForDriver(CURSOR_CLOUD_DRIVER_KIND),
  model: CURSOR_CLOUD_MODEL,
} as const;

interface ProjectRepositoryEntry {
  readonly project: OrchestrationProjectShell;
  readonly repositoryKey: string | null;
}

export class CursorCloudSync extends Context.Service<
  CursorCloudSync,
  {
    /** Fork the background sweep. Idempotent per scope. */
    readonly start: () => Effect.Effect<void, never, Scope.Scope>;
    /** Run one sweep now and return the resulting status. */
    readonly refresh: Effect.Effect<CursorCloudStatus>;
    /** Last known status without touching the network. */
    readonly status: Effect.Effect<CursorCloudStatus>;
  }
>()("t3/cursorCloud/CursorCloudSync") {}

/** @public Service construction is part of the canonical Effect module API. */
export const make = Effect.gen(function* () {
  const engine = yield* OrchestrationEngine.OrchestrationEngineService;
  const snapshots = yield* ProjectionSnapshotQuery.ProjectionSnapshotQuery;
  const serverSettings = yield* ServerSettingsService;
  const httpClient = yield* HttpClient.HttpClient;
  const crypto = yield* Crypto.Crypto;
  const sweepSemaphore = yield* Semaphore.make(1);

  let lastStatus: CursorCloudStatus = {
    state: "unconfigured",
    mirroredAgentCount: 0,
    unmatchedAgentCount: 0,
  };
  // Rebuilt only when the configured key changes, so a sweep does not
  // reconstruct the client (and re-resolve the base URL) every minute.
  let cachedClient: { readonly apiKey: string; readonly client: CursorCloudApiClient } | null =
    null;

  const clientFor = Effect.fn("CursorCloudSync.clientFor")(function* (
    apiKey: string,
  ): Effect.fn.Return<CursorCloudApiClient> {
    if (cachedClient?.apiKey === apiKey) return cachedClient.client;
    const client = yield* makeCursorCloudApiClient({ apiKey }).pipe(
      Effect.provideService(HttpClient.HttpClient, httpClient),
    );
    cachedClient = { apiKey, client };
    return client;
  });

  const projectRepositories = snapshots.getProjectShells().pipe(
    Effect.map((projects) =>
      // Oldest first so an agent keeps the same home when a repository is
      // checked out more than once on this environment.
      [...projects]
        .toSorted((left, right) => left.createdAt.localeCompare(right.createdAt))
        .map((project): ProjectRepositoryEntry => ({
          project,
          repositoryKey: project.repositoryIdentity?.canonicalKey ?? null,
        })),
    ),
    Effect.catchCause(() => Effect.succeed([] as ReadonlyArray<ProjectRepositoryEntry>)),
  );

  const mirrorAgent = Effect.fn("CursorCloudSync.mirrorAgent")(function* (input: {
    readonly client: CursorCloudApiClient;
    readonly summary: CursorCloudAgentSummary;
    readonly projects: ReadonlyArray<ProjectRepositoryEntry>;
  }) {
    const agent = yield* input.client.getAgent(input.summary.id);
    const runs = yield* input.client.listRuns(input.summary.id);
    const plan = buildCursorCloudMirrorPlan({ agent, runs });
    const match = matchCursorCloudProject(plan.repositoryKeys, input.projects);
    if (match === null) return "unmatched" as const;

    const existing = yield* snapshots.getThreadShellById(plan.threadId);
    if (Option.isNone(existing)) {
      // Nothing to mirror yet and no thread to hang it on: wait for the
      // agent's first result rather than parking an empty row in the sidebar.
      if (plan.messages.length === 0) return "unmatched" as const;
      yield* engine.dispatch({
        type: "thread.create",
        commandId: CommandId.make(yield* crypto.randomUUIDv4),
        threadId: plan.threadId,
        projectId: match.project.id,
        title: plan.title,
        modelSelection: CURSOR_CLOUD_MODEL_SELECTION,
        runtimeMode: DEFAULT_RUNTIME_MODE,
        interactionMode: DEFAULT_PROVIDER_INTERACTION_MODE,
        branch: null,
        worktreePath: null,
        createdAt: plan.createdAt,
        historyImport: true,
      });
    }

    yield* engine.dispatch({
      type: "thread.external.mirror",
      commandId: CommandId.make(yield* crypto.randomUUIDv4),
      threadId: plan.threadId,
      messages: plan.messages,
      activity: plan.activity,
      occurredAt: yield* nowIso,
    });

    return "mirrored" as const;
  });

  const runSweep = Effect.fn("CursorCloudSync.sweep")(
    function* (): Effect.fn.Return<CursorCloudStatus> {
      const settings = yield* serverSettings.getSettings.pipe(Effect.option);
      const cursorCloud = Option.isSome(settings) ? settings.value.cursorCloud : undefined;
      const apiKey = cursorCloud?.apiKey.trim() ?? "";
      if (cursorCloud === undefined || !cursorCloud.enabled || apiKey.length === 0) {
        lastStatus = { state: "unconfigured", mirroredAgentCount: 0, unmatchedAgentCount: 0 };
        return lastStatus;
      }

      const client = yield* clientFor(apiKey);
      const outcome = yield* Effect.gen(function* () {
        const keyInfo = yield* client.getApiKeyInfo();
        const agents = yield* client.listAgents();
        const projects = yield* projectRepositories;

        let mirrored = 0;
        let unmatched = 0;
        for (const summary of agents.slice(0, MAX_AGENTS_PER_SWEEP)) {
          // One unreachable or malformed agent must not abandon the sweep:
          // the rest of the account's agents are still worth mirroring.
          const result = yield* mirrorAgent({ client, summary, projects }).pipe(
            Effect.catchCause((cause) =>
              Effect.logWarning("Could not mirror a Cursor Cloud agent", {
                agentId: summary.id,
                cause,
              }).pipe(Effect.as("failed" as const)),
            ),
          );
          if (result === "mirrored") mirrored += 1;
          else if (result === "unmatched") unmatched += 1;
        }

        const accountLabel = keyInfo.userEmail
          ? `${keyInfo.apiKeyName} (${keyInfo.userEmail})`
          : keyInfo.apiKeyName;
        return {
          state: "connected",
          ...(accountLabel.trim().length > 0 ? { accountLabel } : {}),
          mirroredAgentCount: mirrored,
          unmatchedAgentCount: unmatched,
          lastSyncedAt: yield* nowIso,
        } satisfies CursorCloudStatus;
      }).pipe(
        Effect.catch((error) =>
          Effect.succeed({
            state: "error",
            mirroredAgentCount: lastStatus.mirroredAgentCount,
            unmatchedAgentCount: lastStatus.unmatchedAgentCount,
            ...(lastStatus.lastSyncedAt === undefined
              ? {}
              : { lastSyncedAt: lastStatus.lastSyncedAt }),
            lastError: error.message,
          } satisfies CursorCloudStatus),
        ),
      );

      lastStatus = outcome;
      return outcome;
    },
  );

  // One sweep at a time: the scheduled sweep and a settings-triggered refresh
  // would otherwise race each other into duplicate thread.create dispatches.
  const sweep = sweepSemaphore.withPermits(1)(runSweep());

  const start: CursorCloudSync["Service"]["start"] = () =>
    forkParked(
      sweep.pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Cursor Cloud sweep failed", { cause }).pipe(Effect.asVoid),
        ),
        Effect.repeat(SWEEP_INTERVAL),
        Effect.asVoid,
      ),
    );

  return {
    start,
    refresh: sweep,
    status: Effect.sync(() => lastStatus),
  } satisfies CursorCloudSync["Service"];
});

export const layer = Layer.effect(CursorCloudSync, make);

const IDLE_STATUS: CursorCloudStatus = {
  state: "unconfigured",
  mirroredAgentCount: 0,
  unmatchedAgentCount: 0,
};

/**
 * Inert stand-in for suites that only need the service to exist. Nothing
 * about orchestration depends on Cursor being reachable, so tests that are
 * not about the mirror should never pay for a real sweep.
 */
export const layerTest = Layer.succeed(CursorCloudSync, {
  start: () => Effect.void,
  refresh: Effect.succeed(IDLE_STATUS),
  status: Effect.succeed(IDLE_STATUS),
});
