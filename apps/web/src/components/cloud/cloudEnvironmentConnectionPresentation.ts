import {
  connectionStatusText,
  type EnvironmentConnectionPresentation,
} from "@t3tools/client-runtime/connection";

export interface SavedCloudEnvironmentConnectionPresentation {
  readonly buttonLabel: string;
  readonly statusText: string;
  readonly tone: "connected" | "connecting" | "error" | "idle";
}

export function presentSavedCloudEnvironmentConnection(
  connection: EnvironmentConnectionPresentation,
): SavedCloudEnvironmentConnectionPresentation {
  switch (connection.phase) {
    case "connected":
      return {
        buttonLabel: "connected",
        statusText: connectionStatusText(connection),
        tone: "connected",
      };
    case "connecting":
      return {
        buttonLabel: "connecting…",
        statusText: connectionStatusText(connection),
        tone: "connecting",
      };
    case "reconnecting":
      return {
        buttonLabel: "reconnecting…",
        statusText: connectionStatusText(connection),
        tone: "connecting",
      };
    case "unsupported":
      return {
        buttonLabel: "client not supported",
        statusText: connectionStatusText(connection),
        tone: "idle",
      };
    case "error":
      return {
        buttonLabel: "connection failed",
        statusText: connectionStatusText(connection),
        tone: "error",
      };
    case "offline":
      return {
        buttonLabel: "offline",
        statusText: connectionStatusText(connection),
        tone: "idle",
      };
    case "available":
      return {
        buttonLabel: "not connected",
        statusText: connectionStatusText(connection),
        tone: "idle",
      };
  }
}
