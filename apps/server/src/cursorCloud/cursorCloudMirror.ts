/**
 * Pure mapping from Cursor's Cloud Agents API shapes onto the thread mirror.
 *
 * Kept free of Effect and I/O so the interesting decisions — which repository
 * an agent belongs to, which messages a poll has newly learned, whether the
 * agent still counts as working — are testable without a server.
 *
 * Cursor's v1 API does not return the prompt text of a run, only its final
 * result, so a mirrored transcript is the agent's replies plus the branch or
 * pull request it produced. The agent's name (which Cursor derives from the
 * opening prompt) becomes the thread title.
 *
 * @module cursorCloud/cursorCloudMirror
 */
import { cursorCloudThreadId, type MessageId, type ThreadId } from "@t3tools/contracts";
import { normalizeGitRemoteUrl } from "@t3tools/shared/git";

import type { CursorCloudAgent, CursorCloudRun } from "./CursorCloudApi.ts";

/** Run statuses that mean the agent is still doing work. */
const LIVE_RUN_STATUSES: ReadonlySet<string> = new Set(["CREATING", "RUNNING"]);

export interface CursorCloudMirrorMessage {
  readonly messageId: MessageId;
  readonly role: "assistant";
  readonly text: string;
  readonly createdAt: string;
}

export interface CursorCloudMirrorPlan {
  readonly threadId: ThreadId;
  readonly title: string;
  readonly messages: ReadonlyArray<CursorCloudMirrorMessage>;
  readonly activity: "running" | "settled";
  /** Canonical repository keys this agent touches, in match priority order. */
  readonly repositoryKeys: ReadonlyArray<string>;
  readonly createdAt: string;
}

/**
 * Canonical repository keys for an agent, in the same `host/owner/name` form
 * `RepositoryIdentityResolver` derives for a project, so the two can be
 * compared directly. Configured repos come first; branches the agent actually
 * pushed to are a fallback for agents whose `repos` the API omits.
 */
export function cursorCloudRepositoryKeys(input: {
  readonly agent: CursorCloudAgent;
  readonly runs: ReadonlyArray<CursorCloudRun>;
}): ReadonlyArray<string> {
  const keys: string[] = [];
  const push = (url: string | undefined) => {
    const trimmed = url?.trim();
    if (!trimmed) return;
    const key = normalizeGitRemoteUrl(trimmed);
    if (key.length > 0 && !keys.includes(key)) keys.push(key);
  };

  for (const repo of input.agent.repos ?? []) push(repo.url);
  for (const run of input.runs) {
    for (const branch of run.git?.branches ?? []) push(branch.repoUrl);
  }
  return keys;
}

function messageId(threadId: ThreadId, suffix: string): MessageId {
  return `${threadId}:${suffix}` as MessageId;
}

/** Cursor's terminal statuses other than FINISHED, rendered as a short note. */
function terminalRunNote(status: string): string | null {
  switch (status) {
    case "ERROR":
      return "This run ended with an error in Cursor Cloud.";
    case "CANCELLED":
      return "This run was cancelled in Cursor Cloud.";
    case "EXPIRED":
      return "This run expired in Cursor Cloud.";
    default:
      return null;
  }
}

function branchNote(
  run: CursorCloudRun,
): { readonly suffix: string; readonly text: string } | null {
  for (const branch of run.git?.branches ?? []) {
    if (branch.prUrl) {
      return { suffix: `pr:${branch.prUrl}`, text: `Opened a pull request: ${branch.prUrl}` };
    }
    if (branch.branch) {
      return {
        suffix: `branch:${branch.repoUrl}:${branch.branch}`,
        text: `Pushed branch \`${branch.branch}\` to ${branch.repoUrl}.`,
      };
    }
  }
  return null;
}

function defaultTitle(agentId: string): string {
  return `Cursor Cloud agent ${agentId.replace(/^bc-/u, "").slice(0, 8)}`;
}

/**
 * Build the full mirror for one agent. `runs` is accepted newest-first, the
 * order Cursor returns, and replayed oldest-first so the transcript reads
 * forward. The result is the complete set of messages the mirror knows about;
 * the decider is responsible for appending only what it has not already seen.
 */
export function buildCursorCloudMirrorPlan(input: {
  readonly agent: CursorCloudAgent;
  readonly runs: ReadonlyArray<CursorCloudRun>;
}): CursorCloudMirrorPlan {
  const threadId = cursorCloudThreadId(input.agent.id);
  const oldestFirst = input.runs.toReversed();
  const messages: CursorCloudMirrorMessage[] = [];
  const seenSuffixes = new Set<string>();

  const append = (suffix: string, text: string, createdAt: string) => {
    if (seenSuffixes.has(suffix)) return;
    seenSuffixes.add(suffix);
    messages.push({ messageId: messageId(threadId, suffix), role: "assistant", text, createdAt });
  };

  for (const run of oldestFirst) {
    const result = run.result?.trim();
    if (result) {
      append(`run:${run.id}`, result, run.updatedAt);
    } else {
      const note = terminalRunNote(run.status);
      if (note) append(`run:${run.id}:status`, note, run.updatedAt);
    }
    const branch = branchNote(run);
    if (branch) append(branch.suffix, branch.text, run.updatedAt);
  }

  const latestRun = input.runs[0];
  const activity =
    latestRun !== undefined && LIVE_RUN_STATUSES.has(latestRun.status) ? "running" : "settled";

  return {
    threadId,
    title: input.agent.name?.trim() || defaultTitle(input.agent.id),
    messages,
    activity,
    repositoryKeys: cursorCloudRepositoryKeys(input),
    createdAt: input.agent.createdAt,
  };
}

/**
 * Pick the project a mirrored agent belongs under: the first configured
 * repository of the agent that some project on this environment shares. When
 * several projects sit on the same repository (a repo and a worktree of it),
 * the caller's iteration order decides, so pass projects oldest-first for a
 * stable home across syncs.
 */
export function matchCursorCloudProject<TProject extends { readonly repositoryKey: string | null }>(
  repositoryKeys: ReadonlyArray<string>,
  projects: ReadonlyArray<TProject>,
): TProject | null {
  for (const repositoryKey of repositoryKeys) {
    const match = projects.find((project) => project.repositoryKey === repositoryKey);
    if (match) return match;
  }
  return null;
}
