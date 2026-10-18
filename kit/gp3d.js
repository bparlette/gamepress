// gp3d: the ~100 lines every three.js demo in this folder shares. Portrait-first stage, fixed-step loop
// (deterministic under gamepress's virtual clock), input, HUD, synth sfx, event log for capture scripts.
import * as THREE from './three.module.min.js';
export { THREE };

export const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const events = (window.__events = []);
let ac, muted = false;
export const setMuted = m => { muted = m; };
/** Tiny synth. Logs every call to window.__events so gamepress can rebuild the audio offline. */
export function sfx(type, vol = 1) {
  events.push({ t: +(performance.now() / 1000).toFixed(2), type });
  if (muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain(); o.connect(g); g.connect(ac.destination);
    const P = { boom: ['sawtooth', 100, 28, .45, .5], pop: ['sine', 500, 900, .06, .12], ding: ['sine', 1320, 1320, .35, .15], crash: ['square', 240, 60, .25, .2], whoosh: ['triangle', 320, 90, .2, .15],
      splat: ['sine', 200, 60, .16, .25], snap: ['sawtooth', 900, 120, .12, .3], tick: ['square', 700, 700, .03, .05], win: ['triangle', 520, 1040, .4, .25], meow: ['sawtooth', 900, 420, .3, .12], groan: ['sawtooth', 120, 60, .5, .2], goo: ['sine', 160, 50, .2, .3], zoom: ['sawtooth', 80, 240, .4, .15] }[type] || ['sine', 440, 440, .1, .1];
    o.type = P[0]; o.frequency.setValueAtTime(P[1], t); o.frequency.exponentialRampToValueAtTime(P[2], t + P[3]);
    g.gain.setValueAtTime(P[4] * vol, t); g.gain.exponentialRampToValueAtTime(.001, t + P[3] + .02); o.start(t); o.stop(t + P[3] + .05);
  } catch {}
}

/** Render styles: toon (default) | roblox | comic | painted | pixel16 | pixel8. Pick with createStage({style}) or ?style= (the URL wins, so any game can be previewed in any style). */
export const STYLES = ['toon', 'roblox', 'comic', 'painted', 'pixel16', 'pixel8'];
const POST_FRAG = `uniform sampler2D t; uniform vec2 res; uniform int mode; uniform float time; varying vec2 vUv;
float lum(vec3 c){ return dot(c, vec3(.299,.587,.114)); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(.06711056,.00583715)))); }
vec3 S(vec2 uv){ return pow(max(texture2D(t, uv).rgb, 0.), vec3(1./2.2)); }
vec3 sat(vec3 c, float k){ return mix(vec3(lum(c)), c, k); }
float edge(vec2 uv, float px){ vec2 o = px / res; float a=lum(S(uv+vec2(-o.x,-o.y))),b=lum(S(uv+vec2(0,-o.y))),c=lum(S(uv+vec2(o.x,-o.y))),d=lum(S(uv+vec2(-o.x,0))),f=lum(S(uv+vec2(o.x,0))),g=lum(S(uv+vec2(-o.x,o.y))),h=lum(S(uv+vec2(0,o.y))),i=lum(S(uv+vec2(o.x,o.y)));
  float gx=-a-2.*d-g+c+2.*f+i, gy=-a-2.*b-c+g+2.*h+i; return sqrt(gx*gx+gy*gy); }
void main(){ vec2 uv = vUv; vec3 c = S(uv); vec2 px = gl_FragCoord.xy;
  if (mode == 1) { vec3 L = vec3(7.,7.,3.); c = sat(c, 1.25); c = floor(c * L + ign(floor(uv * res)) ) / L; }
  else if (mode == 2) { vec3 L = vec3(15.); c = sat(c, 1.15); c = floor(c * L + .35 + .3 * ign(floor(uv * res))) / L; }
  else if (mode == 3) { float e = edge(uv, 1.4); float line = smoothstep(.10, .26, e); c = sat(c, 1.45); c = floor(c * 5. + .5) / 5.; float l = lum(c);
    vec2 q = mat2(.707,-.707,.707,.707) * (px / (res.y / 120.)); float dd = length(fract(q) - .5); c *= 1. - .45 * step(dd, (1. - l) * .62) * step(l, .62); c = mix(c, vec3(.05,.04,.06), line * .92); }
  else if (mode == 4) { vec2 n = (vec2(hash(floor(px/3.)), hash(floor(px/3.)+7.)) - .5) * 2.2 / res; vec3 b = vec3(0.); for (int k = 0; k < 8; k++) { float a = float(k) * .785398; b += S(uv + n + vec2(cos(a), sin(a)) * 2.4 / res); } b /= 8.; c = mix(b, c, .3); c = floor(c * 9. + .5) / 9.; c = sat(c, .92) * vec3(1.05, 1., .93);
    c -= smoothstep(.15, .5, edge(uv, 1.6)) * .22; c *= .94 + .06 * hash(floor(px / 2.)); }
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.); }`;

