// gp2x: the Cat Arcade "juice" layer that sits on top of gp2d.
//  · WebGL post-processing: bloom, chromatic aberration, impact ripples, vignette, scanlines, grain, colour grade.
//  · Particle engine (sparks, glow, smoke, debris, rings, shockwaves, shards, confetti, hearts, feathers, bolts).
//  · Camera punch-spring (zoom kick + recoil), combo/synergy meter, glass HUD panels, spring squash helpers.
//  · Matter.js rigid-body helper (real physics: stacks, ragdolls, pinball, explosions) with a canvas draw bridge.
//  · gsap for UI/camera easing, Tone.js audio from gpsnd (instant fallback before it loads).
// Games still call g.run(update, draw, hud?) exactly like gp2d, and postMessage/?auto/?hold keep working untouched.
import { createGame } from './gp2d.js';
import { sfx, music, comboPitch, setMuted, toggleMuted, boot, events, setMusic, stopMusic } from './gpsnd.js';
import { drawChar } from './gpsprites.js';
export { sfx, music, comboPitch, setMuted, toggleMuted, boot, events, setMusic, stopMusic, createGame };
export { clamp, lerp, rnd, ri, pick, chance, shuffle, R, setSeed, sign, dist, ang, smooth, ease, aabb, circ, inRect, shade, tweens } from './gpmath.js';
export const Matter = typeof window !== 'undefined' ? window.Matter : null;
export const gsap = typeof window !== 'undefined' ? window.gsap : null;
export const TAU = Math.PI * 2;

/* ================================================================ tiny helpers */
export const rr = (c, x, y, w, h, r = 8) => { c.beginPath(); c.roundRect(x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); };
export const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, Math.abs(r), 0, TAU); };
export const seg = (c, x1, y1, x2, y2, w, col, cap = 'round') => { c.beginPath(); c.lineCap = cap; c.strokeStyle = col; c.lineWidth = w; c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
export const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI; return a + d * t; };
export const approach = (v, to, step) => (v < to ? Math.min(v + step, to) : Math.max(v - step, to));
export const damp = (v, to, k, dt) => v + (to - v) * (1 - Math.exp(-k * dt));
export const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
export const fmt = n => Math.round(n).toLocaleString('en-US');
export const shadow = (c, x, y, rx, ry, a = .28) => { c.save(); c.globalAlpha = a; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); c.restore(); };

/** Draw something with a squash/stretch + rotation pivot (feet-anchored). */
export function squish(c, x, y, sx, sy, rot, fn) { c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(sx || 1, sy || 1); fn(c); c.restore(); }

/** Glassy HUD panel with a light top edge — the house style for every menu / card. */
export function panel(c, x, y, w, h, o = {}) {
  const r = o.r ?? 18, a = o.alpha ?? .82, col = o.color || '#101828';
  c.save();
  const gd = c.createLinearGradient(x, y, x, y + h);
  gd.addColorStop(0, hexA(col, a + .1)); gd.addColorStop(1, hexA(col, a));
  rr(c, x, y, w, h, r); c.fillStyle = gd; c.fill();
  c.strokeStyle = o.stroke || 'rgba(255,255,255,.22)'; c.lineWidth = o.lw ?? 2.5; c.stroke();
  c.beginPath(); c.moveTo(x + r, y + 2); c.lineTo(x + w - r, y + 2); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 2; c.stroke();
  c.restore();
}

/** Rounded "pill" with outlined label — used for score chips, timers, tips. */
export function pill(c, x, y, label, o = {}) {
  const s = o.size || 26, pad = o.pad ?? 14;
  c.save(); c.font = `900 ${s}px Impact,"Arial Black",system-ui,sans-serif`;
  const w = c.measureText(label).width + pad * 2, h = s * 1.9;
  rr(c, x, y, w, h, o.r ?? h / 2); c.fillStyle = o.bg || 'rgba(8,12,22,.72)'; c.fill();
  if (o.stroke !== 0) { c.strokeStyle = o.stroke || 'rgba(255,255,255,.28)'; c.lineWidth = 2; c.stroke(); }
  c.textBaseline = 'middle'; c.textAlign = 'center'; c.fillStyle = o.color || '#fff';
  c.fillText(label, x + w / 2, y + h / 2 + 1); c.restore();
  return w;
}

