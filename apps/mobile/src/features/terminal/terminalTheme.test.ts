import { describe, expect, it } from "vite-plus/test";
import { BUILT_IN_THEMES, getThemeColorsForAppearance } from "@t3tools/shared/themePalettes";

import { themeColorToNativeColor } from "../../lib/mobileTheme";

import { buildGhosttyThemeConfig, getMobileTerminalTheme } from "./terminalTheme";

describe("getMobileTerminalTheme", () => {
  it("gives the default theme the :3 terminal palette, like desktop", () => {
    const colon3 = getMobileTerminalTheme("colon3", "dark");
    expect(getMobileTerminalTheme("colon3-code", "dark")).toEqual(colon3);
    expect(getMobileTerminalTheme("colon3-code", "light")).toEqual(
      getMobileTerminalTheme("colon3", "light"),
    );
  });

  it("keeps the Pierre palette for Material You", () => {
    expect(getMobileTerminalTheme("material-you", "dark")).toMatchObject({
      background: "#0a0a0a",
      foreground: "#adadb1",
      cursorForeground: "#009fff",
      cursorBackground: "#0a0a0a",
    });
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
    const config = buildGhosttyThemeConfig(getMobileTerminalTheme("material-you", "dark"));

    expect(config).toContain("background = #0a0a0a");
    expect(config).toContain("foreground = #adadb1");
    expect(config).toContain("cursor-color = #009fff");
    expect(config).toContain("palette = 0=#141415");
    expect(config).toContain("palette = 15=#c6c6c8");
    expect(config.endsWith("\n")).toBe(true);
  });
});
