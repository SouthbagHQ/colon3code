import {
  DEFAULT_MOBILE_PALETTE_ID,
  DEFAULT_MOBILE_THEME_ID,
  getMobileThemeVariables,
  type MobileThemeAppearance,
  type MobileThemeId,
  type MobileThemeVariables,
} from "./mobileTheme";

/**
 * Complete palette for native and third-party APIs that cannot consume a
 * Uniwind className. Every palette, the default included, comes from the same
 * shared source that generates the registered CSS themes.
 */
export function getMobileThemeRuntimeVariables(
  themeId: MobileThemeId,
  appearance: MobileThemeAppearance,
): MobileThemeVariables {
  return getMobileThemeVariables(
    themeId === DEFAULT_MOBILE_THEME_ID || themeId === "material-you"
      ? DEFAULT_MOBILE_PALETTE_ID
      : themeId,
    appearance,
  );
}
