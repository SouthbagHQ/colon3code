import { describe, expect, it } from "vite-plus/test";

import {
  COMPOSER_PLACEHOLDERS,
  composerPlaceholderFor,
  DISCONNECTED_COMPOSER_PLACEHOLDER,
} from "./composerPlaceholder.ts";

describe("composerPlaceholderFor", () => {
  const seeds = Array.from({ length: 40 }, (_, index) => `thread-${index}`);

  it("is stable for the same seed", () => {
    for (const seed of seeds) {
      expect(composerPlaceholderFor(seed)).toBe(composerPlaceholderFor(seed));
    }
  });

  it("always picks from the list", () => {
    for (const seed of [...seeds, ""]) {
      expect(COMPOSER_PLACEHOLDERS).toContain(composerPlaceholderFor(seed));
    }
  });

  it("spreads different seeds across the list", () => {
    const picked = new Set(seeds.map(composerPlaceholderFor));
    expect(picked.size).toBe(COMPOSER_PLACEHOLDERS.length);
  });

  it("keeps the disconnected copy in the rotation", () => {
    expect(COMPOSER_PLACEHOLDERS).toContain(DISCONNECTED_COMPOSER_PLACEHOLDER);
  });
});
