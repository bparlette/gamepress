// cars.js — procedural look-dev models for ROADSTER // KICKFLIP
// Tesla Roadster (white, black rocker, full-width tail bar) · Tesla Semi + trailer · Starship + Mechazilla
// All geometry is generated at runtime (no assets). Bodies are smooth superellipse lofts so paint reads as real clearcoat.
import { THREE } from '../../kit/gp3d.js';

/* ------------------------------------------------------------------ helpers */
export const V = (x, y, z) => new THREE.Vector3(x, y, z);
const ss = v => Math.sign(v) * Math.pow(Math.abs(v), 1);

/** smooth superellipse loft along +Z. sections: [z, halfWidth, beltY, topH, botH, exp] */
export function loft(sections, segs = 34, cap = true) {
  const pos = [], idx = [];
  const ring = segs;
  for (const [z, w, yc, ht, hb, e = 3.1] of sections) {
    for (let j = 0; j < ring; j++) {
      const a = (j / ring) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const x = w * Math.sign(c) * Math.pow(Math.abs(c), 2 / e);
      const sy = Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
      const y = yc + (sy > 0 ? ht * sy : hb * sy);
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < sections.length - 1; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * ring + j, b = i * ring + (j + 1) % ring, c = (i + 1) * ring + j, d = (i + 1) * ring + (j + 1) % ring;
      idx.push(a, c, b, b, c, d);
    }
  }
  if (cap) {
    const first = sections[0], last = sections[sections.length - 1];
    const i0 = pos.length / 3;
    pos.push(0, first[2] - (first[4] - first[3]) * 0.42, first[0]);
    for (let j = 0; j < ring; j++) idx.push(i0, j, (j + 1) % ring);
    const i1 = pos.length / 3;
    pos.push(0, last[2] - (last[4] - last[3]) * 0.42, last[0]);
    const base = (sections.length - 1) * ring;
    for (let j = 0; j < ring; j++) idx.push(i1, base + (j + 1) % ring, base + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** photo-ish studio / dusk environment for clearcoat paint and stainless */
export function makeEnvMap(renderer, { dusk = true } = {}) {
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 40, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { dusk: { value: dusk ? 1 : 0 } },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vD; uniform float dusk;
      void main(){ vec3 d = normalize(vD);
        vec3 up = mix(vec3(0.30,0.44,0.68), vec3(0.07,0.16,0.36), dusk);
        vec3 mid = mix(vec3(0.82,0.84,0.88), vec3(0.95,0.62,0.40), dusk);
        vec3 low = mix(vec3(0.55,0.53,0.50), vec3(0.32,0.24,0.20), dusk);
        float h = d.y*0.5+0.5;
        vec3 c = mix(low, mid, smoothstep(0.44,0.505,h));
        c = mix(c, up, smoothstep(0.50,0.92,h));
        float sun = pow(max(dot(d, normalize(vec3(-0.62,0.16,0.72))),0.0), 120.0);
        c += vec3(2.4,1.7,1.0)*sun;
        c += vec3(1.0,0.66,0.40)*pow(max(1.0-abs(d.y),0.0), 9.0)*0.30;
        gl_FragColor = vec4(c, 1.0); }`,
  }));
  s.add(sky);
  const light = new THREE.Mesh(new THREE.SphereGeometry(9, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(9, 7.4, 5.6) }));
  light.position.set(-120, 40, 140); s.add(light);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.05, 1, 400).texture;
  pm.dispose(); sky.geometry.dispose(); sky.material.dispose();
  return tex;
}

function canvasTex(w, h, draw, { repeat = [1, 1], srgb = true, aniso = 4 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

/** TESLA wordmark decal (or any text), transparent plane */
export function wordmark(text, { w = 0.9, h = 0.16, color = '#e8eaee', weight = 600, letter = 0.34, size = 128 } = {}) {
  const tex = canvasTex(512, Math.round(512 * (h / w)), (g, cw, ch) => {
    g.clearRect(0, 0, cw, ch);
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `${weight} ${size}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
    if (g.letterSpacing !== undefined) { try { g.letterSpacing = `${Math.round(size * letter)}px`; } catch {} }
    g.fillText(text, cw / 2 + size * letter * 0.5, ch / 2);
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false }));
  m.renderOrder = 3;
  return m;
}

