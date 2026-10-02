import type { SVGProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Colon3Wordmark } from "../Colon3Wordmark";
import { observeVisibleAnimation } from "~/lib/visibleAnimation";
import { cn } from "~/lib/utils";

// No default size: inside a Button the parent's svg rule sizes the glyph.
const spinnerVariants = cva("spinner-bounce", {
  variants: {
    size: {
      xs: "size-3",
      sm: "size-3.5",
      md: "size-4",
      lg: "size-5",
    },
    tone: {
      current: "",
      muted: "text-muted-foreground",
    },
  },
  defaultVariants: { tone: "current" },
});

/** The :3 mark doing a gentle bounce, in the same box as the lucide spinner it replaced. */
function Spinner({
  className,
  size,
  tone,
  ...props
}: SVGProps<SVGSVGElement> & VariantProps<typeof spinnerVariants>) {
  return (
    <Colon3Wordmark
      aria-label="loading"
      ref={observeVisibleAnimation}
      className={cn(spinnerVariants({ size, tone }), className)}
      role="status"
      {...props}
    />
  );
}

export { Spinner };
