/**
 * kit/gptouch.js — Modern mobile touch standard for gamepress games.
 *
 * The industry-standard mobile layout (Brawl Stars / Genshin / Archero style):
 *   LEFT HALF  (x < innerWidth/2): floating virtual joystick. No fixed pad —
 *              touching anywhere anchors the stick under the thumb, drag gives
 *              a normalized vector clamped to maxRadius, release resets.
 *   RIGHT HALF: circular action buttons in a fixed bottom-right cluster
 *              (default A=primary, B=secondary). Generous touch targets,
 *              scale-tween on press.
 *
 * Touch hygiene: PointerEvent API with per-pointerId tracking, so the joystick
 * and buttons never cancel each other. touch-action:none kills scroll/zoom
 * rubber-banding.
 *
 * Usage (game template, ~5 lines):
 *   import { TouchController, isTouchDevice } from '../_vendor/gptouch.js';
 *   const TC = isTouchDevice() ? new TouchController({
 *     buttons: [ { id: 'a', label: '⚔' }, { id: 'b', label: '🛡' } ],
 *   }) : null;
 *   // in update(dt): call ONCE per frame
 *   const ti = TC ? TC.getInput() : null;
 *   const left  = (ti && ti.x < -0.35) || g.keys.ArrowLeft;
 *   const right = (ti && ti.x >  0.35) || g.keys.ArrowRight;
 *   const atk   = (ti && ti.aPressed)   || g.pressed.Space;
 *
 * Contract:
 *   - Zero dependencies, ESM, no THREE / canvas needed (DOM overlay).
 *   - No-op on desktop: isTouchDevice() is false, so TC is null and the
 *     game's keyboard path runs untouched. `?touch=0` forces it off.
 *   - getInput() returns the state; *Pressed edge flags auto-consume on read,
 *     so call it exactly once per frame.
 *   - Headless/bot runs (drive, botcheck) see no touch device -> null -> the
 *     old g.btn/keyboard path runs, bots unaffected.
 */

/** True when this device has touch input. Honors ?touch=0 to force off. */
export function isTouchDevice() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  try {
    if (new URLSearchParams(location.search).get('touch') === '0') return false;
  } catch (e) { /* non-browser */ }
  return ('ontouchstart' in window)
    || (navigator.maxTouchPoints > 0)
    || (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches);
}

/**
 * Pure: clamp a drag delta to maxRadius, normalize to [-1, 1].
 * Returns { x, y, mag } where mag is 0..1 throw distance.
 */
export function clampStick(dx, dy, maxRadius) {
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-9 || maxRadius <= 0) return { x: 0, y: 0, mag: 0 };
  const cl = Math.min(dist, maxRadius);
  const nx = dx / dist, ny = dy / dist, m = cl / maxRadius;
  return { x: nx * m, y: ny * m, mag: m };
}

/**
 * Pure: clampStick + deadzone. Below deadzone -> zero; above rescales so the
 * usable throw still spans 0..1 (full-throw feel preserved).
 */
export function stickVector(dx, dy, maxRadius, deadzone = 0) {
  const c = clampStick(dx, dy, maxRadius);
  if (c.mag < deadzone || c.mag < 1e-9) return { x: 0, y: 0, mag: 0 };
  const m = deadzone >= 1 ? 1 : (c.mag - deadzone) / (1 - deadzone);
  return { x: (c.x / c.mag) * m, y: (c.y / c.mag) * m, mag: m };
}

const BTN_STYLE = {
  position: 'absolute',
  borderRadius: '50%',
  border: '2px solid rgba(255,255,255,.45)',
  background: 'rgba(20,20,35,.38)',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'system-ui, sans-serif',
  fontWeight: '800',
  transform: 'scale(1)',
  transition: 'transform .06s ease, background .06s ease',
  WebkitTapHighlightColor: 'transparent',
  userSelect: 'none',
  pointerEvents: 'auto',
  touchAction: 'none',
};

export class TouchController {
  /**
   * options:
   *   buttons:  [{ id, label, size? }] — default A/B. Up to 4 supported.
   *   maxRadius: stick throw in px (default 56)
   *   deadzone:  stick deadzone 0..1 (default 0.18)
   *   force:     build the DOM even on non-touch devices (testing)
   *   zIndex:    overlay z-index (default 1000)
   */
  constructor(options = {}) {
    this.maxRadius = options.maxRadius || 56;
    this.deadzone = options.deadzone ?? 0.18;
    this.zIndex = options.zIndex || 1000;
    this.enabled = false;
    this.vector = { x: 0, y: 0 };
    this._buttons = {};   // id -> { held, pressed, el, pointerId, def }
    this._defs = (options.buttons && options.buttons.length ? options.buttons : [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ]).slice(0, 4);
    this._activeStickId = null;
    this._stickOrigin = { x: 0, y: 0 };
    this._els = null;
    this._onDown = null; this._onMove = null; this._onUp = null;

    const want = options.force === true || isTouchDevice();
    if (want && typeof document !== 'undefined') {
      this._initDOM();
      this._bindEvents();
      this.enabled = true;
    }
  }