function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    r.addColorStop(0, inner); r.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.45)')); r.addColorStop(1, outer);
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] });
}

let _shadowTex = null;
function shadowTex() {
  if (_shadowTex) return _shadowTex;
  _shadowTex = canvasTex(128, 128, (g, w, h) => {
    const r = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    r.addColorStop(0, 'rgba(0,0,0,0.62)'); r.addColorStop(0.55, 'rgba(0,0,0,0.28)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] });
  return _shadowTex;
}

export function blobShadow(w, l, opacity = 0.85) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), new THREE.MeshBasicMaterial({ map: shadowTex(), transparent: true, opacity, depthWrite: false, color: 0x000000 }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.035; m.renderOrder = 2;
  return m;
}

/* ------------------------------------------------------------------ materials */
export function carMaterials() {
  return {
    paint: new THREE.MeshPhysicalMaterial({ color: 0xf3f4f6, metalness: 0.28, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.045, envMapIntensity: 1.25 }),
    paintWarm: new THREE.MeshPhysicalMaterial({ color: 0xdedbd4, metalness: 0.32, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, metalness: 0.55, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x0c0d0f, metalness: 0.45, roughness: 0.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x0a0a0b, metalness: 0.0, roughness: 0.92 }),
    rim: new THREE.MeshPhysicalMaterial({ color: 0xe9eaec, metalness: 0.55, roughness: 0.22, clearcoat: 0.7, envMapIntensity: 1.1 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1.0, roughness: 0.14, envMapIntensity: 1.3 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff1a1a, emissive: 0xff0a0a, emissiveIntensity: 2.6, toneMapped: false }),
    white: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 2.4, toneMapped: false }),
    steel: new THREE.MeshStandardMaterial({ color: 0xb8bec6, metalness: 1.0, roughness: 0.28, envMapIntensity: 1.2 }),
    tiles: new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0.35, roughness: 0.62 }),
    concrete: new THREE.MeshStandardMaterial({ color: 0x9d968a, roughness: 0.95 }),
  };
}

/* ------------------------------------------------------------------ wheels */
function wheelAssembly(M, R = 0.43, W = 0.30, spokes = 7) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 28, 1), M.rubber);
  tire.geometry.rotateZ(Math.PI / 2); g.add(tire);
  // sidewall shoulders
  for (const s of [-1, 1]) {
    const sh = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, W * 0.16, 6, 24), M.rubber);
    sh.rotation.y = Math.PI / 2; sh.position.x = s * W * 0.5; g.add(sh);
  }
  const face = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.70, R * 0.70, W * 1.02, 24, 1), M.rim);
  face.geometry.rotateZ(Math.PI / 2); g.add(face);
  // aero disc + dark spokes (reference wheels: white rim, dark spokes)
  for (const s of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 0.66, 28), M.rim);
    disc.rotation.y = s * Math.PI / 2; disc.position.x = s * W * 0.515; g.add(disc);
    for (let i = 0; i < spokes; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.012, R * 0.62, W * 0.14), M.trim);
      sp.position.x = s * W * 0.52;
      sp.rotation.x = (i / spokes) * Math.PI * 2;
      sp.position.y = Math.cos(sp.rotation.x) * 0; sp.position.z = 0;
      const holder = new THREE.Group();
      holder.add(sp); sp.position.set(s * W * 0.52, R * 0.30, 0);
      holder.rotation.x = (i / spokes) * Math.PI * 2; g.add(holder);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.12, R * 0.12, W * 1.1, 12), M.trim);
    cap.geometry.rotateZ(Math.PI / 2); g.add(cap);
  }
  return g;
}

