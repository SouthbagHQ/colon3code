import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  cursorCloudThreadId,
  ProjectId,
  type OrchestrationCommand,
  type OrchestrationProjectShell,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { FetchHttpClient } from "effect/unstable/http";

import * as OrchestrationEngine from "../orchestration/Services/OrchestrationEngine.ts";
import * as ProjectionSnapshotQuery from "../orchestration/Services/ProjectionSnapshotQuery.ts";
import * as ServerSettings from "../serverSettings.ts";
import type { CursorCloudAgent, CursorCloudApiClient, CursorCloudRun } from "./CursorCloudApi.ts";
import { CursorCloudApiError } from "./CursorCloudApi.ts";
import { make } from "./CursorCloudSync.ts";

const AGENT_ID = "bc-00000000-0000-0000-0000-000000000001";
const THREAD_ID = cursorCloudThreadId(AGENT_ID);
const LOCAL_PROJECT_ID = ProjectId.make("project-local");

const projectShell = (input: {
  readonly id: ProjectId;
  readonly canonicalKey: string | null;
  readonly createdAt: string;
}): OrchestrationProjectShell =>
  ({
    id: input.id,
    title: "colon3code",
    workspaceRoot: `/work/${input.id}`,
    ...(input.canonicalKey === null
      ? {}
      : {
          repositoryIdentity: {
            canonicalKey: input.canonicalKey,
            locator: {
              source: "git-remote" as const,
              remoteName: "origin",
              remoteUrl: `https://${input.canonicalKey}`,
            },
          },
        }),
    defaultModelSelection: null,
    scripts: [],
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
  }) as OrchestrationProjectShell;

const agent: CursorCloudAgent = {
  id: AGENT_ID,
  name: "Add a README",
  status: "ACTIVE",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:30:00.000Z",
  repos: [{ url: "https://github.com/SouthbagHQ/colon3code" }],
};

const finishedRun: CursorCloudRun = {
  id: "run-1",
  agentId: AGENT_ID,
  status: "FINISHED",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:10:00.000Z",
  result: "Added README.md",
};

interface HarnessOptions {
  readonly apiKey?: string;
  readonly enabled?: boolean;
  readonly projects?: ReadonlyArray<OrchestrationProjectShell>;
  readonly threadLifecycle?: {
    readonly archivedAt: string | null;
    readonly deletedAt: string | null;
  } | null;
  readonly client?: Partial<CursorCloudApiClient>;
}

const harness = Effect.fn("harness")(function* (options: HarnessOptions = {}) {
  const dispatched: OrchestrationCommand[] = [];
  const client: CursorCloudApiClient = {
    getApiKeyInfo: () => Effect.succeed({ apiKeyName: "CI key", userEmail: "dev@example.com" }),
    listAgents: () => Effect.succeed([agent]),
    getAgent: () => Effect.succeed(agent),
    listRuns: () => Effect.succeed([finishedRun]),
    ...options.client,
  };

  const sync = yield* make({ makeClient: () => Effect.succeed(client) }).pipe(
    Effect.provide(
      Layer.mergeAll(
        Layer.mock(OrchestrationEngine.OrchestrationEngineService)({
          dispatch: (command) =>
            Effect.sync(() => {
              dispatched.push(command);
              return { sequence: dispatched.length };
            }),
        }),
        Layer.mock(ProjectionSnapshotQuery.ProjectionSnapshotQuery)({
          getProjectShells: () =>
            Effect.succeed(
              options.projects ?? [
                projectShell({
                  id: LOCAL_PROJECT_ID,
                  canonicalKey: "github.com/southbaghq/colon3code",
                  createdAt: "2026-01-01T00:00:00.000Z",
                }),
              ],
            ),
          getThreadLifecycleById: () =>
            Effect.succeed(
              options.threadLifecycle == null
                ? Option.none()
                : Option.some(options.threadLifecycle),
            ),
        }),
        FetchHttpClient.layer,
        ServerSettings.layerTest({
          cursorCloud: {
            enabled: options.enabled ?? true,
            apiKey: options.apiKey ?? "key_test",
          },
        }),
      ),
    ),
  );

  return { sync, dispatched };
});

it.layer(NodeServices.layer)("CursorCloudSync", (it) => {
  it.effect("creates a thread under the project that shares the agent's repository", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness();

      const status = yield* sync.refresh;

      expect(status.state).toBe("connected");
      expect(status.mirroredAgentCount).toBe(1);
      expect(status.unmatchedAgentCount).toBe(0);
      expect(status.accountLabel).toBe("CI key (dev@example.com)");
      expect(dispatched.map((command) => command.type)).toEqual([
        "thread.create",
        "thread.external.mirror",
      ]);
      expect(dispatched[0]).toMatchObject({
        threadId: THREAD_ID,
        projectId: LOCAL_PROJECT_ID,
        title: "Add a README",
        historyImport: true,
      });
      expect(dispatched[1]).toMatchObject({ threadId: THREAD_ID, activity: "settled" });
    }),
  );

  it.effect("only mirrors an existing thread, without recreating it", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness({
        threadLifecycle: { archivedAt: null, deletedAt: null },
      });

      yield* sync.refresh;

      expect(dispatched.map((command) => command.type)).toEqual(["thread.external.mirror"]);
    }),
  );

  it.effect("leaves an archived or deleted mirror alone", () =>
    Effect.gen(function* () {
      const deleted = yield* harness({
        threadLifecycle: { archivedAt: null, deletedAt: "2026-09-02T00:00:00.000Z" },
      });
      yield* deleted.sync.refresh;
      expect(deleted.dispatched).toEqual([]);

      const archived = yield* harness({
        threadLifecycle: { archivedAt: "2026-09-02T00:00:00.000Z", deletedAt: null },
      });
      const status = yield* archived.sync.refresh;
      expect(archived.dispatched).toEqual([]);
      // A dismissed agent is neither mirrored nor waiting on a checkout.
      expect(status.mirroredAgentCount).toBe(0);
      expect(status.unmatchedAgentCount).toBe(0);
    }),
  );

  it.effect("counts an agent with no matching project instead of mirroring it", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness({
        projects: [
          projectShell({
            id: ProjectId.make("project-other"),
            canonicalKey: "github.com/acme/unrelated",
            createdAt: "2026-01-01T00:00:00.000Z",
          }),
        ],
      });

      const status = yield* sync.refresh;

      expect(dispatched).toEqual([]);
      expect(status.mirroredAgentCount).toBe(0);
      expect(status.unmatchedAgentCount).toBe(1);
    }),
  );

  it.effect("reports an unusable key without touching threads", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness({
        client: {
          getApiKeyInfo: () =>
            Effect.fail(
              new CursorCloudApiError({
                operation: "getApiKeyInfo",
                status: 401,
                detail: "the API key was rejected",
              }),
            ),
        },
      });

      const status = yield* sync.refresh;

      expect(status.state).toBe("error");
      expect(status.lastError).toContain("rejected");
      expect(dispatched).toEqual([]);
    }),
  );

  it.effect("stays idle while no key is configured", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness({ apiKey: "" });

      const status = yield* sync.refresh;

      expect(status.state).toBe("unconfigured");
      expect(dispatched).toEqual([]);
    }),
  );

  it.effect("stays idle while mirroring is switched off", () =>
    Effect.gen(function* () {
      const { sync, dispatched } = yield* harness({ enabled: false });

      expect((yield* sync.refresh).state).toBe("unconfigured");
      expect(dispatched).toEqual([]);
    }),
  );
});
