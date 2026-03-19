import type { Hooks } from "@opencode-ai/plugin";
import type { ParsedPlugin } from "../types.js";
import type {
  HookEventName,
  HookStdinPayload,
  ResolvedHookEntry,
} from "./bridge-types.js";
import { REVERSE_TOOL_NAME_MAP } from "../constants.js";
import { matchHooks } from "./bridge-matcher.js";
import { executeHookCommand } from "./bridge-executor.js";

/**
 * Create OpenCode hook callbacks from resolved hook entries across all plugins.
 */
export function createBridgeHooks(plugins: ParsedPlugin[]): Partial<Hooks> {
  const allEntries = plugins.flatMap((p) => p.hookEntries);
  if (!allEntries.length) return {};

  const hooks: Partial<Hooks> = {};

  // Check which events have entries
  const eventSet = new Set(allEntries.map((e) => e.event));

  if (eventSet.has("PreToolUse")) {
    hooks["tool.execute.before"] = async (input, output) => {
      const ccToolName = REVERSE_TOOL_NAME_MAP[input.tool] ?? input.tool;
      const matched = matchHooks(allEntries, "PreToolUse", ccToolName);
      if (!matched.length) return;

      const payload = buildPayload(
        "PreToolUse",
        input.sessionID,
        ccToolName,
        output.args,
      );

      for (const entry of matched) {
        const result = await executeHookCommand(
          entry.command,
          payload,
          entry.timeout,
        );
        if (!result) continue;

        if (!result.continue) {
          console.warn(
            `[cc-plugin-loader] Hook "${entry.command}" returned continue:false, ` +
              `but OpenCode tool.execute.before cannot cancel execution. ` +
              `Consider using permission.ask instead.`,
          );
        }

        if (result.hookSpecificOutput?.updatedInput) {
          Object.assign(output.args, result.hookSpecificOutput.updatedInput);
          // Update payload for chaining
          payload.tool_input = output.args;
        }
      }
    };
  }

  if (eventSet.has("PostToolUse")) {
    hooks["tool.execute.after"] = async (input, output) => {
      const ccToolName = REVERSE_TOOL_NAME_MAP[input.tool] ?? input.tool;
      const matched = matchHooks(allEntries, "PostToolUse", ccToolName);
      if (!matched.length) return;

      const payload = buildPayload(
        "PostToolUse",
        input.sessionID,
        ccToolName,
        input.args,
      );

      for (const entry of matched) {
        const result = await executeHookCommand(
          entry.command,
          payload,
          entry.timeout,
        );
        if (!result) continue;

        if (result.hookSpecificOutput?.additionalContext) {
          output.output += "\n" + result.hookSpecificOutput.additionalContext;
        }
      }
    };
  }

  if (eventSet.has("PermissionRequest")) {
    hooks["permission.ask"] = async (input, output) => {
      const matched = matchHooks(
        allEntries,
        "PermissionRequest",
        input.type,
      );
      if (!matched.length) return;

      const payload = buildPayload(
        "PermissionRequest",
        input.sessionID,
        input.type,
      );

      for (const entry of matched) {
        const result = await executeHookCommand(
          entry.command,
          payload,
          entry.timeout,
        );
        if (!result) continue;

        const decision = result.hookSpecificOutput?.permissionDecision;
        if (decision === "allow") {
          output.status = "allow";
        } else if (decision === "deny") {
          output.status = "deny";
        }
      }
    };
  }

  if (eventSet.has("UserPromptSubmit")) {
    hooks["chat.message"] = async (input, output) => {
      const matched = matchHooks(allEntries, "UserPromptSubmit");
      if (!matched.length) return;

      const payload = buildPayload("UserPromptSubmit", input.sessionID);

      for (const entry of matched) {
        const result = await executeHookCommand(
          entry.command,
          payload,
          entry.timeout,
        );
        if (!result) continue;

        if (result.hookSpecificOutput?.additionalContext) {
          output.parts.push({
            type: "text",
            text: result.hookSpecificOutput.additionalContext,
          } as never);
        }
      }
    };
  }

  if (eventSet.has("PreCompact")) {
    hooks["experimental.session.compacting"] = async (input, output) => {
      const matched = matchHooks(allEntries, "PreCompact");
      if (!matched.length) return;

      const payload = buildPayload("PreCompact", input.sessionID);

      for (const entry of matched) {
        const result = await executeHookCommand(
          entry.command,
          payload,
          entry.timeout,
        );
        if (!result) continue;

        if (result.hookSpecificOutput?.additionalContext) {
          output.context.push(result.hookSpecificOutput.additionalContext);
        }
      }
    };
  }

  return hooks;
}

function buildPayload(
  event: HookEventName,
  sessionId: string,
  toolName?: string,
  toolInput?: unknown,
): HookStdinPayload {
  return {
    session_id: sessionId,
    cwd: process.cwd(),
    hook_event_name: event,
    tool_name: toolName,
    tool_input: toolInput,
    transcript_path: "",
  };
}
