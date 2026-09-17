#!/usr/bin/env node
// @effect-diagnostics nodeBuiltinImport:off preferSchemaOverJson:off globalTimers:off globalDate:off - plain-Node stand-in for the `southbag-code` binary used by adapter and provider tests.
/**
 * Mock `southbag-code` for tests. Speaks the JSONL RPC protocol documented in
 * the Southbag Code repo (`packages/coding-agent/docs/rpc.md`) with canned
 * events, and also answers `--version` and print mode so one stub can stand
 * in for the whole binary. Behaviour is driven by `T3_SOUTHBAG_*` environment
 * variables and the CLI flags it is launched with.
 */
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeStringDecoder from "node:string_decoder";

const args = process.argv.slice(2);
const argvLogPath = process.env.T3_SOUTHBAG_ARGV_LOG_PATH;
const requestLogPath = process.env.T3_SOUTHBAG_REQUEST_LOG_PATH;
const exitLogPath = process.env.T3_SOUTHBAG_EXIT_LOG_PATH;
const emitToolCall = process.env.T3_SOUTHBAG_EMIT_TOOL_CALL === "1";
const emitThinking = process.env.T3_SOUTHBAG_EMIT_THINKING === "1";
const emitConfirm = process.env.T3_SOUTHBAG_EMIT_CONFIRM === "1";
const emitSelect = process.env.T3_SOUTHBAG_EMIT_SELECT === "1";
const emitError = process.env.T3_SOUTHBAG_EMIT_ERROR === "1";
const hangPrompt = process.env.T3_SOUTHBAG_HANG_PROMPT === "1";
const exitOnPrompt = process.env.T3_SOUTHBAG_EXIT_ON_PROMPT === "1";
const failPrompt = process.env.T3_SOUTHBAG_FAIL_PROMPT === "1";
const failModels = process.env.T3_SOUTHBAG_FAIL_MODELS === "1";
const promptResponseText = process.env.T3_SOUTHBAG_PROMPT_RESPONSE_TEXT ?? "hello from mock";
const printOutput = process.env.T3_SOUTHBAG_PRINT_OUTPUT ?? '{"title":"mock title"}';
const version = process.env.T3_SOUTHBAG_VERSION ?? "0.84.2";

function flagValue(flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function logExit(reason: string): void {
  if (!exitLogPath) return;
  NodeFS.appendFileSync(exitLogPath, `${reason}\n`, "utf8");
}

process.once("SIGTERM", () => {
  logExit("SIGTERM");
  process.exit(0);
});
process.once("SIGINT", () => {
  logExit("SIGINT");
  process.exit(0);
});
process.once("exit", (code) => {
  logExit(`exit:${code}`);
});

if (argvLogPath) {
  NodeFS.appendFileSync(argvLogPath, `${args.join("\t")}\n`, "utf8");
}

function readStdinFully(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.resume();
  });
}

if (args.includes("--version") || args.includes("-v")) {
  process.stdout.write(`${version}\n`);
  process.exit(0);
}

