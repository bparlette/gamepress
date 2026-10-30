/* glpost.js: WebGL post-processing for HD builds (global GLPOST). Copies the finished 2D frame (#screen, incl. HUD text) into a texture and draws it
   through one fragment shader: bloom (2 rings of bright taps), edge chromatic aberration, teal/orange colour grade, vignette, film grain.
   A second canvas #gl sits over #screen; if WebGL is unavailable nothing happens and the plain 2D frame stays visible. */
const GLPOST = (() => {
  const P = { on:false, q:{ bloom:1, grade:1, ca:1, grain:1, vig:1 } };
  P.init = cv => {
    try {
      const gl = document.createElement('canvas'); gl.id = 'gl'; gl.width = cv.width; gl.height = cv.height;
      gl.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;image-rendering:auto';
      cv.parentNode.style.position = 'relative'; cv.parentNode.appendChild(gl);
      const c = gl.getContext('webgl', { preserveDrawingBuffer:true, antialias:false, alpha:false }); if (!c) return false;
      const vs = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
      const fs = `precision mediump float;varying vec2 v;uniform sampler2D t;uniform vec2 px;uniform float T;uniform vec4 q;
      vec3 S(vec2 u){return texture2D(t,u).rgb;}
      float h(vec2 u){return fract(sin(dot(u,vec2(12.9898,78.233)))*43758.5453);}
      void main(){
        vec2 c=v-.5; float d=dot(c,c);
        vec2 o=c*d*q.z*.012;
        vec3 col=vec3(S(v+o).r,S(v).g,S(v-o).b);
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
        gl_FragColor=vec4(col,1.);}`;
      const sh = (ty, s) => { const o = c.createShader(ty); c.shaderSource(o, s); c.compileShader(o); if (!c.getShaderParameter(o, c.COMPILE_STATUS)) throw new Error(c.getShaderInfoLog(o)); return o; };
      const pr = c.createProgram(); c.attachShader(pr, sh(c.VERTEX_SHADER, vs)); c.attachShader(pr, sh(c.FRAGMENT_SHADER, fs)); c.linkProgram(pr); c.useProgram(pr);
      const b = c.createBuffer(); c.bindBuffer(c.ARRAY_BUFFER, b); c.bufferData(c.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), c.STATIC_DRAW);
      const loc = c.getAttribLocation(pr, 'p'); c.enableVertexAttribArray(loc); c.vertexAttribPointer(loc, 2, c.FLOAT, false, 0, 0);
      const tex = c.createTexture(); c.bindTexture(c.TEXTURE_2D, tex); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MIN_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_MAG_FILTER, c.LINEAR); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_S, c.CLAMP_TO_EDGE); c.texParameteri(c.TEXTURE_2D, c.TEXTURE_WRAP_T, c.CLAMP_TO_EDGE);
      const U = n => c.getUniformLocation(pr, n); P.gl = c; P.cv = cv; P.el = gl; P.u = { px:U('px'), T:U('T'), q:U('q') }; P.tex = tex; P.on = true; return true;
    } catch (e) { P.on = false; P.err = String(e); return false; }
  };
  /* call at the end of every render(): uploads the 2D canvas and draws the post pass */
  P.run = T => { if (!P.on) return; const c = P.gl, k = P.q; c.viewport(0, 0, P.el.width, P.el.height); c.bindTexture(c.TEXTURE_2D, P.tex);
    c.texImage2D(c.TEXTURE_2D, 0, c.RGB, c.RGB, c.UNSIGNED_BYTE, P.cv); c.uniform2f(P.u.px, 1 / P.el.width, 1 / P.el.height); c.uniform1f(P.u.T, T % 7); c.uniform4f(P.u.q, k.bloom, k.grade, k.grain * 0 + k.ca, k.vig); c.drawArrays(c.TRIANGLE_STRIP, 0, 4); };
  return P;
})();
