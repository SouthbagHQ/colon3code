export type T3McpToolLogo = "colon3-code";

export interface T3McpToolPresentation {
  readonly displayName: string;
  readonly logo: T3McpToolLogo;
}

export type T3McpToolSummaryAction =
  | "capabilities"
  | "delegate"
  | "task-status"
  | "task-cancel"
  | "schedule-run"
  | "schedule-create"
  | "schedule-list"
  | "schedule-update"
  | "schedule-delete"
  | "thread-create"
  | "thread-list"
  | "thread-read"
  | "thread-send"
  | "thread-wait"
  | "thread-interrupt"
  | "workflow-stop"
  | "background-wait"
  | "thread-configuration"
  | "thread-configure"
  | "thread-fork"
  | "thread-merge"
  | "thread-search"
  | "thread-transfers"
  | "thread-organize"
  | "thread-update"
  | "queue-list"
  | "queue-read"
  | "queue-edit"
  | "queue-cancel"
  | "queue-reorder"
  | "queue-steer"
  | "question-list"
  | "question-read"
  | "question-respond"
  | "secret-request"
  | "worktree-handoff"
  | "worktree-list"
  | "worktree-status"
  | "project-list"
  | "project-read"
  | "project-create"
  | "project-update"
  | "project-delete"
  | "project-clone"
  | "environment-read"
  | "environment-links"
  | "environment-link"
  | "environment-unlink"
  | "environment-update"
  | "attachment-prepare"
  | "attachment-discard"
  | "attachment-send"
  | "link-pr"
  | "unlink-pr"
  | "list-prs"
  | "watch-pr"
  | "unwatch-pr"
  | "write-pr-guides"
  | "read-pr-guide"
  | "browser"
  | "device"
  | "html-preview"
  | "html-render";

export interface T3McpToolDefinition {
  readonly displayName: string;
  readonly labels: readonly [action: string, running: string, completed: string, detail: string];
  readonly icon: "colon3-code" | "browser" | "device" | "pull-request";
  readonly summaryAction: T3McpToolSummaryAction;
}

function tool(
  labels: T3McpToolDefinition["labels"],
  summaryAction: T3McpToolSummaryAction,
  icon: T3McpToolDefinition["icon"] = "colon3-code",
  displayName = `${labels[0]} ${labels[3]}`,
): T3McpToolDefinition {
  return { displayName, labels, icon, summaryAction };
}

// Codex registers "colon3-code-direct" for T3 tools kept out of Code Mode.
const T3_MCP_SERVER_ALIASES = new Set([
  "colon3-code",
  "t3_code",
  "colon3code",
  "colon3-code-direct",
  "t3_code_direct",
]);

