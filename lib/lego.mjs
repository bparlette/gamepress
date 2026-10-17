// Composable "Lego" hybrid game generator (`gamepress lego <id> --spec <json>` or from an idea string).
// Works 100% deterministically offline, with optional Local AI spec enrichment when --local-ai is passed.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { askLocalAi, isLocalAiEnabled } from './local_ai.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..');
const ensure = d => mkdirSync(d, { recursive: true });

export const LEGO_SCHEMA = {
  controllers: ['topdown', 'swerve', 'aim-flick', 'tap-drop', 'orbit'],
  spawners: ['wave-horde', 'falling', 'gate-lanes', 'clusters'],
  hooks: ['vacuum-collect', 'chain-explode', 'merge-tier', 'knockback-brawl', 'slice-split'],
  progressions: ['xp-3-choice', 'size-grow', 'multiplier-gates', 'combo-fever'],
  chars: ['cat', 'dog', 'zombie', 'person'],
};

/** Deterministically map a raw idea string to Lego blocks (0 tokens, works without any LLM). */
export function inferLegoSpecFromIdea(idea, id) {
  const s = String(idea || id || 'hybrid rush').toLowerCase();
  const slug = id || s.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'lego-rush';
  const words = s.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2 && !/^(the|and|with|for|game|where|you|that|into|from)$/.test(w));
  const title = (words.slice(0, 2).join(' ') || slug).toUpperCase();

  const controller = /lane|run|gate|swerve|road/.test(s) ? 'swerve'
    : /orbit|blade|spin|shield/.test(s) ? 'orbit'
    : /drop|fall|catch/.test(s) ? 'tap-drop'
    : /shoot|aim|snipe|flick/.test(s) ? 'aim-flick' : 'topdown';

  const spawner = /gate|multiplier|choice/.test(s) ? 'gate-lanes'
    : /fall|rain|drop|meteor/.test(s) ? 'falling'
    : /cluster|group|pack|squad/.test(s) ? 'clusters' : 'wave-horde';

  const hook = /merge|combine|evolve|tier/.test(s) ? 'merge-tier'
    : /explod|bomb|blast|chain|barrel/.test(s) ? 'chain-explode'
    : /vacuum|suck|magnet|hoard|collect/.test(s) ? 'vacuum-collect'
    : /slice|cut|chop|split/.test(s) ? 'slice-split' : 'knockback-brawl';

  const progression = /gate|x2|double/.test(s) ? 'multiplier-gates'
    : /xp|level|upgrade|rogue|survivor/.test(s) ? 'xp-3-choice'
    : /combo|fever|streak/.test(s) ? 'combo-fever' : 'size-grow';

  const heroKind = /dog|pup|hound/.test(s) ? 'dog' : /human|person|dad|karen|guy|hero/.test(s) ? 'person' : 'cat';
  const enemyKind = /zombie|undead|monster/.test(s) ? 'zombie' : /person|crowd|human/.test(s) ? 'person' : 'dog';

  return {
    id: slug,
    title,
    sub: 'Drag or WASD to survive',
    hookText: `99% FAIL THIS ${title} CHALLENGE`,
    bg: '#182238',
    accent: '#ffd34d',
    heroKind,
    heroColor: '#ff9a3c',
    enemyKind,
    enemyColor: '#8fcf7a',
    controller,
    spawner,
    hook,
    progression,
    winScore: 250,
    roundSec: 13,
  };
}

