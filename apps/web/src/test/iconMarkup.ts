import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconComponent } from "~/icons";

/**
 * The glyph's first path, so a test can assert which icon rendered without
 * depending on the class or size the call site added. Render the component
 * under test without an IconContext so both sides use the same weight.
 */
export function iconPath(Icon: IconComponent): string {
  const match = /d="([^"]+)"/.exec(renderToStaticMarkup(createElement(Icon)));
  if (!match) throw new Error("icon rendered no path");
  return `d="${match[1]}"`;
}
