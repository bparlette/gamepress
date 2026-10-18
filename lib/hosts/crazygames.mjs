// CrazyGames submission packager (`gamepress host crazygames <id> [--live]`).
// CrazyGames has NO public upload API (verified 2026-10-17) — submissions go through
// the developer portal at https://developer.crazygames.com/. This command validates
// the bundle, writes a submission-ready JSON + checklist, and --live just means
// "package everything and print the exact portal steps" (nothing is uploaded).
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

/** Exact portal steps. Values filled from the manifest. */
export function checklist(manifest) {
  const cg = manifest.crazygames || {};
  const dir = cg.dir || `publish/${manifest.id}/press/out/crazygames`;
  return [
    `1. Go to https://developer.crazygames.com/ → sign in → "Upload game"`,
    `2. Game file: upload ${cg.zip || manifest.bundle?.zip || '<run: gamepress publish-pack ' + manifest.id + '>'}`,
    `   - Must be a .zip of the web build, under 50 MB, entry index.html at root`,
    `3. Covers (Edit game → Media):`,
    `   - 1920×1080 landscape: ${dir}/cover_landscape_1920x1080.png`,
    `   - 800×1200 portrait:  ${dir}/cover_portrait_800x1200.png`,
    `   - 800×800 square:     ${dir}/cover_square_800x800.png`,
    `   - No store logos, prices, or "coming soon" text on covers`,
    `4. Preview video: ${cg.preview || dir + '/preview.mp4'}  (15-30s gameplay, no menus)`,
    `5. Fill: title "${cg.title || manifest.meta?.title || manifest.id}", description, category, up to 8 tags`,
    `6. QA: select "HTML5", tick mobile-friendly if touch works. Submit → QA review follows (days, not hours).`,
    `7. CrazyGames SDK (optional, for ads): kit/gpmonetize.js auto-detects the CrazyGames SDK — include https://sdk.crazygames.com/crazygames-sdk-v3.js in index.html to enable rewarded/interstitial ads.`,
  ];
}

export async function upload(manifest, { dryRun = true } = {}) {
  const cg = manifest.crazygames || {};
  const zip = cg.zip || manifest.bundle?.zip;
  const zipBytes = zip && existsSync(zip) ? statSync(zip).size : 0;
  const covers = ['cover_landscape_1920x1080.png', 'cover_portrait_800x1200.png', 'cover_square_800x800.png']
    .map(f => ({ file: f, exists: !!(cg.dir && existsSync(join(cg.dir, f))) }));
  const previewExists = !!(cg.preview && existsSync(cg.preview));

  const submission = {
    platform: 'crazygames',
    portalUrl: 'https://developer.crazygames.com/',
    id: manifest.id,
    title: cg.title || manifest.meta?.title || manifest.id,
    description: cg.description || manifest.meta?.description || '',
    category: 'Action',
    tags: (cg.tags || []).slice(0, 8),
    orientation: cg.orientation || 'portrait',
    bundleZip: zip,
    bundleMB: +(zipBytes / 1048576).toFixed(2),
    under50MB: zipBytes > 0 && zipBytes < 50 * 1048576,
    covers,
    previewVideo: cg.preview,
    previewExists,
    ready: zipBytes > 0 && zipBytes < 50 * 1048576 && covers.every(c => c.exists),
    automated: false,
    note: 'CrazyGames has no public upload API — submission is manual via the developer portal.',
  };

  const plan = { platform: 'crazygames', id: manifest.id, submission, uses: ['manifest.crazygames.zip', 'manifest.crazygames.dir/cover_*.png', 'manifest.crazygames.dir/preview.mp4'] };
  if (dryRun) return { ok: true, dryRun: true, plan, manualSteps: checklist(manifest) };
  // --live: package the submission file and print the portal steps. Nothing uploads automatically.
  const outFile = join(dirname(cg.dir || `publish/${manifest.id}/press/out`), '..', 'crazygames-portal.json');
  try { writeFileSync(outFile, JSON.stringify(submission, null, 2)); } catch {}
  return { ok: true, platform: 'crazygames', id: manifest.id, automated: false, portalUrl: submission.portalUrl, submissionFile: outFile, manualSteps: checklist(manifest) };
}
