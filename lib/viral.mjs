// gamepress viral: analyze a game and produce a viral clip brief.
// Reads the game's files, extracts what makes it shareable, and asks the AI
// driver the right questions to build a killer drive plan.
//
// Usage: gamepress viral <game-dir>
// Output: JSON brief + printed questions for the AI to answer in chat.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

function readText(p, max = 8000) {
  try { return readFileSync(p, 'utf8').slice(0, max); } catch { return ''; }
}

function scanDir(dir, depth = 0) {
  const out = [];
  if (depth > 3) return out;
  try {
    for (const f of readdirSync(dir)) {
      if (f.startsWith('.') || f === 'node_modules') continue;
      const p = join(dir, f);
      try {
        if (statSync(p).isDirectory()) out.push(...scanDir(p, depth + 1));
        else out.push(p);
      } catch {}
    }
  } catch {}
  return out;
}

/** Extract viral signals from a game directory. */
export function viralBrief(gameDir) {
  const dir = resolve(gameDir);
  const files = scanDir(dir);
  const brief = {
    dir,
    title: basename(dir),
    description: '',
    mechanics: [],
    viralHooks: [],
    audioAssets: [],
    visualAssets: [],
    questions: [],
  };

  // README / description
  for (const f of ['README.md', 'readme.md', 'DESCRIPTION', 'about.txt']) {
    const t = readText(join(dir, f), 2000);
    if (t) { brief.description = t.split('\n').slice(0, 10).join('\n'); break; }
  }

  // index.html title + meta description
  const html = readText(join(dir, 'index.html'), 6000);
  const titleM = html.match(/<title>([^<]+)<\/title>/i);
  if (titleM) brief.title = titleM[1].trim();
  const descM = html.match(/name="description" content="([^"]+)"/i);
  if (descM && !brief.description) brief.description = descM[1];

  // Mechanics: look for sfx/event calls, scoring, weapons, factions in JS
  const jsFiles = files.filter(f => /\.(js|mjs)$/.test(f)).slice(0, 20);
  const signals = { sfx: new Set(), events: new Set(), entities: new Set(), tools: new Set(), actions: new Set() };
  for (const jf of jsFiles) {
    const src = readText(jf, 30000);
    for (const m of src.matchAll(/sfx\(['"]([^'"]+)['"]/g)) signals.sfx.add(m[1]);
    for (const m of src.matchAll(/__events.*?type:\s*['"]([^'"]+)['"]/g)) signals.events.add(m[1]);
    // Generic: characters/factions/enemies/pets → entities
    for (const m of src.matchAll(/(faction|character|enemy|pet|unit|player)s?['":\s]+['"]([^'"]+)['"]/gi)) signals.entities.add(m[2]);
    // Generic: weapons/tools/abilities/cards/seeds → tools
    for (const m of src.matchAll(/(weapon|tool|ability|card|seed|item|block)s?['":\s]+['"]([^'"]+)['"]/gi)) signals.tools.add(m[2]);
  }
  // Generic satisfying-action verbs (not just combat)
  const actionVerbs = ['kill', 'explode', 'merge', 'match', 'combo', 'score', 'collect', 'jump', 'dash', 'win', 'levelup', 'powerup'];
  for (const w of actionVerbs) {
    if (jsFiles.some(jf => readText(jf, 10000).toLowerCase().includes(w))) signals.actions.add(w);
  }

  // Audio assets (voice lines, SFX)
  const audioFiles = files.filter(f => /\.(ogg|mp3|wav|m4a)$/i.test(f));
  brief.audioAssets = audioFiles.slice(0, 10).map(f => f.replace(dir + '/', ''));
  brief.audioCount = audioFiles.length;

  // Visual assets
  const imgFiles = files.filter(f => /\.(png|jpg|webp|gif)$/i.test(f) && !/thumb/i.test(f));
  brief.visualAssets = imgFiles.slice(0, 8).map(f => f.replace(dir + '/', ''));

  // Heuristic viral hooks from signals (genre-agnostic)
  if (signals.sfx.size > 5) brief.viralHooks.push(`${signals.sfx.size} unique sound effects — layer the best ones`);
  if (brief.audioCount > 20) brief.viralHooks.push(`${brief.audioCount} audio assets — pick the most distinctive, spam them rapid-fire`);
  if (signals.entities.size > 2) brief.viralHooks.push(`${signals.entities.size} distinct entities — show variety, contrast them`);
  if (signals.tools.size > 1) brief.viralHooks.push(`${signals.tools.size} tools/abilities — demo each one in action`);
  if (signals.actions.size) brief.viralHooks.push(`Satisfying moments (${[...signals.actions].slice(0, 4).join(', ')}) — get the PAYOFF on camera, chain them fast`);

  // Questions for the AI driver
  brief.questions = [
    {
      ask: 'What are the 3 most viral moments in this game? (the ones that make someone stop scrolling)',
      hint: brief.viralHooks.length ? brief.viralHooks.join('; ') : 'Play the game or read the code to find them',
    },
    {
      ask: 'Which audio defines this game? (voice, signature SFX, music)',
      hint: brief.audioCount ? `${brief.audioCount} audio assets found — listen to the top candidates` : 'No audio files detected — is the game silent?',
    },
    {
      ask: 'What is the single best 3-second hook? (first thing the viewer sees)',
      hint: 'Must be the payoff, not a menu. A kill, a merge, a combo, a funny line, a satisfying snap.',
    },
    {
      ask: 'How do features combine for rapid pace? (not one shot per feature — spam them)',
      hint: 'e.g. action → reaction → different tool → bigger payoff → twist. Stack, don\'t showcase.',
    },
  ];

  return brief;
}

/** CLI wrapper: prints brief + questions. */
export function viralCommand(gameDir) {
  const b = viralBrief(gameDir);
  return {
    ...b,
    next: 'Answer the questions above, then write the drive plan. Every viral hook must get screen time.',
  };
}
