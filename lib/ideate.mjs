// ideate: the research phase. Matches an idea to an archetype, lists known viral references, "one-up" twists, 10 recommended assets
// (marking which the kit already has) and a short question list whose answers patch the recipe spec. --live adds real top Shorts via yt-dlp.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const V = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'presets', 'viral.json'), 'utf8'));
// every registry recipe (presets/recipes.json) is also an archetype: style + hook questions, scope rules and the 3-second rule travel with the brief
const REG = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'presets', 'recipes.json'), 'utf8')).recipes, STYLEQ = V.generic.questions.find(q => q.id === 'style');
for (const r of REG) if (!Object.values(V.archetypes).some(a => a.recipe === r.id)) V.archetypes[r.id] = { match: r.match, recipe: r.id, refs: r.refs, oneUps: r.oneUps, searchQueries: [`${r.title.toLowerCase()} game shorts`, `${r.refs[0].toLowerCase()} style game shorts viral`], scope: { dontBuild: r.dontBuild, threeSecond: r.threeSecond, touch: r.touch },
  questions: [STYLEQ, { id: 'hook', ask: 'Hook line?', custom: true, options: r.hooks.map(h => ({ label: h, spec: { hook: h } })) }] };
// Recipes with a template but no registry entry (4 viral 3D formats + 2D formats): same keyword routing, shown by name + hook in run.mjs
export const EXTRA = [
  { id: 'hole-eater', title: 'HOLE EATER', hook: 'Swallow the whole city', keywords: ['hole.io', 'hole io', 'black hole', 'swallow', 'devour', 'sinkhole', 'eat the city', 'eater'] },
  { id: 'crowd-runner', title: 'CROWD RUNNER', hook: 'Pick the right gate', keywords: ['count masters', 'crowd', 'crowd runner', 'math gates', 'gates', 'multiplier', 'army runner', 'mob'] },
  { id: 'glass-drop', title: 'GLASS DROP', hook: 'Pick the right pane', keywords: ['glass', 'glass bridge', 'glass drop', 'squid game bridge', 'bridge', 'stairs', 'drop through'] },
  { id: 'demolition', title: 'DEMOLITION', hook: 'Blow it all apart', keywords: ['demolition', 'demolish', 'destroy', 'smash', 'wrecking ball', 'wreck', 'bulldozer', 'explode', 'explosion', 'destruction', 'teardown'] },
];
const escRe = k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Words so generic they add no signal when padding a matched keyword ("football game").
const FILLER = /\b(game|games|gaming|play|playing|fun|cool|awesome|best|new|free|online)\b/i;
/** Keyword routing with confidence. Score = sum of len^2 over non-overlapping hits
 *  (a keyword subsumed by a longer matched keyword doesn't double-count, so
 *  "football game" counts once, not as "football" + "football game").
 *  strong: 2+ distinct hits, or one long distinctive hit (>=10 chars, no filler words).
 *  weak: a single short/generic hit, or the top two scores within 30% (close race).
 *  none: no keyword hit at all. */
