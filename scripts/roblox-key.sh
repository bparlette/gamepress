#!/bin/zsh
# Opens a text editor so you can paste your Roblox Open Cloud API key (and place id), then stores the key in the macOS Keychain
# and deletes the temp file. The key never goes in the repo, shell history or chat. Run:  scripts/roblox-key.sh
set -e
CONF="$HOME/.config/gamepress"; mkdir -p "$CONF"; chmod 700 "$CONF"
IDS="$CONF/roblox.env"; [ -f "$IDS" ] && source "$IDS"
F="$(mktemp -t roblox-key).txt"; chmod 600 "$F"
cat > "$F" <<EOT
# Paste the values after the = signs, save (Cmd+S), then close this window (Cmd+W). Lines starting with # are ignored.
# KEY: create at https://create.roblox.com/dashboard/credentials (scopes: universe.place.write, luau-execution-session read+write).
ROBLOX_API_KEY=
# Ids: the universe id is in the experience URL; the place id is under the experience's Places (or game.PlaceId in Studio).
ROBLOX_UNIVERSE_ID=${ROBLOX_UNIVERSE_ID:-10770585988}
ROBLOX_PLACE_ID=${ROBLOX_PLACE_ID:-}
EOT
echo "Opening an editor. Paste the key, save, and close the window..."
open -W -n -a TextEdit "$F"
KEY="$(grep -E '^ROBLOX_API_KEY=' "$F" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
UNI="$(grep -E '^ROBLOX_UNIVERSE_ID=' "$F" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
PLC="$(grep -E '^ROBLOX_PLACE_ID=' "$F" | head -1 | cut -d= -f2- | tr -d '[:space:]')"
# wipe the temp file whatever happens next
dd if=/dev/zero of="$F" bs=1 count=512 conv=notrunc 2>/dev/null || true; rm -f "$F"
if [ -n "$KEY" ]; then
  security add-generic-password -U -a "$USER" -s gamepress-roblox-api-key -w "$KEY" && echo "Key saved to the macOS Keychain (item: gamepress-roblox-api-key)."
else echo "No key entered; keychain unchanged."; fi
printf 'ROBLOX_UNIVERSE_ID=%s\nROBLOX_PLACE_ID=%s\n' "$UNI" "$PLC" > "$IDS"; chmod 600 "$IDS"
echo "Ids saved to $IDS (outside the repo). Next: node bin/gamepress.mjs roblox <place.rbxl>   (dry run), add --live to publish."
