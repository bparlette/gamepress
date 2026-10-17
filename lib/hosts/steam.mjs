// STUB: Steam hosting. Another agent completes this; the contract is fixed so the rest of the pipeline does not change.
// Input: publish/<id>/manifest.json (see lib/tasks.mjs publishPack, docs/HOSTING.md). Uses: manifest.steam.dir/*.png, manifest.steam.dir/trailer.mp4.
// How: Steamworks: create app, store assets from manifest.steam.dir, builds via steamcmd +run_app_build with a depot vdf. Web demos need a desktop wrapper first (Electron/NW.js).
// Rules: never print or commit credentials; read them from env or the OS keychain; return { ok, url, id }; support dryRun.
export async function upload(manifest, { dryRun = true } = {}) {
  const plan = { platform: 'steam', id: manifest.id, uses: ['manifest.steam.dir/*.png', 'manifest.steam.dir/trailer.mp4'] };
  if (dryRun) return { ok: true, dryRun: true, plan };
  throw new Error('steam upload not implemented yet: see the header of this file');
}
