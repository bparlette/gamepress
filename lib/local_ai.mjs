// Optional Local AI coprocessor (Ollama / OpenAI-compatible local endpoint).
// 100% optional: every gamepress command works without a local LLM.
// Enable via --local-ai, GAMEPRESS_LOCAL_AI=1, or `gamepress config --local-ai true`.
// Disable explicitly via --no-local-ai or GAMEPRESS_LOCAL_AI=0.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = process.env.GAMEPRESS_MODEL || 'qwen2.5-coder:14b';

/**
 * Check if local AI is enabled by flags/env/config.
 * Modes: 'auto' (probe if available), 'on' (require/prefer), 'off' (never use).
 */
export function isLocalAiEnabled(opts = {}) {
  if (opts.localAi === false || opts.noLocalAi || process.env.GAMEPRESS_LOCAL_AI === '0' || process.env.GAMEPRESS_LOCAL_AI === 'false') return false;
  if (opts.localAi === true || process.env.GAMEPRESS_LOCAL_AI === '1' || process.env.GAMEPRESS_LOCAL_AI === 'true') return true;
  try {
    const cfg = JSON.parse(readFileSync('.gamepress.json', 'utf8'));
    if (typeof cfg.localAi === 'boolean') return cfg.localAi;
  } catch {}
  return Boolean(opts.autoProbe);
}

/** Fast non-throwing probe of the local Ollama server. */
export async function probeLocalAi({ host = DEFAULT_HOST, preferredModel = DEFAULT_MODEL, timeoutMs = 1200 } = {}) {
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return { available: false, host, reason: `HTTP ${res.status}` };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    if (!models.length) return { available: false, host, reason: 'no models installed in ollama' };
    const chosen = models.find(m => m === preferredModel)
      || models.find(m => m.startsWith(preferredModel.split(':')[0]))
      || models.find(m => /coder|qwen|llama|deepseek|mistral/i.test(m))
      || models[0];
    const visionModel = models.find(m => /vl|vision|llava|minicpm/i.test(m)) || null;
    return { available: true, host, model: chosen, visionModel, models };
  } catch (e) {
    return { available: false, host, reason: e.message || 'unreachable' };
  }
}

/**
 * Ask the local AI model a prompt. Returns null if disabled or unavailable (never throws unless strict=true).
 */
export async function askLocalAi(prompt, {
  system = 'You are a concise game development assistant for gamepress. Output only valid JSON when asked for JSON.',
  json = false,
  host = DEFAULT_HOST,
  model,
  temperature = 0.2,
  timeoutMs = 30000,
  enabled = true,
  strict = false,
} = {}) {
  if (!enabled) return null;
  const probe = await probeLocalAi({ host, preferredModel: model || DEFAULT_MODEL });
  if (!probe.available) {
    if (strict) throw new Error(`Local AI unavailable at ${host} (${probe.reason}). Run without --local-ai or start Ollama.`);
    return null;
  }
  const activeModel = model || probe.model;
  try {
    const body = {
      model: activeModel,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        { role: 'user', content: prompt },
      ],
      stream: false,
      options: { temperature },
      ...(json ? { format: 'json' } : {}),
    };
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
    const out = await res.json();
    const text = (out.message?.content || '').trim();
    if (!json) return { text, model: activeModel };
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    const parsed = JSON.parse(s >= 0 && e > s ? cleaned.slice(s, e + 1) : cleaned);
    return { data: parsed, text, model: activeModel };
  } catch (e) {
    if (strict) throw e;
    return null;
  }
}

/**
 * Self-heal a game using local AI (if available) or return structured deterministic fix instructions.
 * Checks lint + test + grade problems and either applies safe fixes or asks local Qwen to patch index.html.
 */
export async function healGame(id, { gamesDir = 'games', examples = 'examples', localAi = true, testFn, lintFn, gradeFn } = {}) {
  const htmlFile = join(gamesDir, id, 'index.html');
  if (!existsSync(htmlFile)) return { ok: false, id, error: `missing ${htmlFile}` };
  let src = readFileSync(htmlFile, 'utf8');
  const actions = [];

  // 1. Deterministic fast-path fixes (zero LLM needed, works for everyone)
  if (!/window\.__game\b/.test(src) && /createStage\(/.test(src)) {
    src = src.replace(/(const\s+st\s*=\s*createStage\([^)]*\)\s*;?)/, '$1\nwindow.__game = st;');
    actions.push('deterministic: exposed window.__game = st');
  }
  if (/createStage\(/.test(src) && !/st\.shell\(/.test(src)) {
    src = src.replace(/(const\s+st\s*=\s*createStage\([^)]*\)\s*;?)/, `$1\nst.shell({ id: ${JSON.stringify(id)}, title: ${JSON.stringify(id.toUpperCase())} });`);
    actions.push('deterministic: added st.shell() title/results overlay');
  }
  if (actions.length) writeFileSync(htmlFile, src);

  // 2. Run lint & test if provided
  const lintRes = lintFn ? lintFn(join(gamesDir, id)) : { ok: true, problems: [] };
  const testRes = testFn ? await testFn(join(gamesDir, id)).catch(e => ({ ok: false, problems: [e.message], errors: [e.message] })) : { ok: true, problems: [], errors: [] };
  const problems = [...(lintRes.problems || []), ...(testRes.problems || []), ...(testRes.errors || [])];

  if (!problems.length) return { ok: true, id, healed: actions.length > 0, actions, usedLocalAi: false };

  // 3. Optional Local AI repair if enabled & available
  if (localAi) {
    const prompt = [
      `Fix the following HTML5 game (${htmlFile}) so all problems are resolved.`,
      `Problems reported:\n- ${problems.join('\n- ')}`,
      `Rules: Keep all existing imports from ../_vendor/ or ./kit/. Expose window.__game with changing state, call sfx() on actions, and ensure 0 console errors.`,
      `Return JSON: {"explanation": "1 sentence", "patchedHtml": "<full corrected HTML>"}`,
      `Current HTML:\n${src.slice(0, 14000)}`,
    ].join('\n\n');
    const ai = await askLocalAi(prompt, { json: true, enabled: true, timeoutMs: 45000 });
    if (ai?.data?.patchedHtml && ai.data.patchedHtml.includes('<script') && ai.data.patchedHtml.includes('</html>')) {
      writeFileSync(htmlFile, ai.data.patchedHtml);
      actions.push(`local-ai (${ai.model}): ${ai.data.explanation || 'patched index.html'}`);
      const retest = testFn ? await testFn(join(gamesDir, id)).catch(e => ({ ok: false, problems: [e.message] })) : { ok: true };
      return { ok: !!retest.ok, id, healed: true, usedLocalAi: true, model: ai.model, actions, remainingProblems: retest.problems || [] };
    }
  }

  return {
    ok: false,
    id,
    healed: actions.length > 0,
    usedLocalAi: false,
    actions,
    remainingProblems: problems,
    hint: 'Start local Ollama (`ollama serve`) and pass `--local-ai` for automatic LLM code repair, or fix the listed problems.',
  };
}
