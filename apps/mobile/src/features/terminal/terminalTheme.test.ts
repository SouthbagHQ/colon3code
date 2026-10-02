import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN_THEMES, getThemeColorsForAppearance } from "@t3tools/shared/themePalettes";

import { themeColorToNativeColor } from "../../lib/mobileTheme";

import { buildGhosttyThemeConfig, getMobileTerminalTheme } from "./terminalTheme";

describe("getMobileTerminalTheme", () => {
  it("gives the default theme the :3 terminal palette, like desktop", () => {
    expect(getMobileTerminalTheme("colon3-code", "dark")).toEqual(
      getMobileTerminalTheme("colon3", "dark"),
    );
    expect(getMobileTerminalTheme("colon3-code", "light")).toEqual(
      getMobileTerminalTheme("colon3", "light"),
    );
  });

  it("falls back to the default palette for Material You", () => {
    expect(getMobileTerminalTheme("material-you", "dark")).toEqual(
      getMobileTerminalTheme("colon3-code", "dark"),
    );
  });

  it("applies the selected palette without replacing ANSI status colors", () => {
    const standard = getMobileTerminalTheme("material-you", "dark");
    const ocean = getMobileTerminalTheme("ocean", "dark");

    expect(ocean.background).not.toBe(standard.background);
    expect(ocean.cursorForeground).not.toBe(standard.cursorForeground);
    expect(ocean.palette).toEqual(standard.palette);
  });

  it("uses the canonical desktop terminal roles for built-in themes", () => {
    const theme = BUILT_IN_THEMES.find((candidate) => candidate.id === "ocean")!;
    const colors = getThemeColorsForAppearance(theme, "dark")!;
    const terminal = getMobileTerminalTheme("ocean", "dark");

    expect(terminal.background).toBe(themeColorToNativeColor(colors.terminalBackground));
    expect(terminal.foreground).toBe(themeColorToNativeColor(colors.terminalForeground));
    expect(terminal.cursorForeground).toBe(themeColorToNativeColor(colors.terminalCursor));
  });
});

describe("buildGhosttyThemeConfig", () => {
  it("serializes theme colors into a ghostty config file", () => {
    const theme = getMobileTerminalTheme("material-you", "dark");
    const config = buildGhosttyThemeConfig(theme);

    expect(config).toContain(`background = ${theme.background}`);
    expect(config).toContain(`foreground = ${theme.foreground}`);
    expect(config).toContain(`cursor-color = ${theme.cursorForeground}`);
    expect(config).toContain(`palette = 0=${theme.palette[0]}`);
    expect(config).toContain(`palette = 15=${theme.palette[15]}`);
    expect(config.endsWith("\n")).toBe(true);
  });
});
