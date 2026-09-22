import { describe, expect, it } from "vite-plus/test";

import { resolveDocumentTitle } from "./documentTitle";

const appName = ":3 Code";

describe("resolveDocumentTitle", () => {
  it("falls back to the plain app name without an active thread", () => {
    expect(resolveDocumentTitle({ appName, status: null, recentlyCompleted: false })).toBe(
      ":3 Code",
    );
  });

  it("stays plain for an idle thread that did not just finish", () => {
    expect(resolveDocumentTitle({ appName, status: "ready", recentlyCompleted: false })).toBe(
      ":3 Code",
    );
  });

  it("labels each live status with its face", () => {
    expect(resolveDocumentTitle({ appName, status: "working", recentlyCompleted: false })).toBe(
      ">:3 working · :3 Code",
    );
    expect(resolveDocumentTitle({ appName, status: "approval", recentlyCompleted: false })).toBe(
      "owo needs you · :3 Code",
    );
    expect(resolveDocumentTitle({ appName, status: "input", recentlyCompleted: false })).toBe(
      "owo needs you · :3 Code",
    );
    expect(resolveDocumentTitle({ appName, status: "failed", recentlyCompleted: false })).toBe(
      "3: failed · :3 Code",
    );
    expect(resolveDocumentTitle({ appName, status: "monitoring", recentlyCompleted: false })).toBe(
      "o.o watching · :3 Code",
    );
  });

  it("shows done only for a ready thread that just finished", () => {
    expect(resolveDocumentTitle({ appName, status: "ready", recentlyCompleted: true })).toBe(
      "^w^ done · :3 Code",
    );
    expect(resolveDocumentTitle({ appName, status: "working", recentlyCompleted: true })).toBe(
      ">:3 working · :3 Code",
    );
  });

  it("keeps the resolved app name as the suffix", () => {
    expect(
      resolveDocumentTitle({
        appName: ":3 Code (Nightly)",
        status: "working",
        recentlyCompleted: false,
      }),
    ).toBe(">:3 working · :3 Code (Nightly)");
  });
});
