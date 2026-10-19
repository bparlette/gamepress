// Slashers Paradise rendering source, extracted from game/src/render.js (Three.js 0.169).
// 1. Character/scene shader: 3-tone toon ramp with noise-broken (painted) band edges,
//    hue-shifted shadow color (uShade), object-space stains, vertical value gradient,
//    stepped campfire light, hemisphere ambient, toon spec, dual moon(cyan)/fire(orange) rim,
//    brush modulation, squared-exp + ground fog, kill tint.
//    Shared via hark.site for study. Ported to gamepress kit/slashido/.
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// ---------- shared lighting uniforms ----------
export const LIGHT = {
  uMoonDir: { value: new THREE.Vector3(-0.45, 0.75, -0.5).normalize() },
  uMoonCol: { value: new THREE.Color(0.92, 0.96, 1.08) },
  uFirePos: { value: new THREE.Vector3(0, 0.6, 0) },
  uFireCol: { value: new THREE.Color(1.0, 0.52, 0.18) },
  uFireInt: { value: 1.0 },
  uAmbTop: { value: new THREE.Color(0.20, 0.27, 0.42) },
  uAmbBot: { value: new THREE.Color(0.10, 0.12, 0.14) },
  uFogCol: { value: new THREE.Color(0.07, 0.11, 0.17) },
  uFogDensity: { value: 0.017 },
  uRimKeyTint: { value: new THREE.Color(1, 1, 1) },
  uRimAccTint: { value: new THREE.Color(1, 1, 1) },
  uTime: { value: 0 },
  uKillTint: { value: 0 },
};

export const NOISE_GLSL = /* glsl */`
float hash3(vec3 p){ p = fract(p*0.3183099 + .1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i+vec3(0,0,0)),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ return vnoise(p)*0.55 + vnoise(p*2.13)*0.3 + vnoise(p*4.7)*0.15; }
`;

