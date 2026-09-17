import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
  type AtomCommandResult,
} from "@t3tools/client-runtime/state/runtime";
import {
  ANTIGRAVITY_AUTH_METHODS,
  type AntigravityAuthMethod,
  type EnvironmentId,
  type ProviderAuthState,
  type ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { useRef, useState } from "react";
import { Trash2Icon } from "lucide-react";

import { writeTextToClipboard } from "../../hooks/useCopyToClipboard";
import { ensureLocalApi } from "../../localApi";
import { useEnvironmentQuery } from "../../state/query";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SettingsRow } from "./settingsLayout";

interface ProviderSetupSectionProps {
  readonly environmentId: EnvironmentId;
  readonly environmentLabel: string;
  readonly instanceId: ProviderInstanceId;
  readonly provider: ServerProvider | undefined;
  readonly binaryPath?: string | undefined;
  readonly authMethod?: AntigravityAuthMethod | undefined;
  readonly enabled: boolean;
  readonly readOnly: boolean;
  readonly onEnable: () => void;
}

const AUTH_PHASE_LABELS: Record<ProviderAuthState["phase"], string> = {
  idle: "sign in with your Google account ;3",
  starting: "starting Google sign-in :3",
  waiting: "waiting for Google sign-in :3",
  verifying: "checking Google sign-in and available models.",
  succeeded: "Google sign-in complete :3",
  failed: "Google sign-in failed 3:",
  cancelled: "Google sign-in cancelled 3:",
};

/** API key methods skip the browser, so the phases read as a credential check. */
const CREDENTIAL_PHASE_LABELS: Record<ProviderAuthState["phase"], string> = {
  idle: "connect with the credentials in the provider settings :3",
  starting: "checking credentials :3",
  waiting: "checking credentials :3",
  verifying: "checking credentials and available models.",
  succeeded: "connected :3",
  failed: "could not connect with the configured credentials 3:",
  cancelled: "connection cancelled 3:",
};

/** Read the configured method from the instance config. Unknown values fall back to personal. */
export function readAntigravityAuthMethod(config: unknown): AntigravityAuthMethod {
  const value =
    config !== null && typeof config === "object" && "authMethod" in config
      ? config.authMethod
      : undefined;
  return (
    ANTIGRAVITY_AUTH_METHODS.find((method) => method.value === value)?.value ?? "oauth-personal"
  );
}

/** Setup state belongs to the selected environment and is never saved in client settings. */
export function ProviderSetupSection(props: ProviderSetupSectionProps) {
  return (
    <section
      aria-label="Antigravity setup"
      className="@container/setup divide-y divide-border/50 text-xs"
    >
      <SettingsRow
        className="@max-lg/setup:[&>div:first-child]:flex @max-lg/setup:[&>div:first-child]:items-stretch @max-lg/setup:[&>div:first-child]:gap-3"
        title="environment"
        description="device that runs this provider ;3"
        control={
          <div className="flex min-w-0 flex-col gap-2 sm:items-end">
            <span className="text-muted-foreground [overflow-wrap:anywhere]">
              {props.environmentLabel}
            </span>
            {!props.enabled && !props.readOnly ? (
              <Button size="sm" variant="outline" onClick={props.onEnable}>
                enable Antigravity
              </Button>
            ) : null}
          </div>
        }
      />
      {props.readOnly ? (
        <SettingsRow title="setup unavailable" description="provider setup is read-only ^w^" />
      ) : props.provider?.setup === undefined ? (
        <SettingsRow
          title="update required"
          description="update this environment to manage Antigravity ^w^"
        />
      ) : (
        <ProviderSetupActions
          key={`${props.environmentId}:${props.instanceId}`}
          environmentId={props.environmentId}
          environmentLabel={props.environmentLabel}
          instanceId={props.instanceId}
          provider={props.provider}
          binaryPath={props.binaryPath}
          authMethod={props.authMethod ?? "oauth-personal"}
          enabled={props.enabled}
        />
      )}
    </section>
  );
}

