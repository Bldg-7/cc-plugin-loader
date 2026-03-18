import type { Plugin } from "@opencode-ai/plugin";
import { loadInstalledPlugins } from "./registry.js";
import { loadPlugin } from "./loader.js";
import { createConfigHook } from "./hooks/config.js";
import { createSystemHook } from "./hooks/system.js";
import { createCommandHook } from "./hooks/command.js";
import { createEnvHook } from "./hooks/env.js";
import type { ParsedPlugin } from "./types.js";

const plugin: Plugin = async (input) => {
  const installations = await loadInstalledPlugins({
    directory: input.directory,
    worktree: input.worktree,
  });

  if (!installations.length) {
    console.warn("[cc-plugin-loader] No matching plugins found");
    return {};
  }

  const loaded = await Promise.all(installations.map(loadPlugin));
  const plugins: ParsedPlugin[] = loaded.filter(
    (p): p is ParsedPlugin => p !== null,
  );

  if (!plugins.length) {
    console.warn("[cc-plugin-loader] All plugins failed to load");
    return {};
  }

  console.log(
    `[cc-plugin-loader] Loaded ${plugins.length} plugin(s): ${plugins.map((p) => p.name).join(", ")}`,
  );

  return {
    config: createConfigHook(plugins),
    "experimental.chat.system.transform": createSystemHook(plugins),
    "command.execute.before": createCommandHook(plugins),
    "shell.env": createEnvHook(plugins),
  };
};

export default plugin;
