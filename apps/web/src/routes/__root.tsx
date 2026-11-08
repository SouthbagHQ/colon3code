import { type ServerLifecycleWelcomePayload } from "@t3tools/contracts";
import {
  scopedProjectKey,
  scopedThreadKey,
  scopeProjectRef,
} from "@t3tools/client-runtime/environment";
import {
  Outlet,
  Link,
  redirect,
  createRootRoute,
  type ErrorComponentProps,
  useLocation,
  useNavigate,
  useParams,
  useRouter,
} from "@tanstack/react-router";
import { Check, Copy } from "lucide";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { APP_BASE_NAME, APP_DISPLAY_NAME, APP_STAGE_LABEL, APP_VERSION } from "../branding";
import { resolveServerBackedAppDisplayName } from "../branding.logic";
import { AppSidebarLayout } from "../components/AppSidebarLayout";
import { CatFace } from "../components/CatFace";
import { CommandPalette } from "../components/CommandPalette";
import { CustomSnoozeDialogHost } from "../components/CustomSnoozeDialog";
import { GuestShareDialogHost } from "../components/chat/GuestShareControls";
import { AddProjectToMachineDialogHost } from "../components/AddProjectToMachineDialog";
import { ConfirmDialogHost } from "../components/ConfirmDialogHost";
import { DevReplayHost } from "../components/DevReplayHost";
import { FirstRunGate } from "../components/onboarding/FirstRunGate";
import { ConnectOnboardingDialog } from "../components/cloud/ConnectOnboardingDialog";
import { RelayClientInstallDialog } from "../components/cloud/RelayClientInstallDialog";
import { SshPasswordPromptDialog } from "../components/desktop/SshPasswordPromptDialog";
import { SnapShotCoordinator } from "../components/desktop/SnapShotCoordinator";
import { DesktopAppActivationCoordinator } from "../components/desktop/DesktopAppActivationCoordinator";
import { DesktopWebLinkCoordinator } from "../components/desktop/DesktopWebLinkCoordinator";
import { RunningThreadKeepAlive } from "../components/desktop/RunningThreadKeepAlive";
import { ReopenClosedViewShortcut } from "../components/ReopenClosedViewShortcut";
import { resolveSidebarThreadStatus } from "../components/Sidebar.logic";
import { ProjectCloneToastCoordinator } from "../components/ProjectCloneToastCoordinator";
import { ChatGptWelcomeCoordinator } from "../components/settings/ChatGptWelcomeCoordinator";
import { ThemeEditorHost } from "../components/settings/ThemeEditorHost";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { Button } from "../components/ui/button";
import { MorphIcon } from "~/components/MorphIcon";
import { StandalonePage, StandalonePageHeader } from "../components/ui/standalone-page";
import { AnchoredToastProvider, ToastProvider } from "../components/ui/toast";
import { resolveDocumentTitle } from "../documentTitle";
import { isElectron } from "../env";
import { cn } from "../lib/utils";
import { useClientSettings } from "../hooks/useSettings";
import {
  deriveLogicalProjectKeyFromSettings,
  derivePhysicalProjectKeyFromPath,
  selectProjectGroupingSettings,
} from "@t3tools/client-runtime/state/project-grouping";
import { resolveThreadRouteRef } from "../threadRoutes";
import { useUiStateStore } from "../uiStateStore";
import { configureClientTracing } from "../observability/clientTracing";
import { resolveInitialServerAuthGateState } from "../environments/primary";
import { GUEST_PAGE_PATH } from "../guestPage";
import { hasHostedPairingRequest, isHostedStaticApp } from "../hostedPairing";
import { useHostedPromptLinkLanding } from "../components/promptLinks/HostedPromptLinkLanding";
import { isLocalEnvironmentDisabled } from "../localEnvironment";
import { useAtomValue } from "@effect/atom-react";
import { primaryServerConfigAtom, primaryServerWelcomeAtom } from "../state/server";
import { readProject, useThreadShell } from "../state/entities";

