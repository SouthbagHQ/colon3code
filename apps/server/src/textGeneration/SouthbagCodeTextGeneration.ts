/**
 * SouthbagCodeTextGeneration — thread titles, commit messages, PR text and
 * branch names via `southbag-code --print --mode text`.
 *
 * Print mode reads the prompt from stdin, runs one agent turn and prints the
 * final assistant text. Tools and session persistence are switched off so a
 * metadata prompt cannot touch the checkout or leave a session file behind.
 * The agent always answers with its own configured model: `--model` is not a
 * supported flag on this fork, so the selection's model is not forwarded.
 *
 * @module textGeneration/SouthbagCodeTextGeneration
 */
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

import { TextGenerationError, type SouthbagCodeSettings } from "@t3tools/contracts";
import { sanitizeBranchFragment, sanitizeFeatureBranchName } from "@t3tools/shared/git";
import { extractJsonObject } from "@t3tools/shared/schemaJson";
import { resolveSpawnCommand } from "@t3tools/shared/shell";

import * as TextGeneration from "./TextGeneration.ts";
import {
  buildBranchNamePrompt,
  buildCommitMessagePrompt,
  buildPrContentPrompt,
  buildThreadTitlePrompt,
} from "./TextGenerationPrompts.ts";
import {
  normalizeCliError,
  sanitizeCommitSubject,
  sanitizePrTitle,
  sanitizeThreadTitle,
} from "./TextGenerationUtils.ts";

const SOUTHBAG_CODE_TIMEOUT_MS = 180_000;
const CLI_NAME = "southbag-code";

type TextGenerationOperation =
  | "generateCommitMessage"
  | "generatePrContent"
  | "generateBranchName"
  | "generateThreadTitle";

export const makeSouthbagCodeTextGeneration = Effect.fn("makeSouthbagCodeTextGeneration")(
  function* (settings: SouthbagCodeSettings, environment: NodeJS.ProcessEnv = process.env) {
    const commandSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const fileSystem = yield* FileSystem.FileSystem;
    const binaryPath = settings.binaryPath || CLI_NAME;

    const readStreamAsString = <E>(
      operation: TextGenerationOperation,
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

    const runSouthbagCodeJson = <S extends Schema.Top>({
      operation,
      cwd,
      prompt,
      outputSchemaJson,
    }: {
      operation: TextGenerationOperation;
      cwd: string;
      prompt: string;
      outputSchemaJson: S;
    }): Effect.Effect<S["Type"], TextGenerationError, S["DecodingServices"]> =>
      Effect.gen(function* () {
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
          const spawnCommand = yield* resolveSpawnCommand(
            binaryPath,
            ["--print", "--mode", "text", "--no-session", "--no-tools"],
            { env: environment },
          );
          const child = yield* commandSpawner
            .spawn(
              ChildProcess.make(spawnCommand.command, spawnCommand.args, {
                env: environment,
                extendEnv: false,
                cwd: workingDirectory,
                shell: spawnCommand.shell,
                stdin: { stream: Stream.encodeText(Stream.make(prompt)) },
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

        const decodeOutput = Schema.decodeEffect(Schema.fromJsonString(outputSchemaJson));
        return yield* decodeOutput(extractJsonObject(trimmed)).pipe(
          Effect.catchTags({
            SchemaError: (cause) =>
              Effect.fail(
                new TextGenerationError({
                  operation,
                  detail: "Southbag Code returned invalid structured output.",
                  cause,
                }),
              ),
          }),
        );
      });

    const generateCommitMessage: TextGeneration.TextGeneration["Service"]["generateCommitMessage"] =
      Effect.fn("SouthbagCodeTextGeneration.generateCommitMessage")(function* (input) {
        const { prompt, outputSchema } = buildCommitMessagePrompt({
          branch: input.branch,
          stagedSummary: input.stagedSummary,
          stagedPatch: input.stagedPatch,
          includeBranch: input.includeBranch === true,
          policy: input.policy,
        });
        const generated = yield* runSouthbagCodeJson({
          operation: "generateCommitMessage",
          cwd: input.cwd,
          prompt,
          outputSchemaJson: outputSchema,
        });
        return {
          subject: sanitizeCommitSubject(generated.subject),
          body: generated.body.trim(),
          ...("branch" in generated && typeof generated.branch === "string"
            ? { branch: sanitizeFeatureBranchName(generated.branch) }
            : {}),
        };
      });

    const generatePrContent: TextGeneration.TextGeneration["Service"]["generatePrContent"] =
      Effect.fn("SouthbagCodeTextGeneration.generatePrContent")(function* (input) {
        const { prompt, outputSchema } = buildPrContentPrompt({
          baseBranch: input.baseBranch,
          headBranch: input.headBranch,
          commitSummary: input.commitSummary,
          diffSummary: input.diffSummary,
          diffPatch: input.diffPatch,
          policy: input.policy,
          changeRequestTemplate: input.changeRequestTemplate,
        });
        const generated = yield* runSouthbagCodeJson({
          operation: "generatePrContent",
          cwd: input.cwd,
          prompt,
          outputSchemaJson: outputSchema,
        });
        return { title: sanitizePrTitle(generated.title), body: generated.body.trim() };
      });

    const generateBranchName: TextGeneration.TextGeneration["Service"]["generateBranchName"] =
      Effect.fn("SouthbagCodeTextGeneration.generateBranchName")(function* (input) {
        const { prompt, outputSchema } = buildBranchNamePrompt({
          message: input.message,
          attachments: input.attachments,
        });
        const generated = yield* runSouthbagCodeJson({
          operation: "generateBranchName",
          cwd: input.cwd,
          prompt,
          outputSchemaJson: outputSchema,
        });
        return { branch: sanitizeBranchFragment(generated.branch) };
      });

    const generateThreadTitle: TextGeneration.TextGeneration["Service"]["generateThreadTitle"] =
      Effect.fn("SouthbagCodeTextGeneration.generateThreadTitle")(function* (input) {
        const { prompt, outputSchema } = buildThreadTitlePrompt({
          message: input.message,
          previousTitle: input.previousTitle,
          linkedContext: input.linkedContext,
          attachments: input.attachments,
        });
        const generated = yield* runSouthbagCodeJson({
          operation: "generateThreadTitle",
          cwd: input.cwd,
          prompt,
          outputSchemaJson: outputSchema,
        });
        return {
          title: sanitizeThreadTitle(generated.title),
          ...(generated.needsRefinement ? { needsRefinement: true } : {}),
        } satisfies TextGeneration.ThreadTitleGenerationResult;
      });

    return {
      generateCommitMessage,
      generatePrContent,
      generateBranchName,
      generateThreadTitle,
    } satisfies TextGeneration.TextGeneration["Service"];
  },
);
