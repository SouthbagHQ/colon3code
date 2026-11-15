import type { AuthConnectDevice, EnvironmentId } from "@t3tools/contracts";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import * as DateTime from "effect/DateTime";
import { useState } from "react";

import type { ServerPairingLinkRecord } from "~/environments/primary";
import { authEnvironment } from "~/state/auth";
import { useAtomCommand } from "~/state/use-atom-command";
import { Button } from "../ui/button";
import { stackedThreadToast, toastManager } from "../ui/toast";
import {
  connectDeviceName,
  describeConnectDeviceClient,
  formatAccessTimestamp,
} from "./ConnectionsSettings.logic";
import { ITEM_ROW_CLASSNAME, ITEM_ROW_INNER_CLASSNAME } from "./itemRows";
import { SettingsSection } from "./settingsLayout";

function reportFailure(title: string, result: Parameters<typeof isAtomCommandInterrupted>[0]) {
  if (result._tag !== "Failure" || isAtomCommandInterrupted(result)) return;
  const error = squashAtomCommandFailure(result);
  toastManager.add(
    stackedThreadToast({
      type: "error",
      title,
      description: error instanceof Error ? error.message : "An error occurred.",
    }),
  );
}

export function ConnectDeviceApprovalSettings({
  environmentId,
  requests,
  devices,
  canWrite,
  requestRevoke,
}: {
  readonly environmentId: EnvironmentId;
  readonly requests: ReadonlyArray<ServerPairingLinkRecord>;
  readonly devices: ReadonlyArray<AuthConnectDevice>;
  readonly canWrite: boolean;
  /** Revokes now, or first asks to turn approval on when it is off. */
  readonly requestRevoke: (title: string, revoke: () => Promise<void>) => void;
}) {
  const approve = useAtomCommand(authEnvironment.approveConnectDevice, { reportFailure: false });
  const deny = useAtomCommand(authEnvironment.revokePairingLink, { reportFailure: false });
  const revoke = useAtomCommand(authEnvironment.revokeConnectDevice, { reportFailure: false });
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<void>) => {
    setBusyId(id);
    await action();
    setBusyId(null);
  };

  return (
    <SettingsSection id="connect-devices" title="T3 Connect devices">
      {requests.map((request) => {
        const connectRequest = request.connectDeviceRequest;
        if (!connectRequest) return null;
        const busy = busyId === request.id;
        return (
          <div key={request.id} className={ITEM_ROW_CLASSNAME}>
            <div className={ITEM_ROW_INNER_CLASSNAME}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  waiting for approval ·{" "}
                  <span className="font-mono tabular-nums">{connectRequest.verificationCode}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {describeConnectDeviceClient(connectRequest)}. Approve only if the device in front
                  of you shows this code.
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  size="xs"
                  variant="destructive-outline"
                  disabled={!canWrite || busy}
                  onClick={() =>
                    void run(request.id, async () =>
                      reportFailure(
                        "aw, couldn't deny the device 3:",
                        await deny({ environmentId, input: { id: request.id } }),
                      ),
                    )
                  }
                >
                  deny
                </Button>
                <Button
                  size="xs"
                  disabled={!canWrite || busy}
                  onClick={() =>
                    void run(request.id, async () =>
                      reportFailure(
                        "aw, couldn't approve the device 3:",
                        await approve({ environmentId, input: { pairingLinkId: request.id } }),
                      ),
                    )
                  }
                >
                  {busy ? "saving…" : "approve"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      {devices.map((device) => {
        const busy = busyId === device.proofKeyThumbprint;
        return (
          <div key={device.proofKeyThumbprint} className={ITEM_ROW_CLASSNAME}>
            <div className={ITEM_ROW_INNER_CLASSNAME}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {describeConnectDeviceClient(device)}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono tabular-nums">{device.verificationCode}</span>
                  <span aria-hidden> · </span>
                  trusted since {formatAccessTimestamp(DateTime.formatIso(device.approvedAt))}
                </p>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto sm:justify-end">
                <Button
                  size="xs"
                  variant="destructive-outline"
                  disabled={!canWrite || busy}
                  onClick={() =>
                    requestRevoke(`revoke ${connectDeviceName(device)}?`, () =>
                      run(device.proofKeyThumbprint, async () =>
                        reportFailure(
                          "aw, couldn't revoke the device 3:",
                          await revoke({
                            environmentId,
                            input: { proofKeyThumbprint: device.proofKeyThumbprint },
                          }),
                        ),
                      ),
                    )
                  }
                >
                  {busy ? "revoking…" : "revoke"}
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      {devices.length === 0 && requests.length === 0 ? (
        <div className={ITEM_ROW_CLASSNAME}>
          <p className="text-xs text-muted-foreground/60">
            no device has connected through T3 Connect yet.
          </p>
        </div>
      ) : null}
    </SettingsSection>
  );
}
