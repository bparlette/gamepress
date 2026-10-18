// GitHub Pages instant web publisher (`gamepress host <id> --to github [--live]`).
// Unpacks publish/<id>/<id>.zip into a temporary gh-pages worktree under /<id>/, commits, and pushes to origin gh-pages.
import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

function inferGithubPagesUrl(id, repoUrl = '') {
  const m = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (!m) return `https://<owner>.github.io/<repo>/${id}/`;
  return `https://${m[1].toLowerCase()}.github.io/${m[2]}/${id}/`;
}

/** Exact manual steps when git push isn't available. */
export function checklist(manifest, remote = '') {
  return [
    `1. Unzip the bundle: unzip ${manifest.bundle?.zip || manifest.itch?.zip || 'publish/' + manifest.id + '/<bundle>.zip'} -d /tmp/${manifest.id} && touch /tmp/${manifest.id}/.nojekyll`,
    `2. In the game repo: git checkout --orphan gh-pages (or create the branch in a fresh clone)`,
    `3. Copy /tmp/${manifest.id}/* into a subfolder named ${manifest.id}/, commit, push to origin gh-pages`,
    `   (also copy the hook video as ${manifest.id}/${manifest.id}-hook.mp4 so the video URL works)`,
    `4. Repo → Settings → Pages → Deploy from branch: gh-pages, folder /(root)`,
    `5. URL: ${inferGithubPagesUrl(manifest.id, remote)}`,
    `Automated: gamepress host github ${manifest.id} --live  (needs git push credentials for ${remote || 'origin'})`,
  ];
}

export async function upload(manifest, { dryRun = true, branch = 'gh-pages' } = {}) {
  const zip = manifest.bundle?.zip || manifest.itch?.zip;
  let remote = '';
  try { remote = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf8' }).trim(); } catch {}
  const url = inferGithubPagesUrl(manifest.id, remote);
  // The hook video rides along in the same gh-pages folder so `run` can return a real video URL.
  const hookVideo = manifest.youtube?.video;
  const hookName = `${manifest.id}-hook.mp4`;
  const videoUrl = (hookVideo && existsSync(hookVideo)) ? url + hookName : undefined;
  const plan = { platform: 'github', id: manifest.id, zip, branch, remote: remote || '(no git remote origin)', targetUrl: url, video: videoUrl, videoIncluded: !!videoUrl };
  if (dryRun) return { ok: true, dryRun: true, plan, manualSteps: remote ? undefined : checklist(manifest, remote) };
  if (!zip || !existsSync(zip)) throw new Error(`missing bundle zip (${zip}); run: gamepress publish-pack ${manifest.id}`);
  if (!remote) {
    const e = new Error('no git remote.origin.url configured for GitHub Pages push');
    e.manualSteps = checklist(manifest, remote);
    throw e;
  }

  const tmp = mkdtempSync(join(tmpdir(), 'gp-ghpages-'));
  try {
    const dest = join(tmp, manifest.id);
    mkdirSync(dest, { recursive: true });
    execFileSync('unzip', ['-qo', resolve(zip), '-d', dest]);
    if (hookVideo && existsSync(hookVideo)) copyFileSync(resolve(hookVideo), join(dest, hookName));
    writeFileSync(join(tmp, '.nojekyll'), '');
    try {
      execFileSync('git', ['init', '-b', branch], { cwd: tmp, stdio: 'ignore' });
      execFileSync('git', ['add', '-A'], { cwd: tmp, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', `deploy(${manifest.id}): web build via gamepress`], { cwd: tmp, stdio: 'ignore' });
      const push = spawnSync('git', ['push', '--force', remote, `${branch}:${branch}`], { cwd: tmp, encoding: 'utf8' });
      if (push.status !== 0) throw new Error(`git push gh-pages failed (needs push credentials for ${remote}): ${(push.stderr || '').slice(0, 200)}`);
    } catch (g) {
      const e = new Error(`GitHub Pages deploy failed: ${String(g.message).split('\n')[0].slice(0, 160)}`);
      e.manualSteps = checklist(manifest, remote);
      throw e;
    }
    return { ok: true, platform: 'github', id: manifest.id, url, videoUrl };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
