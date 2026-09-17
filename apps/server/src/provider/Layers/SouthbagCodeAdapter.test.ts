// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFSP from "node:fs/promises";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeURL from "node:url";

import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";

import {
  ApprovalRequestId,
  ProviderInstanceId,
  type ProviderRuntimeEvent,
  SOUTHBAG_CODE_DRIVER_KIND,
  SouthbagCodeSettings,
  ThreadId,
} from "@t3tools/contracts";

import { ServerConfig } from "../../config.ts";
import { execScriptSource, writeFakeCli } from "../../testUtils/fakeCli.ts";
import {
  makeSouthbagCodeAdapter,
  parseSouthbagCodeResume,
  southbagCodeToolItemType,
  southbagCodeToolOutputText,
  southbagCodeUserInputQuestion,
} from "./SouthbagCodeAdapter.ts";
import { splitJsonlChunk } from "./SouthbagCodeRpc.ts";

const decodeSettings = Schema.decodeSync(SouthbagCodeSettings);
const __dirname = NodePath.dirname(NodeURL.fileURLToPath(import.meta.url));
const mockAgentPath = NodePath.join(__dirname, "../../../scripts/southbag-code-mock-agent.ts");
const instanceId = ProviderInstanceId.make(SOUTHBAG_CODE_DRIVER_KIND);

async function makeMockBinary(extraEnv?: Record<string, string>) {
  const dir = await NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "southbag-code-mock-"));
  return {
    dir,
    binaryPath: writeFakeCli({
      directory: dir,
      name: "southbag-code",
      env: extraEnv ?? {},
      source: execScriptSource({ scriptPath: mockAgentPath }),
    }),
  };
}

