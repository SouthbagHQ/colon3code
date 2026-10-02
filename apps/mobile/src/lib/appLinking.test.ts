import { describe, expect, it } from "vite-plus/test";

import { shouldHandleAppLink } from "./appLinking";

describe("shouldHandleAppLink", () => {
  it.each(["colon3code://", "colon3code:///", "colon3code-dev://", "colon3code-preview://"])(
    "ignores scheme-only URL %s",
    (url) => {
      expect(shouldHandleAppLink(url)).toBe(false);
    },
  );

  it.each([
    "colon3code://threads/env-1/thread-1",
    "colon3code://pair?pairingUrl=x",
    "colon3code-dev://settings/usage?tab=limits",
  ])("handles path-bearing URL %s", (url) => {
    expect(shouldHandleAppLink(url)).toBe(true);
  });

  it.each(["colon3code://expo-development-client/?url=x", "colon3code://expo-sharing/anything"])(
    "ignores lifecycle URL %s",
    (url) => {
      expect(shouldHandleAppLink(url)).toBe(false);
    },
  );
});
