/**
 * kit/gpfx.js — Fullscreen post-processing game effects (WebGL2).
 *
 * Zero dependencies. Plain JS. Works in any game loop:
 *
 *   import { PostFX } from './kit/gpfx.js';
 *   const fx = new PostFX(gameCanvas);   // gameCanvas keeps rendering as normal
 *   document.body.appendChild(fx.canvas); // fx.canvas is what the player sees
 *   function loop(dt) {
 *     updateGame(dt);          // draw to gameCanvas as usual
 *     fx.render(dt);           // applies active effects, presents to screen
 *     requestAnimationFrame(loop);
 *   }
 *
 * Game-friendly triggers:
 *   fx.glitch.burst(1.5);          // screen tear on big hit
 *   fx.vhs.set(true);              // CRT overlay for retro mode / trailers
 *   fx.shatter.trigger();          // screen breaks on death / game over
 *   fx.ripple.trigger(x, y);       // shockwave at normalized (x, y)
 *
 * Effect shaders adapt techniques from Canvas UI (github.com/DavidHDev/canvas-ui,
 * MIT + Commons Clause) — the HTML-capture plumbing is dropped; here the GAME
 * CANVAS is the texture. Complements kit/gpshaders.js (which works at the
 * Three.js material level); gpfx works at the fullscreen post level and is
 * engine-agnostic (2D canvas, Three.js, anything that draws to a <canvas>).
 */

// ---------------------------------------------------------------------------
// Shared fullscreen-quad boilerplate
// ---------------------------------------------------------------------------

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.error('gpfx shader error:', gl.getShaderInfoLog(s));
  }
  return s;
}

function createProgram(gl, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  const uniforms = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const info = gl.getActiveUniform(prog, i);
    uniforms[info.name] = gl.getUniformLocation(prog, info.name);
  }
  return { prog, uniforms };
}

// ---------------------------------------------------------------------------
// Effect shaders (techniques adapted from Canvas UI)
// ---------------------------------------------------------------------------

