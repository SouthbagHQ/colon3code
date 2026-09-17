import type { RuntimeMode } from "@t3tools/contracts";
import { type IconComponent, LockIcon, LockOpenIcon, PenLineIcon, SparklesIcon } from "~/icons";

export const runtimeModeConfig: Record<
  RuntimeMode,
  { label: string; description: string; icon: IconComponent }
> = {
  "approval-required": {
    label: "supervised",
    description: "i'll ask before running commands or touching files :3",
    icon: LockIcon,
  },
  "auto-accept-edits": {
    label: "auto-accept edits",
    description: "edits go straight in, i'll still ask before anything else ^w^",
    icon: PenLineIcon,
  },
  auto: {
    label: "auto",
    description: "routine stuff just happens where the provider allows it, the rest still asks",
    icon: SparklesIcon,
  },
  "full-access": {
    label: "full access",
    description: "no prompts, i just go. brave choice uwu",
    icon: LockOpenIcon,
  },
};

export const runtimeModeOptions = Object.keys(runtimeModeConfig) as RuntimeMode[];
