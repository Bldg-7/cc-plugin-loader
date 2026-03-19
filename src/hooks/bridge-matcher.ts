import type { HookEventName, ResolvedHookEntry } from "./bridge-types.js";

/**
 * Filter resolved hook entries by event name and optional tool name.
 *
 * Rules:
 * - Entry must match the given event
 * - If the entry has no matcher, it matches all tool names (wildcard)
 * - Matcher "*" also matches all tool names
 * - Otherwise, matcher must equal toolName exactly (case-sensitive)
 */
export function matchHooks(
  entries: ResolvedHookEntry[],
  event: HookEventName,
  toolName?: string,
): ResolvedHookEntry[] {
  return entries.filter((entry) => {
    if (entry.event !== event) return false;
    if (!entry.matcher || entry.matcher === "*") return true;
    if (!toolName) return false;
    return entry.matcher === toolName;
  });
}
