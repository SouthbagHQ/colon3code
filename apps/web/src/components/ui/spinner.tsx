import type { LoaderCircleIcon } from "lucide-react";
import { Colon3Wordmark } from "../Colon3Wordmark";
import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";
import "./spinner.css";

/** The :3 mark doing a gentle bounce. Same box as the lucide icon it replaced (24px by default). */
function Spinner({
  className,
  size = 24,
  color = "currentColor",
  ...props
}: React.ComponentPropsWithoutRef<typeof LoaderCircleIcon>) {
  return (
    <Colon3Wordmark
      aria-label="loading"
      ref={observeVisibleAnimation}
      className={cn("spinner-bounce", className)}
      role="status"
      width={size}
      height={size}
      color={color}
      {...props}
    />
  );
}

export { Spinner };
