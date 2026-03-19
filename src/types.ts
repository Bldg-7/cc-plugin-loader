import type { ResolvedHookEntry } from "./hooks/bridge-types.js";

// ── Source types (Claude Code plugin format) ──

/** V1: each plugin key maps to a single entry (no scope, no array) */
export interface InstalledPluginsFileV1 {
  version: 1;
  plugins: Record<string, PluginInstallationV1>;
}

export interface PluginInstallationV1 {
  version: string;
  installedAt: string;
  lastUpdated?: string;
  installPath: string;
  gitCommitSha?: string;
}

/** V2: each plugin key maps to an array of scoped entries */
export interface InstalledPluginsFileV2 {
  version: 2;
  plugins: Record<string, PluginInstallation[]>;
}

export type InstalledPluginsFile = InstalledPluginsFileV1 | InstalledPluginsFileV2;

export interface PluginInstallation {
  scope: "user" | "project" | "local";
  installPath: string;
  projectPath?: string;
  version: string;
  installedAt: string;
  lastUpdated?: string;
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
  hookEntries: ResolvedHookEntry[];
}

export type { ResolvedHookEntry };
