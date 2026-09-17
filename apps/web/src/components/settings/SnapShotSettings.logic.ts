import type { ClientSettingsPatch, DesktopSnapShotState, SnapShotSound } from "@t3tools/contracts";
import {
  captureSetupBackend,
  captureSetupDesktopName,
  captureSetupAccessReady,
  captureSetupMacPermissionsReady,
} from "./SnapShotSetupDialog.logic";

export function snapShotStatus(state: DesktopSnapShotState | null, enabled: boolean): string {
  if (!state) return "checking snapshots… ;3";
  if (state.mode === "unavailable")
    return state.message ?? "hmm, not supported on this platform ;3";
  if (!enabled) return "turn this on and we'll set up snapshots :3";
  return snapShotSetupSummary(state, enabled);
}

export function snapShotSetupSummary(state: DesktopSnapShotState, enabled: boolean): string {
  if (state.message) return "capture needs a little attention ^w^";
  if (state.linuxBackend === "hyprland" && state.hyprlandHelper?.status !== "ready")
    return state.hyprlandHelper?.status === "error"
      ? "check capture access in setup"
      : "install the capture helper to continue";
  if (captureSetupBackend(state) === "gnome" && state.gnomeExtension?.status !== "enabled")
    return "set up active-window snapshots";
  if (captureSetupBackend(state) === "kde" && state.kdeHelper?.status !== "ready")
    return state.kdeHelper?.status === "error"
      ? "check capture access in setup"
      : "install the capture helper to continue";
  if (captureSetupBackend(state) === "picker")
    return "manual capture only — you'll choose a window each time";
  if (!enabled) return "enable capture to continue";
  if (state.shortcutPending)
    return state.linuxBackend === "hyprland"
      ? "connecting your shortcut…"
      : "waiting for shortcut permission";
  if (state.shortcutVerified) return "all set, ready to capture :3";
  if (state.linuxBackend === "niri" && state.shortcutBinding)
    return "use your shortcut from another app";
  if (state.linuxBackend === "hyprland" && state.shortcutActionRegistered)
    return "use your shortcut from another app";
  if (state.shortcutRegistered)
    return state.shortcutLabel ? "all set, ready to capture :3" : "shortcut saved, purr :3";
  return "finish shortcut setup";
}

export function snapShotShortcutStatus(state: DesktopSnapShotState | null): string | null {
  if (!state) return null;
  if (state.linuxBackend === "hyprland") return state.shortcutMessage;
  if (state.shortcutPending) return "approve the shortcut permission prompt and we'll carry on :3";
  if (state.shortcutRegistered) return state.mode === "portal" ? null : "shortcut saved, purr :3";
  return state.shortcutMessage;
}

export function snapShotSetupButtonLabel(state: DesktopSnapShotState | null): string {
  if (!state) return "continue setup";
  if (captureSetupAccessReady(state)) return "manage capture";
  const desktop = captureSetupDesktopName(state);
  return desktop ? `set up ${desktop} capture` : "continue setup";
}

// Windows needs no permissions or setup: turning capture on is enough. macOS setup
// has nothing left to manage once permissions and the shortcut are in place; the
// shortcut row stays editable inline. Revoking a permission brings the button back
// as "Continue setup" through the state message.
export function snapShotSetupComplete(
  state: DesktopSnapShotState | null,
  includeAccessibility: boolean,
): boolean {
  if (state?.windows) return true;
  return (
    state?.macPermissions !== undefined &&
    captureSetupAccessReady(state) &&
    captureSetupMacPermissionsReady(state, includeAccessibility) &&
    state.shortcutRegistered
  );
}

export type SnapShotSoundSelection = SnapShotSound | "off";

export function snapShotFeedbackUnavailableMessage(
  state: DesktopSnapShotState | null,
): string | undefined {
  if (state?.mode !== "portal" || state.linuxFeedbackAvailable) return undefined;
  if (state.linuxBackend === "hyprland")
    return state.hyprlandHelper?.status === "ready"
      ? "aw, capture effects aren't available on this desktop :3"
      : "install or update the capture helper to turn on effects :3";
  if (state.linuxBackend === "niri") return "aw, capture effects aren't available on Niri :3";
  if (state.linuxBackend === "kde")
    return state.kdeHelper?.status === "ready"
      ? "aw, capture effects aren't available on this desktop :3"
      : "install or update the capture helper to turn on effects :3";
  return state.linuxBackend === "gnome-extension"
    ? "update the GNOME extension, then sign out and back in to turn on effects ^w^"
    : captureSetupBackend(state) === "gnome"
      ? "finish the extension setup to turn on effects :3"
      : "aw, capture effects aren't available on this desktop :3";
}

export function snapShotDescription(state: DesktopSnapShotState | null): string {
  return state?.mode === "portal" && captureSetupBackend(state) === "picker"
    ? "automatic capture isn't available here, so you'll pick a window instead ^w^"
    : "grab a window and tuck it into your current draft ;3";
}

export function snapShotAccessibilityUnavailableMessage(
  state: DesktopSnapShotState | null,
): string | undefined {
  if (state?.mode !== "portal") return undefined;
  if (state.linuxBackend === "picker" || state.linuxBackend === "screenshot-portal")
    return "this desktop only gives us a screenshot ^w^";
  return undefined;
}

export function snapShotUnavailableMessage(hasBridge: boolean): string | undefined {
  if (hasBridge) return undefined;
  return typeof window !== "undefined" && window.desktopBridge
    ? "update the desktop app and snapshots will be ready :3"
    : "only available in the desktop app, sorry ;3";
}

export function snapShotSoundPatch(sound: SnapShotSoundSelection): ClientSettingsPatch {
  return sound === "off"
    ? { snapShotPlaySound: false }
    : { snapShotPlaySound: true, snapShotSound: sound };
}

export function createRecordingRequestTracker() {
  let currentRequest: symbol | null = null;

  return {
    tryBegin() {
      if (currentRequest) return null;
      currentRequest = Symbol();
      return currentRequest;
    },
    clear() {
      currentRequest = null;
    },
    owns(request: symbol) {
      return currentRequest === request;
    },
  };
}
