/**
 * SouthbagCodeAdapter — Southbag Code (`southbag-code --mode rpc`) as a
 * provider adapter.
 *
 * One RPC process per thread, spawned in the thread's workspace and kept
 * alive for the session. Sessions persist under
 * `<stateDir>/providers/southbag-code/sessions/<threadId>/` and the session
 * file is recorded in the resume cursor so a restarted server reopens the
 * same conversation with `--session <file>`.
 *
 * Turn model: `sendTurn` sends `prompt` and returns once the agent accepts
 * it; a second `sendTurn` while the agent is still running is a steer
 * (`streamingBehavior: "steer"`) on the same turn. The turn settles on the
 * agent's `agent_end` event: `turn.completed` normally, `turn.aborted` after
 * `interruptTurn` (RPC `abort`), or `turn.completed` with `state: "failed"`
 * when the stream reported an `error` delta.
 *
 * The agent runs tools without asking, so there are no permission prompts.
 * Extension-UI `confirm` requests become approval requests and
 * `select`/`input`/`editor` become user-input requests; anything unanswered
 * when the turn stops is cancelled with the protocol's `cancelled: true`.
 *
 * @module provider/Layers/SouthbagCodeAdapter
 */
import {
  ApprovalRequestId,
  EventId,
  type ModelSelection,
  type ProviderApprovalDecision,
  type ProviderRuntimeEvent,
  type ProviderSession,
  type ProviderUserInputAnswers,
  ProviderInstanceId,
  RuntimeItemId,
  RuntimeRequestId,
  SOUTHBAG_CODE_DEFAULT_MODEL,
  SOUTHBAG_CODE_DRIVER_KIND,
  type SouthbagCodeSettings,
  type ThreadId,
  type ToolLifecycleItemType,
  TurnId,
  type TurnTokenUsage,
  type UserInputQuestion,
} from "@t3tools/contracts";
import { getModelSelectionStringOptionValue } from "@t3tools/shared/model";
import { deriveToolActivityPresentation } from "@t3tools/shared/toolActivity";
import * as Crypto from "effect/Crypto";
import * as DateTime from "effect/DateTime";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Predicate from "effect/Predicate";
import * as PubSub from "effect/PubSub";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Semaphore from "effect/Semaphore";
import * as Stream from "effect/Stream";
import * as SynchronizedRef from "effect/SynchronizedRef";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";

import { resolveAttachmentPath } from "../../attachmentStore.ts";
import { ServerConfig } from "../../config.ts";
import {
  ProviderAdapterProcessError,
  ProviderAdapterRequestError,
  ProviderAdapterSessionNotFoundError,
  ProviderAdapterValidationError,
  type ProviderAdapterError,
} from "../Errors.ts";
import { buildRuntimeInstructions } from "../RuntimeInstructions.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import type { EventNdjsonLogger } from "./EventNdjsonLogger.ts";
import {
  isSouthbagCodeThinkingLevel,
  parseSouthbagCodeModelSlug,
  SOUTHBAG_CODE_THINKING_OPTION_ID,
} from "./SouthbagCodeProvider.ts";
import {
  makeSouthbagCodeRpcClient,
  type SouthbagCodeRpcClient,
  type SouthbagCodeRpcError,
  type SouthbagCodeRpcEvent,
} from "./SouthbagCodeRpc.ts";

const PROVIDER = SOUTHBAG_CODE_DRIVER_KIND;
const RESUME_VERSION = 1 as const;
const STATE_TIMEOUT_MS = 20_000;
const STATS_TIMEOUT_MS = 3_000;
const TOOL_OUTPUT_MAX_CHARS = 8_000;
const TOOL_OUTPUT_TRUNCATION_MARKER = "[Earlier output truncated]\n\n";

export interface SouthbagCodeAdapterOptions {
  readonly environment?: NodeJS.ProcessEnv;
  readonly nativeEventLogger?: EventNdjsonLogger;
  readonly instanceId?: ProviderInstanceId;
}

export interface SouthbagCodeAdapterShape extends ProviderAdapterShape<ProviderAdapterError> {}

export interface SouthbagCodeResumeCursor {
  readonly schemaVersion: typeof RESUME_VERSION;
  readonly sessionFile: string;
  readonly sessionId?: string;
}

export function parseSouthbagCodeResume(raw: unknown): SouthbagCodeResumeCursor | undefined {
  if (!Predicate.isObject(raw)) return undefined;
  if (raw.schemaVersion !== RESUME_VERSION) return undefined;
  if (!Predicate.isString(raw.sessionFile) || !raw.sessionFile.trim()) return undefined;
  return {
    schemaVersion: RESUME_VERSION,
    sessionFile: raw.sessionFile.trim(),
    ...(Predicate.isString(raw.sessionId) && raw.sessionId.trim()
      ? { sessionId: raw.sessionId.trim() }
      : {}),
  };
}

// ---------------------------------------------------------------------------
// RPC payload decoders (loose: the agent's message shapes are provider-defined)
// ---------------------------------------------------------------------------

const RpcStateData = Schema.Struct({
  model: Schema.optional(
    Schema.NullOr(Schema.Struct({ id: Schema.String, provider: Schema.String })),
  ),
  thinkingLevel: Schema.optional(Schema.String),
  sessionFile: Schema.optional(Schema.String),
  sessionId: Schema.optional(Schema.String),
});
const decodeRpcState = Schema.decodeUnknownOption(RpcStateData);

const RpcUsage = Schema.Struct({
  input: Schema.optional(Schema.Finite),
  output: Schema.optional(Schema.Finite),
  cacheRead: Schema.optional(Schema.Finite),
  cacheWrite: Schema.optional(Schema.Finite),
  reasoning: Schema.optional(Schema.Finite),
});
const RpcAgentMessage = Schema.Struct({
  role: Schema.String,
  usage: Schema.optional(RpcUsage),
  stopReason: Schema.optional(Schema.String),
  errorMessage: Schema.optional(Schema.String),
});
const decodeRpcAgentMessage = Schema.decodeUnknownOption(RpcAgentMessage);

const RpcToolCall = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  arguments: Schema.optional(Schema.Unknown),
});
const decodeRpcToolCall = Schema.decodeUnknownOption(RpcToolCall);

