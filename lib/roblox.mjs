// Publish a place file to Roblox via Open Cloud (Place Publishing API). No Studio GUI needed.
// Docs: https://create.roblox.com/docs/cloud/open-cloud/usage-place-publishing
// Key: https://create.roblox.com/dashboard/credentials -> API key with "universe-places: write" for the experience. Env ROBLOX_API_KEY only; never commit it.
import { readFileSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { homedir } from 'node:os';

// Credentials: env first, then the macOS Keychain item and ids file written by scripts/roblox-key.sh (never the repo).
function localConfig() {
  const c = {}; try { for (const l of readFileSync(join(homedir(), '.config/gamepress/roblox.env'), 'utf8').split('\n')) { const m = l.match(/^(\w+)=(.*)$/); if (m && m[2]) c[m[1]] = m[2]; } } catch {}
  if (!process.env.ROBLOX_API_KEY) { try { c.ROBLOX_API_KEY = execFileSync('security', ['find-generic-password', '-s', 'gamepress-roblox-api-key', '-w'], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {} }
  return c;
}
const LC = localConfig(), env = k => process.env[k] || LC[k];

/** plan only unless live. `file` is .rbxl (binary) or .rbxlx (XML). versionType: 'Published' (goes live) | 'Saved' (draft). */
export async function publishRoblox({ file, universeId = env('ROBLOX_UNIVERSE_ID'), placeId = env('ROBLOX_PLACE_ID'), versionType = 'Published', live = false, rojoProject, apiKey = env('ROBLOX_API_KEY') }) {
  if (rojoProject) { file = file || 'build.rbxl'; execFileSync('rojo', ['build', rojoProject, '-o', file], { stdio: 'inherit' }); }
  if (!file || !existsSync(file)) throw new Error('place file not found: ' + file + ' (save from Studio: File > Save to File As, or build with --rojo default.project.json)');
  if (!/^\d+$/.test(String(universeId)) || !/^\d+$/.test(String(placeId))) throw new Error('--universe and --place must be numeric ids (Creator Dashboard > experience > the IDs in the URL / Game Settings)');
  if (!['Published', 'Saved'].includes(versionType)) throw new Error('versionType must be Published or Saved');
  const ext = extname(file).toLowerCase(), type = ext === '.rbxlx' ? 'application/xml' : 'application/octet-stream';
  const url = `https://apis.roblox.com/universes/v1/universes/${universeId}/places/${placeId}/versions?versionType=${versionType}`;
  const plan = { url, file, bytes: statSync(file).size, contentType: type, versionType, key: apiKey ? 'set' : 'MISSING (export ROBLOX_API_KEY)' };
  if (!live) return { ok: true, dryRun: true, plan };
  if (!apiKey) throw new Error('ROBLOX_API_KEY not set');
  const r = await fetch(url, { method: 'POST', headers: { 'x-api-key': apiKey, 'Content-Type': type }, body: readFileSync(file) });
  const body = await r.text();
  if (!r.ok) throw new Error(`Roblox ${r.status}: ${body.slice(0, 300)} (401/403 = key lacks universe-places:write or IP/experience scope; 404 = wrong universe/place id)`);
  return { ok: true, ...JSON.parse(body || '{}'), place: `https://www.roblox.com/games/${placeId}` };
}

/** Run a Luau test script headlessly against a saved place version (Luau Execution API). Needs scopes universe.place.luau-execution-session:write + :read.
 *  Script should error() on failure; anything it print()s/returns is shown. Returns { ok, state, output, logs }. */
export async function runLuau({ script, universeId = env('ROBLOX_UNIVERSE_ID'), placeId = env('ROBLOX_PLACE_ID'), version, apiKey = env('ROBLOX_API_KEY'), timeoutSec = 120 }) {
  if (!apiKey) throw new Error('ROBLOX_API_KEY not set');
  const base = `https://apis.roblox.com/cloud/v2/universes/${universeId}/places/${placeId}` + (version ? `/versions/${version}` : '');
  const h = { 'x-api-key': apiKey, 'Content-Type': 'application/json' };
  const r = await fetch(`${base}/luau-execution-session-tasks`, { method: 'POST', headers: h, body: JSON.stringify({ script, timeout: `${timeoutSec}s` }) });
  if (!r.ok) throw new Error(`Luau task ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const task = await r.json(); const t0 = Date.now(); let cur = task;
  while (!['COMPLETE', 'FAILED', 'CANCELLED'].includes(cur.state) && Date.now() - t0 < (timeoutSec + 30) * 1000) {
    await new Promise(res => setTimeout(res, 2000)); cur = await (await fetch(`https://apis.roblox.com/cloud/v2/${task.path}`, { headers: h })).json();
  }
  let logs = ''; try { const l = await (await fetch(`https://apis.roblox.com/cloud/v2/${task.path}/logs`, { headers: h })).json(); logs = (l.luauExecutionSessionTaskLogs || []).flatMap(x => x.messages || []).join('\n'); } catch {}
  return { ok: cur.state === 'COMPLETE', state: cur.state, output: cur.output?.results ?? null, error: cur.error ?? null, logs };
}

/** Safe ship: upload as Saved, run the Luau test against that exact version, publish only if it passes. */
export async function shipRoblox(opts) {
  const saved = await publishRoblox({ ...opts, versionType: 'Saved', live: true });
  const test = opts.testScript ? await runLuau({ ...opts, script: readFileSync(opts.testScript, 'utf8'), version: saved.versionNumber }) : { ok: true, skipped: true };
  if (!test.ok) return { ok: false, stage: 'test', saved, test };
  const pub = await publishRoblox({ ...opts, versionType: 'Published', live: true });
  return { ok: true, saved, test, published: pub };
}
