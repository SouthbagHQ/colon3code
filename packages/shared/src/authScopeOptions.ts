import {
  AuthAccessReadScope,
  AuthAccessWriteScope,
  AuthDiagnosticsReadScope,
  AuthEnvironmentMaintainScope,
  AuthFilesystemReadScope,
  AuthFilesystemWriteScope,
  type AuthGrantScope,
  AuthOrchestrationOperateScope,
  AuthOrchestrationReadScope,
  AuthPreviewOperateScope,
  AuthProvidersManageScope,
  AuthRelayReadScope,
  AuthRelayWriteScope,
  AuthSettingsWriteScope,
  AuthSourceControlWriteScope,
  AuthTerminalOperateScope,
  AuthTerminalReadScope,
} from "@t3tools/contracts";

export const AUTH_SCOPE_OPTIONS: ReadonlyArray<{
  readonly scope: AuthGrantScope;
  readonly title: string;
  readonly description: string;
}> = [
  {
    scope: AuthOrchestrationReadScope,
    title: "view environment",
    description: "Read threads, status, checkpoints, and configuration.",
  },
  {
    scope: AuthOrchestrationOperateScope,
    title: "operate tasks",
    description: "Start, update, and stop tasks.",
  },
  {
    scope: AuthSettingsWriteScope,
    title: "change environment settings",
    description: "Edit environment preferences and keybindings.",
  },
  {
    scope: AuthProvidersManageScope,
    title: "manage providers",
    description: "Configure, install, sign in to, and update providers and usage sources.",
  },
  {
    scope: AuthEnvironmentMaintainScope,
    title: "maintain environment",
    description: "Update the server and control environment processes.",
  },
  {
    scope: AuthPreviewOperateScope,
    title: "control previews",
    description: "Open browser previews and host browser automation.",
  },
  {
    scope: AuthDiagnosticsReadScope,
    title: "view diagnostics and usage",
    description: "Read process diagnostics, resource history, and usage totals.",
  },
  {
    scope: AuthTerminalReadScope,
    title: "view terminals",
    description: "Read existing terminal output and status.",
  },
  {
    scope: AuthTerminalOperateScope,
    title: "use terminals",
    description: "Create terminals and send input to running shells.",
  },
  {
    scope: AuthSourceControlWriteScope,
    title: "change source control",
    description: "Commit, push, manage branches and repositories, and change pull requests.",
  },
  {
    scope: AuthFilesystemReadScope,
    title: "read files",
    description: "Browse host files, search workspaces, and inspect local changes.",
  },
  {
    scope: AuthFilesystemWriteScope,
    title: "write files",
    description: "Edit workspace files and save plans to disk.",
  },
  {
    scope: AuthAccessReadScope,
    title: "view access",
    description: "Inspect pairing links and authorized clients.",
  },
  {
    scope: AuthAccessWriteScope,
    title: "manage access",
    description: "Issue and revoke credentials for other clients.",
  },
  {
    scope: AuthRelayReadScope,
    title: "view relay",
    description: "Inspect managed relay connectivity.",
  },
  {
    scope: AuthRelayWriteScope,
    title: "manage relay",
    description: "Change managed tunnel connectivity.",
  },
];

/** Shown instead of the granted scopes while they are unknown, so every surface says the same thing. */
export function sessionPermissionsUnavailableMessage(input: {
  readonly connected: boolean;
  /** The check errored; the client retries it while connected. */
  readonly failed: boolean;
  /** The environment answered that this session is not signed in; retrying will not change that. */
  readonly rejected: boolean;
}): string {
  if (!input.connected) return "Connect to this environment to view this session’s permissions.";
  if (input.rejected)
    return "This environment did not accept your session. Reconnect to try again.";
  return input.failed
    ? "Could not verify your permissions. Retrying automatically."
    : "checking permissions…";
}
