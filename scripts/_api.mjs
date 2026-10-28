// _api.mjs — the engine's API surface, harvested from the kit source.
// Deliberately permissive: it exists to catch *invented hooks* (g.onPoint, g.onSwipe,
// g.onUpdate) and *invented fx methods* (g.fx.ring, g.fx.p) before the browser does,
// not to enforce a type system.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const KIT = resolve('/Users/braidpairlette/.gemini/antigravity/scratch/gamepress/kit');

/* names that are never engine API but show up legitimately in game code */
const OK = new Set(`ctx canvas W H w h x y z n p q r s t u v a b c d e f g i j k l m o
  length push pop slice splice map filter forEach find findIndex some every reduce sort
  from keys values entries assign set get has add delete clear createObjectURL
  dt seed state style auto clean mode attempt score best hud keys pressed taps ptr sim
  mode timeScale freeze slowT shakeA flashA flashC bannerT banner overT result fxl pops btns
  pointers muted fever dumb k t`.split(/\s+/).filter(Boolean));

export function engineApi() {
  const files = readdirSync(KIT).filter(f => f.endsWith('.js') && !/\.min\.js$/.test(f));
  const src = files.map(f => readFileSync(resolve(KIT, f), 'utf8')).join('\n');

  const g = new Set();
  for (const m of src.matchAll(/\bg\.([A-Za-z_$][\w$]*)/g)) g.add(m[1]);
  for (const m of src.matchAll(/(?:^|[,{\s])([A-Za-z_$][\w$]*)\s*:/g)) g.add(m[1]);   // object keys are fair game
  /* brace-match a chunk starting at a marker so we only read that construct */
  const chunk = (marker, maxSkip = 400) => {
    const at = src.indexOf(marker);
    if (at < 0) return '';
    /* if the construct has a parameter list before its body, skip past it
       (so `o = {}` defaults don't masquerade as the body) */
    let i = src.indexOf('{', at);
    const par0 = src.indexOf('(', at);
    if (par0 >= 0 && par0 < i) {
      let par = 0, j = par0;
      for (; j < at + maxSkip; j++) { if (src[j] === '(') par++; else if (src[j] === ')') { par--; if (!par) break; } }
      i = src.indexOf('{', j);
    }
    let depth = 0, end = at + maxSkip;
    for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) { end = i; break; } }
    return src.slice(at, end + 1);
  };
  const members = (body) => {
    const set = new Set();
    for (const m of body.matchAll(/\bthis\.([A-Za-z_$][\w$]*)/g)) set.add(m[1]);
    for (const m of body.matchAll(/^\s+(?:static\s+)?([A-Za-z_$][\w$]*)\s*\(/gm)) set.add(m[1]);
    for (const m of body.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) set.add(m[1]);
    for (const m of body.matchAll(/emit\('([A-Za-z_$][\w$]*)'/g)) set.add(m[1]);
    return set;
  };
  const fx = members(chunk('class FX'));
  for (const m of src.matchAll(/\bthis\.fx\.([A-Za-z_$][\w$]*)/g)) fx.add(m[1]);
  const combo = members(chunk('makeCombo'));
  for (const m of src.matchAll(/\bcombo\.([A-Za-z_$][\w$]*)/g)) combo.add(m[1]);
  return { g, ns: { fx, combo } };
}

export function lintFile(src, api = engineApi()) {
  const defined = new Set([...src.matchAll(/\bg\.([A-Za-z_$][\w$]*)\s*=[^=]/g)].map(m => m[1]));
  const nsDefined = new Set([...src.matchAll(/\bg\.(fx|combo)\s*=[^=]/g)].map(m => m[1]));
  const out = [];
  for (const m of src.matchAll(/\bg\.([A-Za-z_$][\w$]*)/g)) {
    const k = m[1];
    if (api.g.has(k) || defined.has(k) || OK.has(k)) continue;
    out.push({ line: src.slice(0, m.index).split('\n').length, msg: `g.${k} is not in the engine API` });
  }
  for (const [name, members] of Object.entries(api.ns)) {
    if (nsDefined.has(name)) continue;
    for (const m of src.matchAll(new RegExp(`\\bg\\.${name}\\.([A-Za-z_$][\\w$]*)`, 'g'))) {
      if (members.has(m[1]) || OK.has(m[1])) continue;
      out.push({ line: src.slice(0, m.index).split('\n').length, msg: `g.${name}.${m[1]} is not in the engine API` });
    }
  }
  return out;
}

/* every name each kit module actually exports — an import of a missing name is a blank screen */
export function kitExports() {
  const files = readdirSync(KIT).filter(f => f.endsWith('.js') && !/\.min\.js$/.test(f));
  const out = {};
  for (const f of files) {
    const src = readFileSync(resolve(KIT, f), 'utf8');
    const names = new Set();
    for (const m of src.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
    for (const m of src.matchAll(/export\s*\{([^}]*)\}/g))
      m[1].split(',').forEach(x => { const n = x.trim().split(/\s+as\s+/).pop().trim(); if (n) names.add(n); });
    out[f] = names;
  }
  return out;
}

/** check every `import { ... } from '../_vendor/x.js'` against what the kit really exports */
export function lintImports(src, ex = kitExports()) {
  const bad = [];
  for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    const file = m[2].split('/').pop();
    const exported = ex[file];
    if (!exported) { bad.push({ line: src.slice(0, m.index).split('\n').length, msg: `unknown module ${file}` }); continue; }
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name && !exported.has(name)) bad.push({ line: src.slice(0, m.index).split('\n').length, msg: `${name} is not exported by ${file}` });
    }
  }
  return bad;
}
