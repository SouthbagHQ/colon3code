import type { ExecutionEnvironmentPlatformOs, FileManagerRevealKind } from "@t3tools/contracts";

export function revealInFileExplorerLabel(platform: string): string {
  const normalized = platform.toLowerCase();
  if (normalized.includes("mac")) return "reveal in Finder";
  if (normalized.includes("win")) return "reveal in File Explorer";
  return "reveal in Files";
}

export function revealInFileExplorerLabelForOs(os: ExecutionEnvironmentPlatformOs): string {
  if (os === "darwin") return "reveal in Finder";
  if (os === "windows") return "reveal in File Explorer";
  return "reveal in Files";
}

export function revealInFileExplorerLabelForKind(kind: FileManagerRevealKind): string {
  if (kind === "finder") return "reveal in Finder";
  if (kind === "file-explorer") return "reveal in File Explorer";
  return "reveal in Files";
}
