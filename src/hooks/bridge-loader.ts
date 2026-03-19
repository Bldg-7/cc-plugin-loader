import { readFile } from "fs/promises";
import { join } from "path";
import type {
  HooksConfig,
  HookEventName,
  ResolvedHookEntry,
} from "./bridge-types.js";

const DEFAULT_TIMEOUT = 10;

/**
 * Load hooks.json from a plugin's hooks/ directory.
 * Returns resolved hook entries with ${CLAUDE_PLUGIN_ROOT} expanded.
 * Filters to command-type hooks only.
 */
export async function loadHooks(
  installPath: string,
  pluginName: string,
): Promise<ResolvedHookEntry[]> {
  const hooksPath = join(installPath, "hooks", "hooks.json");

  let raw: string;
  try {
    raw = await readFile(hooksPath, "utf-8");
  } catch {
    return [];
  }

  let config: HooksConfig;
  try {
    config = JSON.parse(raw);
  } catch {
    console.warn(
      `[cc-plugin-loader] Failed to parse hooks.json in ${pluginName}`,
    );
    return [];
  }

  const entries: ResolvedHookEntry[] = [];

  for (const [eventName, rules] of Object.entries(config)) {
    if (!rules || !Array.isArray(rules)) continue;

    for (const rule of rules) {
      if (!rule.hooks || !Array.isArray(rule.hooks)) continue;

      for (const action of rule.hooks) {
        // Phase 2: command type only
        if (action.type !== "command") continue;
        if (!action.command) continue;

        // Expand ${CLAUDE_PLUGIN_ROOT}
        const command = action.command.replaceAll(
          "${CLAUDE_PLUGIN_ROOT}",
          installPath,
        );

        entries.push({
          pluginName,
          installPath,
          event: eventName as HookEventName,
          matcher: rule.matcher,
          command,
          timeout: (action.timeout ?? DEFAULT_TIMEOUT) * 1000,
        });
      }
    }
  }

  return entries;
}
