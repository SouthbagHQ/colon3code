/**
 * Git/thread text via `southbag-code --print --mode text`, with tools and sessions off so a
 * prompt cannot touch the checkout. `--model` is unsupported, so the selection's model is not sent.
 */
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

import { TextGenerationError, type SouthbagCodeSettings } from "@t3tools/contracts";
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import * as TextGenerationOperations from "@t3tools/provider-core/server/textGenerationOperations";
import { normalizeCliError } from "@t3tools/provider-core/server/textGenerationUtils";

const SOUTHBAG_CODE_TIMEOUT_MS = 180_000;
const CLI_NAME = "southbag-code";
const PROVIDER_NAME = "Southbag Code";

const SOUTHBAG_CODE_PRINT_ARGS = [
  "--print",
  "--mode",
  "text",
  "--no-session",
  "--no-tools",
] as const;

export const makeSouthbagCodeTextGeneration = Effect.fn("makeSouthbagCodeTextGeneration")(
  function* (settings: SouthbagCodeSettings, environment: NodeJS.ProcessEnv = process.env) {
    const commandSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const binaryPath = settings.binaryPath || CLI_NAME;

    const readStreamAsString = <E>(
      operation: TextGenerationOperations.Operation,
      stream: Stream.Stream<Uint8Array, E>,
    ): Effect.Effect<string, TextGenerationError> =>
      stream.pipe(
        Stream.decodeText(),
        Stream.runFold(
          () => "",
          (acc, chunk) => acc + chunk,
        ),
        Effect.mapError((cause) =>
          normalizeCliError(CLI_NAME, operation, cause, "Failed to collect process output"),
        ),
      );

    const runSouthbagCodeJson: TextGenerationOperations.Runner = Effect.fn(
      "SouthbagCodeTextGeneration.runSouthbagCodeJson",
    )(function* (request) {
      const { operation, cwd, prompt } = request;
      const runPrintMode = Effect.gen(function* () {
        // Titles need only the supplied prompt, not configuration from the checkout.
        const workingDirectory =
          operation === "generateThreadTitle"
            ? yield* fileSystem
                .makeTempDirectoryScoped({ prefix: "colon3code-southbag-title-" })
                .pipe(
                  Effect.mapError((cause) =>
                    normalizeCliError(
                      CLI_NAME,
                      operation,
                      cause,
                      "Failed to create title directory",
                    ),
                  ),
                )
            : cwd;
        const spawnCommand = yield* resolveSpawnCommand(binaryPath, SOUTHBAG_CODE_PRINT_ARGS, {
          env: environment,
        });
        const child = yield* commandSpawner
          .spawn(
            ChildProcess.make(spawnCommand.command, spawnCommand.args, {
              env: environment,
              cwd: workingDirectory,
              shell: spawnCommand.shell,
              stdin: { stream: Stream.encodeText(Stream.make(prompt)) },
              forceKillAfter: "1 second",
            }),
          )
          .pipe(
            Effect.mapError((cause) =>
              normalizeCliError(
                CLI_NAME,
                operation,
                cause,
                "Failed to spawn Southbag Code process",
              ),
            ),
          );
        const [stdout, stderr, exitCode] = yield* Effect.all(
          [
            readStreamAsString(operation, child.stdout),
            readStreamAsString(operation, child.stderr),
            child.exitCode.pipe(
              Effect.mapError((cause) =>
                normalizeCliError(
                  CLI_NAME,
                  operation,
                  cause,
                  "Failed to read Southbag Code exit code",
                ),
              ),
            ),
          ],
          { concurrency: "unbounded" },
        );
        if (exitCode !== 0) {
          const detail = stderr.trim() || stdout.trim();
          return yield* new TextGenerationError({
            operation,
            detail:
              detail.length > 0
                ? `Southbag Code command failed: ${detail}`
                : `Southbag Code command failed with code ${exitCode}.`,
          });
        }
        return stdout;
      });

      const rawStdout = yield* runPrintMode.pipe(
        Effect.scoped,
        Effect.timeoutOption(SOUTHBAG_CODE_TIMEOUT_MS),
        Effect.flatMap(
          Option.match({
            onNone: () =>
              Effect.fail(
                new TextGenerationError({
                  operation,
                  detail: "Southbag Code request timed out.",
                }),
              ),
            onSome: (value) => Effect.succeed(value),
          }),
        ),
      );

      const trimmed = rawStdout.trim();
      if (!trimmed) {
        return yield* new TextGenerationError({
          operation,
          detail: "Southbag Code returned empty output.",
        });
      }
      return yield* TextGenerationOperations.decodeJsonReply(request, PROVIDER_NAME, trimmed);
    });

    return TextGenerationOperations.fromRunner(
      "SouthbagCodeTextGeneration",
      TextGenerationOperations.withoutInvestigation(PROVIDER_NAME, runSouthbagCodeJson),
    );
  },
);