export const TOON_VERT = /* glsl */`
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol;
attribute vec3 color;
uniform float uUseVCol;
void main(){
  vec4 w = modelMatrix * vec4(position,1.0);
  vW = w.xyz; vO = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vCol = mix(vec3(1.0), color, uUseVCol);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

export const TOON_FRAG = /* glsl */`
uniform vec3 uMoonDir, uMoonCol, uFirePos, uFireCol, uAmbTop, uAmbBot, uFogCol, uRimKeyTint, uRimAccTint;
uniform float uFireInt, uFogDensity, uTime, uKillTint;
uniform vec3 uColor, uShade, uRimMoon, uRimFire, uEmissive, uStainCol;
uniform float uRimStr, uBrush, uStain, uStainScale, uGrad, uGradY0, uGradY1, uSpec, uDirt, uGrain;
varying vec3 vW; varying vec3 vN; varying vec3 vO; varying vec3 vCol;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vN);
  if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vW);
  float bn = fbm(vO*6.0) - 0.5;
  float bn2 = vnoise(vW*1.7) - 0.5;
  float m = dot(N, uMoonDir) + bn*0.35*uBrush;
  float band = smoothstep(-0.12, 0.05, m)*0.55 + smoothstep(0.42, 0.58, m)*0.45;
  vec3 base = uColor * vCol;
  float st = smoothstep(0.62, 0.70, fbm(vO*uStainScale + 3.1)) * uStain;
  base = mix(base, uStainCol, st);
  float dr = smoothstep(0.55,0.8, fbm(vO*9.0+7.0))*uDirt; base *= 1.0 - dr*0.35;
  vec3 shade = uShade * vCol; shade = mix(shade, uStainCol*0.45, st);
  vec3 col = mix(shade, base, band) * uMoonCol;
  float g = smoothstep(uGradY0, uGradY1, vW.y);
  col *= mix(1.0 - uGrad, 1.0, g);
  vec3 fd = uFirePos - vW; float fdist = length(fd);
  float fl = max(dot(N, fd/fdist), 0.0) * uFireInt / (1.0 + fdist*fdist*0.11);
  float fstep = smoothstep(0.05, 0.22, fl + bn*0.08) * 0.6 + smoothstep(0.35,0.6, fl)*0.4;
  col += base * uFireCol * fstep * 1.15 * uFireInt;
  col += base * mix(uAmbBot, uAmbTop, N.y*0.5+0.5) * 0.38;
  vec3 H = normalize(uMoonDir + V);
  col += uMoonCol * smoothstep(0.92, 0.95, dot(N,H)) * uSpec;
  float fres = 1.0 - max(dot(N, V), 0.0);
  float rim = smoothstep(0.55, 0.72, fres + bn*0.1);
  float fireSide = clamp(dot(N, normalize(vec3(fd.x,0.0,fd.z)))*0.5+0.5, 0.0, 1.0) * clamp(uFireInt*3.0/(1.0+fdist*0.25),0.0,1.0);
  float moonSide = clamp(dot(N, -normalize(vec3(uMoonDir.x,0.0,uMoonDir.z)))*0.6+0.4, 0.0, 1.0);
  col += (uRimMoon * uRimKeyTint * moonSide * (1.0-fireSide) + uRimFire * uRimAccTint * fireSide) * rim * uRimStr;
  col *= 1.0 + (bn*0.16 + bn2*0.08) * uBrush;
  col += uEmissive;
  if (uGrain > 0.0) {
    float fr = floor(uTime * 18.0);
    float gr = hash3(vec3(floor(gl_FragCoord.xy * 0.5), fr));
    float flick = 0.82 + 0.3 * hash3(vec3(fr, 3.1, 7.7));
    float scratch = step(0.985, hash3(vec3(floor(gl_FragCoord.x * 0.25), fr, 1.0)));
    float l0 = dot(col, vec3(0.3, 0.59, 0.11));
    col = mix(col, vec3(l0 * 1.12, l0 * 0.95, l0 * 0.78), uGrain * 0.45);
    col *= mix(1.0, flick * (0.8 + gr * 0.4), uGrain);
    col += vec3(0.9, 0.85, 0.7) * scratch * uGrain * 0.35;
  }
  float d = length(cameraPosition - vW);
  float fog = 1.0 - exp(-pow(d*uFogDensity, 2.0));
  float lowFog = exp(-max(vW.y,0.0)*0.9) * 0.25 * smoothstep(4.0, 16.0, d);
  col = mix(col, uFogCol, clamp(fog + lowFog, 0.0, 1.0));
  float lum = dot(col, vec3(0.3,0.59,0.11));
  col = mix(col, vec3(lum*1.3, lum*0.35, lum*0.4), uKillTint*0.6);
  gl_FragColor = vec4(col, 1.0);
}`;

// ---------- ink outline ----------
const OUT_VERT = /* glsl */`
uniform float uThick;
varying vec3 vW;
void main(){
  vec4 w = modelMatrix * vec4(position, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * normal);
  float d = length(cameraPosition - w.xyz);
  w.xyz += n * uThick * clamp(d*0.12, 0.6, 2.2);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const OUT_FRAG = /* glsl */`
uniform vec3 uInk, uFogCol; uniform float uFogDensity;
varying vec3 vW;
void main(){
  float d = length(cameraPosition - vW);
  float fog = 1.0 - exp(-pow(d*uFogDensity, 2.0));
  gl_FragColor = vec4(mix(uInk, uFogCol, fog*0.9), 1.0);
}`;
const outlineMats = new Map();
export function outlineMat(thick = 0.022, ink = 0x0d0710) {
  const k = thick + ':' + ink;
  if (!outlineMats.has(k)) outlineMats.set(k, new THREE.ShaderMaterial({
    uniforms: { uThick: { value: thick }, uInk: { value: new THREE.Color(ink) }, uFogCol: LIGHT.uFogCol, uFogDensity: LIGHT.uFogDensity },
    vertexShader: OUT_VERT, fragmentShader: OUT_FRAG, side: THREE.BackSide,
  }));
  outlineMats.get(k).userData.shared = true;
  return outlineMats.get(k);
}
const smoothCache = new WeakMap();
export function smoothGeo(g) {
  if (smoothCache.has(g)) return smoothCache.get(g);
  let s = g.clone();
  for (const k of Object.keys(s.attributes)) if (k !== 'position') s.deleteAttribute(k);
  s = mergeVertices(s, 1e-4); s.computeVertexNormals();
  smoothCache.set(g, s); return s;
}
export function inked(geo, mat, thick = 0.022, ink) {
  const m = new THREE.Mesh(geo, mat);
  if (thick > 0) {
    const o = new THREE.Mesh(smoothGeo(geo), outlineMat(thick, ink));
    o.raycast = () => {}; m.add(o); m.userData.outline = o;
  }
  return m;
}