const RpcSessionStats = Schema.Struct({
  contextUsage: Schema.optional(
    Schema.NullOr(
      Schema.Struct({
        tokens: Schema.NullOr(Schema.Finite),
        contextWindow: Schema.optional(Schema.NullOr(Schema.Finite)),
      }),
    ),
  ),
});
const decodeRpcSessionStats = Schema.decodeUnknownOption(RpcSessionStats);

const RpcCompactionResult = Schema.Struct({
  tokensBefore: Schema.optional(Schema.Finite),
  estimatedTokensAfter: Schema.optional(Schema.Finite),
});
const decodeRpcCompactionResult = Schema.decodeUnknownOption(RpcCompactionResult);

function nonEmptyString(value: unknown): string | undefined {
  return Predicate.isString(value) && value.trim().length > 0 ? value.trim() : undefined;
}

function nonNegativeInt(value: unknown): number | undefined {
  return Predicate.isNumber(value) && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

/** Tool result `content` blocks → one text blob, bounded to a tail like ACP output. */
export function southbagCodeToolOutputText(result: unknown): string | undefined {
  if (!Predicate.isObject(result)) return undefined;
  const content = result.content;
  if (!Array.isArray(content)) return undefined;
  const text = content
    .flatMap((entry) =>
      Predicate.isObject(entry) && entry.type === "text" && Predicate.isString(entry.text)
        ? [entry.text]
        : [],
    )
    .join("\n");
  if (text.length === 0) return undefined;
  return text.length <= TOOL_OUTPUT_MAX_CHARS
    ? text
    : `${TOOL_OUTPUT_TRUNCATION_MARKER}${text.slice(text.length - TOOL_OUTPUT_MAX_CHARS)}`;
}

/** Built-in Southbag tool names → canonical item types and ACP-style kinds. */
export function southbagCodeToolItemType(toolName: string): {
  readonly itemType: ToolLifecycleItemType;
  readonly kind: string;
} {
  switch (toolName.trim().toLowerCase()) {
    case "bash":
      return { itemType: "command_execution", kind: "execute" };
    case "edit":
    case "write":
      return { itemType: "file_change", kind: "edit" };
    case "read":
      return { itemType: "dynamic_tool_call", kind: "read" };
    case "grep":
    case "find":
    case "ls":
      return { itemType: "dynamic_tool_call", kind: "search" };
    default:
      return { itemType: "dynamic_tool_call", kind: toolName.trim().toLowerCase() || "other" };
  }
}

/** Extension-UI `select`/`input`/`editor` → one user-input question. */
export function southbagCodeUserInputQuestion(
  requestId: string,
  request: SouthbagCodeRpcEvent,
): UserInputQuestion | undefined {
  const method = request.method;
  const title = nonEmptyString(request.title) ?? "southbag code is asking";
  if (method === "select") {
    const options = Array.isArray(request.options)
      ? request.options.flatMap((option) =>
          Predicate.isString(option) && option.trim().length > 0
            ? [{ label: option.trim(), description: "" }]
            : [],
        )
      : [];
    if (options.length === 0) return undefined;
    return { id: requestId, header: title, question: title, options, multiSelect: false };
  }
  if (method === "input" || method === "editor") {
    const placeholder = nonEmptyString(request.placeholder) ?? nonEmptyString(request.prefill);
    return {
      id: requestId,
      header: title,
      question: placeholder ? `${title} (${placeholder})` : title,
      options: [],
      allowCustomAnswer: true,
      multiSelect: false,
    };
  }
  return undefined;
}

function firstAnswerValue(
  answers: ProviderUserInputAnswers,
  questionId: string,
): string | undefined {
  const raw = answers[questionId];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return nonEmptyString(value);
}

interface ToolCallState {
  readonly toolCallId: string;
  readonly toolName: string;
  readonly args: unknown;
  readonly itemType: ToolLifecycleItemType;
  readonly kind: string;
  started: boolean;
}

interface PendingApproval {
  readonly uiRequestId: string;
  readonly decision: Deferred.Deferred<ProviderApprovalDecision>;
}

interface PendingUserInput {
  readonly uiRequestId: string;
  readonly questionId: string;
  readonly answer: Deferred.Deferred<string | undefined>;
}

interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheCreationTokens: number;
  reasoningTokens: number;
  sawUsage: boolean;
}

interface SessionContext {
  readonly threadId: ThreadId;
  session: ProviderSession;
  readonly scope: Scope.Closeable;
  readonly rpc: SouthbagCodeRpcClient;
  readonly cwd: string;
  activeTurnId: TurnId | undefined;
  /** Set by interruptTurn; agent_end then settles as turn.aborted. */
  interruptedTurnId: TurnId | undefined;
  /** Message from an `error` delta; agent_end then settles as failed. */
  turnFailure: string | undefined;
  usage: TurnUsage;
  assistantItemId: string | undefined;
  readonly toolCalls: Map<string, ToolCallState>;
  readonly pendingApprovals: Map<ApprovalRequestId, PendingApproval>;
  readonly pendingUserInputs: Map<ApprovalRequestId, PendingUserInput>;
  turns: Array<{ id: TurnId; items: Array<unknown> }>;
  /** `provider/modelId` the agent reports as current. */
  currentModel: string | undefined;
  thinkingLevel: string | undefined;
  stopped: boolean;
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
/** A runtime event minus the fields the adapter stamps on every emission. */
type RuntimeEventInput = DistributiveOmit<
  ProviderRuntimeEvent,
  "eventId" | "createdAt" | "provider" | "providerInstanceId" | "threadId"
>;

const emptyUsage = (): TurnUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0,
  cacheCreationTokens: 0,
  reasoningTokens: 0,
  sawUsage: false,
});

function turnTokenUsage(usage: TurnUsage): TurnTokenUsage {
  return usage.sawUsage
    ? {
        usageStatus: "complete",
        usageScope: "main_agent",
        hasSubagents: false,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        cacheCreationTokens: usage.cacheCreationTokens,
        ...(usage.reasoningTokens > 0 ? { reasoningTokens: usage.reasoningTokens } : {}),
      }
    : { usageStatus: "unavailable", usageScope: "main_agent", hasSubagents: false };
}

