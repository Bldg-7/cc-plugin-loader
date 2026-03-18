// ── Source types (Claude Code plugin format) ──

export interface InstalledPluginsFile {
  version: number;
  plugins: Record<string, PluginInstallation[]>;
}

export interface PluginInstallation {
  scope: "user" | "project" | "local";
  installPath: string;
  projectPath?: string;
  version: string;
  installedAt: string;
  lastUpdated: string;
  gitCommitSha?: string;
}

export interface PluginManifest {
  name: string;
  description?: string;
  version?: string;
  author?: { name: string };
  repository?: string;
  license?: string;
}

export interface SkillFrontmatter {
  name?: string;
  description?: string;
  "allowed-tools"?: string[];
  tools?: string;
}

export interface AgentFrontmatter {
  name: string;
  description: string;
  model?: string;
  "allowed-tools"?: string[];
  tools?: string;
  maxTurns?: number;
}

export interface CommandFrontmatter {
  name?: string;
  description?: string;
}

export interface McpServerConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

// ── Parsed types (intermediate representation) ──

export interface ParsedSkill {
  pluginName: string;
  name: string;
  qualifiedName: string;
  description: string;
  tools: string[];
  contentPath: string;
  _content?: string;
}

export interface ParsedAgent {
  pluginName: string;
  name: string;
  description: string;
  model?: string;
  tools: string[];
  maxTurns?: number;
  prompt: string;
}

export interface ParsedCommand {
  pluginName: string;
  name: string;
  qualifiedName: string;
  description: string;
  contentPath: string;
  _content?: string;
}

export interface ParsedMcp {
  pluginName: string;
  serverName: string;
  qualifiedName: string;
  command: string;
  args: string[];
  env: Record<string, string>;
}

export interface ParsedPlugin {
  name: string;
  installPath: string;
  claudeMd?: string;
  skills: ParsedSkill[];
  agents: ParsedAgent[];
  commands: ParsedCommand[];
  mcpServers: ParsedMcp[];
}