/* ================================================================ WebGL post-processing */
const VS = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
const FB = `precision highp float;varying vec2 vUv;uniform sampler2D uTex;uniform float uThresh;uniform vec2 uTexel;
void main(){vec3 c=vec3(0.0);c+=texture2D(uTex,vUv+uTexel*vec2(-1.0,-1.0)).rgb;c+=texture2D(uTex,vUv+uTexel*vec2(1.0,-1.0)).rgb;
c+=texture2D(uTex,vUv+uTexel*vec2(-1.0,1.0)).rgb;c+=texture2D(uTex,vUv+uTexel*vec2(1.0,1.0)).rgb;c*=0.25;
float l=dot(c,vec3(0.299,0.587,0.114));float k=max(0.0,l-uThresh)/max(0.001,1.0-uThresh);gl_FragColor=vec4(c*k,1.0);}`;
const BL = `precision highp float;varying vec2 vUv;uniform sampler2D uTex;uniform vec2 uDir;
void main(){vec3 s=texture2D(uTex,vUv).rgb*0.2270270;
s+=texture2D(uTex,vUv+uDir*1.3846153).rgb*0.3162162;s+=texture2D(uTex,vUv-uDir*1.3846153).rgb*0.3162162;
s+=texture2D(uTex,vUv+uDir*3.2307692).rgb*0.0702702;s+=texture2D(uTex,vUv-uDir*3.2307692).rgb*0.0702702;
gl_FragColor=vec4(s,1.0);}`;
const CP = `precision highp float;varying vec2 vUv;
uniform sampler2D uScene,uBloom;uniform vec2 uRes;uniform float uTime,uCA,uVig,uGrain,uScan,uSat,uCon,uBloomAmt,uFlashA,uPulse,uBloomThresh;
uniform vec3 uFlash;uniform vec4 uRip[4];uniform int uRipN;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 uv=vUv;vec2 asp=vec2(uRes.x/uRes.y,1.0);vec2 d0=uv-0.5;float rad=length(d0*asp);
  for(int i=0;i<4;i++){ if(i>=uRipN) break; vec4 R=uRip[i]; float age=uTime-R.z;
    if(age<0.0||age>0.9) continue; vec2 d=(uv-R.xy)*asp; float dl=length(d)+1e-4; float w=age*1.15;
    float band=exp(-pow((dl-w)*11.0,2.0)); uv+=normalize(d)*band*R.w*(1.0-age/0.9)*0.03/asp; }
  vec2 dir=uv-0.5; float ca=uCA*(0.35+rad*2.2)*0.0035;
  vec3 col; col.r=texture2D(uScene,uv+dir*ca).r; col.g=texture2D(uScene,uv).g; col.b=texture2D(uScene,uv-dir*ca).b;
  col+=texture2D(uBloom,uv).rgb*uBloomAmt;
  col=pow(max(col,vec3(0.0)),vec3(0.96));
  col=mix(vec3(dot(col,vec3(0.299,0.587,0.114))),col,uSat);
  col=(col-0.5)*uCon+0.5;
  col*=mix(1.0,smoothstep(1.30,0.22,rad),uVig);
  col*=1.0-uScan*0.085*(0.5+0.5*sin(uv.y*uRes.y*3.14159));
  float g=hash(uv*uRes+fract(uTime)*117.0)-0.5; col+=g*uGrain;
  col=mix(col,uFlash,uFlashA);
  gl_FragColor=vec4(clamp(col,0.0,1.0),1.0);
}`;

