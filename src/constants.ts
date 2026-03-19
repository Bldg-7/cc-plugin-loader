import { join } from "path";
import { homedir } from "os";

/** Claude Code tool name → OpenCode tool name */
export const TOOL_NAME_MAP: Record<string, string> = {
  Bash: "bash",
  Read: "read",
  Write: "write",
  Edit: "edit",
  Glob: "glob",
  Grep: "grep",
  WebFetch: "webfetch",
  WebSearch: "websearch",
  Agent: "agent",
  NotebookEdit: "notebookedit",
};

/** OpenCode tool name → Claude Code tool name (reverse of TOOL_NAME_MAP) */
export const REVERSE_TOOL_NAME_MAP: Record<string, string> =
  Object.fromEntries(
    Object.entries(TOOL_NAME_MAP).map(([cc, oc]) => [oc, cc]),
  );

/** Claude Code model alias → OpenCode model ID */
export const MODEL_MAP: Record<string, string> = {
  sonnet: "anthropic/claude-sonnet-4-6",
  opus: "anthropic/claude-opus-4-6",
  haiku: "anthropic/claude-haiku-4-5-20251001",
};

export const INSTALLED_PLUGINS_PATH = join(
  homedir(),
  ".claude",
  "plugins",
  "installed_plugins.json",
);
