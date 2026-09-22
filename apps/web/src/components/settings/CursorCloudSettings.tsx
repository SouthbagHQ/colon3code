/**
 * Cursor Cloud section of provider settings: paste an API key, see whether
 * the environment can reach Cursor, and sweep on demand.
 *
 * Mirroring is read-only, so there is nothing here to configure per agent —
 * the interesting state is whether the key works and how many of the
 * account's agents found a project on this environment to live under.
 *
 * @module CursorCloudSettings
 */
import { useAtomValue } from "@effect/atom-react";
import type { CursorCloudStatus, EnvironmentId, UnifiedSettings } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { useState } from "react";

import { useUpdateEnvironmentSettings } from "../../hooks/useSettings";
import { cursorCloudStatus, cursorCloudSync } from "../../state/cursorCloud";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { searchableSetting } from "./settingsSearch";
import { SettingsRow, SettingsSection } from "./settingsLayout";

/** What the server sends back in place of a stored key. */
const REDACTED_KEY = "••••••";

function statusDescription(status: CursorCloudStatus | null, keyConfigured: boolean): string {
  if (!keyConfigured) {
    return "no key yet — cloud agents stay in Cursor until this environment can see them :3";
  }
  if (status === null) return "checking in with cursor…";
  switch (status.state) {
    case "unconfigured":
      return "mirroring is off for this environment";
    case "error":
      return status.lastError ?? "cursor could not be reached";
    case "connected": {
      const account = status.accountLabel ? `${status.accountLabel} · ` : "";
      const unmatched =
        status.unmatchedAgentCount > 0
          ? ` · ${status.unmatchedAgentCount} waiting on a local checkout of their repo`
          : "";
      return `${account}${status.mirroredAgentCount} agent${
        status.mirroredAgentCount === 1 ? "" : "s"
      } mirrored${unmatched}`;
    }
  }
}

export function CursorCloudSettings({
  environmentId,
  cursorCloud,
  readOnly,
}: {
  readonly environmentId: EnvironmentId;
  readonly cursorCloud: UnifiedSettings["cursorCloud"];
  readonly readOnly: boolean;
}) {
  const updateSettings = useUpdateEnvironmentSettings(environmentId);
  const syncNow = useAtomCommand(cursorCloudSync, { reportFailure: false });
  const statusResult = useAtomValue(cursorCloudStatus({ environmentId, input: {} }));
  const status = Option.getOrNull(AsyncResult.value(statusResult));
  const [draftKey, setDraftKey] = useState("");

  const keyConfigured = cursorCloud.apiKey.length > 0;
  const trimmedDraft = draftKey.trim();

  const saveKey = () => {
    if (trimmedDraft.length === 0) return;
    updateSettings({ cursorCloud: { apiKey: trimmedDraft, enabled: true } });
    setDraftKey("");
    void syncNow({ environmentId, input: {} });
  };

  return (
    <SettingsSection {...searchableSetting("cursor-cloud")}>
      <SettingsRow
        title="mirror cloud agents"
        description={statusDescription(status, keyConfigured)}
        control={
          <Switch
            checked={keyConfigured && cursorCloud.enabled}
            disabled={readOnly || !keyConfigured}
            onCheckedChange={(enabled) => updateSettings({ cursorCloud: { enabled } })}
          />
        }
      />
      <SettingsRow
        title={keyConfigured ? "replace API key" : "API key"}
        description="grab one from the cursor dashboard. it never leaves this server :3"
      >
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveKey();
          }}
        >
          <div className="grid flex-1 gap-1.5">
            <Label className="sr-only" htmlFor="cursor-cloud-api-key">
              cursor API key
            </Label>
            <Input
              id="cursor-cloud-api-key"
              type="password"
              autoComplete="off"
              disabled={readOnly}
              placeholder={keyConfigured ? REDACTED_KEY : "key_..."}
              value={draftKey}
              onChange={(event) => setDraftKey(event.target.value)}
            />
          </div>
          <Button size="xs" type="submit" disabled={readOnly || trimmedDraft.length === 0}>
            save
          </Button>
          {keyConfigured ? (
            <Button
              size="xs"
              variant="outline"
              type="button"
              disabled={readOnly}
              onClick={() => {
                setDraftKey("");
                updateSettings({ cursorCloud: { apiKey: "" } });
              }}
            >
              forget
            </Button>
          ) : null}
        </form>
      </SettingsRow>
      {keyConfigured ? (
        <SettingsRow
          title="sync now"
          description="cloud agents refresh every minute on their own"
          control={
            <Button
              size="xs"
              variant="outline"
              disabled={readOnly}
              onClick={() => void syncNow({ environmentId, input: {} })}
            >
              sync
            </Button>
          }
        />
      ) : null}
    </SettingsSection>
  );
}