export function createPost(scale = .75) {
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; };
  const prog = (fs) => {
    const p = gl.createProgram(); const v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null; gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.warn(gl.getProgramInfoLog(p)); return null; }
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name.replace('[0]', '')] = gl.getUniformLocation(p, info.name); }
    return { p, u, a: gl.getAttribLocation(p, 'p') };
  };
  const P = { bright: prog(FB), blur: prog(BL), comp: prog(CP) };
  if (!P.bright || !P.blur || !P.comp) return null;
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const mkTex = (w, h) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
  const mkFB = t => { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return f; };
  const scene = mkTex(2, 2);
  let aTex, bTex, aFB, bFB, aw = 2, ah = 2;
  const sizeBloom = (w, h) => { aw = Math.max(2, w); ah = Math.max(2, h); aTex = mkTex(aw, ah); bTex = mkTex(aw, ah); aFB = mkFB(aTex); bFB = mkFB(bTex); };
  gl.bindTexture(gl.TEXTURE_2D, scene); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const api = {
    cv, gl, scale,
    bloom: .55, ca: .35, vig: .9, grain: .045, scan: .35, sat: 1.12, con: 1.06, flashA: 0, flash: [1, 1, 1],
    ripples: [], enabled: true, time: 0,
    ripple(x, y, strength = 1) { api.ripples.push({ x, y, t: api.time, s: strength }); if (api.ripples.length > 4) api.ripples.shift(); },
    setQuality(q) { api.scale = q; },
    render(src, smooth = .45) {
      if (!api.enabled || !src) return;
      api.time += 1 / 60;
      const sw = Math.max(2, Math.round(src.width * api.scale)), shh = Math.max(2, Math.round(src.height * api.scale));
      if (cv.width !== sw || cv.height !== shh) { cv.width = sw; cv.height = shh; sizeBloom(Math.round(sw / 4), Math.round(shh / 4)); gl.bindTexture(gl.TEXTURE_2D, scene); }
      if (src.width && src.height) { gl.bindTexture(gl.TEXTURE_2D, scene); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); }
      gl.viewport(0, 0, aw, ah); gl.bindFramebuffer(gl.FRAMEBUFFER, aFB); gl.useProgram(P.bright.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.uniform1i(P.bright.u.uTex, 0); gl.uniform1f(P.bright.u.uThresh, .62); gl.uniform2f(P.bright.u.uTexel, 1 / sw, 1 / shh);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(P.bright.a); gl.vertexAttribPointer(P.bright.a, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.useProgram(P.blur.p); gl.uniform1i(P.blur.u.uTex, 0);
      for (let i = 0; i < 2; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, bFB); gl.bindTexture(gl.TEXTURE_2D, aTex);
        gl.uniform2f(P.blur.u.uDir, (1.15 + i) / aw, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, aFB); gl.bindTexture(gl.TEXTURE_2D, bTex);
        gl.uniform2f(P.blur.u.uDir, 0, (1.15 + i) / ah); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, sw, shh); gl.useProgram(P.comp.p);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, scene);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, aTex);
      const U = P.comp.u;
      gl.uniform1i(U.uScene, 0); gl.uniform1i(U.uBloom, 1);
      gl.uniform2f(U.uRes, sw, shh); gl.uniform1f(U.uTime, api.time);
      gl.uniform1f(U.uCA, api.ca); gl.uniform1f(U.uVig, api.vig); gl.uniform1f(U.uGrain, api.grain);
      gl.uniform1f(U.uScan, api.scan); gl.uniform1f(U.uSat, api.sat); gl.uniform1f(U.uCon, api.con);
      gl.uniform1f(U.uBloomAmt, api.bloom); gl.uniform1f(U.uFlashA, api.flashA);
      gl.uniform3f(U.uFlash, api.flash[0], api.flash[1], api.flash[2]);
      const rip = new Float32Array(16); api.ripples.forEach((r, i) => { rip.set([r.x, 1 - r.y, r.t, r.s], i * 4); });
      gl.uniform4fv(U.uRip, rip); gl.uniform1i(U.uRipN, Math.min(4, api.ripples.length));
      gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(P.comp.a); gl.vertexAttribPointer(P.comp.a, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      api.flashA *= (.72 + smooth * .1);
      if (api.flashA < .004) api.flashA = 0;
      api.ripples = api.ripples.filter(r => api.time - r.t < .95);
    },
    resize(cssW, cssH) { cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px'; },
  };
  return api;
}

/* ================================================================ particle engine */
const KIND = { spark: 0, dot: 1, glow: 2, smoke: 3, debris: 4, ring: 5, shard: 6, confetti: 7, heart: 8, feather: 9, star: 10, bolt: 11, bubble: 12 };

