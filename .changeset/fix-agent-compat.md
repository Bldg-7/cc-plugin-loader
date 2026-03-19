---
"@bldg-7/cc-plugin-loader": minor
---

Fix agent compatibility with OpenCode

- Fix TOOL_NAME_MAP: remove NotebookEdit (not in OpenCode), add TodoWrite, Task, LS, Skill
- Handle scoped tool patterns like `Bash(git:*)` → `bash`
- Drop unmappable Claude Code tools (NotebookRead, KillShell, BashOutput, AskUserQuestion)
- Support `tools` as YAML array (e.g. `tools: ["Read", "Grep"]`) in addition to comma-separated string
- Pass `color` field from agent frontmatter to OpenCode AgentConfig
- Handle `model: inherit` by omitting model (let OpenCode use parent)
