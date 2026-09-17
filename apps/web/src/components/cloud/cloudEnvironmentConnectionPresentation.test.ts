import type { EnvironmentConnectionPresentation } from "@t3tools/client-runtime/connection";
import { describe, expect, it } from "vite-plus/test";

import { presentSavedCloudEnvironmentConnection } from "./cloudEnvironmentConnectionPresentation";

function connection(
  phase: EnvironmentConnectionPresentation["phase"],
  error: string | null = null,
): EnvironmentConnectionPresentation {
  return { phase, error, traceId: null };
}

describe("saved cloud environment connection presentation", () => {
  it("only labels a live connection as connected", () => {
    expect(presentSavedCloudEnvironmentConnection(connection("connected"))).toEqual({
      buttonLabel: "connected",
      statusText: "Connected",
      tone: "connected",
    });

    expect(presentSavedCloudEnvironmentConnection(connection("connecting"))).toEqual({
      buttonLabel: "connecting…",
      statusText: "Connecting...",
      tone: "connecting",
    });
  });

  it("surfaces a failed attempt while the supervisor reconnects", () => {
    expect(
      presentSavedCloudEnvironmentConnection(
        connection("reconnecting", "Relay environment endpoint is unavailable."),
      ),
    ).toEqual({
      buttonLabel: "reconnecting…",
      statusText:
        "Failed to connect. Reconnecting... Reason: Relay environment endpoint is unavailable.",
      tone: "connecting",
    });
  });

  it.each([
    ["error", "connection failed", "Connection failed. Reason: Access denied.", "error"],
    ["offline", "offline", "Offline", "idle"],
    ["available", "not connected", "Available", "idle"],
  ] as const)(
    "presents %s without claiming the environment is connected",
    (phase, buttonLabel, statusText, tone) => {
      expect(
        presentSavedCloudEnvironmentConnection(
          connection(phase, phase === "error" ? "Access denied." : null),
        ),
      ).toEqual({ buttonLabel, statusText, tone });
    },
  );
});
