import { describe, expect, it } from "vite-plus/test";

import { readDefaultMobileThemeVariables } from "./mobileTheme.test-support";
import {
  DEFAULT_MOBILE_THEME_ID,
  getMobileThemeVariables,
  MOBILE_THEME_IDS,
  themeColorWithAlpha,
} from "./mobileTheme";
import { getMobileThemeRuntimeVariables } from "./mobileThemeVariables";

describe("mobile theme runtime variables", () => {
  it("matches the standard base palette to the generated stylesheet", () => {
    expect(getMobileThemeRuntimeVariables("colon3-code", "light", "web")).toEqual(
      readDefaultMobileThemeVariables("light"),
    );
    expect(getMobileThemeRuntimeVariables("colon3-code", "dark", "web")).toEqual(
      readDefaultMobileThemeVariables("dark"),
    );
  });

  it("uses the same shared palette source as generated custom themes", () => {
    expect(getMobileThemeRuntimeVariables("ocean", "light", "ios")).toEqual(
      getMobileThemeVariables("ocean", "light"),
    );
    expect(getMobileThemeRuntimeVariables("iris", "dark", "ios")).toEqual(
      getMobileThemeVariables("iris", "dark"),
    );
  });

  it.each(MOBILE_THEME_IDS)(
    "keeps %s colors on Android with an opaque Material frame",
    (themeId) => {
      for (const appearance of ["light", "dark"] as const) {
        const base = getMobileThemeVariables(
          themeId === "material-you" ? "colon3-code" : themeId,
          appearance,
        );
        const android = getMobileThemeRuntimeVariables(themeId, appearance, "android");
        expect(android).toEqual({
          ...base,
          "--color-header": themeColorWithAlpha(
            base[
              themeId === "colon3-code" || themeId === "material-you"
                ? "--color-row-hover"
                : "--color-drawer"
            ],
            1,
          ),
          "--color-header-foreground": base["--color-drawer-foreground"],
        });
        expect(android["--color-header"]).toMatch(/^rgba\(\d+, \d+, \d+, 1\)$/);
      }
    },
  );

  it.each(["colon3-code", "material-you"] as const)(
    "keeps the %s default Material frame distinct in both appearances",
    (themeId) => {
      for (const appearance of ["light", "dark"] as const) {
        const variables = getMobileThemeRuntimeVariables(themeId, appearance, "android");
        // The frame is the default palette's row-hover tone, opaque.
        expect(variables["--color-header"]).toBe(
          themeColorWithAlpha(
            getMobileThemeVariables(DEFAULT_MOBILE_THEME_ID, appearance)["--color-row-hover"],
            1,
          ),
        );
        for (const pane of ["--color-screen", "--color-sheet-solid", "--color-drawer"] as const) {
          expect(variables["--color-header"]).not.toBe(themeColorWithAlpha(variables[pane], 1));
        }
      }
    },
  );

  it.each(["colon3-code", "material-you"] as const)(
    "adapts %s iPad chrome without reversing the dark desktop hierarchy",
    (themeId) => {
      for (const appearance of ["light", "dark"] as const) {
        const ios = getMobileThemeRuntimeVariables(themeId, appearance, "ios");
        const android = getMobileThemeRuntimeVariables(themeId, appearance, "android");
        if (appearance === "light") {
          expect(ios["--color-drawer"]).toBe(android["--color-header"]);
          expect(ios["--color-header"]).toBe(android["--color-header"]);
          expect(ios["--color-header-foreground"]).toBe(ios["--color-drawer-foreground"]);
        } else {
          expect(ios).toEqual(getMobileThemeVariables("colon3-code", appearance));
          expect(ios["--color-drawer"]).toBe(android["--color-drawer"]);
          const base = getMobileThemeVariables(DEFAULT_MOBILE_THEME_ID, appearance);
          expect(ios["--color-drawer"]).toBe(base["--color-drawer"]);
          expect(ios["--color-thread-canvas"]).toBe(base["--color-thread-canvas"]);
        }
        expect(themeColorWithAlpha(ios["--color-thread-hover"], 1)).not.toBe(
          themeColorWithAlpha(ios["--color-drawer"], 1),
        );
        expect(themeColorWithAlpha(ios["--color-thread-hover"], 1)).not.toBe(
          themeColorWithAlpha(ios["--color-thread-selected"], 1),
        );
        for (const role of [
          "--color-screen",
          "--color-thread-canvas",
          "--color-card",
          "--color-composer-surface",
          "--color-grouped-card",
        ] as const) {
          expect(ios[role]).toBe(android[role]);
        }
      }
    },
  );
});
