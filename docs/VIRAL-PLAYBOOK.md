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

## The twelve demos and their videos
Each plan is in `examples/<id>/hook.drive.json`. Suggested titles (edit freely):

| Demo | Title | First-second hook caption | Comment bait |
|---|---|---|---|
| tiny-kaiju | He is 2 inches tall and he hates this dollhouse | "HE IS 2 INCHES TALL" | "what should he destroy next?" |
| gravity-janitor | I made a janitor game where gravity flips every 5 seconds | "Night shift on a space station" | "how long would you last?" |
| ball-avalanche | 5 balls turned into 24,000 | "5 balls. 6 gates." | "which gate is the best?" |
| ragdoll-launch | Cannon. Crash dummy. Zero brain cells. | same | "highest score?" |
| voxel-demolition | 9,000 voxels vs 12 shells | "9,000 voxels. 12 shells." | "what landmark next?" |
| marble-elimination | 36 marbles. Last 11 are out. Pick yours | "36 marbles" | "drop your marble's name" |
| glass-stairs | Which pane holds? | "Which pane holds?" | "left or right?" |
| black-hole | It starts by eating coins | "Starts by eating coins" | "can it eat the skyscraper?" |
| speed-ramp | This ramp is too steep | "This ramp is too steep" | "can you land it?" |
| rope-bridge | How much can this bridge hold? | same | "which vehicle breaks it?" |
| crowd-multiplier | 5 guys vs a castle (the math is mathing) | "5 guys vs a castle" | "left or right gate?" |
| bulldozer-wedge | 10,000 pegs. One wedge. It does not stop | same | "satisfying or stressful?" |

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
