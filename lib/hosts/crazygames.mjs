// STUB: CrazyGames hosting. Another agent completes this; the contract is fixed so the rest of the pipeline does not change.
// Input: publish/<id>/manifest.json (see lib/tasks.mjs publishPack, docs/HOSTING.md). Uses: manifest.crazygames.zip, manifest.crazygames.dir/cover_*.png, manifest.crazygames.dir/preview.mp4.
// How: Developer portal submission (https://developer.crazygames.com): upload the zip, covers 16:9/2:3/1:1, preview video. No public upload API: browser-automate the form with the user's logged-in session.
// Rules: never print or commit credentials; read them from env or the OS keychain; return { ok, url, id }; support dryRun.
export async function upload(manifest, { dryRun = true } = {}) {
  const plan = { platform: 'crazygames', id: manifest.id, uses: ['manifest.crazygames.zip', 'manifest.crazygames.dir/cover_*.png', 'manifest.crazygames.dir/preview.mp4'] };
  if (dryRun) return { ok: true, dryRun: true, plan };
  throw new Error('crazygames upload not implemented yet: see the header of this file');
}
