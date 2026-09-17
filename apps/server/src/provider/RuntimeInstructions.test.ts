import { describe, expect, it } from "vite-plus/test";
import { buildRuntimeInstructions } from "./RuntimeInstructions.ts";

describe("buildRuntimeInstructions", () => {
  it("requires explicit registration of every PR and stack layer", () => {
    const instructions = buildRuntimeInstructions({ harness: "Codex" });
    expect(instructions).toContain("When the colon3-code MCP server exposes link_pull_request");
    expect(instructions).toContain("with the full PR URL immediately after creating a PR");
    expect(instructions).toContain("For a stack, call it for every layer");
    expect(instructions).toContain("call list_thread_pull_requests and link any PR");
  });

  it("keeps known model and effort metadata on one line", () => {
    expect(
      buildRuntimeInstructions({
        harness: "Codex",
        model: "  custom\nmodel  ",
        reasoningEffort: " high\n",
      }),
    ).toContain("through the Codex harness, as custom model with high reasoning effort.");
  });

  it.each([undefined, "", "auto", "default"])("omits unresolved model %s", (model) => {
    const instructions = buildRuntimeInstructions({ harness: "Cursor", model });
    expect(instructions).toContain("through the Cursor harness.");
    expect(instructions).not.toContain("reasoning effort");
  });
});

describe("voice instructions", () => {
  it("asks for the app's cute voice in chat prose only", () => {
    const instructions = buildRuntimeInstructions({ harness: "Claude Code" });
    expect(instructions).toContain("<voice>");
    expect(instructions).toMatch(/"meow", "mrrp", "nya", or "uwu"/);
    expect(instructions).toContain('":3" when something worked, "3:" when something went wrong');
    expect(instructions).toContain("Do not apply it to code, comments, commit messages");
    // Runtime info stays first so harness-level parsing of the header is unchanged.
    expect(instructions.indexOf("<runtime_info>")).toBeLessThan(instructions.indexOf("<voice>"));
    expect(instructions.indexOf("<voice>")).toBeLessThan(
      instructions.indexOf("<pull_request_linking>"),
    );
  });
});
