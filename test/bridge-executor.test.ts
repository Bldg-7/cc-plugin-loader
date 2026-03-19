import { describe, it, expect } from "bun:test";
import { join } from "path";
import { executeHookCommand } from "../src/hooks/bridge-executor.js";
import type { HookStdinPayload } from "../src/hooks/bridge-types.js";

const SCRIPTS = join(import.meta.dir, "fixtures", "scripts");

function payload(overrides: Partial<HookStdinPayload> = {}): HookStdinPayload {
  return {
    session_id: "test-session",
    cwd: process.cwd(),
    hook_event_name: "PreToolUse",
    tool_name: "Write",
    tool_input: { file_path: "/tmp/test.txt" },
    transcript_path: "",
    ...overrides,
  };
}

describe("bridge-executor", () => {
  it("executes a script and parses JSON stdout", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "approve.sh"),
      payload(),
    );
    expect(result).not.toBeNull();
    expect(result!.continue).toBe(true);
    expect(result!.hookSpecificOutput?.permissionDecision).toBe("allow");
  });

  it("returns updatedInput from modify-args script", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "modify-args.sh"),
      payload(),
    );
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput?.updatedInput).toEqual({
      file_path: "/tmp/safe-path.txt",
    });
  });

  it("returns additionalContext from add-context script", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "add-context.sh"),
      payload(),
    );
    expect(result).not.toBeNull();
    expect(result!.hookSpecificOutput?.additionalContext).toBe(
      "hook-injected context",
    );
  });

  it("handles continue:false", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "block.sh"),
      payload(),
    );
    expect(result).not.toBeNull();
    expect(result!.continue).toBe(false);
  });

  it("returns null on timeout", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "timeout.sh"),
      payload(),
      200, // 200ms timeout
    );
    expect(result).toBeNull();
  }, 5000);

  it("returns null on invalid JSON output", async () => {
    const result = await executeHookCommand(
      join(SCRIPTS, "bad-json.sh"),
      payload(),
    );
    expect(result).toBeNull();
  });

  it("returns null for non-existent command", async () => {
    const result = await executeHookCommand(
      "/nonexistent/path/to/script.sh",
      payload(),
    );
    expect(result).toBeNull();
  });

  it("treats empty stdout as continue:true", async () => {
    const result = await executeHookCommand(
      "cat > /dev/null",
      payload(),
    );
    expect(result).not.toBeNull();
    expect(result!.continue).toBe(true);
  });

  it("passes stdin payload to the script", async () => {
    // echo-stdin.sh reads stdin but returns its own output
    const result = await executeHookCommand(
      join(SCRIPTS, "echo-stdin.sh"),
      payload({ tool_name: "Read" }),
    );
    expect(result).not.toBeNull();
    expect(result!.continue).toBe(true);
  });
});
