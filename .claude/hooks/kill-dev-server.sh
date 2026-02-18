#!/bin/bash
# Kill the Vite dev server for this worktree's assigned port
DIR_NAME=$(basename "$(pwd)")
case "$DIR_NAME" in
  cwn-character-creator) PORT=5100 ;;
  cwn-workspace-1) PORT=5101 ;;
  cwn-workspace-2) PORT=5102 ;;
  cwn-workspace-3) PORT=5103 ;;
  *) exit 0 ;;
esac

lsof -ti:"$PORT" | xargs kill 2>/dev/null
exit 0