const T3_MCP_TOOLS: Readonly<Record<string, T3McpToolDefinition>> = {
  link_pull_request: tool(
    ["link", "linking", "linked", "a pull request"],
    "link-pr",
    "pull-request",
  ),
  link_pull_requests: tool(
    ["link", "linking", "linked", "pull requests"],
    "link-pr",
    "pull-request",
  ),
  unlink_pull_request: tool(
    ["unlink", "unlinking", "unlinked", "a pull request"],
    "unlink-pr",
    "pull-request",
  ),
  unlink_pull_requests: tool(
    ["unlink", "unlinking", "unlinked", "pull requests by state"],
    "unlink-pr",
    "pull-request",
  ),
  list_thread_pull_requests: tool(
    ["check", "checking", "checked", "linked pull requests"],
    "list-prs",
    "pull-request",
  ),
  watch_pull_request: tool(
    ["watch", "watching", "watching", "a pull request"],
    "watch-pr",
    "pull-request",
  ),
  unwatch_pull_request: tool(
    ["stop watching", "unwatching", "stopped watching", "a pull request"],
    "unwatch-pr",
    "pull-request",
  ),
  write_pull_request_guides: tool(
    ["write", "writing", "started writing", "review guides"],
    "write-pr-guides",
    "pull-request",
  ),
  read_pull_request_guide: tool(
    ["read", "reading", "read", "a review guide"],
    "read-pr-guide",
    "pull-request",
  ),
  orchestrator_capabilities: tool(
    ["get", "getting", "got", "orchestration capabilities"],
    "capabilities",
  ),
  delegate_task: tool(["delegate", "delegating", "delegated", "a child task"], "delegate"),
  task_status: tool(["get", "getting", "got", "delegated task status"], "task-status"),
  task_cancel: tool(
    ["cancel", "canceling", "requested cancellation of", "a delegated task"],
    "task-cancel",
  ),
  schedule_task: tool(["schedule", "scheduling", "scheduled", "a task"], "schedule-create"),
  list_scheduled_tasks: tool(["list", "listing", "listed", "scheduled tasks"], "schedule-list"),
  update_scheduled_task: tool(
    ["update", "updating", "updated", "a scheduled task"],
    "schedule-update",
  ),
  delete_scheduled_task: tool(
    ["delete", "deleting", "requested deletion of", "a scheduled task"],
    "schedule-delete",
  ),
  request_secret: tool(["ask for", "asking for", "asked for", "a secret"], "secret-request"),
  create_threads: tool(["create", "creating", "created", "T3 threads"], "thread-create"),
  t3_thread_start: tool(["start", "starting", "started", "a T3 thread"], "thread-create"),
  t3_thread_list: tool(["list", "listing", "listed", "T3 threads"], "thread-list"),
  t3_thread_read: tool(["read", "reading", "read", "a T3 thread"], "thread-read"),
  t3_thread_send: tool(["send", "sending", "sent", "to a T3 thread"], "thread-send"),
  t3_thread_wait: tool(["wait", "waiting", "waited", "for a T3 thread"], "thread-wait"),
  t3_workflow_stop: tool(
    ["stop", "stopping", "requested a stop for", "a workflow"],
    "workflow-stop",
  ),
  t3_background_wait: tool(
    ["update", "updating", "updated", "background waits"],
    "background-wait",
  ),
  t3_thread_interrupt: tool(
    ["interrupt", "interrupting", "requested an interrupt of", "a T3 thread"],
    "thread-interrupt",
  ),
  t3_worktree_handoff: tool(
    ["hand off", "handing off", "handed off", "thread to a git worktree"],
    "worktree-handoff",
  ),
  t3_worktree_status: tool(["get", "getting", "got", "thread worktree status"], "worktree-status"),
  preview_status: tool(["get", "getting", "got", "preview browser status"], "browser", "browser"),
  preview_open: tool(
    ["open", "opening", "opened", "a page in the preview browser"],
    "browser",
    "browser",
  ),
  preview_navigate: tool(
    ["navigate", "navigating", "navigated", "the preview browser"],
    "browser",
    "browser",
  ),
  preview_dialog: tool(
    ["respond", "responding", "responded", "to a preview browser dialog"],
    "browser",
    "browser",
  ),
  preview_snapshot: tool(
    ["take a snapshot of", "taking a snapshot of", "took a snapshot of", "the preview page"],
    "browser",
    "browser",
    "Snapshot the preview page",
  ),
  preview_act: tool(["use", "using", "used", "the preview browser"], "browser", "browser"),
  preview_click: tool(
    ["click", "clicking", "clicked", "in the preview browser"],
    "browser",
    "browser",
  ),
  preview_press: tool(
    ["press", "pressing", "pressed", "a key in the preview browser"],
    "browser",
    "browser",
  ),
  preview_type: tool(["type", "typing", "typed", "in the preview browser"], "browser", "browser"),
  preview_hover: tool(
    ["hover", "hovering", "hovered", "in the preview browser"],
    "browser",
    "browser",
  ),
  preview_select: tool(
    ["choose", "choosing", "chose", "an option in the preview browser"],
    "browser",
    "browser",
  ),
  preview_drag: tool(
    ["drag", "dragging", "dragged", "in the preview browser"],
    "browser",
    "browser",
  ),
  preview_upload: tool(
    ["upload", "uploading", "uploaded", "files to the preview browser"],
    "browser",
    "browser",
  ),
  preview_scroll: tool(
    ["scroll", "scrolling", "scrolled", "the preview browser"],
    "browser",
    "browser",
  ),
  preview_resize: tool(
    ["resize", "resizing", "resized", "the preview browser"],
    "browser",
    "browser",
  ),
  preview_evaluate: tool(
    ["evaluate", "evaluating", "evaluated", "script in the preview browser"],
    "browser",
    "browser",
  ),
  preview_wait_for: tool(
    ["wait", "waiting", "waited", "for the preview page"],
    "browser",
    "browser",
  ),
  preview_set_appearance: tool(
    ["set", "setting", "set", "preview browser appearance"],
    "browser",
    "browser",
  ),
  preview_recording_start: tool(
    ["start", "starting", "started", "recording the preview browser"],
    "browser",
    "browser",
  ),
  preview_recording_stop: tool(
    ["stop", "stopping", "stopped", "recording the preview browser"],
    "browser",
    "browser",
  ),
  device_list: tool(["list", "listing", "listed", "simulators and emulators"], "device", "device"),
  device_open: tool(
    ["open", "opening", "opened", "a device in the Device panel"],
    "device",
    "device",
  ),
  device_screenshot: tool(
    ["take a screenshot of", "taking a screenshot of", "took a screenshot of", "the device"],
    "device",
    "device",
  ),
  device_close: tool(["close", "closing", "closed", "a device"], "device", "device"),
  run_scheduled_task_now: tool(
    ["run", "running", "requested a run of", "a scheduled task"],
    "schedule-run",
  ),
  t3_queue: tool(["manage", "managing", "managed", "queued messages"], "queue-edit"),
  t3_pending_request: tool(
    ["handle", "handling", "handled", "pending questions"],
    "question-respond",
  ),
  t3_queue_list: tool(["list", "listing", "listed", "queued messages"], "queue-list"),
  t3_queue_read: tool(["read", "reading", "read", "a queued message"], "queue-read"),
  t3_queue_edit: tool(["edit", "editing", "edited", "a queued message"], "queue-edit"),
  t3_queue_cancel: tool(
    ["cancel", "canceling", "requested cancellation of", "a queued run"],
    "queue-cancel",
  ),
  t3_queue_reorder: tool(["reorder", "reordering", "reordered", "a queued run"], "queue-reorder"),
  t3_queue_promote_to_steer: tool(
    ["steer with", "steering with", "requested steering with", "a queued message"],
    "queue-steer",
  ),
  t3_pending_request_list: tool(
    ["list", "listing", "listed", "pending questions"],
    "question-list",
  ),
  t3_pending_request_read: tool(["read", "reading", "read", "pending questions"], "question-read"),
  t3_pending_request_respond: tool(
    ["answer", "answering", "answered", "pending questions"],
    "question-respond",
  ),
  t3_thread_configuration: tool(
    ["read", "reading", "read", "thread configuration"],
    "thread-configuration",
  ),
  t3_thread_configure: tool(["use", "using", "used", "thread model settings"], "thread-configure"),
  t3_thread_transfer: tool(["use", "using", "used", "thread transfers"], "thread-fork"),
  t3_thread_fork: tool(["fork", "forking", "requested a fork of", "this thread"], "thread-fork"),
  t3_thread_merge_back: tool(
    ["merge", "merging", "requested a merge of", "thread context"],
    "thread-merge",
  ),
  t3_thread_search: tool(["search", "searching", "searched", "thread content"], "thread-search"),
  t3_thread_transfers: tool(["read", "reading", "read", "thread transfers"], "thread-transfers"),
  t3_thread_organize: tool(["organize", "organizing", "organized", "a thread"], "thread-organize"),
  t3_thread_update: tool(["update", "updating", "updated", "T3 thread metadata"], "thread-update"),
  t3_worktree_list: tool(["list", "listing", "listed", "workspace branches"], "worktree-list"),
  t3_preview_list: tool(["list", "listing", "listed", "preview tabs"], "browser", "browser"),
  t3_preview_close: tool(["close", "closing", "closed", "a preview tab"], "browser", "browser"),
  t3_environment_read: tool(
    ["read", "reading", "read", "environment preferences"],
    "environment-read",
  ),
  t3_environment_links: tool(
    ["list", "listing", "listed", "linked environments"],
    "environment-links",
  ),
  t3_environment_link: tool(
    ["ask to link", "asking to link", "asked to link", "an environment"],
    "environment-link",
  ),
  t3_environment_unlink: tool(
    ["forget", "forgetting", "forgot", "a linked environment"],
    "environment-unlink",
  ),
  t3_environment_preferences_update: tool(
    ["update", "updating", "updated", "environment preferences"],
    "environment-update",
  ),
  t3_thread_launch: tool(["launch", "launching", "launched", "a project thread"], "thread-create"),
  t3_project_list: tool(["list", "listing", "listed", "projects"], "project-list"),
  t3_project_read: tool(["read", "reading", "read", "a project"], "project-read"),
  t3_project_create: tool(["register", "registering", "registered", "a project"], "project-create"),
  t3_project_update: tool(["update", "updating", "updated", "a project"], "project-update"),
  t3_project_delete: tool(["delete", "deleting", "deleted", "a project"], "project-delete"),
  t3_project_clone: tool(["clone", "cloning", "cloned", "a repository"], "project-clone"),
  t3_attachment_prepare_upload: tool(
    ["prepare", "preparing", "prepared", "an attachment upload"],
    "attachment-prepare",
  ),
  t3_attachment_discard: tool(
    ["discard", "discarding", "discarded", "a pending attachment"],
    "attachment-discard",
  ),
  t3_thread_send_attachments: tool(["send", "sending", "sent", "attachments"], "attachment-send"),
  html_preview: tool(["preview", "previewing", "previewed", "an HTML page"], "html-preview"),
  html_render: tool(["render", "rendering", "rendered", "an HTML page"], "html-render"),
};

