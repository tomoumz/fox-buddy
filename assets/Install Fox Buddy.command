#!/bin/bash
# Fox Buddy installer — double-click me.
# 1. Copies "Fox Buddy.app" into your Applications folder.
# 2. Signs it for this Mac only (ad-hoc, with Apple's built-in codesign tool),
#    because it isn't from the App Store and macOS would otherwise say it's "damaged".
# 3. Opens Timmy. He then starts by himself every time you log in.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
APP="$HERE/Fox Buddy.app"
DEST="/Applications/Fox Buddy.app"
echo "🦊  Installing Fox Buddy..."
if [ ! -d "$APP" ]; then echo "Couldn't find Fox Buddy.app next to this installer."; read -n1 -p "Press any key to close."; exit 1; fi
osascript -e 'quit app "Fox Buddy"' 2>/dev/null || true
rm -rf "$DEST"
cp -R "$APP" "$DEST"
xattr -cr "$DEST"
codesign --force --deep --sign - "$DEST" >/dev/null 2>&1
open "$DEST"
echo ""
echo "✅  Done! Timmy, Sussie and Mimi are above your dock."
echo "    Look for the 🦊 icon in the menu bar at the top of your screen."
echo "    You can close this window."