/* ------------------------------------------------------------------ ROADSTER */
export function buildRoadster(renderer) {
  const M = carMaterials();
  const car = new THREE.Group();
  const body = new THREE.Group(); car.add(body);

  const shell = new THREE.Mesh(loft([
    [-2.30, 0.86, 0.64, 0.15, 0.28, 3.4],
    [-2.20, 0.95, 0.65, 0.18, 0.30, 3.3],
    [-1.80, 1.00, 0.66, 0.20, 0.32, 3.1],
    [-1.20, 1.00, 0.65, 0.21, 0.31, 3.0],
    [-0.50, 0.97, 0.63, 0.19, 0.30, 3.0],
    [0.30, 0.94, 0.60, 0.17, 0.28, 3.0],
    [1.10, 0.90, 0.55, 0.14, 0.25, 3.1],
    [1.75, 0.82, 0.49, 0.11, 0.20, 3.2],
    [2.15, 0.66, 0.44, 0.08, 0.14, 3.3],
    [2.32, 0.34, 0.41, 0.05, 0.08, 3.4],
  ], 40), M.paint);
  shell.castShadow = true; body.add(shell);

  // glass canopy
  const glass = new THREE.Mesh(loft([
    [0.72, 0.50, 0.70, 0.02, 0.05, 2.6],
    [0.30, 0.78, 0.76, 0.16, 0.05, 2.4],
    [-0.25, 0.84, 0.80, 0.25, 0.05, 2.4],
    [-0.85, 0.82, 0.79, 0.21, 0.05, 2.4],
    [-1.30, 0.70, 0.75, 0.08, 0.04, 2.6],
    [-1.46, 0.52, 0.72, 0.02, 0.03, 2.8],
  ], 30), M.glass);
  body.add(glass);

  // black rocker panels + splitter + diffuser + arch surrounds
  const rockerGeo = new THREE.BoxGeometry(0.07, 0.16, 3.1);
  for (const s of [-1, 1]) {
    const r = new THREE.Mesh(rockerGeo, M.trim);
    r.position.set(s * 0.955, 0.40, -0.1); body.add(r);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.50, 0.035, 6, 18, Math.PI), M.trim);
    arch.rotation.y = Math.PI / 2; arch.position.set(s * 0.972, 0.43, 1.42); body.add(arch);
    const arch2 = arch.clone(); arch2.position.z = -1.46; body.add(arch2);
    const well = new THREE.Mesh(new THREE.CircleGeometry(0.50, 22), M.trim);
    well.rotation.y = s * Math.PI / 2; well.position.set(s * 0.93, 0.43, 1.42); body.add(well);
    const well2 = well.clone(); well2.position.z = -1.46; body.add(well2);
    // side mirror camera stalks
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.05), M.trim);
    stalk.position.set(s * 0.99, 0.80, 0.55); body.add(stalk);
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.13), M.glass);
    pod.position.set(s * 1.07, 0.80, 0.55); body.add(pod);
  }
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.05, 0.36), M.trim);
  splitter.position.set(0, 0.31, 2.12); body.add(splitter);

  // rear diffuser with fins
  const diff = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.24, 0.40), M.trim);
  diff.position.set(0, 0.31, -2.20); body.add(diff);
  for (let i = -2; i <= 2; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.42), M.trim);
    fin.position.set(i * 0.30, 0.30, -2.21); body.add(fin);
  }
  for (let i = -1; i <= 1; i++) { // concept's round exhaust ports
    const port = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 12), M.chrome);
    port.rotation.x = Math.PI / 2; port.position.set(i * 0.26, 0.36, -2.33); body.add(port);
  }

  // tail light bar (full width, the Roadster's signature)
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.60, 0.075, 0.07), M.red);
  bar.position.set(0, 0.77, -2.315); body.add(bar);
  const barGlow = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.5), new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,30,24,0.95)', 'rgba(255,0,0,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.55 }));
  barGlow.position.set(0, 0.77, -2.36); barGlow.rotation.y = Math.PI; body.add(barGlow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.03, 0.30), M.trim);
  deck.position.set(0, 0.845, -2.12); body.add(deck);

  // front light signature
  const hl = new THREE.Mesh(new THREE.BoxGeometry(1.30, 0.05, 0.05), M.white);
  hl.position.set(0, 0.58, 2.27); body.add(hl);
  for (const s of [-1, 1]) {
    const grow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.28), new THREE.MeshBasicMaterial({ map: glowTex('rgba(255,250,235,0.9)', 'rgba(255,240,200,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.45 }));
    grow.position.set(s * 0.6, 0.58, 2.30); body.add(grow);
  }

  // wordmarks
  const rear = wordmark('T E S L A', { w: 0.62, h: 0.10, color: '#dfe3e8', size: 96, letter: 0.1 });
  rear.position.set(0, 0.63, -2.352); rear.rotation.y = Math.PI; body.add(rear);

  // wheels
  const wheels = [];
  for (const [x, z, front] of [[0.93, 1.42, 1], [-0.93, 1.42, 1], [0.93, -1.46, 0], [-0.93, -1.46, 0]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.43, z);
    const w = wheelAssembly(M, 0.43, 0.30, front ? 6 : 8);
    pivot.add(w); car.add(pivot);
    wheels.push({ pivot, spin: w, front: !!front });
  }

  car.add(blobShadow(2.6, 5.6, 0.9));
  car.userData = { wheels, M, body };
  car.scale.setScalar(1);
  return car;
}

/* ------------------------------------------------------------------ SEMI */
export function buildSemi({ trailer = true } = {}) {
  const M = carMaterials();
  const truck = new THREE.Group();

  // tractor cab (cab-over, aero nose)
  const cab = new THREE.Mesh(loft([
    [-0.95, 1.18, 1.55, 1.55, 1.20, 5.2],
    [0.20, 1.26, 1.55, 1.62, 1.26, 5.6],
    [1.20, 1.27, 1.53, 1.58, 1.25, 5.8],
    [2.05, 1.24, 1.48, 1.46, 1.20, 6.0],
    [2.35, 1.12, 1.40, 1.24, 1.10, 5.0],
    [2.42, 0.86, 1.30, 1.00, 0.95, 4.0],
  ], 34), M.paint);
  truck.add(cab);

  // windshield wrap + side glass
  const ws = new THREE.Mesh(new THREE.PlaneGeometry(2.10, 1.05), M.glass);
  ws.position.set(0, 2.20, 2.285); ws.rotation.x = -0.16; truck.add(ws);
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.82), M.glass);
    w.position.set(s * 1.245, 2.10, 1.15); w.rotation.y = s * Math.PI / 2; truck.add(w);
    const led = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.10), M.white);
    led.position.set(s * 0.90, 1.02, 2.36); truck.add(led);
  }
  // roof aero fairing
  const fair = new THREE.Mesh(loft([
    [-0.90, 1.18, 3.02, 0.22, 0.02, 4.0],
    [0.60, 1.22, 3.06, 0.34, 0.02, 4.0],
    [1.40, 1.16, 3.02, 0.24, 0.02, 4.0],
    [1.75, 0.95, 2.94, 0.10, 0.02, 4.0],
  ], 20), M.paint);
  truck.add(fair);
  // bumper, grille, mirrors
  const bump = new THREE.Mesh(new THREE.BoxGeometry(2.30, 0.42, 0.22), M.trim);
  bump.position.set(0, 0.55, 2.40); truck.add(bump);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(1.70, 0.30, 0.06), M.trim);
  grille.position.set(0, 0.98, 2.44); truck.add(grille);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.05, 0.05), M.trim);
    arm.position.set(s * 1.38, 2.42, 1.90); truck.add(arm);
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.16), M.trim);
    mir.position.set(s * 1.53, 2.18, 1.90); truck.add(mir);
  }
  // TESLA wordmark on the cab nose
  const tm = wordmark('T E S L A', { w: 0.86, h: 0.13, color: '#c9ced6', size: 96, letter: 0.1 });
  tm.position.set(0, 1.60, 2.44); truck.add(tm);

  // wheels: 2 steer axles + 2 drive axles
  const wheels = [];
  const truckWheel = () => {
    const w = wheelAssembly(M, 0.52, 0.34, 10); w.scale.setScalar(1.0); return w;
  };
  for (const z of [1.75, 0.55]) for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 1.02, 0.52, z); const w = truckWheel(); p.add(w); truck.add(p); wheels.push({ pivot: p, spin: w });
  }
  for (const z of [-1.35, -2.45]) for (const s of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(s * 1.02, 0.52, z); const w = truckWheel(); p.add(w); truck.add(p); wheels.push({ pivot: p, spin: w });
  }

  if (trailer) {
    const box = new THREE.Mesh(loft([
      [-9.6, 1.27, 2.10, 1.32, 1.30, 8.0],
      [-9.3, 1.27, 2.10, 1.34, 1.32, 9.0],
      [0.6, 1.27, 2.10, 1.34, 1.32, 10.0],
      [0.75, 1.22, 2.10, 1.28, 1.26, 8.0],
    ], 26), M.paint);
    box.position.z = -0.4; truck.add(box);
    // side stripe + logo
    for (const s of [-1, 1]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 8.9), M.trim);
      stripe.position.set(s * 1.272, 1.15, -4.9); truck.add(stripe);
      const logo = wordmark('T E S L A', { w: 1.9, h: 0.30, color: '#b9bfc8', size: 120, letter: 0.08 });
      logo.position.set(s * 1.283, 2.55, -4.6); logo.rotation.y = s * Math.PI / 2; truck.add(logo);
    }
    // rear doors + lights
    const doors = new THREE.Mesh(new THREE.BoxGeometry(2.52, 2.60, 0.06), M.paintWarm);
    doors.position.set(0, 2.12, -10.06); truck.add(doors);
    for (const s of [-1, 1]) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.30, 0.05), M.red);
      tail.position.set(s * 1.10, 1.10, -10.10); truck.add(tail);
    }
    // trailer bogie
    for (const z of [-8.35, -9.35]) for (const s of [-1, 1]) {
      const p = new THREE.Group(); p.position.set(s * 1.02, 0.52, z); const w = truckWheel(); p.add(w); truck.add(p); wheels.push({ pivot: p, spin: w });
    }
  }
  truck.add(blobShadow(3.4, 13.5, 0.85));
  truck.userData = { wheels, M };
  return truck;
}