export function createStage({ bg = 0x101820, fov = 50, fitWidth = 10, fog, style = 'toon' } = {}) {
  const STYLE = STYLES.includes(new URLSearchParams(location.search).get('style')) ? new URLSearchParams(location.search).get('style') : (STYLES.includes(style) ? style : 'toon'); window.__style = STYLE;
  const POST = { pixel8: 1, pixel16: 2, comic: 3, painted: 4 }[STYLE] || 0; let rt, postScene, postCam, postMat;
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  const dpr = Math.min(devicePixelRatio || 1, +(new URLSearchParams(location.search).get('dpr') || 2));
  renderer.setPixelRatio(dpr); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
  document.body.style.cssText = 'margin:0;overflow:hidden;background:#000;touch-action:none;font-family:Impact,"Arial Black",system-ui,sans-serif';
  document.body.appendChild(renderer.domElement); renderer.domElement.style.cssText = 'display:block;width:100vw;height:100vh;filter:saturate(1.25) contrast(1.07)';
  const vig = document.createElement('div'); vig.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.42) 100%)'; document.body.appendChild(vig);
  let st_render; const scene = new THREE.Scene(); scene.background = new THREE.Color(bg); if (fog) scene.fog = new THREE.Fog(bg, fog[0], fog[1]);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 500);
  const st = { THREE, style: STYLE, renderer, scene, camera, fitWidth, shakeAmt: 0, keys: {}, ptr: { x: 0, y: 0, down: false }, t: 0 };
  if (POST) { postMat = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, res: { value: new THREE.Vector2(1, 1) }, mode: { value: POST }, time: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }', fragmentShader: POST_FRAG, depthTest: false, depthWrite: false, toneMapped: false });
    postScene = new THREE.Scene(); postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMat)); postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); }
  const sizeRT = () => { if (!POST) return; const d = renderer.getPixelRatio(); let w = Math.round(innerWidth * d), h = Math.round(innerHeight * d); if (POST < 3) { h = POST === 1 ? 144 : 288; w = Math.max(8, Math.round(h * innerWidth / innerHeight)); }
    rt?.dispose(); const f = POST < 3 ? THREE.NearestFilter : THREE.LinearFilter; rt = new THREE.WebGLRenderTarget(w, h, { minFilter: f, magFilter: f, samples: POST < 3 ? 0 : 4 }); postMat.uniforms.t.value = rt.texture; postMat.uniforms.res.value.set(w, h); };
  st_render = () => { if (!POST) return renderer.render(scene, camera); renderer.setRenderTarget(rt); renderer.render(scene, camera); renderer.setRenderTarget(null); postMat.uniforms.time.value = performance.now() / 1000; renderer.render(postScene, postCam); };
  const resize = () => { renderer.setSize(innerWidth, innerHeight, false); sizeRT(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    st.dist = (st.fitWidth / 2) / (Math.tan(THREE.MathUtils.degToRad(fov / 2)) * camera.aspect); };
  addEventListener('resize', resize); resize(); st.resize = resize;
  addEventListener('keydown', e => { st.keys[e.key.toLowerCase()] = true; if (e.key === ' ' || e.key.startsWith('Arrow')) e.preventDefault(); });
  addEventListener('keyup', e => { st.keys[e.key.toLowerCase()] = false; });
  const setPtr = e => { st.ptr.x = e.clientX / innerWidth * 2 - 1; st.ptr.y = e.clientY / innerHeight * 2 - 1; };
  addEventListener('pointerdown', e => { st.ptr.down = true; setPtr(e); st.onPointerDown?.(e); }); addEventListener('pointermove', setPtr);
  addEventListener('pointerup', () => { st.ptr.down = false; st.onPointerUp?.(); });
  // HUD
  const hud = document.createElement('div'); hud.style.cssText = 'position:fixed;inset:0;pointer-events:none;color:#fff;font-size:5vmin;text-shadow:0 .5vmin 0 #000,0 0 1.2vmin #000';
  hud.innerHTML = '<div id="h-l" style="position:absolute;left:4vw;top:2.5vh"></div><div id="h-r" style="position:absolute;right:4vw;top:2.5vh;text-align:right"></div>' +
    '<div id="h-c" style="position:absolute;left:0;right:0;top:40%;text-align:center;font-size:10vmin;color:#ffd34d"></div><div id="h-b" style="position:absolute;left:0;right:0;bottom:5vh;text-align:center;font-size:3.8vmin;font-family:system-ui,sans-serif;font-weight:800;opacity:.9"></div>';
  document.body.appendChild(hud);
  const q = id => hud.querySelector(id); let bannerT = 0;
  st.hud = { left: s => (q('#h-l').innerHTML = s), right: s => (q('#h-r').innerHTML = s), hint: s => (q('#h-b').textContent = new URLSearchParams(location.search).has('clean') ? '' : s),
    banner(s, secs = 1.2) { q('#h-c').textContent = s; bannerT = secs; }, _tick(dt) { if (bannerT > 0 && (bannerT -= dt) <= 0) q('#h-c').textContent = ''; } };
  const stats = (window.__gpStats = window.__gpStats || { shell: false, hitstops: 0, shakes: 0, popups: 0, flashes: 0, particles: 0, audioEvents: 0, cameraMoved: false, customGeo: false, walkAnimated: false, ends: 0 });
  let initCamPos = null;
  st.shake = a => { stats.shakes++; st.shakeAmt = Math.max(st.shakeAmt, a); };
  // ---- game feel: hit-stop, slow-mo, FOV kick, screen flash, floating text, scripted camera moves
  st.freeze = 0; st.timeScale = 1; st.slowT = 0; st.paused = false; st.kickFov = 0; st.cineKeys = null; let flashA = 0, flashC = '#fff';
  const flashEl = document.createElement('div'); flashEl.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0'; document.body.appendChild(flashEl);
  const pops = []; const popLayer = document.createElement('div'); popLayer.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden'; document.body.appendChild(popLayer);
  st.hitstop = (sec = .06) => { stats.hitstops++; st.freeze = Math.max(st.freeze, sec); };
  st.slowmo = (factor = .3, secs = 1) => { stats.hitstops++; st.timeScale = factor; st.slowT = secs; };
  st.flash = (color = '#fff', a = .5) => { stats.flashes++; flashA = a; flashC = color; };
  st.kick = (deg = 6) => { stats.hitstops++; st.kickFov = Math.max(st.kickFov, deg); };
  /** Floating text at a world position (pos {x,y,z}); rises and fades over ~0.9 s of game time. */
  st.popup = (text, pos, color = '#ffd34d', size = 6) => { stats.popups++; const el = document.createElement('div'); el.textContent = text; el.style.cssText = `position:absolute;font-size:${size}vmin;color:${color};font-weight:900;text-shadow:0 .5vmin 0 #000,0 0 1vmin #000;transform:translate(-50%,-50%);white-space:nowrap`; popLayer.appendChild(el); pops.push({ el, p: { x: pos.x, y: pos.y, z: pos.z }, t: 0 }); if (pops.length > 24) pops.shift().el.remove(); };
  /** Scripted camera move: keys [{t, p:[dx,dy,dz], fov}] in game seconds; offsets are added to the camera after the game positions it. */
  st.cine = keys => { stats.cameraMoved = true; st.cineKeys = keys; };
  // ---- shell: title card, pause, results with best score, replay, mute. Skipped under ?auto / ?clean so capture stays clean.
  const qs = new URLSearchParams(location.search), PACK = qs.has('pack'), CLEAN = qs.has('clean') || qs.has('auto') || qs.get('autostart') === '1' || qs.get('spectate') === '1';
  // ---- bot contract (?auto=1): lose first, then win. Mirrors gp2d: attempt 0 plays badly
  // (st.dumb()), and a loss auto-restarts after 2.4 s. gamepress botcheck proves the timeline.
  const AUTO = qs.has('auto');
  st.auto = AUTO; st.attempt = 0;
  st.dumb = () => AUTO && st.attempt === 0 && qs.get('failfirst') !== '0';
  const ov = document.createElement('div'); ov.style.cssText = 'position:fixed;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;text-align:center;color:#fff;background:rgba(8,10,20,.72);font-size:5vmin;text-shadow:0 .6vmin 0 #000;z-index:9'; document.body.appendChild(ov);
  let shellOn = false, ended = false, endT = 0, shellId = 'game';
  const show = html => { ov.innerHTML = html; ov.style.display = 'flex'; }, hide = () => { ov.style.display = 'none'; };
  st.shell = ({ id, title, sub = 'Tap or press any key to start', onReset } = {}) => {
    stats.shell = true; shellId = id || 'game'; st.onReset = onReset; shellOn = true;
    if (!CLEAN && !PACK) { st.paused = true; show(`<div style="font-size:12vmin;color:#ffd34d;line-height:1">${title}</div><div style="font-size:4vmin;margin-top:3vh;font-family:system-ui,sans-serif;font-weight:800">${sub}</div>`); }
    const go = () => { if (st.paused && !ended) { st.paused = false; hide(); st.onStart?.(); } else if (ended && endT > .8) { ended = false; hide(); st.onReset?.(); } };
    addEventListener('pointerdown', go); addEventListener('keydown', e => {
      if (e.key === 'm' || e.key === 'M') { muted = !muted; } else if ((e.key === 'p' || e.key === 'P' || e.key === 'Escape') && !ended && !st.paused) { st.paused = true; show('<div style="font-size:12vmin">PAUSED</div><div style="font-size:4vmin;font-family:system-ui,sans-serif">tap to resume · M mutes</div>'); }
      else if (!e.repeat) go(); });
  };
  /** Show the results panel. Best score is kept per game id in localStorage. */
  st.end = ({ win = false, score = 0, label = 'SCORE' } = {}) => {
    if (ended) return; stats.ends++; ended = true; endT = 0; let best = 0; try { best = +localStorage.getItem('gp-best-' + shellId) || 0; if (score > best) { best = score; localStorage.setItem('gp-best-' + shellId, best); } } catch {}
    st.result = { win, score, best }; window.__result = st.result; if (PACK) try { parent.postMessage({ gp: 'end', id: shellId, win, score: Math.round(score) }, '*'); } catch {} (window.__ends = window.__ends || []).push({ t: +(performance.now() / 1000).toFixed(1), win, score: Math.round(score), attempt: st.attempt, state: JSON.stringify(window.__game || {}) });
    if (shellOn && !CLEAN && !PACK) show(`<div style="font-size:12vmin;color:${win ? '#7dff7d' : '#ff6b6b'}">${win ? 'YOU WIN' : 'GAME OVER'}</div><div style="margin-top:2vh">${label} <b style="color:#ffd34d">${score.toLocaleString()}</b></div><div style="font-size:3.6vmin;margin-top:1vh;font-family:system-ui,sans-serif">BEST ${best.toLocaleString()}</div><div style="font-size:3.6vmin;margin-top:4vh;font-family:system-ui,sans-serif;font-weight:800">tap or press any key to play again</div>`);
  };
  st.rearm = () => { ended = false; }; st.isEnded = () => ended; st.endTick = dt => { if (ended) endT += dt; };
  /** update(dt) runs at a fixed 1/60 s (scaled by slow-mo); render happens once per animation frame. */
  st.run = (update, pre) => {
    let last = 0, acc = 0, baseFov = camera.fov;
    const frame = ts => {
      acc += Math.min(0.1, (ts - last) / 1000 || 0.016); last = ts;
      while (acc >= 1 / 60) {
        acc -= 1 / 60; st.endTick(1 / 60); if (st.paused) continue;
        // bot contract: under ?auto=1 a loss restarts itself after 2.4 s (mirrors gp2d)
        if (ended && AUTO && endT > 2.4 && !st.result?.win) { st.attempt++; ended = false; endT = 0; st.result = null; hide(); st.onReset?.(); }
        if (st.freeze > 0) { st.freeze -= 1 / 60; continue; }
        if (st.slowT > 0 && (st.slowT -= 1 / 60) <= 0) st.timeScale = 1;
        const dt = 1 / 60 * st.timeScale; st.t += dt; update(dt); st.hud._tick(dt); st.shakeAmt = Math.max(0, st.shakeAmt - 1.2 / 60 * 10);
        for (let i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; pops[i].p.y += dt * 2; if (pops[i].t > .9) { pops[i].el.remove(); pops.splice(i, 1); } }
        st.kickFov *= .9; flashA *= .88;
      }
      pre?.();
      if (!initCamPos && st.t > 0.1) initCamPos = camera.position.clone();
      else if (initCamPos && camera.position.distanceTo(initCamPos) > 0.35) stats.cameraMoved = true;
      if (st.cineKeys) { const k = st.cineKeys; let i = k.findIndex(x => x.t > st.t); if (i < 0) i = k.length; const a = k[Math.max(0, i - 1)], b = k[Math.min(k.length - 1, i)], u = b.t > a.t ? clamp((st.t - a.t) / (b.t - a.t), 0, 1) : 1, e = u * u * (3 - 2 * u);
        camera.position.x += a.p[0] + (b.p[0] - a.p[0]) * e; camera.position.y += a.p[1] + (b.p[1] - a.p[1]) * e; camera.position.z += a.p[2] + (b.p[2] - a.p[2]) * e; }
      const fv = baseFov + st.kickFov + (st.cineKeys ? 0 : 0); if (camera.fov !== fv) { camera.fov = fv; camera.updateProjectionMatrix(); }
      if (st.shakeAmt > 0) { camera.position.x += rand(-1, 1) * st.shakeAmt * .02; camera.position.y += rand(-1, 1) * st.shakeAmt * .02; }
      st_render();
      flashEl.style.background = flashC; flashEl.style.opacity = flashA > .01 ? flashA : 0;
      for (const p of pops) { const v = new THREE.Vector3(p.p.x, p.p.y, p.p.z).project(camera); p.el.style.left = (v.x * .5 + .5) * innerWidth + 'px'; p.el.style.top = (-v.y * .5 + .5) * innerHeight + 'px'; p.el.style.opacity = String(1 - p.t / .9); }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };
  st.light = () => { scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1)); const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(4, 10, 6); scene.add(d); };
  return st;
}

/** One InstancedMesh with per-instance colour; returns helpers to set matrix/colour cheaply. */
export function instances(geo, mat, count, { dynamic = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  if (dynamic) m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  m.frustumCulled = false; m.count = count;
  const o = new THREE.Object3D(), c = new THREE.Color();
  return { mesh: m, set(i, x, y, z, sx = 1, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0) { o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz); o.updateMatrix(); m.setMatrixAt(i, o.matrix); },
    color(i, hex) { c.setHex(hex); m.setColorAt(i, c); }, hsl(i, h, s, l) { c.setHSL(h, s, l); m.setColorAt(i, c); }, done() { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } };
}
