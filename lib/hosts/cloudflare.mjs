// Cloudflare Pages hosting (static web build) + optional R2 for large assets.
// Input: publish/<id>/manifest.json (manifest.bundle.zip = web build zip, entry index.html).
// How: unzip the bundle to a temp dir, then `wrangler pages deploy <dir> --project-name <id>`.
// Needs: CLOUDFLARE_API_TOKEN env or ~/.config/gamepress/cloudflare.env (wrangler also reads it).
// Rules: never print or log the token; dryRun by default (--live to deploy); never fake an upload.
import { readFileSync, existsSync, mkdirSync, rmSync, mkdtempSync, cpSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { join, basename, dirname } from 'node:path';
import { tmpdir, homedir } from 'node:os';

function readToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return { token: process.env.CLOUDFLARE_API_TOKEN, from: 'env CLOUDFLARE_API_TOKEN' };
  const f = join(homedir(), '.config', 'gamepress', 'cloudflare.env');
  if (existsSync(f)) {
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?CLOUDFLARE_API_TOKEN\s*=\s*(.+?)\s*$/);
      if (m) return { token: m[1].replace(/^['"]|['"]$/g, ''), from: f };
    }
  }
  return { token: null, from: null };
}

function wrangler() {
  const r = spawnSync('wrangler', ['--version'], { stdio: 'pipe', encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim().split('\n')[0] : null;
}

/** Exact manual steps when wrangler/token unavailable. Values filled from the manifest. */
export function checklist(manifest) {
  const id = manifest.id;
  return [
    `1. Install wrangler: npm i -g wrangler`,
    `2. Get an API token: https://dash.cloudflare.com → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" template`,
    `3. Set it as an env var (never commit it): see the credentials table in docs/HOSTING.md for where to get one`,
    `4. Unzip the bundle: unzip ${manifest.bundle?.zip || 'publish/' + id + '/<bundle>.zip'} -d /tmp/${id}`,
    `5. Deploy: wrangler pages deploy /tmp/${id} --project-name ${id}`,
    `6. URL will be https://${id}.pages.dev (custom domain optional in the dashboard).`,
  ];
}

export async function upload(manifest, { dryRun = true } = {}) {
  const id = manifest.id;
  const zip = manifest.bundle?.zip;
  if (!zip || !existsSync(zip)) throw new Error(`no web bundle zip in manifest (run: gamepress publish-pack ${id})`);
  const { token, from } = readToken();
  const hasWrangler = wrangler();
  const plan = {
    platform: 'cloudflare',
    id,
    uses: [zip],
    steps: [
      `unzip ${basename(zip)} to a temp dir`,
      `wrangler pages deploy <dir> --project-name ${id}`,
    ],
    tokenFrom: from || '(not found)',
    wrangler: hasWrangler || '(not installed)',
  };
  if (dryRun) return { ok: true, dryRun: true, plan, manualSteps: (plan.tokenFrom === '(not found)' || plan.wrangler === '(not installed)') ? checklist(manifest) : undefined };
  if (!token) {
    const e = new Error('no Cloudflare API token');
    e.manualSteps = checklist(manifest);
    throw e;
  }
  if (!hasWrangler) {
    const e = new Error('wrangler not installed');
    e.manualSteps = checklist(manifest);
    throw e;
  }
  const tmp = mkdtempSync(join(tmpdir(), 'gp-cf-'));
  try {
    execFileSync('unzip', ['-q', zip, '-d', tmp]);
    const r = spawnSync('wrangler', ['pages', 'deploy', tmp, '--project-name', id], {
      env: { ...process.env, CLOUDFLARE_API_TOKEN: token },
      encoding: 'utf8',
    });
    if (r.status !== 0) throw new Error('wrangler pages deploy failed: ' + (r.stderr || r.stdout).slice(0, 500));
    const url = (r.stdout.match(/https:\/\/[^\s]+\.pages\.dev/) || [])[0] || null;
    return { ok: true, url, id, project: id };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
