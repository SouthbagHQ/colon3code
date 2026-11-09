import type { ProviderDriverKind, ProviderReplayTranscript } from "@t3tools/contracts";

import {
  buildRuntimeInstructions,
  VOICE_INSTRUCTIONS,
} from "@t3tools/provider-core/server/runtimeInstructions";

const RUNTIME_INFO_END = "</runtime_info>";

/**
 * Upstream recordings predate the fork's voice block, so a prompt that already carries
 * `<runtime_info>` gets the voice inserted right after it, where the app sends it.
 */
function withVoiceInstructions(value: unknown): unknown {
  if (typeof value === "string") {
    const end = value.indexOf(RUNTIME_INFO_END);
    if (end === -1 || value.includes("<voice>")) return value;
    const at = end + RUNTIME_INFO_END.length;
    return `${value.slice(0, at)}\n\n${VOICE_INSTRUCTIONS}${value.slice(at)}`;
  }
  if (Array.isArray(value)) return value.map(withVoiceInstructions);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, inner]) => [key, withVoiceInstructions(inner)]),
    );
  }
  return value;
}

export function materializeReplayTranscriptRuntimeInstructions(
  recorded: ProviderReplayTranscript,
  runtime: { readonly driver: ProviderDriverKind; readonly model: string },
): ProviderReplayTranscript {
  const transcript: ProviderReplayTranscript = {
    ...recorded,
    entries: recorded.entries.map((entry) =>
      entry.type === "expect_outbound"
        ? ({ ...entry, frame: withVoiceInstructions(entry.frame) } as typeof entry)
        : entry,
    ),
  };
  const harness =
    runtime.driver === "cursor"
      ? "Cursor"
      : runtime.driver === "grok"
        ? "Grok"
        : runtime.driver === "kiro"
          ? "Kiro"
          : runtime.driver === "acpRegistry"
            ? "acpRegistry"
            : runtime.driver === "fx"
              ? "fx"
              : undefined;
  if (harness === undefined) return transcript;
  const instructions = buildRuntimeInstructions({ harness, model: runtime.model });

  return {
    ...transcript,
    entries: transcript.entries.map((entry) => {
      if (entry.type !== "expect_outbound") return entry;
      const frame = entry.frame;
      if (typeof frame !== "object" || frame === null) return entry;
      if (
        runtime.driver === "cursor" &&
        "type" in frame &&
        frame.type === "run.start" &&
        "message" in frame &&
        typeof frame.message === "string"
      ) {
        return frame.message.endsWith(instructions)
          ? entry
          : { ...entry, frame: { ...frame, message: `${frame.message}\n\n${instructions}` } };
      }
      if (
        "method" in frame &&
        frame.method === "session/prompt" &&
        "params" in frame &&
        typeof frame.params === "object" &&
        frame.params !== null &&
        "prompt" in frame.params &&
        Array.isArray(frame.params.prompt)
      ) {
        const prompt: ReadonlyArray<unknown> = frame.params.prompt;
        const lastPart = prompt.at(-1);
        if (
          typeof lastPart === "object" &&
          lastPart !== null &&
          "type" in lastPart &&
          lastPart.type === "text" &&
          "text" in lastPart &&
          typeof lastPart.text === "string" &&
          // A recording that switched models mid-thread already carries the
          // instructions for the model each prompt ran on.
          (lastPart.text === instructions || lastPart.text.startsWith("<runtime_info>"))
        ) {
          return entry;
        }
        return {
          ...entry,
          frame: {
            ...frame,
            params: { ...frame.params, prompt: [...prompt, { type: "text", text: instructions }] },
          },
        };
      }
      return entry;
    }),
  };
}
