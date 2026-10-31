/* glpost.js: WebGL post-processing for HD builds (global GLPOST). Copies the finished 2D frame (#screen, incl. HUD text) into a texture and draws it
   through one fragment shader: bloom (2 rings of bright taps), edge chromatic aberration, teal/orange colour grade, vignette, film grain.
   A second canvas #gl sits over #screen; if WebGL is unavailable nothing happens and the plain 2D frame stays visible. */
const GLPOST = (() => {
  const P = { on:false, q:{ bloom:1, grade:1, ca:1, grain:1, vig:1 }, lights:[], haze:[], fx:{ ca:0, hurt:0, flash:0, ember:0 }, ambient:1 };
  /* per-frame API (coords normalised 0..1 of the screen): GLPOST.clear(); GLPOST.light(x,y,radius,intensity,[r,g,b]); GLPOST.hazeAt(x,y,radius,strength); GLPOST.fx.{ca,hurt,flash,ember} */
  P.clear = () => { P.lights.length = 0; P.haze.length = 0; };
  P.light = (x, y, r, i, c) => { if (P.lights.length < 8) P.lights.push([x, y, r, i, c || [1, 0.9, 0.7]]); };
  P.hazeAt = (x, y, r, k) => { if (P.haze.length < 3) P.haze.push([x, y, r, k]); };
  P.init = cv => {
    try {
      const gl = document.createElement('canvas'); gl.id = 'gl'; gl.width = cv.width; gl.height = cv.height;
      gl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:auto';
      cv.parentNode.style.position = 'relative'; cv.parentNode.appendChild(gl);
      const c = gl.getContext('webgl', { preserveDrawingBuffer:true, antialias:false, alpha:false }); if (!c) return false;
      const vs = 'attribute vec2 p;varying vec2 v0;void main(){v0=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
      const fs = `precision mediump float;varying vec2 v0;uniform sampler2D t;uniform vec2 px;uniform float T;uniform vec4 q;uniform vec4 L[8];uniform vec3 LC[8];uniform vec4 Hz[3];uniform vec4 F;
      vec3 S(vec2 u){return texture2D(t,u).rgb;}
      float h(vec2 u){return fract(sin(dot(u,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 asp=vec2(1.1429,1.);
        vec2 v=v0;
        for(int k=0;k<3;k++){ vec2 dd=(v0-Hz[k].xy)*asp; float r=length(dd); float m=smoothstep(Hz[k].z,0.,r)*Hz[k].w;
          v+=vec2(sin(v0.y*90.+T*9.+float(k)),cos(v0.x*80.+T*8.))*.006*m; }
        vec2 c=v-.5; float d=dot(c,c);
        vec2 o=c*d*(q.z+F.x)*.012;
        vec3 col=vec3(S(v+o).r,S(v).g,S(v-o).b);
        float hc=dot(S(v),vec3(.299,.587,.114));
        float hx=dot(S(v+vec2(px.x*1.5,0.)),vec3(.299,.587,.114))-dot(S(v-vec2(px.x*1.5,0.)),vec3(.299,.587,.114));
        float hy=dot(S(v+vec2(0.,px.y*1.5)),vec3(.299,.587,.114))-dot(S(v-vec2(0.,px.y*1.5)),vec3(.299,.587,.114));
        vec3 N=normalize(vec3(-hx*5.,-hy*5.,1.));
        vec3 lit=vec3(0.);
        for(int i=0;i<8;i++){ if(L[i].w<=0.) continue; vec2 dl=(L[i].xy-v)*asp; float dist=length(dl); float at=smoothstep(L[i].z,0.,dist); at*=at;
          vec3 ld=normalize(vec3(dl/max(dist,.001),.45)); float df=max(dot(N,ld),0.); vec3 hv=normalize(ld+vec3(0.,0.,1.)); float sp=pow(max(dot(N,hv),0.),24.);
          lit+=LC[i]*L[i].w*at*(df*.55+sp*.9)*(.35+hc*1.3); }
        col+=col*lit*.9+lit*.25;
        vec3 b=vec3(0.);
        for(int i=0;i<8;i++){float a=float(i)*.7854; vec2 dir=vec2(cos(a),sin(a));
          vec3 s1=S(v+dir*px*5.),s2=S(v+dir*px*13.);
          b+=max(s1-.55,0.)*.9+max(s2-.5,0.)*.7;}
        col+=b*.16*q.x;
        float l=dot(col,vec3(.299,.587,.114));
        vec3 sh=vec3(.9,1.02,1.12),hi=vec3(1.1,1.03,.92);
        col=mix(col,col*mix(sh,hi,smoothstep(.15,.8,l)),.8*q.y);
        col=mix(vec3(l),col,1.0+.18*q.y);
        col*=1.-d*1.1*q.w;
        col+=(h(v*vec2(641.,479.)+fract(T))-.5)*.045*q.z;
        vec2 g=v*vec2(34.,26.); vec2 id=floor(g); float hh=h(id); vec2 f=fract(g)-.5; f.y+=fract(T*.12*(.4+hh)+hh*9.)*1.6-.8; f.x+=sin(T*1.4+hh*30.)*.25;
        float em=smoothstep(.12,0.,length(f-(vec2(h(id+3.),h(id+7.))-.5)*.5))*step(.55,hh)*F.w; col+=vec3(1.,.55,.15)*em*.9;
        col+=vec3(1.,.15,.1)*F.y*smoothstep(.15,.7,d*2.2)*.7; col+=vec3(.9,.95,1.)*F.z*.25;
        gl_FragColor=vec4(col,1.);}`;
      const sh = (ty, s) => { const o = c.createShader(ty); c.shaderSource(o, s); c.compileShader(o); if (!c.getShaderParameter(o, c.COMPILE_STATUS)) throw new Error(c.getShaderInfoLog(o)); return o; };
      const pr = c.createProgram(); c.attachShader(pr, sh(c.VERTEX_SHADER, vs)); c.attachShader(pr, sh(c.FRAGMENT_SHADER, fs)); c.linkProgram(pr); c.useProgram(pr);
      const b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      const loc = c.getAttribLocation(pr, 'p'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      const tex = c.createTexture(); c.bindTexture(c.TEXTURE_2D, tex); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      const U = n => c.getUniformLocation(pr, n); P.gl = c; P.cv = cv; P.el = gl; P.u = { px:U('px'), T:U('T'), q:U('q'), L:U('L'), LC:U('LC'), Hz:U('Hz'), F:U('F') }; P.tex = tex; P.on = true; return true;
    } catch (e) { P.on = false; P.err = String(e); return false; }
  };
  /* call at the end of every render(): uploads the 2D canvas and draws the post pass */
  P.run = T => { if (!P.on) return; if (P.el.width !== P.cv.width || P.el.height !== P.cv.height) { P.el.width = P.cv.width; P.el.height = P.cv.height; } const c = P.gl, k = P.q; c.viewport(0, 0, P.el.width, P.el.height); c.bindTexture(c.TEXTURE_2D, P.tex);
    c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, P.cv); c.uniform2f(P.u.px, 1 / P.el.width, 1 / P.el.height); c.uniform1f(P.u.T, T % 7); c.uniform4f(P.u.q, k.bloom, k.grade, k.grain * 0 + k.ca, k.vig); const L = new Float32Array(32), LC = new Float32Array(24), Hz = new Float32Array(12);
    P.lights.forEach((l, i) => { L.set([l[0], l[1], l[2], l[3] * P.ambient], i * 4); LC.set(l[4], i * 3); }); P.haze.forEach((h, i) => Hz.set(h, i * 4));
    c.uniform4fv(P.u.L, L); c.uniform3fv(P.u.LC, LC); c.uniform4fv(P.u.Hz, Hz); c.uniform4f(P.u.F, P.fx.ca, P.fx.hurt, P.fx.flash, P.fx.ember);
    c.drawArrays(c.TRIANGLE_STRIP, 0, 4); };
  return P;
})();
