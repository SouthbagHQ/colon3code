import type { DevicePlatform, DeviceServiceState, EnvironmentId } from "@t3tools/contracts";
import { CheckIcon, CircleAlertIcon } from "~/icons";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { DialogClose } from "~/components/ui/dialog";
import { WizardHeader, WizardPanel, WizardSteps, WizardFooter } from "~/components/ui/wizard";
import { Spinner } from "~/components/ui/spinner";
import { Switch } from "~/components/ui/switch";
import { deviceEnvironment } from "~/state/device";
import { useAtomCommand } from "~/state/use-atom-command";
import { cn } from "~/lib/utils";

const platformName = (platform: DevicePlatform) => (platform === "ios" ? "iOS" : "Android");

export const deviceHubDescription =
  "let this environment open simulators and emulators, whether they run here or on a remote device host ^w^";
export const agentDeviceDescription =
  "allow new agent sessions in this environment to start and control local and remote devices, with required tools set up automatically.";

export function platformSetupStatus(state: DeviceServiceState, platform: DevicePlatform) {
  const availability = state.hosts
    .flatMap((host) => host.platforms)
    .find((candidate) => candidate.platform === platform);
  if (!availability?.available) {
    return {
      ready: false,
      message: availability?.reason ?? `${platformName(platform)} support was not detected.`,
    };
  }
  if (
    state.hostStatus === "ready" &&
    !state.devices.some((device) => device.platform === platform)
  ) {
    return {
      ready: false,
      message:
        platform === "ios"
          ? "Xcode is installed, but no iOS Simulator is available. Install a runtime in Xcode Settings → Components."
          : "the Android SDK is installed, but there's no virtual device yet. create one in Android Studio → Device Manager :3",
    };
  }
  return {
    ready: true,
    message:
      platform === "ios"
        ? "Xcode and iOS Simulator are available."
        : "the Android SDK and Emulator are ready to go :3",
  };
}

