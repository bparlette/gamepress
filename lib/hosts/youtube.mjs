// YouTube Shorts uploader via YouTube Data API v3 (`gamepress host <id> --to youtube [--live]`).
// Reads YOUTUBE_ACCESS_TOKEN or refreshes via YOUTUBE_CLIENT_ID + YOUTUBE_CLIENT_SECRET + YOUTUBE_REFRESH_TOKEN
// (from env or macOS Keychain `gamepress-youtube-token` / `gamepress-youtube-oauth`).
import { readFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

function getKeychainSecret(service) {
  if (process.platform !== 'darwin') return null;
  try { return execFileSync('security', ['find-generic-password', '-s', service, '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return null; }
}

async function resolveAccessToken() {
  if (process.env.YOUTUBE_ACCESS_TOKEN) return process.env.YOUTUBE_ACCESS_TOKEN;
  const kcToken = getKeychainSecret('gamepress-youtube-token');
  if (kcToken) return kcToken;
  let clientId = process.env.YOUTUBE_CLIENT_ID, clientSecret = process.env.YOUTUBE_CLIENT_SECRET, refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!refreshToken) {
    try {
      const j = JSON.parse(getKeychainSecret('gamepress-youtube-oauth') || '{}');
      clientId = clientId || j.client_id; clientSecret = clientSecret || j.client_secret; refreshToken = refreshToken || j.refresh_token;
    } catch {}
  }
  if (!clientId || !clientSecret || !refreshToken) return null;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  if (!res.ok) throw new Error(`YouTube OAuth refresh failed: HTTP ${res.status}`);
  const data = await res.json();
  return data.access_token || null;
}

export async function upload(manifest, { dryRun = true } = {}) {
  const yt = manifest.youtube || {};
  const hasCreds = !!(process.env.YOUTUBE_ACCESS_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN || getKeychainSecret('gamepress-youtube-token') || getKeychainSecret('gamepress-youtube-oauth'));
  const plan = {
    platform: 'youtube',
    id: manifest.id,
    video: yt.video,
    videoExists: !!(yt.video && existsSync(yt.video)),
    thumbnail: yt.thumbnail,
    title: yt.title,
    tags: yt.tags,
    privacy: yt.privacy || 'public',
    credentialsConfigured: hasCreds,
    uses: ['manifest.youtube.video', 'manifest.youtube.thumbnail', 'manifest.youtube.title/description/tags'],
  };
  if (dryRun) return { ok: true, dryRun: true, plan };
  if (!yt.video || !existsSync(yt.video)) throw new Error(`missing video file: ${yt.video}`);
  const token = await resolveAccessToken();
  if (!token) throw new Error('missing YouTube credentials: set YOUTUBE_ACCESS_TOKEN or YOUTUBE_CLIENT_ID/YOUTUBE_CLIENT_SECRET/YOUTUBE_REFRESH_TOKEN (or store in macOS Keychain `gamepress-youtube-oauth`)');

  const videoBytes = readFileSync(yt.video);
  const metadata = {
    snippet: {
      title: String(yt.title || manifest.meta?.title || manifest.id).slice(0, 100),
      description: String(yt.description || '#shorts').slice(0, 4900),
      tags: (yt.tags || ['shorts', 'gaming']).slice(0, 25),
      categoryId: '20', // Gaming
    },
    status: {
      privacyStatus: yt.privacy || 'public',
      selfDeclaredMadeForKids: Boolean(yt.madeForKids),
    },
  };

  // Initiate resumable upload session
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(statSync(yt.video).size),
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify(metadata),
  });
  if (!initRes.ok) throw new Error(`YouTube upload init failed: HTTP ${initRes.status}`);
  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) throw new Error('YouTube API did not return a resumable upload Location header');

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(videoBytes.length) },
    body: videoBytes,
  });
  if (!putRes.ok) throw new Error(`YouTube video upload failed: HTTP ${putRes.status}`);
  const videoData = await putRes.json();
  const videoId = videoData.id;

  // Optional custom thumbnail upload
  if (yt.thumbnail && existsSync(yt.thumbnail) && videoId) {
    try {
      await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
        body: readFileSync(yt.thumbnail),
      });
    } catch {}
  }

  return { ok: true, platform: 'youtube', id: manifest.id, videoId, url: `https://youtube.com/shorts/${videoId}` };
}
