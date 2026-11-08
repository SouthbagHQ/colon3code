import { useAtomCommand } from "~/state/use-atom-command";
import type {
  EnvironmentId,
  PullRequestRef,
  PullRequestReviewerCandidate,
} from "@t3tools/contracts";
import {
  hostReviewerQuery,
  reviewerCandidateView,
  type ReviewerTruncation,
} from "@t3tools/client-runtime/pull-request-reviewers";
import { CheckIcon, UserPlusIcon } from "~/icons";
import { useState } from "react";

import { pullRequestEnvironment } from "~/state/pullRequests";
import { useEnvironmentQuery } from "~/state/query";
import { useDebouncedValue } from "~/state/queries";
import { squashAtomCommandFailure } from "@t3tools/client-runtime/state/runtime";

import { toastManager } from "../ui/toast";
import { PullRequestCandidatePicker } from "./PullRequestCandidatePicker";
import { PullRequestActorLabel } from "./pullRequestPresentation";
import { readableFailure } from "./pullRequestDetail.logic";

const TRUNCATED_LABELS: Record<ReviewerTruncation, (error: string | null) => string> = {
  unsearchable: () =>
    "This repository has more people with access than are listed here. Ask for the rest on the host.",
  searchable: () =>
    "This repository has more people with access than are listed here. Search to find them.",
  "search-failed": (error) =>
    `Only the people already listed are matched: the host search failed. ${error ?? ""}`,
  "search-truncated": () =>
    "More people match than the host returned. Keep typing to narrow it down.",
};

export function PullRequestReviewerPicker({
  environmentId,
  reference,
  allowed,
  searchable,
}: {
  environmentId: EnvironmentId;
  reference: PullRequestRef;
  allowed: boolean;
  searchable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const candidatesQuery = useEnvironmentQuery(
    open ? pullRequestEnvironment.reviewerCandidates({ environmentId, input: reference }) : null,
  );
  // Past the first page the host is asked, since what was loaded cannot answer for the rest.
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const searchInput = { loaded: candidatesQuery.data, searchable, query, debouncedQuery };
  const hostQuery = hostReviewerQuery(searchInput);
  const searchResult = useEnvironmentQuery(
    open && hostQuery !== null
      ? pullRequestEnvironment.reviewerSearch({
          environmentId,
          input: { ...reference, query: hostQuery },
        })
      : null,
  );
  const requestReviewers = useAtomCommand(pullRequestEnvironment.requestReviewers, {
    reportFailure: false,
  });

  const { candidates, searchPending, searchError, truncation } = reviewerCandidateView({
    ...searchInput,
    search: searchResult,
  });

  const toggle = async (candidate: PullRequestReviewerCandidate) => {
    if (pending !== null) return;
    setPending(candidate.id);
    const result = await requestReviewers({
      environmentId,
      input: {
        ...reference,
        reviewers: [{ id: candidate.id, kind: candidate.kind }],
        requested: !candidate.isRequested,
      },
    });
    setPending(null);
    if (result._tag === "Failure") {
      toastManager.add({
        type: "error",
        title: candidate.isRequested
          ? `oops, couldn't take back the review request to ${candidate.login} 3:`
          : `aw, couldn't ask ${candidate.login} for a review 3:`,
        description: readableFailure(
          squashAtomCommandFailure(result),
          "the host said no. check that you have write access on this repository, and that they still have access to it 3:",
        ),
      });
      return;
    }
    // The command reads the loaded list again only for somebody it lacked, and a search result
    // is keyed by what was typed, so the one on screen is read here or it keeps the old request.
    if (hostQuery !== null) searchResult.refresh();
    toastManager.add({
      type: "success",
      title: candidate.isRequested
        ? `took back the review request to ${candidate.login} :3`
        : `asked ${candidate.login} for a review, purr :3`,
    });
  };

  return (
    <PullRequestCandidatePicker
      icon={<UserPlusIcon className="size-3.5" />}
      label="request a review"
      allowed={allowed}
      disabledReason="to ask someone for a review, you'll need write access on this repository ;3"
      open={open}
      onOpenChange={setOpen}
      query={query}
      onQueryChange={setQuery}
      searchLabel="search people with access"
      isPending={(candidatesQuery.isPending && candidatesQuery.data === null) || searchPending}
      error={
        candidatesQuery.data === null
          ? candidatesQuery.error
          : candidates.length === 0
            ? searchError
            : null
      }
      candidates={candidates}
      emptyLabel="looks like nobody else has access to this repository ^w^"
      noMatchLabel="hmm, nobody with access matches that :3"
      errorLabel="aw, couldn't read who has access 3:"
      truncated={truncation !== null}
      truncatedLabel={truncation === null ? "" : TRUNCATED_LABELS[truncation](searchError)}
      candidateKey={(candidate) => `${candidate.kind}:${candidate.id}`}
      disabled={pending !== null}
      onSelect={(candidate) => void toggle(candidate)}
    >
      {(candidate) => (
        <>
          <PullRequestActorLabel actor={candidate} className="flex-1" />
          {candidate.kind === "team" ? (
            <span className="shrink-0 text-muted-foreground">team</span>
          ) : null}
          {candidate.isRequested ? (
            <CheckIcon aria-label="already asked" className="size-3.5 shrink-0" />
          ) : null}
        </>
      )}
    </PullRequestCandidatePicker>
  );
}
