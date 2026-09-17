import {
  SOUTHBAG_CODE_DRIVER_KIND,
  type ProviderInstanceId,
  type ServerConfig,
} from "@t3tools/contracts";

/** Shown on the disabled stop control; Southbag Code does not take interrupts from the UI. */
export const SOUTHBAG_CODE_STOP_HINT = "southbag code doesn't do stopping. kevin is watching :3";

type StopActionThread = {
  readonly session: {
    readonly providerName: string | null;
    readonly providerInstanceId?: ProviderInstanceId | undefined;
  } | null;
  readonly modelSelection: { readonly instanceId: ProviderInstanceId };
};

/**
 * Why the stop control must stay inert for this thread, or null when stopping
 * is allowed. A live session names its provider directly; before one exists
 * the thread's model selection says which provider will run it.
 */
export function resolveStopActionBlockedHint(input: {
  readonly serverConfig: ServerConfig | null | undefined;
  readonly thread: StopActionThread;
}): string | null {
  const driver = resolveThreadDriver(input);
  return driver === SOUTHBAG_CODE_DRIVER_KIND ? SOUTHBAG_CODE_STOP_HINT : null;
}

function resolveThreadDriver(input: {
  readonly serverConfig: ServerConfig | null | undefined;
  readonly thread: StopActionThread;
}): string | null {
  const session = input.thread.session;
  if (session?.providerName) {
    return session.providerName;
  }
  const instanceId = session?.providerInstanceId ?? input.thread.modelSelection.instanceId;
  const provider = input.serverConfig?.providers.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  return (
    provider?.driver ?? input.serverConfig?.settings?.providerInstances[instanceId]?.driver ?? null
  );
}
