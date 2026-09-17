/**
 * BUILT_IN_DRIVERS — the static set of `ProviderDriver`s this build ships
 * with.
 *
 * Every driver that the server knows how to instantiate from settings is
 * listed here. The `ProviderInstanceRegistry` iterates this array when
 * resolving `providerInstances` entries; anything not in the array surfaces
 * as an `"unavailable"` shadow snapshot at runtime (see
 * `buildUnavailableProviderSnapshot`).
 *
 * Adding a new first-party driver means:
 *   1. implement `ProviderDriver` in a sibling `Drivers/<Name>Driver.ts`,
 *   2. add it to this array,
 *   3. ensure the runtime layer satisfies its declared `R`.
 *
 * The aggregated `BuiltInDriversEnv` type is the union of every driver's
 * env requirement — the registry layer's `R` is this type, and the runtime
 * layer (ChildProcessSpawner, FileSystem, Path, ServerConfig,
 * OpenCodeRuntime, …) must satisfy it.
 *
 * @module provider/builtInDrivers
 */
import { SouthbagCodeDriver, type SouthbagCodeDriverEnv } from "./Drivers/SouthbagCodeDriver.ts";
import { ClaudeDriver, type ClaudeDriverEnv } from "./Drivers/ClaudeDriver.ts";
import { CodexDriver, type CodexDriverEnv } from "./Drivers/CodexDriver.ts";
import { CursorDriver, type CursorDriverEnv } from "./Drivers/CursorDriver.ts";
import { GrokDriver, type GrokDriverEnv } from "./Drivers/GrokDriver.ts";
import { OpenCodeDriver, type OpenCodeDriverEnv } from "./Drivers/OpenCodeDriver.ts";
import { AntigravityDriver, type AntigravityDriverEnv } from "./Drivers/AntigravityDriver.ts";
import type { AnyProviderDriver } from "./ProviderDriver.ts";

/**
 * Union of infrastructure services required to construct any built-in
 * driver. The registry layer declares `R = BuiltInDriversEnv`; the runtime
 * layer must provide every service in this union.
 */
export type BuiltInDriversEnv =
  | SouthbagCodeDriverEnv
  | ClaudeDriverEnv
  | CodexDriverEnv
  | CursorDriverEnv
  | GrokDriverEnv
  | OpenCodeDriverEnv
  | AntigravityDriverEnv;

/**
 * Ordered list of built-in drivers. The registry is keyed by `driverKind`, so
 * order has no effect on instance lookup, but it is a product decision all the
 * same: the server publishes providers in this order (see
 * `BUILT_IN_DRIVER_ORDER` in `providerStatusCache.ts`, which must match) and
 * the web picks the first picker-ready entry as the default provider for new
 * threads. Southbag Code is first on purpose so that, when its binary is
 * installed, it is the provider new threads start on.
 */
export const BUILT_IN_DRIVERS: ReadonlyArray<AnyProviderDriver<BuiltInDriversEnv>> = [
  SouthbagCodeDriver,
  CodexDriver,
  ClaudeDriver,
  CursorDriver,
  GrokDriver,
  OpenCodeDriver,
  AntigravityDriver,
];
