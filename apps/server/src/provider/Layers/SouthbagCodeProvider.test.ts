// @effect-diagnostics nodeBuiltinImport:off - resolves the mock RPC agent script path relative to this test file.
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { describe, expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Schema from "effect/Schema";
import { SOUTHBAG_CODE_DEFAULT_MODEL, SouthbagCodeSettings } from "@t3tools/contracts";

import { execScriptSource, writeFakeCli } from "../../testUtils/fakeCli.ts";
import {
  buildInitialSouthbagCodeProviderSnapshot,
  checkSouthbagCodeProviderStatus,
  parseSouthbagCodeModelSlug,
  southbagCodeModelsFromRpc,
  southbagCodeModelsFromSettings,
} from "./SouthbagCodeProvider.ts";

const decodeSettings = Schema.decodeSync(SouthbagCodeSettings);
const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const mockAgentPath = NodePath.resolve(__dirname, "../../../scripts/southbag-code-mock-agent.ts");

describe("parseSouthbagCodeModelSlug", () => {
  it("splits provider/modelId on the first slash", () => {
    expect(parseSouthbagCodeModelSlug("southbag/agent/v2")).toEqual({
      provider: "southbag",
      modelId: "agent/v2",
    });
    expect(parseSouthbagCodeModelSlug("bare")).toBeUndefined();
    expect(parseSouthbagCodeModelSlug("/x")).toBeUndefined();
    expect(parseSouthbagCodeModelSlug("x/")).toBeUndefined();
  });
});

describe("southbagCodeModelsFromRpc", () => {
  it("keys rows as provider/modelId and never marks them default", () => {
    const models = southbagCodeModelsFromRpc({
      models: [
        { id: "a", provider: "p", name: "A", reasoning: true },
        { id: "b", provider: "p", reasoning: false },
        { id: "a", provider: "p" },
        { id: "", provider: "p" },
        "junk",
      ],
    });
    expect(models.map((model) => [model.slug, model.name, model.isDefault ?? false])).toEqual([
      ["p/a", "A", false],
      ["p/b", "b", false],
    ]);
    expect(models[0]?.capabilities?.optionDescriptors?.map((option) => option.id)).toEqual([
      "thinkingLevel",
    ]);
    expect(models[1]?.capabilities?.optionDescriptors).toEqual([]);
    expect(southbagCodeModelsFromRpc({ nope: true })).toEqual([]);
  });

  it("marks the first discovered model default, then custom models", () => {
    const models = southbagCodeModelsFromSettings(
      ["custom/one"],
      southbagCodeModelsFromRpc({ models: [{ id: "a", provider: "p" }] }),
    );
    expect(models.map((model) => [model.slug, model.isDefault ?? false, model.isCustom])).toEqual([
      ["p/a", true, false],
      ["custom/one", false, true],
    ]);
  });

  it("prefers the shipped model as default when it is among the discovered rows", () => {
    const models = southbagCodeModelsFromSettings(
      [],
      southbagCodeModelsFromRpc({
        models: [
          { id: "other", provider: "p" },
          { id: "southbag-agent", provider: "southbag-agent", name: "Southbag Agent" },
        ],
      }),
    );
    expect(models.map((model) => [model.slug, model.isDefault ?? false])).toEqual([
      ["p/other", false],
      [SOUTHBAG_CODE_DEFAULT_MODEL, true],
    ]);
  });
});

describe("buildInitialSouthbagCodeProviderSnapshot", () => {
  it.effect("is enabled and pending by default", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialSouthbagCodeProviderSnapshot(decodeSettings({}));
      expect(snapshot.enabled).toBe(true);
      expect(snapshot.status).toBe("warning");
      expect(snapshot.showInteractionModeToggle).toBe(false);
      expect(snapshot.supportsConversationRollback).toBe(false);
      expect(snapshot.reportsContextWindow).toBe(true);
      expect(snapshot.models[0]?.slug).toBe(SOUTHBAG_CODE_DEFAULT_MODEL);
    }),
  );

  it.effect("is disabled when settings say so", () =>
    Effect.gen(function* () {
      const snapshot = yield* buildInitialSouthbagCodeProviderSnapshot(
        decodeSettings({ enabled: false }),
      );
      expect(snapshot.enabled).toBe(false);
      expect(snapshot.status).toBe("disabled");
    }),
  );
});

