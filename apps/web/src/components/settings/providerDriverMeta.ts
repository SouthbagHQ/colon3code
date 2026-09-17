import {
  AntigravitySettings,
  ClaudeSettings,
  CodexSettings,
  CursorSettings,
  GrokSettings,
  OpenCodeSettings,
  ProviderDriverKind,
  SOUTHBAG_CODE_DRIVER_KIND,
  SouthbagCodeSettings,
  providerDisplayName,
} from "@t3tools/contracts";
import type * as Schema from "effect/Schema";
import {
  AntigravityIcon,
  ClaudeAI,
  CursorIcon,
  GrokIcon,
  type Icon,
  OpenAI,
  OpenCodeIcon,
  SouthbagCodeIcon,
} from "../Icons";

type ProviderSettingsSchema = {
  readonly fields: Readonly<Record<string, Schema.Top>>;
} & Schema.Top;

/**
 * Browser-safe provider definition. This is deliberately shaped like the
 * future provider package client export: the core web app gets a schema with
 * field annotations plus provider-level presentation metadata, then renders
 * settings generically.
 */
export interface ProviderClientDefinition {
  readonly value: ProviderDriverKind;
  readonly label: string;
  readonly icon: Icon;
  readonly settingsSchema: ProviderSettingsSchema;
  /**
   * Optional short label rendered as a `variant="warning"` badge next to
   * the instance title. Used to flag drivers that still ship under an
   * early-access or preview gate — the flag is a property of the driver
   * kind (not a specific instance), so every instance of that driver —
   * built-in default or custom — advertises the same marker.
   */
  readonly badgeLabel?: string;
  /** Short lowercase blurb shown where the driver is introduced. */
  readonly description?: string;
  /** Project page for the driver's CLI. */
  readonly docsUrl?: string;
  /** Terminal command that installs the driver's CLI. */
  readonly installCommand?: string;
}

const PROVIDER_CLIENT_DEFINITIONS: readonly ProviderClientDefinition[] = [
  // First so a fresh install lands on it: the server lists the driver first
  // too, and new threads pick the first picker-ready provider.
  {
    value: SOUTHBAG_CODE_DRIVER_KIND,
    label: "Southbag Code",
    icon: SouthbagCodeIcon,
    description:
      "kevin is watching. a pi-flavoured agent that writes code only slightly slower than kevin :3",
    docsUrl: "https://github.com/SouthbagHQ/code",
    installCommand: "npm i -g @southbag/code",
    settingsSchema: SouthbagCodeSettings,
  },
  {
    value: ProviderDriverKind.make("codex"),
    label: providerDisplayName(ProviderDriverKind.make("codex")),
    icon: OpenAI,
    settingsSchema: CodexSettings,
  },
  {
    value: ProviderDriverKind.make("claudeAgent"),
    label: providerDisplayName(ProviderDriverKind.make("claudeAgent")),
    icon: ClaudeAI,
    settingsSchema: ClaudeSettings,
  },
  {
    value: ProviderDriverKind.make("cursor"),
    label: providerDisplayName(ProviderDriverKind.make("cursor")),
    icon: CursorIcon,
    badgeLabel: "early access",
    settingsSchema: CursorSettings,
  },
  {
    value: ProviderDriverKind.make("grok"),
    label: providerDisplayName(ProviderDriverKind.make("grok")),
    icon: GrokIcon,
    badgeLabel: "early access",
    settingsSchema: GrokSettings,
  },
  {
    value: ProviderDriverKind.make("opencode"),
    label: providerDisplayName(ProviderDriverKind.make("opencode")),
    icon: OpenCodeIcon,
    settingsSchema: OpenCodeSettings,
  },
  {
    value: ProviderDriverKind.make("antigravity"),
    label: providerDisplayName(ProviderDriverKind.make("antigravity")),
    icon: AntigravityIcon,
    settingsSchema: AntigravitySettings,
  },
];

const PROVIDER_CLIENT_DEFINITION_BY_VALUE: Partial<
  Record<ProviderDriverKind, ProviderClientDefinition>
> = Object.fromEntries(
  PROVIDER_CLIENT_DEFINITIONS.map((definition) => [definition.value, definition]),
);

export const DRIVER_OPTIONS = PROVIDER_CLIENT_DEFINITIONS;
export const DRIVER_OPTION_BY_VALUE = PROVIDER_CLIENT_DEFINITION_BY_VALUE;
export type DriverOption = ProviderClientDefinition;

/**
 * Look up the driver metadata for an instance's `driver` field. Accepts
 * Returns `undefined` for fork / unknown drivers so callers can decide how
 * to render them — typically by falling back to a generic card.
 */
export function getDriverOption(driver: ProviderDriverKind | undefined): DriverOption | undefined {
  if (driver === undefined) return undefined;
  return PROVIDER_CLIENT_DEFINITION_BY_VALUE[driver];
}