/** Build a playable Lego hybrid game, drive plan, and meta.json. Optionally enriches via Local AI if enabled. */
export async function buildLegoGame(id, { idea = '', spec = {}, gamesDir = 'games', examples = 'examples', localAi = false } = {}) {
  let finalSpec = { ...inferLegoSpecFromIdea(idea || id, id), ...spec, id };

  if (isLocalAiEnabled({ localAi }) && idea) {
    const prompt = [
      `Design a hybrid arcade game spec for idea: "${idea}" (id: "${id}").`,
      `Choose strictly from these blocks:`,
      `- controller: ${LEGO_SCHEMA.controllers.join(' | ')}`,
      `- spawner: ${LEGO_SCHEMA.spawners.join(' | ')}`,
      `- hook: ${LEGO_SCHEMA.hooks.join(' | ')}`,
      `- progression: ${LEGO_SCHEMA.progressions.join(' | ')}`,
      `- heroKind / enemyKind: ${LEGO_SCHEMA.chars.join(' | ')}`,
      `Return JSON with keys: {title, sub, hookText, bg, accent, heroKind, heroColor, enemyKind, enemyColor, controller, spawner, hook, progression}.`,
    ].join('\n');
    const ai = await askLocalAi(prompt, { json: true, enabled: true });
    if (ai?.data) {
      const d = ai.data;
      if (LEGO_SCHEMA.controllers.includes(d.controller)) finalSpec.controller = d.controller;
      if (LEGO_SCHEMA.spawners.includes(d.spawner)) finalSpec.spawner = d.spawner;
      if (LEGO_SCHEMA.hooks.includes(d.hook)) finalSpec.hook = d.hook;
      if (LEGO_SCHEMA.progressions.includes(d.progression)) finalSpec.progression = d.progression;
      if (LEGO_SCHEMA.chars.includes(d.heroKind)) finalSpec.heroKind = d.heroKind;
      if (LEGO_SCHEMA.chars.includes(d.enemyKind)) finalSpec.enemyKind = d.enemyKind;
      if (d.title) finalSpec.title = String(d.title).toUpperCase().slice(0, 22);
      if (d.hookText) finalSpec.hookText = String(d.hookText).toUpperCase().slice(0, 38);
      if (/^#[0-9a-f]{6}$/i.test(d.bg || '')) finalSpec.bg = d.bg;
      if (/^#[0-9a-f]{6}$/i.test(d.accent || '')) finalSpec.accent = d.accent;
      finalSpec._enrichedBy = ai.model;
    }
  }

  const vendor = join(gamesDir, '_vendor');
  ensure(vendor);
  for (const f of ['gpmath.js', 'gpaudio.js', 'gpsprites.js', 'gp2d.js', 'gplego.js']) {
    if (existsSync(join(ROOT, 'kit', f))) cpSync(join(ROOT, 'kit', f), join(vendor, f));
  }

  const dir = join(gamesDir, id);
  ensure(dir);
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${finalSpec.title}</title>
</head>
<body>
<script type="module">
import { runLegoGame } from '../_vendor/gplego.js';
const SPEC = ${JSON.stringify(finalSpec, null, 2)};
runLegoGame(SPEC);
</script>
</body>
</html>
`;
  writeFileSync(join(dir, 'index.html'), html);
  writeFileSync(join(dir, 'lego.spec.json'), JSON.stringify(finalSpec, null, 2));

  const ex = join(examples, id);
  ensure(ex);
  const plan = {
    name: `${id}-hook`,
    root: `\${GAMES_DIR:-../../${gamesDir}}`,
    path: `${id}/index.html?auto=1&dpr=1`,
    viewport: [540, 960],
    scale: 2,
    fps: 30,
    seed: 7,
    duration: 20,
    thumb: 12,
    report: 'window.__game',
    input: [],
    captions: [
      { t: 0.1, until: 3.5, text: finalSpec.hookText, pos: 'top', style: 'hook' },
      { t: 3.8, until: 6.5, text: 'WAIT FOR IT...', pos: 'top', style: 'pop' },
      { t: 15.0, until: 20.0, text: `${finalSpec.title} — PLAY FREE`, pos: 'bottom', style: 'cta' },
    ],
    slowmo: [{ t: 13.5, until: 15.0, factor: 0.45 }],
    blur: 2,
    fade: { in: 0.15, out: 0.35 },
    audio: { source: 'window.__events', music: 'bed', musicGain: 0.38 },
  };
  writeFileSync(join(ex, 'hook.drive.json'), JSON.stringify(plan, null, 2));

  const meta = {
    id,
    title: finalSpec.title,
    tagline: `${finalSpec.hookText} — ${finalSpec.controller} + ${finalSpec.hook} arcade action!`,
    description: `Play ${finalSpec.title} in your browser! Combines ${finalSpec.controller} controls, ${finalSpec.spawner} waves, ${finalSpec.hook} physics, and ${finalSpec.progression} upgrades.`,
    tags: [finalSpec.controller, finalSpec.hook, 'arcade', 'html5', 'browser game'],
    youtubeTitle: `${finalSpec.hookText} #shorts #gaming`,
    category: 'Viral Demos',
    keys: { WASD: 'Move', Mouse: 'Aim / Steer' },
    orientation: 'portrait',
    lego: finalSpec,
  };
  writeFileSync(join(ex, 'meta.json'), JSON.stringify(meta, null, 2));

  return { id, dir, plan: join(ex, 'hook.drive.json'), meta: join(ex, 'meta.json'), spec: finalSpec };
}
