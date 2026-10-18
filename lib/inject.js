// Injected before the game's own scripts (Page.addScriptToEvaluateOnNewDocument). Replaces every clock the
// game can read with a virtual one that only moves when gamepress calls __gp.step(), and seeds Math.random.
// Result: the same plan renders the same video every time, however slow the machine is.
(() => {
  const SEED = __SEED__;
  let now = 0, rafId = 0, timerId = 0, rafs = [], timers = [];
  const realDate = Date;
  window.requestAnimationFrame = cb => { rafs.push([++rafId, cb]); return rafId; };
  window.cancelAnimationFrame = id => { rafs = rafs.filter(r => r[0] !== id); };
  window.setTimeout = (fn, ms = 0, ...a) => { timers.push({ id: ++timerId, at: now + ms, fn, a }); return timerId; };
  window.setInterval = (fn, ms = 0, ...a) => { timers.push({ id: ++timerId, at: now + ms, fn, a, every: Math.max(1, ms) }); return timerId; };
  window.clearTimeout = window.clearInterval = id => { timers = timers.filter(t => t.id !== id); };
  performance.now = () => now;
  Date.now = () => 1.7e12 + now;
  let s = SEED >>> 0;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

  // overlay for captions (drawn into the page so screenshots include them)
  let box;
  const ensureBox = () => box || (box = Object.assign(document.body.appendChild(document.createElement('div')), { id: '__gp_captions' }), box.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483647;font-family:Impact,"Arial Black",system-ui,sans-serif', box);
  const STYLES = {
    hook: 'font-size:7.4vmin;line-height:1.05;color:#fff;text-transform:uppercase;text-align:center;-webkit-text-stroke:1.2vmin #000;paint-order:stroke fill;letter-spacing:.2vmin;padding:0 6vw;',
    pop: 'font-size:11vmin;line-height:1;color:#ffd34d;text-transform:uppercase;text-align:center;-webkit-text-stroke:1.6vmin #000;paint-order:stroke fill;padding:0 4vw;',
    sub: 'font-size:4.6vmin;font-family:system-ui,sans-serif;font-weight:800;color:#fff;text-align:center;background:rgba(0,0,0,.62);border-radius:1.6vmin;padding:1.4vmin 3vmin;margin:0 6vw;',
    cta: 'font-size:5vmin;font-weight:900;color:#111;text-align:center;background:#ffd34d;border-radius:2vmin;padding:1.6vmin 4vmin;font-family:system-ui,sans-serif;',
  };
  const POS = { tiptop: 'top:1%', top: 'top:14%', upper: 'top:24%', center: 'top:46%', lower: 'top:68%', bottom: 'bottom:30%' };

  window.__gp = {
    time: () => now,
    // advance the virtual clock by ms: fire due timers, then one animation-frame round
    step(ms) {
      const end = now + ms;
      for (;;) {
        const due = timers.filter(t => t.at <= end).sort((a, b) => a.at - b.at)[0];
        if (!due) break;
        now = Math.max(now, due.at);
        if (due.every) due.at += due.every; else timers = timers.filter(t => t !== due);
        try { due.fn(...due.a); } catch (e) { console.error(e); }
      }
      now = end;
      const run = rafs; rafs = [];
      for (const [, cb] of run) { try { cb(now); } catch (e) { console.error(e); } }
      return now;
    },
    // caption list: [{text, pos, style, age}] ; age (s) drives the pop-in scale
    captions(list) {
      const b = ensureBox();
      b.innerHTML = list.map(c => {
        const k = Math.min(1, c.age / 0.16), sc = 1 + (1 - k) * (1 - k) * 0.5;
        return `<div style="position:absolute;left:0;right:0;display:flex;justify-content:center;${POS[c.pos] || POS.top};opacity:${k.toFixed(2)};transform:scale(${sc.toFixed(3)})"><div style="${STYLES[c.style] || STYLES.hook}">${String(c.text).replace(/</g, '&lt;')}</div></div>`;
      }).join('');
    },
  };
})();
