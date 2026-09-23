import { describe, expect, it } from "vite-plus/test";

import { getMobileThemeVariables } from "./mobileTheme";
import { getMobileThemeRuntimeVariables } from "./mobileThemeVariables";

describe("mobile theme runtime variables", () => {
  it("gives the default theme the :3 palette web and desktop default to", () => {
    expect(getMobileThemeRuntimeVariables("colon3-code", "light")).toEqual(
      getMobileThemeVariables("colon3", "light"),
    );
    expect(getMobileThemeRuntimeVariables("colon3-code", "dark")).toEqual(
      getMobileThemeVariables("colon3", "dark"),
    );
  });

  it("uses the same shared palette source as generated custom themes", () => {
    expect(getMobileThemeRuntimeVariables("ocean", "light")).toEqual(
      getMobileThemeVariables("ocean", "light"),
    );
    expect(getMobileThemeRuntimeVariables("iris", "dark")).toEqual(
      getMobileThemeVariables("iris", "dark"),
    );
  });
});
