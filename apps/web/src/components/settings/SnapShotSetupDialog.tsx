import { PermissionChecklist, PermissionContinueButton } from "../permissions/PermissionChecklist";
import { usePermissionStatus } from "../permissions/usePermissionStatus";
import {
  isModifierPairShortcut,
  type DesktopSnapShotSetupAction,
  type DesktopSnapShotState,
} from "@t3tools/contracts";
import { useId, useState, type ReactNode } from "react";
import { CaptureShortcutConfig } from "./CaptureShortcutConfig";
import { Button } from "../ui/button";
import { Dialog, DialogDescription } from "../ui/dialog";
import { WizardSteps, WizardPopup, WizardHeader, WizardPanel, WizardFooter } from "../ui/wizard";
import {
  captureSetupAccessReady,
  captureSetupBackend,
  captureSetupCheckMessage,
  captureSetupDesktopName,
  captureSetupInitialStep,
  captureSetupShortcutReady,
  type CaptureSetupStep,
} from "./SnapShotSetupDialog.logic";

const SETUP_STEPS = [
  { id: "access", label: "access" },
  { id: "shortcut", label: "shortcut" },
] as const;

const GNOME_ACCESS_COPY = {
  "not-installed": {
    title: "install the extension",
    description:
      "the :3 Code GNOME extension lets you grab other windows and bring them into your draft. sign out once after installing.",
  },
  "restart-required": {
    title: "extension installed",
    description:
      "save your work, then sign out and back in. your setup will be waiting right here ;3",
  },
  "update-required": {
    title: "update the extension",
    description: "install the update, then sign out and back in and we'll pick up from here :3",
  },
  "extensions-disabled": {
    title: "allow GNOME extensions",
    description: "open GNOME extensions and turn on extensions, then let's check again :3",
  },
  disabled: {
    title: "enable the extension",
    description: "enable :3 Code SnapShots to start capturing windows.",
  },
  enabled: {
    title: "capture is ready, purr :3",
    description: "next up, let's pick your shortcut :3",
  },
  unsupported: {
    title: "aw, automatic capture isn't available here 3:",
    description: "use take snapshot from the command palette to pick a window instead ^w^",
  },
  error: {
    title: "hmm, couldn't set up the extension 3:",
    description: "check :3 Code SnapShots in GNOME extensions, then try again.",
  },
};

function ScreenRecordingIcon() {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-8 shrink-0 drop-shadow-[0_1px_1px_#0005]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x2="0" y2="1">
          <stop stopColor="#ff6972" />
          <stop offset="1" stopColor="#ff2938" />
        </linearGradient>
      </defs>
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7"
        fill={`url(#${gradientId})`}
        stroke="#ffffff40"
      />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeWidth="2" />
      <circle cx="16" cy="16" r="4.5" fill="#fff" />
    </svg>
  );
}

