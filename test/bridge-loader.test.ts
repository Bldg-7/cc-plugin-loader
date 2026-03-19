import { describe, it, expect } from "bun:test";
import { join } from "path";
import { loadHooks } from "../src/hooks/bridge-loader.js";

const FIXTURE_PLUGIN = join(
  import.meta.dir,
  "fixtures",
  "hooks-plugin",
);

describe("bridge-loader", () => {
  it("loads hooks.json and resolves entries", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    expect(entries.length).toBeGreaterThan(0);

    // All entries should have pluginName set
    for (const entry of entries) {
      expect(entry.pluginName).toBe("hooks-test-plugin");
      expect(entry.installPath).toBe(FIXTURE_PLUGIN);
    }
  });

  it("expands ${CLAUDE_PLUGIN_ROOT} in commands", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    for (const entry of entries) {
      expect(entry.command).not.toContain("${CLAUDE_PLUGIN_ROOT}");
      expect(entry.command).toContain(FIXTURE_PLUGIN);
    }
  });

  it("filters out non-command hook types", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    // The fixture has a "prompt" type hook in PermissionRequest — should be filtered
    const permEntries = entries.filter(
      (e) => e.event === "PermissionRequest",
    );
    // Only the command type should remain (approve.sh), not the prompt type
    expect(permEntries).toHaveLength(1);
    expect(permEntries[0].command).toContain("approve.sh");
  });

  it("parses timeout from hooks.json (seconds → ms)", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    const writeHook = entries.find(
      (e) => e.event === "PreToolUse" && e.matcher === "Write",
    );
    expect(writeHook).toBeDefined();
    expect(writeHook!.timeout).toBe(5000); // 5 seconds → 5000ms
  });

  it("uses default timeout when not specified", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    const wildcardHook = entries.find(
      (e) => e.event === "PreToolUse" && e.matcher === "*",
    );
    expect(wildcardHook).toBeDefined();
    expect(wildcardHook!.timeout).toBe(10000); // default 10s → 10000ms
  });

  it("returns empty array when hooks dir does not exist", async () => {
    const entries = await loadHooks("/nonexistent/path", "missing");
    expect(entries).toEqual([]);
  });

  it("preserves matcher values", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    const matchers = entries
      .filter((e) => e.event === "PreToolUse")
      .map((e) => e.matcher);
    expect(matchers).toContain("Write");
    expect(matchers).toContain("*");
  });

  it("loads entries for all events", async () => {
    const entries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
    const events = new Set(entries.map((e) => e.event));
    expect(events.has("PreToolUse")).toBe(true);
    expect(events.has("PostToolUse")).toBe(true);
    expect(events.has("PermissionRequest")).toBe(true);
  });
});
