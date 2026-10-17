# Track: Roblox (Studio game, Open Cloud ship)

Roblox games are authored in Studio (Luau), not web. gamepress controls testing and publishing; it cannot author Studio content.
Setup once: `scripts/roblox-key.sh` (key -> Keychain; ids -> `~/.config/gamepress/roblox.env`). Key scopes and the full proven flow: `docs/ROBLOX.md` and the Roblox section of `AGENTS.md`.
Loop:
1. Edit in Studio; Cmd+S (agents may send it via osascript, see AGENTS.md).
2. `gamepress roblox-test <script.luau>` to audit or check the saved place headlessly (reads source, counts, asserts; no client play).
3. `gamepress roblox-ship <file.rbxl> --test templates/roblox-smoke.luau`: save draft, test that version, publish only on pass.
4. Spot-check the live game; use Roblox's retention guidance (Day-1: short skippable tutorial, joyful first loop, daily rewards, funnel analytics, performance monitoring). A first audit of Yeet Pets is summarized in `docs/ROBLOX.md`.
Marketing for Roblox: record Studio/gameplay screen footage, then `gamepress scenes` + `pack social` for Shorts (no `drive`).
