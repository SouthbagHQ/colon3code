import type { PullRequestReviewGuideResult } from "@t3tools/contracts";

export function reviewGuideState(data: PullRequestReviewGuideResult | null) {
  const guide = data?.guide ?? null;
  return {
    guide,
    running: data?.run?._tag === "Running",
    stale: guide !== null && data?.currentHeadSha != null && guide.headSha !== data.currentHeadSha,
    failure:
      data?.run?._tag === "Failed" && data.run.headSha === data.currentHeadSha
        ? data.run.detail
        : null,
  };
}

export function guideNoticeState(state: {
  readonly data: PullRequestReviewGuideResult | null;
  readonly isPending: boolean;
  readonly running: boolean;
  readonly startError: string | null;
  readonly error: string | null;
}) {
  const { guide, stale, failure } = reviewGuideState(state.data);
  if (state.running) {
    return {
      kind: "writing" as const,
      title: "rewriting guide",
      description: guide
        ? "You can keep reading this guide while the agent writes the update."
        : "An agent is reading the change and writing the tour. You can leave and come back when it’s ready.",
      action: guide ? "rewriting…" : "writing guide…",
    };
  }
  const error = state.startError ?? failure;
  if (error) {
    return {
      kind: "failed" as const,
      title: "could not write guide",
      description: error,
      action: "try again",
    };
  }
  if (state.error) {
    return {
      kind: "unavailable" as const,
      title: "could not refresh guide",
      description: state.error,
      action: "try again",
    };
  }
  if (!state.data) {
    return {
      kind: "loading" as const,
      title: "review guide",
      description: "Checking for a saved guide…",
      action: "loading guide…",
    };
  }
  if (stale) {
    return {
      kind: "stale" as const,
      title: "new changes since this guide",
      description: "You can read the previous guide, or rewrite it for the latest changes.",
      action: "rewrite guide",
    };
  }
  return {
    kind: guide ? ("ready" as const) : ("empty" as const),
    title: "review guide",
    description:
      "Get a tour of the change, with code excerpts and notes on what needs a closer look.",
    action: "write guide",
  };
}
