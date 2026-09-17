import { describe, expect, it } from "vite-plus/test";

import { openOnHostLabel } from "./pullRequestLinkContextMenu";

describe("pull request link context menu", () => {
  it("names every host it knows, and says nothing false about one it does not", () => {
    expect(openOnHostLabel("github")).toBe("open on GitHub");
    expect(openOnHostLabel("gitlab")).toBe("open on GitLab");
    expect(openOnHostLabel("bitbucket")).toBe("open on Bitbucket");
    expect(openOnHostLabel("azure-devops")).toBe("open on Azure DevOps");
    expect(openOnHostLabel("something-else")).toBe("open on host");
  });
});
