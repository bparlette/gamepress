// presets: saved answer shortcuts for `gamepress auto`. The AI driver asks the human
// questions conversationally in chat, then runs `auto --answers answers.json`; presets
// let the human's recurring preferences persist across runs without re-asking.
//
// Storage: ~/.config/gamepress/presets/<name>.json (GP_PRESET_DIR overrides, same
// convention as GP_GAMES/GP_CATALOG). Format is plain JSON an AI can construct:
//
//   { "name": "cherie", "created": "2026-10-17T...", "archetype": "eater",
//     "recipe": "hole-eater",
//     "answers": { "style": 2, "theme": 0, "hook": "custom text here" } }
//
// answers maps question-id -> option index, or free text for custom:true questions.
// Unknown question ids and out-of-range indices are skipped on load, never crash.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { createInterface } from 'node:readline';

export const presetDir = () => join(process.env.GP_PRESET_DIR || process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), ...(process.env.GP_PRESET_DIR ? [] : ['gamepress', 'presets']));
const file = name => join(presetDir(), `${name}.json`);
const validName = n => /^[a-z0-9][a-z0-9-_]{0,40}$/i.test(n);

export function listPresets() {
  const d = presetDir(); if (!existsSync(d)) return [];
  return readdirSync(d).filter(f => f.endsWith('.json')).map(f => {
    try { const p = JSON.parse(readFileSync(join(d, f), 'utf8')); return { name: p.name || f.replace(/\.json$/, ''), created: p.created || null, answers: Object.keys(p.answers || {}).length, archetype: p.archetype || null }; }
    catch { return { name: f.replace(/\.json$/, ''), created: null, answers: 0, archetype: null, broken: true }; }
  }).sort((a, b) => a.name.localeCompare(b.name));
}

export function loadPreset(name) {
  if (!validName(name)) throw new Error(`bad preset name "${name}" (letters, numbers, -, _)`);
  const f = file(name); if (!existsSync(f)) throw new Error(`preset "${name}" not found (gamepress preset list)`);
  const p = JSON.parse(readFileSync(f, 'utf8'));
  if (!p.answers || typeof p.answers !== 'object') throw new Error(`preset "${name}" has no answers object`);
  return p;
}

export function savePreset(name, { answers, archetype = null, recipe = null }) {
  if (!validName(name)) throw new Error(`bad preset name "${name}" (letters, numbers, -, _)`);
  if (!answers || !Object.keys(answers).length) throw new Error('nothing to save: run gamepress auto first so there are answers to keep');
  mkdirSync(presetDir(), { recursive: true });
  writeFileSync(file(name), JSON.stringify({ name, created: new Date().toISOString(), archetype, recipe, answers }, null, 2));
  return file(name);
}

export function deletePreset(name) {
  if (!validName(name)) throw new Error(`bad preset name "${name}"`);
  const f = file(name); if (!existsSync(f)) throw new Error(`preset "${name}" not found`);
  rmSync(f); return true;
}

/** Keep only answers that fit the current questions: unknown ids and out-of-range
 *  indices are dropped silently so presets survive question reordering. */
export function sanitizeAnswers(raw, questions) {
  const byId = Object.fromEntries(questions.map(q => [q.id, q])), clean = {};
  for (const [id, v] of Object.entries(raw || {})) {
    const q = byId[id]; if (!q) continue;
    if (typeof v === 'string') { if (q.custom && v.trim()) clean[id] = v; continue; }
    const n = Number(v);
    if (Number.isInteger(n) && n >= 0 && n < q.options.length) clean[id] = n;
  }
  return clean;
}

/** Read an --answers file: accepts a bare {questionId: index|"text"} map or a preset-shaped {answers: {...}} wrapper. */
export function readAnswersFile(path) {
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const raw = j.answers && typeof j.answers === 'object' ? j.answers : j;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error(`${path}: expected {"questionId": index} or {"answers": {...}}`);
  return raw;
}

// ---------------------------------------------------------------- last run
/** auto records its final answers here so `preset save` can keep them. */
export function recordLastAnswers(stateDir, data) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'last-answers.json'), JSON.stringify({ ...data, at: Date.now() }, null, 2));
}
export function readLastAnswers(stateDir) {
  try { return JSON.parse(readFileSync(join(stateDir, 'last-answers.json'), 'utf8')); } catch { return null; }
}

// ---------------------------------------------------------------- opt-in prompting
/** Minimal interactive prompt (opt-in via --prompt only; the AI driver is the normal
 *  path). Prints each question, Enter accepts the default. */
export async function promptAnswers(questions, current = {}) {
  if (!process.stdin.isTTY) throw new Error('--prompt needs an interactive terminal; use --answers answers.json instead');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = q => new Promise(r => rl.question(q, r)), out = {};
  try {
    for (const q of questions.slice(0, 4)) {
      const def = current[q.id] ?? q.default ?? 0;
      console.log(`\n${q.ask}`);
      q.options.forEach((o, i) => console.log(`  ${i}) ${o.label}${i === def ? '  [default]' : ''}`));
      if (q.custom) console.log('  (or type custom text)');
      const t = (await ask(`Choice [${def}]: `)).trim();
      if (!t) { out[q.id] = def; continue; }
      if (q.custom && !/^\d+$/.test(t)) { out[q.id] = t; continue; }
      const n = Number(t);
      out[q.id] = Number.isInteger(n) && n >= 0 && n < q.options.length ? n : def;
    }
  } finally { rl.close(); }
  return out;
}
