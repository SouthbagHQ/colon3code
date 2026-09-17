import { ProviderInstanceId, type ServerConfig } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { resolveStopActionBlockedHint, SOUTHBAG_CODE_STOP_HINT } from "./composer-stop-action";

const config = {
  providers: [
    { instanceId: "codex", driver: "codex" },
    { instanceId: "southbag-code", driver: "southbag-code" },
  ],
  settings: {
    providerInstances: {
      "southbag-work": { driver: "southbag-code" },
    },
  },
} as unknown as ServerConfig;

function session(providerName: string | null) {
  return { providerName, status: "running" as const };
}

function selection(instanceId: string) {
  return { instanceId: ProviderInstanceId.make(instanceId) };
}

describe("resolveStopActionBlockedHint", () => {
  it("keeps stopping enabled for providers that take interrupts", () => {
    expect(
      resolveStopActionBlockedHint({
        serverConfig: config,
        thread: { session: session("codex"), modelSelection: selection("codex") },
      }),
    ).toBeNull();
  });

  it("blocks stopping while a Southbag Code session runs", () => {
    expect(
      resolveStopActionBlockedHint({
        serverConfig: config,
        thread: {
          session: session("southbag-code"),
          modelSelection: selection("codex"),
        },
      }),
    ).toBe(SOUTHBAG_CODE_STOP_HINT);
  });

  it("falls back to the selected provider before a session names one", () => {
    expect(
      resolveStopActionBlockedHint({
        serverConfig: config,
        thread: { session: null, modelSelection: selection("southbag-code") },
      }),
    ).toBe(SOUTHBAG_CODE_STOP_HINT);
    expect(
      resolveStopActionBlockedHint({
        serverConfig: config,
        thread: { session: session(null), modelSelection: selection("codex") },
      }),
    ).toBeNull();
  });

  it("resolves custom instances through the settings map when the probe is missing", () => {
    expect(
      resolveStopActionBlockedHint({
        serverConfig: config,
        thread: { session: null, modelSelection: selection("southbag-work") },
      }),
    ).toBe(SOUTHBAG_CODE_STOP_HINT);
  });

  it("allows stopping without a server config", () => {
    expect(
      resolveStopActionBlockedHint({
        serverConfig: null,
        thread: { session: null, modelSelection: selection("southbag-code") },
      }),
    ).toBeNull();
  });
});
