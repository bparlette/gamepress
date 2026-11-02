#!/usr/bin/env node
/* roblox2three.mjs — Roblox Parts → Three.js, with zero AI tokens in the loop.
 *
 *   node roblox2three.mjs luau                 print the Studio exporter (paste in the command bar, or run via MCP execute_luau)
 *   node roblox2three.mjs serve [port]         receive the export on localhost → scene.json   (default port 8787)
 *   node roblox2three.mjs build scene.json [out.html] [--meshes meshes.json] [--three BASE] [--title T]
 *   node roblox2three.mjs sample               write a sample scene.json that uses every shape (for testing)
 *
 * Flow: Studio (Luau) --HTTP POST--> serve --> scene.json --> build --> one self-contained .html (Three.js from a CDN).
 * Roblox and Three.js are both right-handed with +Y up, so a CFrame maps straight onto a Matrix4 (no axis flips).
 * Needs Node 18+. Studio needs Game Settings → Security → "Allow HTTP Requests" on.
 */
import fs from 'node:fs';
import http from 'node:http';

const [cmd, ...args] = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };

/* ---------------------------------------------------------------- Studio side */
const LUAU = `-- roblox2three exporter. Exports the current Selection (or all of Workspace) to the local receiver.
local H = game:GetService("HttpService")
local L = game:GetService("Lighting")
local URL = "http://127.0.0.1:8787/chunk"
local BATCH = 1500 -- keeps each POST under HttpService's 1 MB limit
local function r(n) return math.floor(n * 1000 + 0.5) / 1000 end
local function c3(c) return {math.floor(c.R * 255 + 0.5), math.floor(c.G * 255 + 0.5), math.floor(c.B * 255 + 0.5)} end
local function v3(v) return {r(v.X), r(v.Y), r(v.Z)} end

local parts, lights, seen = {}, {}, {}
local function visit(d)
	if seen[d] then return end
	seen[d] = true
	if d:IsA("BasePart") and not d:IsA("Terrain") then
		local shape = "Block"
		if d:IsA("Part") then shape = d.Shape.Name -- Ball | Block | Cylinder
		elseif d:IsA("WedgePart") then shape = "Wedge"
		elseif d:IsA("CornerWedgePart") then shape = "CornerWedge"
		elseif d:IsA("MeshPart") or d:IsA("UnionOperation") then shape = "Mesh" end
		local cf = table.pack(d.CFrame:GetComponents())
		local p = {n = d.Name, s = shape, z = v3(d.Size), c = {}, k = c3(d.Color), m = d.Material.Name}
		for i = 1, 12 do p.c[i] = r(cf[i]) end
		if d.Transparency > 0 then p.t = r(d.Transparency) end
		if d.Reflectance > 0 then p.f = r(d.Reflectance) end
		if d:IsA("MeshPart") then p.mesh = d.MeshId end
		table.insert(parts, p)
	elseif (d:IsA("PointLight") or d:IsA("SpotLight")) and d.Enabled and d.Parent and d.Parent:IsA("BasePart") then
		local l = {t = d.ClassName, p = v3(d.Parent.Position), k = c3(d.Color), b = r(d.Brightness), range = r(d.Range)}
		if d:IsA("SpotLight") then
			l.angle = r(d.Angle)
			l.look = v3(d.Parent.CFrame:VectorToWorldSpace(Vector3.FromNormalId(d.Face)))
		end
		table.insert(lights, l)
	end
end

local roots = game:GetService("Selection"):Get()
if #roots == 0 then roots = {workspace} end
for _, root in ipairs(roots) do
	visit(root)
	for _, d in ipairs(root:GetDescendants()) do visit(d) end
end

local lighting = {ambient = c3(L.Ambient), outdoor = c3(L.OutdoorAmbient), brightness = r(L.Brightness), clock = r(L.ClockTime),
	fogColor = c3(L.FogColor), fogStart = L.FogStart, fogEnd = L.FogEnd}
local total = math.max(1, math.ceil(#parts / BATCH))
for i = 1, total do
	local batch = {}
	for j = (i - 1) * BATCH + 1, math.min(i * BATCH, #parts) do table.insert(batch, parts[j]) end
	local body = {parts = batch, i = i, total = total}
	if i == total then body.lights = lights; body.lighting = lighting end
	H:PostAsync(URL, H:JSONEncode(body), Enum.HttpContentType.ApplicationJson)
end
print("roblox2three: exported " .. #parts .. " parts, " .. #lights .. " lights")
`;

