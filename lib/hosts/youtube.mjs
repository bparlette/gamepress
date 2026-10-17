// STUB: YouTube Shorts hosting. Another agent completes this; the contract is fixed so the rest of the pipeline does not change.
// Input: publish/<id>/manifest.json (see lib/tasks.mjs publishPack, docs/HOSTING.md). Uses: manifest.youtube.video, manifest.youtube.thumbnail, manifest.youtube.title/description/tags.
// How: YouTube Data API v3 videos.insert (OAuth, scope youtube.upload) with manifest.youtube.video; then thumbnails.set. Quota: 1600 units per upload.
// Rules: never print or commit credentials; read them from env or the OS keychain; return { ok, url, id }; support dryRun.
export async function upload(manifest, { dryRun = true } = {}) {
  const plan = { platform: 'youtube', id: manifest.id, uses: ['manifest.youtube.video', 'manifest.youtube.thumbnail', 'manifest.youtube.title/description/tags'] };
  if (dryRun) return { ok: true, dryRun: true, plan };
  throw new Error('youtube upload not implemented yet: see the header of this file');
}
