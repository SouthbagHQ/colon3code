import type { ComponentProps } from "react";

import { Colon3Wordmark } from "./Colon3Wordmark";
import { cn } from "~/lib/utils";

/**
 * The app's face. `happy` and `sad` are the brand mark (sad is the same SVG
 * mirrored, so it reads as "3:"); every other expression is a text glyph in the
 * interface font so it can sit in running copy at any size. Static by design:
 * swap the expression to react to state, never animate it.
 */
export type CatFaceExpression = "happy" | "sad" | "wink" | "working" | "dizzy" | "sleepy" | "proud";

const TEXT_GLYPHS: Record<Exclude<CatFaceExpression, "happy" | "sad">, string> = {
  wink: ";3",
  working: ">:3",
  dizzy: "x3",
  sleepy: "-w-",
  proud: "^w^",
};

export function CatFace({
  expression,
  className,
  ...props
}: { readonly expression: CatFaceExpression } & Omit<ComponentProps<"span">, "children">) {
  if (expression === "happy" || expression === "sad") {
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
      {TEXT_GLYPHS[expression]}
    </span>
  );
}
