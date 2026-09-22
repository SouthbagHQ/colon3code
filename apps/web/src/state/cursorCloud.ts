import { WS_METHODS } from "@t3tools/contracts";
import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "@t3tools/client-runtime/state/runtime";

import { connectionAtomRuntime } from "../connection/runtime";

/**
 * Cursor Cloud connection health for one environment. The server sweeps on its
 * own schedule, so this is a cheap read of the last sweep's outcome rather
 * than a call out to Cursor; the refresh interval only keeps settings honest
 * while someone is looking at it.
 */
export const cursorCloudStatus = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "environment-data:cursor-cloud:status",
  tag: WS_METHODS.cursorCloudGetStatus,
  staleTimeMs: 10_000,
  refreshIntervalMs: 30_000,
  idleTtlMs: 60_000,
});

/** Sweep now, for the moment right after someone pastes a key. */
export const cursorCloudSync = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "environment-data:cursor-cloud:sync",
  tag: WS_METHODS.cursorCloudSync,
});
