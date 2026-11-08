import { DEFAULT_HOSTED_APP_URL } from "@t3tools/shared/connectAuth";
import { afterEach, expect, it, vi } from "vite-plus/test";

import appleAppSiteAssociation from "../web/public/.well-known/apple-app-site-association.json";
import assetLinks from "../web/public/.well-known/assetlinks.json";

// Keep config parsing independent of local env files and build credentials.
vi.mock("../../scripts/lib/public-config.ts", () => ({
  loadRepoEnv: () => ({ APP_VARIANT: process.env.APP_VARIANT }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
});

async function loadConfig(variant: string | undefined) {
  vi.resetModules();
  vi.stubEnv("APP_VARIANT", variant);
  return (await import("./app.config.ts")).default;
}

it.each(["prod", ""])("rejects APP_VARIANT=%j before selecting production IDs", async (value) => {
  await expect(loadConfig(value)).rejects.toThrow(
    "APP_VARIANT must be development, preview, or production.",
  );
});

// Production Android ships under the fork's own package; iOS keeps the inherited bundle id.
it.each([
  [undefined, "com.t3tools.colon3code", "cc.southbag.colon3code"],
  ["development", "com.t3tools.colon3code.dev", "com.t3tools.colon3code.dev"],
  ["preview", "com.t3tools.colon3code.preview", "com.t3tools.colon3code.preview"],
  ["production", "com.t3tools.colon3code", "cc.southbag.colon3code"],
])(
  "keeps the iOS and Android identifiers for APP_VARIANT=%j",
  async (value, identifier, androidPackage) => {
    const config = await loadConfig(value);
    expect(config.ios?.bundleIdentifier).toBe(identifier);
    expect(config.android?.package).toBe(androidPackage);
    // Copied thread links open this app only while app.t3.codes lists it.
    const host = new URL(DEFAULT_HOSTED_APP_URL).host;
    expect(config.ios?.associatedDomains).toContain(`applinks:${host}`);
    expect(appleAppSiteAssociation.applinks.details[0]?.appIDs).toContain(
      `${config.ios?.appleTeamId}.${identifier}`,
    );
    expect(config.android?.intentFilters?.[0]?.data).toEqual([
      { scheme: "https", host, pathPrefix: "/threads/" },
    ]);
    // The fork's Android package is signed with its own key, which upstream's hosted
    // assetlinks.json cannot vouch for; only upstream-signed packages are listed there.
    if (!androidPackage.startsWith("cc.southbag.")) {
      expect(assetLinks.map((link) => link.target.package_name)).toContain(androidPackage);
    }
  },
);
