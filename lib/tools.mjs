// lib/tools.mjs — external tool registry: download, verify, update-check.
//
// Tools are declared in tools.json (never committed as binaries — only the
// manifest lives in git). Large files download on demand via `gamepress setup`.
//
//   gamepress tools            list all tools with install status + sizes
//   gamepress tools --check    check upstream for newer versions
//   gamepress setup --tts      download kokoro-tts (~136MB, one time)
import { readFileSync, existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, '..', 'tools.json');

export function loadManifest() {
  return JSON.parse(readFileSync(MANIFEST, 'utf8'));
}

/** Resolve ~ and env override to an absolute install dir for a tool. */
export function toolDir(name) {
  const t = loadManifest()[name];
  if (!t) throw new Error(`unknown tool: ${name}`);
  if (t.env_override && process.env[t.env_override]) return process.env[t.env_override];
  return t.install_dir.replace(/^~/, homedir());
}

export function totalSizeMb(tool) {
  return tool.files.reduce((s, f) => s + (f.size_mb || 0), 0);
}

/** Which tools are installed / missing / incomplete. */
export function toolStatus() {
  const manifest = loadManifest();
  const out = {};
  for (const [name, t] of Object.entries(manifest)) {
    // Network services have no files to download — status is "available", not "installed".
    if (t.type === 'network' || !t.files.length) {
      out[name] = { version: t.version, description: t.description, dir: t.install_dir || '(network service)', installed: null, network: true, files: [], total_mb: 0, license: t.license, used_by: t.used_by };
      continue;
    }
    const dir = toolDir(name);
    const files = t.files.map(f => {
      const p = join(dir, f.name);
      const present = existsSync(p);
      const bytes = present ? statSync(p).size : 0;
      const ok = present && bytes >= (f.size_mb || 0) * 1024 * 1024 * 0.9; // 90% tolerance
      return { name: f.name, present, bytes, expected_mb: f.size_mb, ok };
    });
    const installed = files.every(f => f.ok);
    out[name] = { version: t.version, description: t.description, dir, installed, files, total_mb: totalSizeMb(t), license: t.license, used_by: t.used_by };
  }
  return out;
}

/** List every tool with version, size, and install status. */
export function listTools() {
  const status = toolStatus();
  return Object.entries(status).map(([name, s]) => ({
    tool: name,
    version: s.version,
    description: s.description,
    total_mb: s.total_mb,
    installed: s.installed,
    network: !!s.network,
    dir: s.dir,
    license: s.license,
    used_by: s.used_by,
  }));
}

function sha256File(path) {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

/** Verify a downloaded file: size sanity + sha256 when the manifest has one. */
function verifyFile(dest, f) {
  const bytes = statSync(dest).size;
  if (bytes < (f.size_mb || 0) * 1024 * 1024 * 0.9) throw new Error(`${f.name}: too small (${bytes} bytes), expected ~${f.size_mb}MB`);
  if (f.sha256) {
    const actual = sha256File(dest);
    if (actual !== f.sha256) throw new Error(`${f.name}: sha256 mismatch (got ${actual.slice(0, 16)}…, expected ${f.sha256.slice(0, 16)}…) — file may be corrupt or a new version`);
    return 'sha256 ok';
  }
  return 'size ok';
}

/** Download all files for a tool into its install dir. Verifies size + sha256. */
export function downloadTool(name, { force = false } = {}) {
  const manifest = loadManifest();
  const t = manifest[name];
  if (!t) throw new Error(`unknown tool: ${name} (known: ${Object.keys(manifest).join(', ')})`);
  const dir = toolDir(name);
  mkdirSync(dir, { recursive: true });
  // Local candidates: reuse a nearby copy instead of re-downloading hundreds of MB.
  const localCandidates = [
    join(homedir(), 'workspace', 'ai-diary', 'tts'),
    join(process.cwd(), 'tts'),
  ];
  const results = [];
  for (const f of t.files) {
    const dest = join(dir, f.name);
    const present = existsSync(dest) && statSync(dest).size >= (f.size_mb || 0) * 1024 * 1024 * 0.9;
    if (present && !force) { results.push({ file: f.name, action: 'already present' }); continue; }
    const local = localCandidates.map(d => join(d, f.name)).find(p => existsSync(p) && statSync(p).size >= (f.size_mb || 0) * 1024 * 1024 * 0.9);
    if (local && !force) {
      copyFileSync(local, dest);
      results.push({ file: f.name, action: 'copied local', verified: verifyFile(dest, f) });
      continue;
    }
    console.log(`downloading ${f.name} (~${f.size_mb}MB)...`);
    execFileSync('curl', ['-L', '--fail', '--progress-bar', '-o', dest, f.url], { stdio: ['ignore', 'inherit', 'inherit'] });
    results.push({ file: f.name, action: 'downloaded', verified: verifyFile(dest, f) });
  }
  // Check python deps if declared.
  if (t.python_deps && t.python_deps.length) {
    try {
      execFileSync('python3', ['-c', t.python_deps.map(d => `import ${d.replace(/-/g, '_')}`).join('; ')], { stdio: 'ignore' });
      results.push({ file: 'python deps', action: 'present', verified: t.python_deps.join(', ') });
    } catch {
      results.push({ file: 'python deps', action: 'MISSING', verified: `pip install ${t.python_deps.join(' ')}` });
    }
  }
  return { tool: name, dir, ok: true, files: results };
}

/** Hit each tool's check_latest URL; report which have newer versions upstream. */
export function checkUpdates() {
  const manifest = loadManifest();
  const out = [];
  for (const [name, t] of Object.entries(manifest)) {
    if (!t.check_latest) { out.push({ tool: name, current: t.version, latest: 'unknown', update: false, note: 'no check_latest URL' }); continue; }
    try {
      const raw = execFileSync('curl', ['-sL', '--fail', '--max-time', '15', t.check_latest], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      const rel = JSON.parse(raw);
      let latest = rel.tag_name || rel.name || 'unknown';
      // Normalize upstream tag against an optional prefix (e.g. "model-files-v1.1" -> "v1.1")
      if (t.tag_prefix && latest.startsWith(t.tag_prefix)) latest = latest.slice(t.tag_prefix.length);
      const current = t.version || '';
      const update = latest !== 'unknown' && latest !== current;
      out.push({ tool: name, current, latest, update, url: rel.html_url || t.check_latest });
    } catch (e) {
      out.push({ tool: name, current: t.version, latest: 'check failed', update: false, note: String(e.message).split('\n')[0] });
    }
  }
  return out;
}