const FRAG_GLITCH = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uSeed;
uniform float uAmp;      // 0 = off, 1 = full burst
uniform float uSlices;
uniform float uShift;
uniform float uRgbShift;
uniform float uBlocks;
uniform float uNoise;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
void main() {
  vec2 uv = vUv;
  float e = uAmp;
  vec2 guv = uv;
  if (e > 0.001) {
    float band = floor(uv.y * uSlices);
    float pick = hash12(vec2(band, uSeed));
    float tear = step(1.0 - 0.3 * min(e, 1.0), pick);
    float dir = hash12(vec2(band, uSeed + 13.0)) * 2.0 - 1.0;
    guv.x += tear * dir * e * uShift / uRes.x;
    float sub = floor(uv.y * uSlices * 7.0);
    float micro = hash12(vec2(sub, uSeed + 29.0));
    guv.x += (micro - 0.5) * e * uNoise * 3.0 / uRes.x;
    vec2 cell = floor(guv * vec2(10.0, uSlices * 0.5));
    float br = hash12(cell + uSeed * 0.0173);
    if (br > 1.0 - 0.14 * uBlocks * min(e, 1.0)) {
      vec2 jump = vec2(hash12(cell + uSeed + 3.1) - 0.5, hash12(cell + uSeed + 7.7) - 0.5);
      guv += jump * vec2(0.08, 0.02) * e;
    }
  }
  float split = uRgbShift * e / uRes.x;
  vec4 c = texture(uTex, guv);
  float r = texture(uTex, guv + vec2(split, 0.0)).r;
  float b = texture(uTex, guv - vec2(split, 0.0)).b;
  vec4 col = vec4(r, c.g, b, c.a);
  if (e > 0.001 && uNoise > 0.001) {
    float grain = hash12(vUv * uRes + uSeed * 5.3) - 0.5;
    float row = floor(vUv.y * uRes.y);
    float flicker = hash12(vec2(row, uSeed + 41.0));
    float lines = step(0.985 - 0.01 * uNoise * e, flicker);
    col.rgb += (grain * 0.22 + lines * 0.35) * uNoise * min(e, 1.0);
  }
  outColor = vec4(clamp(col.rgb, 0.0, 1.0), 1.0);
}`;

const FRAG_VHS = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uTime;
uniform float uTracking;   // 0..1 tape tracking wobble
uniform float uGrain;      // 0..1 film grain
uniform float uScan;       // 0..1 scanline darkness
uniform float uAberr;      // chromatic aberration px
uniform float uVignette;   // 0..1 edge darkening

float hash(vec2 v) { return fract(sin(dot(v, vec2(89.44, 19.36))) * 22189.22); }
void main() {
  vec2 uv = vUv;
  // tape wobble
  float wob = sin(uv.y * 40.0 + uTime * 3.0) * 0.5 + 0.5;
  uv.x += (hash(vec2(floor(uv.y * 200.0), floor(uTime * 24.0))) - 0.5) * 0.012 * uTracking * (0.3 + wob);
  // occasional vertical roll
  float roll = step(0.995, hash(vec2(floor(uTime * 2.0), 7.0))) * uTracking;
  uv.y = fract(uv.y + roll * fract(uTime * 0.7) * 0.2);
  // chromatic aberration
  float ab = uAberr / uRes.x;
  vec3 col;
  col.r = texture(uTex, uv + vec2(ab, 0.0)).r;
  col.g = texture(uTex, uv).g;
  col.b = texture(uTex, uv - vec2(ab, 0.0)).b;
  // scanlines
  float sl = 0.5 + 0.5 * sin(vUv.y * uRes.y * 3.14159);
  col *= 1.0 - uScan * (1.0 - sl) * 0.5;
  // grain
  col += (hash(vUv * uRes + fract(uTime) * 100.0) - 0.5) * uGrain * 0.25;
  // vignette
  vec2 d = vUv - 0.5;
  col *= 1.0 - uVignette * dot(d, d) * 2.2;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

const FRAG_SHATTER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform float uT;        // 0..1 progress
uniform float uSeed;
uniform float uPieces;   // fracture cell count

// voronoi fracture: each cell gets a random velocity + rotation
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
void main() {
  vec2 uv = vUv;
  vec2 g = uv * uPieces;
  vec2 id = floor(g);
  vec2 f = fract(g);
  // find closest feature point (3x3 voronoi)
  vec2 mr; float md = 8.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 b = vec2(float(i), float(j));
      vec2 r = b + hash22(id + b) - f;
      float d = dot(r, r);
      if (d < md) { md = d; mr = r; }
    }
  vec2 h = hash22(id + floor(mr + 0.5));
  float ang = (h.x - 0.5) * 6.2831 * uT;
  vec2 dir = normalize(h - 0.5 + 0.001);
  float dist = uT * uT * (0.15 + h.y * 0.35);
  // rotate fragment around its cell center, then translate outward
  vec2 cuv = uv - dir * dist;
  float ca = cos(ang), sa = sin(ang);
  vec2 rc = vec2(0.5);
  cuv = rc + mat2(ca, -sa, sa, ca) * (cuv - rc);
  vec3 col = texture(uTex, cuv).rgb;
  // darken gaps between flying pieces
  float edge = smoothstep(0.0, 0.06, uT) * 0.35;
  col *= 1.0 - edge;
  // fade to black at the end
  col *= 1.0 - smoothstep(0.7, 1.0, uT);
  outColor = vec4(col, 1.0);
}`;

const FRAG_RIPPLE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uRipples[8];  // xy = center (uv), z = age, w = strength
uniform int uCount;
uniform float uSpeed;
uniform float uDecay;

