import { RefreshIcon } from "~/components/ui/refresh-icon";
import { PlusIcon, SearchIcon } from "~/icons";

import { openCommandPalette } from "../../commandPaletteBus";
import { Button } from "../ui/button";
import { PullRequestListGhost } from "./PullRequestGhosts";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "../ui/empty";

function BranchMark({ joined }: { joined: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 72"
      className="h-20 w-32 text-muted-foreground/60"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 58h100" className="text-muted-foreground/30" stroke="currentColor" />
      <circle cx="10" cy="58" r="5" fill="currentColor" fillOpacity={0.25} />
      <circle cx="110" cy="58" r="5" fill="currentColor" fillOpacity={0.25} />
      {joined ? (
        <path d="M30 58c0-18 8-26 24-26h12c16 0 24 8 24 26" />
      ) : (
        <>
          <path d="M30 58c0-18 8-26 24-26h4" />
          <path
            d="M90 58c0-18-8-26-24-26h-4"
            strokeDasharray="2 7"
            className="text-muted-foreground/50"
          />
        </>
      )}
      <circle
        cx="60"
        cy="32"
        r={joined ? 5 : 4}
        fill={joined ? "currentColor" : "none"}
        fillOpacity={0.25}
        className={joined ? undefined : "text-muted-foreground/45"}
      />
    </svg>
  );
}

export function PullRequestListEmptyState({
  query,
  filtered,
  searching,
  hasProjects,
  canLoadMore,
  loadingMore,
  refreshing,
  onClearQuery,
  onLoadMore,
  onRefresh,
}: {
  query: string;
  filtered: boolean;
  searching: boolean;
  hasProjects: boolean;
  canLoadMore: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onClearQuery: () => void;
  onLoadMore: () => void;
  onRefresh: () => void;
}) {
  if (!hasProjects) {
    return (
      <Empty>
        <BranchMark joined={false} />
        <EmptyHeader>
          <EmptyTitle>no projects in this workspace yet ^w^</EmptyTitle>
          <EmptyDescription>
            {" "}
            add a project and its repository's pull requests will pop up here :3
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" onClick={() => openCommandPalette({ open: "add-project" })}>
            <PlusIcon className="size-3.5" />
            add project
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (searching) {
    return (
      <PullRequestListGhost
        rows={5}
        caption={`searching every host for “${query.length > 48 ? `${query.slice(0, 48)}…` : query}”`}
      />
    );
  }

  if (query.length > 0) {
    return (
      <Empty>
        <BranchMark joined={false} />
        <EmptyHeader>
          <EmptyTitle>
            nothing matches “{query.length > 48 ? `${query.slice(0, 48)}…` : query}”
          </EmptyTitle>
          <EmptyDescription>
            {" "}
            we asked the hosts and came back empty. try fewer words, or search by number, author or
            branch ^w^
          </EmptyDescription>
        </EmptyHeader>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" variant="outline" onClick={onClearQuery}>
            <SearchIcon className="size-3.5" />
            clear search
          </Button>
          <Button size="sm" variant="outline" disabled={refreshing} onClick={onRefresh}>
            <RefreshIcon size="sm" refreshing={refreshing} />
            {refreshing ? "checking…" : "check again"}
          </Button>
        </div>
      </Empty>
    );
  }

  return (
    <Empty>
      <BranchMark joined={false} />
      <EmptyHeader>
        <EmptyTitle>
          {filtered
            ? "hmm, nothing under these filters 3:"
            : "no pull requests yet, it's quiet in here :3"}
        </EmptyTitle>
        <EmptyDescription>
          {filtered
            ? "widen the state, involvement or project filter and more will show up ;3"
            : "pull requests from every project in this workspace will gather here :3"}
        </EmptyDescription>
      </EmptyHeader>
      <div className="flex flex-wrap justify-center gap-2">
        {canLoadMore ? (
          <Button size="sm" variant="outline" disabled={loadingMore} onClick={onLoadMore}>
            {loadingMore ? "loading…" : "load more pull requests"}
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled={refreshing} onClick={onRefresh}>
          <RefreshIcon size="sm" refreshing={refreshing} />
          {refreshing ? "checking…" : "check again"}
        </Button>
      </div>
    </Empty>
  );
}