function AccessibilityPermissionIcon() {
  const gradientId = useId();
  return (
    <svg
      viewBox="0 0 32 32"
      className="size-8 shrink-0 drop-shadow-[0_1px_1px_#0005]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x2="0" y2="1">
          <stop stopColor="#48b6ff" />
          <stop offset="1" stopColor="#0085ff" />
        </linearGradient>
      </defs>
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7"
        fill={`url(#${gradientId})`}
        stroke="#ffffff40"
      />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#fff" strokeWidth="1.75" />
      <circle cx="16" cy="10" r="1.6" fill="#fff" />
      <path
        d="m10 13 6 1 6-1M16 14v4m0 0-2.5 6m2.5-6 2.5 6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SnapShotSetupDialog({
  state,
  initialStep,
  wasEnabled,
  includeAccessibility,
  busy: actionBusy,
  error,
  shortcutInput,
  shortcutStatus,
  shortcutChanged,
  canSaveShortcut,
  onSaveShortcut,
  onEnable,
  onAction,
  onRefresh,
  onClose,
  onLeaveStep,
}: {
  state: DesktopSnapShotState;
  initialStep: CaptureSetupStep;
  wasEnabled: boolean;
  includeAccessibility: boolean;
  busy: boolean;
  error: string | null;
  shortcutInput: ReactNode;
  shortcutStatus: string | null | undefined;
  shortcutChanged: boolean;
  canSaveShortcut: boolean;
  onSaveShortcut: () => Promise<boolean>;
  onEnable: () => Promise<boolean>;
  onAction: (action: DesktopSnapShotSetupAction) => Promise<void>;
  onRefresh: () => Promise<DesktopSnapShotState | undefined>;
  onClose: (completed: boolean) => Promise<void>;
  onLeaveStep: () => void;
}) {
  const [step, setStep] = useState(() => captureSetupInitialStep(state, initialStep));
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [configBusy, setConfigBusy] = useState(false);
  const busy = actionBusy || checking || configBusy;
  const backend = captureSetupBackend(state);
  const configShortcut = backend === "niri" || backend === "hyprland";
  const desktop = captureSetupDesktopName(state);
  const extension = state.gnomeExtension;
  const helper = backend === "hyprland" ? state.hyprlandHelper : state.kdeHelper;
  const helperBackend = backend === "kde" || backend === "hyprland";
  const installHelper = backend === "hyprland" ? "install-hyprland-helper" : "install-kde-helper";
  const removeHelper = backend === "hyprland" ? "remove-hyprland-helper" : "remove-kde-helper";
  const accessReady = captureSetupAccessReady(state);
  const permissionStatus = usePermissionStatus(
    async () => {
      const refreshed = await onRefresh();
      if (!refreshed?.macPermissions) throw new Error("Permission status unavailable");
      return refreshed.macPermissions;
    },
    state.macPermissions ?? { screenRecording: false, accessibility: false },
    Boolean(state.macPermissions) && step === "access" && !busy,
  );
  const macPermissions = state.macPermissions ? permissionStatus.status : undefined;
  const macPermissionsReady =
    !macPermissions ||
    permissionStatus.isReady(
      includeAccessibility ? ["screenRecording", "accessibility"] : ["screenRecording"],
    );
  const shortcutReady = captureSetupShortcutReady(state, shortcutChanged);
  const install = extension?.status === "not-installed" || extension?.status === "update-required";
  const enable = extension?.status === "disabled";
  const changeStep = (next: CaptureSetupStep) => {
    onLeaveStep();
    setChecked(false);
    setStep(next);
  };
  const checkAgain = async () => {
    if (busy) return;
    setChecking(true);
    setChecked(false);
    try {
      setChecked((await onRefresh()) !== undefined);
    } finally {
      setChecking(false);
    }
  };
  const accessCopy =
    state.message && !macPermissions
      ? {
          title: "let's try that again :3",
          description: "hmm, couldn't check snapshots. try again to continue 3:",
        }
      : backend === "gnome" && extension
        ? extension.status === "enabled" && !accessReady
          ? {
              title: "check capture access",
              description: "the extension isn't ready just yet. give it a moment and try again :3",
            }
          : GNOME_ACCESS_COPY[extension.status]
        : helperBackend
          ? helper?.status === "ready"
            ? {
                title: "capture is ready, purr :3",
                description: "next up, let's pick your shortcut :3",
              }
            : helper?.status === "error"
              ? {
                  title: "let's fix capture access :3",
                  description: "try reinstalling the capture helper, then we'll check again :3",
                }
              : {
                  title:
                    helper?.status === "update-required"
                      ? "update the capture helper"
                      : "allow snapshots",
                  description:
                    ":3 Code's capture helper lets you grab other apps and hop back to your draft. it's included with :3 Code.",
                }
          : backend === "niri"
            ? {
                title: "capture is ready, purr :3",
                description: "next up, let's pick your shortcut :3",
              }
            : backend === "picker"
              ? {
                  title: "choose a window each time",
                  description:
                    "your desktop doesn't support automatic capture, so you'll pick the window to capture instead :3",
                }
              : {
                  title: "allow snapshots",
                  description:
                    backend === "portal"
                      ? "your desktop may ask for permission the first time you capture :3"
                      : macPermissions
                        ? macPermissionsReady
                          ? "let's test a snapshot of the current window. if macOS asks to bypass its window picker, choose Allow. the test image is tossed right after ^w^"
                          : "allow each permission, then let's continue ;3"
                        : "allow access when prompted and we can start capturing windows ;3",
                };
  const title = step === "access" ? accessCopy.title : "choose your shortcut ^w^";
  const description =
    step === "access"
      ? accessCopy.description
      : configShortcut
        ? "click the shortcut, then press the keys you'd like ^w^"
        : state.mode === "portal"
          ? "pick your keys, then approve the permission prompt if asked :3"
          : "use both Shift keys, or record a shortcut of your own :3";
  const stepIndex = SETUP_STEPS.findIndex(({ id }) => id === step);
  const details = [
    ...new Set(
      [
        error,
        ...(step === "access"
          ? [
              state.message,
              backend === "gnome" &&
              (extension?.status === "error" || extension?.status === "unsupported")
                ? extension.message
                : null,
              helperBackend && helper?.status === "error" ? helper.message : null,
            ]
          : []),
      ].filter((detail) => detail !== null),
    ),
  ];

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) void onClose(false);
      }}
    >
      <WizardPopup showCloseButton={!busy}>
        <WizardHeader title={desktop ? `set up snapshots for ${desktop}` : "set up snapshots"}>
          <WizardSteps
            steps={SETUP_STEPS.map((item) => item.label)}
            currentStep={stepIndex}
            isStepDisabled={(index) => busy || index > stepIndex}
            onStepChange={(index) => {
              const next = SETUP_STEPS[index];
              if (next && next.id !== step) changeStep(next.id);
            }}
          />
        </WizardHeader>
        <WizardPanel>
          <div className="space-y-4 text-sm">
            <div className="space-y-2" aria-live="polite">
              <h3 className="flex items-center gap-2 font-medium">{title}</h3>
              <DialogDescription>{description}</DialogDescription>
            </div>
            {step === "access" ? (
              <>
                <p
                  role="status"
                  aria-atomic="true"
                  className={
                    checked && !busy && !error ? "text-xs text-muted-foreground" : "sr-only"
                  }
                >
                  {checked && !busy && !error ? captureSetupCheckMessage(state) : null}
                </p>
                {macPermissions ? (
                  <PermissionChecklist
                    busy={busy}
                    permissions={[
                      {
                        id: "screenRecording",
                        icon: <ScreenRecordingIcon />,
                        title: "Screen Recording",
                        description: "grab the window you're using :3",
                        granted: macPermissions.screenRecording,
                        onAllow: () => void onAction("allow-screen-recording"),
                      },
                      {
                        id: "accessibility",
                        icon: <AccessibilityPermissionIcon />,
                        title: "Accessibility",
                        description: includeAccessibility
                          ? "grab text and controls from the captured app too ;3"
                          : "optional: grab text and controls from the captured app too :3",
                        granted: macPermissions.accessibility,
                        onAllow: () => void onAction("allow-accessibility"),
                      },
                    ]}
                  />
                ) : null}
                {permissionStatus.error && macPermissions ? (
                  <p role="status" className="text-xs text-muted-foreground">
                    {permissionStatus.error}
                  </p>
                ) : null}
                {helperBackend && helper?.status === "error" ? (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onAction(installHelper)}
                  >
                    reinstall helper
                  </Button>
                ) : null}
              </>
            ) : configShortcut ? (
              <CaptureShortcutConfig
                state={state}
                disabled={actionBusy || checking || !accessReady}
                onBusyChange={setConfigBusy}
                onSaved={onRefresh}
                onComplete={() => onClose(true)}
              />
            ) : (
              <div className="space-y-3">
                {shortcutInput}
                {shortcutStatus ? (
                  <p className="text-xs text-muted-foreground" role="status">
                    {shortcutStatus}
                  </p>
                ) : null}
                {!shortcutChanged &&
                !state.shortcutRegistered &&
                !state.shortcutPending &&
                state.shortcutCanRetry !== false &&
                !isModifierPairShortcut(state.shortcut) ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void onAction("retry-shortcut")}
                  >
                    {state.mode === "portal" ? "shortcut permissions" : "try again"}
                  </Button>
                ) : null}
              </div>
            )}
            {step === "shortcut" && !accessReady ? (
              <p role="alert" className="text-destructive">
                hmm, capture needs a little attention. go back to check access 3:
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-destructive">
                {" "}
                aw, couldn't finish this step. try again or peek at advanced for help 3:
              </p>
            ) : null}
            {details.length > 0 || (step === "access" && (backend === "gnome" || helperBackend)) ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer">advanced</summary>
                <div className="mt-3 space-y-3">
                  {details.map((detail) => (
                    <p key={detail} className="break-words">
                      {detail}
                    </p>
                  ))}
                  {step === "access" && (backend === "gnome" || helperBackend) ? (
                    <p>included with :3 Code. no download needed.</p>
                  ) : null}
                  {step === "access" && backend === "gnome" && extension?.status === "enabled" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction("disable-extension")}
                    >
                      disable extension
                    </Button>
                  ) : null}
                  {step === "access" && helperBackend && helper?.status !== "not-installed" ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void onAction(removeHelper)}
                    >
                      remove capture helper
                    </Button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </div>
        </WizardPanel>
        <WizardFooter>
          {step !== "access" ? (
            <Button variant="ghost" disabled={busy} onClick={() => changeStep("access")}>
              back
            </Button>
          ) : null}
          <Button variant="ghost" disabled={busy} onClick={() => void onClose(false)}>
            {wasEnabled ? "close" : "finish later"}
          </Button>
          {step === "access" ? (
            helperBackend && !accessReady && helper?.status !== "ready" ? (
              <Button
                disabled={busy}
                aria-busy={busy}
                onClick={() =>
                  void (helper?.status === "error" ? checkAgain() : onAction(installHelper))
                }
              >
                {checking
                  ? "checking…"
                  : busy
                    ? "installing…"
                    : helper?.status === "error"
                      ? "check again"
                      : helper?.status === "update-required"
                        ? "update helper"
                        : "install helper"}
              </Button>
            ) : backend === "gnome" && !accessReady && extension?.status !== "enabled" ? (
              <Button
                disabled={busy}
                aria-busy={checking}
                onClick={() =>
                  void (install
                    ? onAction("install-extension")
                    : enable
                      ? onAction("enable-extension")
                      : checkAgain())
                }
              >
                {checking
                  ? "checking…"
                  : busy
                    ? install
                      ? "installing…"
                      : enable
                        ? "enabling…"
                        : "working…"
                    : install
                      ? extension?.status === "update-required"
                        ? "update extension"
                        : "install extension"
                      : enable
                        ? "enable extension"
                        : "check again"}
              </Button>
            ) : (
              <PermissionContinueButton
                ready={macPermissionsReady}
                busy={busy}
                onClick={async () => {
                  if (await onEnable()) changeStep("shortcut");
                }}
              >
                {busy
                  ? "working…"
                  : macPermissions
                    ? "test capture and continue"
                    : backend === "direct"
                      ? "allow capture"
                      : !accessReady && !macPermissions
                        ? "try again"
                        : "continue"}
              </PermissionContinueButton>
            )
          ) : !configShortcut ? (
            <Button
              disabled={
                busy || !accessReady || (shortcutChanged ? !canSaveShortcut : !shortcutReady)
              }
              onClick={async () => {
                if (!shortcutChanged || (await onSaveShortcut())) await onClose(true);
              }}
            >
              {busy ? "saving…" : shortcutChanged ? "save and finish" : "done"}
            </Button>
          ) : null}
        </WizardFooter>
      </WizardPopup>
    </Dialog>
  );
}
