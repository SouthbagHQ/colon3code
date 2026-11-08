import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  DEFAULT_SERVER_SETTINGS,
  ProviderDriverKind,
  ProviderInstanceId,
  SOUTHBAG_CODE_DRIVER_KIND,
  type ServerProvider,
} from "@t3tools/contracts";
import * as IdAllocator from "@t3tools/provider-core/server/IdAllocator";
import * as McpProviderSessions from "@t3tools/provider-core/server/McpProviderSessions";
import * as ProviderLatestVersions from "@t3tools/provider-core/server/ProviderLatestVersions";
import * as TestProviderHost from "@t3tools/provider-testing/TestProviderHost";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as HttpClient from "effect/http/HttpClient";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";

import { BUILT_IN_DRIVERS } from "../builtInDrivers.ts";
import { orderProviderSnapshots } from "../providerStatusCache.ts";
import {
  SOUTHBAG_CODE_BINARY,
  southbagCodeLaunchArgs,
  southbagCodePiSettings,
} from "../SouthbagCodeAdapter.ts";
import { SOUTHBAG_CODE_NPM_PACKAGE, SouthbagCodeDriver } from "./SouthbagCodeDriver.ts";

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

it("runs the Pi-family adapter with Southbag's binary and the app's voice", () => {
  expect(southbagCodePiSettings({ enabled: true, binaryPath: "", customModels: [] })).toMatchObject(
    { binaryPath: SOUTHBAG_CODE_BINARY, launchArgs: "" },
  );
  const args = southbagCodeLaunchArgs();
  expect(args[0]).toBe("--append-system-prompt");
  expect(args[1]).toContain("through the Southbag Code harness");
  expect(args[1]).toContain("<voice>");
});

const testLayer = Layer.mergeAll(
  TestProviderHost.layer({
    cwd: "/machine",
    settings: { ...DEFAULT_SERVER_SETTINGS, enableProviderUpdateChecks: false },
    runBackgroundWork: false,
  }),
  IdAllocator.layer,
  McpProviderSessions.layer,
  ProviderLatestVersions.layer,
  Layer.succeed(
    HttpClient.HttpClient,
    HttpClient.make(() => Effect.die("Disabled Southbag Code must not make an HTTP request")),
  ),
).pipe(Layer.provideMerge(NodeServices.layer));

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
      expect(instance.orchestrationAdapter?.driver).toBe(SOUTHBAG_CODE_DRIVER_KIND);
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