export const T3_MCP_TOOL_NAMES: ReadonlySet<string> = new Set(Object.keys(T3_MCP_TOOLS));

function normalizeT3McpToolLabel(value: string): string {
  return value.replace(/\s+(?:complete|completed)\s*$/i, "").trim();
}

// Timelines resolve every work row's tool name on each update; names repeat across updates.
// ACP titles can carry whole commands, so long labels are parsed but not kept.
const toolNameCache = new Map<string, string | null>();
const TOOL_NAME_CACHE_LIMIT = 10_000;
const TOOL_NAME_CACHE_MAX_KEY_LENGTH = 256;

function resolveT3McpToolName(value: string): string | null {
  if (value.length > TOOL_NAME_CACHE_MAX_KEY_LENGTH) return parseT3McpToolName(value);
  const cached = toolNameCache.get(value);
  if (cached !== undefined) return cached;
  const name = parseT3McpToolName(value);
  if (toolNameCache.size >= TOOL_NAME_CACHE_LIMIT) toolNameCache.clear();
  toolNameCache.set(value, name);
  return name;
}

// ACP tool prefixes vary; match loosely but require a known display-name entry.
function parseT3McpToolName(value: string): string | null {
  const label = normalizeT3McpToolLabel(value);
  const mcpMatch = /^mcp__(?<server>.+?)__(?<tool>.+)$/i.exec(label);
  if (mcpMatch?.groups) {
    const { server, tool } = mcpMatch.groups;
    return server !== undefined &&
      tool !== undefined &&
      T3_MCP_SERVER_ALIASES.has(server.toLowerCase())
      ? tool
      : null;
  }

  const namespaceMatch =
    /^(?<server>(?:t3|colon3)[-_]code[-_]direct|colon3-code|t3_code|colon3code)(?:[.:/]|\s*·\s*)(?<tool>.+)$/i.exec(
      label,
    );
  if (namespaceMatch?.groups) {
    return namespaceMatch.groups.tool ?? null;
  }

  const prefixed = /^(?:mcp[-_]{1,2})?(?:t3|colon3|:3)[-_ ]?code(?:__|[-_.:/ ])(?<tool>.+)$/i.exec(
    label,
  );
  const candidate = prefixed?.groups?.tool ?? label;
  if (Object.hasOwn(T3_MCP_TOOLS, candidate)) return candidate;
  // OpenCode 2 thread prefixes can contain underscores; choose the longest known tool-name suffix.
  if (!/^colon3-code-/i.test(label)) return null;
  let longest: string | null = null;
  for (const tool of Object.keys(T3_MCP_TOOLS)) {
    if (label.endsWith(`_${tool}`) && tool.length > (longest?.length ?? 0)) longest = tool;
  }
  return longest;
}

