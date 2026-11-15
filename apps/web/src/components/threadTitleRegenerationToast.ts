import type { ThreadTitleRegenerationOutcome } from "@t3tools/contracts";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";

import { stackedThreadToast } from "./ui/toast";

type TitleRegenerationResult = AtomCommandResult<ThreadTitleRegenerationOutcome | null, unknown>;

function failureMessage(result: TitleRegenerationResult): string | null {
  if (result._tag === "Failure") {
    if (isAtomCommandInterrupted(result)) return null;
    const error = squashAtomCommandFailure(result);
    return error instanceof Error ? error.message : "An error occurred.";
  }
  return result.value?.status === "failed"
    ? (result.value.message ?? "Title generation failed.")
    : null;
}

function isKept(result: TitleRegenerationResult): boolean {
  return result._tag === "Success" && result.value?.status === "unchanged";
}

export function titleRegenerationToast(results: ReadonlyArray<TitleRegenerationResult>) {
  const failures = results.flatMap((result) => {
    const message = failureMessage(result);
    return message === null ? [] : [message];
  });
  if (failures.length > 0) {
    return stackedThreadToast({
      type: "error",
      title:
        results.length === 1
          ? "aw, couldn't regenerate the title 3:"
          : `aw, couldn't regenerate ${failures.length} of ${results.length} titles 3:`,
      description: failures[0],
    });
  }
  const kept = results.filter(isKept).length;
  if (kept === 0) return null;
  if (results.length === 1) {
    return stackedThreadToast({
      type: "info",
      title: "title kept",
      description: "The current title already fits this thread.",
    });
  }
  return stackedThreadToast({
    type: "info",
    title: kept === results.length ? "titles kept" : `kept ${kept} of ${results.length} titles`,
    description:
      kept === results.length
        ? "The current titles already fit these threads."
        : "Those titles already fit their threads.",
  });
}
