import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { IconComponent } from "~/icons";

/**
 * The glyph's first path, so a test can assert which icon rendered without
 * depending on the class or size the call site added.
 */
export function iconPath(Icon: IconComponent): string {
  const match = /d="([^"]+)"/.exec(renderToStaticMarkup(createElement(Icon)));
  if (!match) throw new Error("icon rendered no path");
  return `d="${match[1]}"`;
}