export function routeWithConfidence(idea) {
  const text = ' ' + idea.toLowerCase().replace(/[^a-z0-9&'.\- ]+/g, ' ') + ' ';
  const all = [];
  for (const r of [...REG, ...EXTRA]) {
    const matched = [];
    for (const k of r.keywords || []) { if (new RegExp(`(?<![a-z0-9])${escRe(k.toLowerCase())}s?(?![a-z0-9])`).test(text)) matched.push(k); }
    if (!matched.length) continue;
    matched.sort((a, b) => b.length - a.length);
    const hits = matched.filter((k, i) => !matched.slice(0, i).some(l => l.toLowerCase().includes(k.toLowerCase())));
    const score = hits.reduce((n, k) => n + k.length * k.length, 0);
    all.push({ id: r.id, title: r.title, hook: r.hook, score, hits });
  }
  all.sort((a, b) => b.score - a.score);
  let confidence = 'none';
  if (all.length) {
    const [top, second] = all;
    const closeRace = !!second && second.score >= top.score * 0.7;
    const lone = top.hits.length === 1 ? top.hits[0] : null;
    const weakSingle = !!lone && (lone.length < 10 || FILLER.test(lone));
    confidence = (closeRace || weakSingle) ? 'weak' : 'strong';
  }
  return { matches: all, confidence };
}
/** Keyword routing: recipe whose keywords hit the idea with the most/longest matches (word-bounded, plural-tolerant). */
export function routeByKeywords(idea) {
  return routeWithConfidence(idea).matches[0]?.id || null;
}
/** Every routable recipe as {id, title, hook} for "pick one" lists. */
export const recipeChoices = () => [...REG.map(r => ({ id: r.id, title: r.title, hook: r.hook })), ...EXTRA.map(r => ({ id: r.id, title: r.title, hook: r.hook }))];
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

export function ideate(idea, { live = true, out = 'research' } = {}) {
  const kw = routeByKeywords(idea), kwArch = kw && Object.entries(V.archetypes).find(([, x]) => x.recipe === kw);
  const hit = kwArch ? [kwArch[0], kwArch[1], 1] : kw ? null : Object.entries(V.archetypes).map(([k, a]) => [k, a, (idea.match(new RegExp(a.match, 'gi')) || []).reduce((n, m) => n + m.length, 0)]).sort((a, b) => b[2] - a[2])[0];
  const arch = hit && hit[2] ? hit : null, a = arch?.[1];
  const brief = { idea, archetype: arch?.[0] || 'generic', recipe: a?.recipe || kw || null, references: a?.refs || [], oneUps: [...(a?.oneUps || []), ...V.generic.oneUps],
    assets: V.generic.assets, searchQueries: (a?.searchQueries || [`${idea} shorts viral`, `${idea} game satisfying shorts`]).concat(`${idea} game shorts`),
    questions: [...(a?.questions || []), ...(a?.questions?.some(q => q.id === 'hook') ? [] : V.generic.questions)].map(q => ({ ...q, options: [...q.options], default: 0 })),
    next: a?.recipe ? `ask the user the questions (offer the options, allow custom text for custom:true), save answers as {id: optionIndex | "text"}, then: gamepress make <id> --recipe ${a.recipe} --answers answers.json` : 'no recipe fits: build from templates/3d.html and use the assets list; still ask the questions' };
  if (a?.scope) brief.scope = a.scope;
  if (!arch) brief.note = 'no specific archetype matched: use the generic 10 assets and one-ups';
  if (live) {
    const r = brief.searchQueries.slice(0, 2).map(q => spawnSync('yt-dlp', ['--flat-playlist', '--print', '%(view_count)s\t%(title)s', `ytsearch12:${q}`], { encoding: 'utf8', timeout: 90000 }));
    if (r.some(x => x.error)) brief.live = { error: 'yt-dlp missing or offline (brew install yt-dlp); use searchQueries with a web search tool' };
    else if (!r.some(x => x.stdout.trim())) brief.live = { error: 'no results (offline?): using the built-in playbook only' };
    else brief.live = { top: r.flatMap(x => x.stdout.trim().split('\n').map(l => { const [v, ...t] = l.split('\t'); return { views: +v || 0, title: t.join('\t') }; })).filter(v => v.title).sort((x, y) => y.views - x.views).slice(0, 10),
      todo: 'the insights below were computed from these titles; override only if you disagree' };
    const top = brief.live.top, STOP = new Set('the a an of to in on and or is it this that with for my i you we how what why who be are was just'.split(' ')), words = {};
    for (const v of top) for (const w of new Set(v.title.toLowerCase().replace(/#\w+/g, '').match(/[a-z']{3,}/g) || [])) if (!STOP.has(w)) words[w] = (words[w] || 0) + 1;
    const withNum = top.filter(v => /\d/.test(v.title)).length, withVs = top.filter(v => /\bvs\.?\b/i.test(v.title)).length, caps = top.filter(v => /\b[A-Z]{4,}\b/.test(v.title)).length;
    brief.live.insights = { commonWords: Object.entries(words).filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w]) => w), titlesWithNumber: `${withNum}/${top.length}`, titlesWithVs: `${withVs}/${top.length}`, titlesWithCapsWord: `${caps}/${top.length}`,
      avgViewsTop: top.length ? Math.round(top.reduce((a, v) => a + v.views, 0) / top.length) : 0 };
    brief.live.suggestedHooks = top.slice(0, 3).map(v => v.title.replace(/#\w+/g, '').replace(/\s+/g, ' ').trim().slice(0, 60));
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
