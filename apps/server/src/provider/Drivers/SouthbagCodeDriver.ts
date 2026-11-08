/**
 * `ProviderDriver` for Southbag Code (npm `@southbag/code`). Registered first in
 * `BUILT_IN_DRIVERS` so an installed binary becomes the default provider.
 */
import {
  SOUTHBAG_CODE_DRIVER_KIND,
  SouthbagCodeSettings,
  type ServerProvider,
  providerDisplayName,
} from "@t3tools/contracts";
import {
  defaultProviderContinuationIdentity,
  type ProviderDriver,
  type ProviderInstance,
} from "@t3tools/provider-core/server/driver";
import { ProviderDriverError } from "@t3tools/provider-core/server/errors";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import {
  makeCachedProviderMaintenanceResolution,
  makePackageManagedProviderMaintenanceResolver,
  resolveProviderMaintenanceCapabilitiesEffect,
} from "@t3tools/provider-core/server/maintenanceResolver";
import { makeManagedServerProvider } from "@t3tools/provider-core/server/managedProvider";
import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import * as ProviderLatestVersions from "@t3tools/provider-core/server/ProviderLatestVersions";
import type { ServerProviderDraft } from "@t3tools/provider-core/server/snapshotProbe";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
  type ProviderSnapshotSettings,
} from "@t3tools/provider-core/server/snapshotSettings";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";
import * as HttpClient from "effect/http/HttpClient";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import { makeSouthbagCodeTextGeneration } from "../../textGeneration/SouthbagCodeTextGeneration.ts";
import {
  SouthbagCodeAdapterV2Driver,
  type SouthbagCodeAdapterV2DriverEnv,
} from "../SouthbagCodeAdapter.ts";
import {
  buildInitialSouthbagCodeProviderSnapshot,
  checkSouthbagCodeProviderStatus,
  enrichSouthbagCodeSnapshot,
} from "../SouthbagCodeProvider.ts";

const decodeSouthbagCodeSettings = Schema.decodeSync(SouthbagCodeSettings);

const DRIVER_KIND = SOUTHBAG_CODE_DRIVER_KIND;
export const SOUTHBAG_CODE_NPM_PACKAGE = "@southbag/code";

/** No native self-updater: the binary is an npm global, so "update" runs the package manager. */
const UPDATE = makePackageManagedProviderMaintenanceResolver({
  provider: DRIVER_KIND,
  npmPackageName: SOUTHBAG_CODE_NPM_PACKAGE,
  nativeUpdate: null,
});

export type SouthbagCodeDriverEnv =
  | SouthbagCodeAdapterV2DriverEnv
  | ProviderHost.ProviderHost
  | ChildProcessSpawner.ChildProcessSpawner
  | FileSystem.FileSystem
  | HttpClient.HttpClient
  | ProviderLatestVersions.ProviderLatestVersions
  | Path.Path;

const withInstanceIdentity =
  (input: {
    readonly instanceId: ProviderInstance["instanceId"];
    readonly displayName: string | undefined;
    readonly accentColor: string | undefined;
    readonly continuationGroupKey: string;
  }) =>
  (snapshot: ServerProviderDraft): ServerProvider => ({
    ...snapshot,
    instanceId: input.instanceId,
    driver: DRIVER_KIND,
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(input.accentColor ? { accentColor: input.accentColor } : {}),
    continuation: { groupKey: input.continuationGroupKey },
  });

export const SouthbagCodeDriver: ProviderDriver<
  SouthbagCodeSettings,
  SouthbagCodeDriverEnv,
  Path.Path
> = {
  driverKind: DRIVER_KIND,
  metadata: {
    displayName: providerDisplayName(DRIVER_KIND),
    supportsMultipleInstances: true,
  },
  configSchema: SouthbagCodeSettings,
  defaultConfig: (): SouthbagCodeSettings => decodeSouthbagCodeSettings({}),
  create: Effect.fn("SouthbagCodeDriver.create")(function* ({
    instanceId,
    displayName,
    accentColor,
    environment,
    enabled,
    config,
  }) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;
    const httpClient = yield* HttpClient.HttpClient;
    const latestVersions = yield* ProviderLatestVersions.ProviderLatestVersions;
    const host = yield* ProviderHost.ProviderHost;
    const { cwd } = host.paths;
    const processEnv = yield* mergeProviderInstanceEnvironment(environment);
    const continuationIdentity = defaultProviderContinuationIdentity({
      driverKind: DRIVER_KIND,
      instanceId,
    });
    const stampIdentity = withInstanceIdentity({
      instanceId,
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const effectiveConfig = { ...config, enabled } satisfies SouthbagCodeSettings;
    const resolveMaintenance = yield* makeCachedProviderMaintenanceResolution(
      resolveProviderMaintenanceCapabilitiesEffect(UPDATE, {
        binaryPath: effectiveConfig.binaryPath,
        env: processEnv,
      }).pipe(
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(FileSystem.FileSystem, fileSystem),
        Effect.provideService(Path.Path, pathService),
      ),
    );

    const orchestrationAdapter = yield* SouthbagCodeAdapterV2Driver.create({
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      config,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: "Failed to build Southbag Code orchestration adapter.",
            cause,
          }),
      ),
    );
    const textGeneration = yield* makeSouthbagCodeTextGeneration(effectiveConfig, processEnv);

    const checkProvider = checkSouthbagCodeProviderStatus(effectiveConfig, processEnv, cwd).pipe(
      Effect.map(stampIdentity),
      Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
    );

    const snapshotSettings = yield* makeProviderSnapshotSettingsSource(effectiveConfig);
    const snapshot = yield* makeManagedServerProvider<
      ProviderSnapshotSettings<SouthbagCodeSettings>
    >({
      resolveMaintenance,
      getSettings: snapshotSettings.getSettings,
      streamSettings: snapshotSettings.streamSettings,
      haveSettingsChanged: haveProviderSnapshotSettingsChanged,
      initialSnapshot: (settings) =>
        buildInitialSouthbagCodeProviderSnapshot(settings.provider).pipe(Effect.map(stampIdentity)),
      checkProvider,
      enrichSnapshot: ({ settings, snapshot: currentSnapshot, publishSnapshot }) =>
        resolveMaintenance().pipe(
          Effect.flatMap((maintenanceCapabilities) =>
            enrichSouthbagCodeSnapshot({
              snapshot: currentSnapshot,
              maintenanceCapabilities,
              enableProviderUpdateChecks: settings.enableProviderUpdateChecks,
              publishSnapshot,
            }),
          ),
          Effect.provideService(HttpClient.HttpClient, httpClient),
          Effect.provideService(ProviderLatestVersions.ProviderLatestVersions, latestVersions),
        ),
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DRIVER_KIND,
            instanceId,
            detail: "Failed to build Southbag Code snapshot.",
            cause,
          }),
      ),
    );

    return {
      instanceId,
      driverKind: DRIVER_KIND,
      continuationIdentity,
      displayName,
      accentColor,
      enabled,
      snapshot,
      orchestrationAdapter,
      textGeneration,
    } satisfies ProviderInstance;
  }),
};
