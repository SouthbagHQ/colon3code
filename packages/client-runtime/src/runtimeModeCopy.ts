import type { RuntimeMode } from "@t3tools/contracts";

/**
 * How each access policy is named and explained, shared so the web picker
 * and the mobile thread settings sheet describe them in the same voice.
 * Clients add their own icons.
 */
export const RUNTIME_MODE_COPY: Readonly<
  Record<RuntimeMode, { readonly label: string; readonly description: string }>
> = {
  "approval-required": {
    label: "supervised",
    description: "i'll ask before running commands or touching files :3",
  },
  "auto-accept-edits": {
    label: "auto-accept edits",
    description: "edits go straight in, i'll still ask before anything else ^w^",
  },
  auto: {
    label: "auto",
    description: "routine stuff just happens where the provider allows it, the rest still asks",
  },
  "full-access": {
    label: "full access",
    description: "no prompts, i just go. brave choice uwu",
  },
};
