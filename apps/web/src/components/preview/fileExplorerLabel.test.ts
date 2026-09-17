import { describe, expect, it } from "vite-plus/test";

import {
  revealInFileExplorerLabel,
  revealInFileExplorerLabelForKind,
  revealInFileExplorerLabelForOs,
} from "./fileExplorerLabel";

describe("revealInFileExplorerLabel", () => {
  it.each([
    ["MacIntel", "reveal in Finder"],
    ["Win32", "reveal in File Explorer"],
    ["Linux x86_64", "reveal in Files"],
  ])("maps %s to %s", (platform, expected) => {
    expect(revealInFileExplorerLabel(platform)).toBe(expected);
  });
});

describe("revealInFileExplorerLabelForOs", () => {
  it.each([
    ["darwin", "reveal in Finder"],
    ["windows", "reveal in File Explorer"],
    ["linux", "reveal in Files"],
    ["unknown", "reveal in Files"],
  ] as const)("maps %s to %s", (os, expected) => {
    expect(revealInFileExplorerLabelForOs(os)).toBe(expected);
  });
});

describe("revealInFileExplorerLabelForKind", () => {
  it.each([
    ["finder", "reveal in Finder"],
    ["file-explorer", "reveal in File Explorer"],
    ["files", "reveal in Files"],
  ] as const)("maps %s to %s", (kind, expected) => {
    expect(revealInFileExplorerLabelForKind(kind)).toBe(expected);
  });
});
