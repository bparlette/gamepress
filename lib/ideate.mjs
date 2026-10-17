// ideate: the research phase. Matches an idea to an archetype, lists known viral references, "one-up" twists, 10 recommended assets
// (marking which the kit already has) and a short question list whose answers patch the recipe spec. --live adds real top Shorts via yt-dlp.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const V = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'presets', 'viral.json'), 'utf8'));
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function ideate(idea, { live = false, out = 'research' } = {}) {
  const hit = Object.entries(V.archetypes).map(([k, a]) => [k, a, (idea.match(new RegExp(a.match, 'gi')) || []).length]).sort((a, b) => b[2] - a[2])[0];
  const arch = hit && hit[2] ? hit : null, a = arch?.[1];
  const brief = { idea, archetype: arch?.[0] || 'generic', recipe: a?.recipe || null, references: a?.refs || [], oneUps: [...(a?.oneUps || []), ...V.generic.oneUps],
    assets: V.generic.assets, searchQueries: (a?.searchQueries || [`${idea} shorts viral`, `${idea} game satisfying shorts`]).concat(`${idea} game shorts`),
    questions: [...(a?.questions || []), ...(a?.questions?.some(q => q.id === 'hook') ? [] : V.generic.questions)].map(q => ({ ...q, options: [...q.options], default: 0 })),
    next: a?.recipe ? `ask the user the questions (offer the options, allow custom text for custom:true), save answers as {id: optionIndex | "text"}, then: gamepress make <id> --recipe ${a.recipe} --answers answers.json` : 'no recipe fits: build from templates/3d.html and use the assets list; still ask the questions' };
  if (!arch) brief.note = 'no specific archetype matched: use the generic 10 assets and one-ups';
  if (live) {
    const r = brief.searchQueries.slice(0, 2).map(q => spawnSync('yt-dlp', ['--flat-playlist', '--print', '%(view_count)s\t%(title)s', `ytsearch12:${q}`], { encoding: 'utf8', timeout: 90000 }));
    if (r.some(x => x.error)) brief.live = { error: 'yt-dlp missing or offline (brew install yt-dlp); use searchQueries with a web search tool' };
    else brief.live = { top: r.flatMap(x => x.stdout.trim().split('\n').map(l => { const [v, ...t] = l.split('\t'); return { views: +v || 0, title: t.join('\t') }; })).filter(v => v.title).sort((x, y) => y.views - x.views).slice(0, 10),
      todo: 'find what the top titles share (hook, object, number), then pick the oneUps that beat it' };
  }
  mkdirSync(out, { recursive: true }); writeFileSync(join(out, slug(idea) + '.json'), JSON.stringify(brief, null, 2)); brief.file = join(out, slug(idea) + '.json');
  return brief;
}

/** Turn {questionId: optionIndex | "custom text"} into a spec for the recipe (later answers win; explicit spec wins over answers). */
export function applyAnswers(recipe, answers = {}) {
  const arch = Object.values(V.archetypes).find(a => a.recipe === recipe); if (!arch) return {};
  let spec = {};
  for (const q of arch.questions) { const a = answers[q.id]; if (a === undefined) continue;
    if (typeof a === 'string' && q.custom) { spec.hook = a; continue; }
    const o = q.options[+a]; if (!o) throw new Error(`answer for "${q.id}" must be 0-${q.options.length - 1}${q.custom ? ' or text' : ''}`); spec = { ...spec, ...(o.spec || {}) }; }
  if (typeof answers.title === 'string') spec.title = answers.title;
  return spec;
}
