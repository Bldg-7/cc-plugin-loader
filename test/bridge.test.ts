import { describe, it, expect } from "bun:test";
import { join } from "path";
import { createBridgeHooks } from "../src/hooks/bridge.js";
import { loadHooks } from "../src/hooks/bridge-loader.js";
import type { ParsedPlugin } from "../src/types.js";

const FIXTURE_PLUGIN = join(import.meta.dir, "fixtures", "hooks-plugin");

async function makePlugin(): Promise<ParsedPlugin> {
  const hookEntries = await loadHooks(FIXTURE_PLUGIN, "hooks-test-plugin");
  return {
    name: "hooks-test-plugin",
    installPath: FIXTURE_PLUGIN,
    skills: [],
    agents: [],
    commands: [],
    mcpServers: [],
    hookEntries,
  };
}

describe("bridge (integration)", () => {
  it("creates tool.execute.before hook for PreToolUse entries", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    expect(hooks["tool.execute.before"]).toBeDefined();
  });

  it("creates tool.execute.after hook for PostToolUse entries", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    expect(hooks["tool.execute.after"]).toBeDefined();
  });

  it("creates permission.ask hook for PermissionRequest entries", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    expect(hooks["permission.ask"]).toBeDefined();
  });

  it("returns empty hooks when no hook entries exist", () => {
    const plugin: ParsedPlugin = {
      name: "empty",
      installPath: "/empty",
      skills: [],
      agents: [],
      commands: [],
      mcpServers: [],
      hookEntries: [],
    };
    const hooks = createBridgeHooks([plugin]);
    expect(Object.keys(hooks)).toHaveLength(0);
  });

  it("tool.execute.before applies updatedInput to args", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    const beforeHook = hooks["tool.execute.before"]!;

    const output = { args: { file_path: "/original.txt", content: "hello" } };
    // "write" maps to "Write" via REVERSE_TOOL_NAME_MAP — matches the "Write" matcher
    await beforeHook(
      { tool: "write", sessionID: "s1", callID: "c1" },
      output,
    );

    // modify-args.sh sets file_path to /tmp/safe-path.txt
    expect(output.args.file_path).toBe("/tmp/safe-path.txt");
    // original content should remain
    expect(output.args.content).toBe("hello");
  });

  it("tool.execute.after appends additionalContext to output", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    const afterHook = hooks["tool.execute.after"]!;

    const output = { title: "test", output: "original output", metadata: {} };
    await afterHook(
      { tool: "bash", sessionID: "s1", callID: "c1", args: {} },
      output,
    );

    expect(output.output).toContain("hook-injected context");
    expect(output.output).toContain("original output");
  });

  it("permission.ask sets status from permissionDecision", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    const permHook = hooks["permission.ask"]!;

    const output = { status: "ask" as "ask" | "deny" | "allow" };
    await permHook(
      {
        id: "p1",
        type: "bash",
        sessionID: "s1",
        messageID: "m1",
        metadata: {},
        time: { created: Date.now() },
      },
      output,
    );

    expect(output.status).toBe("allow");
  });

  it("permission.ask does not change status for non-matching type", async () => {
    const plugin = await makePlugin();
    const hooks = createBridgeHooks([plugin]);
    const permHook = hooks["permission.ask"]!;

    const output = { status: "ask" as "ask" | "deny" | "allow" };
    await permHook(
      {
        id: "p1",
        type: "unknown-tool",
        sessionID: "s1",
        messageID: "m1",
        metadata: {},
        time: { created: Date.now() },
      },
      output,
    );

    expect(output.status).toBe("ask");
  });

  it("merges hooks from multiple plugins", async () => {
    const plugin1 = await makePlugin();
    const plugin2: ParsedPlugin = {
      name: "another",
      installPath: "/another",
      skills: [],
      agents: [],
      commands: [],
      mcpServers: [],
      hookEntries: [
        {
          pluginName: "another",
          installPath: "/another",
          event: "UserPromptSubmit",
          command: "echo '{\"continue\":true}'",
          timeout: 10000,
        },
      ],
    };

    const hooks = createBridgeHooks([plugin1, plugin2]);
    expect(hooks["tool.execute.before"]).toBeDefined();
    expect(hooks["chat.message"]).toBeDefined();
  });
});
