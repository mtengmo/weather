#!/bin/bash
# Fångar cat/head/tail/less/more av stora filer via Bash-verktyget,
# som annars kringgår check-file-size.sh.

LINE_THRESHOLD=350

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

# Matcha bara enkla läskommandon i stil med "cat <fil>" etc.
if echo "$COMMAND" | grep -qE '^\s*(cat|head|tail|less|more)\s+[^|;&]+$'; then
  FILE_PATH=$(echo "$COMMAND" | awk '{print $NF}')

  if [ -f "$FILE_PATH" ]; then
    LINES=$(wc -l < "$FILE_PATH" | tr -d ' ')

    if [ "$LINES" -gt "$LINE_THRESHOLD" ]; then
      echo "'$FILE_PATH' har $LINES rader (gräns: $LINE_THRESHOLD). Använd subagenten 'bulk-reader' istället för att streama hela filen genom Bash." >&2
      exit 2
    fi
  fi
fi

exit 0