export function resolveT3McpToolId(toolName: string | null | undefined): string | null {
  const name = toolName == null ? null : resolveT3McpToolName(toolName);
  return name !== null && Object.hasOwn(T3_MCP_TOOLS, name) ? name : null;
}

type SummaryInput = Readonly<Record<string, unknown>>;

const asSummaryInput = (input: unknown): SummaryInput | undefined =>
  typeof input === "object" && input !== null ? (input as SummaryInput) : undefined;

/** Action tools present each call as the single-purpose tool its action replaced. */
const ACTION_TOOLS: Readonly<Record<string, (action: string) => string | undefined>> = {
  preview_act: (action) => `preview_${action}`,
  t3_queue: (action) => `t3_queue_${action}`,
  t3_pending_request: (action) => `t3_pending_request_${action}`,
  t3_thread_transfer: (action) =>
    ({ fork: "t3_thread_fork", merge_back: "t3_thread_merge_back", status: "t3_thread_transfers" })[
      action
    ],
};

/** Pass the call's input so an action tool resolves to the labels and summary of its action. */
export function resolveT3McpToolDefinition(
  toolName: string | null | undefined,
  input?: unknown,
): T3McpToolDefinition | null {
  const name = toolName == null ? null : resolveT3McpToolName(toolName);
  if (name === null || !Object.hasOwn(T3_MCP_TOOLS, name)) return null;
  const action = asSummaryInput(input)?.action;
  const actionTool = typeof action === "string" ? ACTION_TOOLS[name]?.(action) : undefined;
  return actionTool !== undefined && Object.hasOwn(T3_MCP_TOOLS, actionTool)
    ? T3_MCP_TOOLS[actionTool]!
    : T3_MCP_TOOLS[name]!;
}

/** Tools whose summary depends on which fields a call sets. */
const ACTION_SUMMARIES: Readonly<
  Record<string, (input: SummaryInput) => T3McpToolSummaryAction | undefined>
> = {
  t3_thread_configure: ({ modelSelection }) =>
    modelSelection === undefined ? "thread-configuration" : "thread-configure",
  schedule_task: ({ scheduledTaskId }) =>
    scheduledTaskId === undefined ? "schedule-create" : "schedule-update",
};

export function resolveT3McpSummaryAction(
  toolName: string | null | undefined,
  input: unknown,
): T3McpToolSummaryAction | null {
  const definition = resolveT3McpToolDefinition(toolName, input);
  if (definition === null) return null;
  const summarize = ACTION_SUMMARIES[resolveT3McpToolName(toolName!) ?? ""];
  const fields = asSummaryInput(input);
  return (fields && summarize?.(fields)) ?? definition.summaryAction;
}

export function resolveT3McpToolPresentation(
  toolName: string | null | undefined,
  input?: unknown,
): T3McpToolPresentation | null {
  const definition = resolveT3McpToolDefinition(toolName, input);
  return definition === null ? null : { displayName: definition.displayName, logo: "colon3-code" };
}
