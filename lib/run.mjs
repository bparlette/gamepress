// gamepress run — conversational orchestrator. The tool drives; the AI is the messenger.
//
// The AI reads ORCHESTRATOR.md (one file), then only ever calls:
//   gamepress run                          -> tool asks the first question
//   gamepress run --answer '<json>'        -> tool responds with next question, status, or DONE
//   gamepress run --status <job-id>        -> poll a running build
//
// The AI never reads other docs, never runs make/drive/test directly. Just relays.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const RUNS_DIR = join(homedir(), '.gamepress', 'runs');
const runFile = id => join(RUNS_DIR, id + '.json');

function loadRun(id) {
  const f = runFile(id);
  if (!existsSync(f)) throw new Error(`no run ${id} (gamepress run to start)`);
  return JSON.parse(readFileSync(f, 'utf8'));
}

function saveRun(run) {
  mkdirSync(RUNS_DIR, { recursive: true });
  writeFileSync(runFile(run.id), JSON.stringify(run, null, 2));
}

/** Start a new run. Returns the first question for the human. */
export async function startRun() {
  const run = { id: randomUUID().slice(0, 8), state: 'awaiting_idea', created: new Date().toISOString(), log: [] };
  saveRun(run);
  const out = { job: run.id, ask: 'What game do you want to make? Describe it in a sentence or two.' };
  const setup = await missingSetupPrompt();
  if (setup) { out.setup = setup.missing; out.setupPrompt = setup.prompt; }
  return out;
}

/** Feed the human's answer back. Returns next question, status, or done.
 *  opts.local: --local flag — force the build to run locally, skip cloud. */
export function answerRun(id, answers, opts = {}) {
  const run = loadRun(id);
  run.log.push({ at: new Date().toISOString(), answers });

  if (run.state === 'awaiting_idea') {
    const idea = answers.idea || answers.text || Object.values(answers)[0];
    if (!idea || !String(idea).trim()) throw new Error('answer must include {"idea": "..."}');
    // Lazy-load ideate to keep startup fast
    return import('./ideate.mjs').then(({ ideate }) => {
      const br = ideate(String(idea), { live: false });
      run.state = 'awaiting_answers';
      run.idea = String(idea);
      run.recipe = br.recipe;
      run.archetype = br.archetype;
      run.questions = (br.questions || []).slice(0, 4).map(q => ({
        id: q.id,
        ask: q.ask,
        options: q.options.map(o => o.label),
      }));
      saveRun(run);
      if (!run.recipe) {
        return { job: run.id, ask: 'No recipe fits that idea yet. Try describing a simpler arcade-style game.', note: 'custom builds are not supported by gamepress run yet' };
      }
      return {
        job: run.id,
        recipe: run.recipe,
        ask: 'A few quick questions to nail the vibe:',
        questions: run.questions,
        hint: 'Reply with {"art": 0, "hook": "your hook text", ...} using option numbers or custom text',
      };
    });
  }

  if (run.state === 'awaiting_answers') {
    run.state = 'building';
    run.answers = answers;
    run.local = !!opts.local;
    run.step = 'starting';
    run.started = new Date().toISOString();
    saveRun(run);
    // Kick off the build in the background; --status polls it.
    spawnBuild(run.id);
    return Promise.resolve({ job: run.id, status: 'building', step: 'starting', hint: 'Poll with: gamepress run --status ' + run.id });
  }

  throw new Error(`run ${id} is in state "${run.state}" — nothing to answer (try: gamepress run --status ${id})`);
}

/** Current status of a run. */
export function statusRun(id) {
  const run = loadRun(id);
  const out = { job: run.id, state: run.state };
  if (run.state === 'awaiting_idea') out.ask = 'What game do you want to make?';
  if (run.state === 'awaiting_answers') { out.recipe = run.recipe; out.questions = run.questions; }
  if (run.state === 'building') { out.status = 'building'; out.step = run.step; out.detail = run.detail; out.local = !!run.local; }
  if (run.state === 'done') { out.done = true; out.game = run.game; out.video = run.video; out.images = run.images; }
  if (run.state === 'error') { out.error = run.error; out.step = run.step; }
  out.log = run.log.length;
  return out;
}

// --- setup check ------------------------------------------------------------
// Mirrors docs/setup/index.html #gamepress-setup JSON. Returns tools that are
// missing, so `gamepress run` can prompt: "You're missing X (enables Y). Install?"

