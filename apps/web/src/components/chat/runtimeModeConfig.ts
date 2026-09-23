import { RUNTIME_MODE_COPY } from "@t3tools/client-runtime/runtimeModeCopy";
import type { RuntimeMode } from "@t3tools/contracts";
import { type IconComponent, LockIcon, LockOpenIcon, PenLineIcon, SparklesIcon } from "~/icons";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: IconComponent }
> = {
  "approval-required": { ...RUNTIME_MODE_COPY["approval-required"], icon: LockIcon },
  "auto-accept-edits": { ...RUNTIME_MODE_COPY["auto-accept-edits"], icon: PenLineIcon },
  auto: { ...RUNTIME_MODE_COPY.auto, icon: SparklesIcon },
  "full-access": { ...RUNTIME_MODE_COPY["full-access"], icon: LockOpenIcon },
};

export const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];
