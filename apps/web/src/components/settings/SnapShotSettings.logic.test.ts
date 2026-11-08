import { assert, expect, it } from "vite-plus/test";
import { DEFAULT_CLIENT_SETTINGS, type DesktopSnapShotState } from "@t3tools/contracts";

import {
  createRecordingRequestTracker,
  snapShotStatus,
  snapShotShortcutStatus,
  snapShotSetupSummary,
  snapShotSetupButtonLabel,
  snapShotSetupComplete,
} from "./SnapShotSettings.logic";

it("ignores a stale request after a newer request starts", () => {
  const requests = createRecordingRequestTracker();
  const firstRequest = requests.tryBegin();
  assert(firstRequest);

  requests.clear();
  const secondRequest = requests.tryBegin();
  assert(secondRequest);

  expect(requests.owns(firstRequest)).toBe(false);
  expect(requests.owns(secondRequest)).toBe(true);
  expect(requests.tryBegin()).toBeNull();
});

it.each(["gnome-extension", "picker"] as const)(
  "waits for opt-in before presenting %s setup requirements",
  (linuxBackend) => {
    const state: DesktopSnapShotState = {
      mode: "portal",
      linuxBackend,
      shortcut: DEFAULT_CLIENT_SETTINGS.snapShotShortcut,
      shortcutRegistered: false,
      shortcutMessage: "Shortcut permission needed",
      message: "capture needs attention",
      gnomeExtension: { status: "not-installed", message: "install the extension" },
    };

    expect(DEFAULT_CLIENT_SETTINGS.snapShotEnabled).toBe(false);
    expect(snapShotStatus(state, false)).toBe("turn this on and we'll set up snapshots :3");
    expect(snapShotStatus(state, true)).toBe("capture needs a little attention ^w^");
  },
);

it("distinguishes saved shortcuts from observed delivery without making users repeat setup", () => {
  const state: DesktopSnapShotState = {
    mode: "portal",
    linuxBackend: "gnome-extension",
    shortcut: DEFAULT_CLIENT_SETTINGS.snapShotShortcut,
    shortcutRegistered: true,
    shortcutMessage: "Requested",
    message: null,
    gnomeExtension: { status: "enabled", message: "Running" },
  };
  expect(snapShotSetupSummary(state, true)).toBe("shortcut saved, purr :3");
  expect(snapShotSetupButtonLabel(state)).toBe("manage capture");
  expect(snapShotSetupSummary({ ...state, shortcutVerified: true }, true)).toBe(
    "all set, ready to capture :3",
  );
  expect(snapShotSetupButtonLabel({ ...state, shortcutVerified: true })).toBe("manage capture");
  expect(snapShotSetupButtonLabel({ ...state, shortcutRegistered: false })).toBe("manage capture");
  expect(
    snapShotSetupButtonLabel({
      ...state,
      gnomeExtension: { status: "disabled", message: "enable the extension" },
    }),
  ).toBe("set up GNOME capture");
  expect(snapShotSetupSummary({ ...state, shortcutVerified: true }, false)).toContain(
    "enable capture",
  );
  expect(
    snapShotSetupSummary(
      {
        ...state,
        gnomeExtension: { status: "restart-required", message: "Sign out" },
        shortcutVerified: true,
      },
      true,
    ),
  ).toBe("set up active-window snapshots");
  expect(
    snapShotSetupSummary(
      { ...state, linuxBackend: "niri", gnomeExtension: undefined, shortcutRegistered: false },
      true,
    ),
  ).toBe("finish shortcut setup");
  expect(
    snapShotSetupSummary(
      { ...state, linuxBackend: "picker", gnomeExtension: undefined, shortcutVerified: true },
      true,
    ),
  ).toBe("manual capture only: you'll choose a window each time");
  expect(
    snapShotSetupSummary(
      {
        ...state,
        linuxBackend: "screenshot-portal",
        gnomeExtension: { status: "not-installed", message: "Optional extension" },
        shortcutVerified: true,
      },
      true,
    ),
  ).toBe("all set, ready to capture :3");
});

it("reports pending, denied, and assigned shortcuts without inferring consent from saved keys", () => {
  const state: DesktopSnapShotState = {
    mode: "portal",
    linuxBackend: "screenshot-portal",
    shortcut: DEFAULT_CLIENT_SETTINGS.snapShotShortcut,
    shortcutRegistered: false,
    shortcutPending: true,
    shortcutMessage: null,
    message: null,
  };
  expect(snapShotStatus(state, true)).toContain("waiting for shortcut permission");
  expect(snapShotShortcutStatus(state)).toContain("approve the shortcut permission prompt");
  const denied = { ...state, shortcutPending: false, shortcutMessage: "Permission wasn't granted" };
  expect(snapShotShortcutStatus(denied)).toBe("Permission wasn't granted");
  const approved = {
    ...denied,
    shortcutRegistered: true,
    shortcutLabel: "Press <Shift><Control>2",
    shortcutMessage: "Desktop shortcut: Press <Shift><Control>2",
  };
  expect(snapShotStatus(approved, true)).toBe("all set, ready to capture :3");
  expect(snapShotShortcutStatus(approved)).toBeNull();
  expect(snapShotShortcutStatus({ ...approved, shortcutPending: true })).toContain(
    "approve the shortcut permission prompt",
  );
  expect(
    snapShotShortcutStatus({
      ...approved,
      shortcutRegistered: false,
      shortcutMessage: "Permission wasn't granted",
    }),
  ).toBe("Permission wasn't granted");
});

it("hides macOS setup only while permissions and the shortcut are all in place", () => {
  const ready: DesktopSnapShotState = {
    mode: "direct",
    shortcut: DEFAULT_CLIENT_SETTINGS.snapShotShortcut,
    shortcutRegistered: true,
    shortcutMessage: null,
    message: null,
    macPermissions: { screenRecording: true, accessibility: true },
  };
  expect(snapShotSetupComplete(ready, true)).toBe(true);
  expect(snapShotSetupComplete({ ...ready, macPermissions: undefined }, true)).toBe(false);
  expect(snapShotSetupComplete({ ...ready, shortcutRegistered: false }, true)).toBe(false);
  const revoked = {
    ...ready,
    macPermissions: { screenRecording: true, accessibility: false },
    message: "Allow Accessibility in System Settings, then restart :3 Code.",
  };
  expect(snapShotSetupComplete(revoked, true)).toBe(false);
  expect(snapShotStatus(revoked, true)).toBe("capture needs a little attention ^w^");
  expect(snapShotSetupButtonLabel(revoked)).toBe("continue setup");
  expect(snapShotSetupComplete({ ...revoked, message: null }, false)).toBe(true);
  expect(
    snapShotSetupComplete(
      { ...ready, windows: true, macPermissions: undefined, shortcutRegistered: false },
      true,
    ),
  ).toBe(true);
});