export function makeSouthbagCodeAdapter(
  settings: SouthbagCodeSettings,
  options?: SouthbagCodeAdapterOptions,
) {
  return Effect.gen(function* () {
    const boundInstanceId = options?.instanceId ?? ProviderInstanceId.make(PROVIDER);
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const childProcessSpawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const serverConfig = yield* ServerConfig;
    const crypto = yield* Crypto.Crypto;
    const adapterScope = yield* Effect.scope;
    const nativeEventLogger = options?.nativeEventLogger;
    const environment = options?.environment ?? process.env;
    const binaryPath = settings.binaryPath || "southbag-code";

    const sessions = new Map<ThreadId, SessionContext>();
    const threadLocksRef = yield* SynchronizedRef.make(new Map<string, Semaphore.Semaphore>());
    const runtimeEventPubSub = yield* PubSub.unbounded<ProviderRuntimeEvent>();

    const nowIso = Effect.map(DateTime.now, DateTime.formatIso);
    const randomUUIDv4 = crypto.randomUUIDv4.pipe(
      Effect.mapError(
        (cause) =>
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "crypto/randomUUIDv4",
            detail: "Failed to generate a Southbag Code runtime identifier.",
            cause,
          }),
      ),
    );
    const makeEventStamp = () =>
      Effect.all({ eventId: Effect.map(randomUUIDv4, EventId.make), createdAt: nowIso });

    const offerRuntimeEvent = (event: ProviderRuntimeEvent) =>
      PubSub.publish(runtimeEventPubSub, event).pipe(Effect.asVoid);

    const emit = (ctx: SessionContext, event: RuntimeEventInput) =>
      Effect.gen(function* () {
        const stamp = yield* makeEventStamp();
        yield* offerRuntimeEvent({
          ...event,
          ...stamp,
          provider: PROVIDER,
          providerInstanceId: boundInstanceId,
          threadId: ctx.threadId,
        });
      });

    const getThreadSemaphore = (threadId: string) =>
      SynchronizedRef.modifyEffect(threadLocksRef, (current) => {
        const existing = Option.fromNullishOr(current.get(threadId));
        return Option.match(existing, {
          onNone: () =>
            Semaphore.make(1).pipe(
              Effect.map((semaphore) => {
                const next = new Map(current);
                next.set(threadId, semaphore);
                return [semaphore, next] as const;
              }),
            ),
          onSome: (semaphore) => Effect.succeed([semaphore, current] as const),
        });
      });
    const withThreadLock = <A, E, R>(threadId: string, effect: Effect.Effect<A, E, R>) =>
      Effect.flatMap(getThreadSemaphore(threadId), (semaphore) => semaphore.withPermit(effect));

    const logNative = (threadId: ThreadId, method: string, payload: unknown) =>
      Effect.gen(function* () {
        if (!nativeEventLogger) return;
        const observedAt = yield* nowIso;
        yield* nativeEventLogger.write(
          {
            observedAt,
            event: {
              id: yield* randomUUIDv4,
              kind: "notification",
              provider: PROVIDER,
              createdAt: observedAt,
              method,
              threadId,
              payload,
            },
          },
          threadId,
        );
      }).pipe(
        Effect.catchCause((cause) =>
          Effect.logWarning("Failed to write native Southbag Code log.", { cause, threadId }),
        ),
      );

    const rpcRequestError = (method: string) => (cause: SouthbagCodeRpcError) =>
      new ProviderAdapterRequestError({ provider: PROVIDER, method, detail: cause.message, cause });

    const requireSession = (
      threadId: ThreadId,
    ): Effect.Effect<SessionContext, ProviderAdapterSessionNotFoundError> => {
      const ctx = sessions.get(threadId);
      return !ctx || ctx.stopped
        ? Effect.fail(new ProviderAdapterSessionNotFoundError({ provider: PROVIDER, threadId }))
        : Effect.succeed(ctx);
    };

    const setSessionReady = (ctx: SessionContext) =>
      Effect.gen(function* () {
        const { activeTurnId: _activeTurnId, ...rest } = ctx.session;
        ctx.activeTurnId = undefined;
        ctx.interruptedTurnId = undefined;
        ctx.turnFailure = undefined;
        ctx.assistantItemId = undefined;
        ctx.toolCalls.clear();
        ctx.session = { ...rest, status: "ready", updatedAt: yield* nowIso };
      });

    const cancelPendingUi = (ctx: SessionContext) =>
      Effect.gen(function* () {
        for (const pending of ctx.pendingApprovals.values()) {
          yield* Deferred.succeed(pending.decision, "cancel").pipe(Effect.ignore);
        }
        for (const pending of ctx.pendingUserInputs.values()) {
          yield* Deferred.succeed(pending.answer, undefined).pipe(Effect.ignore);
        }
      });

    // -----------------------------------------------------------------------
    // Model + thinking selection
    // -----------------------------------------------------------------------

    const applyModelSelection = (ctx: SessionContext, modelSelection: ModelSelection | undefined) =>
      Effect.gen(function* () {
        if (!modelSelection) return;
        const requested = modelSelection.model.trim();
        if (requested.length > 0 && requested !== ctx.currentModel) {
          const parsed = parseSouthbagCodeModelSlug(requested);
          if (!parsed) {
            return yield* new ProviderAdapterValidationError({
              provider: PROVIDER,
              operation: "set_model",
              issue: `Southbag Code models are 'provider/modelId' slugs; received '${requested}'.`,
            });
          }
          yield* ctx.rpc
            .request({ type: "set_model", provider: parsed.provider, modelId: parsed.modelId })
            .pipe(Effect.mapError(rpcRequestError("set_model")));
          ctx.currentModel = requested;
        }
        const thinkingLevel = getModelSelectionStringOptionValue(
          modelSelection,
          SOUTHBAG_CODE_THINKING_OPTION_ID,
        );
        if (
          thinkingLevel !== undefined &&
          isSouthbagCodeThinkingLevel(thinkingLevel) &&
          thinkingLevel !== ctx.thinkingLevel
        ) {
          yield* ctx.rpc
            .request({ type: "set_thinking_level", level: thinkingLevel })
            .pipe(Effect.mapError(rpcRequestError("set_thinking_level")));
          ctx.thinkingLevel = thinkingLevel;
        }
      });

    // -----------------------------------------------------------------------
    // Turn settlement
    // -----------------------------------------------------------------------

    const emitTokenUsageSnapshot = (ctx: SessionContext) =>
      Effect.gen(function* () {
        const stats = yield* ctx.rpc
          .request({ type: "get_session_stats" }, { timeout: STATS_TIMEOUT_MS })
          .pipe(Effect.option);
        if (Option.isNone(stats)) return;
        const decoded = decodeRpcSessionStats(stats.value);
        if (Option.isNone(decoded)) return;
        const contextUsage = decoded.value.contextUsage;
        const usedTokens = nonNegativeInt(contextUsage?.tokens);
        if (usedTokens === undefined) return;
        const maxTokens = nonNegativeInt(contextUsage?.contextWindow);
        yield* emit(ctx, {
          type: "thread.token-usage.updated",
          payload: {
            usage: {
              usedTokens,
              ...(maxTokens !== undefined && maxTokens > 0 ? { maxTokens } : {}),
            },
          },
        });
      });

    const settleTurn = (ctx: SessionContext) =>
      Effect.gen(function* () {
        const turnId = ctx.activeTurnId;
        if (turnId === undefined) return;
        const tokenUsage = turnTokenUsage(ctx.usage);
        const aborted = ctx.interruptedTurnId === turnId;
        const failure = ctx.turnFailure;
        yield* cancelPendingUi(ctx);
        // Context usage first so the terminal turn event stays the last word.
        yield* emitTokenUsageSnapshot(ctx);
        yield* setSessionReady(ctx);
        if (aborted) {
          yield* emit(ctx, {
            type: "turn.aborted",
            turnId,
            payload: { reason: "Interrupted by user.", tokenUsage },
          });
        } else if (failure !== undefined) {
          yield* emit(ctx, {
            type: "turn.completed",
            turnId,
            payload: { state: "failed", errorMessage: failure, tokenUsage },
          });
        } else {
          yield* emit(ctx, {
            type: "turn.completed",
            turnId,
            payload: { state: "completed", stopReason: "stop", tokenUsage },
          });
        }
      });

    // -----------------------------------------------------------------------
    // Event mapping
    // -----------------------------------------------------------------------

    const toolItemPayload = (
      tool: ToolCallState,
      status: "inProgress" | "completed" | "failed",
      output?: unknown,
    ) => {
      const args = Predicate.isObject(tool.args) ? tool.args : undefined;
      const command = nonEmptyString(args?.command);
      const outputText = southbagCodeToolOutputText(output);
      const data: Record<string, unknown> = {
        toolCallId: tool.toolCallId,
        kind: tool.kind,
        tool: tool.toolName,
        ...(command ? { command } : {}),
        ...(tool.args !== undefined ? { rawInput: tool.args } : {}),
        ...(outputText !== undefined ? { rawOutput: { content: outputText } } : {}),
        ...(nonEmptyString(args?.path) ? { locations: [{ path: args?.path }] } : {}),
      };
      const presentation = deriveToolActivityPresentation({
        itemType: tool.itemType,
        title: tool.toolName,
        detail: command ?? nonEmptyString(args?.path),
        data,
        fallbackSummary: tool.toolName,
      });
      return {
        itemType: tool.itemType,
        status,
        ...(presentation.summary ? { title: presentation.summary } : { title: tool.toolName }),
        ...(presentation.detail ? { detail: presentation.detail } : {}),
        data,
      };
    };

    const ensureToolStarted = (ctx: SessionContext, tool: ToolCallState) =>
      Effect.gen(function* () {
        if (tool.started) return;
        tool.started = true;
        yield* emit(ctx, {
          type: "item.started",
          turnId: ctx.activeTurnId,
          itemId: RuntimeItemId.make(tool.toolCallId),
          payload: toolItemPayload(tool, "inProgress"),
        });
      });

    const rememberToolCall = (
      ctx: SessionContext,
      input: { readonly id: string; readonly name: string; readonly arguments?: unknown },
    ): ToolCallState => {
      const existing = ctx.toolCalls.get(input.id);
      if (existing) return existing;
      const { itemType, kind } = southbagCodeToolItemType(input.name);
      const tool: ToolCallState = {
        toolCallId: input.id,
        toolName: input.name,
        args: input.arguments,
        itemType,
        kind,
        started: false,
      };
      ctx.toolCalls.set(input.id, tool);
      return tool;
    };

    const accumulateUsage = (ctx: SessionContext, message: unknown) => {
      const decoded = decodeRpcAgentMessage(message);
      if (Option.isNone(decoded) || decoded.value.role !== "assistant") return;
      const usage = decoded.value.usage;
      if (!usage) return;
      const cacheRead = nonNegativeInt(usage.cacheRead) ?? 0;
      const cacheWrite = nonNegativeInt(usage.cacheWrite) ?? 0;
      ctx.usage.inputTokens += (nonNegativeInt(usage.input) ?? 0) + cacheRead + cacheWrite;
      ctx.usage.outputTokens += nonNegativeInt(usage.output) ?? 0;
      ctx.usage.cachedInputTokens += cacheRead;
      ctx.usage.cacheCreationTokens += cacheWrite;
      ctx.usage.reasoningTokens += nonNegativeInt(usage.reasoning) ?? 0;
      ctx.usage.sawUsage = true;
    };

    const handleExtensionUiRequest = (ctx: SessionContext, event: SouthbagCodeRpcEvent) =>
      Effect.gen(function* () {
        const uiRequestId = nonEmptyString(event.id);
        const method = nonEmptyString(event.method);
        if (!uiRequestId || !method) return;
        const cancel = ctx.rpc
          .send({ type: "extension_ui_response", id: uiRequestId, cancelled: true })
          .pipe(Effect.ignore);
        const turnId = ctx.activeTurnId;
        if (method === "confirm") {
          const requestId = ApprovalRequestId.make(yield* randomUUIDv4);
          const runtimeRequestId = RuntimeRequestId.make(requestId);
          const decision = yield* Deferred.make<ProviderApprovalDecision>();
          ctx.pendingApprovals.set(requestId, { uiRequestId, decision });
          const title = nonEmptyString(event.title) ?? "southbag code wants a yes or no";
          const message = nonEmptyString(event.message);
          yield* emit(ctx, {
            type: "request.opened",
            turnId,
            requestId: runtimeRequestId,
            payload: {
              requestType: "dynamic_tool_call",
              detail: message ? `${title}\n${message}` : title,
              args: event,
              options: [
                { decision: "accept", label: "yes" },
                { decision: "decline", label: "no" },
              ],
            },
          });
          const resolved = yield* Deferred.await(decision);
          ctx.pendingApprovals.delete(requestId);
          yield* emit(ctx, {
            type: "request.resolved",
            turnId,
            requestId: runtimeRequestId,
            payload: { requestType: "dynamic_tool_call", decision: resolved },
          });
          if (resolved === "cancel") {
            yield* cancel;
            return;
          }
          const confirmed = resolved !== "decline";
          yield* ctx.rpc
            .send({ type: "extension_ui_response", id: uiRequestId, confirmed })
            .pipe(Effect.ignore);
          return;
        }
        const question = southbagCodeUserInputQuestion(uiRequestId, event);
        if (!question) {
          // notify/setStatus/setWidget/setTitle are fire-and-forget; anything
          // else is a dialog this host cannot render, so dismiss it.
          if (method === "select" || method === "input" || method === "editor") {
            yield* cancel;
          }
          return;
        }
        const requestId = ApprovalRequestId.make(yield* randomUUIDv4);
        const runtimeRequestId = RuntimeRequestId.make(requestId);
        const answer = yield* Deferred.make<string | undefined>();
        ctx.pendingUserInputs.set(requestId, { uiRequestId, questionId: question.id, answer });
        yield* emit(ctx, {
          type: "user-input.requested",
          turnId,
          requestId: runtimeRequestId,
          payload: { questions: [question] },
        });
        const value = yield* Deferred.await(answer);
        ctx.pendingUserInputs.delete(requestId);
        yield* emit(ctx, {
          type: "user-input.resolved",
          turnId,
          requestId: runtimeRequestId,
          payload: { answers: value === undefined ? {} : { [question.id]: value } },
        });
        if (value === undefined) {
          yield* cancel;
          return;
        }
        yield* ctx.rpc
          .send({ type: "extension_ui_response", id: uiRequestId, value })
          .pipe(Effect.ignore);
      });

    const handleRpcEvent = (ctx: SessionContext, event: SouthbagCodeRpcEvent) =>
      Effect.gen(function* () {
        yield* logNative(ctx.threadId, event.type, event);
        const turnId = ctx.activeTurnId;
        switch (event.type) {
          case "message_start": {
            const role = Predicate.isObject(event.message) ? event.message.role : undefined;
            if (role !== "assistant" || turnId === undefined) return;
            const itemId = yield* randomUUIDv4;
            ctx.assistantItemId = itemId;
            yield* emit(ctx, {
              type: "item.started",
              turnId,
              itemId: RuntimeItemId.make(itemId),
              payload: { itemType: "assistant_message", status: "inProgress" },
            });
            return;
          }
          case "message_update": {
            const delta = event.assistantMessageEvent;
            if (!Predicate.isObject(delta) || turnId === undefined) return;
            switch (delta.type) {
              case "text_delta":
              case "thinking_delta": {
                if (!Predicate.isString(delta.delta) || delta.delta.length === 0) return;
                yield* emit(ctx, {
                  type: "content.delta",
                  turnId,
                  ...(ctx.assistantItemId
                    ? { itemId: RuntimeItemId.make(ctx.assistantItemId) }
                    : {}),
                  payload: {
                    streamKind: delta.type === "text_delta" ? "assistant_text" : "reasoning_text",
                    delta: delta.delta,
                    ...(Predicate.isNumber(delta.contentIndex)
                      ? { contentIndex: delta.contentIndex }
                      : {}),
                  },
                });
                return;
              }
              case "toolcall_end": {
                const toolCall = decodeRpcToolCall(delta.toolCall);
                if (Option.isNone(toolCall)) return;
                yield* ensureToolStarted(ctx, rememberToolCall(ctx, toolCall.value));
                return;
              }
              case "error": {
                if (delta.reason === "aborted") {
                  ctx.interruptedTurnId = turnId;
                  return;
                }
                const errored = Predicate.isObject(delta.error) ? delta.error : undefined;
                ctx.turnFailure =
                  nonEmptyString(errored?.errorMessage) ?? "southbag code stopped with an error 3:";
                return;
              }
              default:
                return;
            }
          }
          case "message_end": {
            const message = event.message;
            const role = Predicate.isObject(message) ? message.role : undefined;
            if (role !== "assistant") return;
            accumulateUsage(ctx, message);
            const decoded = decodeRpcAgentMessage(message);
            if (Option.isSome(decoded) && decoded.value.stopReason === "aborted") {
              ctx.interruptedTurnId = turnId;
            } else if (Option.isSome(decoded) && decoded.value.stopReason === "error") {
              ctx.turnFailure =
                ctx.turnFailure ??
                nonEmptyString(decoded.value.errorMessage) ??
                "southbag code stopped with an error 3:";
            }
            if (ctx.assistantItemId === undefined || turnId === undefined) return;
            const itemId = ctx.assistantItemId;
            ctx.assistantItemId = undefined;
            yield* emit(ctx, {
              type: "item.completed",
              turnId,
              itemId: RuntimeItemId.make(itemId),
              payload: { itemType: "assistant_message", status: "completed" },
            });
            return;
          }
          case "tool_execution_start": {
            const toolCallId = nonEmptyString(event.toolCallId);
            const toolName = nonEmptyString(event.toolName);
            if (!toolCallId || !toolName || turnId === undefined) return;
            const tool = rememberToolCall(ctx, {
              id: toolCallId,
              name: toolName,
              arguments: event.args,
            });
            if (tool.started) {
              yield* emit(ctx, {
                type: "item.updated",
                turnId,
                itemId: RuntimeItemId.make(tool.toolCallId),
                payload: toolItemPayload(tool, "inProgress"),
              });
              return;
            }
            yield* ensureToolStarted(ctx, tool);
            return;
          }
          case "tool_execution_update": {
            const toolCallId = nonEmptyString(event.toolCallId);
            const tool = toolCallId ? ctx.toolCalls.get(toolCallId) : undefined;
            if (!tool || turnId === undefined) return;
            yield* ensureToolStarted(ctx, tool);
            yield* emit(ctx, {
              type: "item.updated",
              turnId,
              itemId: RuntimeItemId.make(tool.toolCallId),
              payload: toolItemPayload(tool, "inProgress", event.partialResult),
            });
            return;
          }
          case "tool_execution_end": {
            const toolCallId = nonEmptyString(event.toolCallId);
            const toolName = nonEmptyString(event.toolName);
            if (!toolCallId || turnId === undefined) return;
            const tool = rememberToolCall(ctx, {
              id: toolCallId,
              name: toolName ?? "tool",
              arguments: ctx.toolCalls.get(toolCallId)?.args,
            });
            yield* ensureToolStarted(ctx, tool);
            ctx.toolCalls.delete(toolCallId);
            yield* emit(ctx, {
              type: "item.completed",
              turnId,
              itemId: RuntimeItemId.make(tool.toolCallId),
              payload: toolItemPayload(
                tool,
                event.isError === true ? "failed" : "completed",
                event.result,
              ),
            });
            return;
          }
          case "agent_end": {
            if (Array.isArray(event.messages)) {
              // Usage was folded in at message_end; only note aborts we missed.
              for (const message of event.messages) {
                const decoded = decodeRpcAgentMessage(message);
                if (Option.isSome(decoded) && decoded.value.stopReason === "aborted") {
                  ctx.interruptedTurnId = turnId;
                }
              }
            }
            yield* settleTurn(ctx);
            return;
          }
          case "compaction_end": {
            const result = decodeRpcCompactionResult(event.result);
            if (event.aborted === true) return;
            const errorMessage = nonEmptyString(event.errorMessage);
            if (errorMessage) {
              yield* emit(ctx, {
                type: "runtime.warning",
                turnId,
                payload: { message: `context compaction failed 3: ${errorMessage}` },
              });
              return;
            }
            const beforeTokens = Option.isSome(result)
              ? nonNegativeInt(result.value.tokensBefore)
              : undefined;
            const afterTokens = Option.isSome(result)
              ? nonNegativeInt(result.value.estimatedTokensAfter)
              : undefined;
            yield* emit(ctx, {
              type: "thread.state.changed",
              turnId,
              payload: {
                state: "compacted",
                ...(beforeTokens !== undefined ? { beforeTokens } : {}),
                ...(afterTokens !== undefined ? { afterTokens } : {}),
                detail: { reason: event.reason },
              },
            });
            return;
          }
          case "auto_retry_start": {
            const attempt = nonNegativeInt(event.attempt);
            const maxAttempts = nonNegativeInt(event.maxAttempts);
            yield* emit(ctx, {
              type: "runtime.warning",
              turnId,
              payload: {
                message:
                  attempt !== undefined && maxAttempts !== undefined
                    ? `southbag code is retrying (${attempt}/${maxAttempts}) 3:`
                    : "southbag code is retrying 3:",
                detail: event,
              },
            });
            return;
          }
          case "extension_error": {
            const detail = nonEmptyString(event.error) ?? "unknown error";
            const extensionPath = nonEmptyString(event.extensionPath);
            yield* emit(ctx, {
              type: "runtime.warning",
              turnId,
              payload: {
                message: extensionPath
                  ? `southbag code extension ${extensionPath} failed 3: ${detail}`
                  : `southbag code extension failed 3: ${detail}`,
                detail: event,
              },
            });
            return;
          }
          case "extension_ui_request": {
            // Dialogs block the agent until answered; keep the event loop free.
            yield* handleExtensionUiRequest(ctx, event).pipe(
              Effect.catchCause((cause) =>
                Effect.logWarning("Southbag Code extension UI request failed.", { cause }),
              ),
              Effect.forkIn(ctx.scope),
            );
            return;
          }
          default:
            return;
        }
      });

    const handleProcessExit = (ctx: SessionContext) =>
      withThreadLock(
        ctx.threadId,
        Effect.gen(function* () {
          if (ctx.stopped || sessions.get(ctx.threadId) !== ctx) return;
          ctx.stopped = true;
          sessions.delete(ctx.threadId);
          yield* cancelPendingUi(ctx);
          const turnId = ctx.activeTurnId;
          if (turnId !== undefined) {
            ctx.turnFailure = "southbag-code exited before the turn finished 3:";
            const tokenUsage = turnTokenUsage(ctx.usage);
            yield* setSessionReady(ctx);
            yield* emit(ctx, {
              type: "turn.completed",
              turnId,
              payload: {
                state: "failed",
                errorMessage: "southbag-code exited before the turn finished 3:",
                tokenUsage,
              },
            });
          }
          ctx.session = { ...ctx.session, status: "closed", updatedAt: yield* nowIso };
          yield* emit(ctx, {
            type: "session.exited",
            payload: {
              exitKind: "error",
              reason: "southbag-code process exited",
              recoverable: true,
            },
          });
          yield* Effect.ignore(Scope.close(ctx.scope, Exit.void));
        }),
      );

    const stopSessionInternal = (ctx: SessionContext) =>
      Effect.gen(function* () {
        if (ctx.stopped) return;
        ctx.stopped = true;
        sessions.delete(ctx.threadId);
        yield* cancelPendingUi(ctx);
        yield* Effect.ignore(Scope.close(ctx.scope, Exit.void));
        yield* emit(ctx, { type: "session.exited", payload: { exitKind: "graceful" } });
      });

    // -----------------------------------------------------------------------
    // Adapter surface
    // -----------------------------------------------------------------------

    const startSession: SouthbagCodeAdapterShape["startSession"] = (input) =>
      withThreadLock(
        input.threadId,
        Effect.gen(function* () {
          if (input.provider !== undefined && input.provider !== PROVIDER) {
            return yield* new ProviderAdapterValidationError({
              provider: PROVIDER,
              operation: "startSession",
              issue: `Expected provider '${PROVIDER}' but received '${input.provider}'.`,
            });
          }
          if (!input.cwd?.trim()) {
            return yield* new ProviderAdapterValidationError({
              provider: PROVIDER,
              operation: "startSession",
              issue: "cwd is required and must be non-empty.",
            });
          }
          const cwd = path.resolve(input.cwd.trim());
          const existing = sessions.get(input.threadId);
          if (existing && !existing.stopped) {
            yield* stopSessionInternal(existing);
          }

          const sessionDir = path.join(
            serverConfig.stateDir,
            "providers",
            PROVIDER,
            "sessions",
            input.threadId,
          );
          yield* fileSystem.makeDirectory(sessionDir, { recursive: true }).pipe(
            Effect.mapError(
              (cause) =>
                new ProviderAdapterProcessError({
                  provider: PROVIDER,
                  threadId: input.threadId,
                  detail: `Failed to create the Southbag Code session directory '${sessionDir}'.`,
                  cause,
                }),
            ),
          );
          const resume = parseSouthbagCodeResume(input.resumeCursor);
          const resumeFile =
            resume !== undefined &&
            (yield* fileSystem.exists(resume.sessionFile).pipe(Effect.orElseSucceed(() => false)))
              ? resume.sessionFile
              : undefined;

          const sessionScope = yield* Scope.make("sequential");
          let sessionScopeTransferred = false;
          yield* Effect.addFinalizer(() =>
            sessionScopeTransferred ? Effect.void : Scope.close(sessionScope, Exit.void),
          );

          const rpc = yield* makeSouthbagCodeRpcClient({
            binaryPath,
            args: [
              "--mode",
              "rpc",
              "--session-dir",
              sessionDir,
              ...(resumeFile ? ["--session", resumeFile] : []),
            ],
            cwd,
            environment,
            onStderr: (chunk) => logNative(input.threadId, "process/stderr", chunk),
          }).pipe(
            Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, childProcessSpawner),
            Effect.provideService(Scope.Scope, sessionScope),
            Effect.mapError(
              (cause) =>
                new ProviderAdapterProcessError({
                  provider: PROVIDER,
                  threadId: input.threadId,
                  detail: cause.message,
                  cause,
                }),
            ),
          );

          const stateData = yield* rpc
            .request({ type: "get_state" }, { timeout: STATE_TIMEOUT_MS })
            .pipe(
              Effect.mapError(
                (cause) =>
                  new ProviderAdapterProcessError({
                    provider: PROVIDER,
                    threadId: input.threadId,
                    detail: `Southbag Code did not report its session state: ${cause.message}`,
                    cause,
                  }),
              ),
            );
          const state = decodeRpcState(stateData);
          const sessionFile = Option.isSome(state)
            ? nonEmptyString(state.value.sessionFile)
            : undefined;
          const sessionId = Option.isSome(state)
            ? nonEmptyString(state.value.sessionId)
            : undefined;
          const currentModel =
            Option.isSome(state) && state.value.model
              ? `${state.value.model.provider}/${state.value.model.id}`
              : undefined;

          const now = yield* nowIso;
          const modelSelection =
            input.modelSelection?.instanceId === boundInstanceId ? input.modelSelection : undefined;
          const ctx: SessionContext = {
            threadId: input.threadId,
            session: {
              provider: PROVIDER,
              providerInstanceId: boundInstanceId,
              status: "ready",
              runtimeMode: input.runtimeMode,
              cwd,
              model: modelSelection?.model ?? SOUTHBAG_CODE_DEFAULT_MODEL,
              threadId: input.threadId,
              ...(sessionFile
                ? {
                    resumeCursor: {
                      schemaVersion: RESUME_VERSION,
                      sessionFile,
                      ...(sessionId ? { sessionId } : {}),
                    } satisfies SouthbagCodeResumeCursor,
                  }
                : {}),
              createdAt: now,
              updatedAt: now,
            },
            scope: sessionScope,
            rpc,
            cwd,
            activeTurnId: undefined,
            interruptedTurnId: undefined,
            turnFailure: undefined,
            usage: emptyUsage(),
            assistantItemId: undefined,
            toolCalls: new Map(),
            pendingApprovals: new Map(),
            pendingUserInputs: new Map(),
            turns: [],
            currentModel,
            thinkingLevel: Option.isSome(state) ? state.value.thinkingLevel : undefined,
            stopped: false,
          };

          yield* applyModelSelection(ctx, modelSelection);

          sessions.set(input.threadId, ctx);
          sessionScopeTransferred = true;

          yield* Stream.runForEach(rpc.events, (event) =>
            handleRpcEvent(ctx, event).pipe(
              Effect.catchCause((cause) =>
                Effect.logError("Failed to process a Southbag Code RPC event.", { cause }),
              ),
            ),
          ).pipe(Effect.ignore, Effect.forkIn(sessionScope));
          // Watched from the adapter scope: the handler closes the session
          // scope, which must not interrupt the fiber running it.
          yield* rpc.closed.pipe(
            Effect.andThen(handleProcessExit(ctx)),
            Effect.ignore,
            Effect.forkIn(adapterScope),
          );

          yield* emit(ctx, {
            type: "session.started",
            payload: { resume: { sessionFile, sessionId, resumed: resumeFile !== undefined } },
          });
          yield* emit(ctx, {
            type: "session.state.changed",
            payload: { state: "ready", reason: "Southbag Code RPC session ready" },
          });
          yield* emit(ctx, {
            type: "thread.started",
            payload: { ...(sessionId ? { providerThreadId: sessionId } : {}) },
          });

          return ctx.session;
        }).pipe(Effect.scoped),
      );

    const sendTurn: SouthbagCodeAdapterShape["sendTurn"] = (input) =>
      withThreadLock(
        input.threadId,
        Effect.gen(function* () {
          const ctx = yield* requireSession(input.threadId);
          const text = input.input?.trim();
          const images = yield* Effect.forEach(
            (input.attachments ?? []).filter((attachment) => attachment.type === "image"),
            (attachment) =>
              Effect.gen(function* () {
                const attachmentPath = resolveAttachmentPath({
                  attachmentsDir: serverConfig.attachmentsDir,
                  attachment,
                });
                if (!attachmentPath) {
                  return yield* new ProviderAdapterRequestError({
                    provider: PROVIDER,
                    method: "prompt",
                    detail: `Invalid attachment id '${attachment.id}'.`,
                  });
                }
                const bytes = yield* fileSystem.readFile(attachmentPath).pipe(
                  Effect.mapError(
                    (cause) =>
                      new ProviderAdapterRequestError({
                        provider: PROVIDER,
                        method: "prompt",
                        detail: cause.message,
                        cause,
                      }),
                  ),
                );
                return {
                  type: "image",
                  data: Buffer.from(bytes).toString("base64"),
                  mimeType: attachment.mimeType,
                };
              }),
          );
          if (!text && images.length === 0) {
            return yield* new ProviderAdapterValidationError({
              provider: PROVIDER,
              operation: "sendTurn",
              issue: "Turn requires non-empty text or attachments.",
            });
          }

          const modelSelection =
            input.modelSelection?.instanceId === boundInstanceId ? input.modelSelection : undefined;
          const steering = ctx.activeTurnId !== undefined;
          if (!steering) {
            yield* applyModelSelection(ctx, modelSelection);
          }
          const runtimeInstructions = buildRuntimeInstructions({
            harness: "Southbag Code",
            model: ctx.currentModel,
            reasoningEffort: ctx.thinkingLevel,
          });
          const message = `${text ?? ""}\n\n${runtimeInstructions}`.trim();
          const turnId = ctx.activeTurnId ?? TurnId.make(yield* randomUUIDv4);

          yield* ctx.rpc
            .request({
              type: "prompt",
              message,
              ...(images.length > 0 ? { images } : {}),
              ...(steering ? { streamingBehavior: "steer" } : {}),
            })
            .pipe(Effect.mapError(rpcRequestError("prompt")));

          const promptItem = { prompt: text ?? "", images: images.length, steer: steering };
          const existingTurn = ctx.turns.find((turn) => turn.id === turnId);
          if (existingTurn) {
            existingTurn.items.push(promptItem);
          } else {
            ctx.turns.push({ id: turnId, items: [promptItem] });
          }
          if (!steering) {
            ctx.activeTurnId = turnId;
            ctx.interruptedTurnId = undefined;
            ctx.turnFailure = undefined;
            ctx.usage = emptyUsage();
            ctx.session = {
              ...ctx.session,
              status: "running",
              activeTurnId: turnId,
              ...(modelSelection ? { model: modelSelection.model } : {}),
              updatedAt: yield* nowIso,
            };
            yield* emit(ctx, {
              type: "turn.started",
              turnId,
              payload: {
                ...(ctx.currentModel ? { model: ctx.currentModel } : {}),
                ...(ctx.thinkingLevel ? { effort: ctx.thinkingLevel } : {}),
              },
            });
          }
          return { threadId: input.threadId, turnId, resumeCursor: ctx.session.resumeCursor };
        }),
      );

    const interruptTurn: SouthbagCodeAdapterShape["interruptTurn"] = (threadId, turnId) =>
      withThreadLock(
        threadId,
        Effect.gen(function* () {
          const ctx = yield* requireSession(threadId);
          const activeTurnId = ctx.activeTurnId;
          if (activeTurnId === undefined || (turnId !== undefined && turnId !== activeTurnId)) {
            return;
          }
          ctx.interruptedTurnId = activeTurnId;
          yield* cancelPendingUi(ctx);
          yield* ctx.rpc.request({ type: "abort" }).pipe(Effect.mapError(rpcRequestError("abort")));
        }),
      );

    const compactThread = (threadId: ThreadId) =>
      withThreadLock(
        threadId,
        Effect.gen(function* () {
          const ctx = yield* requireSession(threadId);
          if (ctx.activeTurnId !== undefined) {
            return yield* new ProviderAdapterValidationError({
              provider: PROVIDER,
              operation: "compactThread",
              issue: "Southbag Code cannot compact while a turn is running.",
            });
          }
          // `compaction_end` on the event stream emits the compacted state.
          yield* ctx.rpc
            .request({ type: "compact" }, { timeout: "5 minutes" })
            .pipe(Effect.mapError(rpcRequestError("compact")));
        }),
      );

    const respondToRequest: SouthbagCodeAdapterShape["respondToRequest"] = (
      threadId,
      requestId,
      decision,
    ) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        const pending = ctx.pendingApprovals.get(requestId);
        if (!pending) {
          return yield* new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "extension_ui_response",
            detail: `Unknown pending approval request: ${requestId}`,
          });
        }
        yield* Deferred.succeed(pending.decision, decision);
      });

    const respondToUserInput: SouthbagCodeAdapterShape["respondToUserInput"] = (
      threadId,
      requestId,
      answers,
    ) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        const pending = ctx.pendingUserInputs.get(requestId);
        if (!pending) {
          return yield* new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "extension_ui_response",
            detail: `Unknown pending user-input request: ${requestId}`,
          });
        }
        yield* Deferred.succeed(pending.answer, firstAnswerValue(answers, pending.questionId));
      });

    const readThread: SouthbagCodeAdapterShape["readThread"] = (threadId) =>
      Effect.gen(function* () {
        const ctx = yield* requireSession(threadId);
        const messages = yield* ctx.rpc
          .request({ type: "get_messages" })
          .pipe(Effect.mapError(rpcRequestError("get_messages")));
        const turns = ctx.turns.map((turn) => ({ id: turn.id, items: [...turn.items] }));
        const last = turns[turns.length - 1];
        if (last) {
          last.items.push({ messages });
        }
        return { threadId, turns };
      });

    const rollbackThread: SouthbagCodeAdapterShape["rollbackThread"] = (threadId, numTurns) =>
      Effect.gen(function* () {
        yield* requireSession(threadId);
        if (!Number.isInteger(numTurns) || numTurns < 1) {
          return yield* new ProviderAdapterValidationError({
            provider: PROVIDER,
            operation: "rollbackThread",
            issue: "numTurns must be an integer >= 1.",
          });
        }
        return yield* new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "thread/rollback",
          detail: "Southbag Code sessions do not support provider-side rollback.",
        });
      });

    const stopSession: SouthbagCodeAdapterShape["stopSession"] = (threadId) =>
      withThreadLock(
        threadId,
        Effect.gen(function* () {
          const ctx = yield* requireSession(threadId);
          yield* stopSessionInternal(ctx);
        }),
      );

    const listSessions: SouthbagCodeAdapterShape["listSessions"] = () =>
      Effect.sync(() => Array.from(sessions.values(), (ctx) => ({ ...ctx.session })));

    const hasSession: SouthbagCodeAdapterShape["hasSession"] = (threadId) =>
      Effect.sync(() => {
        const ctx = sessions.get(threadId);
        return ctx !== undefined && !ctx.stopped;
      });

    const stopAll: SouthbagCodeAdapterShape["stopAll"] = () =>
      Effect.forEach(Array.from(sessions.values()), stopSessionInternal, { discard: true });

    yield* Effect.addFinalizer(() =>
      Effect.ignore(stopAll()).pipe(Effect.tap(() => PubSub.shutdown(runtimeEventPubSub))),
    );

    return {
      provider: PROVIDER,
      capabilities: { sessionModelSwitch: "in-session", supportsConversationRollback: false },
      compaction: { type: "native", start: compactThread },
      startSession,
      sendTurn,
      interruptTurn,
      readThread,
      rollbackThread,
      respondToRequest,
      respondToUserInput,
      stopSession,
      listSessions,
      hasSession,
      stopAll,
      streamEvents: Stream.fromPubSub(runtimeEventPubSub),
    } satisfies SouthbagCodeAdapterShape;
  });
}
