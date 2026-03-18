import type { ParsedPlugin } from "../types.js";

export function createSystemHook(plugins: ParsedPlugin[]) {
  // Pre-build static strings at init time
  const systemParts: string[] = [];

  for (const plugin of plugins) {
    // Inject CLAUDE.md
    if (plugin.claudeMd) {
      systemParts.push(
        `# ${plugin.name} Plugin Instructions\n\n${plugin.claudeMd}`,
      );
    }

    // Build skill/command summary
    const entries: string[] = [];

    for (const skill of plugin.skills) {
      entries.push(`- ${plugin.name}:${skill.name}: ${skill.description}`);
    }
    for (const cmd of plugin.commands) {
      entries.push(`- ${plugin.name}:${cmd.name}: ${cmd.description}`);
    }

    if (entries.length > 0) {
      systemParts.push(
        `# Available commands from ${plugin.name} plugin\n\nThe following skills are available for use with the Skill tool:\n\n${entries.join("\n")}`,
      );
    }
  }

  return async (
    _input: { sessionID?: string; model: unknown },
    output: { system: string[] },
  ): Promise<void> => {
    for (const part of systemParts) {
      output.system.push(part);
    }
  };
}
