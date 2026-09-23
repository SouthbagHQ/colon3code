/**
 * Prefix for the "working" timeline row, chosen by how long the turn has been
 * running so the label acknowledges long waits instead of repeating itself.
 * Buckets are lower-inclusive: exactly 30s reads as "still going".
 */
export function workingLabelPrefix(elapsedMs: number): string {
  if (!(elapsedMs >= 30_000)) return "working on it…";
  if (elapsedMs < 120_000) return "still going, purr…";
  if (elapsedMs < 600_000) return "this one's chunky, hang tight…";
  return "deep in it, still going…";
}

/** Milliseconds since `startIso`, clamped to zero; unparseable input counts as just started. */
export function workingElapsedMs(startIso: string, nowMs: number): number {
  const startedAtMs = Date.parse(startIso);
  if (!Number.isFinite(startedAtMs)) return 0;
  return Math.max(0, nowMs - startedAtMs);
}
