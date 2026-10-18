# Viral playbook for tiny game demos

Written from the channel's own Shorts data (16 Shorts read with `yt-dlp --flat-playlist`, views approximate, Oct 2026).

## What the numbers say
| Views | Title | Pattern |
|---|---|---|
| 1.6k | Impossible physics driving game. But Tesla did it in real life | real-world hook + physics gag |
| 1.3k | I made a cheat code or maybe a game fail! He walks through walls. Jump scare! | glitch framed as a bug + scare |
| 1.2k | I can't believe Sonic just did this to Bowser | familiar characters, one gag |
| 1.2k | 8 fighters, 8 brutal finishers | numbered montage of payoffs |
| 1.1k | These stages kill you | hazard reveal |
| 1.0k | I made the Ninja Turtles x Tony Hawk game we never got | "game we never got" |
| 23 to 113 | anything titled "... Trailer" / "Final Boss (SNES)" | flat: nobody searches for it |

Rules that follow:
1. **Never title it "trailer".** State a surprising claim or a payoff.
2. **One gag per Short**, visible in the first second. Captions carry the hook; the game carries the payoff.
3. **A known thing with a twist** beats an original thing with no handle.
4. **Invite a guess or a vote** ("which pane holds?", "pick your marble"): comments feed the algorithm.
5. Loop-friendly endings; 12 to 25 seconds; a one-line CTA only in the last 5 s.

## Retention Timeline
The 5-beat structure every viral game video follows:
- **0.0–1.5s VISUAL HOOK**: Pattern interrupt. Action already in progress, no logos/menus. Text overlay top-center.
- **1.5–8.0s ESCALATION**: Micro-stakes. Speed/pitch/difficulty climbing. Viewer thinks "ok this is getting intense."
- **8.0–18.0s TENSION**: "Can he win?" Near-misses, close calls. The itch.
- **18.0–24.0s PAYOFF**: Screen shake, confetti, SFX climax. The scratch.
- **24.0s SEAMLESS LOOP**: Cut back to a frame that flows into 0.0s. Loop = rewatch = algorithm boost.

## Fail-Then-Win
A core pattern: **Attempt 0 FAILS at 3–5s** (creates cognitive itch — "I could do better"). **Attempt 1 escalates to victory.** This doubles as a retention hook AND a comment driver ("bro just jump earlier"). Script the bot to deliberately flub the first run, then play it clean.

## Platform Drivers
- **YouTube Shorts**: Optimize for APV >110% and swipe-away <25%. Use the fail-then-win loop. Captions top-center in the 10–22% caption zone, NEVER bottom 28% (blocked by title/channel UI).
- **TikTok**: Optimize for comment velocity and shares. Use rage bait / perceived incompetence — bot makes near-misses that make viewers comment corrections. POV/challenge framing: "Why is stage 4 actually impossible?"
- **Twitter/X**: Optimize for silent autoplay pattern interrupt. Frame 1 must be high-density spectacle (explosions, massive combos, screen shake). Caption: short technical/dev punchline.

## Safe Zones (9:16)
Core gameplay elements, combo counters, and text overlays must never sit in the platform UI danger zones:
- **Caption zone: 10–22% from top** — bold high-contrast hooks go here (`pos: "safe-top"` in drive plans)
- **Core action band: 25–70% vertical** — keep the character and hazards inside this band; center-weighted action
- **Right edge: 15% danger** — Like/Share/Remix buttons block it
- **Bottom: 28% danger** — Shorts title, audio tag, channel name block it
- **FOV compensation**: a 9:16 vertical viewport crops a 16:9 3D scene. Zoom the Three.js camera out ~1.35× or lock horizontal FOV so side obstacles don't clip off-screen.

`kit/gpviewport.js` encodes these zones — use it for HUD placement and drive caption positions instead of hand-tuning.

## Juice Hierarchy
When stacking effects, priority order:
1. Frame hit-stop (3–6 frames) — the single most impactful juice
2. Chromatic aberration pulse
3. Semitone pitch escalation on SFX
4. Screen shake (proportional to event)
5. Particles/confetti

