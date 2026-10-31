# Cabinet health baseline (2026-10-31)

Every registered game (40), one run each: `seedcheck.cjs` (determinism + seed sensitivity at 25 s/60 s + frame hash), `baseline.cjs` (bot outcome, up to 180 s game time, seed 1, page errors), `tiers.cjs` (tier parity, seeds 1-3). Regenerate: `node baseline.cjs ids...`, `node seedcheck.cjs ids...`.

| game | seedcheck | bot outcome (seed 1) | game s | tiers | status |
|---|---|---|---|---|---|
| g1 | pass | GAME OVER | 32 | n/a (single tier) | bot loses |
| g2 | pass | YOU WIN! | 71 | n/a (single tier) | green |
| g3 | pass | ROUTE CLEAR | 76 | n/a (single tier) | green |
| g4 | pass | ARENA CLEAR | 54 | n/a (single tier) | green |
| g5 | pass | GAME OVER | 23 | n/a (single tier) | bot loses |
| g6 | ERROR (crash in 60 s bot run) | KO! YOU WIN | 98 | n/a (single tier) | ERROR |
| g7 | pass | MAZE CLEAR | 14 | n/a (single tier) | green |
| g8 | pass | SUMMIT FINISH! | 15 | n/a (single tier) | green |
| g9 | pass | SUMMIT FINISH! | 14 | n/a (single tier) | green |
| g10 | pass | FINISH! | 16 | n/a (single tier) | green |
| g11 | pass | YOU WIN | 61 | n/a (single tier) | green |
| g12 | pass | KO! YOU WIN | 31 | n/a (single tier) | green |
| g13 | pass | FINISH P1 | 42 | n/a (single tier) | green |
| g14 | pass | YOU DIED | 40 | n/a (single tier) | bot loses |
| g15 | pass | SURVIVED! | 38 | n/a (single tier) | green |
| g16 | pass | QUOTA CLEAR! | 41 | n/a (single tier) | green |
| g17 | pass | HIVE CLEAR! | 39 | baseline | green |
| g18 | pass | SUMMIT CLEAR! | 42 | n/a (single tier) | green |
| g19 | pass | BED BLOWN! CLEAR | 32 | n/a (single tier) | green |
| g20 | pass | HIVE CLEARED! | 27 | n/a (single tier) | green |
| g21 | pass | ESCAPED! | 40 | n/a (single tier) | green |
| g22 | pass | SHIFT CLEARED! | 41 | n/a (single tier) | green |
| g23 | pass | KRAKEN LANDED! | 34 | n/a (single tier) | green |
| g24 | pass | LAST ONE STANDING! | 50 | n/a (single tier) | green |
| g25 | pass | 1,000,000 VIEWS! | 37 | n/a (single tier) | green |
| g26 | pass | TIME UP | 91 | n/a (single tier) | bot loses |
| g27 | pass | EXTRACTED! | 28 | n/a (single tier) | green |
| g28 | pass | CASE CLEARED | 31 | n/a (single tier) | green |
| g29 | pass | FIVE STAR CLEAR | 32 | n/a (single tier) | green |
| g30 | pass | CARTEL CLEARED | 28 | n/a (single tier) | green |
| g31 | pass | FARM CLEARED | 29 | n/a (single tier) | green |
| g17b | pass | HIVE CLEAR! | 39 | = g17 (HD+) | green |
| g17c | pass | HIVE CLEAR! | 39 | = g17 (Art) | green |
| g17d | pass | HIVE CLEAR! | 39 | = g17 (Lux) | green |
| g17e | pass | HIVE CLEAR! | 38 | differs (declared) | green |
| g17f | pass | HIVE CLEAR! | 38 | differs (declared) | green |
| g17g | pass | HIVE CLEAR! | 38 | differs (declared) | green |
| g17h | pass | HIVE CLEAR! | 36 | = pixel/HD/art (engine.js sim) | green |
| s1 | pass | SURVIVED! | 41 | = pixel/HD/art | green |
| s2 | pass | COURSE CLEAR! | 10 | = pixel/HD/art | green |
| s3 | pass | GATE HELD! | 127 | = pixel/HD/art | green |

**36 of 41 green** (40 originally registered + g17h added later). Not green:
- **g1**: bot loses, seedcheck pass, bot outcome "GAME OVER"
- **g5**: bot loses, seedcheck pass, bot outcome "GAME OVER"
- **g6**: ERROR, seedcheck ERROR (crash in 60 s bot run), bot outcome "KO! YOU WIN"
- **g14**: bot loses, seedcheck pass, bot outcome "YOU DIED"
- **g26**: bot loses, seedcheck pass, bot outcome "TIME UP"

Notes
- `g6`: crashes in `phase1` (`foes6[i]` undefined mid-loop) on some seeds after 25 s (seed 123 reproduces; seed 1 happens to win). A one-line guard fixes it (`docs/patches-g6-crash-fix.patch.txt`, NOT applied; awaiting approval). With it, seedcheck passes and the bot still wins on seeds 1, 2, 3, 123, 124.
- "bot loses" means the scripted bot does not win within 180 s on seed 1; I have not checked whether these games were ever meant to be bot-winnable, so this is a map entry, not a declared defect.
- Only the g17 family and s1-s3 have HD/Art tiers, so tier parity applies to 10 of 40. g17e/f/g differ by design (auto power-ups, analog move): declared with `--expect-diff`.
- `g17g` is art-only: `seedcheck.cjs g17g.art`, since `build.py g17g` without `--art` fails by design.
