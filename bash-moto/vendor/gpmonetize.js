// gpmonetize.js — day-1 monetization primitives for gamepress games.
//
// Zero dependencies. Works in any browser game. All three modules fall back
// gracefully when no ad SDK / payment backend is present, so dev and
// headless test never break.
//
// Usage:
//   import { requestRewarded, showPaywall, generateShareText, copyShareText } from '../kit/gpmonetize.js';
//   import gpmonetize from '../kit/gpmonetize.js'; // default export: everything below
//
// SDKs this adapts to:
//   - CrazyGames SDK v3: https://sdk.crazygames.com/  (window.CrazyGames.SDK.ad.requestAd)
//   - Poki SDK:          https://developers.poki.com/ (window.PokiSDK.rewardedBreak / commercialBreak)
//   - Stripe:            dynamic payment links (https://buy.stripe.com/...) opened in a new tab

// ============================================================================
// 1. Ad adapter — rewarded + interstitial, graceful fallback
// ============================================================================

/** Detect which ad SDK (if any) is present on the page. */
export function detectAdProvider() {
  if (typeof window !== 'undefined') {
    if (window.CrazyGames?.SDK?.ad?.requestAd) return 'crazygames';
    if (typeof window.PokiSDK?.rewardedBreak === 'function') return 'poki';
  }
  return null; // dev / headless / no SDK: immediate success
}

/**
 * Show a rewarded ad. onSuccess() runs when the ad finishes, errors, or is
 * skipped — and immediately when no ad provider is present. Never punish the
 * user (or the dev) for a missing/broken ad.
 *
 * Typical use: revive after death on attempt 2.
 *   requestRewarded(() => player.revive());
 */
export function requestRewarded(onSuccess) {
  const done = () => { try { onSuccess && onSuccess(); } catch (e) { console.warn('[gpmonetize]', e); } };
  const provider = detectAdProvider();

  if (provider === 'crazygames') {
    try {
      window.CrazyGames.SDK.ad.requestAd('rewarded', {
        adFinished: done,
        adError: done,      // don't penalize the user if the ad fails
        adStarted: () => {},
      });
      return;
    } catch (e) { /* fall through to success */ }
  }

  if (provider === 'poki') {
    try {
      window.PokiSDK.rewardedBreak(() => done());
      return;
    } catch (e) { /* fall through to success */ }
  }

  done(); // no provider: free pass
}

/**
 * Show a non-blocking interstitial. Fire-and-forget: never blocks gameplay.
 * Typical use: every Nth game-over, or on level transitions.
 */
export function requestInterstitial() {
  const provider = detectAdProvider();
  if (provider === 'crazygames') {
    try {
      window.CrazyGames.SDK.ad.requestAd('midroll', {
        adFinished: () => {},
        adError: () => {},
        adStarted: () => {},
      });
    } catch (e) {}
  } else if (provider === 'poki') {
    try { window.PokiSDK.commercialBreak(() => {}); } catch (e) {}
  }
  // no provider: silent no-op
}

// ============================================================================
// 2. Paywall gate — one-tap unlock overlay
// ============================================================================

const PAYWALL_ID = 'gpmonetize-paywall';

function paywallCSS() {
  return `
#${PAYWALL_ID}{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;
background:rgba(0,0,0,.82);backdrop-filter:blur(6px);font-family:system-ui,-apple-system,sans-serif}
#${PAYWALL_ID} .gp-card{width:min(88vw,360px);background:#14141c;border:1px solid #2a2a3a;border-radius:20px;
padding:28px 24px;text-align:center;color:#fff;box-shadow:0 24px 80px rgba(0,0,0,.6)}
#${PAYWALL_ID} .gp-emoji{font-size:44px;margin-bottom:8px}
#${PAYWALL_ID} .gp-title{font-size:22px;font-weight:800;margin:0 0 6px}
#${PAYWALL_ID} .gp-sub{font-size:14px;color:#a0a0b8;margin:0 0 18px;line-height:1.45}
#${PAYWALL_ID} .gp-unlock{display:block;width:100%;padding:15px;border:0;border-radius:14px;font-size:17px;font-weight:800;
color:#0a0a0a;background:linear-gradient(135deg,#ffd60a,#ff9f0a);cursor:pointer;margin-bottom:10px}
#${PAYWALL_ID} .gp-unlock:active{transform:scale(.97)}
#${PAYWALL_ID} .gp-later{display:block;width:100%;padding:12px;border:0;background:transparent;color:#8a8aa3;
font-size:14px;cursor:pointer}
#${PAYWALL_ID} .gp-price{font-size:13px;color:#ffd60a;font-weight:700;margin-bottom:14px}
`;
}

