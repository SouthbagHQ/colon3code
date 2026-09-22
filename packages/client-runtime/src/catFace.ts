/**
 * The app's face as text, shared by web and mobile so a status reads the
 * same glyph everywhere it surfaces. Web wraps this in the `CatFace`
 * component, which swaps `happy` and `sad` for the brand mark where there is
 * room; mobile and plain strings (tab title, list rows) use the glyphs directly.
 */
export type CatFaceExpression =
  | "happy"
  | "sad"
  | "wink"
  | "working"
  | "curious"
  | "watching"
  | "dizzy"
  | "sleepy"
  | "proud";

export const CAT_FACE_GLYPHS: Record<CatFaceExpression, string> = {
  happy: ":3",
  sad: "3:",
  wink: ";3",
  working: ">:3",
  curious: "owo",
  watching: "o.o",
  dizzy: "x3",
  sleepy: "-w-",
  proud: "^w^",
};

export function catFaceGlyph(expression: CatFaceExpression): string {
  return CAT_FACE_GLYPHS[expression];
}