it.layer(NodeServices.layer)("checkSouthbagCodeProviderStatus", (it) => {
  it.effect("reports the binary as missing when it does not resolve", () =>
    Effect.gen(function* () {
      const snapshot = yield* checkSouthbagCodeProviderStatus(
        decodeSettings({ binaryPath: "/definitely/not/installed/southbag-code" }),
      );
      expect(snapshot.enabled).toBe(true);
      expect(snapshot.installed).toBe(false);
      expect(snapshot.status).toBe("error");
      expect(snapshot.message).toBe("southbag-code is not installed 3:");
      expect(snapshot.models.map((model) => model.slug)).toEqual([SOUTHBAG_CODE_DEFAULT_MODEL]);
    }),
  );

  it.effect("reports an installed binary that fails --version", () =>
    Effect.gen(function* () {
      const snapshot = yield* Effect.scoped(
        Effect.gen(function* () {
          const fs = yield* FileSystem.FileSystem;
          const dir = yield* fs.makeTempDirectoryScoped({ prefix: "colon3code-southbag-version-" });
          const binaryPath = writeFakeCli({
            directory: dir,
            name: "southbag-code",
            source: ['process.stderr.write("boom\\n");', "process.exit(2);", ""].join("\n"),
          });
          return yield* checkSouthbagCodeProviderStatus(decodeSettings({ binaryPath }));
        }),
      );
      expect(snapshot.installed).toBe(true);
      expect(snapshot.status).toBe("error");
      expect(snapshot.message).toBe("southbag-code is installed but failed to run 3:");
    }),
  );

  const writeMockBinary = (env: Record<string, string> = {}) =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const dir = yield* fs.makeTempDirectoryScoped({ prefix: "colon3code-southbag-probe-" });
      return writeFakeCli({
        directory: dir,
        name: "southbag-code",
        env,
        source: execScriptSource({ scriptPath: mockAgentPath }),
      });
    });

  it.effect("reports ready with the version and RPC-discovered models", () =>
    Effect.gen(function* () {
      const snapshot = yield* Effect.scoped(
        Effect.gen(function* () {
          const binaryPath = yield* writeMockBinary();
          return yield* checkSouthbagCodeProviderStatus(decodeSettings({ binaryPath }));
        }),
      );
      expect(snapshot.status).toBe("ready");
      expect(snapshot.installed).toBe(true);
      expect(snapshot.version).toBe("0.84.2");
      expect(snapshot.showInteractionModeToggle).toBe(false);
      expect(snapshot.models.map((model) => [model.slug, model.isDefault ?? false])).toEqual([
        ["southbag-agent/southbag-agent", true],
        ["southbag-agent/mock-alt", false],
      ]);
      expect(snapshot.slashCommands.map((command) => command.name)).toEqual(["compact"]);
    }),
  );

  it.effect("degrades to a warning with the sentinel when model discovery fails", () =>
    Effect.gen(function* () {
      const snapshot = yield* Effect.scoped(
        Effect.gen(function* () {
          const binaryPath = yield* writeMockBinary({ T3_SOUTHBAG_FAIL_MODELS: "1" });
          return yield* checkSouthbagCodeProviderStatus(decodeSettings({ binaryPath }));
        }),
      );
      expect(snapshot.status).toBe("warning");
      expect(snapshot.version).toBe("0.84.2");
      expect(snapshot.models.map((model) => model.slug)).toEqual([SOUTHBAG_CODE_DEFAULT_MODEL]);
      expect(snapshot.message).toContain("did not list any models");
    }),
  );
});
