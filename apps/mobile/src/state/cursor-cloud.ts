import {
  createEnvironmentRpcCommand,
  createEnvironmentRpcQueryAtomFamily,
} from "@t3tools/client-runtime/state/runtime";
import { WS_METHODS } from "@t3tools/contracts";
import { connectionAtomRuntime } from "../connection/runtime";

/** Last sweep's outcome for one environment's Cursor Cloud connection. */
export const cursorCloudStatus = createEnvironmentRpcQueryAtomFamily(connectionAtomRuntime, {
  label: "mobile:cursor-cloud:status",
  tag: WS_METHODS.cursorCloudGetStatus,
  staleTimeMs: 10_000,
  refreshIntervalMs: 30_000,
});

export const cursorCloudSync = createEnvironmentRpcCommand(connectionAtomRuntime, {
  label: "mobile:cursor-cloud:sync",
  tag: WS_METHODS.cursorCloudSync,
});
