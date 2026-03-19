#!/bin/sh
# Reads stdin and wraps it in a hook result
INPUT=$(cat)
echo "{\"continue\":true,\"hookSpecificOutput\":{\"additionalContext\":\"echoed\"}}"
