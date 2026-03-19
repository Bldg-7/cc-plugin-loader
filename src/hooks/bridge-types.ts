// ── Claude Code Hooks Protocol Types ──

/** Supported hook event names from Claude Code */
export type HookEventName =
  | "PreToolUse"
  | "PostToolUse"
  | "PermissionRequest"
  | "UserPromptSubmit"
  | "PreCompact";

/** A single hook action within a hook rule */
export interface HookAction {
  type: "command" | "prompt" | "agent" | "http";
  command?: string;
  timeout?: number;
}

/** A hook rule: event matcher + list of actions */
export interface HookRule {
  matcher?: string;
  hooks: HookAction[];
}

/** The shape of hooks.json */
export type HooksConfig = Partial<Record<HookEventName, HookRule[]>>;

/** A resolved hook entry ready for execution */
export interface ResolvedHookEntry {
  pluginName: string;
  installPath: string;
  event: HookEventName;
  matcher?: string;
  command: string;
  timeout: number;
}

// ── stdin/stdout protocol types ──

/** JSON written to hook subprocess stdin */
export interface HookStdinPayload {
  session_id: string;
  cwd: string;
  hook_event_name: HookEventName;
  tool_name?: string;
  tool_input?: unknown;
  transcript_path: string;
}

/** hookSpecificOutput in subprocess stdout */
export interface HookSpecificOutput {
  hookEventName?: string;
  permissionDecision?: "allow" | "deny";
  updatedInput?: Record<string, unknown>;
  additionalContext?: string;
}

/** JSON parsed from hook subprocess stdout */
export interface HookStdoutResult {
  continue: boolean;
  hookSpecificOutput?: HookSpecificOutput;
}
