import { readFile } from "fs/promises";
import { join, resolve } from "path";
import { INSTALLED_PLUGINS_PATH } from "./constants.js";
import type {
  InstalledPluginsFile,
  InstalledPluginsFileV1,
  InstalledPluginsFileV2,
  PluginInstallation,
} from "./types.js";

interface RegistryContext {
  directory: string;
  worktree: string;
}

/**
 * Convert V1 format to V2.
 * V1 has no scope — all entries become scope:"user".
 * V1 may or may not have installPath; if missing, derive from plugin key + version.
 */
function convertV1toV2(v1: InstalledPluginsFileV1): InstalledPluginsFileV2 {
  const plugins: Record<string, PluginInstallation[]> = {};
  for (const [key, entry] of Object.entries(v1.plugins)) {
    const installPath =
      entry.installPath || deriveInstallPath(key, entry.version);
    plugins[key] = [
      {
        scope: "user",
        installPath,
        version: entry.version,
        installedAt: entry.installedAt,
        lastUpdated: entry.lastUpdated,
        gitCommitSha: entry.gitCommitSha,
      },
    ];
  }
  return { version: 2, plugins };
}

/** Replicate Claude Code's cache path derivation: ~/.claude/plugins/cache/{marketplace}/{name}/{version} */
function deriveInstallPath(key: string, version: string): string {
  const [name, marketplace] = key.includes("@")
    ? key.split("@")
    : [key, "unknown"];
  const safeMp = (marketplace || "unknown").replace(/[^a-zA-Z0-9\-_]/g, "-");
  const safeName = (name || key).replace(/[^a-zA-Z0-9\-_]/g, "-");
  const safeVer = version.replace(/[^a-zA-Z0-9\-_.]/g, "-");
  return join(INSTALLED_PLUGINS_PATH, "..", "cache", safeMp, safeName, safeVer);
}

function normalizeFile(raw: unknown): InstalledPluginsFileV2 {
  const data = raw as InstalledPluginsFile;
  const version = typeof data?.version === "number" ? data.version : 1;
  if (version === 1) {
    console.log("[cc-plugin-loader] Converting V1 installed_plugins.json to V2");
    return convertV1toV2(data as InstalledPluginsFileV1);
  }
  return data as InstalledPluginsFileV2;
}

export async function loadInstalledPlugins(
  ctx: RegistryContext,
): Promise<(PluginInstallation & { pluginKey: string })[]> {
  let data: InstalledPluginsFileV2;
  try {
    const raw = await readFile(INSTALLED_PLUGINS_PATH, "utf-8");
    data = normalizeFile(JSON.parse(raw));
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
