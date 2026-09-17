/**
 * SouthbagCodeRpc — a small JSONL RPC client over a spawned
 * `southbag-code --mode rpc` child process.
 *
 * Commands go to stdin one JSON object per line; the agent answers with
 * `{"type":"response",...}` lines correlated by `id` and streams agent events
 * as plain JSON lines in between. Framing is strict JSONL: records split on
 * `\n` only, a trailing `\r` is stripped, and Node `readline` is never used
 * because it also splits on U+2028/U+2029, which are legal inside JSON
 * strings. See `packages/coding-agent/docs/rpc.md` in the Southbag Code repo.
 *
 * One client owns one process. The adapter spawns one per thread with the
 * thread's workspace as cwd; the provider probe spawns a short-lived one to
 * read models.
 *
 * @module provider/Layers/SouthbagCodeRpc
 */
import { resolveSpawnCommand } from "@t3tools/shared/shell";
import * as Cause from "effect/Cause";
import * as Deferred from "effect/Deferred";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Queue from "effect/Queue";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";

export class SouthbagCodeRpcError extends Schema.TaggedError<SouthbagCodeRpcError>()(
  "SouthbagCodeRpcError",
  {
    reason: Schema.Literals(["spawn", "closed", "command", "timeout"]),
    command: Schema.optional(Schema.String),
    detail: Schema.String,
    cause: Schema.optional(Schema.Defect()),
  },
) {
  override get message(): string {
    return `Southbag Code RPC ${this.reason}${this.command ? ` (${this.command})` : ""}: ${this.detail}`;
  }
}

/** Any JSON line the agent writes that is not a command response. */
export type SouthbagCodeRpcEvent = { readonly [key: string]: unknown; readonly type: string };

export interface SouthbagCodeRpcResponse {
  readonly command: string;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: string | undefined;
}

const RpcLine = Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown));
const decodeRpcLine = Schema.decodeUnknownExit(RpcLine);
const RpcResponse = Schema.Struct({
  type: Schema.Literal("response"),
  id: Schema.optional(Schema.String),
  command: Schema.String,
  success: Schema.Boolean,
  data: Schema.optional(Schema.Unknown),
  error: Schema.optional(Schema.String),
});
const decodeRpcResponse = Schema.decodeUnknownOption(RpcResponse);
const encodeJsonLine = Schema.encodeUnknownSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

