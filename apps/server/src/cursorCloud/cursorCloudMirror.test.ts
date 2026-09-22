import { describe, expect, it } from "@effect/vitest";
import { cursorCloudThreadId } from "@t3tools/contracts";

import type { CursorCloudAgent, CursorCloudRun } from "./CursorCloudApi.ts";
import {
  buildCursorCloudMirrorPlan,
  cursorCloudRepositoryKeys,
  matchCursorCloudProject,
} from "./cursorCloudMirror.ts";

const agent = (overrides: Partial<CursorCloudAgent> = {}): CursorCloudAgent => ({
  id: "bc-00000000-0000-0000-0000-000000000001",
  name: "Add a README",
  status: "ACTIVE",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:30:00.000Z",
  repos: [{ url: "https://github.com/SouthbagHQ/colon3code" }],
  ...overrides,
});

const run = (overrides: Partial<CursorCloudRun> = {}): CursorCloudRun => ({
  id: "run-1",
  agentId: "bc-00000000-0000-0000-0000-000000000001",
  status: "FINISHED",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:10:00.000Z",
  ...overrides,
});

describe("cursorCloudRepositoryKeys", () => {
  it("normalizes configured repository URLs the way project identities are normalized", () => {
    expect(
      cursorCloudRepositoryKeys({
        agent: agent({ repos: [{ url: "https://github.com/SouthbagHQ/Colon3Code.git" }] }),
        runs: [],
      }),
    ).toEqual(["github.com/southbaghq/colon3code"]);
  });

  it("falls back to the repositories the agent pushed to", () => {
    expect(
      cursorCloudRepositoryKeys({
        agent: agent({ repos: undefined }),
        runs: [run({ git: { branches: [{ repoUrl: "github.com/SouthbagHQ/colon3code" }] } })],
      }),
    ).toEqual(["github.com/southbaghq/colon3code"]);
  });

  it("keeps configured repositories ahead of pushed ones and drops duplicates", () => {
    expect(
      cursorCloudRepositoryKeys({
        agent: agent({ repos: [{ url: "https://github.com/acme/api" }] }),
        runs: [
          run({
            git: {
              branches: [{ repoUrl: "github.com/acme/api" }, { repoUrl: "github.com/acme/web" }],
            },
          }),
        ],
      }),
    ).toEqual(["github.com/acme/api", "github.com/acme/web"]);
  });
});

describe("buildCursorCloudMirrorPlan", () => {
  const threadId = cursorCloudThreadId("bc-00000000-0000-0000-0000-000000000001");

  it("replays runs oldest first and titles the thread from the agent name", () => {
    const plan = buildCursorCloudMirrorPlan({
      agent: agent(),
      runs: [
        run({ id: "run-2", result: "Also added troubleshooting steps" }),
        run({ id: "run-1", result: "Added README.md" }),
      ],
    });

    expect(plan.threadId).toBe(threadId);
    expect(plan.title).toBe("Add a README");
    expect(plan.messages.map((message) => message.text)).toEqual([
      "Added README.md",
      "Also added troubleshooting steps",
    ]);
    expect(plan.messages.map((message) => message.messageId)).toEqual([
      `${threadId}:run:run-1`,
      `${threadId}:run:run-2`,
    ]);
  });

  it("treats a creating or running latest run as live work", () => {
    expect(
      buildCursorCloudMirrorPlan({ agent: agent(), runs: [run({ status: "RUNNING" })] }).activity,
    ).toBe("running");
    expect(
      buildCursorCloudMirrorPlan({ agent: agent(), runs: [run({ status: "CREATING" })] }).activity,
    ).toBe("running");
    expect(buildCursorCloudMirrorPlan({ agent: agent(), runs: [run()] }).activity).toBe("settled");
    expect(buildCursorCloudMirrorPlan({ agent: agent(), runs: [] }).activity).toBe("settled");
  });

  it("notes a terminal run that produced no reply so the thread is not silently empty", () => {
    const plan = buildCursorCloudMirrorPlan({
      agent: agent(),
      runs: [run({ status: "ERROR" })],
    });
    expect(plan.messages).toHaveLength(1);
    expect(plan.messages[0]?.text).toContain("error");
  });

  it("records the pull request the agent opened once, preferring it over the branch", () => {
    const branches = [
      {
        repoUrl: "github.com/acme/api",
        branch: "cursor/readme-a1b2",
        prUrl: "https://github.com/acme/api/pull/7",
      },
    ];
    const plan = buildCursorCloudMirrorPlan({
      agent: agent(),
      runs: [
        run({ id: "run-2", result: "Follow-up done", git: { branches } }),
        run({ id: "run-1", result: "Added README.md", git: { branches } }),
      ],
    });

    const prMessages = plan.messages.filter((message) => message.text.includes("pull request"));
    expect(prMessages).toHaveLength(1);
    expect(prMessages[0]?.text).toContain("https://github.com/acme/api/pull/7");
  });

  it("falls back to a derived title when Cursor has not named the agent", () => {
    expect(buildCursorCloudMirrorPlan({ agent: agent({ name: undefined }), runs: [] }).title).toBe(
      "Cursor Cloud agent 00000000",
    );
  });
});

describe("matchCursorCloudProject", () => {
  const projects = [
    { id: "p1", repositoryKey: "github.com/acme/api" },
    { id: "p2", repositoryKey: null },
    { id: "p3", repositoryKey: "github.com/acme/web" },
  ];

  it("matches the agent's first repository that a project shares", () => {
    expect(matchCursorCloudProject(["github.com/acme/web"], projects)?.id).toBe("p3");
    expect(
      matchCursorCloudProject(["github.com/acme/none", "github.com/acme/api"], projects)?.id,
    ).toBe("p1");
  });

  it("returns null when no project shares any of the agent's repositories", () => {
    expect(matchCursorCloudProject(["github.com/acme/none"], projects)).toBeNull();
    expect(matchCursorCloudProject([], projects)).toBeNull();
  });
});