/* ------------------------------------------------------------------ STARSHIP + TOWER */
export function buildStarship({ scale = 1 } = {}) {
  const M = carMaterials();
  const g = new THREE.Group();
  const steel = M.steel.clone(); steel.color = new THREE.Color(0xc6ccd4); steel.roughness = 0.3;
  const booster = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.05, 34, 24, 1, true), steel);
  booster.position.y = 17; g.add(booster);
  const ship = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.0, 20, 24, 1, true), steel);
  ship.position.y = 44; g.add(ship);
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 2.0, 9, 24, 1, true), steel);
  nose.position.y = 58.5; g.add(nose);
  // heat-shield tiles
  const shield = new THREE.Mesh(new THREE.CylinderGeometry(2.04, 2.04, 29, 16, 1, true, Math.PI * 0.55, Math.PI * 0.9), M.tiles);
  shield.position.y = 47; g.add(shield);
  // flaps
  for (const [y, w, h] of [[39.5, 4.2, 5.2], [51.5, 3.4, 6.0]]) {
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.28, h, w), M.tiles);
      f.position.set(s * 2.05, y, -1.6); g.add(f);
    }
  }
  // grid fins + raceway
  for (let i = 0; i < 4; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.18), M.tiles);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    fin.position.set(Math.cos(a) * 2.2, 29.5, Math.sin(a) * 2.2);
    fin.rotation.y = -a; g.add(fin);
  }
  const race = new THREE.Mesh(new THREE.BoxGeometry(0.30, 48, 0.30), M.trim);
  race.position.set(2.0, 36, 0); g.add(race);
  // engine bells
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.5, 1.1, 10, 1, true), M.trim);
    b.position.set(Math.cos(a) * 1.25, -0.55, Math.sin(a) * 1.25); g.add(b);
  }

  // flame (hidden until launch)
  const flame = new THREE.Group();
  const core = new THREE.Mesh(new THREE.ConeGeometry(1.5, 15, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  core.position.y = -8; core.rotation.x = Math.PI; flame.add(core);
  const outer = new THREE.Mesh(new THREE.ConeGeometry(2.6, 26, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a2a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
  outer.position.y = -14; outer.rotation.x = Math.PI; flame.add(outer);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex('rgba(255,190,110,0.95)', 'rgba(255,90,0,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.scale.set(16, 16, 1); halo.position.y = -1.5; flame.add(halo);
  flame.visible = false;
  g.add(flame);
  g.scale.setScalar(scale);
  g.userData = { flame, core, outer, halo, steel };
  return g;
}

/** Mechazilla-style launch tower with chopsticks */
export function buildTower(height = 62) {
  const M = carMaterials();
  const g = new THREE.Group();
  const legMat = M.trim, brace = M.trim;
  const legGeo = new THREE.BoxGeometry(0.5, height, 0.5);
  const legs = [[-3.2, -3.2], [3.2, -3.2], [-3.2, 3.2], [3.2, 3.2]];
  for (const [x, z] of legs) { const l = new THREE.Mesh(legGeo, legMat); l.position.set(x, height / 2, z); g.add(l); }
  const braceGeo = new THREE.BoxGeometry(6.6, 0.22, 0.22);
  for (let y = 3; y < height; y += 4.2) {
    for (const [rx, rz, rot] of [[0, -3.2, 0], [0, 3.2, 0], [-3.2, 0, Math.PI / 2], [3.2, 0, Math.PI / 2]]) {
      const b = new THREE.Mesh(braceGeo, brace);
      b.position.set(rx, y, rz); b.rotation.y = rot; g.add(b);
      const d = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.16, 0.16), brace);
      d.position.set(rx, y + 2.1, rz); d.rotation.y = rot; d.rotation.z = 0.62; g.add(d);
    }
  }
  // carriage + chopsticks
  const car = new THREE.Mesh(new THREE.BoxGeometry(7.4, 2.6, 7.4), M.concrete);
  car.position.y = height - 8; g.add(car);
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.7, 25), M.concrete);
    arm.position.set(s * 4.0, height - 7.0, 9.5); arm.rotation.x = 0.03; arm.rotation.y = s * 0.06; g.add(arm);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.2, 2.6), M.trim);
    hinge.position.set(s * 4.0, height - 7.0, -3.4); g.add(hinge);
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.0, 8.2), M.trim);
  top.position.y = height; g.add(top);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 9, 6), M.chrome);
  mast.position.y = height + 4.5; g.add(mast);
  g.userData = { M };
  return g;
}