void main() {
  vec2 pUv = vUv;
  vec2 frag = pUv * uRes;
  vec2 grad = vec2(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= uCount) break;
    vec4 rp = uRipples[i];
    vec2 dv = frag - rp.xy * uRes;
    float r = length(dv);
    float front = uSpeed * rp.z;
    float s = r - front;
    float env = exp(-s * s / 900.0) * exp(-uDecay * rp.z) * rp.w;
    if (env < 0.002) continue;
    float k = 6.2831 / 24.0;
    float dh = k * cos(s * k) * env;
    grad += (dv / max(r, 1.0)) * dh * 4.0;
  }
  vec2 offs = grad / uRes;
  // chromatic dispersion on the wavefront
  float disp = clamp(length(grad) * 0.15, 0.0, 0.004);
  vec3 col;
  col.r = texture(uTex, pUv + offs * 1.3).r;
  col.g = texture(uTex, pUv + offs).g;
  col.b = texture(uTex, pUv + offs * 0.7).b;
  // specular glint on crest
  float g = length(grad);
  col += vec3(0.9, 0.95, 1.0) * pow(clamp(g * 0.35, 0.0, 1.0), 2.0) * 0.35;
  outColor = vec4(col, 1.0);
}`;

// ---------------------------------------------------------------------------
// PostFX — the game-facing API
// ---------------------------------------------------------------------------

export class PostFX {
  /**
   * @param {HTMLCanvasElement} gameCanvas — your game draws here as usual.
   * PostFX creates its own display canvas; put THAT in the DOM instead.
   */
  constructor(gameCanvas) {
    this.src = gameCanvas;
    this.canvas = document.createElement('canvas');
    this.canvas.width = gameCanvas.width;
    this.canvas.height = gameCanvas.height;
    const gl = this.canvas.getContext('webgl2', { alpha: false, antialias: false });
    if (!gl) throw new Error('gpfx: WebGL2 not available');
    this.gl = gl;

    // fullscreen quad
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // source texture (the game frame)
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.programs = {
      glitch: createProgram(gl, FRAG_GLITCH),
      vhs: createProgram(gl, FRAG_VHS),
      shatter: createProgram(gl, FRAG_SHATTER),
      ripple: createProgram(gl, FRAG_RIPPLE),
    };

    // effect state
    this.glitch = {
      amp: 0, seed: 1, burstAt: -10, burstDur: 0.35, strength: 1,
      burst(s = 1, dur = 0.35) {
        this.seed = Math.random() * 1000;
        this.burstAt = performance.now() / 1000;
        this.burstDur = dur;
        this.strength = s;
      },
    };
    this.vhs = {
      on: false,
      tracking: 0.7, grain: 0.5, scan: 0.6, aberr: 2.0, vignette: 0.5,
      set(on) { this.on = !!on; },
    };
    this.shatter = {
      t: 1, active: false, seed: 1, pieces: 9, dur: 1.2,
      trigger(pieces = 9) {
        this.seed = Math.random() * 100;
        this.pieces = pieces;
        this.t = 0;
        this.active = true;
      },
    };
    this.ripple = {
      list: [], // {x, y, age, strength}
      trigger(x, y, strength = 1) {
        if (this.list.length >= 8) this.list.shift();
        this.list.push({ x, y, age: 0, strength });
      },
    };
    this.time = 0;
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  /** Call every frame after drawing the game. Applies active effects. */
  render(dt) {
    const gl = this.gl;
    this.time += dt;
    const W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);

    // upload game frame
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.src);

    // ---- glitch envelope ----
    let gAmp = 0;
    const g = this.glitch;
    const since = this.time - g.burstAt;
    if (since >= 0 && since < g.burstDur) {
      const k = 1 - since / g.burstDur;
      gAmp = k * k * g.strength;
    }

    // ---- shatter progress ----
    const sh = this.shatter;
    if (sh.active) {
      sh.t += dt / sh.dur;
      if (sh.t >= 1) { sh.t = 1; }
    }

    // ---- ripple ages ----
    const rp = this.ripple;
    for (const r of rp.list) r.age += dt;
    while (rp.list.length && rp.list[0].age > 3) rp.list.shift();

    // determine which pass to run (priority: shatter > glitch > ripple > vhs > passthrough)
    let pass = null;
    if (sh.active && sh.t < 1) pass = 'shatter';
    else if (gAmp > 0.001) pass = 'glitch';
    else if (rp.list.length) pass = 'ripple';
    else if (this.vhs.on) pass = 'vhs';

    if (!pass) {
      // passthrough: plain blit
      this._blit();
      return;
    }

    const { prog, uniforms } = this.programs[pass];
    gl.useProgram(prog);
    gl.uniform1i(uniforms.uTex, 0);
    if (uniforms.uRes) gl.uniform2f(uniforms.uRes, W, H);

    if (pass === 'glitch') {
      gl.uniform1f(uniforms.uSeed, g.seed);
      gl.uniform1f(uniforms.uAmp, Math.min(gAmp, 2));
      gl.uniform1f(uniforms.uSlices, 24);
      gl.uniform1f(uniforms.uShift, 30);
      gl.uniform1f(uniforms.uRgbShift, 4);
      gl.uniform1f(uniforms.uBlocks, 0.5);
      gl.uniform1f(uniforms.uNoise, 0.35);
    } else if (pass === 'vhs') {
      const v = this.vhs;
      gl.uniform1f(uniforms.uTime, this.time);
      gl.uniform1f(uniforms.uTracking, v.tracking);
      gl.uniform1f(uniforms.uGrain, v.grain);
      gl.uniform1f(uniforms.uScan, v.scan);
      gl.uniform1f(uniforms.uAberr, v.aberr);
      gl.uniform1f(uniforms.uVignette, v.vignette);
    } else if (pass === 'shatter') {
      gl.uniform1f(uniforms.uT, sh.t);
      gl.uniform1f(uniforms.uSeed, sh.seed);
      gl.uniform1f(uniforms.uPieces, sh.pieces);
    } else if (pass === 'ripple') {
      const arr = new Float32Array(8 * 4);
      const n = Math.min(rp.list.length, 8);
      for (let i = 0; i < n; i++) {
        const r = rp.list[i];
        arr[i * 4] = r.x; arr[i * 4 + 1] = r.y;
        arr[i * 4 + 2] = r.age; arr[i * 4 + 3] = r.strength;
      }
      gl.uniform4fv(uniforms.uRipples, arr);
      gl.uniform1i(uniforms.uCount, n);
      gl.uniform1f(uniforms.uSpeed, 320);
      gl.uniform1f(uniforms.uDecay, 1.4);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  _blit() {
    // plain GL texture copy when no effect is active
    const gl = this.gl;
    if (!this._blitProg) {
      this._blitProg = createProgram(gl, `precision highp float;
        in vec2 vUv; out vec4 o; uniform sampler2D uTex;
        void main(){ o = texture(uTex, vUv); }`);
    }
    const { prog, uniforms } = this._blitProg;
    gl.useProgram(prog);
    gl.uniform1i(uniforms.uTex, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  destroy() {
    const gl = this.gl;
    for (const k of Object.keys(this.programs)) gl.deleteProgram(this.programs[k].prog);
    gl.deleteTexture(this.tex);
  }
}

// ---------------------------------------------------------------------------
// Standalone helpers (no PostFX needed)
// ---------------------------------------------------------------------------

/**
 * applyVHSOverlay(canvas) — permanent CRT look without the PostFX loop.
 * Draws scanlines + vignette + grain onto a 2D canvas once. Cheap; good for
 * static title screens and menu backgrounds.
 */
export function applyVHSOverlay(canvas, { scan = 0.25, vignette = 0.4, grain = 0.06 } = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const sl = (y % 3 === 0) ? (1 - scan) : 1;
    const vy = 1 - vignette * Math.pow(Math.abs(y / H - 0.5) * 2, 2) * 0.5;
    for (let x = 0; x < W; x++) {
      const vx = 1 - vignette * Math.pow(Math.abs(x / W - 0.5) * 2, 2) * 0.5;
      const i = (y * W + x) * 4;
      const n = 1 + (Math.random() - 0.5) * grain * 2;
      d[i] *= sl * vx * vy * n;
      d[i + 1] *= sl * vx * vy * n;
      d[i + 2] *= sl * vx * vy * n;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

/**
 * glitchFrame(canvas, intensity=1) — one-shot 2D glitch for thumbnails and
 * trailer title cards. Slices + RGB split + noise, no WebGL needed.
 */
export function glitchFrame(canvas, intensity = 1) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const src = document.createElement('canvas');
  src.width = W; src.height = H;
  src.getContext('2d').drawImage(canvas, 0, 0);
  const slices = Math.round(8 + Math.random() * 16 * intensity);
  for (let s = 0; s < slices; s++) {
    const y = Math.random() * H;
    const h = 4 + Math.random() * 30;
    const dx = (Math.random() - 0.5) * 60 * intensity;
    ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
  }
  // RGB split on a random band
  const by = Math.random() * H, bh = 20 + Math.random() * 60;
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.6 * intensity;
  ctx.drawImage(src, 0, by, W, bh, 3 * intensity, by, W, bh);
  ctx.drawImage(src, 0, by, W, bh, -3 * intensity, by, W, bh);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // noise
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 40 * intensity;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