## Unmute Bait
Short-form ranking rewards audio hooks that work even on mute — or create the urge to unmute. Techniques:
- Sudden silence → massive hit (drop all audio for 0.5s before the climax, then slam back)
- Signature sound that only resolves on payoff (a rising tone that doesn't complete until the win)
- Visual rhythm that implies sound (pulsing on beat even when muted, so unmuting feels like unlocking)

## Loop Quality
A seamless loop needs more than cutting end-to-start. Match across the cut:
- Camera angle and position (end frame ≈ start frame composition)
- Energy level (don't cut from explosion to calm menu)
- Color grade (no sudden palette shifts)
Test: watch the loop 3x. If the cut is jarring on the 2nd loop, it's not seamless.

## Bot Personality
Pure technical perfection feels sterile. Give the bot a light character:
- Slightly overconfident (rushes in, almost fails, then god-mode saves it)
- Slightly clumsy in a funny way (trips, recovers with style)
- Never pure random, never pure perfect — the gap between "almost failed" and "nailed it" drives comments and shares

## Bot Precision Spec
Theatrical bot behavior is choreographed, not random. Direct the `?auto=1` bot with measurable specs:
- **Near-miss grazing: 2–4px clearance.** Keep the collision box within 2–4 pixels of obstacles during Attempt 1. Barely-cleared hazards generate ~3× the retention of wide, safe clearances. Measure it — "close" is not a spec.
- **BPM sync: 120 or 140.** Quantize obstacle-clear events to 120 or 140 BPM so gameplay naturally syncs with trending short-form background tracks.

## Hook Templates
Never write a generic caption. Use one of these proven patterns (bold sans-serif, black border, yellow/white fill, top-center in the 10–22% caption zone):
- **Skill Challenge**: "Level 1 is easy. Level 3 broke me."
- **Mechanical Curiosity**: "What happens if you combine [X] with [Y]?"
- **Perceived Incompetence** (comment driver): "My bot has been trying this jump for 4 hours..."
- **Nostalgia Juxtaposition**: "Why modern games can't match 16-bit sound design."
- **Collision Hook** (2026: gaming Shorts need 85%+ retention on first 100 impressions — oversupplied category): two contradictory facts in frame one. "This game has no jump button. You beat it by falling." "The boss is invincible. The floor is the weapon."

## The twelve demos and their videos
Each plan is in `examples/<id>/hook.drive.json`. Suggested titles (edit freely):

| Demo | Title | First-second hook caption | Comment bait |
|---|---|---|---|
| tiny-kaiju | He is 2 inches tall and he hates this dollhouse | "HE IS 2 INCHES TALL" | "what should he destroy next?" |
| gravity-janitor | I made a janitor game where gravity flips every 5 seconds | "Night shift on a space station" | "how long would you last?" |
| cat-avalanche | 5 balls turned into 24,000 | "5 balls. 6 gates." | "which gate is the best?" |
| zombie-launch | Cannon. Crash dummy. Zero brain cells. | same | "highest score?" |
| voxel-demolition | 9,000 voxels vs 12 shells | "9,000 voxels. 12 shells." | "what landmark next?" |
| cat-derby | 36 marbles. Last 11 are out. Pick yours | "36 marbles" | "drop your marble's name" |
| glass-stairs | Which pane holds? | "Which pane holds?" | "left or right?" |
| black-hole | It starts by eating coins | "Starts by eating coins" | "can it eat the skyscraper?" |
| speed-ramp | This ramp is too steep | "This ramp is too steep" | "can you land it?" |
| rope-bridge | How much can this bridge hold? | same | "which vehicle breaks it?" |
| zombie-horde | 5 guys vs a castle (the math is mathing) | "5 guys vs a castle" | "left or right gate?" |
| zombie-plow | 10,000 pegs. One wedge. It does not stop | same | "satisfying or stressful?" |

Posting: one Short per day from the queue; put the playable link in the pinned comment and channel bio (Shorts descriptions
do not link out reliably). Link the demo page https://bparlette.github.io/Hawk/brad-demos/. Reply to the first 30 comments quickly.

## Next ten game ideas (all new, quick, one level or less)
Elevator Etiquette, Sneeze Simulator, Parking Lot Duel (shopping-cart Western), Dumpster Diver Roguelite, Group Chat Hostage,
Haunted Roomba, Pizza Delivery From Hell, Reverse Dodgeball, plus the dropped Tiny Kaiju and Gravity Janitor (now built). Pick by
"does it have a single image that reads in one second?"

## Process (scripted end to end)
1. Build the game (`docs/MAKING-GAMES.md`). 2. `gamepress drive --quick` to prove the script. 3. Full render.
4. `gamepress catalog` to publish it on the demo page. 5. Upload by hand; track views; keep what works (kaiju and
   physics gags, glitch framings), cut what does not.

## Output contract: always show the links

Every gamepress run must end with the AI showing the user links to the main products — no exceptions, no "it's in the folder." The outputs:

1. **Game link** — wherever the game is playable: local file path, GitHub Pages URL, Cloudflare URL, itch.io page, Steam store page, Roblox experience link. Whatever the user's output host was.
2. **Video link** — the viral clip / trailer. Google Drive preview link, YouTube Shorts URL, or local file path. Must be playable on the user's phone.
3. **Images** — thumbnail + at least one screenshot. Linked, not just "saved to disk."

If the game isn't hosted anywhere yet, say so explicitly and offer the next step ("want me to put this on itch.io?"). Never end with "done" and no links.
