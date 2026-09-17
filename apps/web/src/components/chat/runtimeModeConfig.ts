import type { RuntimeMode } from "@t3tools/contracts";
import { type IconComponent, LockIcon, LockOpenIcon, PenLineIcon, SparklesIcon } from "~/icons";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: IconComponent }
> = {
  "approval-required": {
    label: "supervised",
    description: "ask before commands and file changes.",
    icon: LockIcon,
  },
  "auto-accept-edits": {
    label: "auto-accept edits",
    description: "auto-approve edits, ask before other actions.",
    icon: PenLineIcon,
  },
  auto: {
    label: "auto",
    description: "supported providers approve routine actions; others still ask.",
    icon: SparklesIcon,
  },
  "full-access": {
    label: "full access",
    description: "allow commands and edits without prompts.",
    icon: LockOpenIcon,
  },
};

export const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];