/** Protocol framing: split on LF only and drop one trailing CR per record. */
export function splitJsonlChunk(
  buffer: string,
  chunk: string,
): readonly [remainder: string, lines: ReadonlyArray<string>] {
  let pending = buffer + chunk;
  const lines: Array<string> = [];
  while (true) {
    const newlineIndex = pending.indexOf("\n");
    if (newlineIndex === -1) break;
    let line = pending.slice(0, newlineIndex);
    pending = pending.slice(newlineIndex + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    lines.push(line);
  }
  return [pending, lines];
}

export interface SouthbagCodeRpcClientOptions {
  readonly binaryPath: string;
  /** Flags after the binary, e.g. `["--mode", "rpc", "--session-dir", dir]`. */
  readonly args: ReadonlyArray<string>;
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
  /** Receives bounded stderr text; the agent prints diagnostics there. */
  readonly onStderr?: (chunk: string) => Effect.Effect<void>;
  readonly requestTimeout?: Duration.Input;
}

export interface SouthbagCodeRpcClient {
  /** Send a command and wait for its correlated response. Fails on `success: false`. */
  readonly request: (
    command: { readonly type: string; readonly [key: string]: unknown },
    options?: { readonly timeout?: Duration.Input },
  ) => Effect.Effect<unknown, SouthbagCodeRpcError>;
  /** Write a line that expects no response (extension UI replies). */
  readonly send: (message: {
    readonly type: string;
    readonly [key: string]: unknown;
  }) => Effect.Effect<void, SouthbagCodeRpcError>;
  /** Agent events in arrival order. Ends when the process closes. */
  readonly events: Stream.Stream<SouthbagCodeRpcEvent>;
  /** Resolves once the process has exited or its stdout closed. */
  readonly closed: Effect.Effect<void>;
  /** Stop the process: close stdin, then SIGTERM, then SIGKILL after a grace period. */
  readonly close: Effect.Effect<void>;
}

const DEFAULT_REQUEST_TIMEOUT = Duration.seconds(30);
const FORCE_KILL_AFTER = Duration.seconds(2);
const MAX_STDERR_CHUNK_CHARS = 4_000;

interface PendingRequest {
  readonly command: string;
  readonly response: Deferred.Deferred<SouthbagCodeRpcResponse, SouthbagCodeRpcError>;
}

export const makeSouthbagCodeRpcClient = Effect.fn("makeSouthbagCodeRpcClient")(function* (
  options: SouthbagCodeRpcClientOptions,
): Effect.fn.Return<
  SouthbagCodeRpcClient,
  SouthbagCodeRpcError,
  ChildProcessSpawner.ChildProcessSpawner | Scope.Scope
> {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const scope = yield* Scope.Scope;
  const spawnCommand = yield* resolveSpawnCommand(options.binaryPath, options.args, {
    env: options.environment,
  });
  const child = yield* spawner
    .spawn(
      ChildProcess.make(spawnCommand.command, spawnCommand.args, {
        cwd: options.cwd,
        env: options.environment,
        extendEnv: false,
        shell: spawnCommand.shell,
      }),
    )
    .pipe(
      Effect.provideService(Scope.Scope, scope),
      Effect.mapError(
        (cause) =>
          new SouthbagCodeRpcError({
            reason: "spawn",
            detail: `Failed to spawn '${options.binaryPath} ${options.args.join(" ")}'.`,
            cause,
          }),
      ),
    );

  const outgoing = yield* Queue.unbounded<string, Cause.Done<void>>();
  const events = yield* Queue.unbounded<SouthbagCodeRpcEvent, Cause.Done<void>>();
  const closedSignal = yield* Deferred.make<void>();
  const pending = new Map<string, PendingRequest>();
  let nextRequestId = 0;
  let closing = false;

  const failPending = (error: SouthbagCodeRpcError) =>
    Effect.forEach(
      Array.from(pending.values()),
      (request) => Deferred.fail(request.response, error).pipe(Effect.ignore),
      { discard: true },
    ).pipe(Effect.tap(() => Effect.sync(() => pending.clear())));

  const markClosed = Effect.gen(function* () {
    if (yield* Deferred.isDone(closedSignal)) return;
    yield* Deferred.succeed(closedSignal, undefined);
    yield* Queue.end(events);
    yield* Queue.end(outgoing);
    yield* failPending(
      new SouthbagCodeRpcError({
        reason: "closed",
        detail: "The Southbag Code process exited before answering.",
      }),
    );
  });

  const handleLine = (line: string) =>
    Effect.gen(function* () {
      if (line.trim().length === 0) return;
      const decoded = decodeRpcLine(line);
      if (!Exit.isSuccess(decoded)) {
        yield* Effect.logWarning("Dropped an unparseable Southbag Code RPC line.", {
          length: line.length,
        });
        return;
      }
      const record = decoded.value;
      if (!Predicate.isString(record.type)) return;
      if (record.type === "response") {
        const response = decodeRpcResponse(record);
        if (Option.isNone(response)) return;
        const requestId = response.value.id;
        const waiter = requestId === undefined ? undefined : pending.get(requestId);
        if (!waiter) {
          // Parse errors and responses to id-less commands have no waiter.
          yield* Effect.logWarning("Uncorrelated Southbag Code RPC response.", {
            command: response.value.command,
            success: response.value.success,
          });
          return;
        }
        pending.delete(requestId!);
        yield* Deferred.succeed(waiter.response, response.value);
        return;
      }
      yield* Queue.offer(events, record as SouthbagCodeRpcEvent);
    });

  // Reader: stdout → JSONL records → responses or events.
  yield* child.stdout.pipe(
    Stream.decodeText(),
    Stream.mapAccum(
      () => "",
      (buffer: string, chunk: string) => splitJsonlChunk(buffer, chunk),
      { onHalt: (buffer) => (buffer.length > 0 ? [buffer] : []) },
    ),
    Stream.runForEach(handleLine),
    Effect.catchCause((cause) =>
      Effect.logDebug("Southbag Code RPC stdout ended with a failure.", { cause }),
    ),
    Effect.andThen(markClosed),
    Effect.forkIn(scope),
  );

  // Writer: queued lines → stdin. The queue ends on close, which closes stdin.
  yield* Stream.fromQueue(outgoing).pipe(
    Stream.encodeText,
    Stream.run(child.stdin),
    Effect.ignore,
    Effect.forkIn(scope),
  );

  // stderr is drained so a chatty agent cannot block on a full pipe.
  yield* child.stderr.pipe(
    Stream.decodeText(),
    Stream.runForEach((chunk) =>
      options.onStderr ? options.onStderr(chunk.slice(-MAX_STDERR_CHUNK_CHARS)) : Effect.void,
    ),
    Effect.ignore,
    Effect.forkIn(scope),
  );

  yield* child.exitCode.pipe(Effect.ignore, Effect.andThen(markClosed), Effect.forkIn(scope));

  const writeLine = (message: { readonly type: string; readonly [key: string]: unknown }) =>
    Effect.gen(function* () {
      if (closing || (yield* Deferred.isDone(closedSignal))) {
        return yield* new SouthbagCodeRpcError({
          reason: "closed",
          command: message.type,
          detail: "The Southbag Code process is no longer running.",
        });
      }
      yield* Queue.offer(outgoing, `${encodeJsonLine(message)}\n`);
    });

  const request: SouthbagCodeRpcClient["request"] = (command, requestOptions) =>
    Effect.gen(function* () {
      nextRequestId += 1;
      const id = `req-${nextRequestId}`;
      const response = yield* Deferred.make<SouthbagCodeRpcResponse, SouthbagCodeRpcError>();
      pending.set(id, { command: command.type, response });
      yield* writeLine({ ...command, id }).pipe(
        Effect.tapError(() => Effect.sync(() => pending.delete(id))),
      );
      const resolved = yield* Deferred.await(response).pipe(
        Effect.timeoutOption(
          requestOptions?.timeout ?? options.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT,
        ),
      );
      if (Option.isNone(resolved)) {
        pending.delete(id);
        return yield* new SouthbagCodeRpcError({
          reason: "timeout",
          command: command.type,
          detail: "The Southbag Code agent did not answer in time.",
        });
      }
      if (!resolved.value.success) {
        return yield* new SouthbagCodeRpcError({
          reason: "command",
          command: command.type,
          detail: resolved.value.error ?? "The Southbag Code agent rejected the command.",
        });
      }
      return resolved.value.data;
    });

  const close = Effect.gen(function* () {
    if (closing) return;
    closing = true;
    yield* Queue.end(outgoing);
    yield* child.kill({ forceKillAfter: FORCE_KILL_AFTER }).pipe(Effect.ignore);
    yield* markClosed;
  });

  yield* Scope.addFinalizer(scope, close);

  return {
    request,
    send: writeLine,
    events: Stream.fromQueue(events),
    closed: Deferred.await(closedSignal),
    close,
  };
});
