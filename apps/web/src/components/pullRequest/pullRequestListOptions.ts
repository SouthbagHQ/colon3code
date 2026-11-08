import type { PullRequestInvolvement, PullRequestListState } from "@t3tools/contracts";
import {
  CalendarArrowDownIcon,
  CalendarArrowUpIcon,
  ClockIcon,
  EyeIcon,
  LayersIcon,
  ListChecksIcon,
  Maximize2Icon,
  Minimize2Icon,
  PenLineIcon,
  UserLockIcon,
} from "~/icons";

import type { PullRequestFilterOption } from "./PullRequestListFilters";
import type { PullRequestListSort } from "./pullRequestListPreferences";
import { PullRequestGlyph } from "./pullRequestIcons";

export const INVOLVEMENT_TABS = [
  { value: "all", label: "all", Icon: LayersIcon },
  { value: "reviewing", label: "reviewing", Icon: EyeIcon },
  { value: "authored", label: "authored", Icon: PenLineIcon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestInvolvement>>;

export const STATE_TABS = [
  { value: "all", label: "all", Icon: LayersIcon },
  { value: "open", label: "open", Icon: PullRequestGlyph.pullRequest },
  { value: "closed", label: "closed", Icon: PullRequestGlyph.closed },
  { value: "merged", label: "merged", Icon: PullRequestGlyph.merged },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListState>>;

export const SORT_OPTIONS = [
  { value: "ready", label: "merge readiness", Icon: ListChecksIcon },
  { value: "blocked", label: "blocked on me", Icon: UserLockIcon },
  { value: "updated", label: "recently updated", Icon: ClockIcon },
  { value: "newest", label: "newest shown", Icon: CalendarArrowDownIcon },
  { value: "oldest", label: "oldest shown", Icon: CalendarArrowUpIcon },
  { value: "largest", label: "largest shown", Icon: Maximize2Icon },
  { value: "smallest", label: "smallest shown", Icon: Minimize2Icon },
] as const satisfies ReadonlyArray<PullRequestFilterOption<PullRequestListSort>>;
