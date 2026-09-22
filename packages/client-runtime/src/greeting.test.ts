import { describe, expect, it } from "vite-plus/test";

import { greeting } from "./greeting.ts";

// Local-time constructor so the bucket never depends on the machine timezone.
const at = (hour: number) => new Date(2026, 0, 15, hour);

describe("greeting", () => {
  it.each([
    [5, "good morning, mrrp", "happy"],
    [8, "good morning, mrrp", "happy"],
    [11, "good morning, mrrp", "happy"],
    [12, "good afternoon :3", "happy"],
    [14, "good afternoon :3", "happy"],
    [16, "good afternoon :3", "happy"],
    [17, "good evening, purr", "happy"],
    [19, "good evening, purr", "happy"],
    [21, "good evening, purr", "happy"],
    [22, "late one, mrrp", "sleepy"],
    [0, "late one, mrrp", "sleepy"],
    [4, "late one, mrrp", "sleepy"],
  ])("at %i o'clock says %j", (hour, text, expression) => {
    expect(greeting(at(hour))).toEqual({ text, expression });
  });

  it("switches buckets on the hour, not on the minute", () => {
    expect(greeting(new Date(2026, 0, 15, 11, 59, 59)).text).toBe("good morning, mrrp");
    expect(greeting(new Date(2026, 0, 15, 12, 0, 0)).text).toBe("good afternoon :3");
    expect(greeting(new Date(2026, 0, 15, 4, 59, 59)).text).toBe("late one, mrrp");
    expect(greeting(new Date(2026, 0, 15, 5, 0, 0)).text).toBe("good morning, mrrp");
  });
});