function ProviderSetupActions({
  environmentId,
  environmentLabel,
  instanceId,
  provider,
  enabled,
  binaryPath,
  authMethod,
}: Pick<
  ProviderSetupSectionProps,
  "environmentId" | "environmentLabel" | "instanceId" | "enabled" | "binaryPath"
> & {
  readonly provider: ServerProvider;
  readonly authMethod: AntigravityAuthMethod;
}) {
  const target = { environmentId, input: { instanceId } };
  const usesBrowser = authMethod === "oauth-personal" || authMethod === "oauth-business";
  const phaseLabels = usesBrowser ? AUTH_PHASE_LABELS : CREDENTIAL_PHASE_LABELS;
  const methodLabel =
    ANTIGRAVITY_AUTH_METHODS.find((method) => method.value === authMethod)?.label ??
    "Google account";
  const authQuery = useEnvironmentQuery(serverEnvironment.providerAuthState(target));
  const installQuery = useEnvironmentQuery(serverEnvironment.providerInstallState(target));
  const auth = authQuery.data;
  const installation = installQuery.data;
  const commandOptions = { reportFailure: false, reportDefect: false };
  const startAuth = useAtomCommand(serverEnvironment.startProviderAuth, commandOptions);
  const completeAuth = useAtomCommand(serverEnvironment.completeProviderAuth, commandOptions);
  const cancelAuth = useAtomCommand(serverEnvironment.cancelProviderAuth, commandOptions);
  const logoutAuth = useAtomCommand(serverEnvironment.logoutProviderAuth, commandOptions);
  const startInstall = useAtomCommand(serverEnvironment.startProviderInstall, commandOptions);
  const cancelInstall = useAtomCommand(serverEnvironment.cancelProviderInstall, commandOptions);
  const removeInstall = useAtomCommand(
    serverEnvironment.removeProviderInstallation,
    commandOptions,
  );
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const pendingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [callbackDraft, setCallbackDraft] = useState({ flowId: null as string | null, value: "" });
  const [copiedFlowId, setCopiedFlowId] = useState<string | null>(null);
  const callbackUrl = callbackDraft.flowId === auth?.flowId ? callbackDraft.value : "";
  const authActive =
    auth?.phase === "starting" || auth?.phase === "waiting" || auth?.phase === "verifying";
  const installActive =
    installation?.phase === "downloading" ||
    installation?.phase === "extracting" ||
    installation?.phase === "verifying";
  const usesCustomBinary = Boolean(binaryPath?.trim());
  const installed =
    provider.installed || (!usesCustomBinary && installation?.installedVersion != null);
  const authenticated = provider.auth.status === "authenticated";
  const authStatusMessage =
    auth === null
      ? "reading sign-in status :3"
      : authActive || auth.phase === "failed" || auth.phase === "cancelled"
        ? (auth.message ?? phaseLabels[auth.phase])
        : authenticated
          ? usesBrowser
            ? "signed in with Google :3"
            : "connected :3"
          : auth.phase === "idle" && auth.message
            ? auth.message
            : phaseLabels.idle;
  const authorizationUrl = auth?.phase === "waiting" ? auth.authorizationUrl : null;
  const queryError = authQuery.error ?? installQuery.error;
  const actionsDisabled = pendingLabel !== null || queryError !== null;
  const installationStatusMessage =
    installation?.phase === "downloading"
      ? `downloading ${(installation.downloadedBytes / 1_000_000).toFixed(1)} MB${installation.totalBytes === null ? "" : ` of ${(installation.totalBytes / 1_000_000).toFixed(1)} MB`}.`
      : installation?.phase === "extracting"
        ? "extracting Antigravity."
        : installation?.phase === "verifying"
          ? "checking the downloaded runtime."
          : installed
            ? "installed :3"
            : usesCustomBinary
              ? enabled
                ? "the configured Antigravity runtime is unavailable 3:"
                : "the configured Antigravity runtime has not been checked."
              : installation?.totalBytes
                ? `${Math.ceil(installation.totalBytes / 1_000_000)} MB download.`
                : "not installed ;3";

  async function runCommand<A, E>(
    label: string,
    request: () => Promise<AtomCommandResult<A, E>>,
  ): Promise<boolean> {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPendingLabel(label);
    setError(null);
    try {
      const result = await request();
      if (result._tag === "Failure") {
        if (!isAtomCommandInterrupted(result)) {
          const failure = squashAtomCommandFailure(result);
          setError(failure instanceof Error ? failure.message : "provider setup failed 3:");
        }
        return false;
      }
      return true;
    } catch {
      setError("provider setup failed 3: try again.");
      return false;
    } finally {
      pendingRef.current = false;
      setPendingLabel(null);
    }
  }

  async function openSignInPage() {
    if (!authorizationUrl) return;
    try {
      await ensureLocalApi().shell.openExternal(authorizationUrl);
      setError(null);
    } catch {
      setError("could not open the sign-in page 3: copy the link and open it in your browser.");
    }
  }

  async function copySignInLink() {
    if (!authorizationUrl) return;
    try {
      await writeTextToClipboard(authorizationUrl, "Google sign-in link");
      setCopiedFlowId(auth?.flowId ?? null);
      setError(null);
    } catch {
      setError("could not copy the sign-in link 3: use open sign-in page.");
    }
  }

  async function submitCallback() {
    const flowId = auth?.flowId;
    if (!flowId || !callbackUrl.trim() || auth.phase !== "waiting") return;
    const accepted = await runCommand("checking redirect", () =>
      completeAuth({ environmentId, input: { instanceId, flowId, callbackUrl } }),
    );
    if (accepted) {
      setCallbackDraft({ flowId: null, value: "" });
    }
  }

  async function signOut() {
    const confirmed = await ensureLocalApi().dialogs.confirm(
      `${usesBrowser ? "sign out of Google" : "disconnect"} for ${provider.displayName ?? "Antigravity"} on ${environmentLabel}? this stops its running threads. thread history is kept ^w^`,
    );
    if (confirmed) {
      await runCommand("signing out", () => logoutAuth(target));
    }
  }

  async function removeRuntime() {
    const confirmed = await ensureLocalApi().dialogs.confirm(
      `remove the downloaded Antigravity runtime from ^w^ ${environmentLabel}? Google sign-in and thread history are kept.`,
    );
    if (confirmed) {
      await runCommand("removing runtime", () => removeInstall(target));
    }
  }

  return (
    <div className="divide-y divide-border/50">
      <SettingsRow
        title="runtime"
        className="@max-lg/setup:[&>div:first-child]:flex @max-lg/setup:[&>div:first-child]:items-stretch @max-lg/setup:[&>div:first-child]:gap-3"
        description="install and manage Antigravity uwu"
        status={
          <div className="space-y-2">
            {usesCustomBinary ? (
              <p className="text-muted-foreground">
                {" "}
                uses the custom binary path below. installation keeps that path :3
              </p>
            ) : null}
            {!installed && !provider.setup?.canInstall ? (
              <p className="text-muted-foreground">
                {" "}
                automatic installation unavailable. set a binary path or use another environment 3:
              </p>
            ) : null}
          </div>
        }
        control={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-56 sm:text-right">
            <p role="status" className="min-h-4 text-muted-foreground tabular-nums">
              {installationStatusMessage}
            </p>
            <div className="h-1">
              {installation?.phase === "downloading" &&
              installation.totalBytes !== null &&
              installation.totalBytes > 0 ? (
                <progress
                  aria-label="Antigravity download"
                  className="block h-1 w-full accent-foreground"
                  value={installation.downloadedBytes}
                  max={installation.totalBytes}
                />
              ) : null}
            </div>
            {!installActive &&
            installation?.message &&
            installation.message !== installationStatusMessage ? (
              <p className="text-muted-foreground [overflow-wrap:anywhere]">
                {installation.message}
              </p>
            ) : null}
            <div className="grid min-h-7 grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
              <div className="col-start-2 row-start-1 grid">
                {installActive && installation.operationId ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionsDisabled}
                    onClick={() => {
                      const operationId = installation.operationId;
                      if (!operationId) return;
                      void runCommand("cancelling installation", () =>
                        cancelInstall({ environmentId, input: { instanceId, operationId } }),
                      );
                    }}
                  >
                    cancel installation
                  </Button>
                ) : !installActive && provider.setup?.canInstall ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionsDisabled || installation === null || authActive}
                    onClick={() =>
                      void runCommand("starting installation", () => startInstall(target))
                    }
                  >
                    {installation?.installedVersion
                      ? installation.version &&
                        installation.version !== installation.installedVersion
                        ? "update Antigravity"
                        : "reinstall Antigravity"
                      : installation?.phase === "failed" || installation?.phase === "cancelled"
                        ? "retry installation"
                        : installed
                          ? "install managed runtime"
                          : "install Antigravity"}
                  </Button>
                ) : null}
              </div>
              {installation?.canRemove && !installActive ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="col-start-1 row-start-1"
                        aria-label="remove downloaded runtime"
                        disabled={actionsDisabled || authActive}
                        onClick={() => void removeRuntime()}
                      />
                    }
                  >
                    <Trash2Icon className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipPopup>remove downloaded runtime</TooltipPopup>
                </Tooltip>
              ) : null}
            </div>
          </div>
        }
      />

      <SettingsRow
        title={methodLabel}
        className="@max-lg/setup:[&>div:first-child]:flex @max-lg/setup:[&>div:first-child]:items-stretch @max-lg/setup:[&>div:first-child]:gap-3"
        description={
          usesBrowser ? "connect your Google account ^w^" : "connect with the credentials below ^w^"
        }
        control={
          <div className="flex min-w-0 flex-col gap-2 sm:max-w-56 sm:items-end sm:text-right xl:max-w-72">
            <p
              role="status"
              className={
                authStatusMessage === phaseLabels.idle
                  ? "sr-only"
                  : "text-muted-foreground [overflow-wrap:anywhere]"
              }
            >
              {authStatusMessage}
            </p>
            {authorizationUrl ? (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                <Button size="sm" variant="outline" onClick={() => void openSignInPage()}>
                  open sign-in page
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void copySignInLink()}>
                  {copiedFlowId === auth?.flowId ? "link copied" : "copy sign-in link"}
                </Button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {authActive && auth?.flowId ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={actionsDisabled}
                  onClick={() => {
                    const flowId = auth.flowId;
                    if (!flowId) return;
                    void runCommand("cancelling sign-in", () =>
                      cancelAuth({ environmentId, input: { instanceId, flowId } }),
                    );
                  }}
                >
                  cancel sign-in
                </Button>
              ) : !authActive && !authenticated && provider.setup?.canAuthenticate ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={actionsDisabled || !installed || auth === null || installActive}
                  onClick={() => void runCommand("starting sign-in", () => startAuth(target))}
                >
                  {usesBrowser
                    ? auth?.phase === "failed" || auth?.phase === "cancelled"
                      ? "retry Google sign-in"
                      : "sign in with Google"
                    : auth?.phase === "failed" || auth?.phase === "cancelled"
                      ? "retry connection"
                      : "connect"}
                </Button>
              ) : null}
              {!authActive && provider.setup?.canAuthenticate ? (
                <Button
                  size="sm"
                  variant={authenticated ? "outline" : "ghost"}
                  disabled={actionsDisabled || auth === null}
                  onClick={() => void signOut()}
                >
                  {usesBrowser ? "sign out of Google" : "disconnect"}
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        {authorizationUrl || auth?.phase === "waiting" ? (
          <div className="space-y-2 pb-2">
            {authorizationUrl ? (
              <>
                {auth?.expiresAt ? (
                  <p className="text-muted-foreground">
                    link expires at{" "}
                    <time dateTime={auth.expiresAt}>
                      {new Date(auth.expiresAt).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                    .
                  </p>
                ) : null}
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submitCallback();
                  }}
                >
                  <label htmlFor={`provider-callback-${instanceId}`}>
                    {" "}
                    if the final localhost page does not load, paste its full URL here :3
                  </label>
                  <Input
                    id={`provider-callback-${instanceId}`}
                    size="sm"
                    type="url"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="http://127.0.0.1:..."
                    value={callbackUrl}
                    maxLength={16_384}
                    disabled={actionsDisabled}
                    onChange={(event) =>
                      setCallbackDraft({ flowId: auth?.flowId ?? null, value: event.target.value })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    type="submit"
                    className="w-fit"
                    disabled={actionsDisabled || !callbackUrl.trim()}
                  >
                    continue
                  </Button>
                </form>
              </>
            ) : auth?.phase === "waiting" ? (
              <p className="text-muted-foreground">
                {" "}
                sign-in is open in another client. complete or cancel it there ^w^
              </p>
            ) : null}
          </div>
        ) : null}
      </SettingsRow>

      <p className="sr-only" role="status">
        {pendingLabel ? `${pendingLabel}.` : null}
      </p>
      {error || queryError ? (
        <div className="grid gap-2 px-3 py-3 sm:px-4">
          <p role="alert" className="text-destructive [overflow-wrap:anywhere]">
            {error ?? queryError}
          </p>
          {queryError ? (
            <Button
              size="sm"
              variant="outline"
              className="w-fit"
              onClick={() => {
                authQuery.refresh();
                installQuery.refresh();
              }}
            >
              retry setup status
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