/* ------------------------------------------------------------------ receiver */
function serve(port = 8787, out = 'scene.json') {
  const acc = { parts: [], lights: [], lighting: {} };
  http.createServer((req, res) => {
    if (req.method !== 'POST') { res.writeHead(200); return res.end('roblox2three receiver ok'); }
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const j = JSON.parse(body);
        if (j.i === 1) acc.parts = [];
        for (const p of j.parts) acc.parts.push(p);
        if (j.lights) acc.lights = j.lights;
        if (j.lighting) acc.lighting = j.lighting;
        console.log('chunk', j.i + '/' + j.total, '(' + acc.parts.length + ' parts)');
        if (j.i === j.total) { fs.writeFileSync(out, JSON.stringify(acc)); console.log('wrote', out); }
        res.writeHead(200); res.end('ok');
      } catch (e) { res.writeHead(400); res.end(String(e)); }
    });
  }).listen(port, '127.0.0.1', () => console.log('receiver on http://127.0.0.1:' + port + ' → ' + out));
}

/* --------------------------------------------------------------------- build */
const CLIENT = `
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const S = JSON.parse(document.getElementById('scene').textContent);
const MESHES = JSON.parse(document.getElementById('meshes').textContent);
const V3 = THREE.Vector3;

/* roughness, metalness — close enough to Roblox's material look */
const MAT = { Plastic: [.55, 0], SmoothPlastic: [.28, 0], Wood: [.8, 0], WoodPlanks: [.78, 0], Concrete: [.95, 0], Brick: [.9, 0],
  Cobblestone: [.9, 0], Slate: [.85, 0], Granite: [.7, 0], Marble: [.3, 0], Metal: [.35, .9], DiamondPlate: [.3, .9], CorrodedMetal: [.7, .6],
  Foil: [.2, 1], Grass: [1, 0], LeafyGrass: [1, 0], Sand: [1, 0], Ground: [1, 0], Mud: [1, 0], Fabric: [.95, 0], Ice: [.12, 0], Glass: [.05, .1],
  Pebble: [.95, 0], Asphalt: [.95, 0], Basalt: [.9, 0], Rock: [.9, 0], Snow: [.9, 0] };
const mats = {};
function matFor(g) {
  const key = g.m + '|' + g.t + '|' + g.f;
  if (mats[key]) return mats[key];
  let m;
  if (g.m === 'Neon' || g.m === 'ForceField') m = new THREE.MeshBasicMaterial({ color: 0xffffff });
  else {
    const b = MAT[g.m] || [.6, 0];
    m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: b[0], metalness: Math.max(b[1], g.f || 0) });
  }
  const t = g.m === 'ForceField' ? Math.max(g.t, .5) : (g.m === 'Glass' ? Math.max(g.t, .35) : g.t);
  if (t > 0) { m.transparent = true; m.opacity = 1 - t; m.depthWrite = false; }
  return (mats[key] = m);
}

/* unit geometries (size 1 on every axis); each instance is scaled by the part's Size */
function solid(tris, inside) { // tris: [[a,b,c],...] point triples; winds each face outward
  const pos = [];
  for (const t of tris) {
    let [a, b, c] = t.map(p => new V3(...p));
    const n = new V3().subVectors(b, a).cross(new V3().subVectors(c, a));
    const g = new V3().add(a).add(b).add(c).divideScalar(3).sub(new V3(...inside));
    if (n.dot(g) < 0) [b, c] = [c, b];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}
const quad = (a, b, c, d) => [[a, b, c], [a, c, d]];
const GEO = {
  Block: () => new THREE.BoxGeometry(1, 1, 1),
  Ball: () => new THREE.SphereGeometry(.5, 28, 18),
  Cylinder: () => new THREE.CylinderGeometry(.5, .5, 1, 28).rotateZ(Math.PI / 2), // Roblox cylinders run along X
  /* WedgePart: vertical back face (+Z), flat bottom, slope from the top of the back down to the bottom front edge */
  Wedge: () => {
    const A = [-.5, -.5], B = [-.5, .5], C = [.5, .5]; // (y, z) profile
    const P = (x, p) => [x, p[0], p[1]];
    return solid([[P(-.5, A), P(-.5, B), P(-.5, C)], [P(.5, A), P(.5, B), P(.5, C)],
      ...quad(P(-.5, A), P(.5, A), P(.5, B), P(-.5, B)), ...quad(P(-.5, B), P(.5, B), P(.5, C), P(-.5, C)),
      ...quad(P(-.5, A), P(.5, A), P(.5, C), P(-.5, C))], [0, -.17, .17]);
  },
  /* CornerWedgePart: square base, apex above the (+X,+Z) corner */
  CornerWedge: () => {
    const b1 = [-.5, -.5, -.5], b2 = [.5, -.5, -.5], b3 = [.5, -.5, .5], b4 = [-.5, -.5, .5], ap = [.5, .5, .5];
    return solid([...quad(b1, b2, b3, b4), [b2, b3, ap], [b3, b4, ap], [b1, b2, ap], [b1, b4, ap]], [0, -.4, 0]);
  }
};

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

/* group parts by shape + material so thousands of parts become a handful of draw calls */
const groups = {}, meshParts = [];
const box = new THREE.Box3();
for (const p of S.parts) {
  let shape = p.s;
  if (shape === 'Mesh') { if (p.mesh && MESHES[p.mesh]) { meshParts.push(p); continue; } shape = 'Block'; }
  const g = groups[shape + '|' + p.m + '|' + (p.t || 0) + '|' + (p.f || 0)] ||= { shape, m: p.m, t: p.t || 0, f: p.f || 0, list: [] };
  g.list.push(p);
  box.expandByPoint(new V3(p.c[0], p.c[1], p.c[2]));
}
const mx = new THREE.Matrix4(), col = new THREE.Color();
const cfOf = c => new THREE.Matrix4().set(c[3], c[4], c[5], c[0], c[6], c[7], c[8], c[1], c[9], c[10], c[11], c[2], 0, 0, 0, 1); // row-major GetComponents order
let draws = 0;
for (const k in groups) {
  const g = groups[k];
  const im = new THREE.InstancedMesh((GEO[g.shape] || GEO.Block)(), matFor(g), g.list.length);
  g.list.forEach((p, i) => {
    im.setMatrixAt(i, cfOf(p.c).scale(new V3(p.z[0], p.z[1], p.z[2])));
    im.setColorAt(i, col.setRGB(p.k[0] / 255, p.k[1] / 255, p.k[2] / 255, THREE.SRGBColorSpace));
  });
  im.castShadow = g.t === 0; im.receiveShadow = true;
  scene.add(im); draws++;
}
if (meshParts.length) {
  const loader = new GLTFLoader(), cache = {};
  for (const p of meshParts) {
    cache[p.mesh] ||= loader.loadAsync(MESHES[p.mesh]);
    cache[p.mesh].then(gl => {
      const o = gl.scene.clone(true), bb = new THREE.Box3().setFromObject(o), sz = bb.getSize(new V3()), c = bb.getCenter(new V3());
      o.position.sub(c);
      const wrap = new THREE.Group(); wrap.add(o);
      wrap.scale.set(p.z[0] / (sz.x || 1), p.z[1] / (sz.y || 1), p.z[2] / (sz.z || 1)); // fit the glb to the MeshPart's Size
      const holder = new THREE.Group(); holder.add(wrap);
      holder.matrixAutoUpdate = false; holder.matrix.copy(cfOf(p.c));
      holder.traverse(n => { if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; } });
      scene.add(holder);
    }).catch(e => console.warn('mesh failed', p.mesh, e));
  }
}

/* lights: Roblox Lighting → a sun by ClockTime, ambient, fog */
const Lg = S.lighting || {};
const centre = box.isEmpty() ? new V3() : box.getCenter(new V3());
const R = Math.max(30, box.isEmpty() ? 60 : box.getSize(new V3()).length() / 2);
const a = ((Lg.clock ?? 14) - 6) / 12 * Math.PI, el = Math.sin(a);
const day = THREE.MathUtils.smoothstep(el, -.05, .25);
scene.background = new THREE.Color(0x0a0f26).lerp(new THREE.Color(0x87c4f2), day);
const amb = (Lg.outdoor || [127, 127, 127]).map(v => v / 255);
scene.add(new THREE.AmbientLight(new THREE.Color().setRGB(amb[0], amb[1], amb[2], THREE.SRGBColorSpace), .6 + .5 * (1 - day)));
if (day > .01) {
  const sun = new THREE.DirectionalLight(0xfff1d6, (Lg.brightness ?? 2) * day * 1.6);
  sun.position.set(centre.x + Math.cos(a) * R, centre.y + Math.max(el, .08) * R, centre.z + R * .35);
  sun.target.position.copy(centre);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -R, right: R, top: R, bottom: -R, near: .1, far: R * 4 });
  sun.shadow.bias = -.0004;
  scene.add(sun, sun.target);
}
if (Lg.fogEnd && Lg.fogEnd < 100000) { const f = (Lg.fogColor || [192, 192, 192]).map(v => v / 255); scene.fog = new THREE.Fog(new THREE.Color().setRGB(f[0], f[1], f[2], THREE.SRGBColorSpace), Lg.fogStart || 0, Lg.fogEnd); }
for (const l of S.lights || []) {
  const c = new THREE.Color().setRGB(l.k[0] / 255, l.k[1] / 255, l.k[2] / 255, THREE.SRGBColorSpace);
  const range = Math.max(l.range || 8, 1), I = l.b * range * 6; // tune this factor to taste
  let L;
  if (l.t === 'SpotLight') {
    L = new THREE.SpotLight(c, I, range, THREE.MathUtils.degToRad(l.angle || 90) / 2, .4, 1.2);
    L.target.position.set(l.p[0] + l.look[0], l.p[1] + l.look[1], l.p[2] + l.look[2]); scene.add(L.target);
  } else L = new THREE.PointLight(c, I, range, 1.2);
  L.position.set(l.p[0], l.p[1], l.p[2]); scene.add(L);
}

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, R * 20);
camera.position.set(centre.x + R * .9, centre.y + R * .6, centre.z + R * .9);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(centre); controls.enableDamping = true; controls.update();
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
const hud = document.getElementById('hud');
hud.textContent = S.parts.length + ' parts · ' + draws + ' draw calls' + (meshParts.length ? ' · ' + meshParts.length + ' meshes' : '');
window.__r2t = { parts: S.parts.length, draws, ready: true };
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
`;

