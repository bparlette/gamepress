"""Style 4: real 3D. three.js scene (perspective camera off-axis, real depth: floor, wall, extruded lockers, side walls), articulated low-poly figures built from the same
skeleton (capsule limbs, box torso, sphere head: NOT billboards), shadow-casting key light + a point light that fires with the muzzle. Figures are fitted per-figure so
screen height (150 px), floor line (y=300) and feet positions (x) match the other styles; only the camera angle and depth cues differ."""
import json, math, os
import common as C, parts as PT
HERE = os.path.dirname(os.path.abspath(__file__)); THREE = os.path.join(HERE, '..', '..', 'vendor', 'three.cjs')
def hexc(c): return '#%02x%02x%02x' % tuple(c[:3])
def scene_data(moment):
    figs = []
    for kind, var, x, pose, face in C.MOMENTS[moment]:
        J = C.skeleton(kind, pose); R = PT.ramp_of(kind, var)
        figs.append(dict(kind=kind, var=var, x=x, pose=pose, face=face, J={k: v for k, v in J.items() if k != 'lying'}, lying=J['lying'], col={m: [hexc(r[1]), hexc(r[2]), hexc(r[3])] for m, r in R.items()}))
    return dict(figs=figs, C=dict(FW=C.FW, FH=C.FH, FLOOR_Y=C.FLOOR_Y, FEET_Y=C.FEET_Y, FIG_H=C.FIG_H, LOCK_X=C.LOCK_X, LOCK_W=C.LOCK_W, LOCK_Y0=C.LOCK_Y0, LOCK_Y1=C.LOCK_Y1, RAIL_Y=C.RAIL_Y), fx=C.FX.get(moment, {}), moment=moment)
