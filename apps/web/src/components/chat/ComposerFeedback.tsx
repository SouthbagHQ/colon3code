import {
  codexFeedbackNotice,
  type CodexFeedbackSubmission,
} from "@t3tools/client-runtime/state/threads";
import { MessageSquareIcon } from "~/icons";

import { writeTextToClipboard } from "../../hooks/useCopyToClipboard";
import { Button } from "../ui/button";
import { toastManager } from "../ui/toast";
import type { ComposerBannerStackItem } from "./ComposerBannerStack";

export function feedbackBannerItem(
  submission: CodexFeedbackSubmission,
  onDismiss: () => void,
): ComposerBannerStackItem | null {
  const notice = codexFeedbackNotice(submission);
  if (!notice) return null;
  return {
    id: `feedback:${submission.id}`,
    variant:
      submission.status === "failed" ? "error" : submission.status === "sent" ? "success" : "info",
    priority: submission.status === "uploading" ? "activity" : "notice",
    icon: <MessageSquareIcon />,
    ...notice,
    actions:
      submission.status === "sent" ? (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => {
            void writeTextToClipboard(submission.feedbackId, "jippity feedback thread ID").catch(
              (error: unknown) => {
                toastManager.add({
                  type: "error",
                  title: "aw, couldn't copy the thread ID 3:",
                  description: error instanceof Error ? error.message : "something went wrong.",
                });
              },
            );
          }}
        >
          copy ID
        </Button>
      ) : undefined,
    ...(submission.status !== "uploading"
      ? { dismissLabel: "dismiss feedback notice", onDismiss }
      : {}),
  };
}