function build(file, out) {
  const scene = JSON.parse(fs.readFileSync(file, 'utf8'));
  const meshes = opt('meshes') ? JSON.parse(fs.readFileSync(opt('meshes'), 'utf8')) : {};
  const base = (opt('three', 'https://cdn.jsdelivr.net/npm/three@0.170.0')).replace(/\/$/, '');
  const esc = o => JSON.stringify(o).replace(/</g, '\\u003c');
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${opt('title', 'Roblox scene')}</title>
<style>html,body{margin:0;height:100%;overflow:hidden;background:#0a0f26}#hud{position:fixed;left:10px;bottom:10px;color:#fff;font:12px system-ui;opacity:.7}</style>
<script type="importmap">{"imports":{"three":"${base}/build/three.module.js","three/addons/":"${base}/examples/jsm/"}}</script>
</head><body><div id="hud"></div>
<script type="application/json" id="scene">${esc(scene)}</script>
<script type="application/json" id="meshes">${esc(meshes)}</script>
<script type="module">${CLIENT}</script></body></html>`;
  fs.writeFileSync(out, html);
  console.log('wrote', out, '(' + scene.parts.length + ' parts, ' + Math.round(html.length / 1024) + ' KB)');
}

/* -------------------------------------------------------------------- sample */
function sample() {
  const rot = d => { const t = d * Math.PI / 180, c = +Math.cos(t).toFixed(4), s = +Math.sin(t).toFixed(4); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
  const P = (n, s, z, pos, k, m, d = 0, extra = {}) => ({ n, s, z, c: [...pos, ...rot(d)], k, m, ...extra });
  const parts = [
    P('Floor', 'Block', [120, 1, 120], [0, -.5, 0], [96, 150, 66], 'Grass'),
    P('Path', 'Block', [8, .2, 80], [0, .1, 0], [190, 175, 140], 'Cobblestone'),
    P('Ramp', 'Wedge', [8, 6, 14], [-14, 3, -4], [160, 110, 70], 'Wood'),
    P('Corner', 'CornerWedge', [8, 6, 8], [-26, 3, -4], [160, 110, 70], 'Wood'),
    P('Pillar1', 'Cylinder', [14, 4, 4], [10, 7, -10], [200, 200, 205], 'Marble', 90),
    P('Pillar2', 'Cylinder', [14, 4, 4], [20, 7, -10], [200, 200, 205], 'Marble', 90),
    P('Ball', 'Ball', [8, 8, 8], [14, 4, 8], [220, 70, 70], 'SmoothPlastic'),
    P('Neon', 'Block', [4, 4, 4], [-8, 2, 14], [60, 220, 255], 'Neon', 30),
    P('Window', 'Block', [10, 8, .4], [26, 5, 6], [170, 220, 255], 'Glass', 20, { t: .6 }),
    P('Metal', 'Block', [6, 3, 6], [0, 1.5, -20], [180, 185, 195], 'Metal', 45)
  ];
  const lights = [{ t: 'PointLight', p: [-8, 6, 14], k: [60, 220, 255], b: 2, range: 24 },
    { t: 'SpotLight', p: [0, 18, 0], k: [255, 230, 180], b: 3, range: 40, angle: 70, look: [0, -1, 0] }];
  const lighting = { ambient: [90, 90, 90], outdoor: [127, 127, 127], brightness: 2, clock: 15.5, fogEnd: 100000 };
  fs.writeFileSync('scene.json', JSON.stringify({ parts, lights, lighting }));
  console.log('wrote scene.json (' + parts.length + ' parts)');
}

if (cmd === 'luau') process.stdout.write(LUAU);
else if (cmd === 'serve') serve(+(args[0] || 8787));
else if (cmd === 'build') build(args[0] || 'scene.json', args[1] && !args[1].startsWith('--') ? args[1] : 'scene.html');
else if (cmd === 'sample') sample();
else console.log(fs.readFileSync(new URL(import.meta.url), 'utf8').split('*/')[0] + '*/');