export function DeviceSetup(props: {
  readonly environmentId: EnvironmentId;
  readonly state: DeviceServiceState;
  readonly onComplete?: () => void;
}) {
  const configure = useAtomCommand(deviceEnvironment.configure);
  const list = useAtomCommand(deviceEnvironment.list, { reportFailure: false });
  const [pending, setPending] = useState<"hub" | "check" | "agent" | "complete" | null>(null);
  const [step, setStep] = useState(0);
  const enabled = props.state.hostStatus !== "disabled";
  const busy = props.state.hostStatus === "installing" || props.state.hostStatus === "starting";

  const update = async (
    kind: NonNullable<typeof pending>,
    input: { enabled?: boolean; agentAccessEnabled?: boolean; onboardingCompleted?: boolean },
  ) => {
    setPending(kind);
    try {
      const result = await configure({ environmentId: props.environmentId, input });
      if (kind === "complete" && result._tag === "Success") props.onComplete?.();
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <WizardHeader
        title="set up devices :3"
        description="a quick peek at what runs on this environment before we use simulators and emulators :3"
      >
        <WizardSteps
          steps={["device hub", "simulators", "agent access"]}
          currentStep={step}
          onStepChange={setStep}
          isStepDisabled={(requested) => busy || pending !== null || requested > step}
        />
      </WizardHeader>

      <WizardPanel>
        {step === 0 ? (
          <section className="space-y-3 text-sm">
            <h3 className="font-medium">enable the device hub</h3>
            <div className="flex items-start justify-between gap-4">
              <p className="text-muted-foreground">{deviceHubDescription}</p>
              <Switch
                checked={enabled}
                disabled={busy || pending !== null}
                aria-label="enable device hub"
                onCheckedChange={(checked) =>
                  void update("hub", {
                    enabled: Boolean(checked),
                    ...(checked ? {} : { agentAccessEnabled: false }),
                  })
                }
              />
            </div>
            <DeviceHubSetupStatus
              state={props.state}
              pending={pending === "hub" || (busy && pending !== "agent")}
            />
          </section>
        ) : null}

        {step === 1 ? (
          <section className="space-y-3 text-sm">
            <h3 className="font-medium">check simulator support</h3>
            <DevicePlatformSetup
              state={props.state}
              checking={pending === "check"}
              disabled={!enabled || busy || pending !== null}
              onCheck={() => {
                setPending("check");
                void list({ environmentId: props.environmentId, input: {} }).finally(() =>
                  setPending(null),
                );
              }}
            />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="space-y-3 text-sm">
            <h3 className="font-medium">allow agent control</h3>
            <div className="flex items-start justify-between gap-4">
              <p className="text-muted-foreground">{agentDeviceDescription}</p>
              <Switch
                checked={props.state.agentAccessEnabled}
                disabled={!enabled || busy || pending !== null}
                aria-label="allow agents to control devices"
                onCheckedChange={(checked) =>
                  void update("agent", { agentAccessEnabled: Boolean(checked) })
                }
              />
            </div>
            <AgentDeviceSetupStatus state={props.state} pending={pending === "agent"} />
            <p className="text-xs text-muted-foreground">
              {" "}
              leave this off and you keep manual device controls, without agents getting access :3
            </p>
          </section>
        ) : null}
        {props.state.hostStatus === "failed" && props.state.hostStatusDetail ? (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {props.state.hostStatusDetail}
          </p>
        ) : null}
      </WizardPanel>

      <WizardFooter>
        {step === 0 ? (
          <DialogClose render={<Button variant="outline" />}>cancel</DialogClose>
        ) : (
          <Button
            variant="outline"
            disabled={busy || pending !== null}
            onClick={() => setStep(step - 1)}
          >
            back
          </Button>
        )}
        {step < 2 ? (
          <Button
            disabled={props.state.hostStatus !== "ready" || pending !== null}
            onClick={() => setStep(step + 1)}
          >
            continue
          </Button>
        ) : (
          <Button
            disabled={props.state.hostStatus !== "ready" || pending !== null}
            onClick={() => void update("complete", { onboardingCompleted: true })}
          >
            {pending === "complete" ? "saving…" : "done"}
          </Button>
        )}
      </WizardFooter>
    </>
  );
}

export function DeviceHubSetupStatus({
  state,
  pending,
  compact = false,
}: {
  readonly state: DeviceServiceState;
  readonly pending: boolean;
  readonly compact?: boolean;
}) {
  if (!pending && state.hostStatus !== "ready") return null;
  return (
    <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
      {pending ? <Spinner className="size-3" /> : <CheckIcon className="size-3 text-success" />}
      {pending
        ? state.hostStatus === "installing"
          ? compact
            ? "installing…"
            : "installing device hub…"
          : state.hostStatus === "starting"
            ? compact
              ? "starting…"
              : "starting device hub…"
            : compact
              ? "updating…"
              : "updating device hub…"
        : "device hub is ready, purr :3"}
    </p>
  );
}

function DevicePlatformSetup(props: {
  readonly state: DeviceServiceState;
  readonly checking: boolean;
  readonly disabled: boolean;
  readonly onCheck: () => void;
}) {
  return (
    <div className="space-y-3">
      <PlatformStatus platform="iOS" status={platformSetupStatus(props.state, "ios")} />
      <PlatformStatus platform="Android" status={platformSetupStatus(props.state, "android")} />
      <p className="text-xs text-muted-foreground">
        {" "}
        you can use either platform — a missing one doesn’t block the other 3:
      </p>
      <Button size="compact" variant="outline" disabled={props.disabled} onClick={props.onCheck}>
        {props.checking ? <Spinner className="size-3" /> : null}
        {props.checking ? "checking…" : "check again"}
      </Button>
    </div>
  );
}

export function AgentDeviceSetupStatus(props: {
  readonly state: DeviceServiceState;
  readonly pending: boolean;
  readonly compact?: boolean;
}) {
  if (props.pending) {
    const label =
      props.state.hostStatus === "installing"
        ? props.compact
          ? "installing…"
          : "installing agent tools…"
        : props.state.hostStatus === "starting"
          ? props.compact
            ? "starting…"
            : "starting agent tools…"
          : props.compact
            ? "updating…"
            : "updating agent access…";
    return (
      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <Spinner className="size-3" />
        {label}
      </p>
    );
  }
  if (
    props.state.agentAccessEnabled &&
    props.state.hostStatus === "ready" &&
    props.state.hosts.some((host) => host.agentDeviceInstalled)
  ) {
    return (
      <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
        <CheckIcon className="size-3 text-success" /> agent tools are ready to go :3
      </p>
    );
  }
  return null;
}

export function PlatformStatus(props: {
  readonly platform: string;
  readonly status: { readonly ready: boolean; readonly message: string };
  readonly compact?: boolean;
}) {
  const Icon = props.status.ready ? CheckIcon : CircleAlertIcon;
  return (
    <div
      className={cn("flex gap-2", !props.compact && "rounded-md border border-border/60 px-3 py-2")}
    >
      <Icon
        className={cn(
          "mt-0.5 size-4 shrink-0",
          props.status.ready ? "text-success" : "text-muted-foreground",
        )}
      />
      <div className={cn(props.compact && props.status.ready && "flex items-center gap-2")}>
        <p className="font-medium">{props.platform}</p>
        <p className="text-xs text-muted-foreground">
          {props.compact && props.status.ready ? "ready" : props.status.message}
        </p>
      </div>
    </div>
  );
}