export class FX {
  constructor(g) { this.g = g; this.p = []; this.max = 900; }
  clear() { this.p.length = 0; }
  /** one particle: emit('spark', x, y, {vx,vy,g,life,size,color,add,rot,vr,drag,fade}) */
  emit(kind, x, y, o = {}) {
    if (this.p.length > this.max) this.p.splice(0, 40);
    this.p.push({
      k: KIND[kind] ?? 1, x, y,
      vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0,
      life: o.life ?? .6, t: 0, size: o.size ?? 6, color: o.color ?? '#fff',
      rot: o.rot ?? 0, vr: o.vr ?? 0, drag: o.drag ?? 0, add: o.add ?? false,
      wide: o.wide ?? 2, glow: o.glow ?? 0,
    });
  }
  burst(x, y, n = 12, o = {}) {
    const col = o.color || '#fff', cols = Array.isArray(col) ? col : [col];
    const kind = o.kind || 'spark';
    for (let i = 0; i < n; i++) {
      const a = o.ang !== undefined ? o.ang + (Math.random() - .5) * (o.spread ?? TAU) : Math.random() * TAU;
      const sp = (o.speed ?? 260) * (.35 + Math.random() * .9);
      this.emit(kind, x, y, {
        vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        g: o.g ?? 700, life: (o.life ?? .55) * (.6 + Math.random() * .8),
        size: (o.size ?? 6) * (.55 + Math.random() * .9), color: cols[i % cols.length],
        rot: Math.random() * TAU, vr: (Math.random() - .5) * 14, drag: o.drag ?? 1.2, add: o.add ?? (kind === 'spark' || kind === 'glow'),
        wide: o.wide ?? 2.2,
      });
    }
  }
  /** a single expanding ring — the cheapest, punchiest "something happened here" */
  ring(x, y, o = {}) {
    this.emit('ring', x, y, { size: o.r ?? o.size ?? 40, life: o.life ?? .32, color: o.color || '#fff', add: true, wide: o.wide ?? 5 });
    if (this.g.post && o.ripple !== false) this.g.post.ripple(x / this.g.W, y / this.g.H, o.ripple ?? .6);
  }
  /** ring + sparks + smoke + flash: the all-purpose "something exploded" */
  blast(x, y, o = {}) {
    const r = o.r ?? 70, col = o.color || '#ffd34d';
    this.emit('ring', x, y, { size: r, life: o.life ?? .38, color: col, add: true, wide: o.wide ?? 7 });
    this.burst(x, y, o.n ?? 18, { color: o.colors || [col, '#fff', '#ff7a3c'], speed: o.speed ?? r * 5, size: o.size ?? 7, life: .5, kind: 'spark' });
    if (o.smoke !== false) for (let i = 0; i < 6; i++) this.emit('smoke', x + (Math.random() - .5) * r * .5, y + (Math.random() - .5) * r * .5, { vx: (Math.random() - .5) * 90, vy: -30 - Math.random() * 70, g: -20, life: .9 + Math.random() * .5, size: r * (.35 + Math.random() * .4), color: '#2a2f3a', drag: .6 });
    this.g.flash(o.flashC || '#fff', o.flashA ?? .25);
    if (this.g.post) this.g.post.ripple(x / this.g.W, y / this.g.H, o.punch ?? 1);
    this.g.punch(o.punch ?? .05);
    this.g.shake(o.shake ?? 8);
  }
  dust(x, y, n = 5, o = {}) { for (let i = 0; i < n; i++) this.emit('smoke', x + (Math.random() - .5) * (o.spread ?? 26), y, { vx: (Math.random() - .5) * (o.speed ?? 90), vy: -Math.random() * (o.up ?? 60), g: 90, life: .45 + Math.random() * .4, size: (o.size ?? 14) * (.6 + Math.random() * .8), color: o.color || 'rgba(255,255,255,.5)' }); }
  trailDot(x, y, o = {}) { this.emit('glow', x, y, { life: o.life ?? .3, size: o.size ?? 16, color: o.color || '#fff', g: 0, vx: o.vx || 0, vy: o.vy || 0, add: true }); }
  text(x, y, str, o = {}) { this.g.popup(str, x, y, o.color || '#fff', o.size || 34); }
  update(dt) {
    const P = this.p;
    for (let i = P.length - 1; i >= 0; i--) {
      const q = P[i]; q.t += dt;
      if (q.t >= q.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
      if (q.drag) { const d = Math.exp(-q.drag * dt); q.vx *= d; q.vy *= d; }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
    }
  }
  draw(c) {
    const P = this.p; if (!P.length) return;
    c.save();
    let additive = false;
    const addOn = () => { if (!additive) { c.globalCompositeOperation = 'lighter'; additive = true; } };
    const addOff = () => { if (additive) { c.globalCompositeOperation = 'source-over'; additive = false; } };
    for (const q of P) {
      const u = q.t / q.life, fade = 1 - u;
      if (q.add) addOn(); else addOff();
      c.globalAlpha = fade;
      switch (q.k) {
        case KIND.spark: { c.strokeStyle = q.color; c.lineWidth = Math.max(1.2, q.size * .5 * fade); c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x - q.vx * .018, q.y - q.vy * .018); c.stroke(); break; }
        case KIND.glow: { const s = q.size * (1 + u * .8); const gd = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, s); gd.addColorStop(0, q.color); gd.addColorStop(.45, hexAish(q.color, .35)); gd.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gd; c.beginPath(); c.arc(q.x, q.y, s, 0, TAU); c.fill(); break; }
        case KIND.smoke: { c.fillStyle = q.color; c.beginPath(); c.arc(q.x, q.y, q.size * (.6 + u * 1.5), 0, TAU); c.fill(); break; }
        case KIND.debris: case KIND.shard: { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.color; if (q.k === KIND.shard) { c.beginPath(); c.moveTo(-q.size, q.size * .7); c.lineTo(q.size, 0); c.lineTo(-q.size, -q.size * .7); c.closePath(); c.fill(); } else c.fillRect(-q.size / 2, -q.size / 2, q.size, q.size * (.6 + (q.wide || 1) * .2)); c.restore(); break; }
        case KIND.confetti: { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.scale(1, Math.cos(q.rot * 2)); c.fillStyle = q.color; c.fillRect(-q.size / 2, -q.size, q.size, q.size * 2); c.restore(); break; }
        case KIND.ring: { const R = q.size * (.25 + u * 1.1); c.strokeStyle = q.color; c.lineWidth = Math.max(1, q.wide * (1 - u) * .9); c.beginPath(); c.arc(q.x, q.y, R, 0, TAU); c.stroke(); break; }
        case KIND.heart: { heartPath(c, q.x, q.y, q.size * (1 - u * .3)); c.fillStyle = q.color; c.fill(); break; }
        case KIND.feather: { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillStyle = q.color; c.beginPath(); c.ellipse(0, 0, q.size, q.size * .45, 0, 0, TAU); c.fill(); c.restore(); break; }
        case KIND.star: { starPath(c, q.x, q.y, q.size * (1 - u * .5), q.rot); c.fillStyle = q.color; c.fill(); break; }
        case KIND.bubble: { c.strokeStyle = q.color; c.lineWidth = 2; c.beginPath(); c.arc(q.x, q.y, q.size * (.5 + u), 0, TAU); c.stroke(); break; }
        default: { c.fillStyle = q.color; c.beginPath(); c.arc(q.x, q.y, q.size * .5 * fade + .5, 0, TAU); c.fill(); }
      }
    }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.restore();
  }
}
const hexAish = (col, a) => (col[0] === '#' ? hexA(col, a) : col.replace(/rgba?\(([^)]+)\)/, (m, p) => `rgba(${p.split(',').slice(0, 3).join(',')},${a})`).replace('rgb(', 'rgba('));
export function heartPath(c, x, y, s) { c.save(); c.translate(x, y); c.scale(s / 20, s / 20); c.beginPath(); c.moveTo(0, 9); c.bezierCurveTo(-20, -5, -11, -21, 0, -9); c.bezierCurveTo(11, -21, 20, -5, 0, 9); c.closePath(); c.restore(); }
export function starPath(c, x, y, r, rot = 0) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + rot + i * Math.PI / 5, rr2 = i % 2 ? r * .45 : r; const px = x + Math.cos(a) * rr2, py = y + Math.sin(a) * rr2; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); }