const mode = flagValue("--mode");
if (mode !== "rpc") {
  // Print mode: the prompt arrives on stdin; answer with the canned text.
  const prompt = await readStdinFully();
  if (requestLogPath) {
    NodeFS.appendFileSync(requestLogPath, `${JSON.stringify({ type: "print", prompt })}\n`, "utf8");
  }
  process.stdout.write(`${printOutput}\n`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// RPC mode
// ---------------------------------------------------------------------------

const sessionDir = flagValue("--session-dir") ?? process.cwd();
const sessionFile = flagValue("--session") ?? NodePath.join(sessionDir, "mock-session.jsonl");
if (!args.includes("--no-session")) {
  NodeFS.mkdirSync(NodePath.dirname(sessionFile), { recursive: true });
  if (!NodeFS.existsSync(sessionFile)) {
    NodeFS.writeFileSync(
      sessionFile,
      `${JSON.stringify({ type: "session", id: "mock-session-1", cwd: process.cwd() })}\n`,
      "utf8",
    );
  }
}

const models = [
  { id: "southbag-agent", provider: "southbag-agent", name: "Southbag Agent", reasoning: true },
  { id: "mock-alt", provider: "southbag-agent", name: "Mock Alt", reasoning: false },
];
let currentModel = models[0]!;
let thinkingLevel = "medium";
let isStreaming = false;
let abortRequested = false;
let uiRequestCounter = 0;
const messages: Array<Record<string, unknown>> = [];
const pendingUiResponses = new Map<string, (response: Record<string, unknown>) => void>();

function output(record: Record<string, unknown>): void {
  process.stdout.write(`${JSON.stringify(record)}\n`);
}

function respond(id: unknown, command: string, data?: unknown): void {
  output({
    ...(typeof id === "string" ? { id } : {}),
    type: "response",
    command,
    success: true,
    ...(data === undefined ? {} : { data }),
  });
}

function respondError(id: unknown, command: string, error: string): void {
  output({
    ...(typeof id === "string" ? { id } : {}),
    type: "response",
    command,
    success: false,
    error,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function askUi(request: Record<string, unknown>): Promise<Record<string, unknown>> {
  uiRequestCounter += 1;
  const id = `ui-${uiRequestCounter}`;
  return new Promise((resolve) => {
    pendingUiResponses.set(id, resolve);
    output({ type: "extension_ui_request", id, ...request });
  });
}

function assistantMessage(content: Array<Record<string, unknown>>, stopReason: string) {
  return {
    role: "assistant",
    content,
    api: "southbag",
    provider: currentModel.provider,
    model: currentModel.id,
    usage: {
      input: 120,
      output: 30,
      cacheRead: 20,
      cacheWrite: 5,
      totalTokens: 175,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason,
    timestamp: Date.now(),
  };
}

async function streamText(text: string, partial: Record<string, unknown>): Promise<void> {
  output({
    type: "message_update",
    message: partial,
    assistantMessageEvent: { type: "text_start", contentIndex: 0, partial },
  });
  for (const piece of [
    text.slice(0, Math.ceil(text.length / 2)),
    text.slice(Math.ceil(text.length / 2)),
  ]) {
    if (piece.length === 0) continue;
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: piece, partial },
    });
  }
  output({
    type: "message_update",
    message: partial,
    assistantMessageEvent: { type: "text_end", contentIndex: 0, content: text, partial },
  });
}

async function runPrompt(message: string): Promise<void> {
  isStreaming = true;
  abortRequested = false;
  const userMessage = { role: "user", content: message, timestamp: Date.now() };
  messages.push(userMessage);
  const runMessages: Array<Record<string, unknown>> = [userMessage];
  output({ type: "agent_start" });
  output({ type: "turn_start" });

  if (emitConfirm) {
    const answer = await askUi({
      method: "confirm",
      title: "Allow dangerous command?",
      message: "rm -rf build",
    });
    if (requestLogPath) {
      NodeFS.appendFileSync(
        requestLogPath,
        `${JSON.stringify({ type: "ui_answer", answer })}\n`,
        "utf8",
      );
    }
  }
  if (emitSelect) {
    const answer = await askUi({ method: "select", title: "Pick one", options: ["a", "b"] });
    if (requestLogPath) {
      NodeFS.appendFileSync(
        requestLogPath,
        `${JSON.stringify({ type: "ui_answer", answer })}\n`,
        "utf8",
      );
    }
  }

  if (failPrompt) {
    const errored = { ...assistantMessage([], "error"), errorMessage: "mock provider exploded" };
    output({ type: "message_start", message: errored });
    output({
      type: "message_update",
      message: errored,
      assistantMessageEvent: { type: "error", reason: "error", error: errored },
    });
    output({ type: "message_end", message: errored });
    output({ type: "turn_end", message: errored, toolResults: [] });
    messages.push(errored);
    runMessages.push(errored);
    output({ type: "agent_end", messages: runMessages });
    isStreaming = false;
    return;
  }

  if (emitToolCall) {
    const toolCall = {
      type: "toolCall",
      id: "call-mock-1",
      name: "bash",
      arguments: { command: "ls -la" },
    };
    const partial = assistantMessage([], "toolUse");
    output({ type: "message_start", message: partial });
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: { type: "toolcall_start", contentIndex: 0, partial },
    });
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: {
        type: "toolcall_delta",
        contentIndex: 0,
        delta: '{"command":"ls -la"}',
        partial,
      },
    });
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: { type: "toolcall_end", contentIndex: 0, toolCall, partial },
    });
    const toolMessage = assistantMessage([toolCall], "toolUse");
    output({ type: "message_end", message: toolMessage });
    output({
      type: "tool_execution_start",
      toolCallId: toolCall.id,
      toolName: "bash",
      args: toolCall.arguments,
    });
    output({
      type: "tool_execution_update",
      toolCallId: toolCall.id,
      toolName: "bash",
      args: toolCall.arguments,
      partialResult: { content: [{ type: "text", text: "total 1\n" }], details: {} },
    });
    const result = { content: [{ type: "text", text: "total 1\nREADME.md\n" }], details: {} };
    output({
      type: "tool_execution_end",
      toolCallId: toolCall.id,
      toolName: "bash",
      result,
      isError: false,
    });
    const toolResult = {
      role: "toolResult",
      toolCallId: toolCall.id,
      toolName: "bash",
      content: result.content,
      isError: false,
      timestamp: Date.now(),
    };
    output({ type: "turn_end", message: toolMessage, toolResults: [toolResult] });
    messages.push(toolMessage, toolResult);
    runMessages.push(toolMessage, toolResult);
    output({ type: "turn_start" });
  }

  const partial = assistantMessage([], "stop");
  output({ type: "message_start", message: partial });
  if (emitThinking) {
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: { type: "thinking_start", contentIndex: 0, partial },
    });
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: {
        type: "thinking_delta",
        contentIndex: 0,
        delta: "pondering",
        partial,
      },
    });
    output({
      type: "message_update",
      message: partial,
      assistantMessageEvent: {
        type: "thinking_end",
        contentIndex: 0,
        content: "pondering",
        partial,
      },
    });
  }
  await streamText(promptResponseText, partial);

  if (exitOnPrompt) {
    // Simulate a crash mid-turn: no agent_end ever arrives.
    process.exit(7);
  }

  if (hangPrompt) {
    while (!abortRequested) {
      await sleep(10);
    }
    const aborted = assistantMessage([{ type: "text", text: promptResponseText }], "aborted");
    output({
      type: "message_update",
      message: aborted,
      assistantMessageEvent: { type: "error", reason: "aborted", error: aborted },
    });
    output({ type: "message_end", message: aborted });
    output({ type: "turn_end", message: aborted, toolResults: [] });
    messages.push(aborted);
    runMessages.push(aborted);
    output({ type: "agent_end", messages: runMessages });
    isStreaming = false;
    return;
  }

  if (emitError) {
    const errored = {
      ...assistantMessage([{ type: "text", text: promptResponseText }], "error"),
      errorMessage: "mock stream error",
    };
    output({
      type: "message_update",
      message: errored,
      assistantMessageEvent: { type: "error", reason: "error", error: errored },
    });
    output({ type: "message_end", message: errored });
    output({ type: "turn_end", message: errored, toolResults: [] });
    messages.push(errored);
    runMessages.push(errored);
    output({ type: "agent_end", messages: runMessages });
    isStreaming = false;
    return;
  }

  const final = assistantMessage([{ type: "text", text: promptResponseText }], "stop");
  output({
    type: "message_update",
    message: final,
    assistantMessageEvent: { type: "done", reason: "stop", message: final },
  });
  output({ type: "message_end", message: final });
  output({ type: "turn_end", message: final, toolResults: [] });
  messages.push(final);
  runMessages.push(final);
  output({ type: "agent_end", messages: runMessages });
  isStreaming = false;
}

