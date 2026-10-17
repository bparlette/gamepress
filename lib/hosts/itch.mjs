// STUB: itch.io hosting. Another agent completes this; the contract is fixed so the rest of the pipeline does not change.
// Input: publish/<id>/manifest.json (see lib/tasks.mjs publishPack, docs/HOSTING.md). Uses: manifest.itch.zip, manifest.itch.dir/cover.png, manifest.itch.dir/screenshot_*.png, manifest.itch.dir/cover.gif.
// How: butler push <zip> <user>/<game>:html5 (https://itch.io/docs/butler/), then set cover/screenshots/tags in the dashboard or via the itch API. Needs a butler API key in BUTLER_API_KEY.
// Rules: never print or commit credentials; read them from env or the OS keychain; return { ok, url, id }; support dryRun.
export async function upload(manifest, { dryRun = true } = {}) {
  const plan = { platform: 'itch', id: manifest.id, uses: ['manifest.itch.zip', 'manifest.itch.dir/cover.png', 'manifest.itch.dir/screenshot_*.png', 'manifest.itch.dir/cover.gif'] };
  if (dryRun) return { ok: true, dryRun: true, plan };
  throw new Error('itch upload not implemented yet: see the header of this file');
}
