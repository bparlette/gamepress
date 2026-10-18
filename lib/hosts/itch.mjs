// itch.io hosting via butler (`gamepress host itch <id> [--live] [--user <name>]`).
// Reads BUTLER_API_KEY from env or macOS Keychain (`security find-generic-password -s gamepress-butler -w`).
// Without butler/credentials, --live prints an exact manual checklist instead of failing silently.
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

function getKeychainSecret(service) {
  if (process.platform !== 'darwin') return null;
  try { return execFileSync('security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

function butlerInstallHint() {
  if (process.platform === 'darwin') return 'brew install --cask itch  (butler ships with the itch app)';
  if (process.platform === 'win32') return 'download from https://itch.io/docs/butler/ and add to PATH';
  return 'download from https://itch.io/docs/butler/ and add to PATH';
}

/** Exact manual steps when butler can't run. Values are filled from the manifest. */
export function checklist(manifest, { user } = {}) {
  const itch = manifest.itch || {};
  const zip = itch.zip || manifest.bundle?.zip;
  const u = user || process.env.ITCH_USER || '<your-itch-username>';
  return [
    `1. Create the game page: https://itch.io/game/new  (Kind of project: HTML — playable in browser)`,
    `2. Upload: ${zip || '<run: gamepress publish-pack ' + manifest.id + '>'}`,
    `   - Tick "This file will be played in the browser"`,
    `   - Embed options → Viewport dimensions: 540 × 960, check "Mobile friendly"`,
    `3. Cover image: ${itch.dir || 'press/out/itch'}/cover.png  (Upload → Edit game → Cover image)`,
    `4. Screenshots: ${itch.dir || 'press/out/itch'}/screenshot_*.png  (Edit game → Screenshots)`,
    `5. GIF: ${itch.dir || 'press/out/itch'}/cover.gif  (must be under 3 MB)`,
    `6. Fill: title "${itch.title || manifest.meta?.title || manifest.id}", tagline, description, tags`,
    `7. Visibility → Public, then Save. URL: https://${u}.itch.io/${manifest.id}`,
    `Automated alternative: install butler (${butlerInstallHint()}), set BUTLER_API_KEY from https://itch.io/user/settings/api-keys, then: gamepress host itch ${manifest.id} --live --user ${u}`,
  ];
}

export async function upload(manifest, { dryRun = true, user = process.env.ITCH_USER } = {}) {
  const itch = manifest.itch || {};
  const zip = itch.zip || manifest.bundle?.zip;
  const target = user ? `${user}/${manifest.id}:html5` : (itch.butlerTarget || `<itch-user>/${manifest.id}:html5`);
  const butlerOk = spawnSync('butler', ['-V'], { encoding: 'utf8' }).status === 0;
  const apiKey = process.env.BUTLER_API_KEY || getKeychainSecret('gamepress-butler');
  const plan = {
    platform: 'itch',
    id: manifest.id,
    target,
    zip,
    zipExists: !!(zip && existsSync(zip)),
    butlerInstalled: butlerOk,
    credentialsConfigured: !!apiKey,
    assetsDir: itch.dir,
    uses: ['manifest.itch.zip', 'manifest.itch.dir/cover.png', 'manifest.itch.dir/screenshot_*.png', 'manifest.itch.dir/cover.gif'],
    automated: butlerOk && !!apiKey,
  };
  if (dryRun) return { ok: true, dryRun: true, plan, manualSteps: plan.automated ? undefined : checklist(manifest, { user }) };
  if (!butlerOk || !apiKey) {
    return { ok: false, automated: false, reason: !butlerOk ? 'butler not installed' : 'BUTLER_API_KEY not configured', manualSteps: checklist(manifest, { user }) };
  }
  if (!zip || !existsSync(zip)) throw new Error(`bundle zip missing: ${zip} (run gamepress publish-pack ${manifest.id})`);
  if (target.includes('<itch-user>')) throw new Error('set ITCH_USER=<your-itch-username> or pass --user <name>');

  const env = { ...process.env, BUTLER_API_KEY: apiKey };
  const r = spawnSync('butler', ['push', zip, target, '--userversion', manifest.meta?.version || '1.0.0'], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(`butler push failed: ${(r.stderr || r.stdout || '').trim().slice(0, 240)}`);
  const owner = target.split('/')[0];
  return { ok: true, platform: 'itch', id: manifest.id, target, url: `https://${owner}.itch.io/${manifest.id}` };
}
