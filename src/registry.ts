import { readFile } from "fs/promises";
import { resolve } from "path";
import { INSTALLED_PLUGINS_PATH } from "./constants.js";
import type { InstalledPluginsFile, PluginInstallation } from "./types.js";

interface RegistryContext {
  directory: string;
  worktree: string;
}

export async function loadInstalledPlugins(
  ctx: RegistryContext,
): Promise<(PluginInstallation & { pluginKey: string })[]> {
  let data: InstalledPluginsFile;
  try {
    const raw = await readFile(INSTALLED_PLUGINS_PATH, "utf-8");
    data = JSON.parse(raw);
  } catch {
    console.warn(
      `[cc-plugin-loader] installed_plugins.json not found at ${INSTALLED_PLUGINS_PATH}`,
    );
    return [];
  }

  const dir = resolve(ctx.directory);
  const wt = resolve(ctx.worktree);
  const seen = new Set<string>();
  const result: (PluginInstallation & { pluginKey: string })[] = [];

  for (const [key, installations] of Object.entries(data.plugins)) {
    for (const inst of installations) {
      if (!matchesScope(inst, dir, wt)) continue;

      // Deduplicate by installPath
      const dedup = `${key}::${inst.installPath}`;
      if (seen.has(dedup)) continue;
      seen.add(dedup);

      result.push({ ...inst, pluginKey: key });
    }
  }

  return result;
}

function matchesScope(
  inst: PluginInstallation,
  dir: string,
  worktree: string,
): boolean {
  switch (inst.scope) {
    case "user":
      return true;
    case "project": {
      if (!inst.projectPath) return false;
      const pp = resolve(inst.projectPath);
      return dir === pp || worktree === pp;
    }
    case "local": {
      if (!inst.projectPath) return false;
      const pp = resolve(inst.projectPath);
      return dir.startsWith(pp + "/") || dir === pp ||
        worktree.startsWith(pp + "/") || worktree === pp;
    }
    default:
      return false;
  }
}
