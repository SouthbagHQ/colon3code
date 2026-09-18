import { describe, expect, it } from "vite-plus/test";

import { workingElapsedMs, workingLabelPrefix } from "./workingLabel";

describe("workingLabelPrefix", () => {
  it("starts with the short label", () => {
    expect(workingLabelPrefix(0)).toBe("working on it…");
    expect(workingLabelPrefix(29_999)).toBe("working on it…");
  });

  it("switches at 30s", () => {
    expect(workingLabelPrefix(30_000)).toBe("still going, purr…");
    expect(workingLabelPrefix(119_999)).toBe("still going, purr…");
  });

  it("switches at 2m", () => {
    expect(workingLabelPrefix(120_000)).toBe("this one's chunky, hang tight…");
    expect(workingLabelPrefix(599_999)).toBe("this one's chunky, hang tight…");
  });

  it("switches at 10m", () => {
    expect(workingLabelPrefix(600_000)).toBe("deep in it, still going…");
    expect(workingLabelPrefix(60 * 60_000)).toBe("deep in it, still going…");
  });

  it("treats negative or invalid elapsed time as just started", () => {
    expect(workingLabelPrefix(-5_000)).toBe("working on it…");
    expect(workingLabelPrefix(Number.NaN)).toBe("working on it…");
  });
});

describe("workingElapsedMs", () => {
  const now = Date.parse("2026-01-01T00:10:00.000Z");

  it("measures from the start timestamp", () => {
    expect(workingElapsedMs("2026-01-01T00:08:48.000Z", now)).toBe(72_000);
  });

  it("clamps future starts to zero", () => {
    expect(workingElapsedMs("2026-01-01T00:11:00.000Z", now)).toBe(0);
  });

  it("treats unparseable timestamps as zero", () => {
    expect(workingElapsedMs("not-a-date", now)).toBe(0);
  });
});
