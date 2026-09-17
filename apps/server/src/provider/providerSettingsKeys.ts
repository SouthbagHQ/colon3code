/**
 * Maps built-in driver kinds to their legacy `ServerSettings.providers.<key>`
 * slot. Every driver before Southbag Code used its kind slug as the key
 * verbatim (`codex`, `claudeAgent`, …); `southbag-code` is the first slug with
 * a dash, which is not a valid identifier-style settings key, so its settings
 * live under `providers.southbagCode`.
 *
 * @module provider/providerSettingsKeys
 */
import { ProviderDriverKind, type ServerSettings } from "@t3tools/contracts";

export type LegacyProviderSettingsKey = keyof ServerSettings["providers"];

const LEGACY_KEY_BY_DRIVER_KIND: Readonly<Partial<Record<string, LegacyProviderSettingsKey>>> = {
  "southbag-code": "southbagCode",
};

const DRIVER_KIND_BY_LEGACY_KEY: Readonly<Record<string, ProviderDriverKind>> = Object.fromEntries(
  Object.entries(LEGACY_KEY_BY_DRIVER_KIND).flatMap(([driverKind, key]) =>
    key === undefined ? [] : [[key, ProviderDriverKind.make(driverKind)] as const],
  ),
);

/** `providers.<key>` slot for a driver kind; the kind itself for every driver without a mapping. */
export function legacyProviderSettingsKeyForDriver(
  driverKind: ProviderDriverKind,
): LegacyProviderSettingsKey {
  return LEGACY_KEY_BY_DRIVER_KIND[driverKind] ?? (driverKind as LegacyProviderSettingsKey);
}

/** Driver kind (and default instance id) for a `providers.<key>` slot. */
export function driverKindForLegacyProviderSettingsKey(key: string): ProviderDriverKind {
  return DRIVER_KIND_BY_LEGACY_KEY[key] ?? ProviderDriverKind.make(key);
}
