import { catFaceGlyph } from "./components/CatFace";
import type { SidebarThreadStatus } from "./components/Sidebar.logic";

/**
 * Tab title for the active thread, so someone who tabbed away can read what
 * the agent is doing. `recentlyCompleted` covers the one state the status
 * alone cannot express: a turn that finished while this tab was watching it,
 * cleared once the user comes back.
 */
export function resolveDocumentTitle(input: {
  appName: string;
  status: SidebarThreadStatus | null;
  recentlyCompleted: boolean;
}): string {
  const label = resolveStatusLabel(input.status, input.recentlyCompleted);
  return label === null ? input.appName : `${label} · ${input.appName}`;
}

function resolveStatusLabel(
  status: SidebarThreadStatus | null,
  recentlyCompleted: boolean,
): string | null {
  switch (status) {
    case "working":
      return `${catFaceGlyph("working")} working`;
    case "approval":
    case "input":
      return `${catFaceGlyph("curious")} needs you`;
    case "failed":
      return `${catFaceGlyph("sad")} failed`;
    case "monitoring":
      return `${catFaceGlyph("watching")} watching`;
    case "ready":
      return recentlyCompleted ? `${catFaceGlyph("proud")} done` : null;
    case null:
      return null;
  }
}
