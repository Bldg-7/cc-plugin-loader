---
"@bldg-7/cc-plugin-loader": patch
---

Register custom `skill` tool so LLM can invoke plugin skills

Skills were visible in the system prompt but calling the Skill tool failed with "not found" because OpenCode has no native skill tool. The plugin now registers a custom `skill` tool via the plugin tool hook, bridging Claude Code's Skill tool to OpenCode.
