import type { ProviderOptionDescriptor, RuntimeMode } from "@t3tools/contracts";

/**
 * Desktop-oriented effort keywords that don't belong in the phone picker.
 * Prompt-injected values (ultrathink and friends) are filtered from the
 * descriptor metadata; ultracode is a real option but a workflow trigger, not
 * a reasoning level. A value set elsewhere still displays, it just isn't
 * offered.
 */
const HIDDEN_EFFORT_OPTION_IDS: ReadonlySet<string> = new Set(["ultracode"]);

export const RUNTIME_MODE_CHOICES: ReadonlyArray<{
  readonly mode: RuntimeMode;
  readonly label: string;
  readonly description: string;
}> = [
  {
    mode: "approval-required",
    label: "supervised",
    description: "ask before commands and file changes.",
  },
  {
    mode: "auto-accept-edits",
    label: "auto-accept edits",
    description: "auto-approve edits, ask before other actions.",
  },
  {
    mode: "auto",
    label: "auto",
    description: "supported providers approve routine actions; others still ask.",
  },
  {
    mode: "full-access",
    label: "full access",
    description: "allow commands and edits without prompts.",
  },
];

export function selectableChoices(
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>,
) {
  const injected = new Set(descriptor.promptInjectedValues ?? []);
  return descriptor.options.filter(
    (option) => !injected.has(option.id) && !HIDDEN_EFFORT_OPTION_IDS.has(option.id),
  );
}
