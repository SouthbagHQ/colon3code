import { EraserIcon } from "~/icons";

import type { ComposerBannerStackItem } from "./ComposerBannerStack";

/** Shown while `/clear` is armed; dismissing it keeps the current conversation. */
export function freshSessionBannerItem(onUndo: () => void): ComposerBannerStackItem {
  return {
    id: "fresh-session",
    variant: "info",
    icon: <EraserIcon />,
    title: "your next message starts a fresh session",
    description: "The agent won't see earlier messages in this thread.",
    dismissLabel: "keep the current session",
    onDismiss: onUndo,
  };
}
