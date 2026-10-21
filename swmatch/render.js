// swmatch shade renderer: macro "product shots" drawn with WebGL, tinted with
// the real shade. One shader, four looks:
//   smear  - a thick brush stroke (lipstick, liquid blush, foundation)
//   powder - a pressed pan, crushed at one edge (powder blush, highlighter)
//   drops  - serum drops on stone
//   cream  - a whipped swirl (moisturiser, sunscreen)
// Gloss and sparkle come from the shade's finish. Thumbnails are rendered once
// and cached as images; the hero renders live and follows the pointer.
(function (root) {
  'use strict';

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision highp float;
uniform vec2 res; uniform vec3 col; uniform float gloss, sparkle, mode, seed, t, zoom; uniform vec2 light;
float h2(vec2 p){p=fract(p*vec2(123.34,456.21)+seed);p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n2(p);p*=2.03;a*=.5;}return v;}

// Height of the product at uv (0 = bare stone). m returns a material id:
// 0 stone, 1 product, 2 metal rim, 3 transparent drop.
float H(vec2 uv, out float m){
  m=0.;
  if(mode<.5){ // smear: domed stroke, product piled at the edges, bristle streaks at the tail
    float x=(uv.x-.1)/.8;
    float y0=.5+.07*sin(x*2.4+seed*6.)-.05*x;
    float w=.19*smoothstep(-.06,.1,x)*(1.-.32*x)+.012*n2(vec2(x*9.,seed));
    float d=(uv.y-y0)/max(w,.001);
    float streak=n2(vec2(x*1.2,d*4.5+seed*20.));
    float tail=smoothstep(1.,.74,x+.16*(streak-.5)+.03*n2(uv*30.));
    float head=smoothstep(-.015,.02,x-.07*d*d);
    float inside=step(abs(d),1.)*tail*head;
    if(inside<=0.) return 0.;
    m=1.;
    float dome=sqrt(max(0.,1.-d*d));
    float drag=fbm(vec2(x*5.,d*9.))*.24+fbm(vec2(x*2.,d*34.))*.07;
    float lip=.28*exp(-pow((abs(d)-.86)*7.,2.));
    return (.35+.45*dome+drag+lip)*mix(.55,1.,tail)*inside;
  }
  if(mode<1.5){ // powder: metal pan, pressed cake, crushed powder spilling right
    vec2 c=uv-vec2(.4,.5); float r=length(c);
    float crushZone=smoothstep(.62,.0,length((uv-vec2(.74,.56))*vec2(1.,1.5)));
    float broken=step(.42,fbm(uv*9.)+crushZone*.35-.0);
    if(r<.335&&r>.305){m=2.;return .62;}
    if(r<=.305&&!(crushZone>.55&&broken>.5&&r>.18)){m=1.;return .52+.025*fbm(uv*55.)-.06*smoothstep(.3,.0,r)*0.;}
    float loose=crushZone*fbm(uv*26.)*1.1;
    float grain=step(.62,n2(uv*vec2(230.,210.)))*crushZone;
    float hh=max(loose-.25,0.)*.9+grain*.18;
    if(hh>.015){m=1.;return hh;}
    return 0.;
  }
  if(mode<2.5){ // drops
    float d=0.;
    for(int i=0;i<5;i++){float fi=float(i);
      vec2 c=vec2(.22+.58*h2(vec2(fi,1.3)),.28+.46*h2(vec2(2.1,fi)));
      float r=.05+.075*h2(vec2(fi,fi+.7));
      vec2 q=(uv-c)/r; q.y*=1.08;
      float k=1.-dot(q,q); if(k>0.) d=max(d,sqrt(k)*r*3.2);}
    if(d>0.) m=3.;
    return d;
  }
  // cream: a soft dollop with a tip and a couple of folds
  vec2 c=uv-vec2(.5,.48); float a=atan(c.y,c.x), r=length(c*vec2(1.,1.12));
  float rr=r*(1.+.045*sin(a*4.+seed*6.)+.06*(fbm(uv*5.)-.5));
  float body=smoothstep(.37,.0,rr);
  if(body<=.02) return 0.;
  m=1.;
  float tip=smoothstep(.14,.0,length(c-vec2(.035,.06)))*.35;
  float folds=.05*sin(a*2.+r*30.-seed*5.)*smoothstep(.04,.22,r)*body;
  return pow(body,.65)*.95+tip+folds;
}

vec3 stoneAt(vec2 uv){
  float st=fbm(uv*vec2(2.5,4.))*.6+fbm(uv*18.)*.4;
  float vein=0.;
  vec3 s=mix(vec3(.06,.045,.045),vec3(.14,.105,.1),st)+vein;
  return s*(.7+.55*smoothstep(1.25,.15,length(uv-vec2(.3,.8))));
}

void main(){
  vec2 uv=gl_FragCoord.xy/res; uv.x=(uv.x-.5)*res.x/res.y+.5; uv=(uv-.5)/zoom+.5;
  float e=1./res.y, m, mx, my;
  float h=H(uv,m), hx=H(uv+vec2(e,0.),mx)-h, hy=H(uv+vec2(0.,e),my)-h;
  float ns=mode<.5?4.5:mode<1.5?3.5:mode<2.5?2.2:3.;
  vec3 N=normalize(vec3(-hx*ns,-hy*ns,e*3.));
  vec3 L=normalize(vec3(light,.95)), V=vec3(0,0,1), Hh=normalize(L+V);
  float diff=clamp(dot(N,L),0.,1.);
  float fres=pow(1.-max(N.z,0.),3.);

  float m2; float shadow=H(uv-light*.035,m2);
  vec3 stone=stoneAt(uv)*(1.-(m<.5?.6*smoothstep(0.,.45,shadow):0.));
  vec3 c=stone;

  if(m>2.5){ // transparent drop: refract the stone, tint, rim, caustic
    vec3 under=stoneAt(uv+N.xy*.06)*1.4;
    vec3 tintc=col*1.25;
    c=under*mix(vec3(1.),tintc,.75)+tintc*.18;
    c*=1.-.55*fres;
    c+=tintc*(.35+.9*pow(max(dot(-N.xy,normalize(light)),0.),2.))*(1.-fres)*.6;
    c*=1.-.45*smoothstep(.55,.95,fres);
    c+=vec3(1.)*pow(max(dot(N,Hh),0.),140.)*1.8;
    c+=vec3(1.)*pow(max(dot(N,normalize(vec3(-light*.6,1.))),0.),400.)*.6;
  } else if(m>1.5){ // metal rim
    c=vec3(.16,.14,.14)*(.5+.6*diff)+vec3(1.,.95,.9)*pow(max(dot(N,Hh),0.),60.)*.9;
  } else if(m>.5){
    vec3 base=col;
    float amb=.38+.3*N.z;
    c=base*(amb+.7*diff);
    c=mix(c*.8,c,smoothstep(0.,.5,h));
    c+=col*.1*fres;
    float spow=mix(6.,120.,gloss);
    c+=vec3(1.,.97,.94)*pow(max(dot(N,Hh),0.),spow)*mix(.05,.9,gloss);
    c+=vec3(1.)*fres*gloss*.12;
    if(sparkle>0.){
      float s=n2(uv*vec2(520.,500.)+floor(t*2.)*.37);
      c+=vec3(1.,.95,.84)*sparkle*step(.972,s)*(.4+diff)*1.4;
    }
  }
  c*=1.-.32*pow(length(gl_FragCoord.xy/res-.5)*1.3,2.4);
  c+=(h2(gl_FragCoord.xy*.71+fract(t))-.5)*.022;
  gl_FragColor=vec4(clamp(c,0.,1.),1.);
}`;

  const LOOK = {
    lipstick: 'smear', foundation: 'smear', blush: 'powder', highlighter: 'powder',
    serum: 'drops', moisturiser: 'cream', sunscreen: 'smear',
  };
  const GLOSS = { matte: .05, 'soft-matte': .15, natural: .3, satin: .45, cream: .45, radiant: .6, dewy: .75, glossy: .95, shimmer: .5, metallic: .7 };
  const SPARKLE = { shimmer: .8, metallic: 1, radiant: .35 };
  const MODE = { smear: 0, powder: 1, drops: 2, cream: 3 };

  function hexToRgb(hex) {
    const h = String(hex || '#d9a08f').replace('#', '');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  }

  // What to draw for a shade or product.
  function spec(s, seedFrom) {
    let look = LOOK[s.cat] || 'smear';
    let finish = s.finish || (look === 'drops' ? 'glossy' : 'satin');
    if (s.cat === 'blush' && /liquid|cream|stick|gel|mousse/.test(s.formula || '')) look = 'smear';
    let hex = s.hex;
    if (!hex) hex = s.cat === 'serum' ? '#C98A3E' : s.cat === 'sunscreen' ? '#F4EEE6' : '#F7F1EA';
    if (s.cat === 'moisturiser' || s.cat === 'sunscreen') finish = s.texture === 'gel' ? 'dewy' : 'satin';
    let seed = 0; for (const ch of String((seedFrom && (seedFrom.id || seedFrom.name)) || s.id || s.name || hex)) seed = (seed * 31 + ch.charCodeAt(0)) % 1000;
    return { look, hex, finish, seed: seed / 1000 };
  }

  function makeGL(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
    if (!gl) return null;
    const sh = (type, src) => { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = {};
    for (const k of ['res', 'col', 'gloss', 'sparkle', 'mode', 'seed', 't', 'light', 'zoom']) u[k] = gl.getUniformLocation(prog, k);
    return {
      draw(sp, w, h, time, light) {
        canvas.width = w; canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(u.res, w, h);
        gl.uniform3fv(u.col, hexToRgb(sp.hex));
        gl.uniform1f(u.gloss, GLOSS[sp.finish] ?? .4);
        gl.uniform1f(u.sparkle, SPARKLE[sp.finish] || 0);
        gl.uniform1f(u.mode, MODE[sp.look]);
        gl.uniform1f(u.seed, sp.seed);
        gl.uniform1f(u.t, time || 0);
        // Wide frames get the product larger so it fills the shot.
        gl.uniform1f(u.zoom, Math.max(1, Math.min(1.45, (w / h) * .6)));
        gl.uniform2f(u.light, light ? light[0] : -.55, light ? light[1] : .6);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      },
    };
  }

  // Shared offscreen renderer for stills.
  let still = null, failed = false;
  const cache = new Map();
  // seedFrom: draw with another product's stroke so a pair differs only in colour and finish.
  function image(s, w, h, seedFrom) {
    const sp = spec(s, seedFrom);
    const key = [sp.look, sp.hex, sp.finish, Math.round(sp.seed * 100), w, h].join('|');
    if (cache.has(key)) return cache.get(key);
    if (!still && !failed) {
      try { still = { canvas: document.createElement('canvas') }; still.gl = makeGL(still.canvas); if (!still.gl) failed = true; } catch (e) { failed = true; }
    }
    let url = null;
    if (!failed) {
      try { still.gl.draw(sp, w, h, 0, null); url = still.canvas.toDataURL('image/jpeg', .86); } catch (e) { failed = true; }
    }
    cache.set(key, url);
    return url;
  }

  // CSS fallback when WebGL isn't available.
  function fallback(s) {
    const sp = spec(s);
    return `radial-gradient(ellipse 60% 40% at 45% 45%, ${sp.hex}, transparent 70%), #140c0e`;
  }

  // A live canvas that re-renders as the pointer moves the light.
  function live(canvas) {
    let gl = null;
    try { gl = makeGL(canvas); } catch (e) { gl = null; }
    if (!gl) return null;
    let sp = null, light = [-.55, .6], target = [-.55, .6], raf = 0, t0 = performance.now();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frame = (now) => {
      light[0] += (target[0] - light[0]) * .08; light[1] += (target[1] - light[1]) * .08;
      const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (sp && r.width) gl.draw(sp, Math.round(r.width * dpr), Math.round(r.height * dpr), (now - t0) / 1000, light);
      if (!reduced && (Math.abs(target[0] - light[0]) > .002 || Math.abs(target[1] - light[1]) > .002 || SPARKLE[sp && sp.finish])) raf = requestAnimationFrame(frame);
      else raf = 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    canvas.parentElement.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      target = [((e.clientX - r.left) / r.width - .5) * 1.6, (.5 - (e.clientY - r.top) / r.height) * 1.6 + .2];
      kick();
    });
    addEventListener('resize', kick);
    return { set(s, seedFrom) { sp = spec(s, seedFrom); kick(); } };
  }

  root.SwRender = { image, live, fallback, spec };
})(typeof self !== 'undefined' ? self : this);