JS = r'''
window.build = function (D) {
  const T = THREE, K = D.C, W = K.FW, H = K.FH;
  const ren = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); ren.setSize(W, H); ren.setPixelRatio(1); ren.shadowMap.enabled = true; ren.shadowMap.type = T.PCFSoftShadowMap;
  ren.toneMapping = T.ACESFilmicToneMapping; ren.toneMappingExposure = 1.15; ren.outputColorSpace = T.SRGBColorSpace; document.body.appendChild(ren.domElement);
  const sc = new T.Scene(); sc.background = new T.Color(0x0a0c12); sc.fog = new T.Fog(0x0a0c12, 900, 2200);
  const fov = 26, dist = (H / 2) / Math.tan(fov * Math.PI / 360); const cam = new T.PerspectiveCamera(fov, W / H, 10, 4000);
  cam.position.set(W / 2 + 230, 285, dist); const tgt = new T.Vector3(W / 2 - 20, 80, 0);
  const scr = v => { const p = v.clone().project(cam); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; };
  for (let i = 0; i < 60; i++) { cam.lookAt(tgt); cam.updateMatrixWorld(); cam.updateProjectionMatrix(); const g = scr(new T.Vector3(W / 2, 0, 0)); if (Math.abs(g.y - K.FEET_Y) < 0.2) break; tgt.y += (K.FEET_Y - g.y) * 0.8; }
  window.dbg = { tgt: tgt.toArray(), g: scr(new T.Vector3(W / 2, 0, 0)) };
  const groundAt = (sx, sy, y) => { const r = new T.Raycaster(); r.setFromCamera(new T.Vector2(sx / W * 2 - 1, 1 - sy / H * 2), cam); const t = (y - r.ray.origin.y) / r.ray.direction.y; return r.ray.at(t, new T.Vector3()); };
  const planeAt = (sx, sy, z) => { const r = new T.Raycaster(); r.setFromCamera(new T.Vector2(sx / W * 2 - 1, 1 - sy / H * 2), cam); const t = (z - r.ray.origin.z) / r.ray.direction.z; return r.ray.at(t, new T.Vector3()); };
  const std = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: .75, metalness: .05 }, o || {}));
  // ---- stage
  const wallZ = groundAt(W / 2, K.FLOOR_Y, 0).z; const wp = (sx, sy) => planeAt(sx, sy, wallZ);
  const fl = new T.Mesh(new T.PlaneGeometry(4000, 3000), std(0x2a2e3c, { roughness: .6, metalness: .05 })); fl.rotation.x = -Math.PI / 2; fl.position.set(W / 2, 0, wallZ + 1500); fl.receiveShadow = true; sc.add(fl);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 512; const cx = cv.getContext('2d'); cx.fillStyle = '#181b24'; cx.fillRect(0, 0, 512, 512); cx.strokeStyle = '#2a2e3c'; cx.lineWidth = 3; for (let i = 0; i <= 512; i += 128) { cx.beginPath(); cx.moveTo(i, 0); cx.lineTo(i, 512); cx.moveTo(0, i); cx.lineTo(512, i); cx.stroke(); }
  const tex = new T.CanvasTexture(cv); tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.repeat.set(16, 12); tex.colorSpace = T.SRGBColorSpace; fl.material.map = tex;
  const wl = wp(0, 0), wr = wp(W, K.FLOOR_Y); const wallL = wp(-200, 0).x, wallR = wp(W + 200, 0).x, wallTop = wp(0, -300).y, wallBot = 0;
  const wall = new T.Mesh(new T.BoxGeometry(wallR - wallL, wallTop, 20), std(0x3a4258, { roughness: .9 })); wall.position.set((wallL + wallR) / 2, wallTop / 2, wallZ - 10); wall.receiveShadow = true; sc.add(wall);
  const strip = new T.Mesh(new T.BoxGeometry(wallR - wallL, 6, 8), std(0x5a6278, { roughness: .5, metalness: .3 })); strip.position.set((wallL + wallR) / 2, 3, wallZ + 3); sc.add(strip);
  for (const lx of K.LOCK_X) {
    const a = wp(lx, K.LOCK_Y0), b = wp(lx + K.LOCK_W, K.LOCK_Y1); const w = b.x - a.x, h = a.y - b.y;
    const box = new T.Mesh(new T.BoxGeometry(w, h, 22), std(0x5e6c90, { roughness: .5, metalness: .25 })); box.position.set(a.x + w / 2, b.y + h / 2, wallZ + 11); box.castShadow = box.receiveShadow = true; sc.add(box);
    const wa = wp(lx + 38, K.LOCK_Y0 + 20), wb = wp(lx + 86, K.LOCK_Y0 + 42); const ww = wb.x - wa.x, wh = wa.y - wb.y;
    const win = new T.Mesh(new T.BoxGeometry(ww, wh, 4), std(0x16263f, { emissive: 0x20406a, emissiveIntensity: .8, roughness: .1, metalness: .6 })); win.position.set(wa.x + ww / 2, wb.y + wh / 2, wallZ + 22.5); sc.add(win);
    const fr = new T.Mesh(new T.BoxGeometry(ww + 6, wh + 6, 3), std(0x9aa8c8, { roughness: .3, metalness: .7 })); fr.position.set(win.position.x, win.position.y, wallZ + 22); sc.add(fr);
    for (let k = 0; k < 7; k++) { const s = wp(lx + 14, K.LOCK_Y1 - 72 + k * 8), s2 = wp(lx + K.LOCK_W - 14, K.LOCK_Y1 - 72 + k * 8); const sl = new T.Mesh(new T.BoxGeometry(s2.x - s.x, 2, 3), std(0x080c16)); sl.position.set((s.x + s2.x) / 2, s.y, wallZ + 23.4); sc.add(sl); }
    const hd = wp(lx + K.LOCK_W - 22, K.LOCK_Y0 + 113); const hn = new T.Mesh(new T.CylinderGeometry(2.5, 2.5, 14, 10), std(0xc8ced8, { roughness: .2, metalness: .9 })); hn.position.set(hd.x, hd.y, wallZ + 25); sc.add(hn);
  }
  const r0 = wp(wallL + 50, K.RAIL_Y), r1 = wp(wallR - 50, K.RAIL_Y); const rail = new T.Mesh(new T.CylinderGeometry(3, 3, r1.x - r0.x, 12), std(0xaab2c8, { roughness: .25, metalness: .9 })); rail.rotation.z = Math.PI / 2; rail.position.set((r0.x + r1.x) / 2, r0.y, wallZ + 30); rail.castShadow = true; sc.add(rail);
  for (const sx of [wallL + 20, wallR - 20]) { const post = new T.Mesh(new T.CylinderGeometry(3, 3, 3, 8), std(0x6a7288)); post.position.set(sx, r0.y, wallZ + 25); post.rotation.x = Math.PI / 2; sc.add(post); }
  // ---- lights
  sc.add(new T.HemisphereLight(0x8aa0d0, 0x1c2030, 2.6)); const key = new T.DirectionalLight(0xb4c8f0, 3.2); key.position.set(W / 2 - 200, 520, 420); key.target.position.set(W / 2, 0, 0); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -700, right: 700, top: 500, bottom: -300, near: 10, far: 1800 }); key.shadow.bias = -.0006; key.shadow.radius = 4; sc.add(key, key.target);
  const fill = new T.PointLight(0x9ab0e0, 150000, 1600, 2); fill.position.set(W / 2, 330, wallZ + 330); sc.add(fill);
  // ---- figures
  const mats = (f, m, i) => std(f.col[m][i === undefined ? 0 : i]);
  const seg = (a, b, r1, r2, mat) => { const d = new T.Vector3().subVectors(b, a), L = d.length(); const g = new T.CylinderGeometry(r2, r1, L, 14); const m = new T.Mesh(g, mat); m.position.copy(a).add(b).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()); m.castShadow = true;
    const grp = new T.Group(); grp.add(m); for (const [p, r] of [[a, r1], [b, r2]]) { const s = new T.Mesh(new T.SphereGeometry(r, 14, 10), mat); s.position.copy(p); s.castShadow = true; grp.add(s); } return grp; };
  const V = (p, z) => new T.Vector3(p[0], p[1], z || 0);
  const lights = []; let muzzleW = null, hitW = null;
  for (const f of D.figs) {
    const g = new T.Group(), J = f.J, sol = f.kind === 'soldier'; const add = o => { g.add(o); return o; };
    const zA = 9, zB = -9;   // near-side limbs in front, far-side behind
    if (sol) {
      const cl = f.col.cloth, mc = mats(f, 'cloth', 1), mcl = mats(f, 'cloth', 0), mv = mats(f, 'vest', 1);
      add(seg(V(J.sh, zB), V(J.elbB, zB), 6, 5, mc)); add(seg(V(J.elbB, zB), V(J.handB, zB), 5, 4, mc));
      add(seg(V(J.hip, zB * .6), V(J.kneeB, zB * .6), 7.5, 6.5, mcl)); add(seg(V(J.kneeB, zB * .6), V(J.footB, zB * .6), 6.5, 5.5, mcl));
      const boot = (p, z) => { const b = new T.Mesh(new T.BoxGeometry(18, 8, 11), mats(f, 'boot', 0)); b.position.set(p[0] + 5, p[1] + 1, z); b.castShadow = true; g.add(b); }; boot(J.footB, zB * .6); boot(J.footA, zA * .6);
      add(seg(V(J.hip, zA * .6), V(J.kneeA, zA * .6), 7.5, 6.5, mcl)); add(seg(V(J.kneeA, zA * .6), V(J.footA, zA * .6), 6.5, 5.5, mcl));
      const tl = new T.Vector3().subVectors(V(J.sh), V(J.hip)), tm = new T.Mesh(new T.BoxGeometry(24, tl.length() + 10, 17), mats(f, 'cloth', 1)); tm.position.copy(V(J.hip)).add(V(J.sh)).multiplyScalar(.5); tm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tl.clone().normalize()); tm.castShadow = true; add(tm);
      const vest = new T.Mesh(new T.BoxGeometry(25, tl.length() * .8, 19), mv); vest.position.copy(tm.position); vest.quaternion.copy(tm.quaternion); vest.castShadow = true; add(vest);
      const pack = new T.Mesh(new T.BoxGeometry(14, tl.length() * .9, 20), mats(f, 'pack', 1)); pack.position.copy(tm.position).add(new T.Vector3(-14, 0, 0).applyQuaternion(tm.quaternion)); pack.quaternion.copy(tm.quaternion); pack.castShadow = true; add(pack);
      const nk = seg(V(J.sh), V(J.head), 4.5, 5, mats(f, 'skin', 1)); add(nk);
      const hd = new T.Mesh(new T.SphereGeometry(12, 22, 16), mats(f, 'skin', 1)); hd.position.copy(V(J.head)); hd.castShadow = true; add(hd);
      const hm = new T.Mesh(new T.SphereGeometry(13.6, 22, 12, 0, Math.PI * 2, 0, Math.PI * .56), mats(f, 'helm', 1)); hm.position.copy(V(J.head)).add(new T.Vector3(0, 2, 0)); hm.castShadow = true; add(hm);
      const br = new T.Mesh(new T.CylinderGeometry(14, 14, 2, 20), mats(f, 'helm', 0)); br.position.copy(V(J.head)).add(new T.Vector3(2, 1, 0)); add(br);
      for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(1.6, 8, 6), std(0x10100c)); e.position.copy(V(J.head)).add(new T.Vector3(10, 1, s * 4)); add(e); }
      const rl = new T.Vector3().subVectors(V(J.muzzle), V(J.stock)); const rf = new T.Mesh(new T.BoxGeometry(rl.length(), 5, 5), mats(f, 'gun', 0)); rf.position.copy(V(J.stock)).add(V(J.muzzle)).multiplyScalar(.5).add(new T.Vector3(0, 0, 2)); rf.rotation.z = Math.atan2(rl.y, rl.x); rf.castShadow = true; add(rf);
      add(seg(V(J.sh, zA), V(J.elbA, zA), 6.5, 5.5, mats(f, 'cloth', 2))); add(seg(V(J.elbA, zA), V(J.handA, zA), 5.5, 4.5, mats(f, 'cloth', 2)));
      for (const [p, z] of [[J.handA, zA], [J.handB, 0]]) { const h = new T.Mesh(new T.SphereGeometry(4.6, 10, 8), mats(f, 'skin', 1)); h.position.copy(V(p, z)); add(h); }
      if (D.fx.muzzle && f.pose === 'aim') muzzleW = { f, p: V(J.muzzle) };
    } else {
      const sk = mats(f, 'skin', 1), skd = mats(f, 'skin', 0), mp = mats(f, 'pants', 1), ms = mats(f, 'shirt', 1);
      add(seg(V(J.sh, zB), V(J.elbB, zB), 5, 4, skd)); add(seg(V(J.elbB, zB), V(J.handB, zB), 4, 3.6, skd));
      add(seg(V(J.hip, zB * .6), V(J.kneeB, zB * .6), 7.5, 6.5, mats(f, 'pants', 0))); add(seg(V(J.kneeB, zB * .6), V(J.footB, zB * .6), 6.5, 4.4, sk));
      const bf = new T.Mesh(new T.BoxGeometry(14, 5, 8), sk); bf.position.set(J.footB[0] + 4, J.footB[1], zB * .6); add(bf);
      add(seg(V(J.hip, zA * .6), V(J.kneeA, zA * .6), 7.5, 7, mp)); add(seg(V(J.kneeA, zA * .6), V(J.footA, zA * .6), 7, 5.4, mp));
      const sh = new T.Mesh(new T.BoxGeometry(13, 7, 11), std(0x14161c)); sh.position.set(J.footA[0] + 4, J.footA[1] + 1, zA * .6); add(sh);
      const tl = new T.Vector3().subVectors(V(J.sh), V(J.hip)), tm = new T.Mesh(new T.BoxGeometry(22, tl.length() + 8, 15), ms); tm.position.copy(V(J.hip)).add(V(J.sh)).multiplyScalar(.5); tm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), tl.clone().normalize()); tm.castShadow = true; add(tm);
      for (let k = 0; k < 3; k++) { const t = new T.Mesh(new T.BoxGeometry(5, 12 + k * 3, 3), ms); t.position.copy(V(J.hip)).add(new T.Vector3(-8 + k * 8, -4 - k * 2, 6)); t.rotation.z = (k - 1) * .2; add(t); }
      add(seg(V(J.sh), V(J.head), 4.5, 5.5, sk));
      const hd = new T.Mesh(new T.SphereGeometry(13, 22, 16), sk); hd.position.copy(V(J.head)); hd.scale.set(1, 1.05, .95); hd.castShadow = true; add(hd);
      const hr = new T.Mesh(new T.SphereGeometry(14.2, 18, 10, 0, Math.PI * 2, 0, Math.PI * .55), mats(f, 'hair', 1)); hr.position.copy(V(J.head)).add(new T.Vector3(-3, 3, 0)); add(hr);
      for (let k = 0; k < 7; k++) { const c = new T.Mesh(new T.ConeGeometry(3, 11, 6), mats(f, 'hair', 1)); c.position.copy(V(J.head)).add(new T.Vector3(-12 + k * 3, 12 + (k % 2) * 3, (k - 3) * 2)); c.rotation.z = (k - 3) * .18 + .2; add(c); }
      const jaw = new T.Mesh(new T.BoxGeometry(8, 6, 9), std(0x2a0610, { emissive: 0x200408 })); jaw.position.copy(V(J.head)).add(new T.Vector3(8, -7, 0)); add(jaw);
      for (let k = 0; k < 3; k++) { const t = new T.Mesh(new T.BoxGeometry(1.4, 2.4, 1.4), std(0xe8e4c8)); t.position.copy(V(J.head)).add(new T.Vector3(10, -4, -3 + k * 3)); add(t); }
      const socket = new T.Mesh(new T.SphereGeometry(3.2, 10, 8), std(0x04050a)); socket.position.copy(V(J.head)).add(new T.Vector3(8, 2, -5)); add(socket);
      const eye = new T.Mesh(new T.SphereGeometry(2.6, 10, 8), new T.MeshBasicMaterial({ color: f.col.eye ? 0xffffff : 0xffd860 })); eye.position.copy(V(J.head)).add(new T.Vector3(10, 2, 5)); add(eye);
      const ec = { green: 0xe8ff70, grey: 0xff7858, yellow: 0x78f0ff }[f.var]; eye.material.color.setHex(ec); const el = new T.PointLight(ec, 14, 70, 2); el.position.copy(eye.position); add(el);
      add(seg(V(J.sh, zA), V(J.elbA, zA), 5.5, 4.6, skd)); add(seg(V(J.elbA, zA), V(J.handA, zA), 4.6, 3.8, sk));
      const h = new T.Mesh(new T.SphereGeometry(4.6, 10, 8), sk); h.position.copy(V(J.handA, zA)); add(h);
      for (let k = -1; k <= 1; k++) { const c = new T.Mesh(new T.ConeGeometry(1.2, 8, 5), mats(f, 'teeth', 1)); c.position.copy(V(J.handA, zA + k * 3)).add(new T.Vector3(7, -1, 0)); c.rotation.z = -Math.PI / 2; add(c); }
      if (f.pose === 'hit') hitW = { p: V(J.sh).add(new T.Vector3(8, 8, 12)) };
    }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    // fit: feet on the ground at the target x, height = FIG_H px on screen, depth stagger by row
    const fx = f.face, depth = { 'walk': 0, 'hit': -4, 'attack': 8, 'aim': 10, 'down': 6 }[f.pose] + (f.kind === 'zombie' ? -22 * (D.figs.filter(q => q.kind === 'zombie').indexOf(f)) : 0);
    g.scale.set(fx, 1, 1); sc.add(g); let s = 1;
    for (let it = 0; it < 12; it++) {
      g.scale.set(fx * s, s, s); const p = groundAt(f.x, K.FEET_Y, 0); g.position.set(p.x, 0, p.z + depth); g.updateMatrixWorld(true);
      const a = scr(new T.Vector3(g.position.x, 0, g.position.z)), b = scr(new T.Vector3(g.position.x, K.FIG_H * s, g.position.z)); const hpx = a.y - b.y; s *= K.FIG_H / hpx;
      g.position.x += (f.x - a.x) * (s / (hpx / K.FIG_H)) * 0 + (f.x - a.x) * .9 * (s / 1) * 0; const dx = f.x - a.x; const k = Math.abs(cam.position.z - g.position.z) / (dist); g.position.x += dx * k * .9;
    }
    if (muzzleW && muzzleW.f === f) muzzleW.g = g; if (hitW && f.pose === 'hit') hitW.g = g;
  }
  const flare = (pos, col, size, op) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(.25, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
    const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), blending: T.AdditiveBlending, transparent: true, opacity: op, depthWrite: false })); sp.scale.set(size, size, 1); sp.position.copy(pos); sc.add(sp); return sp; };
  if (muzzleW) { const g = muzzleW.g; const wp2 = muzzleW.p.clone().applyMatrix4(g.matrixWorld); const pl = new T.PointLight(0xffa850, 700000, 1400, 2); pl.position.copy(wp2).add(new T.Vector3(20, 6, -40)); pl.castShadow = true; pl.shadow.mapSize.set(1024, 1024); sc.add(pl); flare(wp2, 'rgba(255,170,60,.7)', 70, 1); flare(wp2, 'rgba(255,220,120,.9)', 26, 1);
    if (hitW) { const hp = hitW.p.clone().applyMatrix4(hitW.g.matrixWorld); const L = new T.Mesh(new T.CylinderGeometry(.7, .7, wp2.distanceTo(hp), 6), new T.MeshBasicMaterial({ color: 0xfff0b8 })); L.position.copy(wp2).add(hp).multiplyScalar(.5); L.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), hp.clone().sub(wp2).normalize()); sc.add(L); } }
  if (hitW) { const hp = hitW.p.clone().applyMatrix4(hitW.g.matrixWorld); flare(hp, 'rgba(255,220,100,.8)', 64, 1); flare(hp, 'rgba(255,255,230,1)', 22, 1); const pl = new T.PointLight(0xffd070, 30000, 400, 2); pl.position.copy(hp).add(new T.Vector3(0, 0, 20)); sc.add(pl);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283; const sp = new T.Mesh(new T.CylinderGeometry(.5, 1.4, 22, 5), new T.MeshBasicMaterial({ color: 0xffe890 })); sp.position.copy(hp).add(new T.Vector3(Math.cos(a) * 14, Math.sin(a) * 14, 6)); sp.rotation.z = a - Math.PI / 2; sc.add(sp); } }
  cam.lookAt(tgt); cam.updateMatrixWorld(); ren.render(sc, cam); return ren.domElement.toDataURL('image/png');
};
'''
def main():
    from playwright.sync_api import sync_playwright
    import base64
    three = open(THREE).read()
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']); pg = b.new_page(viewport={'width': C.FW, 'height': C.FH})
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.set_content('<body style="margin:0"></body>'); pg.evaluate('(()=>{var exports={},module={exports};' + three + ';window.THREE=exports})()'); pg.evaluate('(()=>{' + JS + '})()')
        for m in C.MOMENTS:
            u = pg.evaluate('D=>{document.querySelectorAll("canvas").forEach(c=>c.remove());return window.build(D)}', scene_data(m)); open(f'out/3d_{m}.png', 'wb').write(base64.b64decode(u.split(',')[1]))
        print('dbg', pg.evaluate('window.dbg')); b.close(); print('errors:', errs[:3])
if __name__ == '__main__': main()
