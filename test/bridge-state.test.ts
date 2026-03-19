import { describe, it, expect, beforeEach } from "bun:test";
import { makeKey, hasRun, markRun, reset } from "../src/hooks/bridge-state.js";

describe("bridge-state", () => {
  beforeEach(() => {
    reset();
  });

  it("generates consistent keys", () => {
    const key = makeKey("my-plugin", "PreToolUse", "check.sh");
    expect(key).toBe("my-plugin:PreToolUse:check.sh");
  });

  it("tracks executed hooks", () => {
    const key = makeKey("p", "PreToolUse", "cmd");
    expect(hasRun(key)).toBe(false);
    markRun(key);
    expect(hasRun(key)).toBe(true);
  });

  it("reset clears all state", () => {
    const key = makeKey("p", "PreToolUse", "cmd");
    markRun(key);
    expect(hasRun(key)).toBe(true);
    reset();
    expect(hasRun(key)).toBe(false);
  });

  it("tracks multiple keys independently", () => {
    const k1 = makeKey("p1", "PreToolUse", "cmd1");
    const k2 = makeKey("p2", "PostToolUse", "cmd2");
    markRun(k1);
    expect(hasRun(k1)).toBe(true);
    expect(hasRun(k2)).toBe(false);
  });
});
