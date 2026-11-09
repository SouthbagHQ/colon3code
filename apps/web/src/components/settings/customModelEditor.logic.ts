import {
  type ModelCapabilities,
  ProviderDriverKind,
  type ProviderOptionDescriptor,
  SOUTHBAG_CODE_DRIVER_KIND,
} from "@t3tools/contracts";
import { type CustomModelDefinition, createModelCapabilities } from "@t3tools/shared/model";

export interface EditorChoice {
  readonly key: string;
  readonly id: string;
  readonly label: string;
  readonly isDefault: boolean;
  readonly description?: string;
}

export interface EditorDescriptor {
  readonly key: string;
  readonly type: "select" | "boolean";
  readonly id: string;
  readonly label: string;
  readonly choices: ReadonlyArray<EditorChoice>;
  readonly currentBooleanValue?: boolean | undefined;
  readonly description?: string | undefined;
}

export interface CustomModelDraft {
  readonly slug: string;
  readonly name: string;
  readonly descriptors: ReadonlyArray<EditorDescriptor>;
}

export interface DescriptorPreset {
  readonly id: string;
  readonly label: string;
  readonly type: "select" | "boolean";
  readonly choices?: ReadonlyArray<{ id: string; label: string; isDefault?: boolean }>;
}

const EFFORT_CHOICES = [
  { id: "low", label: "low" },
  { id: "medium", label: "medium", isDefault: true },
  { id: "high", label: "high" },
  { id: "xhigh", label: "extra high" },
] as const;

export const DESCRIPTOR_PRESETS_BY_KIND: Partial<
  Record<ProviderDriverKind, ReadonlyArray<DescriptorPreset>>
> = {
  [ProviderDriverKind.make("codex")]: [
    { id: "reasoningEffort", label: "reasoning", type: "select", choices: EFFORT_CHOICES },
    {
      id: "serviceTier",
      label: "speed",
      type: "select",
      choices: [
        { id: "default", label: "standard", isDefault: true },
        { id: "fast", label: "fast" },
      ],
    },
  ],
  [ProviderDriverKind.make("claudeAgent")]: [
    {
      id: "effort",
      label: "reasoning",
      type: "select",
      choices: [
        { id: "low", label: "low" },
        { id: "medium", label: "medium" },
        { id: "high", label: "high", isDefault: true },
        { id: "xhigh", label: "extra high" },
        { id: "max", label: "max" },
      ],
    },
    { id: "fastMode", label: "fast mode", type: "boolean" },
    { id: "thinking", label: "thinking", type: "boolean" },
  ],
  [ProviderDriverKind.make("cursor")]: [
    { id: "reasoning", label: "reasoning", type: "select", choices: EFFORT_CHOICES },
    { id: "fastMode", label: "fast mode", type: "boolean" },
    { id: "thinking", label: "thinking", type: "boolean" },
  ],
  [ProviderDriverKind.make("grok")]: [
    { id: "reasoningEffort", label: "reasoning", type: "select", choices: EFFORT_CHOICES },
  ],
  [SOUTHBAG_CODE_DRIVER_KIND]: [
    // Mirrors the RPC `set_thinking_level` levels.
    {
      id: "thinkingLevel",
      label: "thinking",
      type: "select",
      choices: [
        { id: "off", label: "off" },
        { id: "minimal", label: "minimal" },
        { id: "low", label: "low" },
        { id: "medium", label: "medium", isDefault: true },
        { id: "high", label: "high" },
        { id: "xhigh", label: "extra high" },
      ],
    },
  ],
  [ProviderDriverKind.make("pi")]: [
    {
      id: "thinking",
      label: "thinking",
      type: "select",
      choices: [
        { id: "off", label: "off" },
        { id: "minimal", label: "minimal" },
        { id: "low", label: "low" },
        { id: "medium", label: "medium", isDefault: true },
        { id: "high", label: "high" },
        { id: "xhigh", label: "extra high" },
        { id: "max", label: "max" },
      ],
    },
  ],
  [ProviderDriverKind.make("opencode")]: [
    { id: "variant", label: "reasoning", type: "select", choices: EFFORT_CHOICES },
    {
      id: "agent",
      label: "agent",
      type: "select",
      choices: [
        { id: "build", label: "build", isDefault: true },
        { id: "plan", label: "plan" },
      ],
    },
  ],
};

let nextKey = 0;
function newEditorKey(): string {
  nextKey += 1;
  return `k${nextKey}`;
}

export function choiceFromPreset(choice: {
  id: string;
  label: string;
  isDefault?: boolean;
}): EditorChoice {
  return { key: newEditorKey(), id: choice.id, label: choice.label, isDefault: !!choice.isDefault };
}