import { getDesktopSnapShotBridge } from "../lib/desktopSnapShot";
import { shouldResumeSnapShotSetupOnStartup } from "../lib/snapShotSetupResume";

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    // Guest links open on the owner's tunnel host in a browser with no T3 session, and must
    // not trigger pairing or an environment connection.
    if (location.pathname === GUEST_PAGE_PATH) {
      return {
        authGateState: {
          status: "guest",
        } as const,
      };
    }

    if (location.pathname === "/pair" && hasHostedPairingRequest(new URL(window.location.href))) {
      return {
        authGateState: {
          status: "hosted-pairing",
        } as const,
      };
    }

    if (isLocalEnvironmentDisabled() || isHostedStaticApp(new URL(window.location.href))) {
      return {
        authGateState: {
          status: "hosted-static",
        } as const,
      };
    }

    const authGateState = await resolveInitialServerAuthGateState();
    if (authGateState.status === "authenticated") {
      // Idempotent, so every navigation can ask for it.
      void configureClientTracing();
    }
    if (
      authGateState.status === "authenticated" &&
      getDesktopSnapShotBridge() &&
      shouldResumeSnapShotSetupOnStartup() &&
      location.pathname !== "/settings/snap-shot"
    ) {
      throw redirect({ to: "/settings/snap-shot", replace: true });
    }
    return {
      authGateState,
    };
  },
  component: RootRouteView,
  errorComponent: RootRouteErrorView,
  notFoundComponent: RootRouteNotFoundView,
  head: () => ({
    meta: [{ name: "title", content: APP_DISPLAY_NAME }],
  }),
});

function RootRouteNotFoundView() {
  return (
    <main className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <CatFace expression="sad" className="size-14 text-accent/35" aria-hidden />
        <h1 className="text-lg font-medium text-foreground">hmm, page not found 3:</h1>
        <p className="text-sm text-muted-foreground">
          this link doesn’t point to a page in {APP_DISPLAY_NAME}. let’s head home and pick a
          project or start a thread ^w^
        </p>
        <Button render={<Link to="/" replace />}>go home</Button>
      </div>
    </main>
  );
}

function RootRouteView() {
  // Above every branch: app services raise toasts for the whole page, so the surface they write to
  // must not unmount when the root switches branches (for example /welcome to the app shell).
  return (
    <ToastProvider>
      <AnchoredToastProvider>
        <DocumentTitleSync />
        <RootRouteBranch />
      </AnchoredToastProvider>
    </ToastProvider>
  );
}

function RootRouteBranch() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const { authGateState } = Route.useRouteContext();
  const primaryEnvironmentAuthenticated = authGateState.status === "authenticated";
  // A sync IPC read; the setting only changes across a relaunch.
  const [localEnvironmentDisabled] = useState(isLocalEnvironmentDisabled);
  // Once true, stays true: a visit to /welcome means the bootstrap already chose a route.
  const [returningFromWelcome, setReturningFromWelcome] = useState(pathname === "/welcome");
  if (pathname === "/welcome" && !returningFromWelcome) setReturningFromWelcome(true);
  const hostedPromptLinkLanding = useHostedPromptLinkLanding(
    authGateState.status === "hosted-static",
  );

  if (pathname === GUEST_PAGE_PATH) return <Outlet />;

  if (pathname === "/pair" || pathname === "/connect" || pathname === "/connect-agent") {
    return <Outlet />;
  }

  // Handle links before onboarding redirects lose them.
  if (hostedPromptLinkLanding !== null) {
    return hostedPromptLinkLanding;
  }

  if (pathname === "/welcome") {
    return (
      <>
        <CustomSnoozeDialogHost />
        <GuestShareDialogHost />
        <CommandPalette>
          <AppSidebarLayout>
            <Outlet />
          </AppSidebarLayout>
        </CommandPalette>
      </>
    );
  }

  if (authGateState.status !== "authenticated" && authGateState.status !== "hosted-static") {
    return <Outlet />;
  }

  const appShell = (
    <CommandPalette>
      <AppSidebarLayout>
        <Outlet />
      </AppSidebarLayout>
    </CommandPalette>
  );

  return (
    <>
      <ChatGptWelcomeCoordinator />
      <FirstRunGate
        enabled={primaryEnvironmentAuthenticated}
        hostedStatic={authGateState.status === "hosted-static"}
      >
        {primaryEnvironmentAuthenticated ? <DesktopAppActivationCoordinator /> : null}
        {primaryEnvironmentAuthenticated || localEnvironmentDisabled ? (
          <DesktopWebLinkCoordinator />
        ) : null}
        {isElectron ? <RunningThreadKeepAlive /> : null}
        <RelayClientInstallDialog />
        <ConnectOnboardingDialog />
        <SshPasswordPromptDialog />
        <SnapShotCoordinator />
        <ReopenClosedViewShortcut />
        <ConfirmDialogHost />
        <CustomSnoozeDialogHost />
        <GuestShareDialogHost />
        <ProjectCloneToastCoordinator />
        <AddProjectToMachineDialogHost />
        {import.meta.env.DEV && primaryEnvironmentAuthenticated ? <DevReplayHost /> : null}
        {primaryEnvironmentAuthenticated ? (
          <EventRouter skipInitialBootstrapNavigation={returningFromWelcome} />
        ) : null}
        {appShell}
        {/* Keep the theme editor above the router so drafts survive navigation. */}
        <ThemeEditorHost />
      </FirstRunGate>
    </>
  );
}

