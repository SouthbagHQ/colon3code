import {
  DEFAULT_SERVER_SETTINGS,
  type ModelSelection,
  type ProviderInstanceId,
  type WorktreeSubmodules,
} from "@t3tools/contracts";
import { createModelSelection } from "@t3tools/shared/model";
import { resolveProjectSettings } from "@t3tools/shared/projectSettings";
import { useNavigate } from "@tanstack/react-router";

import { getCustomModelOptionsByInstance } from "../../modelSelection";
import {
  applyProviderInstanceSettings,
  deriveProviderInstanceEntries,
  resolveDefaultProviderModelSelection,
  sortProviderInstanceEntries,
} from "../../providerInstances";
import { useEnvironments } from "../../state/environments";
import { EMPTY_SERVER_PROVIDERS } from "../../state/server";
import { resolveEnvModeLabel, WORKTREE_SUBMODULES_LABELS } from "../BranchToolbar.logic";
import { ProviderModelPicker } from "../chat/ProviderModelPicker";
import { runtimeModeConfig, runtimeModeOptions } from "../chat/runtimeModeConfig";
import { PULL_REQUEST_MERGE_METHOD_LABELS } from "../pullRequest/pullRequestDetail.logic";
import { TraitsPicker } from "../chat/TraitsPicker";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";
import { toastManager } from "../ui/toast";
import { Switch } from "../ui/switch";
import type { ProjectSettingsCategory } from "./ProjectSettingsPanel";
import { searchableSetting } from "./settingsSearch";
import { useSettingsScope } from "./SettingsScopeContext";
import {
  SETTINGS_PICKER_TRIGGER_CLASSNAME,
  SettingResetButton,
  SettingsRow,
  SettingsSection,
} from "./settingsLayout";
import {
  useScopedSettings,
  useScopedSettingsMixed,
  useScopedSettingSource,
  useUpdateScopedSettings,
} from "./useScopedSettings";

/**
 * Rows for the settings a project may override. The same rows edit
 * environment defaults at an environment scope and project overrides at a
 * project or checkout scope; the scoped hooks route the write.
 */
const WORKTREE_SUBMODULES_OPTIONS = ["recursive", "top-level", "none"] as const;
function isWorktreeSubmodules(value: string | null): value is WorktreeSubmodules {
  return value !== null && (WORKTREE_SUBMODULES_OPTIONS as readonly string[]).includes(value);
}

