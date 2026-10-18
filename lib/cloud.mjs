// gamepress cloud — cloud-first, local-fallback wrapper for the slow jobs.
//
// Cherie's rule: if a job can't run in the cloud (no workflow file, no gh,
// trigger fails, artifact download fails), just run it locally. Never error
// on cloud unavailability.
//
// Usage from the CLI: gamepress cloud drive|voice|test ...

import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const WORKFLOWS = join(ROOT, '.github', 'workflows');

const WORKFLOW_FOR = {
  drive: 'render-video.yml',
  voice: 'tts-batch.yml',
  test: 'test.yml',
};

/** Check whether a cloud run is possible. Never throws — returns { ok, reason }. */
export function cloudAvailable(job) {
  const wf = WORKFLOW_FOR[job];
  if (!wf) return { ok: false, reason: `no cloud workflow for "${job}"` };
  if (!existsSync(join(WORKFLOWS, wf))) return { ok: false, reason: `workflow ${wf} not installed` };
  const gh = spawnSync('gh', ['--version'], { stdio: 'ignore' });
  if (gh.status !== 0) return { ok: false, reason: 'gh CLI not installed' };
  const auth = spawnSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  if (auth.status !== 0) return { ok: false, reason: 'gh not authenticated' };
  return { ok: true };
}

function ghJson(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (r.status !== 0) throw new Error(`gh ${args[0]} failed: ${(r.stderr || '').trim().split('\n')[0]}`);
  return JSON.parse(r.stdout || '[]');
}

/**
 * Trigger a workflow_dispatch run, poll until done, download the artifact.
 * Throws on any cloud failure — the caller falls back to local.
 */
export async function runCloudJob(job, { inputs = {}, artifact, outDir, timeoutMs = 25 * 60 * 1000 } = {}) {
  const wf = WORKFLOW_FOR[job];
  const args = ['workflow', 'run', wf];
  for (const [k, v] of Object.entries(inputs)) args.push('-f', `${k}=${v}`);
  const trig = spawnSync('gh', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (trig.status !== 0) throw new Error(`trigger failed: ${(trig.stderr || '').trim().split('\n')[0]}`);

  // find the run we just created (most recent for this workflow)
  await new Promise(r => setTimeout(r, 10000)); // let GitHub register it
  const deadline = Date.now() + timeoutMs;
  let runId = null;
  while (Date.now() < deadline && !runId) {
    const runs = ghJson(['run', 'list', `--workflow=${wf}`, '--limit', '3', '--json', 'databaseId,createdAt']);
    if (runs.length) { runId = runs[0].databaseId; break; }
    await new Promise(r => setTimeout(r, 10000));
  }
  if (!runId) throw new Error('could not find the triggered run');

  process.stderr.write(`cloud: ${job} running as #${runId} — polling…\n`);
  for (;;) {
    if (Date.now() > deadline) throw new Error('cloud run timed out');
    const [run] = ghJson(['run', 'view', String(runId), '--json', 'status,conclusion']);
    if (run.status === 'completed') {
      if (run.conclusion !== 'success') throw new Error(`cloud run ${run.conclusion}`);
      break;
    }
    await new Promise(r => setTimeout(r, 20000));
  }

  const dl = spawnSync('gh', ['run', 'download', String(runId), ...(artifact ? ['-n', artifact] : []), '-D', outDir],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (dl.status !== 0) throw new Error(`artifact download failed: ${(dl.stderr || '').trim().split('\n')[0]}`);
  return { runId, outDir };
}

/**
 * Run a job in the cloud, falling back to the local implementation on ANY
 * cloud failure. `localFn` is an async function that performs the job locally.
 * Returns whatever localFn returns (or the cloud result descriptor).
 */
export async function cloudOrLocal(job, localFn, cloudOpts = {}) {
  const avail = cloudAvailable(job);
  if (!avail.ok) {
    process.stderr.write(`cloud unavailable (${avail.reason}) — running ${job} locally\n`);
    return localFn();
  }
  try {
    const r = await runCloudJob(job, cloudOpts);
    process.stderr.write(`cloud: ${job} done → ${r.outDir}\n`);
    return { cloud: true, ...r };
  } catch (e) {
    process.stderr.write(`cloud failed (${e.message.split('\n')[0]}) — running ${job} locally\n`);
    return localFn();
  }
}
