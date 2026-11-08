import {
  managedRuntimeModeDenial,
  type ManagedPolicySummary,
  type RuntimeMode,
} from "@t3tools/contracts";
import { RUNTIME_MODE_COPY } from "@t3tools/client-runtime/runtimeModeCopy";
import { LockIcon, PenLineIcon, ShieldOffIcon, SparklesIcon, type IconComponent } from "~/icons";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: IconComponent }
> = {
  "approval-required": { ...RUNTIME_MODE_COPY["approval-required"], icon: LockIcon },
  "auto-accept-edits": { ...RUNTIME_MODE_COPY["auto-accept-edits"], icon: PenLineIcon },
  auto: { ...RUNTIME_MODE_COPY.auto, icon: SparklesIcon },
  // An open lock reads like a closed one at small sizes; a crossed shield does not.
  "full-access": { ...RUNTIME_MODE_COPY["full-access"], icon: ShieldOffIcon },
};

export const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];

/** The modes a provider supports (all when it reports none) and the mode a thread really runs in. */
export function resolveCompatibleRuntimeMode(
  runtimeMode: RuntimeMode,
  supportedRuntimeModes: ReadonlyArray<RuntimeMode> | undefined,
) {
  const modes =
    supportedRuntimeModes && supportedRuntimeModes.length > 0
      ? runtimeModeOptions.filter((mode) => supportedRuntimeModes.includes(mode))
      : runtimeModeOptions;
  return { modes, mode: modes.includes(runtimeMode) ? runtimeMode : (modes[0] ?? runtimeMode) };
}

export function resolveRuntimeModeOptions(
  modes: ReadonlyArray<RuntimeMode>,
  managedPolicy: ManagedPolicySummary | undefined,
) {
  return modes.map((mode) => {
    const option = { mode, ...runtimeModeConfig[mode] };
    const disabledReason = managedRuntimeModeDenial(managedPolicy, mode);
    return disabledReason === undefined ? option : { ...option, disabledReason };
  });
}
