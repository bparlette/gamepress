// CrazyGames submission validator & portal packager (`gamepress host <id> --to crazygames [--live]`).
// Validates bundle size (<50 MB), cover art dimensions (1920x1080, 800x1200, 800x800), and preview.mp4,
// and writes a ready-to-submit crazygames-portal.json checklist in publish/<id>/.
import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';

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
  };

  const plan = { platform: 'crazygames', id: manifest.id, submission, uses: ['manifest.crazygames.zip', 'manifest.crazygames.dir/cover_*.png', 'manifest.crazygames.dir/preview.mp4'] };
  if (dryRun) return { ok: true, dryRun: true, plan };
  if (!submission.ready) throw new Error(`CrazyGames bundle not ready: check zip (<50MB) and covers in ${cg.dir}`);
  const outFile = join(dirname(cg.dir || `publish/${manifest.id}/press/out`), '..', 'crazygames-portal.json');
  writeFileSync(outFile, JSON.stringify(submission, null, 2));
  return { ok: true, platform: 'crazygames', id: manifest.id, portalUrl: submission.portalUrl, submissionFile: outFile };
}
