// Analytics & Promotion Feedback Loop (`gamepress stats [id]`).
// Aggregates local grade/pipeline telemetry + optional live YouTube / itch.io metrics (when API keys exist)
// and emits a 1-line-per-game promotion verdict so an AI knows which prototype to promote to demo / Steam.
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export async function gatherStats(targetId = null, { gamesDir = 'games', publishDir = 'publish', stateDir = '.gp' } = {}) {
  const ids = targetId
    ? [targetId]
    : (existsSync(gamesDir)
      ? readdirSync(gamesDir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith('_')).map(d => d.name)
      : []);

  const savedFile = join(publishDir, 'stats.json');
  const saved = existsSync(savedFile) ? (() => { try { return JSON.parse(readFileSync(savedFile, 'utf8')); } catch { return {}; } })() : {};

  const rows = [];
  for (const id of ids) {
    const gradeFile = join(stateDir, `${id}.grade.json`);
    const grade = existsSync(gradeFile) ? (() => { try { return JSON.parse(readFileSync(gradeFile, 'utf8')); } catch { return null; } })() : null;
    const manFile = join(publishDir, id, 'manifest.json');
    const man = existsSync(manFile) ? (() => { try { return JSON.parse(readFileSync(manFile, 'utf8')); } catch { return null; } })() : null;
    const prev = saved[id] || {};

    let ytViews = prev.ytViews ?? 0, ytLikes = prev.ytLikes ?? 0, itchViews = prev.itchViews ?? 0, itchDownloads = prev.itchDownloads ?? 0;

    // Optional live YouTube Data API lookup if videoId + YOUTUBE_API_KEY are present
    const videoId = prev.youtubeVideoId || man?.youtube?.videoId;
    if (videoId && process.env.YOUTUBE_API_KEY) {
      try {
        const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(process.env.YOUTUBE_API_KEY)}`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const j = await res.json();
          const st = j.items?.[0]?.statistics;
          if (st) { ytViews = Number(st.viewCount || 0); ytLikes = Number(st.likeCount || 0); }
        }
      } catch {}
    }

    const score = grade?.score ?? null;
    const packed = !!man;
    const verdict = score === null ? 'RUN_PIPELINE'
      : score < 80 ? 'FIX_GRADE'
      : ytViews >= 10000 || itchDownloads >= 500 ? 'PROMOTE_TO_STEAM'
      : ytViews >= 1000 || itchViews >= 200 ? 'PROMOTE_TO_STORE'
      : !packed ? 'PROMOTE_TO_PACK'
      : 'READY_TO_PUBLISH';

    const row = { id, gradeScore: score, packed, ytViews, ytLikes, itchViews, itchDownloads, verdict };
    rows.push(row);
    saved[id] = { ...prev, ...row, updatedAt: new Date().toISOString() };
  }

  if (rows.length) {
    mkdirSync(publishDir, { recursive: true });
    writeFileSync(savedFile, JSON.stringify(saved, null, 2));
  }
  return { count: rows.length, games: rows };
}