export function descriptorFromPreset(preset: DescriptorPreset): EditorDescriptor {
  return {
    key: newEditorKey(),
    type: preset.type,
    id: preset.id,
    label: preset.label,
    choices: (preset.choices ?? []).map(choiceFromPreset),
  };
}

export function emptyEditorDescriptor(): EditorDescriptor {
  return { key: newEditorKey(), type: "select", id: "", label: "", choices: [] };
}

export function emptyEditorChoice(): EditorChoice {
  return { key: newEditorKey(), id: "", label: "", isDefault: false };
}

/** Custom entries lack runtime profiles for prompt-injected choices, so do not store them as ordinary
 * options. */
function descriptorToEditor(descriptor: ProviderOptionDescriptor): EditorDescriptor {
  const promptInjected = new Set(
    descriptor.type === "select" ? (descriptor.promptInjectedValues ?? []) : [],
  );
  const choices =
    descriptor.type === "select"
      ? descriptor.options.filter((option) => !promptInjected.has(option.id))
      : [];
  const defaultChoice =
    choices.find((option) => option.id === descriptor.currentValue) ??
    choices.find((option) => option.isDefault);
  return {
    key: newEditorKey(),
    type: descriptor.type,
    id: descriptor.id,
    label: descriptor.label,
    ...(descriptor.description !== undefined ? { description: descriptor.description } : {}),
    ...(descriptor.type === "boolean" && descriptor.currentValue !== undefined
      ? { currentBooleanValue: descriptor.currentValue }
      : {}),
    choices: choices.map((option) => ({
      key: newEditorKey(),
      id: option.id,
      label: option.label,
      ...(option.description !== undefined ? { description: option.description } : {}),
      isDefault: option === defaultChoice,
    })),
  };
}

export function draftFromDefinition(entry: CustomModelDefinition): CustomModelDraft {
  return {
    slug: entry.slug,
    name: entry.name === entry.slug ? "" : entry.name,
    descriptors: (entry.capabilities?.optionDescriptors ?? []).map(descriptorToEditor),
  };
}

/** Claude context choices require runtime suffix mappings that custom entries do not carry. */
export function descriptorsFromCapabilities(
  capabilities: ModelCapabilities | null | undefined,
  driverKind: ProviderDriverKind | null,
): EditorDescriptor[] {
  return (capabilities?.optionDescriptors ?? [])
    .filter((descriptor) => driverKind !== "claudeAgent" || descriptor.id !== "contextWindow")
    .map(descriptorToEditor);
}

export function validateDraft(draft: CustomModelDraft): string | null {
  const seenIds = new Set<string>();
  for (const [index, descriptor] of draft.descriptors.entries()) {
    const position = `option ${index + 1}`;
    const id = descriptor.id.trim();
    if (!id) return `${position} still needs an id ;3`;
    if (seenIds.has(id)) return `${position}: id "${id}" is used twice.`;
    seenIds.add(id);
    if (!descriptor.label.trim()) return `${position} needs a label.`;
    if (descriptor.type !== "select") continue;
    if (descriptor.choices.length === 0)
      return `${position} needs at least one choice to pick from :3`;
    const seenChoices = new Set<string>();
    for (const choice of descriptor.choices) {
      const choiceId = choice.id.trim();
      if (!choiceId) return `${position} has a choice without a value.`;
      if (seenChoices.has(choiceId)) {
        return `${position}: choice "${choiceId}" is used twice.`;
      }
      seenChoices.add(choiceId);
    }
  }
  return null;
}

export function definitionFromDraft(draft: CustomModelDraft): CustomModelDefinition {
  const descriptors: ProviderOptionDescriptor[] = draft.descriptors.map((descriptor) => {
    const id = descriptor.id.trim();
    const label = descriptor.label.trim();
    if (descriptor.type === "boolean") {
      return {
        id,
        label,
        type: "boolean",
        ...(descriptor.description !== undefined ? { description: descriptor.description } : {}),
        ...(descriptor.currentBooleanValue !== undefined
          ? { currentValue: descriptor.currentBooleanValue }
          : {}),
      };
    }
    const options = descriptor.choices.map((choice) => ({
      id: choice.id.trim(),
      label: choice.label.trim() || choice.id.trim(),
      ...(choice.description !== undefined ? { description: choice.description } : {}),
      ...(choice.isDefault ? { isDefault: true } : {}),
    }));
    const currentValue = options.find((option) => option.isDefault)?.id;
    return {
      id,
      label,
      type: "select",
      ...(descriptor.description !== undefined ? { description: descriptor.description } : {}),
      options,
      ...(currentValue ? { currentValue } : {}),
    };
  });
  const name = draft.name.trim();
  return {
    slug: draft.slug,
    name: name || draft.slug,
    capabilities:
      descriptors.length > 0 ? createModelCapabilities({ optionDescriptors: descriptors }) : null,
  };
}
