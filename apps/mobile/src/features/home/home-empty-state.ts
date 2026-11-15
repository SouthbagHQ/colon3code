import { isWorkspaceCatalogPending, type WorkspaceState } from "../../state/workspaceModel";

export interface HomeEmptyState {
  readonly title: string;
  readonly detail: string;
  readonly loading: boolean;
  readonly showsAddEnvironment: boolean;
  readonly face?: "sad";
}

export function deriveHomeEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): HomeEmptyState {
  const emptyState = deriveEmptyState(catalogState, projectCount);
  return {
    ...emptyState,
    showsAddEnvironment: !emptyState.loading && !catalogState.hasReadyEnvironment,
  };
}

function deriveEmptyState(
  catalogState: WorkspaceState,
  projectCount: number,
): Omit<HomeEmptyState, "showsAddEnvironment"> {
  if (catalogState.isLoadingConnections) {
    return {
      title: "loading environments…",
      detail: "checking the environments saved on this device :3",
      loading: true,
    };
  }

  if (!catalogState.hasConnections) {
    return {
      title: "meow! no environments yet :3",
      detail: "add an environment to load your projects and start coding together ^w^",
      loading: false,
    };
  }

  if (
    (catalogState.connectionState === "available" ||
      catalogState.connectionState === "offline" ||
      catalogState.connectionState === "error" ||
      catalogState.connectionState === "unsupported") &&
    !catalogState.hasLoadedShellSnapshot
  ) {
    return {
      title:
        catalogState.connectionState === "unsupported"
          ? "Client not supported"
          : "Environment unavailable",
      detail:
        catalogState.connectionError ??
        "the saved environment is offline. check the URL or start the environment, then retry.",
      loading: false,
      face: "sad",
    };
  }

  if (isWorkspaceCatalogPending(catalogState)) {
    return {
      title: catalogState.hasReadyEnvironment ? "loading threads…" : "connecting to environment…",
      detail: "loading projects and threads from the saved environment :3",
      loading: true,
    };
  }

  if (projectCount === 0 && catalogState.hasLoadedShellSnapshot) {
    return {
      title: "no projects found :3",
      detail: "the connected environment did not report any projects.",
      loading: false,
    };
  }

  return {
    title: "nothing here yet :3",
    detail: "Create a task to start a new coding runtime in one of your connected projects ^w^",
    loading: false,
  };
}
