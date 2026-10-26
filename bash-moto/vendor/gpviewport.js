// gpviewport: safe-zone layout engine for cross-platform video export.
// Shorts/TikTok/IG cover parts of the frame with UI: the bottom ~28% is the
// title/audio/channel block, like/comment/share buttons hug the right ~15%,
// platform chrome eats the top ~10%. Bold hook captions go in the 10–22%
// caption zone; core action (character + hazards) stays in the 25–70% band.
// This module maps those zones so game HUD and drive captions never hide
// behind them — one coordinate system, no per-platform code.
//
// Usage (in a game):
//   import { viewport } from '../_vendor/gpviewport.js';
//   const vp = viewport(540, 960);            // CSS px of the canvas
//   st.hud.hint('TAP', { y: vp.safeBottom(1.2) });   // above the caption zone
//
// Usage (in a drive plan): captions get `pos: "safe-top" | "safe-bottom"` etc.
// and lib/drive.mjs resolves them through the same zones.
const ZONES = {
  // [top, right, bottom, left] as fractions of height (top/bottom) and width (left/right)
  '9:16':  { top: .10, right: .15, bottom: .28, left: .04, label: 'Shorts/TikTok/Reels' },
  '1:1':   { top: .06, right: .06, bottom: .18, left: .06, label: 'Feed square' },
  '16:9':  { top: .06, right: .04, bottom: .12, left: .04, label: 'Desktop embed' },
};

function ratio(w, h) {
  const r = w / h;
  if (Math.abs(r - 9 / 16) < .08) return '9:16';
  if (Math.abs(r - 1) < .08) return '1:1';
  return '16:9';
}

/** Build a viewport helper for a canvas of w×h CSS px. */
export function viewport(w, h, forceRatio) {
  const key = forceRatio || ratio(w, h);
  const z = ZONES[key];
  const px = {
    top: z.top * h, right: z.right * w, bottom: z.bottom * h, left: z.left * w,
    w, h, ratio: key,
  };
  // Safe content rect (everything visible on every platform)
  px.safe = { x: px.left, y: px.top, w: w - px.left - px.right, h: h - px.top - px.bottom };
  // Anchors: fractions are of the SAFE rect, so 0.5 is always truly centered
  px.at = (fx, fy) => ({ x: px.safe.x + fx * px.safe.w, y: px.safe.y + fy * px.safe.h });
  px.topCenter = (dy = 0) => ({ x: w / 2, y: px.top + dy });
  px.bottomCenter = (dy = 0) => ({ x: w / 2, y: h - px.bottom - dy });
  px.center = () => ({ x: px.safe.x + px.safe.w / 2, y: px.safe.y + px.safe.h / 2 });
  // Convenience: y for HUD rows stacked above the caption dead zone
  px.safeBottom = (em = 0) => h - px.bottom - em * 16;
  px.safeTop = (em = 0) => px.top + em * 16;
  // Core action band (9:16: 25–70% vertical) — keep character + hazards inside
  px.actionBand = () => ({ y0: .25 * h, y1: .70 * h });
  // Caption zone (9:16: 10–22% from top) — bold hook text goes here
  px.captionZone = () => ({ y0: .10 * h, y1: .22 * h });
  // Where drive captions should go for each style
  px.captionPos = (style) => {
    switch (style) {
      case 'hook': return { ...px.topCenter(24), anchor: 'top' };
      case 'pop': return { ...px.center(), anchor: 'center' };
      case 'cta': return { ...px.bottomCenter(96), anchor: 'bottom' };
      default: return { ...px.bottomCenter(32), anchor: 'bottom' };   // sub
    }
  };
  return px;
}

export const RATIOS = Object.keys(ZONES);
export const ZONE_INFO = ZONES;
