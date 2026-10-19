// Slashers Paradise rendering source, extracted from game/src/render.js (Three.js 0.169).
// 2. Post-processing, in run order each frame:
//    a) scene -> half-float RT (4x MSAA on HIGH)
//    b) BRIGHT pass: keep pixels with max channel > ~0.62 -> quarter-res buffer
//    c) BLUR: separable 5-tap Gaussian, horizontal then vertical, x2 iterations
//    d) COMPOSITE (single shader, in this order): Kuwahara paint filter -> + bloom*0.75 ->
//       color grade (cool shadows / warm highlights / gamma / saturation 1.25 / soft shoulder / S-curve)
//       -> paper grain + fibers -> vignette -> kill-moment red ink vignette -> flash
//    On LOW quality, Kuwahara and bloom are switched off (uPaint=0, uBloomOn=0).
//    Shared via hark.site for study. Ported to gamepress kit/slashido/.
import * as THREE from 'three';

const FS_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BRIGHT_FRAG = `uniform sampler2D tDiffuse; varying vec2 vUv;
void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(0.62, 1.0, l), 1.0); }`;
const BLUR_FRAG = `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb*0.227;
  s += texture2D(tDiffuse, vUv+uDir*1.38).rgb*0.316; s += texture2D(tDiffuse, vUv-uDir*1.38).rgb*0.316;
  s += texture2D(tDiffuse, vUv+uDir*3.23).rgb*0.07; s += texture2D(tDiffuse, vUv-uDir*3.23).rgb*0.07;
  gl_FragColor = vec4(s, 1.0); }`;
const COMP_FRAG = `uniform sampler2D tDiffuse, tBloom; uniform vec2 uRes; uniform float uTime, uPaint, uBloomOn, uFlash, uKill, uBlind, uVig;
varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
vec3 kuwa(vec2 uv){
  vec2 px = 1.0/uRes; vec3 m[4]; vec3 s[4];
  for(int k=0;k<4;k++){ m[k]=vec3(0.); s[k]=vec3(0.); }
  for(int j=-2;j<=2;j++) for(int i=-2;i<=2;i++){
    vec3 c = texture2D(tDiffuse, uv + vec2(float(i),float(j))*px*1.15).rgb;
    if(i<=0 && j<=0){ m[0]+=c; s[0]+=c*c; }
    if(i>=0 && j<=0){ m[1]+=c; s[1]+=c*c; }
    if(i<=0 && j>=0){ m[2]+=c; s[2]+=c*c; }
    if(i>=0 && j>=0){ m[3]+=c; s[3]+=c*c; }
  }
  float best = 1e9; vec3 res = vec3(0.);
  for(int k=0;k<4;k++){ vec3 mu = m[k]/9.0; vec3 v = abs(s[k]/9.0 - mu*mu); float sv = v.r+v.g+v.b; if(sv<best){best=sv; res=mu;} }
  return res;
}
void main(){
  vec2 uv = vUv;
  vec3 c = uPaint > 0.5 ? kuwa(uv) : texture2D(tDiffuse, uv).rgb;
  if(uBloomOn > 0.5) c += texture2D(tBloom, uv).rgb * 0.75;
  float l = dot(c, vec3(0.299,0.587,0.114));
  c = mix(c, c*vec3(0.85,0.97,1.18), (1.0-smoothstep(0.0,0.45,l))*0.5);
  c = mix(c, c*vec3(1.08,1.0,0.9), smoothstep(0.5,1.0,l)*0.4);
  c = pow(max(c, 0.0), vec3(0.94)) * 1.06;
  c = mix(vec3(l), c, 1.25);
  c = max(c - 0.015, 0.0) * 1.05;
  vec3 over = max(c - 0.8, 0.0); c = min(c, vec3(0.8)) + 0.2 * (1.0 - exp(-over * 3.0));
  c = c*c*(3.0-2.0*c)*0.35 + c*0.65;
  vec2 p = uv*uRes;
  float grain = n2(p*0.35)*0.5 + n2(p*0.9+3.0)*0.3 + h(p+fract(uTime))*0.2;
  float fibers = n2(vec2(p.x*0.05, p.y*0.9)) * n2(vec2(p.x*0.9, p.y*0.05));
  c *= 0.95 + grain*0.08 + fibers*0.05;
  vec2 q = uv - 0.5; float vig = 1.0 - dot(q*vec2(1.0,1.25), q*vec2(1.0,1.25))*uVig;
  c *= clamp(vig, 0.0, 1.0);
  c = mix(c, c*vec3(1.15,0.7,0.65), uKill*0.4);
  c = mix(c, vec3(0.3,0.0,0.02), uKill*smoothstep(0.3,0.75,length(q))*0.7);
  c = mix(c, vec3(0.22,0.16,0.1)*(0.6+n2(p*0.02+uTime)*0.6), uBlind*0.0);
  c += uFlash;
  gl_FragColor = vec4(c, 1.0);
}`;

