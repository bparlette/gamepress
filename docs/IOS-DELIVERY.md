# iOS delivery — getting gamepress games onto iPhone

Three tiers, easiest first. gamepress games are HTML/JS, so all three are viable.

## Tier 1: PWA (zero effort, today)
Add to Home Screen from Safari. The game already works — `icons` command generates the PWA icon set + manifest. No App Store, no review, no cost. Best for: demos, viral links, testing.

## Tier 2: Capacitor wrapper (1 day, App Store)
Wrap the web build in a native shell via [Capacitor](https://capacitorjs.com/). The game runs in a WKWebView with full hardware acceleration; add native plugins for haptics, Game Center, IAP as needed. Requires: Apple Developer account ($99/yr), Xcode, App Store review. Best for: shipping the actual gamepress game as-is to the App Store.

## Tier 3: Native SwiftUI rewrite (AI-assisted)
For games that need native performance or platform integration. Workflow (from @BreejeAnadkat):
1. Dump context into Claude: what the game does, who it's for, reference apps you like. Pull real flows from Mobbin (onboarding, paywalls, settings).
2. Claude Design for 3-4 structural directions on the key screen; pick one.
3. Design base style in Figma (key screens only — typography, spacing, colors, components).
4. Claude Code via Figma MCP builds the screens in SwiftUI, following the established style. Hand-design tricky screens yourself (paywalls especially — "not trust it with the paywall good yet").

## Which tier when
| Situation | Tier |
|---|---|
| Viral demo link | 1 (PWA) |
| Paid game on App Store, web game is good enough | 2 (Capacitor) |
| Needs 120fps, Metal, Game Center multiplayer | 3 (SwiftUI) |

## Monetization note
Tier 2/3 unlock Apple IAP (15-30% cut vs Stripe's ~3%). For the F2P whale mechanics in `docs/tracks/monetize.md`, native IAP is the expected payment rail — web Stripe links feel foreign inside an App Store game.

Source: [@BreejeAnadkat](https://x.com/BreejeAnadkat/status/2111411956599149046) (Oct 17, 2026).