/* ================================================================ combo meter */
export function makeCombo(g, o = {}) {
  const c = {
    n: 0, timer: 0, win: o.window ?? 1.5, per: o.per ?? 5, mult: 1, best: 0, pop: 0,
    hit(x, y, label) {
      c.n++; c.timer = c.win; c.best = Math.max(c.best, c.n);
      const m = Math.min(9, 1 + Math.floor(c.n / c.per) * .5);
      const up = m !== c.mult; c.mult = m;
      if (up) { c.pop = 1; g.showBanner(`×${m}`, .5); sfx('powerup', { pitch: comboPitch(c.n) }); }
      if (x !== undefined) g.popup(label || `+${Math.round(10 * c.mult)}`, x, y, up ? '#ffd34d' : '#fff', up ? 46 : 30);
      sfx('coin', { pitch: comboPitch(c.n % 12), vol: .8 });
      return c;
    },
    miss() { c.n = 0; c.mult = 1; c.timer = 0; },
    update(dt) { if (c.timer > 0) { c.timer -= dt; if (c.timer <= 0) c.miss(); } c.pop = Math.max(0, c.pop - dt * 3); },
    draw(ctx) {
      if (c.n < 2) return;
      const k = 1 + c.pop * .5, x = g.W - 26, y = 96;
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.font = '900 52px Impact,"Arial Black",system-ui,sans-serif'; ctx.lineJoin = 'round';
      ctx.lineWidth = 9; ctx.strokeStyle = '#000'; ctx.strokeText(`${c.mult}×`, 0, 0);
      const gd = ctx.createLinearGradient(0, -40, 0, 6); gd.addColorStop(0, '#fff6b0'); gd.addColorStop(1, '#ffb300');
      ctx.fillStyle = gd; ctx.fillText(`${c.mult}×`, 0, 0);
      ctx.font = '900 26px Impact,"Arial Black",system-ui,sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = '#000';
      ctx.strokeText(`${c.n} COMBO`, 0, 30); ctx.fillStyle = '#fff'; ctx.fillText(`${c.n} COMBO`, 0, 30);
      ctx.restore();
    },
    reset() { c.n = 0; c.mult = 1; c.timer = 0; },
  };
  return c;
}