  _initDOM() {
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', width: '100vw', height: '100vh',
      pointerEvents: 'auto', touchAction: 'none', userSelect: 'none',
      WebkitUserSelect: 'none', WebkitTapHighlightColor: 'transparent',
      zIndex: String(this.zIndex),
    });

    const base = document.createElement('div');
    Object.assign(base.style, {
      position: 'absolute', width: this.maxRadius * 2 + 'px', height: this.maxRadius * 2 + 'px',
      borderRadius: '50%', border: '2px solid rgba(255,255,255,.4)',
      background: 'rgba(255,255,255,.07)', transform: 'translate(-50%,-50%)',
      display: 'none', pointerEvents: 'none',
    });
    const knob = document.createElement('div');
    Object.assign(knob.style, {
      position: 'absolute', width: Math.round(this.maxRadius * 0.92) + 'px', height: Math.round(this.maxRadius * 0.92) + 'px',
      borderRadius: '50%', background: 'rgba(255,255,255,.5)',
      boxShadow: '0 0 12px rgba(255,255,255,.35)', transform: 'translate(-50%,-50%)',
      display: 'none', pointerEvents: 'none',
    });

    overlay.appendChild(base);
    overlay.appendChild(knob);

    // Right-side circular cluster, primary button biggest and lowest.
    this._defs.forEach((def, i) => {
      const size = def.size || (i === 0 ? 84 : 64);
      const el = document.createElement('div');
      Object.assign(el.style, BTN_STYLE, {
        right: (20 + i * 92) + 'px',
        bottom: (96 - i * 30) + 'px',
        width: size + 'px', height: size + 'px',
        fontSize: Math.round(size * 0.32) + 'px',
      });
      el.textContent = def.label || def.id.toUpperCase();
      el.dataset.gptouch = def.id;
      overlay.appendChild(el);
      this._buttons[def.id] = { held: false, pressed: false, el, pointerId: null, def };
    });

    document.body.appendChild(overlay);
    this._els = { overlay, base, knob };
  }

  _hitButton(x, y) {
    for (const id in this._buttons) {
      const b = this._buttons[id];
      const r = b.el.getBoundingClientRect();
      // generous touch target: pad the rect by 8px
      if (x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return b;
    }
    return null;
  }

  _bindEvents() {
    const { overlay, base, knob } = this._els;

    this._onDown = (e) => {
      // Buttons win over the stick no matter which half they're on.
      const b = this._hitButton(e.clientX, e.clientY);
      if (b && b.pointerId === null) {
        b.pointerId = e.pointerId;
        b.held = true; b.pressed = true;
        b.el.style.transform = 'scale(0.86)';
        b.el.style.background = 'rgba(255,255,255,.45)';
        e.preventDefault();
        return;
      }
      // Left half: floating stick anchors under the thumb.
      if (e.clientX < window.innerWidth / 2 && this._activeStickId === null && !b) {
        this._activeStickId = e.pointerId;
        this._stickOrigin = { x: e.clientX, y: e.clientY };
        base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.style.display = 'block';
        knob.style.left = e.clientX + 'px'; knob.style.top = e.clientY + 'px'; knob.style.display = 'block';
        e.preventDefault();
      }
    };

    this._onMove = (e) => {
      if (e.pointerId !== this._activeStickId) return;
      const dx = e.clientX - this._stickOrigin.x;
      const dy = e.clientY - this._stickOrigin.y;
      const v = stickVector(dx, dy, this.maxRadius, this.deadzone);
      this.vector.x = v.x; this.vector.y = v.y;
      // Knob follows the clamped (pre-deadzone) throw so it tracks the thumb.
      const c = clampStick(dx, dy, this.maxRadius);
      const dist = Math.hypot(dx, dy) || 1e-9;
      knob.style.left = (this._stickOrigin.x + (dx / dist) * c.mag * this.maxRadius) + 'px';
      knob.style.top = (this._stickOrigin.y + (dy / dist) * c.mag * this.maxRadius) + 'px';
      if (e.cancelable) e.preventDefault();
    };

    const release = (e) => {
      if (e.pointerId === this._activeStickId) {
        this._activeStickId = null;
        this.vector.x = 0; this.vector.y = 0;
        base.style.display = 'none'; knob.style.display = 'none';
      }
      for (const id in this._buttons) {
        const b = this._buttons[id];
        if (e.pointerId === b.pointerId) {
          b.pointerId = null; b.held = false;
          b.el.style.transform = 'scale(1)';
          b.el.style.background = 'rgba(20,20,35,.38)';
        }
      }
    };
    this._onUp = release;

    overlay.addEventListener('pointerdown', this._onDown);
    overlay.addEventListener('pointermove', this._onMove);
    overlay.addEventListener('pointerup', this._onUp);
    overlay.addEventListener('pointercancel', this._onUp);
  }

  /**
   * Read the current input. Call exactly once per frame — the *Pressed edge
   * flags auto-consume on read. Returns { x, y } (stick, -1..1) plus one
   * entry per button: { [id]: held, [id]Pressed: edge }.
   */
  getInput() {
    const out = { x: this.vector.x, y: this.vector.y };
    for (const id in this._buttons) {
      const b = this._buttons[id];
      out[id] = b.held;
      out[id + 'Pressed'] = b.pressed;
      b.pressed = false; // consume edge
    }
    // Convenience aliases when the default a/b layout is used.
    if (!('a' in out)) { out.a = false; out.aPressed = false; }
    if (!('b' in out)) { out.b = false; out.bPressed = false; }
    return out;
  }

  /** Remove the overlay and unbind. Safe to call when disabled. */
  destroy() {
    if (!this._els) return;
    const { overlay } = this._els;
    overlay.removeEventListener('pointerdown', this._onDown);
    overlay.removeEventListener('pointermove', this._onMove);
    overlay.removeEventListener('pointerup', this._onUp);
    overlay.removeEventListener('pointercancel', this._onUp);
    overlay.remove();
    this._els = null;
    this.enabled = false;
    this._buttons = {};
  }
}
