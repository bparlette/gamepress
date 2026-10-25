# Cuts from recorded footage (no scripted-clip director): Yeet a Pet (Roblox)

Use when a game has no deterministic director (`docs/GAME-VIRAL-CUTS.md` covers that case). Worked example: Yeet a Pet,
3 Shorts + an 85 s long cut of every pet being flung, in `templates/footage/`.

## Method
1. **Fix capture-hostile UI first**, behind a capture flag (game repo `Config.CAPTURE_MODE` / RS attribute `CaptureMode`):
   hide Roblox's PlayerList/chat/backpack, skip the tutorial overlay, hide the avatar, no debug text. Check glyphs: a
   missing emoji (U+1FA99 coin) renders as a tofu box.
2. **Script the action, don't play it.** `capture_throws.lua` runs in Studio play mode (Studio MCP `run_script_in_play_mode`):
   one fling per pet type, a chase camera on the pet, an in-game name + rarity card, fixed spacing (4.5 s per pet) so the
   edit can be computed. Prints `THROW <t> <pet>`.
3. **Record the screen**: `screencapture -v -V <sec> out.mov` (macOS; the host app needs Screen Recording permission).
   Find where the sequence starts by looking at 0.5 s stills (first card = T0).
4. **Cut**: `build_pet_cuts.py` crops the viewport (measure it on a full-res frame), cuts per-pet windows
   (`T0 + 4.5*i + window`), blur-pads to 1080x1920 (Shorts) or 1920x1080 (long), adds title/CTA PNGs (PIL; this ffmpeg
   has no drawtext), mixes the game's own SFX at the throw times (numpy), loudnorm -14 LUFS.
5. **Look at contact sheets before shipping** (crop clipped the name card once; avatar blocked the shot once).

## Gotchas
- `Studio quit` can return "User canceled" if a dialog is open: no blind GUI automation.
- Odd output heights break libx264 (use even sizes).
- The recorded footage has no audio: the SFX are added in the edit.
- Never leave `CAPTURE_MODE` on in anything published.
