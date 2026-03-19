import { readFile, readdir, stat } from "fs/promises";
import { join, basename } from "path";
import { parseFrontmatter, normalizeTools } from "./parser.js";
import type {
  PluginManifest,
  PluginInstallation,
  SkillFrontmatter,
  AgentFrontmatter,
  CommandFrontmatter,
  McpConfig,
  ParsedPlugin,
  ParsedSkill,
  ParsedAgent,
  ParsedCommand,
  ParsedMcp,
} from "./types.js";
import { loadHooks } from "./hooks/bridge-loader.js";

async function readFileSafe(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return null;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

export async function loadPlugin(
  inst: PluginInstallation & { pluginKey: string },
): Promise<ParsedPlugin | null> {
  const { installPath, pluginKey } = inst;

  // Read manifest
  const manifestRaw = await readFileSafe(
    join(installPath, ".claude-plugin", "plugin.json"),
  );
  let manifest: PluginManifest;
  if (manifestRaw) {
    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      console.warn(
        `[cc-plugin-loader] Failed to parse plugin.json for ${pluginKey}`,
      );
      return null;
    }
  } else {
    // Derive name from key (e.g. "my-plugin@registry" → "my-plugin")
    manifest = { name: pluginKey.split("@")[0] };
  }

  const pluginName = manifest.name;

  const [claudeMd, skills, agents, commands, mcpServers, hookEntries] =
    await Promise.all([
      readFileSafe(join(installPath, "CLAUDE.md")),
      loadSkills(installPath, pluginName),
      loadAgents(installPath, pluginName),
      loadCommands(installPath, pluginName),
      loadMcpServers(installPath, pluginName),
      loadHooks(installPath, pluginName),
    ]);

  return {
    name: pluginName,
    installPath,
    claudeMd: claudeMd ?? undefined,
    skills,
    agents,
    commands,
    mcpServers,
    hookEntries,
  };
}

async function loadSkills(
  installPath: string,
  pluginName: string,
): Promise<ParsedSkill[]> {
  const skillsDir = join(installPath, "skills");
  if (!(await dirExists(skillsDir))) return [];

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const skills: ParsedSkill[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
    const raw = await readFileSafe(skillMdPath);
    if (!raw) continue;

    try {
      const { frontmatter } = parseFrontmatter<SkillFrontmatter>(raw);
      const name = frontmatter.name || entry.name;
      skills.push({
        pluginName,
        name,
        qualifiedName: `${pluginName}:${name}`,
        description: frontmatter.description || "",
        tools: normalizeTools(frontmatter),
        contentPath: skillMdPath,
      });
    } catch (e) {
      console.warn(
        `[cc-plugin-loader] Failed to parse skill ${entry.name} in ${pluginName}:`,
        e,
      );
    }
  }

  return skills;
}

async function loadAgents(
  installPath: string,
  pluginName: string,
): Promise<ParsedAgent[]> {
  const agentsDir = join(installPath, "agents");
  if (!(await dirExists(agentsDir))) return [];

  const entries = await readdir(agentsDir, { withFileTypes: true });
  const agents: ParsedAgent[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const agentPath = join(agentsDir, entry.name);
    const raw = await readFileSafe(agentPath);
    if (!raw) continue;

    try {
      const { frontmatter, body } = parseFrontmatter<AgentFrontmatter>(raw);
      const name = frontmatter.name || basename(entry.name, ".md");

      // Replace ${CLAUDE_PLUGIN_ROOT} with actual installPath
      const prompt = body.replaceAll("${CLAUDE_PLUGIN_ROOT}", installPath);

      agents.push({
        pluginName,
        name,
        description: frontmatter.description || "",
        model: frontmatter.model,
        tools: normalizeTools(frontmatter),
        maxTurns: frontmatter.maxTurns,
        color: frontmatter.color,
        prompt,
      });
    } catch (e) {
      console.warn(
        `[cc-plugin-loader] Failed to parse agent ${entry.name} in ${pluginName}:`,
        e,
      );
    }
  }

  return agents;
}

async function loadCommands(
  installPath: string,
  pluginName: string,
): Promise<ParsedCommand[]> {
  const commandsDir = join(installPath, "commands");
  if (!(await dirExists(commandsDir))) return [];

  const entries = await readdir(commandsDir, { withFileTypes: true });
  const commands: ParsedCommand[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const cmdPath = join(commandsDir, entry.name);
    const raw = await readFileSafe(cmdPath);
    if (!raw) continue;

    try {
      const { frontmatter } = parseFrontmatter<CommandFrontmatter>(raw);
      const name = frontmatter.name || basename(entry.name, ".md");
      commands.push({
        pluginName,
        name,
        qualifiedName: `${pluginName}:${name}`,
        description: frontmatter.description || "",
        contentPath: cmdPath,
      });
    } catch (e) {
      console.warn(
        `[cc-plugin-loader] Failed to parse command ${entry.name} in ${pluginName}:`,
        e,
      );
    }
  }

  return commands;
}

async function loadMcpServers(
  installPath: string,
  pluginName: string,
): Promise<ParsedMcp[]> {
  const mcpPath = join(installPath, ".mcp.json");
  const raw = await readFileSafe(mcpPath);
  if (!raw) return [];

  let config: McpConfig;
  try {
    config = JSON.parse(raw);
  } catch {
    console.warn(
      `[cc-plugin-loader] Failed to parse .mcp.json in ${pluginName}`,
    );
    return [];
  }

  if (!config.mcpServers) return [];

  const servers: ParsedMcp[] = [];
  for (const [serverName, server] of Object.entries(config.mcpServers)) {
    // Expand env variables — omit unresolved vars so the MCP server
    // can inherit them from the parent process environment
    const env: Record<string, string> = {};
    if (server.env) {
      for (const [k, v] of Object.entries(server.env)) {
        const expanded = expandEnv(v);
        if (expanded !== null) {
          env[k] = expanded;
        }
      }
    }

    servers.push({
      pluginName,
      serverName,
      qualifiedName: `${pluginName}-${serverName}`,
      command: server.command,
      args: server.args || [],
      env,
    });
  }

  return servers;
}

function expandEnv(value: string): string | null {
  let hasUnresolved = false;
  const result = value.replace(/\$\{([^}]+)\}/g, (_match, varExpr) => {
    // Support ${VAR:-default} syntax
    const colonIdx = varExpr.indexOf(":-");
    const varName = colonIdx >= 0 ? varExpr.slice(0, colonIdx) : varExpr;
    const fallback = colonIdx >= 0 ? varExpr.slice(colonIdx + 2) : undefined;

    const val = process.env[varName];
    if (val !== undefined) return val;
    if (fallback !== undefined) return fallback;

    console.warn(
      `[cc-plugin-loader] Environment variable ${varName} not set, omitting from MCP config`,
    );
    hasUnresolved = true;
    return "";
  });

  // If the entire value was a single unresolved ${VAR}, omit it
  // so the MCP server can inherit from parent environment
  if (hasUnresolved && result === "") return null;
  return result;
}
