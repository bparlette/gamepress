// itch.io hosting via butler (`gamepress host <id> --to itch [--live]`).
// Reads BUTLER_API_KEY from env or macOS Keychain (`security find-generic-password -s gamepress-butler -w`).
import { existsSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';

function getKeychainSecret(service) {
  if (process.platform !== 'darwin') return null;
  try { return execFileSync('security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
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
  };
  if (dryRun) return { ok: true, dryRun: true, plan };
  if (!butlerOk) throw new Error('butler CLI not installed (brew install --cask itch or download from itch.io/docs/butler)');
  if (!zip || !existsSync(zip)) throw new Error(`bundle zip missing: ${zip} (run gamepress publish-pack ${manifest.id})`);
  if (target.includes('<itch-user>')) throw new Error('set ITCH_USER=<your-itch-username> or pass --user <name>');

  const env = { ...process.env, ...(apiKey ? { BUTLER_API_KEY: apiKey } : {}) };
  const r = spawnSync('butler', ['push', zip, target, '--userversion', manifest.meta?.version || '1.0.0'], { encoding: 'utf8', env });
  if (r.status !== 0) throw new Error(`butler push failed: ${(r.stderr || r.stdout || '').trim().slice(0, 240)}`);
  const owner = target.split('/')[0];
  return { ok: true, platform: 'itch', id: manifest.id, target, url: `https://${owner}.itch.io/${manifest.id}` };
}