import { spawnSync } from 'node:child_process';

const SETUP_TOOLS = [
  { id: 'node', name: 'Node.js 22+', required: true, enables: 'everything', check: ['node', ['--version']], install: 'brew install node' },
  { id: 'ffmpeg', name: 'ffmpeg', required: true, enables: 'video rendering, GIF encoding', check: ['ffmpeg', ['-version']], install: 'brew install ffmpeg' },
  { id: 'chrome', name: 'Google Chrome', required: true, enables: 'game capture, scripted playthroughs', check: null, install: 'brew install --cask google-chrome' },
  { id: 'gh', name: 'GitHub CLI', required: false, enables: 'gamepress cloud (free runner offload)', check: ['gh', ['--version']], install: 'brew install gh && gh auth login' },
  { id: 'kokoro-tts', name: 'Kokoro TTS', required: false, enables: 'local free voiceover (gamepress voice)', check: null, install: 'gamepress setup --tts' },
];

async function toolPresent(t) {
  if (t.id === 'chrome') { try { const { findChrome } = await import('./extras.mjs'); findChrome(); return true; } catch { return false; } }
  if (t.id === 'kokoro-tts') { try { const { ttsReady } = await import('./tts.mjs'); return ttsReady(); } catch { return false; } }
  if (!t.check) return false;
  const r = spawnSync(t.check[0], t.check[1], { encoding: 'utf8' });
  return r.status === 0 && !r.error;
}

export async function checkSetup() {
  const out = [];
  for (const t of SETUP_TOOLS) out.push({ id: t.id, name: t.name, required: t.required, enables: t.enables, install: t.install, present: await toolPresent(t) });
  return out;
}

/** Missing tools formatted for the AI to relay as a prompt. */
export async function missingSetupPrompt() {
  const missing = (await checkSetup()).filter(t => !t.present);
  if (!missing.length) return null;
  const required = missing.filter(t => t.required);
  const optional = missing.filter(t => !t.required);
  return {
    missing: missing.map(t => ({ id: t.id, name: t.name, required: t.required, enables: t.enables, install: t.install })),
    prompt: [
      required.length ? `Missing required: ${required.map(t => `${t.name} (enables: ${t.enables}) — install: ${t.install}`).join('; ')}` : null,
      optional.length ? `Optional but useful: ${optional.map(t => `${t.name} (enables: ${t.enables}) — install: ${t.install}`).join('; ')}` : null,
    ].filter(Boolean).join('\n'),
  };
}

// --- background build -------------------------------------------------------

function spawnBuild(id) {
  // Detached: survives the CLI process, writes progress to the run file.
  const child = spawn(process.execPath, [new URL(import.meta.url).pathname, '--build', id], {
    detached: true, stdio: 'ignore',
  });
  child.unref();
}

async function doBuild(id) {
  const run = loadRun(id);
  const setStep = (step, detail) => { run.step = step; run.detail = detail || ''; saveRun(run); };
  try {
    const { applyAnswers } = await import('./ideate.mjs');
    const { make } = await import('./extras.mjs');
    const { runAll, config } = await import('./pipeline.mjs');

    const gameId = 'run-' + id;
    setStep('make', 'scaffolding the game');
    const spec = { ...applyAnswers(run.recipe, run.answers || {}), title: run.idea.slice(0, 28) };
    const cfg = config({});
    make(gameId, { recipe: run.recipe, spec, games: cfg.games, examples: cfg.examples, force: true });

    setStep('pipeline', 'testing, filming, packaging (1/1)');
    const r = await runAll(gameId, 'demo', cfg, { force: true, log: m => setStep('pipeline', m), cloud: !run.local });

    setStep('done', 'collecting links');
    run.state = 'done';
    run.game = `games/${gameId}/index.html`;
    run.video = r.status?.video || `press/video/${gameId}-hook.mp4`;
    run.images = r.status?.images || [];
    run.finished = new Date().toISOString();
    saveRun(run);
  } catch (e) {
    run.state = 'error';
    run.error = e.message;
    saveRun(run);
  }
}

// Allow: node lib/run.mjs --build <id>
if (process.argv[2] === '--build' && process.argv[3]) {
  doBuild(process.argv[3]);
}
