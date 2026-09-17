// @effect-diagnostics nodeBuiltinImport:off - resolves the mock agent script path relative to this test file.
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { ProviderInstanceId, SouthbagCodeSettings } from "@t3tools/contracts";

import * as ServerConfig from "../config.ts";
import { execScriptSource, writeFakeCli } from "../testUtils/fakeCli.ts";
import { makeSouthbagCodeTextGeneration } from "./SouthbagCodeTextGeneration.ts";

const decodeSettings = Schema.decodeSync(SouthbagCodeSettings);
const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const mockAgentPath = NodePath.resolve(__dirname, "../../scripts/southbag-code-mock-agent.ts");
const modelSelection = {
  instanceId: ProviderInstanceId.make("southbag-code"),
  model: "southbag-agent/southbag-agent",
};

const testLayer = ServerConfig.ServerConfig.layerTest(process.cwd(), {
  prefix: "colon3code-southbag-textgen-",
}).pipe(Layer.provideMerge(NodeServices.layer));

const makeMockBinary = async (env: Record<string, string>) => {
  const dir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "southbag-textgen-"));
  return {
    argvLogPath: NodePath.join(dir, "argv.log"),
    requestLogPath: NodePath.join(dir, "requests.ndjson"),
    binaryPath: writeFakeCli({
      directory: dir,
      name: "southbag-code",
      env: {
        ...env,
        T3_SOUTHBAG_ARGV_LOG_PATH: NodePath.join(dir, "argv.log"),
        T3_SOUTHBAG_REQUEST_LOG_PATH: NodePath.join(dir, "requests.ndjson"),
      },
      source: execScriptSource({ scriptPath: mockAgentPath }),
    }),
  };
};

it.layer(testLayer)("SouthbagCodeTextGeneration", (it) => {
  it.effect("generates a thread title through print mode with tools and sessions off", () =>
    Effect.gen(function* () {
      const mock = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_PRINT_OUTPUT: 'Sure!\n{"title":"fix the login bug"}' }),
      );
      const textGeneration = yield* makeSouthbagCodeTextGeneration(
        decodeSettings({ binaryPath: mock.binaryPath }),
      );
      const result = yield* textGeneration.generateThreadTitle({
        cwd: process.cwd(),
        message: "please fix the login bug",
        modelSelection,
      });
      expect(result.title).toBe("fix the login bug");
      const argv = yield* Effect.promise(() => NodeFSP.readFile(mock.argvLogPath, "utf8"));
      expect(argv.trim().split("\t")).toEqual([
        "--print",
        "--mode",
        "text",
        "--no-session",
        "--no-tools",
      ]);
      const requests = yield* Effect.promise(() => NodeFSP.readFile(mock.requestLogPath, "utf8"));
      expect(requests).toContain("please fix the login bug");
    }),
  );

  it.effect("reports unparseable output as a text generation error", () =>
    Effect.gen(function* () {
      const mock = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_PRINT_OUTPUT: "no json here" }),
      );
      const textGeneration = yield* makeSouthbagCodeTextGeneration(
        decodeSettings({ binaryPath: mock.binaryPath }),
      );
      const error = yield* textGeneration
        .generateBranchName({ cwd: process.cwd(), message: "add tests", modelSelection })
        .pipe(Effect.flip);
      expect(error._tag).toBe("TextGenerationError");
      expect(error.operation).toBe("generateBranchName");
    }),
  );

  it.effect("reports a missing binary", () =>
    Effect.gen(function* () {
      const textGeneration = yield* makeSouthbagCodeTextGeneration(
        decodeSettings({ binaryPath: "/definitely/not/installed/southbag-code" }),
      );
      const error = yield* textGeneration
        .generateThreadTitle({ cwd: process.cwd(), message: "hi", modelSelection })
        .pipe(Effect.flip);
      expect(error._tag).toBe("TextGenerationError");
    }),
  );
});
