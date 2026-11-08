import {
  CAT_FACE_GLYPHS,
  catFaceGlyph,
  type CatFaceExpression,
} from "@t3tools/client-runtime/catFace";
import type { ComponentProps } from "react";

import { Colon3Wordmark } from "./Colon3Wordmark";
import { cn } from "~/lib/utils";

/**
 * The app's face. `happy`/`sad` are the brand mark SVG (sad is mirrored, "3:");
 * other expressions are text glyphs; `text` forces glyphs for dense rows.
 * Static by design: swap the expression to react to state, never animate it.
 */
export type { CatFaceExpression };
export { catFaceGlyph };

export function CatFace({
  expression,
  text = false,
  className,
  ...props
}: {
  readonly expression: CatFaceExpression;
  readonly text?: boolean;
} & Omit<ComponentProps<"span">, "children">) {
  if (!text && (expression === "happy" || expression === "sad")) {
    return (
      <span
        {...props}
        className={cn("inline-flex shrink-0 items-center justify-center", className)}
      >
        <Colon3Wordmark
          className={cn("size-full", expression === "sad" && "-scale-x-100")}
          aria-hidden
        />
      </span>
    );
  }
  return (
    <span
      {...props}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center font-sans font-bold leading-none whitespace-nowrap",
        className,
      )}
      aria-hidden
    >
      {CAT_FACE_GLYPHS[expression]}
    </span>
  );
}
