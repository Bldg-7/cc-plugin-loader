/**
 * Tracks "once" hook executions to prevent re-running.
 * Key format: `${pluginName}:${event}:${command}`
 */
const executed = new Set<string>();

export function makeKey(
  pluginName: string,
  event: string,
  command: string,
): string {
  return `${pluginName}:${event}:${command}`;
}

export function hasRun(key: string): boolean {
  return executed.has(key);
}

export function markRun(key: string): void {
  executed.add(key);
}

export function reset(): void {
  executed.clear();
}
