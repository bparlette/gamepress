// cel.js — cel-shading kit: 3-band toon material with comic halftone in the shadow band and a hit-flash uniform,
// mitred inverted-hull ink outlines (instancing-aware), primitive helpers, group merging, and two batched layers:
// InstLayer (InstancedMesh + outline hull, one draw each) and SpriteLayer (instanced quads, billboard or ground decal).
import * as THREE from './three.module.min.js';

export const INK = '#140f1f';
export const DOT = { value: 5.0 };

export const GRAD = (() => {
  const v = [0, 0, 0, 0, 125, 125, 255, 255], d = new Uint8Array(v.length * 4);
  v.forEach((x, i) => { d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = x; d[i * 4 + 3] = 255; });
  const t = new THREE.DataTexture(d, v.length, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
})();
const HALFTONE = /* glsl */`
  { float lumD = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
    float lumO = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    float rr = lumO / max(lumD, 1e-4);
    vec2 hp = gl_FragCoord.xy / uDot; hp = vec2(hp.x + hp.y, hp.y - hp.x) * 0.7071;
    float dd = length(fract(hp) - 0.5);
    float shade = smoothstep(0.62, 0.46, rr);
    float rad = 0.36 * shade;
    float dm = 1.0 - smoothstep(rad - 0.05, rad + 0.05, dd);
    outgoingLight *= 1.0 - 0.28 * dm;
    outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.82, 0.8, 1.15), shade * 0.55);
    outgoingLight = mix(outgoingLight, uFlashC, uFlash);
  }
  #include <opaque_fragment>`;

export function toonMat(opts = {}) {
  const m = new THREE.MeshToonMaterial(Object.assign({ gradientMap: GRAD, vertexColors: true }, opts));
  m.userData.flash = { value: 0 }; m.userData.flashC = { value: new THREE.Color(1, 1, 1) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFlash = m.userData.flash; sh.uniforms.uFlashC = m.userData.flashC; sh.uniforms.uDot = DOT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlash; uniform vec3 uFlashC; uniform float uDot;')
      .replace('#include <opaque_fragment>', HALFTONE);
  };
  m.customProgramCacheKey = () => 'toon' + (opts.map ? 'M' : '') + (opts.vertexColors === false ? 'n' : '');
  return m;
}

// ink outline: back faces pushed along mitred 'odir' by uW * distance-to-camera (≈ constant screen width)
export function outlineMat(w, color = INK) {
  return new THREE.ShaderMaterial({
    uniforms: { uW: { value: w }, uC: { value: new THREE.Color(color) } },
    vertexShader: /* glsl */`attribute vec3 odir; uniform float uW;
      void main() {
        mat4 M = modelMatrix;
        #ifdef USE_INSTANCING
          M = modelMatrix * instanceMatrix;
        #endif
        vec4 wp = M * vec4(position, 1.0); vec3 wd = normalize(mat3(M) * odir) * length(odir);
        float d = distance(wp.xyz, cameraPosition); wp.xyz += wd * uW * clamp(d, 2.0, 60.0);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: /* glsl */`uniform vec3 uC; void main() { gl_FragColor = vec4(uC, 1.0);
      #include <colorspace_fragment>
    }`,
    side: THREE.BackSide,
  });
}

export function addOdir(g) {
  const p = g.attributes.position, n = g.attributes.normal, map = new Map(), keys = [];
  for (let i = 0; i < p.count; i++) {
    const k = Math.round(p.getX(i) * 1e3) + ',' + Math.round(p.getY(i) * 1e3) + ',' + Math.round(p.getZ(i) * 1e3);
    keys.push(k); let e = map.get(k); if (!e) map.set(k, (e = []));
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    if (!e.some((q) => q[0] * nx + q[1] * ny + q[2] * nz > 0.985)) e.push([nx, ny, nz]);
  }
  const res = new Map();
  for (const [k, e] of map) {
    let x = 0, y = 0, z = 0; for (const q of e) { x += q[0]; y += q[1]; z += q[2]; }
    const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
    let mn = 1; for (const q of e) mn = Math.min(mn, q[0] * x + q[1] * y + q[2] * z);
    const s = 1 / Math.max(mn, 0.35); res.set(k, [x * s, y * s, z * s]);
  }
  const o = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const d = res.get(keys[i]); o[i * 3] = d[0]; o[i * 3 + 1] = d[1]; o[i * 3 + 2] = d[2]; }
  g.setAttribute('odir', new THREE.BufferAttribute(o, 3));
  return g;
}
export function bakeColor(g, col) {
  const c = new THREE.Color(col), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
}

export const G = {
  sph: (rx, ry, rz, ws = 14, hs = 10) => new THREE.SphereGeometry(1, ws, hs).scale(rx, ry, rz),
  cap: (r, len, rs = 10) => new THREE.CapsuleGeometry(r, len, 4, rs),
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 12, open = false) => new THREE.CylinderGeometry(rt, rb, h, s, 1, open),
  cone: (r, h, s = 10) => new THREE.ConeGeometry(r, h, s),
  tor: (r, t, rs = 8, ts = 16, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  oct: (r) => new THREE.OctahedronGeometry(r, 0),
};

export const OUT_CHAR = outlineMat(0.0042), OUT_PROP = outlineMat(0.0034), OUT_THIN = outlineMat(0.0026);

export function grp(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); if (parent) parent.add(g); return g; }
// a toon part with its own ink hull. o: {rot:[x,y,z], outline:false, mat, olMat, emissive}
export function part(parent, geom, col, x = 0, y = 0, z = 0, o = {}) {
  bakeColor(geom, col); if (o.outline !== false) addOdir(geom);
  const mat = o.mat || findMat(parent);
  const m = new THREE.Mesh(geom, mat); m.position.set(x, y, z); if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.userData.isPart = true; m.userData.outlined = o.outline !== false;
  parent.add(m);
  if (o.outline !== false) { const ol = new THREE.Mesh(geom, o.olMat || OUT_CHAR); ol.userData.isOutline = true; m.add(ol); }
  return m;
}
function findMat(g) { while (g) { if (g.userData && g.userData.mat) return g.userData.mat; g = g.parent; } return null; }

// merge every toon part of a group into one non-indexed geometry (position, normal, color, odir) in group space
export function mergeGroup(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const pos = [], nor = [], col = [];
  const m = new THREE.Matrix4(), nm = new THREE.Matrix3(), v = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || !o.userData.isPart) return;
    let g = o.geometry; g = g.index ? g.toNonIndexed() : g;
    m.multiplyMatrices(inv, o.matrixWorld); nm.getNormalMatrix(m);
    const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color;
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(m); pos.push(v.x, v.y, v.z);
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z);
      col.push(C.getX(i), C.getY(i), C.getZ(i));
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  addOdir(out); out.computeBoundingSphere(); return out;
}

// ---- instanced mesh layer: push() instances each frame, end() uploads; outline hull is a second instanced draw ----
const _o = new THREE.Object3D();
export class InstLayer {
  constructor(scene, geom, max, o = {}) {
    this.mat = o.mat || toonMat(o.emissive ? { emissive: new THREE.Color(o.emissive) } : {});
    this.mesh = new THREE.InstancedMesh(geom, this.mat, max); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.mesh);
    if (o.outline !== false) {
      this.ol = new THREE.InstancedMesh(geom, o.olMat || OUT_PROP, max); this.ol.instanceMatrix = this.mesh.instanceMatrix;
      this.ol.frustumCulled = false; this.ol.count = 0; scene.add(this.ol);
    }
    this.max = max; this.n = 0;
  }
  begin() { this.n = 0; }
  push(x, y, z, ry = 0, s = 1, rx = 0, rz = 0, sy = s) {
    if (this.n >= this.max) return;
    _o.position.set(x, y, z); _o.rotation.set(rx, ry, rz); _o.scale.set(s, sy, s); _o.updateMatrix();
    this.mesh.setMatrixAt(this.n++, _o.matrix);
  }
  end() { this.mesh.count = this.n; if (this.ol) this.ol.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
  set visible(v) { this.mesh.visible = v; if (this.ol) this.ol.visible = v; }
}

// ---- sprite layer: instanced quads. mode 'bill' faces the camera (anchored at bottom-centre when anchor=0),
// 'ground' lies flat on the floor. blend: 'add' | 'alpha' (premultiplied) | 'cut' (alpha-tested, writes depth)
export class SpriteLayer {
  constructor(scene, tex, max, o = {}) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new Float32Array(max * 3); this.size = new Float32Array(max * 3); this.uv = new Float32Array(max * 4); this.col = new Float32Array(max * 4);
    const A = (arr, k) => { const a = new THREE.InstancedBufferAttribute(arr, k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    this.aPos = A(this.pos, 3); this.aSize = A(this.size, 3); this.aUv = A(this.uv, 4); this.aCol = A(this.col, 4);
    g.setAttribute('iPos', this.aPos); g.setAttribute('iSize', this.aSize); g.setAttribute('iUv', this.aUv); g.setAttribute('iCol', this.aCol);
    g.instanceCount = 0;
    const ground = o.mode === 'ground', blend = o.blend || 'alpha';
    this.uniforms = { map: { value: tex }, uRight: { value: new THREE.Vector3(1, 0, 0) }, uUp: { value: new THREE.Vector3(0, 1, 0) }, uAnchor: { value: o.anchor ?? 0 } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: /* glsl */`attribute vec3 iPos; attribute vec3 iSize; attribute vec4 iUv; attribute vec4 iCol;
        uniform vec3 uRight; uniform vec3 uUp; uniform float uAnchor; varying vec2 vUv; varying vec4 vCol; varying float vFlash;
        void main() {
          float c = cos(iSize.z), s = sin(iSize.z);
          vec2 q = vec2(position.x, position.y - uAnchor);
          vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c) * iSize.xy;
          ${ground ? 'vec3 wp = iPos + vec3(r.x, 0.0, -r.y);' : 'vec3 wp = iPos + uRight * r.x + uUp * r.y;'}
          float fl = iSize.x < 0.0 ? 1.0 : 0.0;
          vUv = vec2(mix(iUv.x, iUv.z, position.x + 0.5), mix(iUv.w, iUv.y, position.y));
          vCol = iCol; vFlash = 0.0; if (iCol.a > 1.0) { vFlash = iCol.a - 1.0; vCol.a = 1.0; }
          gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
      fragmentShader: /* glsl */`uniform sampler2D map; varying vec2 vUv; varying vec4 vCol; varying float vFlash;
        void main() { vec4 t = texture2D(map, vUv);
          ${blend === 'cut' ? 'if (t.a < 0.5) discard; t.rgb /= t.a; t.a = 1.0;' : ''}
          vec3 rgb = t.rgb * vCol.rgb; rgb = mix(rgb, vec3(1.0, 0.98, 0.94) * t.a, vFlash);
          gl_FragColor = vec4(rgb * ${blend === 'cut' ? '1.0' : 'vCol.a'}, t.a * vCol.a);
          ${blend === 'add' ? 'gl_FragColor.a = 0.0;' : ''}
          #include <colorspace_fragment>
        }`,
      transparent: blend !== 'cut', depthWrite: blend === 'cut', depthTest: o.depthTest !== false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
      premultipliedAlpha: true,
    });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = o.order || 0;
    if (o.polygonOffset) { mat.polygonOffset = true; mat.polygonOffsetFactor = -1; mat.polygonOffsetUnits = -4; }
    scene.add(this.mesh); this.g = g; this.max = max; this.n = 0; this.attrs = [this.aPos, this.aSize, this.aUv, this.aCol];
  }
  begin() { this.n = 0; }
  // u: uv rect [u0,v0,u1,v1] (v0 = top). w<0 mirrors. a>1 flashes white by (a-1).
  push(x, y, z, w, h, rot, u, r = 1, gg = 1, b = 1, a = 1) {
    if (this.n >= this.max) return; const i = this.n++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.size[i * 3] = w; this.size[i * 3 + 1] = h; this.size[i * 3 + 2] = rot;
    this.uv[i * 4] = w < 0 ? u[2] : u[0]; this.uv[i * 4 + 1] = u[1]; this.uv[i * 4 + 2] = w < 0 ? u[0] : u[2]; this.uv[i * 4 + 3] = u[3];
    if (w < 0) this.size[i * 3] = -w;
    this.col[i * 4] = r; this.col[i * 4 + 1] = gg; this.col[i * 4 + 2] = b; this.col[i * 4 + 3] = a;
  }
  end() {
    const n = this.n; this.g.instanceCount = n;
    for (let k = 0; k < 4; k++) { const a = this.attrs[k]; a.needsUpdate = true; a.clearUpdateRanges ? (a.clearUpdateRanges(), a.addUpdateRange(0, n * a.itemSize)) : (a.updateRange.count = n * a.itemSize); }
  }
}
