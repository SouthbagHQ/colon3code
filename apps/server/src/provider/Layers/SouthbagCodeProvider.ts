/**
 * SouthbagCodeProvider — installation probe and status snapshot for the
 * Southbag Code CLI (`southbag-code`, npm `@southbag/code`).
 *
 * The probe runs `southbag-code --version`, then borrows a short-lived
 * `--mode rpc --no-session` process to read `get_state` and
 * `get_available_models`. Model slugs are `provider/modelId` exactly as the
 * RPC reports them; the `southbag-default` sentinel is always listed first and
 * is the only row marked default, because it means "keep the session's own
 * model" and is never sent to the RPC.
 *
 * @module provider/Layers/SouthbagCodeProvider
 */
import {
  type CustomModelSetting,
  type ModelCapabilities,
  type ServerProvider,
  type ServerProviderModel,
  SOUTHBAG_CODE_DEFAULT_MODEL,
  SOUTHBAG_CODE_DRIVER_KIND,
  type SouthbagCodeSettings,
} from "@t3tools/contracts";
import { causeErrorTag } from "@t3tools/shared/observability";
import { createModelCapabilities } from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { HttpClient } from "effect/unstable/http";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import {
  buildSelectOptionDescriptor,
  buildServerProvider,
  COMPACT_SLASH_COMMAND,
  isCommandMissingCause,
  parseGenericCliVersion,
  providerModelsFromSettings,
  spawnAndCollect,
  type ServerProviderDraft,
} from "../providerSnapshot.ts";
import {
  enrichProviderSnapshotWithVersionAdvisory,
  type ProviderMaintenanceCapabilities,
} from "../providerMaintenance.ts";
import { makeSouthbagCodeRpcClient } from "./SouthbagCodeRpc.ts";

export const SOUTHBAG_CODE_PRESENTATION = {
  displayName: "Southbag Code",
  supportsConversationRollback: false,
  // The agent runs every tool without asking, so there is no plan/approval
  // mode to toggle. The web hides its mode toggle off this flag.
  showInteractionModeToggle: false,
  reportsContextWindow: true,
} as const;

const VERSION_PROBE_TIMEOUT_MS = 4_000;
const MODELS_PROBE_TIMEOUT_MS = 8_000;

/** Thinking levels the RPC `set_thinking_level` command accepts. */
export const SOUTHBAG_CODE_THINKING_LEVELS = [
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
] as const;
export const SOUTHBAG_CODE_THINKING_OPTION_ID = "thinkingLevel";

const THINKING_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [
    buildSelectOptionDescriptor({
      id: SOUTHBAG_CODE_THINKING_OPTION_ID,
      label: "Thinking",
      options: SOUTHBAG_CODE_THINKING_LEVELS.map((level) => ({
        value: level,
        label: level,
        ...(level === "medium" ? { isDefault: true } : {}),
      })),
    }),
  ],
});
const EMPTY_CAPABILITIES: ModelCapabilities = createModelCapabilities({ optionDescriptors: [] });

/** The sentinel row: "use whatever model the session is configured with". */
export const SOUTHBAG_CODE_DEFAULT_MODEL_ENTRY: ServerProviderModel = {
  slug: SOUTHBAG_CODE_DEFAULT_MODEL,
  name: "session default",
  isCustom: false,
  isDefault: true,
  capabilities: THINKING_CAPABILITIES,
};

export function isSouthbagCodeDefaultModel(model: string | undefined): boolean {
  return model === undefined || model.trim() === SOUTHBAG_CODE_DEFAULT_MODEL;
}

/** Split a `provider/modelId` slug for `set_model`. */
export function parseSouthbagCodeModelSlug(
  slug: string,
): { readonly provider: string; readonly modelId: string } | undefined {
  const trimmed = slug.trim();
  const separator = trimmed.indexOf("/");
  if (separator <= 0 || separator === trimmed.length - 1) {
    return undefined;
  }
  return { provider: trimmed.slice(0, separator), modelId: trimmed.slice(separator + 1) };
}

const RpcModel = Schema.Struct({
  id: Schema.String,
  provider: Schema.String,
  name: Schema.optional(Schema.String),
  reasoning: Schema.optional(Schema.Boolean),
});
const AvailableModelsData = Schema.Struct({ models: Schema.Array(Schema.Unknown) });
const decodeAvailableModelsData = Schema.decodeUnknownOption(AvailableModelsData);
const decodeRpcModel = Schema.decodeUnknownOption(RpcModel);

