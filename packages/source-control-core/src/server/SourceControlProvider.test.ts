import { assert, it } from "@effect/vitest";

import {
  repositoryPathFromRemoteUrl,
  transportSafeSourceControlErrorValue,
} from "./SourceControlProvider.ts";

it("removes URL credentials, query parameters, and fragments from error transport values", () => {
  assert.strictEqual(
    transportSafeSourceControlErrorValue(
      "https://user:secret@example.test/org/repo/pull/42?token=secret#discussion",
    ),
    "https://example.test/org/repo/pull/42",
  );
});

it.each([
  ["git@github.com:SouthbagHQ/colon3code.git", "SouthbagHQ/colon3code"],
  ["github.com:SouthbagHQ/colon3code.git", "SouthbagHQ/colon3code"],
  ["gitlab.com:T3Tools/platform/colon3code", "T3Tools/platform/colon3code"],
  ["https://github.com/SouthbagHQ/colon3code.git", "SouthbagHQ/colon3code"],
  ["C:/repos/colon3code", null],
])("reads the repository path of %s", (remoteUrl, expected) => {
  assert.strictEqual(repositoryPathFromRemoteUrl(remoteUrl), expected);
});
