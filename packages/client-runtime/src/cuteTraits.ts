import type { ProviderOptionDescriptor } from "@t3tools/contracts";

/**
 * Provider option labels arrive from each CLI in its own Title Case voice.
 * These helpers put them in ours: lowercase, with a friendlier heading for
 * the groups every provider shares and a little gloss under each effort.
 */

const DESCRIPTOR_LABELS: Readonly<Record<string, string>> = {
  reasoning: "how hard to think",
  "reasoning effort": "how hard to think",
  effort: "how hard to think",
  "context window": "how much to remember",
  "service tier": "how fast to go",
};

const EFFORT_GLOSS: Readonly<Record<string, string>> = {
  none: "no thinking, just vibes",
  minimal: "barely a think",
  low: "a lil think :3",
  medium: "a good think ^w^",
  high: "a big think >w<",
  xhigh: "a very big think owo",
  max: "thinks so hard uwu",
  ultra: "thinks even harder",
  ultracode: "very big think plus a lil team of agents ^w^",
  ultrathink: "maximum brain :3c",
};

export function cuteDescriptorLabel(label: string): string {
  return DESCRIPTOR_LABELS[label.trim().toLowerCase()] ?? cuteOptionLabel(label);
}

/** Lowercase words, but leave unit-style labels such as "1M" or "200k" alone. */
export function cuteOptionLabel(label: string): string {
  return /[A-Za-z]{2,}/.test(label) ? label.toLowerCase() : label;
}

export function cuteOptionDescription(
  descriptor: Pick<ProviderOptionDescriptor, "id">,
  option: { readonly id: string; readonly description?: string | undefined },
): string | undefined {
  const gloss = EFFORT_GLOSS[option.id];
  if (gloss && /effort|reasoning/i.test(descriptor.id)) return gloss;
  return option.description ? cuteOptionLabel(option.description) : undefined;
}
