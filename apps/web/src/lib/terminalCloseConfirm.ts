import { readLocalApi } from "~/localApi";

let pendingConfirmations = 0;

export function isTerminalCloseConfirmPending(): boolean {
  return pendingConfirmations > 0;
}

export async function confirmTerminalClose(
  labels: readonly [string, ...string[]],
): Promise<boolean> {
  const localApi = readLocalApi();
  if (!localApi) return true;
  pendingConfirmations += 1;
  try {
    return await localApi.dialogs.confirm(
      labels.length === 1
        ? [
            `close terminal "${labels[0]}"?`,
            "this stops its running process and clears its history 3:",
          ].join("\n")
        : [
            `close ${labels.length} terminals?`,
            `this stops their running processes and clears their histories: ${labels
              .map((label) => `"${label}"`)
              .join(", ")} 3:`,
          ].join("\n"),
      { variant: "destructive" },
    );
  } catch {
    return false;
  } finally {
    pendingConfirmations -= 1;
  }
}