/**
 * Full-screen paywall overlay. One tap on "Unlock" opens paymentUrl in a new
 * tab; "Maybe later" dismisses and calls onClose.
 *
 *   showPaywall({
 *     title: 'Unlock Endless Mode',
 *     subtitle: 'Unlimited runs, custom themes, cloud scores.',
 *     price: '$3.99 one-time',
 *     paymentUrl: 'https://buy.stripe.com/your-link',
 *     cta: 'Unlock now',
 *     onClose: () => console.log('dismissed'),
 *   });
 *
 * Returns a close() function. Safe to call repeatedly (reuses the overlay).
 */
export function showPaywall(opts = {}) {
  if (typeof document === 'undefined') return () => {};
  const {
    title = 'Unlock the full game',
    subtitle = 'Endless mode, custom themes, and saved scores.',
    price = '',
    emoji = '🔓',
    cta = 'Unlock now',
    later = 'Maybe later',
    paymentUrl = null,
    onClose = null,
  } = opts;

  let el = document.getElementById(PAYWALL_ID);
  if (!el) {
    const style = document.createElement('style');
    style.id = PAYWALL_ID + '-css';
    style.textContent = paywallCSS();
    document.head.appendChild(style);

    el = document.createElement('div');
    el.id = PAYWALL_ID;
    el.innerHTML = `
      <div class="gp-card">
        <div class="gp-emoji"></div>
        <h2 class="gp-title"></h2>
        <p class="gp-sub"></p>
        <div class="gp-price"></div>
        <button class="gp-unlock"></button>
        <button class="gp-later"></button>
      </div>`;
    document.body.appendChild(el);
  }

  el.querySelector('.gp-emoji').textContent = emoji;
  el.querySelector('.gp-title').textContent = title;
  el.querySelector('.gp-sub').textContent = subtitle;
  el.querySelector('.gp-price').textContent = price;
  el.querySelector('.gp-price').style.display = price ? '' : 'none';
  const unlockBtn = el.querySelector('.gp-unlock');
  unlockBtn.textContent = cta;
  el.querySelector('.gp-later').textContent = later;

  const close = () => {
    el.style.display = 'none';
    try { onClose && onClose(); } catch (e) { console.warn('[gpmonetize]', e); }
  };

  unlockBtn.onclick = () => {
    if (paymentUrl) {
      try { window.open(paymentUrl, '_blank', 'noopener'); } catch (e) {}
    }
    close();
  };
  el.querySelector('.gp-later').onclick = close;
  el.onclick = (e) => { if (e.target === el) close(); }; // tap backdrop to dismiss

  el.style.display = 'flex';
  return close;
}

/** Remove the paywall overlay from the DOM entirely. */
export function destroyPaywall() {
  if (typeof document === 'undefined') return;
  document.getElementById(PAYWALL_ID)?.remove();
  document.getElementById(PAYWALL_ID + '-css')?.remove();
}

// ============================================================================
// 3. Share serializer — Wordle-style emoji score cards
// ============================================================================

const EMOJI_BY_GAME = {
  football: '🏈', soccer: '⚽', kart: '🏎️', farm: '🌾', zombie: '🧟',
  cat: '🐱', dungeon: '🗡️', puzzle: '🧩', shooter: '🔫', runner: '🏃',
};

/**
 * Build a Wordle-style share card.
 *
 *   generateShareText({ title: 'Pigskin Bowl', emoji: '🏈', url: 'https://…' }, 2976, 12)
 *   // "🎮 PIGSKIN BOWL 🏈\n//  Score: 2,976\n//  🔥 12-day streak\n//  Play free: https://…"
 *
 * opts: { title, emoji (or kind for lookup), url, maxScore }
 */
export function generateShareText(game = {}, score = 0, streak = 0) {
  const emoji = game.emoji || EMOJI_BY_GAME[game.kind] || '🎮';
  const title = (game.title || 'My Game').toUpperCase();
  const lines = [`${emoji} ${title} ${emoji}`, `Score: ${Number(score).toLocaleString('en-US')}`];
  if (streak > 1) lines.push(`🔥 ${streak}-game streak`);
  else if (streak === 1) lines.push('🔥 First win!');
  if (game.url) lines.push(`Play: ${game.url}`);
  return lines.join('\n');
}

/**
 * Copy text to clipboard. Uses navigator.clipboard with an execCommand
 * fallback for older browsers / insecure contexts. Returns a Promise<boolean>.
 */
export function copyShareText(text) {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  try {
    if (typeof document === 'undefined') return false;
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch (e) { return false; }
}

/**
 * Convenience: build the card AND copy it, then run a callback (e.g. show a
 * "Copied!" toast). Returns the text.
 */
export function shareScore(game, score, streak, onCopied) {
  const text = generateShareText(game, score, streak);
  copyShareText(text).then((ok) => { try { onCopied && onCopied(ok, text); } catch (e) {} });
  return text;
}

// ============================================================================
// Default export
// ============================================================================

export default {
  detectAdProvider,
  requestRewarded,
  requestInterstitial,
  showPaywall,
  destroyPaywall,
  generateShareText,
  copyShareText,
  shareScore,
};
