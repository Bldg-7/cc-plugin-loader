---
"@bldg-7/cc-plugin-loader": patch
---

Add hook bridge (Phase 2) and fix MCP env handling

- Hook bridge: PreToolUse/PostToolUse command hooks from Claude Code plugins now execute via tool.execute.before/after in OpenCode
- MCP config: skip registration if key already exists in native config, preventing plugin from overwriting user-provided credentials
- expandEnv: support ${VAR:-default} syntax, omit unresolved vars instead of injecting empty strings
