import { Tooltip, TooltipTrigger, TooltipPopup } from "../ui/tooltip";
import { AppleIcon, AndroidIcon } from "../Icons";
import { Spinner } from "../ui/spinner";
import type { EnvironmentId, SshDeviceHostConfig } from "@t3tools/contracts";
import { randomUUID } from "../../lib/utils";
import { useState } from "react";
import { useDeviceState } from "../../state/device";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { MoreVerticalIcon, PlusIcon } from "~/icons";
import { Menu, MenuTrigger, MenuPopup, MenuItem } from "../ui/menu";
import { SettingsRow } from "./settingsLayout";

import { useSettingsScope } from "./SettingsScopeContext";
import { toastManager } from "../ui/toast";
import { updateDeviceHosts } from "./deviceHostsSettings.logic";
import { DeviceHostEditor } from "./DeviceHostEditor";
import { useHostConnectionChecks } from "./useHostConnectionChecks";
import { deviceHostConnectionKey } from "./deviceHostConnectionChecks";

export function DeviceHostsSettings(props: { environmentId: EnvironmentId | null }) {
  const { scope, environments, connectedEnvironments } = useSettingsScope();
  const projectScope = scope.kind === "project" || scope.kind === "checkout";
  const update = useAtomCommand(serverEnvironment.updateSettings, { reportFailure: false });
  const [editing, setEditing] = useState<SshDeviceHostConfig | null>(null);
  const [originalHost, setOriginalHost] = useState<SshDeviceHostConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const targets = environments.map((environment) => ({
    environmentId: environment.environmentId,
    label: environment.label,
    connected: environment.connection.phase === "connected",
  }));
  const { checks, testConnection } = useHostConnectionChecks(targets);
  const save = async (host: SshDeviceHostConfig, remove = false, original = host) => {
    if (!props.environmentId || projectScope) return;
    setBusy(true);
    try {
      const results = await Promise.allSettled(
        environments.map(async (environment) => {
          if (environment.connection.phase !== "connected" || !environment.serverConfig) {
            throw new Error("Environment disconnected");
          }
          return update({
            environmentId: environment.environmentId,
            input: {
              patch: {
                deviceHosts: updateDeviceHosts(
                  environment.serverConfig.settings.deviceHosts,
                  host,
                  remove,
                  original,
                ),
              },
            },
          });
        }),
      );
      const failed = environments.filter((_, index) => {
        const result = results[index];
        return result?.status !== "fulfilled" || result.value._tag === "Failure";
      });
      if (failed.length === 0) {
        setEditing(null);
      } else {
        toastManager.add({
          type: "error",
          title: "aw, device hosts didn't save on every environment 3:",
          description: `could not update ${failed.map((environment) => environment.label).join(", ")}.`,
        });
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <SettingsRow
      id="device-hosts"
      title="device hosts"
      serverScoped
      settingKeys={["deviceHosts"]}
      description="add remote machines that have simulator or emulator runtimes, and the selected environments will connect over SSH and set up device tools for you ;3"
      control={
        <Button
          size="sm"
          variant="outline"
          disabled={projectScope || busy || !props.environmentId || editing !== null}
          onClick={() => {
            setOriginalHost(null);
            setEditing({ id: randomUUID(), label: "", target: "" });
          }}
        >
          <PlusIcon className="size-3.5" /> add host
        </Button>
      }
    >
      <div className="pt-3 pb-2">
        {!props.environmentId ? (
          <p className="text-sm text-muted-foreground">
            {" "}
            connect a selected environment and we'll manage device hosts from here ^w^
          </p>
        ) : (
          <>
            {connectedEnvironments.map((environment) => (
              <div key={environment.environmentId}>
                {connectedEnvironments.length > 1 ? (
                  <p className="pt-3 pb-1 text-xs font-medium text-muted-foreground">
                    {environment.label}
                  </p>
                ) : null}
                <DeviceHostList
                  environmentId={environment.environmentId}
                  hosts={environment.serverConfig?.settings.deviceHosts ?? []}
                  busy={projectScope || busy}
                  checks={checks}
                  testConnection={async (host) => {
                    const results = await testConnection(host);
                    if (!results) return;
                    const failed = targets.filter(
                      (target) => results[target.environmentId]?.status === "failed",
                    );
                    toastManager.add({
                      type: failed.length ? "error" : "success",
                      title: failed.length
                        ? `${host.label}: aw, ${failed.length} of ${targets.length} environments failed 3:`
                        : `${host.label}: connection checks passed, purr :3`,
                      description: failed.length
                        ? `could not connect from ${failed.map((target) => target.label).join(", ")}.`
                        : "connected, or already available locally, on each selected environment ;3",
                    });
                    return results;
                  }}
                  onEdit={(host) => {
                    setOriginalHost(host);
                    setEditing(host);
                  }}
                  onRemove={(host) => void save(host, true)}
                />
              </div>
            ))}
            {editing ? (
              <DeviceHostEditor
                key={editing.id}
                host={editing}
                isNew={originalHost === null}
                targets={targets}
                busy={busy}
                onSave={(host) => void save(host, false, originalHost ?? host)}
                onClose={() => setEditing(null)}
              />
            ) : null}
          </>
        )}
      </div>
    </SettingsRow>
  );
}

function DeviceHostList({
  environmentId,
  hosts,
  busy,
  onEdit,
  onRemove,
  checks,
  testConnection,
}: {
  environmentId: EnvironmentId;
  hosts: ReadonlyArray<SshDeviceHostConfig>;
  busy: boolean;
  onEdit: (host: SshDeviceHostConfig) => void;
  onRemove: (host: SshDeviceHostConfig) => void;
  checks: ReturnType<typeof useHostConnectionChecks>["checks"];
  testConnection: ReturnType<typeof useHostConnectionChecks>["testConnection"];
}) {
  const { state } = useDeviceState(environmentId);
  return (
    <>
      {hosts.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">no device hosts</p>
      ) : null}
      {hosts.map((host) => {
        const status = state.hostStatuses[host.id];
        const check = checks[deviceHostConnectionKey(host)]?.[environmentId];
        const platforms =
          (check?.status === "connected" ? check.platforms : undefined) ??
          state.hosts.find((value) => value.id === host.id)?.platforms ??
          [];
        const progress =
          check?.status === "pending"
            ? "checking connection…"
            : status?.status === "installing"
              ? "installing device support…"
              : status?.status === "starting"
                ? "connecting…"
                : null;
        const error =
          check?.status === "failed"
            ? check.error
            : check?.status === "local"
              ? undefined
              : status?.status === "failed"
                ? status.detail
                : undefined;
        return (
          <div key={host.id} className="flex items-center gap-2 border-t border-border/50 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-medium">{host.label}</p>
                {platforms
                  .filter((platform) => platform.available)
                  .map((platform) => (
                    <Tooltip key={platform.platform}>
                      <TooltipTrigger
                        render={
                          <span
                            tabIndex={0}
                            role="img"
                            aria-label={
                              platform.platform === "ios" ? "iOS available" : "Android available"
                            }
                            className="shrink-0 text-muted-foreground"
                          />
                        }
                      >
                        {platform.platform === "ios" ? (
                          <AppleIcon className="size-3.5" />
                        ) : (
                          <AndroidIcon className="size-3.5" />
                        )}
                      </TooltipTrigger>
                      <TooltipPopup>
                        {platform.platform === "ios" ? "iOS available" : "Android available"}
                      </TooltipPopup>
                    </Tooltip>
                  ))}
              </div>
              <p className="truncate text-xs text-muted-foreground">{host.target}</p>
              {check?.status === "local" ? (
                <p className="mt-1 text-xs text-muted-foreground">already available locally</p>
              ) : null}
              {error ? (
                <div className="mt-1" role="status">
                  <details className="text-xs text-destructive">
                    <summary>hmm, connection failed 3:</summary>
                    <p className="mt-1 whitespace-pre-wrap break-words">{error}</p>
                  </details>
                </div>
              ) : null}
            </div>
            {progress ? (
              <span
                role="status"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <Spinner className="size-3" />
                {progress}
              </span>
            ) : null}
            <Menu>
              <MenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="ghost-muted"
                    disabled={busy}
                    aria-label={host.label + " options"}
                  />
                }
              >
                <MoreVerticalIcon />
              </MenuTrigger>
              <MenuPopup align="end">
                <MenuItem
                  onClick={() => {
                    onEdit(host);
                  }}
                >
                  edit
                </MenuItem>
                <MenuItem variant="destructive" onClick={() => onRemove(host)}>
                  remove
                </MenuItem>
              </MenuPopup>
            </Menu>
            <Button
              size="sm"
              variant="outline"
              disabled={busy || progress !== null}
              onClick={() => void testConnection(host)}
            >
              test connection
            </Button>
          </div>
        );
      })}
    </>
  );
}