/** `get_available_models` rows → picker models, keyed `provider/modelId`. */
export function southbagCodeModelsFromRpc(data: unknown): ReadonlyArray<ServerProviderModel> {
  const decoded = decodeAvailableModelsData(data);
  if (Option.isNone(decoded)) {
    return [];
  }
  const seen = new Set<string>();
  const models: ServerProviderModel[] = [];
  for (const raw of decoded.value.models) {
    const model = decodeRpcModel(raw);
    if (Option.isNone(model)) continue;
    const provider = model.value.provider.trim();
    const id = model.value.id.trim();
    if (!provider || !id) continue;
    const slug = `${provider}/${id}`;
    if (seen.has(slug)) continue;
    seen.add(slug);
    models.push({
      slug,
      name: model.value.name?.trim() || id,
      isCustom: false,
      capabilities: model.value.reasoning === false ? EMPTY_CAPABILITIES : THINKING_CAPABILITIES,
    });
  }
  return models;
}

export function southbagCodeModelsFromSettings(
  customModels: ReadonlyArray<CustomModelSetting> | undefined,
  discoveredModels: ReadonlyArray<ServerProviderModel> = [],
): ReadonlyArray<ServerProviderModel> {
  return providerModelsFromSettings(
    [SOUTHBAG_CODE_DEFAULT_MODEL_ENTRY, ...discoveredModels],
    customModels ?? [],
    THINKING_CAPABILITIES,
  );
}

export function buildInitialSouthbagCodeProviderSnapshot(
  settings: SouthbagCodeSettings,
): Effect.Effect<ServerProviderDraft> {
  return Effect.gen(function* () {
    const checkedAt = yield* Effect.map(DateTime.now, DateTime.formatIso);
    const models = southbagCodeModelsFromSettings(settings.customModels);
    if (!settings.enabled) {
      return buildServerProvider({
        presentation: SOUTHBAG_CODE_PRESENTATION,
        enabled: false,
        checkedAt,
        models,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "southbag code is disabled in :3 code settings.",
        },
      });
    }
    return buildServerProvider({
      presentation: SOUTHBAG_CODE_PRESENTATION,
      enabled: true,
      checkedAt,
      models,
      probe: {
        installed: true,
        version: null,
        status: "warning",
        auth: { status: "unknown" },
        message: "checking southbag code availability...",
      },
    });
  });
}

const runSouthbagCodeCommand = (
  settings: SouthbagCodeSettings,
  args: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv,
) =>
  Effect.gen(function* () {
    const command = settings.binaryPath || "southbag-code";
    const spawnCommand = yield* resolveSpawnCommand(command, args, { env: environment });
    return yield* spawnAndCollect(
      command,
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        env: environment,
        shell: spawnCommand.shell,
      }),
    );
  });

/**
 * Ask a throwaway `--mode rpc --no-session` process for its models. The
 * result never includes the sentinel; callers prepend it.
 */
export const discoverSouthbagCodeModels = Effect.fn("discoverSouthbagCodeModels")(function* (
  settings: SouthbagCodeSettings,
  environment: NodeJS.ProcessEnv,
  cwd: string,
): Effect.fn.Return<
  ReadonlyArray<ServerProviderModel>,
  never,
  ChildProcessSpawner.ChildProcessSpawner
> {
  const exit = yield* Effect.gen(function* () {
    const rpc = yield* makeSouthbagCodeRpcClient({
      binaryPath: settings.binaryPath || "southbag-code",
      args: ["--mode", "rpc", "--no-session"],
      cwd,
      environment,
    });
    const data = yield* rpc.request({ type: "get_available_models" });
    return southbagCodeModelsFromRpc(data);
  }).pipe(Effect.scoped, Effect.timeoutOption(MODELS_PROBE_TIMEOUT_MS), Effect.exit);
  if (Exit.isFailure(exit)) {
    yield* Effect.logWarning("Southbag Code model discovery failed.", {
      errorTag: causeErrorTag(exit.cause),
    });
    return [];
  }
  if (Option.isNone(exit.value)) {
    yield* Effect.logWarning("Southbag Code model discovery timed out.");
    return [];
  }
  return exit.value.value;
});

