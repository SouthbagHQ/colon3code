/**
 * Cursor Cloud agent contracts.
 *
 * A Cursor Cloud agent runs on Cursor's infrastructure, not in this
 * environment. :3 Code mirrors those agents into ordinary threads so they
 * sit in the sidebar next to local ones: the server polls Cursor's Cloud
 * Agents API, matches each agent's repository against the repository
 * identity of the environment's projects, and appends the agent's run
 * results to a thread under the matching project.
 *
 * The mirror is read-only. Thread ids carry a `cursor-cloud:` prefix so
 * every client can recognize a mirrored thread without a new field on the
 * thread aggregate — the same trick `import:` plays for imported agent
 * sessions — and swap the composer for a link back to Cursor.
 *
 * @module cursorCloud
 */
import * as Schema from "effect/Schema";

import { IsoDateTime, NonNegativeInt, ThreadId, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProviderDriverKind } from "./providerInstance.ts";

/**
 * Routing key mirrored threads carry in their `modelSelection`. No driver
 * implements it — nothing in this environment can run a cloud agent — but it
 * keeps the provenance of a mirrored thread legible wherever a client reads
 * the selection.
 */
export const CURSOR_CLOUD_DRIVER_KIND = ProviderDriverKind.make("cursorCloud");

/** Placeholder model slug. Cursor does not report a per-run model id. */
export const CURSOR_CLOUD_MODEL = "cloud";

const CURSOR_CLOUD_THREAD_ID_PREFIX = "cursor-cloud:";

/** Deterministic thread id for one Cursor Cloud agent, stable across syncs. */
export function cursorCloudThreadId(agentId: string): ThreadId {
  return ThreadId.make(`${CURSOR_CLOUD_THREAD_ID_PREFIX}${agentId}`);
}

export function isCursorCloudThreadId(threadId: string): boolean {
  return threadId.startsWith(CURSOR_CLOUD_THREAD_ID_PREFIX);
}

/** The Cursor agent id behind a mirrored thread, or `null` for local threads. */
export function cursorCloudAgentIdFromThreadId(threadId: string): string | null {
  if (!isCursorCloudThreadId(threadId)) return null;
  const agentId = threadId.slice(CURSOR_CLOUD_THREAD_ID_PREFIX.length);
  return agentId.length > 0 ? agentId : null;
}

/** Cursor Web URL for one agent, for the "open in Cursor" affordance. */
export function cursorCloudAgentUrl(agentId: string): string {
  return `https://cursor.com/agents/${encodeURIComponent(agentId)}`;
}

/**
 * Health of this environment's Cursor Cloud connection. `unconfigured` means
 * no API key; `error` carries the last failure so settings can show it
 * without the client having to call Cursor itself.
 */
export const CursorCloudConnectionState = Schema.Literals([
  "unconfigured",
  "connected",
  "error",
]);
export type CursorCloudConnectionState = typeof CursorCloudConnectionState.Type;

export const CursorCloudStatus = Schema.Struct({
  state: CursorCloudConnectionState,
  /** Name of the API key as Cursor reports it, plus the owner when there is one. */
  accountLabel: Schema.optional(TrimmedNonEmptyString),
  /** Agents mirrored into threads on the last successful sync. */
  mirroredAgentCount: NonNegativeInt,
  /** Agents skipped because no project on this environment shares their repository. */
  unmatchedAgentCount: NonNegativeInt,
  lastSyncedAt: Schema.optional(IsoDateTime),
  lastError: Schema.optional(TrimmedNonEmptyString),
});
export type CursorCloudStatus = typeof CursorCloudStatus.Type;

export const CursorCloudGetStatusInput = Schema.Struct({});
export type CursorCloudGetStatusInput = typeof CursorCloudGetStatusInput.Type;

export const CursorCloudSyncInput = Schema.Struct({});
export type CursorCloudSyncInput = typeof CursorCloudSyncInput.Type;

export class CursorCloudError extends Schema.TaggedError<CursorCloudError>()("CursorCloudError", {
  operation: Schema.Literals(["read-settings", "call-api", "mirror-agents"]),
  message: TrimmedNonEmptyString,
  cause: Schema.optional(Schema.Defect()),
}) {}
