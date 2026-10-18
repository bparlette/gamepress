// Steam hosting & SteamPipe depot builder (`gamepress host steam <id> [--live]`).
// Auto-generates app_build_<appId>.vdf and depot_build_<depotId>.vdf and runs steamcmd when --live is passed.
// The store page itself (capsules, description, screenshots) is manual in Steamworks —
// this command packages everything the store page needs and prints the exact steps.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

/** Exact Steamworks + steamcmd steps. Values filled from the manifest. */
export function checklist(manifest, { appId } = {}) {
  const st = manifest.steam || {};
  const dir = st.dir || `publish/${manifest.id}/press/out/steam`;
  const id = appId || process.env.STEAM_APP_ID || '<APP_ID>';
  return [
    `0. One-time: pay the $100 app fee at https://partner.steamgames.com/ → create the app → note the App ID.`,
    `1. Store page (https://partner.steamgames.com/apps/landing/${id}):`,
    `   - Capsules: ${dir}/capsule_616x353.png, capsule_467x181.png, header_460x215.png`,
    `   - Library art: ${dir}/library_600x900.png, hero_3840x1240.png, logo.png`,
    `   - Screenshots: ${dir}/screenshot_*.png  (5 minimum, 1920×1080, no menus)`,
    `   - Trailer: ${st.trailer || dir + '/trailer.mp4'}  (Store → Trailers)`,
    `   - Fill: title "${st.title || manifest.meta?.title || manifest.id}", short description, tags, release date`,
    `2. Build upload (automated below if steamcmd + STEAM_USER + STEAM_APP_ID are set):`,
    `   steamcmd +login <user> +run_app_build publish/${manifest.id}/steam/app_build_${id}.vdf +quit`,
    `3. Steamworks → your app → SteamPipe → Builds → set the new build live on the default branch.`,
    `4. Request review → store page goes live after approval.`,
    `Note: this is a web build. For Steam it needs a desktop wrapper (Electron/NW.js) — see st.note in the manifest.`,
  ];
}

export async function upload(manifest, {
  dryRun = true,
  appId = process.env.STEAM_APP_ID || '1000',
  depotId = process.env.STEAM_DEPOT_ID || String(Number(process.env.STEAM_APP_ID || 1000) + 1),
  steamUser = process.env.STEAM_USER,
} = {}) {
  const st = manifest.steam || {};
  const steamDir = resolve(st.dir || `publish/${manifest.id}/press/out/steam`);
  const vdfDir = resolve(`publish/${manifest.id}/steam`);
  mkdirSync(vdfDir, { recursive: true });
  const contentRoot = join(vdfDir, 'game');
  mkdirSync(contentRoot, { recursive: true });

  const depotVdfPath = join(vdfDir, `depot_build_${depotId}.vdf`);
  const appVdfPath = join(vdfDir, `app_build_${appId}.vdf`);

  const depotVdf = `"DepotBuildConfig"\n{\n  "DepotID" "${depotId}"\n  "ContentRoot" "${contentRoot}"\n  "FileMapping"\n  {\n    "LocalPath" "*"\n    "DepotPath" "."\n    "recursive" "1"\n  }\n}\n`;
  const appVdf = `"appbuild"\n{\n  "appid" "${appId}"\n  "desc" "${manifest.meta?.title || manifest.id} automated build via gamepress"\n  "buildoutput" "${join(vdfDir, 'output')}"\n  "contentroot" "${contentRoot}"\n  "setlive" "default"\n  "depots"\n  {\n    "${depotId}" "${depotVdfPath}"\n  }\n}\n`;

  writeFileSync(depotVdfPath, depotVdf);
  writeFileSync(appVdfPath, appVdf);

  const steamcmdOk = spawnSync('steamcmd', ['+quit'], { encoding: 'utf8' }).status === 0;
  const plan = {
    platform: 'steam',
    id: manifest.id,
    appId,
    depotId,
    appVdfPath,
    depotVdfPath,
    storeAssetsDir: steamDir,
    steamcmdInstalled: steamcmdOk,
    credentialsConfigured: !!(steamUser && process.env.STEAM_APP_ID),
    automated: steamcmdOk && !!steamUser && !!process.env.STEAM_APP_ID,
    uses: ['manifest.steam.dir/*.png', 'manifest.steam.dir/trailer.mp4'],
  };
  if (dryRun) return { ok: true, dryRun: true, plan, manualSteps: checklist(manifest, { appId }) };
  if (!plan.automated) {
    return { ok: false, automated: false, reason: !steamcmdOk ? 'steamcmd not installed (brew install --cask steamcmd)' : 'set STEAM_USER and STEAM_APP_ID', vdfGenerated: { appVdfPath, depotVdfPath }, manualSteps: checklist(manifest, { appId }) };
  }
  const r = spawnSync('steamcmd', ['+login', steamUser, '+run_app_build', appVdfPath, '+quit'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`steamcmd exited with status ${r.status}`);
  return { ok: true, platform: 'steam', id: manifest.id, appId, url: `https://store.steampowered.com/app/${appId}`, manualSteps: ['Build uploaded. Remaining: Steamworks → SteamPipe → Builds → set live on default branch, then request review.'] };
}