export function ProjectDefaultsSettings({ category }: { category: ProjectSettingsCategory }) {
  const { scope, target, targets, connectedEnvironments } = useSettingsScope();
  const settings = useScopedSettings();
  const updateSettings = useUpdateScopedSettings();
  const navigate = useNavigate();
  const { environments } = useEnvironments();
  const representative = target
    ? environments.find((environment) => environment.environmentId === target.environmentId)
    : undefined;
  const providers = representative?.serverConfig?.providers ?? EMPTY_SERVER_PROVIDERS;
  const selection = resolveDefaultProviderModelSelection(providers, settings.defaultModelSelection);
  const entries = sortProviderInstanceEntries(
    applyProviderInstanceSettings(deriveProviderInstanceEntries(providers), settings),
  );
  const modelOptions = getCustomModelOptionsByInstance(
    settings,
    providers,
    selection?.instanceId,
    selection?.model,
  );
  const activeEntry = entries.find((entry) => entry.instanceId === selection?.instanceId);
  const mixedModel = useScopedSettingsMixed(["defaultModelSelection"]);
  const mixedPermissions = useScopedSettingsMixed(["defaultRuntimeMode"]);
  const PermissionIcon = runtimeModeConfig[settings.defaultRuntimeMode].icon;
  const mixedWorkspace = useScopedSettingsMixed(["defaultThreadEnvMode"]);
  const mixedSubmodules = useScopedSettingsMixed(["worktreeSubmodules"]);
  const mixedBrowser = useScopedSettingsMixed(["enableAgentBrowserAccess"]);
  const mixedAutoPull = useScopedSettingsMixed(["defaultAutoPull"]);
  const mixedMergeMethod = useScopedSettingsMixed(["pullRequestMergeMethod"]);
  const modelSource = useScopedSettingSource(["defaultModelSelection"]);
  const isProjectScope = scope.kind === "project" || scope.kind === "checkout";
  const unavailable = connectedEnvironments.length === 0;
  // File-backed keys show their effective value; the target already carries
  // the checkout's t3.json, and a null file here only fills the built-in.
  // The reset arrow beside the title clears the tier (SettingsRow handles a
  // project override, the environment value is cleared here), so the picker
  // has no "inherit" item.
  const effective = target
    ? resolveProjectSettings(target.settings, null, null, null).settings
    : null;

  function modelDisabledReason(instanceId: ProviderInstanceId, model: string): string | null {
    const sourceEntry = entries.find((entry) => entry.instanceId === instanceId);
    for (const candidate of targets) {
      const environment = environments.find(
        (entry) => entry.environmentId === candidate.environmentId,
      );
      const config = environment?.serverConfig;
      if (!config) continue;
      const entry = applyProviderInstanceSettings(
        deriveProviderInstanceEntries(config.providers),
        candidate.settings,
      ).find((option) => option.instanceId === instanceId);
      const options = getCustomModelOptionsByInstance(
        { ...settings, ...candidate.settings },
        config.providers,
      ).get(instanceId);
      if (
        !entry?.enabled ||
        !entry.isAvailable ||
        entry.driverKind !== sourceEntry?.driverKind ||
        !options?.some((option) => option.slug === model && !option.isUnavailable)
      ) {
        return `this model is unavailable on ${environment?.label ?? "a selected environment"}. pick that environment to choose its model separately :3`;
      }
    }
    return null;
  }

  const setModel = (value: ModelSelection | null) => {
    const reason = value ? modelDisabledReason(value.instanceId, value.model) : null;
    if (reason) {
      toastManager.add({
        type: "error",
        title: "aw, that default model didn't save 3:",
        description: reason,
      });
      return;
    }
    updateSettings({ defaultModelSelection: value });
  };

  const modelRow = (
    <SettingsRow
      serverScoped
      settingKeys={["defaultModelSelection"]}
      mixed={mixedModel}
      id="default-model"
      title="Model"
      description={
        isProjectScope
          ? "Model for new threads in this project."
          : "Default model for new threads. Projects can override it."
      }
      status={
        unavailable || mixedModel || modelSource === "project"
          ? undefined
          : settings.defaultModelSelection === null
            ? "Automatic"
            : undefined
      }
      resetAction={
        settings.defaultModelSelection !== null ? (
          <SettingResetButton label="default model" onClick={() => setModel(null)} />
        ) : null
      }
      control={
        selection && activeEntry ? (
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
            <ProviderModelPicker
              activeInstanceId={selection.instanceId}
              model={selection.model}
              lockedProvider={null}
              instanceEntries={entries}
              modelOptionsByInstance={modelOptions}
              triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
              {...(mixedModel ? { triggerLabel: "Mixed" } : {})}
              getModelDisabledReason={modelDisabledReason}
              onOpenProviderSetup={(instanceId) => {
                if (representative)
                  void navigate({
                    to: "/settings/providers",
                    search: { environmentId: representative.environmentId, instanceId },
                  });
              }}
              onInstanceModelChange={(instanceId, model) =>
                setModel(createModelSelection(instanceId, model))
              }
            />
            {!mixedModel ? (
              <TraitsPicker
                provider={activeEntry.driverKind}
                models={activeEntry.models}
                model={selection.model}
                prompt=""
                onPromptChange={() => {}}
                modelOptions={selection.options ?? []}
                allowPromptInjectedEffort={false}
                planModeEnabled={settings.planModeEnabled}
                triggerClassName={SETTINGS_PICKER_TRIGGER_CLASSNAME}
                onModelOptionsChange={(options) =>
                  setModel(createModelSelection(selection.instanceId, selection.model, options))
                }
              />
            ) : null}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">No providers available</span>
        )
      }
    />
  );
  const workspaceRow = (
    <SettingsRow
      serverScoped
      settingKeys={["defaultThreadEnvMode"]}
      mixed={mixedWorkspace}
      id={searchableSetting("new-threads").id}
      title="Workspace"
      description={
        isProjectScope
          ? "Where new threads in this project start."
          : "Where new threads start. Projects and their t3.json can override it."
      }
      resetAction={
        !isProjectScope && settings.defaultThreadEnvMode !== null ? (
          <SettingResetButton
            label="default workspace"
            onClick={() => updateSettings({ defaultThreadEnvMode: null })}
          />
        ) : null
      }
      control={
        <Select
          value={mixedWorkspace ? null : (effective?.defaultThreadEnvMode ?? null)}
          onValueChange={(value) => {
            if (value === "local" || value === "worktree")
              updateSettings({ defaultThreadEnvMode: value });
          }}
        >
          <SelectTrigger size="sm" aria-label="Default workspace">
            <SelectValue>
              {(value: string | null) =>
                value === "local" || value === "worktree"
                  ? resolveEnvModeLabel(value)
                  : unavailable
                    ? "Unavailable"
                    : "Mixed"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectPopup align="end" alignItemWithTrigger={false}>
            <SelectItem value="local">{resolveEnvModeLabel("local")}</SelectItem>
            <SelectItem value="worktree">{resolveEnvModeLabel("worktree")}</SelectItem>
          </SelectPopup>
        </Select>
      }
    />
  );

  return (
    <SettingsSection
      id={
        category === "general" || category === "project"
          ? "project-defaults"
          : category === "integrations"
            ? "browser-access"
            : "source-control-defaults"
      }
      title={
        category === "general" || category === "project"
          ? "New threads"
          : category === "integrations"
            ? "browser"
            : "repositories"
      }
    >
      {category === "project" ? (
        <>
          {modelRow}
          {workspaceRow}
        </>
      ) : category === "general" ? (
        <>
          {modelRow}
          <SettingsRow
            serverScoped
            settingKeys={["defaultRuntimeMode"]}
            mixed={mixedPermissions}
            {...searchableSetting("default-permissions")}
            description={
              isProjectScope
                ? "the permissions new threads in this project start with ;3"
                : "the permissions new threads start with — projects can pick their own ^w^"
            }
            resetAction={
              settings.defaultRuntimeMode !== DEFAULT_SERVER_SETTINGS.defaultRuntimeMode ? (
                <SettingResetButton
                  label="default permissions"
                  onClick={() =>
                    updateSettings({
                      defaultRuntimeMode: DEFAULT_SERVER_SETTINGS.defaultRuntimeMode,
                    })
                  }
                />
              ) : null
            }
            control={
              <Select
                value={mixedPermissions ? null : settings.defaultRuntimeMode}
                onValueChange={(value) => {
                  if (value) updateSettings({ defaultRuntimeMode: value });
                }}
              >
                <SelectTrigger size="sm" aria-label="default permissions">
                  {!mixedPermissions && (
                    <PermissionIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <SelectValue>
                    {mixedPermissions
                      ? "mixed"
                      : runtimeModeConfig[settings.defaultRuntimeMode].label}
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {runtimeModeOptions.map((mode) => {
                    const option = runtimeModeConfig[mode];
                    const Icon = option.icon;
                    return (
                      <SelectItem key={mode} value={mode} className="min-w-64">
                        <div className="grid gap-0.5">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                            {option.label}
                          </span>
                          <span className="text-xs leading-4 text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectPopup>
              </Select>
            }
          />
          {workspaceRow}
          <SettingsRow
            serverScoped
            settingKeys={["worktreeSubmodules"]}
            mixed={mixedSubmodules}
            {...searchableSetting("worktree-submodules")}
            description={
              isProjectScope
                ? "How new worktrees in this project populate git submodules."
                : "How new worktrees populate git submodules. Projects and their t3.json can override it."
            }
            resetAction={
              !isProjectScope && settings.worktreeSubmodules !== null ? (
                <SettingResetButton
                  label="worktree submodules"
                  onClick={() => updateSettings({ worktreeSubmodules: null })}
                />
              ) : null
            }
            control={
              <Select
                value={mixedSubmodules ? null : (effective?.worktreeSubmodules ?? null)}
                onValueChange={(value) => {
                  if (isWorktreeSubmodules(value)) updateSettings({ worktreeSubmodules: value });
                }}
              >
                <SelectTrigger size="sm" aria-label="worktree submodules">
                  <SelectValue>
                    {(value: string | null) =>
                      isWorktreeSubmodules(value)
                        ? WORKTREE_SUBMODULES_LABELS[value]
                        : unavailable
                          ? "unavailable"
                          : "mixed"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  {WORKTREE_SUBMODULES_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {WORKTREE_SUBMODULES_LABELS[option]}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            }
          />
        </>
      ) : category === "source-control" ? (
        <>
          <SettingsRow
            serverScoped
            settingKeys={["defaultAutoPull"]}
            mixed={mixedAutoPull}
            id="automatic-pull"
            title="automatically pull ^w^"
            description={
              isProjectScope
                ? "keeps this project's default branch fresh when the checkout has no local changes or commits ;3"
                : "keeps the default branch fresh when the checkout has no local changes or commits — projects can pick their own :3"
            }
            resetAction={
              settings.defaultAutoPull ? (
                <SettingResetButton
                  label="default automatic pull"
                  tooltip="reset automatic pull to off"
                  onClick={() => updateSettings({ defaultAutoPull: false })}
                />
              ) : null
            }
            control={
              <Switch
                aria-label="default automatic pull"
                mixed={mixedAutoPull}
                checked={mixedAutoPull ? false : settings.defaultAutoPull}
                onCheckedChange={(enabled) => updateSettings({ defaultAutoPull: enabled })}
              />
            }
          />
          <SettingsRow
            serverScoped
            settingKeys={["pullRequestMergeMethod"]}
            mixed={mixedMergeMethod}
            {...searchableSetting("pull-request-merge-method")}
            description={
              isProjectScope
                ? "the method pull requests in this project start with ^w^"
                : "the method pull requests start with. last selected reuses whatever you picked most recently on this device ^w^"
            }
            resetAction={
              settings.pullRequestMergeMethod !== null ? (
                <SettingResetButton
                  label="default merge method"
                  tooltip="reset to last selected"
                  onClick={() => updateSettings({ pullRequestMergeMethod: null })}
                />
              ) : null
            }
            control={
              <Select
                value={mixedMergeMethod ? null : (settings.pullRequestMergeMethod ?? "last")}
                onValueChange={(value) => {
                  if (value === "last") updateSettings({ pullRequestMergeMethod: null });
                  else if (value === "merge" || value === "squash" || value === "rebase")
                    updateSettings({ pullRequestMergeMethod: value });
                }}
              >
                <SelectTrigger size="sm" aria-label="default pull request merge method">
                  <SelectValue>
                    {(value: string | null) =>
                      value === "merge" || value === "squash" || value === "rebase"
                        ? PULL_REQUEST_MERGE_METHOD_LABELS[value]
                        : value === "last"
                          ? "last selected"
                          : "mixed"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectPopup align="end" alignItemWithTrigger={false}>
                  <SelectItem value="last">last selected</SelectItem>
                  <SelectItem value="merge">{PULL_REQUEST_MERGE_METHOD_LABELS.merge}</SelectItem>
                  <SelectItem value="squash">{PULL_REQUEST_MERGE_METHOD_LABELS.squash}</SelectItem>
                  <SelectItem value="rebase">{PULL_REQUEST_MERGE_METHOD_LABELS.rebase}</SelectItem>
                </SelectPopup>
              </Select>
            }
          />
        </>
      ) : (
        <>
          <SettingsRow
            serverScoped
            settingKeys={["enableAgentBrowserAccess"]}
            mixed={mixedBrowser}
            id={searchableSetting("agent-browser-access").id}
            title="agent browser access"
            description={
              isProjectScope
                ? "let agents in this project use the shared browser. kicks in when the agent session next starts ;3"
                : "let agents use the shared browser — projects can pick their own :3"
            }
            resetAction={
              settings.enableAgentBrowserAccess !==
              DEFAULT_SERVER_SETTINGS.enableAgentBrowserAccess ? (
                <SettingResetButton
                  label="default browser access"
                  onClick={() =>
                    updateSettings({
                      enableAgentBrowserAccess: DEFAULT_SERVER_SETTINGS.enableAgentBrowserAccess,
                    })
                  }
                />
              ) : null
            }
            control={
              <Switch
                aria-label="agent browser access"
                mixed={mixedBrowser}
                checked={mixedBrowser ? false : settings.enableAgentBrowserAccess}
                onCheckedChange={(enabled) => updateSettings({ enableAgentBrowserAccess: enabled })}
              />
            }
          />
        </>
      )}
    </SettingsSection>
  );
}
