import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  ProviderDriverKind,
  ProviderInstanceId,
  SOUTHBAG_CODE_DRIVER_KIND,
  type ServerProvider,
  ServerSettings,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import * as BackgroundPolicy from "../../background/BackgroundPolicy.ts";
import { ServerConfig } from "../../config.ts";
import { ServerSettingsService } from "../../serverSettings.ts";
import { BUILT_IN_DRIVERS } from "../builtInDrivers.ts";
import { NoOpProviderEventLoggers, ProviderEventLoggers } from "../Layers/ProviderEventLoggers.ts";
import { deriveProviderInstanceConfigMap } from "../Layers/ProviderInstanceRegistryHydration.ts";
import {
  driverKindForLegacyProviderSettingsKey,
  legacyProviderSettingsKeyForDriver,
} from "../providerSettingsKeys.ts";
import { orderProviderSnapshots } from "../providerStatusCache.ts";
import { SOUTHBAG_CODE_NPM_PACKAGE, SouthbagCodeDriver } from "./SouthbagCodeDriver.ts";

const decodeServerSettings = Schema.decodeUnknownSync(ServerSettings);

it("registers Southbag Code as the first built-in driver", () => {
  // The web defaults new threads to the first picker-ready provider in the
  // server's list, so this position is what makes an installed binary the
  // default provider.
  expect(BUILT_IN_DRIVERS[0]).toBe(SouthbagCodeDriver);
  expect(SouthbagCodeDriver.driverKind).toBe(SOUTHBAG_CODE_DRIVER_KIND);
  expect(SouthbagCodeDriver.metadata.displayName).toBe("Southbag Code");
  expect(SouthbagCodeDriver.defaultConfig()).toEqual({
    enabled: true,
    binaryPath: "southbag-code",
    customModels: [],
  });
});

it("publishes southbag-code ahead of every other driver", () => {
  const snapshot = (driver: string): ServerProvider => ({
    instanceId: ProviderInstanceId.make(driver),
    driver: ProviderDriverKind.make(driver),
    enabled: true,
    installed: true,
    version: null,
    status: "ready",
    auth: { status: "unknown" },
    checkedAt: "2026-01-01T00:00:00.000Z",
    models: [],
    slashCommands: [],
    skills: [],
  });
  expect(
    orderProviderSnapshots([
      snapshot("codex"),
      snapshot("claudeAgent"),
      snapshot("southbag-code"),
    ]).map((provider) => provider.driver),
  ).toEqual(["southbag-code", "codex", "claudeAgent"]);
});

it("keeps the southbag-code driver kind as its providers settings slot", () => {
  expect(legacyProviderSettingsKeyForDriver(SOUTHBAG_CODE_DRIVER_KIND)).toBe("southbag-code");
  expect(legacyProviderSettingsKeyForDriver(ProviderDriverKind.make("codex"))).toBe("codex");
  expect(driverKindForLegacyProviderSettingsKey("southbag-code")).toBe(SOUTHBAG_CODE_DRIVER_KIND);
  expect(driverKindForLegacyProviderSettingsKey("grok")).toBe("grok");
});

it('hydrates a southbag-code instance from providers["southbag-code"]', () => {
  const settings = decodeServerSettings({
    providers: { "southbag-code": { binaryPath: "/opt/southbag/bin/southbag-code" } },
  });
  const configMap = deriveProviderInstanceConfigMap(settings);
  const instance = configMap[ProviderInstanceId.make(SOUTHBAG_CODE_DRIVER_KIND)];
  expect(instance?.driver).toBe(SOUTHBAG_CODE_DRIVER_KIND);
  expect(instance?.config).toMatchObject({
    enabled: true,
    binaryPath: "/opt/southbag/bin/southbag-code",
  });
});

const testLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "t3-southbag-driver-",
}).pipe(
  Layer.provideMerge(NodeServices.layer),
  Layer.provideMerge(ServerSettingsService.layerTest()),
  Layer.provideMerge(
    Layer.mock(BackgroundPolicy.BackgroundPolicy)({
      shouldRunScopeWork: () => Effect.succeed(false),
    }),
  ),
  Layer.provideMerge(Layer.succeed(ProviderEventLoggers, NoOpProviderEventLoggers)),
  Layer.provideMerge(
    Layer.succeed(
      HttpClient.HttpClient,
      HttpClient.make(() => Effect.die("Disabled Southbag Code must not make an HTTP request")),
    ),
  ),
);

it.layer(testLayer)("SouthbagCodeDriver", (it) => {
  it.effect("builds a disabled instance without spawning and names the npm package", () =>
    Effect.gen(function* () {
      const instance = yield* SouthbagCodeDriver.create({
        instanceId: ProviderInstanceId.make("southbag-code"),
        displayName: "Southbag Code",
        enabled: false,
        environment: [],
        config: { ...SouthbagCodeDriver.defaultConfig(), binaryPath: "/nope/southbag-code" },
      });
      expect(instance.driverKind).toBe(SOUTHBAG_CODE_DRIVER_KIND);
      expect(instance.adapter.provider).toBe(SOUTHBAG_CODE_DRIVER_KIND);
      expect(instance.adapter.capabilities.sessionModelSwitch).toBe("in-session");
      const capabilities = yield* instance.snapshot.resolveMaintenance();
      expect(capabilities.packageName).toBe(SOUTHBAG_CODE_NPM_PACKAGE);
      expect(capabilities.update).toBeNull();
      const snapshot = yield* instance.snapshot.refresh;
      expect(snapshot.status).toBe("disabled");
      expect(snapshot.showInteractionModeToggle).toBe(false);
    }).pipe(
      Effect.provideService(
        ChildProcessSpawner.ChildProcessSpawner,
        ChildProcessSpawner.make(() => Effect.die("Disabled Southbag Code must not spawn")),
      ),
      Effect.scoped,
    ),
  );
});