/** orbital launch mount + concrete pad */
export function buildPad(radius = 12) {
  const M = carMaterials();
  const g = new THREE.Group();
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.9, 36), M.concrete);
  slab.position.y = 0.35; g.add(slab);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(6.2, 0.5, 8, 28), M.trim);
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.1; g.add(ring);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.1), M.trim);
    leg.position.set(Math.cos(a) * 5.4, 1.9, Math.sin(a) * 5.4); g.add(leg);
  }
  return g;
}

/* ------------------------------------------------------------------ GROUND / SKY DRESSING */
export function groundTextures() {
  const desert = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#c2a887'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = 2 + Math.random() * 26;
      const t = Math.random();
      g.fillStyle = t > 0.62 ? `rgba(150,132,98,${0.04 + Math.random() * 0.09})`
        : t > 0.3 ? `rgba(216,200,170,${0.05 + Math.random() * 0.1})` : `rgba(96,96,66,${0.03 + Math.random() * 0.07})`;
      g.beginPath(); g.ellipse(x, y, r, r * (0.5 + Math.random()), Math.random() * 3, 0, 7); g.fill();
    }
    // tidal salt streaks
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(226,220,206,${0.05 + Math.random() * 0.08})`; g.lineWidth = 3 + Math.random() * 14;
      g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, h * 0.4, Math.random() * w, h * 0.7, Math.random() * w, h); g.stroke();
    }
  }, { repeat: [26, 26], aniso: 8 });

  const asphalt = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2c2d31'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5200; i++) {
      const v = Math.random();
      g.fillStyle = `rgba(${120 + v * 90 | 0},${120 + v * 90 | 0},${126 + v * 86 | 0},${0.03 + Math.random() * 0.12})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2.4, 1 + Math.random() * 2.4);
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(10,10,12,${0.06 + Math.random() * 0.1})`;
      g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 14 + Math.random() * 40, 8 + Math.random() * 22, Math.random() * 3, 0, 7); g.fill();
    }
  }, { repeat: [3, 40], aniso: 8 });

  return { desert, asphalt };
}

export function buildSky(scene) {
  const geo = new THREE.SphereGeometry(1400, 40, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { sunDir: { value: new THREE.Vector3(0.55, 0.10, 0.83).normalize() } },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `varying vec3 vP; uniform vec3 sunDir;
      void main(){ vec3 d = normalize(vP); float h = clamp(d.y*0.5+0.5, 0.0, 1.0);
        vec3 low = vec3(0.99,0.62,0.38), mid = vec3(0.46,0.56,0.75), top = vec3(0.055,0.135,0.34);
        vec3 c = mix(low, mid, smoothstep(0.455,0.60,h));
        c = mix(c, top, smoothstep(0.58,0.98,h));
        float sun = pow(max(dot(d, sunDir),0.0), 220.0);
        c += vec3(3.2,2.2,1.2)*sun;
        c += vec3(1.0,0.55,0.28)*pow(max(0.0, 1.0-abs(d.y-0.02)*13.0), 2.0)*0.55;
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.frustumCulled = false;
  scene.add(sky);
  return sky;
}

export function cloudSprites(scene, count = 16, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
  const tex = canvasTex(256, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      const x = 30 + rnd() * (w - 60), y = h * 0.62 - Math.pow(rnd(), 1.6) * h * 0.34, r = 14 + rnd() * 34;
      const grd = g.createRadialGradient(x, y, 0, x, y, r);
      grd.addColorStop(0, 'rgba(255,244,232,0.55)'); grd.addColorStop(0.6, 'rgba(250,226,208,0.24)'); grd.addColorStop(1, 'rgba(255,220,200,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    }
  }, { repeat: [1, 1] });
  const out = [];
  for (let i = 0; i < count; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.55 + rnd() * 0.35, depthWrite: false, fog: false }));
    const a = -0.9 + rnd() * 2.2, dist = 700 + rnd() * 420;
    sp.position.set(Math.sin(a) * dist, 70 + rnd() * 190, Math.cos(a) * dist * 0.6 + 260);
    const sc = 240 + rnd() * 340;
    sp.scale.set(sc, sc * 0.46, 1);
    scene.add(sp); out.push(sp);
  }
  return out;
}

export { glowTex, canvasTex, wheelAssembly };
