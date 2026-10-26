// gptween: high-performance, juicy animation and spring physics engine for Gamepress.
// Zero-build ESM, 60fps deterministic under simulation, GSAP/Anime-grade easing.

export const Easing = {
  linear: t => t,
  easeInQuad: t => t * t,
  easeOutQuad: t => t * (2 - t),
  easeInOutQuad: t => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  easeOutCubic: t => (--t) * t * t + 1,
  easeInOutCubic: t => t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeOutBack: (t, s = 1.70158) => { t -= 1; return t * t * ((s + 1) * t + s) + 1; },
  easeInBack: (t, s = 1.70158) => t * t * ((s + 1) * t - s),
  easeOutElastic: (t, p = 0.3) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  },
  easeOutBounce: t => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  spring: (t, damping = 12, freq = 20) => {
    return 1 - Math.exp(-damping * t) * Math.cos(freq * t);
  }
};

class TweenRunner {
  constructor() {
    this.tweens = [];
    this.springs = [];
  }

  to(target, props, { duration = 0.3, ease = Easing.easeOutQuad, onUpdate, onComplete } = {}) {
    const starts = {};
    for (const k of Object.keys(props)) {
      starts[k] = target[k] ?? 0;
    }
    const tw = { target, props, starts, duration, ease, t: 0, onUpdate, onComplete, done: false };
    this.tweens.push(tw);
    return tw;
  }

  punch(target, prop, amount, duration = 0.25) {
    const start = target[prop] ?? 0;
    return this.to(target, { [prop]: start }, {
      duration,
      ease: Easing.easeOutElastic,
      onUpdate: (tw, u) => {
        target[prop] = start + Math.sin(u * Math.PI * 4) * amount * (1 - u);
      }
    });
  }

  step(dt) {
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      tw.t += dt;
      const u = Math.min(1, tw.t / tw.duration);
      const eased = tw.ease(u);
      for (const k of Object.keys(tw.props)) {
        tw.target[k] = tw.starts[k] + (tw.props[k] - tw.starts[k]) * eased;
      }
      tw.onUpdate?.(tw, u);
      if (u >= 1) {
        tw.done = true;
        this.tweens.splice(i, 1);
        tw.onComplete?.();
      }
    }
  }

  clear() {
    this.tweens.length = 0;
  }
}

export const tweens = new TweenRunner();
export const tween = (target, props, opts) => tweens.to(target, props, opts);
export const punch = (target, prop, amount, duration) => tweens.punch(target, prop, amount, duration);
