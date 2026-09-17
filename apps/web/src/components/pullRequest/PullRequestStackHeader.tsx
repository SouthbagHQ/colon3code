import { MenuGroupLabel } from "../ui/menu";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export function PullRequestStackHeader({
  number,
  notice,
  stale = false,
}: {
  number: number;
  notice?: string | null | undefined;
  stale?: boolean;
}) {
  return (
    <MenuGroupLabel className="flex items-center justify-between gap-2">
      <span>stack #{number}</span>
      {notice ? (
        <Tooltip>
          <TooltipTrigger render={<span role="status" className="text-xs font-normal" />}>
            {stale ? "may be stale" : "refreshing…"}
          </TooltipTrigger>
          <TooltipPopup>{notice}</TooltipPopup>
        </Tooltip>
      ) : null}
    </MenuGroupLabel>
  );
}
