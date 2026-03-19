import type { Config } from "@opencode-ai/sdk";
import { TOOL_NAME_MAP, MODEL_MAP } from "../constants.js";
import type { ParsedPlugin } from "../types.js";

/** Claude Code tool names that have no OpenCode equivalent — silently dropped */
const UNMAPPABLE_TOOLS = new Set([
  "NotebookEdit",
  "NotebookRead",
  "KillShell",
  "BashOutput",
  "AskUserQuestion",
]);

/**
 * Map Claude Code tool names to OpenCode tool names.
 * - Exact match in TOOL_NAME_MAP takes priority
 * - Scoped patterns like "Bash(git:*)" → "bash"
 * - Tools with no OpenCode equivalent are dropped
 */
function mapTools(tools: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const tool of tools) {
    // Handle scoped patterns like "Bash(git:*)"
    const baseMatch = tool.match(/^(\w+)\(/);
    const baseName = baseMatch ? baseMatch[1] : tool;

    if (UNMAPPABLE_TOOLS.has(baseName)) continue;

    const mapped = TOOL_NAME_MAP[baseName] || baseName.toLowerCase();
    result[mapped] = true;
  }
  return result;
}

function mapModel(model: string): string | undefined {
  if (model === "inherit") return undefined; // let OpenCode use parent model
  return MODEL_MAP[model] || model;
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
        const model = agent.model ? mapModel(agent.model) : undefined;
        config.agent[key] = {
          description: agent.description,
          mode: "all",
          prompt: agent.prompt,
          tools: mapTools(agent.tools),
          ...(model && { model }),
          ...(agent.maxTurns && { maxSteps: agent.maxTurns }),
          ...(agent.color && { color: agent.color }),
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
