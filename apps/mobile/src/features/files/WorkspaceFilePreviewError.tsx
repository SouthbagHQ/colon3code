import type { EnvironmentId } from "@t3tools/contracts";
import { View } from "react-native";

import { EmptyState } from "../../components/ui/EmptyState";
import { environmentCatalog } from "../../connection/catalog";
import type { AssetUrlFailureReason } from "../../state/asset-url-state";
import { useAtomCommand } from "../../state/use-atom-command";
import { useEnvironmentPresentation } from "../../state/presentation";
import { EnvironmentConnectionNotice } from "../connection/EnvironmentConnectionNotice";

export function WorkspaceFilePreviewError(props: {
  readonly environmentId: EnvironmentId | null;
  readonly reason: AssetUrlFailureReason;
  readonly onRetry: () => void;
}) {
  const { environmentId, onRetry } = props;
  const environment = useEnvironmentPresentation(environmentId);
  const retryEnvironment = useAtomCommand(environmentCatalog.retryNow, "environment retry");
  const retryConnection = () => {
    if (environmentId !== null) void retryEnvironment(environmentId);
    onRetry();
  };

  if (props.reason === "disconnected") {
    return (
      <View className="flex-1 bg-sheet">
        <EnvironmentConnectionNotice
          environmentLabel={environment.presentation?.entry.target.label ?? "environment"}
          connection={
            environment.presentation?.connection ?? {
              phase: "available",
              error: null,
              traceId: null,
            }
          }
          resourceName="preview"
          onRetry={retryConnection}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center bg-sheet px-6">
      <EmptyState
        title="preview unavailable 3:"
        detail="this file may be missing, unsupported, or unavailable on this environment."
        actionLabel="try again"
        onAction={props.onRetry}
        face="sad"
      />
    </View>
  );
}
