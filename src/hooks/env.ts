import type { ParsedPlugin } from "../types.js";

export function createEnvHook(plugins: ParsedPlugin[]) {
  // Pre-build env map
  const envVars: Record<string, string> = {};

  for (const plugin of plugins) {
    const safeName = plugin.name.replace(/-/g, "_").toUpperCase();
    envVars[`CLAUDE_PLUGIN_ROOT_${safeName}`] = plugin.installPath;
    // Last plugin wins for backwards compat
    envVars["CLAUDE_PLUGIN_ROOT"] = plugin.installPath;
  }

  return async (
    _input: { cwd: string; sessionID?: string; callID?: string },
    output: { env: Record<string, string> },
  ): Promise<void> => {
    Object.assign(output.env, envVars);
  };
}
