import type { Config } from "@opencode-ai/sdk";
import { TOOL_NAME_MAP, MODEL_MAP } from "../constants.js";
import type { ParsedPlugin } from "../types.js";

function mapTools(tools: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const tool of tools) {
    const mapped = TOOL_NAME_MAP[tool] || tool.toLowerCase();
    result[mapped] = true;
  }
  return result;
}

export function createConfigHook(plugins: ParsedPlugin[]) {
  return async (config: Config): Promise<void> => {
    if (!config.agent) config.agent = {};
    if (!config.mcp) config.mcp = {};
    if (!config.command) config.command = {};

    for (const plugin of plugins) {
      // Register agents
      for (const agent of plugin.agents) {
        const key = `${plugin.name}-${agent.name}`;
        config.agent[key] = {
          description: agent.description,
          mode: "subagent",
          prompt: agent.prompt,
          tools: mapTools(agent.tools),
          ...(agent.model && { model: MODEL_MAP[agent.model] || agent.model }),
          ...(agent.maxTurns && { maxSteps: agent.maxTurns }),
        };
      }

      // Register MCP servers (skip if already configured natively)
      for (const mcp of plugin.mcpServers) {
        if (config.mcp[mcp.qualifiedName]) continue;
        config.mcp[mcp.qualifiedName] = {
          type: "local" as const,
          command: [mcp.command, ...mcp.args],
          environment: mcp.env,
        };
      }

      // Register skills as commands
      for (const skill of plugin.skills) {
        config.command[skill.qualifiedName] = {
          template: "$ARGUMENTS",
          description: skill.description,
        };
      }

      // Register commands
      for (const cmd of plugin.commands) {
        config.command[cmd.qualifiedName] = {
          template: "$ARGUMENTS",
          description: cmd.description,
        };
      }
    }
  };
}
