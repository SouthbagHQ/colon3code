/**
 * Southbag Code (`southbag-code --mode rpc`) as an orchestration-v2 adapter: Pi's JSONL RPC
 * under the `southbag-code` driver kind, so refs and sessions stay separate from Pi.
 * Runtime instructions (the chat voice) ride along as `--append-system-prompt`.
 */
import { SOUTHBAG_CODE_DRIVER_KIND, SouthbagCodeSettings } from "@t3tools/contracts";
import {
  ProviderAdapterDriverCreateError,
  type ProviderAdapterDriver,
  type ProviderAdapterDriverCreateInput,
} from "@t3tools/provider-core/server/adapterDriver";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import * as ProviderContinuationRequests from "@t3tools/provider-core/server/ProviderContinuationRequests";
import { buildRuntimeInstructions } from "@t3tools/provider-core/server/runtimeInstructions";
import { makePiAdapterV2, type PiAdapterV2DriverEnv } from "@t3tools/provider-pi/server";
import type { PiSettings } from "@t3tools/provider-pi/settings";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const SOUTHBAG_CODE_BINARY = "southbag-code";

const DEFAULT_SOUTHBAG_CODE_SETTINGS = Schema.decodeSync(SouthbagCodeSettings)({});

/** Southbag Code settings as the Pi-family adapter reads them. */
export function southbagCodePiSettings(settings: SouthbagCodeSettings): PiSettings {
  return {
    enabled: settings.enabled,
    binaryPath: settings.binaryPath || SOUTHBAG_CODE_BINARY,
    launchArgs: "",
    customModels: settings.customModels,
  };
}

/** Session-invariant system prompt addition: runtime identity, voice and PR linking. */
export function southbagCodeLaunchArgs(): ReadonlyArray<string> {
  return ["--append-system-prompt", buildRuntimeInstructions({ harness: "Southbag Code" })];
}

export type SouthbagCodeAdapterV2DriverEnv = PiAdapterV2DriverEnv;

export const SouthbagCodeAdapterV2Driver: ProviderAdapterDriver<
  SouthbagCodeSettings,
  SouthbagCodeAdapterV2DriverEnv
> = {
  driverKind: SOUTHBAG_CODE_DRIVER_KIND,
  configSchema: SouthbagCodeSettings,
  defaultConfig: (): SouthbagCodeSettings => DEFAULT_SOUTHBAG_CODE_SETTINGS,
  create: Effect.fn("SouthbagCodeAdapterV2Driver.create")(
    function* (input: ProviderAdapterDriverCreateInput<SouthbagCodeSettings>) {
      const hostEnvironment = yield* HostProcess.Environment;
      const continuationRequests = yield* ProviderContinuationRequests.ProviderContinuationRequests;
      return yield* makePiAdapterV2({
        instanceId: input.instanceId,
        settings: southbagCodePiSettings({ ...input.config, enabled: input.enabled }),
        environment: yield* mergeProviderInstanceEnvironment(input.environment, hostEnvironment),
        continuationRequests,
        driverKind: SOUTHBAG_CODE_DRIVER_KIND,
        extraLaunchArgs: southbagCodeLaunchArgs(),
      });
    },
    (effect, input) =>
      effect.pipe(
        Effect.mapError(
          (cause) =>
            new ProviderAdapterDriverCreateError({
              driver: SOUTHBAG_CODE_DRIVER_KIND,
              instanceId: input.instanceId,
              detail: "Failed to create Southbag Code adapter.",
              cause,
            }),
        ),
      ),
  ),
};
