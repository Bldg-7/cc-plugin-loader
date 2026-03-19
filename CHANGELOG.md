# @bldg-7/cc-plugin-loader

## 0.2.0

### Minor Changes

- [`75f2df4`](https://github.com/Bldg-7/cc-plugin-loader/commit/75f2df4177a8c3ea64706dc4a93bbedbb8273a46) Thanks [@ESnark](https://github.com/ESnark)! - Fix agent compatibility with OpenCode

  - Fix TOOL_NAME_MAP: remove NotebookEdit (not in OpenCode), add TodoWrite, Task, LS, Skill
  - Handle scoped tool patterns like `Bash(git:*)` → `bash`
  - Drop unmappable Claude Code tools (NotebookRead, KillShell, BashOutput, AskUserQuestion)
  - Support `tools` as YAML array (e.g. `tools: ["Read", "Grep"]`) in addition to comma-separated string
  - Pass `color` field from agent frontmatter to OpenCode AgentConfig
  - Handle `model: inherit` by omitting model (let OpenCode use parent)

### Patch Changes

- [`fdbffca`](https://github.com/Bldg-7/cc-plugin-loader/commit/fdbffca2ff2d1a5b6c1fd28f2407d5980b435d0a) Thanks [@ESnark](https://github.com/ESnark)! - Add hook bridge (Phase 2) and fix MCP env handling

  - Hook bridge: PreToolUse/PostToolUse command hooks from Claude Code plugins now execute via tool.execute.before/after in OpenCode
  - MCP config: skip registration if key already exists in native config, preventing plugin from overwriting user-provided credentials
  - expandEnv: support ${VAR:-default} syntax, omit unresolved vars instead of injecting empty strings
