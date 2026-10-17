// Steam hosting & SteamPipe depot builder (`gamepress host <id> --to steam [--live]`).
// Auto-generates app_build_<appId>.vdf and depot_build_<depotId>.vdf and runs steamcmd when --live is passed.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

export async function upload(manifest, {
  dryRun = true,
  appId = process.env.STEAM_APP_ID || '1000',
  depotId = process.env.STEAM_DEPOT_ID || String(Number(process.env.STEAM_APP_ID || 1000) + 1),
  steamUser = process.env.STEAM_USER,
} = {}) {
  const st = manifest.steam || {};
  const steamDir = resolve(st.dir || `publish/${manifest.id}/press/out/steam`);
  const vdfDir = resolve(dirname(steamDir), '..', '..', 'steam');
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
    uses: ['manifest.steam.dir/*.png', 'manifest.steam.dir/trailer.mp4'],
  };
  if (dryRun) return { ok: true, dryRun: true, plan };
  if (!steamcmdOk) throw new Error(`steamcmd not installed (brew install --cask steamcmd). VDF files generated at ${appVdfPath}`);
  if (!steamUser) throw new Error(`set STEAM_USER=<username> and STEAM_APP_ID=<id> to run live steamcmd upload`);

  const r = spawnSync('steamcmd', ['+login', steamUser, '+run_app_build', appVdfPath, '+quit'], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`steamcmd exited with status ${r.status}`);
  return { ok: true, platform: 'steam', id: manifest.id, appId, url: `https://store.steampowered.com/app/${appId}` };
}

function dirname(p) {
  const i = p.lastIndexOf('/');
  return i > 0 ? p.slice(0, i) : '.';
}