export const checkSouthbagCodeProviderStatus = Effect.fn("checkSouthbagCodeProviderStatus")(
  function* (
    settings: SouthbagCodeSettings,
    environment: NodeJS.ProcessEnv = process.env,
    cwd: string = process.cwd(),
  ): Effect.fn.Return<ServerProviderDraft, never, ChildProcessSpawner.ChildProcessSpawner> {
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
    const fallbackModels = southbagCodeModelsFromSettings(settings.customModels);

    if (!settings.enabled) {
      return buildServerProvider({
        presentation: SOUTHBAG_CODE_PRESENTATION,
        enabled: false,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: false,
          version: null,
          status: "warning",
          auth: { status: "unknown" },
          message: "southbag code is disabled in :3 code settings.",
        },
      });
    }

    const versionResult = yield* runSouthbagCodeCommand(settings, ["--version"], environment).pipe(
      Effect.timeoutOption(VERSION_PROBE_TIMEOUT_MS),
      Effect.result,
    );

    if (Result.isFailure(versionResult)) {
      const error = versionResult.failure;
      yield* Effect.logWarning("Southbag Code health check failed.", { errorTag: error._tag });
      const missing = isCommandMissingCause(error);
      return buildServerProvider({
        presentation: SOUTHBAG_CODE_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: !missing,
          version: null,
          status: "error",
          auth: { status: "unknown" },
          // The web appends the install hint after this sentence.
          message: missing
            ? "southbag-code is not installed 3:"
            : "southbag-code could not be started 3:",
        },
      });
    }

    if (Option.isNone(versionResult.success)) {
      return buildServerProvider({
        presentation: SOUTHBAG_CODE_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version: null,
          status: "error",
          auth: { status: "unknown" },
          message: "southbag-code is installed but `southbag-code --version` timed out 3:",
        },
      });
    }

    const versionOutput = versionResult.success.value;
    const version = parseGenericCliVersion(`${versionOutput.stdout}\n${versionOutput.stderr}`);
    if (versionOutput.code !== 0) {
      yield* Effect.logWarning("Southbag Code version probe exited with a non-zero status.", {
        exitCode: versionOutput.code,
        stdoutLength: versionOutput.stdout.length,
        stderrLength: versionOutput.stderr.length,
      });
      return buildServerProvider({
        presentation: SOUTHBAG_CODE_PRESENTATION,
        enabled: true,
        checkedAt,
        models: fallbackModels,
        probe: {
          installed: true,
          version,
          status: "error",
          auth: { status: "unknown" },
          message: "southbag-code is installed but failed to run 3:",
        },
      });
    }

    const discoveredModels = yield* discoverSouthbagCodeModels(settings, environment, cwd);
    const models = southbagCodeModelsFromSettings(settings.customModels, discoveredModels);

    return buildServerProvider({
      presentation: SOUTHBAG_CODE_PRESENTATION,
      enabled: true,
      checkedAt,
      models,
      slashCommands: [COMPACT_SLASH_COMMAND],
      probe: {
        installed: true,
        version,
        // The binary runs, so chats work; a failed model listing only
        // degrades the picker to the session-default row.
        status: discoveredModels.length > 0 ? "ready" : "warning",
        auth: { status: "unknown" },
        ...(discoveredModels.length > 0
          ? {}
          : {
              message:
                "southbag-code is installed but did not list any models. the session default still works :3",
            }),
      },
    });
  },
);

export const enrichSouthbagCodeSnapshot = (input: {
  readonly snapshot: ServerProvider;
  readonly maintenanceCapabilities: ProviderMaintenanceCapabilities;
  readonly enableProviderUpdateChecks?: boolean;
  readonly publishSnapshot: (snapshot: ServerProvider) => Effect.Effect<void>;
  readonly httpClient: HttpClient.HttpClient;
}): Effect.Effect<void> =>
  enrichProviderSnapshotWithVersionAdvisory(input.snapshot, input.maintenanceCapabilities, {
    enableProviderUpdateChecks: input.enableProviderUpdateChecks,
  }).pipe(
    Effect.provideService(HttpClient.HttpClient, input.httpClient),
    Effect.flatMap((enrichedSnapshot) => input.publishSnapshot(enrichedSnapshot)),
    Effect.catchCause((cause) =>
      Effect.logWarning("Southbag Code version advisory enrichment failed", {
        errorTag: causeErrorTag(cause),
      }),
    ),
    Effect.asVoid,
  );

export { SOUTHBAG_CODE_DRIVER_KIND };

export function isSouthbagCodeThinkingLevel(
  value: unknown,
): value is (typeof SOUTHBAG_CODE_THINKING_LEVELS)[number] {
  return (
    Predicate.isString(value) &&
    (SOUTHBAG_CODE_THINKING_LEVELS as ReadonlyArray<string>).includes(value)
  );
}
