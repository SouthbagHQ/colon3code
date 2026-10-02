import { memo, useRef } from "react";
import { CheckIcon, CopyIcon } from "~/icons";
import { Button } from "../ui/button";
import { useCopyToClipboard } from "~/hooks/useCopyToClipboard";
import {
  ANCHORED_COPY_TOAST_TIMEOUT_MS,
  showAnchoredCopyErrorToast,
  showAnchoredCopySuccessToast,
} from "../ui/anchoredCopyToast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";

export const MessageCopyButton = memo(function MessageCopyButton({
  text,
  extraFlavors,
  size = "xs",
  variant = "outline",
  className,
}: {
  text: string;
  /** Additional clipboard types written beside `text/plain` when the platform allows it. */
  extraFlavors?: Readonly<Record<string, string>>;
  size?: "xs" | "icon-xs";
  variant?: "outline" | "ghost";
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const { copyToClipboard, isCopied } = useCopyToClipboard<void>({
    onCopy: () => showAnchoredCopySuccessToast(ref),
    onError: (error: Error) => showAnchoredCopyErrorToast(ref, error),
    timeout: ANCHORED_COPY_TOAST_TIMEOUT_MS,
    ...(extraFlavors ? { extraFlavors } : {}),
  });

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            aria-label="copy message"
            disabled={isCopied}
            onClick={() => copyToClipboard(text)}
            ref={ref}
            type="button"
            size={size}
            variant={variant === "ghost" ? "ghost-muted" : variant}
            className={className}
          />
        }
      >
        {isCopied ? <CheckIcon className="size-3 text-primary" /> : <CopyIcon className="size-3" />}
      </TooltipTrigger>
      <TooltipPopup>
        <p>copy message</p>
      </TooltipPopup>
    </Tooltip>
  );
});