async function readJsonLines(filePath: string) {
  const raw = await NodeFSP.readFile(filePath, "utf8").catch(() => "");
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

const adapterTestLayer = ServerConfig.layerTest(process.cwd(), {
  prefix: "colon3code-southbag-adapter-test-",
}).pipe(Layer.provideMerge(NodeServices.layer));

const makeTestAdapter = (binaryPath: string) =>
  makeSouthbagCodeAdapter(decodeSettings({ binaryPath }), {
    instanceId,
    environment: process.env,
  }).pipe(Effect.orDie);

/** Collect runtime events until `until` matches, then hand back the list. */
const collectEvents = (
  adapter: Effect.Success<ReturnType<typeof makeTestAdapter>>,
  until: (event: ProviderRuntimeEvent) => boolean,
) =>
  Effect.gen(function* () {
    const events: ProviderRuntimeEvent[] = [];
    const done = yield* Deferred.make<void>();
    const fiber = yield* Stream.runForEach(adapter.streamEvents, (event) =>
      Effect.gen(function* () {
        events.push(event);
        if (until(event)) yield* Deferred.succeed(done, undefined);
      }),
    ).pipe(Effect.forkChild);
    return {
      events,
      await: Deferred.await(done).pipe(Effect.timeout("10 seconds")),
      stop: Fiber.interrupt(fiber),
    };
  });

it("splits JSONL on LF only and strips a trailing CR", () => {
  const [remainder, lines] = splitJsonlChunk("", '{"a":1}\r\n{"b":"x\u2028y"}\n{"c"');
  assert.deepStrictEqual(lines, ['{"a":1}', '{"b":"x\u2028y"}']);
  assert.equal(remainder, '{"c"');
  const [rest, more] = splitJsonlChunk(remainder, ":3}\n");
  assert.deepStrictEqual(more, ['{"c":3}']);
  assert.equal(rest, "");
});

it("parses only versioned resume cursors with a session file", () => {
  assert.deepStrictEqual(
    parseSouthbagCodeResume({ schemaVersion: 1, sessionFile: "/tmp/s.jsonl", sessionId: "abc" }),
    { schemaVersion: 1, sessionFile: "/tmp/s.jsonl", sessionId: "abc" },
  );
  assert.isUndefined(parseSouthbagCodeResume({ schemaVersion: 2, sessionFile: "/tmp/s.jsonl" }));
  assert.isUndefined(parseSouthbagCodeResume({ schemaVersion: 1, sessionId: "abc" }));
  assert.isUndefined(parseSouthbagCodeResume("nope"));
});

it("maps built-in tool names onto canonical item types", () => {
  assert.deepStrictEqual(southbagCodeToolItemType("bash"), {
    itemType: "command_execution",
    kind: "execute",
  });
  assert.deepStrictEqual(southbagCodeToolItemType("edit"), {
    itemType: "file_change",
    kind: "edit",
  });
  assert.deepStrictEqual(southbagCodeToolItemType("read"), {
    itemType: "dynamic_tool_call",
    kind: "read",
  });
  assert.deepStrictEqual(southbagCodeToolItemType("my_mcp_tool"), {
    itemType: "dynamic_tool_call",
    kind: "my_mcp_tool",
  });
});

it("joins tool result text blocks and keeps only the tail of huge output", () => {
  assert.equal(
    southbagCodeToolOutputText({
      content: [
        { type: "text", text: "a" },
        { type: "text", text: "b" },
      ],
    }),
    "a\nb",
  );
  assert.isUndefined(southbagCodeToolOutputText({ content: [] }));
  const huge = southbagCodeToolOutputText({
    content: [{ type: "text", text: "x".repeat(20_000) }],
  });
  assert.isTrue(huge?.startsWith("[Earlier output truncated]"));
  assert.isTrue((huge?.length ?? 0) < 9_000);
});

it("turns extension-UI select/input requests into user-input questions", () => {
  const select = southbagCodeUserInputQuestion("ui-1", {
    type: "extension_ui_request",
    method: "select",
    title: "Pick one",
    options: ["a", "b"],
  });
  assert.equal(select?.id, "ui-1");
  assert.deepStrictEqual(
    select?.options.map((option) => option.label),
    ["a", "b"],
  );
  const input = southbagCodeUserInputQuestion("ui-2", {
    type: "extension_ui_request",
    method: "input",
    title: "Name?",
    placeholder: "type here",
  });
  assert.equal(input?.allowCustomAnswer, true);
  assert.deepStrictEqual(input?.options, []);
  assert.isUndefined(
    southbagCodeUserInputQuestion("ui-3", { type: "extension_ui_request", method: "notify" }),
  );
});

it.layer(adapterTestLayer)("SouthbagCodeAdapter", (it) => {
  it.effect("starts a session, streams a text turn and records the session file", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-text-turn");
      const argvLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-argv-"))),
        "argv.log",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_ARGV_LOG_PATH: argvLogPath }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "turn.completed");

      const session = yield* adapter.startSession({
        threadId,
        provider: SOUTHBAG_CODE_DRIVER_KIND,
        cwd: process.cwd(),
        runtimeMode: "full-access",
        modelSelection: { instanceId, model: "southbag-agent/southbag-agent" },
      });
      assert.equal(session.provider, SOUTHBAG_CODE_DRIVER_KIND);
      assert.equal(session.model, "southbag-agent/southbag-agent");
      const cursor = parseSouthbagCodeResume(session.resumeCursor);
      assert.isDefined(cursor);
      assert.equal(cursor?.sessionId, "mock-session-1");
      assert.include(
        cursor?.sessionFile,
        NodePath.join("providers", "southbag-code", "sessions", threadId),
      );

      const turn = yield* adapter.sendTurn({ threadId, input: "hello southbag" });
      yield* collector.await;
      yield* collector.stop;

      const types = collector.events.map((event) => event.type);
      assert.deepStrictEqual(types.slice(0, 3), [
        "session.started",
        "session.state.changed",
        "thread.started",
      ]);
      assert.deepStrictEqual(types.slice(3), [
        "turn.started",
        "item.started",
        "content.delta",
        "content.delta",
        "item.completed",
        "thread.token-usage.updated",
        "turn.completed",
      ]);
      const turnStarted = collector.events.find((event) => event.type === "turn.started");
      assert.equal(turnStarted?.turnId, turn.turnId);
      if (turnStarted?.type === "turn.started") {
        assert.equal(turnStarted.payload.model, "southbag-agent/southbag-agent");
      }
      const text = collector.events
        .filter((event) => event.type === "content.delta")
        .map((event) => (event.type === "content.delta" ? event.payload.delta : ""))
        .join("");
      assert.equal(text, "hello from mock");
      const completed = collector.events.find((event) => event.type === "turn.completed");
      if (completed?.type === "turn.completed") {
        assert.equal(completed.payload.state, "completed");
        assert.equal(completed.turnId, turn.turnId);
        assert.equal(completed.payload.tokenUsage?.usageStatus, "complete");
        assert.equal(completed.payload.tokenUsage?.inputTokens, 145);
        assert.equal(completed.payload.tokenUsage?.outputTokens, 30);
      }
      const usage = collector.events.find((event) => event.type === "thread.token-usage.updated");
      if (usage?.type === "thread.token-usage.updated") {
        assert.equal(usage.payload.usage.usedTokens, 600);
        assert.equal(usage.payload.usage.maxTokens, 200000);
      }
      // The session is ready again and its model stays the sentinel.
      const sessions = yield* adapter.listSessions();
      assert.equal(sessions[0]?.status, "ready");
      assert.isUndefined(sessions[0]?.activeTurnId);

      yield* adapter.stopSession(threadId);
      const argv = yield* Effect.promise(() => NodeFSP.readFile(argvLogPath, "utf8"));
      const launchArgs = argv.trim().split("\t");
      assert.deepStrictEqual(launchArgs.slice(0, 3), ["--mode", "rpc", "--session-dir"]);
      assert.notInclude(launchArgs, "--session");
      assert.isFalse(yield* adapter.hasSession(threadId));
    }),
  );

  it.effect("resumes with --session when the cursor's file still exists", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-resume");
      const argvLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-argv-"))),
        "argv.log",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_ARGV_LOG_PATH: argvLogPath }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const first = yield* adapter.startSession({
        threadId,
        cwd: process.cwd(),
        runtimeMode: "full-access",
      });
      yield* adapter.stopSession(threadId);
      const resumed = yield* adapter.startSession({
        threadId,
        cwd: process.cwd(),
        runtimeMode: "full-access",
        resumeCursor: first.resumeCursor,
      });
      assert.deepStrictEqual(resumed.resumeCursor, first.resumeCursor);
      yield* adapter.stopSession(threadId);

      const launches = (yield* Effect.promise(() => NodeFSP.readFile(argvLogPath, "utf8")))
        .trim()
        .split("\n")
        .map((line) => line.split("\t"));
      assert.equal(launches.length, 2);
      assert.notInclude(launches[0] ?? [], "--session");
      const sessionFlag = launches[1]!.indexOf("--session");
      assert.isAbove(sessionFlag, -1);
      assert.equal(
        launches[1]![sessionFlag + 1],
        parseSouthbagCodeResume(first.resumeCursor)?.sessionFile,
      );
    }),
  );

  it.effect("maps a tool call to item lifecycle events with args and output", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-tool-call");
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_EMIT_TOOL_CALL: "1", T3_SOUTHBAG_EMIT_THINKING: "1" }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "turn.completed");
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      yield* adapter.sendTurn({ threadId, input: "list files" });
      yield* collector.await;
      yield* collector.stop;

      const toolEvents = collector.events.filter(
        (event) =>
          (event.type === "item.started" ||
            event.type === "item.updated" ||
            event.type === "item.completed") &&
          event.itemId === "call-mock-1",
      );
      assert.deepStrictEqual(
        toolEvents.map((event) => event.type),
        ["item.started", "item.updated", "item.updated", "item.completed"],
      );
      const started = toolEvents[0];
      if (started?.type === "item.started") {
        assert.equal(started.payload.itemType, "command_execution");
        assert.equal(started.payload.status, "inProgress");
        assert.equal(started.payload.title, "Ran command");
        assert.equal(started.payload.detail, "ls -la");
        assert.deepStrictEqual(started.payload.data, {
          toolCallId: "call-mock-1",
          kind: "execute",
          tool: "bash",
          command: "ls -la",
          rawInput: { command: "ls -la" },
        });
      }
      const completed = toolEvents[3];
      if (completed?.type === "item.completed") {
        assert.equal(completed.payload.status, "completed");
        const data = completed.payload.data as { rawOutput?: { content?: string } };
        assert.equal(data.rawOutput?.content, "total 1\nREADME.md\n");
      }
      // Two assistant messages: the tool-call one and the final text one.
      const assistantItems = collector.events.filter(
        (event) =>
          event.type === "item.completed" && event.payload.itemType === "assistant_message",
      );
      assert.equal(assistantItems.length, 2);
      const reasoning = collector.events.find(
        (event) => event.type === "content.delta" && event.payload.streamKind === "reasoning_text",
      );
      assert.isDefined(reasoning);
      if (reasoning?.type === "content.delta") {
        assert.equal(reasoning.payload.delta, "pondering");
      }
      const turnCompleted = collector.events.find((event) => event.type === "turn.completed");
      if (turnCompleted?.type === "turn.completed") {
        // Usage folds both assistant messages.
        assert.equal(turnCompleted.payload.tokenUsage?.outputTokens, 60);
      }
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("steers a running turn instead of opening a second one", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-steer");
      const requestLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-req-"))),
        "requests.ndjson",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({
          T3_SOUTHBAG_HANG_PROMPT: "1",
          T3_SOUTHBAG_REQUEST_LOG_PATH: requestLogPath,
        }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "turn.aborted");
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      const first = yield* adapter.sendTurn({ threadId, input: "first" });
      const second = yield* adapter.sendTurn({ threadId, input: "actually do this" });
      assert.equal(second.turnId, first.turnId);
      yield* adapter.interruptTurn(threadId);
      yield* collector.await;
      yield* collector.stop;

      assert.equal(collector.events.filter((event) => event.type === "turn.started").length, 1);
      const aborted = collector.events.find((event) => event.type === "turn.aborted");
      assert.equal(aborted?.turnId, first.turnId);
      const requests = yield* Effect.promise(() => readJsonLines(requestLogPath));
      const prompts = requests.filter((request) => request.type === "prompt");
      assert.equal(prompts.length, 2);
      assert.isUndefined(prompts[0]?.streamingBehavior);
      assert.equal(prompts[1]?.streamingBehavior, "steer");
      assert.isTrue(String(prompts[0]?.message).startsWith("first"));
      assert.include(String(prompts[0]?.message), "Southbag Code harness");
      assert.isTrue(requests.some((request) => request.type === "abort"));
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("fails the turn when the stream reports an error", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-error");
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_EMIT_ERROR: "1" }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "turn.completed");
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      yield* adapter.sendTurn({ threadId, input: "break" });
      yield* collector.await;
      yield* collector.stop;
      const completed = collector.events.find((event) => event.type === "turn.completed");
      if (completed?.type === "turn.completed") {
        assert.equal(completed.payload.state, "failed");
        assert.equal(completed.payload.errorMessage, "mock stream error");
      }
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("sends set_model and set_thinking_level only for concrete selections", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-model");
      const requestLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-req-"))),
        "requests.ndjson",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_REQUEST_LOG_PATH: requestLogPath }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "turn.completed");
      yield* adapter.startSession({
        threadId,
        cwd: process.cwd(),
        runtimeMode: "full-access",
        modelSelection: { instanceId, model: "southbag-agent/southbag-agent" },
      });
      yield* adapter.sendTurn({
        threadId,
        input: "switch",
        modelSelection: {
          instanceId,
          model: "southbag-agent/mock-alt",
          options: [{ id: "thinkingLevel", value: "high" }],
        },
      });
      yield* collector.await;
      yield* collector.stop;
      const requests = yield* Effect.promise(() => readJsonLines(requestLogPath));
      const setModel = requests.filter((request) => request.type === "set_model");
      assert.deepStrictEqual(
        setModel.map((request) => [request.provider, request.modelId]),
        [["southbag-agent", "mock-alt"]],
      );
      assert.deepStrictEqual(
        requests.filter((request) => request.type === "set_thinking_level").map((r) => r.level),
        ["high"],
      );
      const started = collector.events.find((event) => event.type === "turn.started");
      if (started?.type === "turn.started") {
        assert.equal(started.payload.model, "southbag-agent/mock-alt");
        assert.equal(started.payload.effort, "high");
      }
      assert.equal((yield* adapter.listSessions())[0]?.model, "southbag-agent/mock-alt");
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("surfaces confirm dialogs as approvals and answers the agent", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-confirm");
      const requestLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-req-"))),
        "requests.ndjson",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({
          T3_SOUTHBAG_EMIT_CONFIRM: "1",
          T3_SOUTHBAG_REQUEST_LOG_PATH: requestLogPath,
        }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const opened = yield* Deferred.make<ProviderRuntimeEvent>();
      const collector = yield* collectEvents(adapter, (event) => {
        if (event.type === "request.opened") {
          Deferred.doneUnsafe(opened, Effect.succeed(event));
        }
        return event.type === "turn.completed";
      });
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      yield* adapter.sendTurn({ threadId, input: "do something scary" });
      const request = yield* Deferred.await(opened).pipe(Effect.timeout("10 seconds"));
      assert.equal(request.type, "request.opened");
      if (request.type === "request.opened") {
        assert.include(request.payload.detail, "Allow dangerous command?");
        assert.deepStrictEqual(
          request.payload.options?.map((option) => option.decision),
          ["accept", "decline"],
        );
      }
      yield* adapter.respondToRequest(
        threadId,
        ApprovalRequestId.make(String(request.requestId)),
        "decline",
      );
      yield* collector.await;
      yield* collector.stop;
      const resolved = collector.events.find((event) => event.type === "request.resolved");
      if (resolved?.type === "request.resolved") {
        assert.equal(resolved.payload.decision, "decline");
      }
      const requests = yield* Effect.promise(() => readJsonLines(requestLogPath));
      const answer = requests.find((entry) => entry.type === "ui_answer")?.answer as
        | Record<string, unknown>
        | undefined;
      assert.equal(answer?.confirmed, false);
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("surfaces select dialogs as user input and forwards the chosen value", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-select");
      const requestLogPath = NodePath.join(
        yield* Effect.promise(() => NodeFSP.mkdtemp(NodePath.join(NodeOS.tmpdir(), "sb-req-"))),
        "requests.ndjson",
      );
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({
          T3_SOUTHBAG_EMIT_SELECT: "1",
          T3_SOUTHBAG_REQUEST_LOG_PATH: requestLogPath,
        }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const asked = yield* Deferred.make<ProviderRuntimeEvent>();
      const collector = yield* collectEvents(adapter, (event) => {
        if (event.type === "user-input.requested") {
          Deferred.doneUnsafe(asked, Effect.succeed(event));
        }
        return event.type === "turn.completed";
      });
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      yield* adapter.sendTurn({ threadId, input: "choose" });
      const request = yield* Deferred.await(asked).pipe(Effect.timeout("10 seconds"));
      if (request.type === "user-input.requested") {
        const question = request.payload.questions[0]!;
        yield* adapter.respondToUserInput(
          threadId,
          ApprovalRequestId.make(String(request.requestId)),
          { [question.id]: ["b"] },
        );
      }
      yield* collector.await;
      yield* collector.stop;
      const requests = yield* Effect.promise(() => readJsonLines(requestLogPath));
      const answer = requests.find((entry) => entry.type === "ui_answer")?.answer as
        | Record<string, unknown>
        | undefined;
      assert.equal(answer?.value, "b");
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("rejects rollback and reports the model switch capability", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-rollback");
      const { binaryPath } = yield* Effect.promise(() => makeMockBinary());
      const adapter = yield* makeTestAdapter(binaryPath);
      assert.equal(adapter.capabilities.sessionModelSwitch, "in-session");
      assert.isFalse(adapter.capabilities.supportsConversationRollback);
      assert.equal(adapter.compaction?.type, "native");
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      const error = yield* adapter.rollbackThread(threadId, 1).pipe(Effect.flip);
      assert.equal(error._tag, "ProviderAdapterRequestError");
      const snapshot = yield* adapter.readThread(threadId);
      assert.equal(snapshot.threadId, threadId);
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("compacts natively and reports the compacted thread state", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-compact");
      const { binaryPath } = yield* Effect.promise(() => makeMockBinary());
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(
        adapter,
        (event) => event.type === "thread.state.changed" && event.payload.state === "compacted",
      );
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      assert.equal(adapter.compaction?.type, "native");
      if (adapter.compaction?.type === "native") {
        yield* adapter.compaction.start(threadId);
      }
      yield* collector.await;
      yield* collector.stop;
      const compacted = collector.events.find((event) => event.type === "thread.state.changed");
      if (compacted?.type === "thread.state.changed") {
        assert.equal(compacted.payload.beforeTokens, 1000);
        assert.equal(compacted.payload.afterTokens, 200);
      }
      yield* adapter.stopSession(threadId);
    }),
  );

  it.effect("reports a failed turn and an error exit when the process dies mid-turn", () =>
    Effect.gen(function* () {
      const threadId = ThreadId.make("southbag-crash");
      const { binaryPath } = yield* Effect.promise(() =>
        makeMockBinary({ T3_SOUTHBAG_EXIT_ON_PROMPT: "1" }),
      );
      const adapter = yield* makeTestAdapter(binaryPath);
      const collector = yield* collectEvents(adapter, (event) => event.type === "session.exited");
      yield* adapter.startSession({ threadId, cwd: process.cwd(), runtimeMode: "full-access" });
      const turn = yield* adapter.sendTurn({ threadId, input: "crash please" });
      yield* collector.await;
      yield* collector.stop;

      const completed = collector.events.find((event) => event.type === "turn.completed");
      assert.equal(completed?.turnId, turn.turnId);
      if (completed?.type === "turn.completed") {
        assert.equal(completed.payload.state, "failed");
        assert.include(completed.payload.errorMessage, "exited");
      }
      const exited = collector.events.find((event) => event.type === "session.exited");
      if (exited?.type === "session.exited") {
        assert.equal(exited.payload.exitKind, "error");
      }
      assert.isFalse(yield* adapter.hasSession(threadId));
      const error = yield* adapter.sendTurn({ threadId, input: "again" }).pipe(Effect.flip);
      assert.equal(error._tag, "ProviderAdapterSessionNotFoundError");
    }),
  );
});
