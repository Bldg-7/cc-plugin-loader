import { describe, it, expect } from "bun:test";
import { matchHooks } from "../src/hooks/bridge-matcher.js";
import type { ResolvedHookEntry } from "../src/hooks/bridge-types.js";

function entry(
  overrides: Partial<ResolvedHookEntry> = {},
): ResolvedHookEntry {
  return {
    pluginName: "test",
    installPath: "/test",
    event: "PreToolUse",
    command: "echo ok",
    timeout: 10000,
    ...overrides,
  };
}

describe("bridge-matcher", () => {
  it("matches by event name", () => {
    const entries = [
      entry({ event: "PreToolUse" }),
      entry({ event: "PostToolUse" }),
    ];
    const result = matchHooks(entries, "PreToolUse", "Write");
    expect(result).toHaveLength(1);
    expect(result[0].event).toBe("PreToolUse");
  });

  it("matches wildcard (*) matcher", () => {
    const entries = [entry({ matcher: "*" })];
    const result = matchHooks(entries, "PreToolUse", "AnyTool");
    expect(result).toHaveLength(1);
  });

  it("matches when no matcher is set (wildcard)", () => {
    const entries = [entry({ matcher: undefined })];
    const result = matchHooks(entries, "PreToolUse", "AnyTool");
    expect(result).toHaveLength(1);
  });

  it("matches exact tool name", () => {
    const entries = [entry({ matcher: "Write" })];
    expect(matchHooks(entries, "PreToolUse", "Write")).toHaveLength(1);
    expect(matchHooks(entries, "PreToolUse", "Read")).toHaveLength(0);
  });

  it("matcher is case-sensitive", () => {
    const entries = [entry({ matcher: "Write" })];
    expect(matchHooks(entries, "PreToolUse", "write")).toHaveLength(0);
  });

  it("returns empty for no matches", () => {
    const entries = [entry({ event: "PostToolUse", matcher: "Bash" })];
    expect(matchHooks(entries, "PreToolUse", "Write")).toHaveLength(0);
  });

  it("returns multiple matching entries", () => {
    const entries = [
      entry({ matcher: "Write" }),
      entry({ matcher: "*" }),
      entry({ matcher: "Read" }),
    ];
    const result = matchHooks(entries, "PreToolUse", "Write");
    expect(result).toHaveLength(2);
  });

  it("works without tool name for non-tool events", () => {
    const entries = [entry({ event: "UserPromptSubmit" })];
    const result = matchHooks(entries, "UserPromptSubmit");
    expect(result).toHaveLength(1);
  });

  it("does not match specific matcher when no toolName provided", () => {
    const entries = [entry({ matcher: "Write" })];
    const result = matchHooks(entries, "PreToolUse");
    expect(result).toHaveLength(0);
  });
});
