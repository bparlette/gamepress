# Monetize track — turn gamepress games into revenue

Ship focused, single-mechanic web games and micro-apps with monetization
baked in from day 1. No complex platforms, no deep multi-level epics:
one emotional impulse (dopamine, vanity, fear, instant utility), friction-free
payment, and a viral loop that films itself.

Core thesis: keep day 1 free to maximize retention and clip recording, then
gate the good stuff (endless mode, themes, score saving) behind a 1-tap paywall
or rewarded ads. Build for 9:16 first — the game IS the ad.

## When to use this track

- The user wants the game to make money (not just exist).
- The game is a single-mechanic arcade slice, micro-SaaS tool, or gimmick
  game — not a narrative epic.
- Target is web/PWA first (instant play, no app-store wait), optionally
  wrapped for CrazyGames / Poki distribution.

If the game is a free portfolio piece or a jam demo, use `demo` instead.

## The 5 blueprint models

| Model | Hook | Monetization | Viral engine |
|---|---|---|---|
| **TikTok-for-minigames feed** | Vertical swipe feed; every scroll loads a new 15-second gamepress slice. Zero install, runs in mobile Safari/Chrome. | Rewarded interstitials (CrazyGames/Poki SDK) to continue streaks or unlock skins. | Screen recordings of high-speed swipes; commenters argue about scores. |
| **Niche aesthetic repackaging** | One utility (habit streak, push-up counter, workout log) skinned for a hyper-specific demographic. | $4.99/mo or $29 lifetime via Stripe / Apple IAP. | TikTok/Reels clips of clean UI setups. |
| **Viral gimmick games** | Bizarre AI twist on a classic mechanic (chess vs a fruit-fly brain, etc.). | Merch, tips, or traffic funnel to paid apps. | Curiosity on X/Reddit; organic press embeds. |
| **Whop / Discord tools** | Prediction mini-games, card draws, leaderboards embedded in communities. | 15% rev share, paid tiers, or $19/mo per community. | Community owners distribute to their own audiences. |
| **Single-file micro-SaaS** | Interactive calculators / simulators (options payoff, energy payback, prompt-to-3D). | 3 free uses/day → $9/mo unlimited via Stripe Checkout. | SEO capture + short demo videos answering one question. |

## Day-1 monetization primitives

Implement these on day 1, before polishing anything else:

1. **Paywall-first architecture** — day 1 is free; lock Endless Mode,
   custom themes, or score saving behind `showPaywall()`. Stripe payment
   links (`https://buy.stripe.com/…`) need no backend.
2. **Web ad SDKs** — deploy to web/PWA, plug in CrazyGames or Poki SDK.
   Trigger `requestRewarded()` when the player dies on attempt 2 (revive),
   `requestInterstitial()` every Nth game-over. Both degrade to no-ops
   without an SDK, so dev/test never breaks.
3. **Distribution-first building** — frame everything for 9:16. The
   win/loss screen gets a 1-tap share button: `shareScore()` builds a
   Wordle-style emoji card and copies it for SMS / X / TikTok.

## Integration guide

```js
import { requestRewarded, showPaywall, shareScore } from '../kit/gpmonetize.js';

// Revive after death (attempt 2+)
function onDeath(attempt) {
  if (attempt >= 2) requestRewarded(() => player.revive());
  else showGameOver();
}

// Gate endless mode
if (!unlocked && score > 1000) {
  showPaywall({
    title: 'Unlock Endless Mode',
    subtitle: 'Unlimited runs, custom themes, cloud scores.',
    price: '$3.99 one-time',
    paymentUrl: 'https://buy.stripe.com/your-link',
  });
}

// Share button on the results screen
shareBtn.onclick = () =>
  shareScore({ title: 'Pigskin Bowl', emoji: '🏈', url: location.href }, score, streak,
    (ok) => toast(ok ? 'Copied! Paste it anywhere 📋' : 'Copy failed'));
```

## SDK links

| SDK | Docs | Gamepress hook |
|---|---|---|
| CrazyGames SDK v3 | https://sdk.crazygames.com/ | `window.CrazyGames.SDK.ad.requestAd` (auto-detected) |
| Poki SDK | https://developers.poki.com/ | `window.PokiSDK.rewardedBreak` (auto-detected) |
| Stripe payment links | https://stripe.com/docs/payment-links | paste link into `showPaywall({ paymentUrl })` |
| Apple IAP | App Store Connect | native wrapper only; web build uses Stripe |

## Rules

- Never block gameplay on a failed ad — `requestRewarded` always resolves.
- Never show the paywall before the player has had fun (at least one full
  run / 60 seconds of play).
- Price anchoring: one clear tier beats three confusing ones.
- The share card is the cheapest user acquisition you have — make the
  button unmissable on win/loss screens.
- Track: log `paywall_shown`, `paywall_dismissed`, `ad_rewarded`,
  `share_copied` events however you log analytics.