function DocumentTitleSync() {
  const primaryServerVersion =
    useAtomValue(primaryServerConfigAtom)?.environment.serverVersion ?? null;
  const appName = resolveServerBackedAppDisplayName({
    baseName: APP_BASE_NAME,
    fallbackDisplayName: APP_DISPLAY_NAME,
    fallbackStageLabel: APP_STAGE_LABEL,
    primaryServerVersion,
  });
  const threadRef = useParams({ strict: false, select: resolveThreadRouteRef });
  const threadKey = threadRef === null ? null : scopedThreadKey(threadRef);
  const thread = useThreadShell(threadRef);
  let status = thread === null ? null : resolveSidebarThreadStatus(thread);
  if (status === "ready" && thread?.latestRun?.status === "failed") status = "failed";
  const turnState = thread?.latestRun?.status ?? null;
  // "done" only after this tab watched the turn run and the user was away
  // when it finished, so a thread opened while already idle stays plain and
  // a completion you saw land is not announced. Held in a ref: the title is
  // written imperatively, and clearing it on focus should not re-render.
  const watched = useRef<{ threadKey: string; done: boolean } | null>(null);
  // The guest page names its own tab after the shared view.
  const onGuestPage = useLocation({ select: (location) => location.pathname === GUEST_PAGE_PATH });

  // oxlint-disable-next-line colon3code/no-unreasoned-state-sync -- writes the tab title (outside React) from the active thread's status
  useEffect(() => {
    if (onGuestPage) return;
    if (watched.current?.threadKey !== threadKey) watched.current = null;
    if (status === "working" && threadKey !== null) {
      watched.current = { threadKey, done: false };
    } else if (status === "ready" && turnState === "completed" && watched.current) {
      const away = document.visibilityState !== "visible" || !document.hasFocus();
      watched.current = { ...watched.current, done: away };
    }
    document.title = resolveDocumentTitle({
      appName,
      status,
      recentlyCompleted: watched.current?.done ?? false,
    });
  }, [appName, onGuestPage, status, threadKey, turnState]);

  const clearRecentlyCompleted = useEffectEvent(() => {
    if (onGuestPage || !watched.current?.done || document.visibilityState !== "visible") return;
    watched.current = null;
    document.title = resolveDocumentTitle({ appName, status, recentlyCompleted: false });
  });

  // oxlint-disable-next-line colon3code/no-unreasoned-state-sync -- window focus/visibility listeners that clear the "done" tab title
  useEffect(() => {
    const onReturn = () => clearRecentlyCompleted();
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onReturn);
    return () => {
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onReturn);
    };
  }, []);

  return null;
}

