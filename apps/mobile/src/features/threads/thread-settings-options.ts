import { cuteOptionLabel } from "@t3tools/client-runtime/cuteTraits";
import { RUNTIME_MODE_COPY } from "@t3tools/client-runtime/runtimeModeCopy";
import type { ProviderOptionDescriptor, RuntimeMode } from "@t3tools/contracts";
import { getProviderOptionCurrentLabel } from "@t3tools/shared/model";

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
}> = (Object.keys(RUNTIME_MODE_COPY) as RuntimeMode[]).map((mode) => ({
  mode,
  ...RUNTIME_MODE_COPY[mode],
}));

export function selectableChoices(
  descriptor: Extract<ProviderOptionDescriptor, { type: "select" }>,
) {
  const injected = new Set(descriptor.promptInjectedValues ?? []);
  return descriptor.options.filter(
    (option) => !injected.has(option.id) && !HIDDEN_EFFORT_OPTION_IDS.has(option.id),
  );
}

/** The descriptor's current value in the app voice, for the disclosure row. */
export function currentOptionLabel(descriptor: ProviderOptionDescriptor): string | undefined {
  const label = getProviderOptionCurrentLabel(descriptor);
  return label === undefined ? undefined : cuteOptionLabel(label);
}