function handleCommand(command: Record<string, unknown>): void {
  const id = command.id;
  const type = typeof command.type === "string" ? command.type : "";
  switch (type) {
    case "extension_ui_response": {
      const requestId = typeof command.id === "string" ? command.id : "";
      const resolve = pendingUiResponses.get(requestId);
      if (resolve) {
        pendingUiResponses.delete(requestId);
        resolve(command);
      }
      return;
    }
    case "get_state":
      respond(id, "get_state", {
        model: currentModel,
        thinkingLevel,
        isStreaming,
        isCompacting: false,
        steeringMode: "one-at-a-time",
        followUpMode: "one-at-a-time",
        ...(args.includes("--no-session") ? {} : { sessionFile }),
        sessionId: "mock-session-1",
        autoCompactionEnabled: true,
        messageCount: messages.length,
        pendingMessageCount: 0,
      });
      return;
    case "get_available_models":
      if (failModels) {
        respondError(id, "get_available_models", "mock models unavailable");
        return;
      }
      respond(id, "get_available_models", { models });
      return;
    case "set_model": {
      const requested = models.find(
        (model) => model.provider === command.provider && model.id === command.modelId,
      );
      if (!requested) {
        respondError(
          id,
          "set_model",
          `Model not found: ${String(command.provider)}/${String(command.modelId)}`,
        );
        return;
      }
      currentModel = requested;
      respond(id, "set_model", currentModel);
      return;
    }
    case "set_thinking_level":
      thinkingLevel = typeof command.level === "string" ? command.level : thinkingLevel;
      respond(id, "set_thinking_level");
      return;
    case "prompt": {
      if (isStreaming && command.streamingBehavior === undefined) {
        respondError(id, "prompt", "Agent is streaming; specify streamingBehavior.");
        return;
      }
      respond(id, "prompt");
      if (!isStreaming) {
        void runPrompt(String(command.message ?? ""));
      }
      return;
    }
    case "abort":
      abortRequested = true;
      respond(id, "abort");
      return;
    case "get_messages":
      respond(id, "get_messages", { messages });
      return;
    case "get_session_stats":
      respond(id, "get_session_stats", {
        sessionFile,
        sessionId: "mock-session-1",
        userMessages: 1,
        assistantMessages: 1,
        toolCalls: 0,
        toolResults: 0,
        totalMessages: messages.length,
        tokens: { input: 120, output: 30, cacheRead: 20, cacheWrite: 5, total: 175 },
        cost: 0,
        contextUsage: { tokens: 600, contextWindow: 200000, percent: 0.3 },
      });
      return;
    case "compact": {
      output({ type: "compaction_start", reason: "manual" });
      const result = {
        summary: "mock summary",
        firstKeptEntryId: "entry-1",
        tokensBefore: 1000,
        estimatedTokensAfter: 200,
        details: {},
      };
      output({
        type: "compaction_end",
        reason: "manual",
        result,
        aborted: false,
        willRetry: false,
      });
      respond(id, "compact", result);
      return;
    }
    case "switch_session":
      respond(id, "switch_session", { cancelled: false });
      return;
    case "new_session":
      messages.length = 0;
      respond(id, "new_session", { cancelled: false });
      return;
    default:
      respondError(id, type || "parse", `Unknown command: ${type}`);
  }
}

const decoder = new NodeStringDecoder.StringDecoder("utf8");
let buffer = "";
function onLine(line: string): void {
  if (line.trim().length === 0) return;
  if (requestLogPath) {
    NodeFS.appendFileSync(requestLogPath, `${line}\n`, "utf8");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch (error) {
    respondError(undefined, "parse", `Failed to parse command: ${String(error)}`);
    return;
  }
  if (typeof parsed !== "object" || parsed === null) return;
  handleCommand(parsed as Record<string, unknown>);
}

process.stdin.on("data", (chunk: Buffer | string) => {
  buffer += typeof chunk === "string" ? chunk : decoder.write(chunk);
  while (true) {
    const newlineIndex = buffer.indexOf("\n");
    if (newlineIndex === -1) break;
    let line = buffer.slice(0, newlineIndex);
    buffer = buffer.slice(newlineIndex + 1);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    onLine(line);
  }
});
process.stdin.on("end", () => {
  buffer += decoder.end();
  if (buffer.length > 0) onLine(buffer.endsWith("\r") ? buffer.slice(0, -1) : buffer);
  logExit("stdin-end");
  process.exit(0);
});
process.stdin.resume();