export class Post {
  constructor(renderer, quality) {
    this.r = renderer; this.quality = quality;
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
    this.scene = new THREE.Scene(); this.scene.add(this.quad);
    this.bright = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null } }, vertexShader: FS_VERT, fragmentShader: BRIGHT_FRAG });
    this.blur = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } }, vertexShader: FS_VERT, fragmentShader: BLUR_FRAG });
    this.comp = new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, tBloom: { value: null }, uRes: { value: new THREE.Vector2() }, uTime: { value: 0 },
        uPaint: { value: 1 }, uBloomOn: { value: 1 }, uFlash: { value: 0 }, uKill: { value: 0 }, uBlind: { value: 0 }, uVig: { value: 1.1 } },
      vertexShader: FS_VERT, fragmentShader: COMP_FRAG });
    this.setQuality(quality);
  }
  setQuality(q) {
    this.quality = q;
    const hi = q === 'high';
    this.comp.uniforms.uPaint.value = hi ? 1 : 0;
    this.comp.uniforms.uBloomOn.value = hi ? 1 : 0;
    this.dispose();
    this.size = null;
  }
  dispose() { for (const t of [this.rt, this.b1, this.b2]) if (t) t.dispose(); this.rt = this.b1 = this.b2 = null; }
  ensure(w, h) {
    if (this.size && this.size[0] === w && this.size[1] === h) return;
    this.dispose(); this.size = [w, h];
    const hi = this.quality === 'high';
    this.rt = new THREE.WebGLRenderTarget(w, h, { samples: hi ? 4 : 0, type: THREE.HalfFloatType });
    const bw = Math.max(2, w >> 2), bh = Math.max(2, h >> 2);
    this.b1 = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
    this.b2 = new THREE.WebGLRenderTarget(bw, bh, { type: THREE.HalfFloatType });
    this.comp.uniforms.uRes.value.set(w, h);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.scene, this.cam); }
  render(scene, camera, time) {
    const size = this.r.getDrawingBufferSize(new THREE.Vector2());
    this.ensure(size.x, size.y);
    this.r.setRenderTarget(this.rt); this.r.render(scene, camera);
    if (this.comp.uniforms.uBloomOn.value > 0.5) {
      this.bright.uniforms.tDiffuse.value = this.rt.texture; this.pass(this.bright, this.b1);
      for (let i = 0; i < 2; i++) {
        this.blur.uniforms.tDiffuse.value = this.b1.texture; this.blur.uniforms.uDir.value.set(1 / this.b1.width, 0); this.pass(this.blur, this.b2);
        this.blur.uniforms.tDiffuse.value = this.b2.texture; this.blur.uniforms.uDir.value.set(0, 1 / this.b1.height); this.pass(this.blur, this.b1);
      }
    }
    this.comp.uniforms.tDiffuse.value = this.rt.texture; this.comp.uniforms.tBloom.value = this.b1.texture;
    this.comp.uniforms.uTime.value = time;
    this.pass(this.comp, null);
  }
}