/* ================================================================ Matter.js bridge */
export class Phys {
  constructor(o = {}) {
    if (!Matter) throw new Error('Matter.js missing: add <script src="../_vendor/matter.min.js"></script> before the module');
    const E = this.E = Matter.Engine.create({ gravity: { x: o.gx ?? 0, y: o.gy ?? 1, scale: o.scale ?? .001 } });
    E.positionIterations = o.iterations ?? 8; E.velocityIterations = 6; E.constraintIterations = 3;
    this.world = E.world; this.bodies = [];
    if (o.bounds) {
      const { x, y, w, h, thick = 120 } = o.bounds;
      this.walls = [
        this.add('rect', x + w / 2, y - thick / 2, { w: w + thick * 2, h: thick, static: true, bounce: 0, friction: .9 }),
        this.add('rect', x + w / 2, y + h + thick / 2, { w: w + thick * 2, h: thick, static: true, bounce: 0, friction: .9 }),
        this.add('rect', x - thick / 2, y + h / 2, { w: thick, h: h + thick * 2, static: true, bounce: 0, friction: .9 }),
        this.add('rect', x + w + thick / 2, y + h / 2, { w: thick, h: h + thick * 2, static: true, bounce: 0, friction: .9 }),
      ];
    }
  }
  /** kind: 'rect' | 'circle' | 'poly' | 'trap' */
  add(kind, x, y, o = {}) {
    let body;
    const base = { isStatic: !!o.static, angle: o.angle || 0, friction: o.friction ?? .4, restitution: o.bounce ?? .3, density: o.density ?? .0015, slop: o.slop ?? .02, label: o.label || kind };
    if (kind === 'rect') body = Matter.Bodies.rectangle(x, y, o.w ?? 40, o.h ?? 40, base);
    else if (kind === 'circle') body = Matter.Bodies.circle(x, y, o.r ?? 20, { ...base, friction: o.friction ?? .05, restitution: o.bounce ?? .5 });
    else if (kind === 'poly') body = Matter.Bodies.polygon(x, y, o.sides ?? 6, o.r ?? 24, base);
    else body = Matter.Bodies.fromVertices(x, y, o.verts, base, true);
    body.game = o.game || {};
    if (o.fixed) Matter.Body.setStatic(body, true);
    Matter.Composite.add(this.world, body);
    this.bodies.push(body);
    return body;
  }
  remove(body) { Matter.Composite.remove(this.world, body); const i = this.bodies.indexOf(body); if (i >= 0) this.bodies.splice(i, 1); }
  step(dt, speed = 1) { Matter.Engine.update(this.E, Math.min(33, dt * 1000 * speed)); }
  onHit(cb) { this._hit = cb; if (!this._ev) { this._ev = Matter.Events.on(this.E, 'collisionStart', ev => { for (const p of ev.pairs) this._hit?.(p.bodyA, p.bodyB, p); }); } }
  /** draw every body from its vertices (fill + outline). skipStatic hides the walls. */
  draw(c, o = {}) {
    for (const b of this.bodies) {
      if (o.skipStatic && b.isStatic) continue;
      if (b.game && b.game.hidden) continue;
      const v = b.vertices; c.beginPath(); c.moveTo(v[0].x, v[0].y);
      for (let i = 1; i < v.length; i++) c.lineTo(v[i].x, v[i].y);
      c.closePath();
      const fill = (b.game && b.game.color) || o.color || '#fff';
      c.fillStyle = fill; c.fill();
      if (o.stroke !== 0) { c.lineWidth = o.lw ?? 3; c.strokeStyle = o.stroke || '#000'; c.stroke(); }
    }
  }
}