function RootRouteErrorView({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message = errorMessage(error);
  // Router pathname rather than window.location: desktop uses hash history, where the window path is always "/".
  const pathname = useLocation({ select: (location) => location.pathname });
  const report = errorReport(error, pathname);

  return (
    <StandalonePage>
      <StandalonePageHeader title="oops, something went wrong 3:" description={message} />

      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void router.invalidate()}>
          try again
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
          reload app
        </Button>
        <CopyErrorButton report={report} />
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-border/70 bg-background/55">
        <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground">error report</p>
        <pre className="max-h-64 overflow-auto border-t border-border/70 bg-background/80 px-3 py-2 text-xs whitespace-pre-wrap text-foreground/85">
          {report}
        </pre>
      </div>
    </StandalonePage>
  );
}

function CopyErrorButton({ report }: { report: string }) {
  const { copyToClipboard, isCopied } = useCopyToClipboard({ target: "error-report" });

  return (
    <Button size="sm" variant="outline" onClick={() => copyToClipboard(report)}>
      <MorphIcon className={cn(isCopied && "text-success")} icon={isCopied ? Check : Copy} />
      {isCopied ? "copied" : "copy error"}
    </Button>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return "an unexpected router error occurred.";
}

function errorDetails(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return "no additional error details are available.";
  }
}

const MAX_ERROR_CAUSE_DEPTH = 5;

// Use only pathname to keep query tokens off the clipboard.
function errorReport(error: unknown, pathname: string): string {
  const lines = [
    `${APP_DISPLAY_NAME} ${APP_VERSION}`,
    `Path: ${pathname}`,
    `Time: ${new Date().toISOString()}`,
    "",
    errorDetails(error),
  ];
  let cause = error instanceof Error ? error.cause : undefined;
  for (let depth = 0; cause !== undefined && depth < MAX_ERROR_CAUSE_DEPTH; depth += 1) {
    lines.push("", "Caused by:", errorDetails(cause));
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  return lines.join("\n");
}

function EventRouter({
  skipInitialBootstrapNavigation,
}: {
  readonly skipInitialBootstrapNavigation: boolean;
}) {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (loc) => loc.pathname });
  const projectGroupingSettings = useClientSettings(selectProjectGroupingSettings);
  const serverConfig = useAtomValue(primaryServerConfigAtom);
  const serverWelcome = useAtomValue(primaryServerWelcomeAtom);
  const readPathname = useEffectEvent(() => pathname);
  const handledBootstrapThreadIdRef = useRef<string | null>(null);
  const skipInitialBootstrapNavigationRef = useRef(skipInitialBootstrapNavigation);

  const handleWelcome = useEffectEvent((payload: ServerLifecycleWelcomePayload | null) => {
    if (!payload) return;

    void (async () => {
      if (!payload.bootstrapProjectId || !payload.bootstrapThreadId) {
        return;
      }
      const bootstrapProject = readProject(
        scopeProjectRef(payload.environment.environmentId, payload.bootstrapProjectId),
      );
      const bootstrapProjectKey =
        (bootstrapProject
          ? deriveLogicalProjectKeyFromSettings(bootstrapProject, projectGroupingSettings)
          : null) ??
        (serverConfig?.cwd
          ? derivePhysicalProjectKeyFromPath(payload.environment.environmentId, serverConfig.cwd)
          : null) ??
        scopedProjectKey(
          scopeProjectRef(payload.environment.environmentId, payload.bootstrapProjectId),
        );
      useUiStateStore.getState().setProjectExpanded(bootstrapProjectKey, true);

      if (readPathname() !== "/") {
        return;
      }
      if (skipInitialBootstrapNavigationRef.current) {
        skipInitialBootstrapNavigationRef.current = false;
        handledBootstrapThreadIdRef.current = payload.bootstrapThreadId;
        return;
      }
      if (handledBootstrapThreadIdRef.current === payload.bootstrapThreadId) {
        return;
      }
      await navigate({
        to: "/$environmentId/$threadId",
        params: {
          environmentId: payload.environment.environmentId,
          threadId: payload.bootstrapThreadId,
        },
        replace: true,
      });
      handledBootstrapThreadIdRef.current = payload.bootstrapThreadId;
    })().catch(() => undefined);
  });

  // oxlint-disable-next-line colon3code/no-unreasoned-state-sync -- expands the bootstrap project in the UI store and navigates the router on a server welcome
  useEffect(() => {
    handleWelcome(serverWelcome);
  }, [serverWelcome]);

  return null;
}
