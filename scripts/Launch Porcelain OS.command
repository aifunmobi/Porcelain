#!/bin/bash
# Launch Porcelain OS — double-click this from Finder.
#
# Opens the built desktop app, which runs against your real filesystem.
# (The dev server at localhost:5173 is the browser version; that one only ever
# sees a simulated filesystem held in the browser's storage.)

set -u

PROJECT="/Users/peter/Downloads/games/ClaudeOS/porcelain-os"
APP="${PROJECT}/src-tauri/target/release/bundle/macos/porcelain-os.app"

echo "Porcelain OS"
echo "------------"

if [ ! -d "$APP" ]; then
  echo "The app bundle is not built yet:"
  echo "  $APP"
  echo
  echo "Build it with:  cd \"$PROJECT\" && npm run tauri:build"
  echo "(the first Rust compile takes a few minutes)"
  read -r -p "Press Return to close…"
  exit 1
fi

# Already running? Bring it forward instead of starting a second copy.
if pgrep -f "porcelain-os.app/Contents/MacOS" >/dev/null 2>&1; then
  echo "Already running — bringing it to the front."
  open "$APP"
  exit 0
fi

echo "Opening $(basename "$APP")…"
if ! open "$APP"; then
  echo
  echo "macOS refused to open it. If it is quarantined, clear the flag with:"
  echo "  xattr -dr com.apple.quarantine \"$APP\""
  read -r -p "Press Return to close…"
  exit 1
fi

echo "Launched. This window can be closed."