/* ================================================================ game shell with juice */
export function makeGame(o = {}) {
  const g = createGame(o);
  const W = g.W, H = g.H;
  const cv = document.querySelector('canvas');
  const P = new URLSearchParams(location.search);
  const POST_ON = !P.has('nopost') && P.get('post') !== '0';

  /* --- post fx layer --- */
  let post = null;
  if (POST_ON) {
    post = createPost(+(P.get('postq') || .7));
    if (post) {
      post.cv.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:2;image-rendering:auto';
      document.body.appendChild(post.cv);
      post.bloom = o.bloom ?? .55; post.ca = o.ca ?? .35; post.vig = o.vig ?? .95;
      post.scan = o.scan ?? .3; post.grain = o.grain ?? .04;
    }
  }
  const syncPost = () => { if (!post || !cv) return; const r = cv.getBoundingClientRect(); post.resize(r.width, r.height); post.cv.style.left = r.left + 'px'; post.cv.style.top = r.top + 'px'; };

  g.canvas = cv;
  g.post = post;
  g.fx = new FX(g);
  g.cam = { scale: 1, x: 0, y: 0, rot: 0, z: 1, zv: 0, shx: 0, shy: 0 };
  g.punch = (a = .05) => { g.cam.zv -= a * 6.5; };
  g.combo = makeCombo(g);
  /** one call for a satisfying hit: punch + shake + hitstop + flash + ripple + sfx */
  g.impact = (x, y, o2 = {}) => {
    g.punch(o2.punch ?? .045); g.shake(o2.shake ?? 7); g.hitstop(o2.stop ?? .05);
    if (post && x !== undefined) post.ripple(x / W, y / H, o2.rip ?? 1);
    if (o2.flash) g.flash(o2.flash, o2.flashA ?? .2);
    if (o2.sfx) sfx(o2.sfx, { pitch: o2.pitch || 1 });
  };
  /** hero sprite: drop shadow + optional rim glow, feet at (x,y) */
  g.hero = (ctx, kind, x, y, h, opts = {}) => {
    const dir = opts.dir ?? 1;
    if (opts.shadow !== false) shadow(ctx, x, y - h * .02, h * .28, h * .07, opts.shadowA ?? .26);
    if (opts.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = opts.glow; ctx.fillStyle = opts.glowColor || '#ffd34d'; ctx.beginPath(); ctx.ellipse(x, y - h * .55, h * .34, h * .5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
    drawChar(kind || 'cat', ctx, x, y, h, { dir, color: opts.color, t: opts.t ?? g.t, anim: opts.anim, hurt: opts.hurt });
  };
  /** animated gradient backdrop: cheap, rich, and it blooms beautifully */
  g.sky = (ctx, cols, o2 = {}) => {
    const gd = ctx.createLinearGradient(0, 0, o2.horizontal ? W : 0, o2.horizontal ? 0 : H);
    cols.forEach((c, i) => gd.addColorStop(i / (cols.length - 1), c));
    ctx.fillStyle = gd; ctx.fillRect(0, 0, W, H);
    if (o2.glow) { const gr = ctx.createRadialGradient(W * (o2.gx ?? .5), H * (o2.gy ?? .35), 0, W * (o2.gx ?? .5), H * (o2.gy ?? .35), W * (o2.gr ?? .9)); gr.addColorStop(0, o2.glow); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  };

  /* --- keep audio + mute in sync with the shell's M key --- */
  let lastMuted = g.muted;
  const syncMute = () => { if (g.muted !== lastMuted) { lastMuted = g.muted; setMuted(!!g.muted); } };

  /* --- camera spring --- */
  const camStep = dt => {
    const c = g.cam;
    const k = 190, d = 15.5;
    c.zv += (c.scale - c.z) * k * dt; c.zv -= c.zv * d * dt; c.z += c.zv * dt;
    if (Math.abs(c.z - c.scale) < .0004 && Math.abs(c.zv) < .0004) { c.z = c.scale; c.zv = 0; }
  };
  const camApply = ctx => {
    const c = g.cam; ctx.translate(W / 2 + c.x, H / 2 + c.y); ctx.scale(c.z, c.z);
    if (c.rot) ctx.rotate(c.rot);
    ctx.translate(-W / 2, -H / 2);
  };

  /* --- adaptive quality: if frames are consistently slow, drop the post scale once --- */
  let slow = 0, postDropped = false, lastT = 0, frameAcc = 0;
  g.quality = { auto: true };

  const run = g.run;
  let lastNow = 0, syncTick = 0;
  g.run = (update, draw, hud) => {
    run(
      update,
      ctx => {
        const now = performance.now();
        const raw = lastNow ? Math.min(.05, (now - lastNow) / 1000) : 1 / 60; lastNow = now;
        const d = raw * (g.mode === 'pause' || g.freeze > 0 ? 0 : 1) * (g.mode === 'over' ? .6 : 1) * g.timeScale;
        // juice keeps animating through hitstop / slowmo / game-over, unlike the fixed simulation step
        g.fx.update(d); g.combo.update(d); if (d > 0) camStep(d);
        if (post) { if ((syncTick++ & 15) === 0 || !g._synced) { syncPost(); g._synced = true; } post.render(cv); }
        ctx.save();
        camApply(ctx);
        draw(ctx);
        ctx.restore();
        g.fx.draw(ctx);
        hud?.(ctx);
        g.combo.draw(ctx);
      }
    );
  };

  /* --- forgiving boot ---------------------------------------------------------
     Three authoring styles showed up across the suite: g.run(update, draw),
     g.update/g.draw + g.start(), and (accidentally) just assigning g.draw.
     All three now run: g.start() boots with whatever handlers are assigned, and a
     microtask after the module body boots the loop if nothing else did — a missing
     g.run() used to leave the game as a frozen first frame. */
  let loopStarted = false;
  const __run = g.run;
  g.run = (u, d, h) => { loopStarted = true; __run(u, d, h); };
  g.start = (u, d, h) => { if (loopStarted) return; g.run(u || g.update, d || g.draw, h); };
  queueMicrotask(() => { if (!loopStarted && (g.update || g.draw)) g.start(); });

  /* --- frame pacing watchdog (reads rAF timing, independent of the fixed step) --- */
  if (post) {
    const tick = t => {
      if (lastT) {
        const ms = t - lastT; frameAcc = frameAcc * .9 + ms * .1;
        if (frameAcc > 24) slow++; else slow = Math.max(0, slow - 1);
        if (slow > 90 && !postDropped) { postDropped = true; post.setQuality(.5); slow = 0; }
        if (slow > 150 && postDropped) { post.enabled = false; }
      }
      lastT = t; requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* --- transforms for optional 3D-ish projection games (kart, rail runner) --- */
  g.shaderBG = makeShaderBG;
  return g;
}

/* ================================================================ shader backgrounds
   A low-res WebGL canvas you drawImage under the scene. Cheap (default 256px) and bloom-friendly. */
const BG_FRAGS = {
  nebula: `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uRes;
  float n(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1)))*43758.5);}
  float fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=0.5;}return v;}
  void main(){vec2 uv=vUv;float t=uTime*0.045;vec2 q=uv*2.2+vec2(t,t*0.6);
    float f=fbm(q+fbm(q*1.7+vec2(t*1.4,-t)));
    vec3 a=vec3(0.06,0.05,0.16),b=vec3(0.30,0.12,0.55),c=vec3(0.95,0.42,0.55);
    vec3 col=mix(a,b,smoothstep(0.25,0.85,f));col=mix(col,c,pow(smoothstep(0.62,1.0,f),2.0)*0.75);
    col+=vec3(0.10,0.16,0.42)*(1.0-uv.y);
    gl_FragColor=vec4(col,1.0);}`,
  sunset: `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uRes;
  void main(){vec2 uv=vUv;float y=uv.y;
    vec3 top=vec3(0.10,0.05,0.28),mid=vec3(0.85,0.28,0.42),low=vec3(1.0,0.62,0.28);
    vec3 col=mix(top,mid,smoothstep(0.55,0.34,y));col=mix(col,low,smoothstep(0.34,0.0,y));
    float sun=smoothstep(0.30,0.10,length((uv-vec2(0.5,0.36))*vec2(1.0,1.35)));
    col+=vec3(1.0,0.75,0.35)*sun*0.9;
    col*=1.0-0.16*step(0.5,fract(uv.y*46.0+uTime*0.35));
    gl_FragColor=vec4(col,1.0);}`,
  grid: `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uRes;
  void main(){vec2 uv=vUv;float t=uTime*0.5;
    vec3 col=mix(vec3(0.04,0.02,0.12),vec3(0.35,0.05,0.45),smoothstep(0.75,0.15,abs(uv.y-0.42)));
    float hz=0.42;
    if(uv.y<hz){float d=hz-uv.y;float z=0.12/max(d,0.001);
      float gx=abs(fract((uv.x-0.5)*z*1.4)-0.5);
      float gz=abs(fract(z*1.2-t*1.4)-0.5);
      float line=smoothstep(0.03,0.0,min(gx,gz)*z*0.5);
      col+=vec3(0.15,0.95,1.0)*line*smoothstep(0.0,0.25,d);}
    col+=vec3(1.0,0.3,0.7)*smoothstep(0.02,0.0,abs(uv.y-hz))*0.8;
    gl_FragColor=vec4(col,1.0);}`,
  space: `precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uRes;
  float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);}
  void main(){vec2 uv=vUv;vec3 col=vec3(0.02,0.03,0.08)+vec3(0.04,0.05,0.12)*(1.0-uv.y);
    for(int i=0;i<3;i++){float fi=float(i);vec2 g=floor(uv*vec2(160.0,280.0)+fi*37.0);float r=n(g);
      if(r>0.986){float tw=0.5+0.5*sin(uTime*2.0+r*30.0);col+=vec3(0.9,0.95,1.0)*tw*0.9;}}
    gl_FragColor=vec4(col,1.0);}`,
};

function makeShaderBG(kind = 'nebula', w = 256, h = 456, opts = {}) {
  const cv = document.createElement('canvas');
  const gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false });
  if (!gl) return { cv, update() {}, draw() {} };
  cv.width = opts.w || Math.round(w * .5); cv.height = opts.h || Math.round(h * .5);
  const VS2 = 'attribute vec2 p;varying vec2 vUv;void main(){vUv=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
  const sh = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(x)); return x; };
  const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS2)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, BG_FRAGS[kind] || BG_FRAGS.nebula));
  gl.linkProgram(pr); gl.useProgram(pr);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uT = gl.getUniformLocation(pr, 'uTime'), uR = gl.getUniformLocation(pr, 'uRes');
  let last = -1;
  return {
    cv,
    update(t) { if (Math.abs(t - last) < .02) return; last = t; gl.viewport(0, 0, cv.width, cv.height); gl.uniform1f(uT, t); gl.uniform2f(uR, cv.width, cv.height); gl.drawArrays(gl.TRIANGLES, 0, 3); },
    draw(ctx) { this.update(performance.now() / 1000); ctx.drawImage(cv, 0, 0, w, h); },
  };
}

/** Convenience: parallax star/dust field with depth — used by shmups, space, cave, night scenes. */
export function starfield(n = 90, o = {}) {
  const st = Array.from({ length: n }, () => ({ x: Math.random() * 640, y: Math.random() * 1100, z: .2 + Math.random() * .8, s: .6 + Math.random() * 2.2 }));
  return (ctx, t, speed = 60, W = 540, H = 960, col = '#fff') => {
    for (const s of st) {
      s.y = (s.y + speed * s.z * (1 / 60) + H) % H;
      ctx.globalAlpha = .25 + s.z * .75;
      ctx.fillStyle = col; ctx.fillRect((s.x + W) % W, s.y, s.s * s.z * 1.6, s.s * s.z * 1.6);
    }
    ctx.globalAlpha = 1;
  };
}
