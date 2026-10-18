#!/bin/bash
# Blockerar Read av stora filer och pekar mot bulk-reader-subagenten.
# Riktade läsningar (offset + limit satta) släpps igenom, eftersom
# huvudmodellen redan vet vilken sektion den vill ha.

LINE_THRESHOLD=350

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
OFFSET=$(echo "$INPUT" | jq -r '.tool_input.offset // empty')
LIMIT=$(echo "$INPUT" | jq -r '.tool_input.limit // empty')

# Släpp igenom om filen saknas, eller om det är en riktad läsning
if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

if [ -n "$OFFSET" ] && [ -n "$LIMIT" ]; then
  exit 0
fi

LINES=$(wc -l < "$FILE_PATH" | tr -d ' ')

if [ "$LINES" -gt "$LINE_THRESHOLD" ]; then
  echo "Filen '$FILE_PATH' har $LINES rader (gräns: $LINE_THRESHOLD). Läs den inte i sin helhet. Delegera istället till subagenten 'bulk-reader' via Task-verktyget, eller gör en riktad läsning med offset/limit om du redan vet vilken sektion du behöver." >&2
  exit 2
fi

exit 0
