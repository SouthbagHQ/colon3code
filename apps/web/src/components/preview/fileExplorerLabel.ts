import type { ExecutionEnvironmentPlatformOs, FileManagerRevealKind } from "@t3tools/contracts";

export function revealInFileExplorerLabel(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) return "reveal in Finder";
  if (normalized.includes("win")) return "reveal in File Explorer";
  return "reveal in Files";
}

/** Same wording keyed by an environment's reported OS rather than a
    navigator platform string, for actions that reveal on the server machine. */
export function revealInFileExplorerLabelForOs(os: ExecutionEnvironmentPlatformOs): string {
  if (os === "darwin") return "reveal in Finder";
  if (os === "windows") return "reveal in File Explorer";
  return "reveal in Files";
}

/** Server-selected wording, including Windows File Explorer reached from WSL. */
export function revealInFileExplorerLabelForKind(kind: FileManagerRevealKind): string {
  if (kind === "finder") return "reveal in Finder";
  if (kind === "file-explorer") return "reveal in File Explorer";
  return "reveal in Files";
}
