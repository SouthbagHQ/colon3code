import { type ProviderDriverKind, SOUTHBAG_CODE_DRIVER_KIND } from "@t3tools/contracts";

export { providerClients } from "@t3tools/client-runtime/provider-clients";

/**
 * Install hints for drivers whose CLI the user installs themselves. Upstream's
 * provider client definitions don't carry these, so the fork keeps them here
 * for the provider card's setup notes.
 */
export interface ProviderDriverInstallHint {
  readonly description?: string;
  readonly docsUrl?: string;
  readonly installCommand?: string;
}

export const PROVIDER_DRIVER_INSTALL_HINTS: Partial<
  Record<ProviderDriverKind, ProviderDriverInstallHint>
> = {
  [SOUTHBAG_CODE_DRIVER_KIND]: {
    description:
      "kevin is watching. a pi-flavoured agent that writes code only slightly slower than kevin :3",
    docsUrl: "https://github.com/SouthbagHQ/code",
    installCommand: "npm i -g @southbag/code",
  },
};
