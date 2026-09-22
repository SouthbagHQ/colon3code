/**
 * Cursor Cloud settings on mobile: one row per connected environment, each
 * holding the API key that environment uses to mirror the account's cloud
 * agents into its threads.
 *
 * The key lives on the environment, not on the phone, so this screen only
 * ever sends a new one and reads back whether the last sweep worked.
 *
 * @module CursorCloudSettingsSection
 */
import { useAtomValue } from "@effect/atom-react";
import type { CursorCloudStatus, EnvironmentId } from "@t3tools/contracts";
import * as Option from "effect/Option";
import { AsyncResult } from "effect/unstable/reactivity";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { AppText as Text, AppTextInput as TextInput } from "../../components/AppText";
import { SymbolView } from "../../components/AppSymbol";
import { cursorCloudStatus, cursorCloudSync } from "../../state/cursor-cloud";
import { useEnvironments } from "../../state/environments";
import { serverEnvironment } from "../../state/server";
import { useAtomCommand } from "../../state/use-atom-command";
import { SettingsSection } from "./components/SettingsSection";

function statusSubtitle(status: CursorCloudStatus | null, keyConfigured: boolean): string {
  if (!keyConfigured) return "paste an API key to mirror your cloud agents";
  if (status === null) return "checking in with cursor…";
  switch (status.state) {
    case "unconfigured":
      return "mirroring is off";
    case "error":
      return status.lastError ?? "cursor could not be reached";
    case "connected":
      return status.unmatchedAgentCount > 0
        ? `${status.mirroredAgentCount} mirrored · ${status.unmatchedAgentCount} waiting on a local repo`
        : `${status.mirroredAgentCount} mirrored`;
  }
}

function CursorCloudEnvironmentRow({
  environmentId,
  label,
  keyConfigured,
}: {
  readonly environmentId: EnvironmentId;
  readonly label: string;
  readonly keyConfigured: boolean;
}) {
  const updateSettings = useAtomCommand(serverEnvironment.updateSettings, {
    label: "server settings update",
    reportFailure: true,
  });
  const syncNow = useAtomCommand(cursorCloudSync, { reportFailure: false });
  const statusResult = useAtomValue(cursorCloudStatus({ environmentId, input: {} }));
  const status = Option.getOrNull(AsyncResult.value(statusResult));
  const [draftKey, setDraftKey] = useState("");

  const commit = () => {
    const apiKey = draftKey.trim();
    setDraftKey("");
    if (apiKey.length === 0) return;
    void updateSettings({
      environmentId,
      input: { patch: { cursorCloud: { apiKey, enabled: true } } },
    });
    void syncNow({ environmentId, input: {} });
  };

  return (
    <View className="gap-3 border-t border-border-subtle p-4">
      <View className="flex-row items-center gap-4">
        <SymbolView name="cloud" size={22} tintColorClassName="accent-icon" type="monochrome" />
        <View className="min-w-0 flex-1">
          <Text className="text-lg text-foreground">{label}</Text>
          <Text className="text-sm text-foreground-muted">
            {statusSubtitle(status, keyConfigured)}
          </Text>
        </View>
        {keyConfigured ? (
          <Pressable
            accessibilityLabel={`forget cursor cloud key for ${label}`}
            accessibilityRole="button"
            onPress={() =>
              void updateSettings({
                environmentId,
                input: { patch: { cursorCloud: { apiKey: "" } } },
              })
            }
          >
            <Text className="text-base text-foreground-muted">forget</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        className="min-h-10 rounded-xl px-3 py-2 text-base"
        accessibilityLabel={`cursor cloud API key for ${label}`}
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        returnKeyType="done"
        placeholder={keyConfigured ? "••••••  replace key" : "key_..."}
        value={draftKey}
        onChangeText={setDraftKey}
        onBlur={commit}
        onSubmitEditing={commit}
      />
    </View>
  );
}

export function CursorCloudSettingsSection() {
  const { environments } = useEnvironments();
  const targets = environments.filter((environment) => environment.serverConfig !== null);
  if (targets.length === 0) return null;

  return (
    <SettingsSection title="cursor cloud">
      {targets.map((environment) => (
        <CursorCloudEnvironmentRow
          key={environment.environmentId}
          environmentId={environment.environmentId}
          label={environment.label}
          keyConfigured={(environment.serverConfig?.settings.cursorCloud.apiKey.length ?? 0) > 0}
        />
      ))}
    </SettingsSection>
  );
}
