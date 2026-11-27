// Motor compartido de las demos (Andrés Monreal Ciencia).
// Escena Three.js con brillo, materiales holograma, capítulos, subtítulos,
// etiquetas 3D, barra de acción, quiz, sonido sintetizado e idioma ES/EN.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { refsFor } from './refs.js';

export { THREE };
export const lang = (document.documentElement.lang || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
export const t = (o) => (o == null ? '' : typeof o === 'string' ? o : (o[lang] ?? o.es));
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
export const ease = (k) => (k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const params = new URLSearchParams(location.search);
export const isThumb = params.has('thumb');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

// ---------- materiales ----------
const timed = [];
export function holoMat(color, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uOpacity: { value: o.opacity ?? .1 },
      uRim: { value: o.rim ?? .9 }, uPow: { value: o.power ?? 2.2 }, uScan: { value: o.scan ?? .12 },
      uBoost: { value: 0 }, uInt: { value: o.intensity ?? 1 }, uScanF: { value: o.scanFreq ?? 40 }
    },
    vertexShader: `varying vec3 vN;varying vec3 vV;varying vec3 vW;
      void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;vec4 mv=viewMatrix*w;vV=mv.xyz;vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mv;}`,
    fragmentShader: `uniform vec3 uColor;uniform float uTime,uOpacity,uRim,uPow,uScan,uBoost,uInt,uScanF;varying vec3 vN;varying vec3 vV;varying vec3 vW;
      void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(-vV))),uPow);
      float s=smoothstep(.85,1.,.5+.5*sin(vW.y*uScanF-uTime*2.5));
      float a=uOpacity*1.6+f*uRim*.75+s*uScan*.6+uBoost*.35;
      float lit=.55+.45*max(dot(normalize(vN),normalize(vec3(.4,.8,.5))),0.);
      vec3 c=uColor*(.32+f*.95+uBoost*1.2)*uInt*lit;
      gl_FragColor=vec4(c,clamp(a,0.,1.));}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
  });
  timed.push(m); return m;
}
export function lineMat(color, opacity = .35) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity: opacity * .7, blending: THREE.AdditiveBlending, depthWrite: false });
}
export function glowMat(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacity * .75, blending: THREE.AdditiveBlending, depthWrite: false });
}
// Material para tubos: un pulso brillante que recorre el tubo (uv.x = 0..1 a lo largo)
export function pulseMat(color, o = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uProg: { value: -1 }, uBase: { value: o.base ?? .18 }, uTrail: { value: o.trail ?? .35 }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform vec3 uColor;uniform float uProg,uBase,uTrail;varying vec2 vUv;
      void main(){float d=uProg-vUv.x;float head=smoothstep(.06,0.,abs(d));float trail=d>0.?exp(-d/uTrail)*.55:0.;
      if(uProg<0.||uProg>1.6)trail=0.;float a=uBase+head*1.4+trail*.8;gl_FragColor=vec4(uColor*(.8+head*1.1),clamp(a,0.,1.));}`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
  });
  return m;
}
let _sprite;
export function glowTexture() {
  if (_sprite) return _sprite;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.25, 'rgba(255,255,255,.75)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); _sprite = new THREE.CanvasTexture(c); return _sprite;
}
export function pointsMat(color, size = .08, opacity = 1) {
  return new THREE.PointsMaterial({ color, size, map: glowTexture(), transparent: true, opacity: opacity * .8, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
}
// ---------- modelos anatómicos reales (BodyParts3D, CC BY-SA 2.1 JP) ----------
// Paquete: <name>.json (manifiesto) + <name>.bin (posiciones uint16 cuantizadas + índices).
// Ejes BodyParts3D (mm): X = izquierda del paciente, Y = posterior, Z = superior → three: (X, Z, −Y).
export const BP3D_CREDIT = { es: 'Modelos anatómicos: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 JP', en: 'Anatomical models: BodyParts3D, © The Database Center for Life Science, CC BY-SA 2.1 JP' };
// progreso real de descarga de modelos (suma de todos los paquetes en curso)
const dl = { total: 0, done: 0, cb: null };
async function fetchBuf(url) {
  const r = await fetch(url); const len = +r.headers.get('content-length') || 0;
  if (!r.body || !len) { const b = await r.arrayBuffer(); dl.total += b.byteLength; dl.done += b.byteLength; dl.cb?.(dl.done / dl.total); return b; }
  // si el servidor comprime (Content-Encoding), el cuerpo llega descomprimido y es más largo que content-length
  dl.total += len; const reader = r.body.getReader(), chunks = []; let off = 0;
  for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); off += value.length; dl.done += Math.min(value.length, Math.max(0, len - (off - value.length))); dl.cb?.(Math.min(1, dl.done / dl.total)); }
  const out = new Uint8Array(off); let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out.buffer;
}
export async function loadPack(name, o = {}) {
  const base = new URL(`models/${name}`, import.meta.url);
  const man = await fetch(base + '.json').then((r) => r.json());
  let parts;
  if (man.v === 2) { // meshoptimizer + gzip (≈ 3 veces más ligero)
    const gz = await fetchBuf(base + '.mo.bin');
    const g8 = new Uint8Array(gz); // algunos servidores (GitHub Pages) ya lo entregan descomprimido
    const raw = g8[0] === 0x1f && g8[1] === 0x8b ? new Uint8Array(await new Response(new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()) : g8;
    await MeshoptDecoder.ready;
    parts = Object.entries(man.mo).map(([k, P]) => { const vb = new Uint8Array(P.nv * 8), ib = new Uint8Array(P.ni * 4);
      MeshoptDecoder.decodeVertexBuffer(vb, P.nv, 8, raw.subarray(P.vb[0], P.vb[0] + P.vb[1])); MeshoptDecoder.decodeIndexBuffer(ib, P.ni, 4, raw.subarray(P.ib[0], P.ib[0] + P.ib[1]));
      return [k, { nv: P.nv, ni: P.ni, q: new Uint16Array(vb.buffer), st: 4, idx: new Uint32Array(ib.buffer) }]; });
  } else {
    const buf = await fetchBuf(base + '.bin');
    parts = Object.entries(man.parts).map(([k, P]) => [k, { nv: P.nv, ni: P.ni, q: new Uint16Array(buf, P.pos, P.nv * 3), st: 3, idx: P.idx32 ? new Uint32Array(buf, P.idx, P.ni) : new Uint16Array(buf, P.idx, P.ni) }]);
  }
  const s = o.scale ?? 1 / 45, c = o.center ?? man.min.map((m, i) => m + man.extent[i] / 2);
  const toThree = (p) => new THREE.Vector3((p[0] - c[0]) * s, (p[2] - c[2]) * s, -(p[1] - c[1]) * s);
  const out = { geo: {}, toThree, scale: s };
  for (const [key, P] of parts) {
    const q = P.q, st = P.st, pos = new Float32Array(P.nv * 3);
    for (let i = 0; i < P.nv; i++) {
      const X = man.min[0] + q[i * st] / 65535 * man.extent[0], Y = man.min[1] + q[i * st + 1] / 65535 * man.extent[1], Z = man.min[2] + q[i * st + 2] / 65535 * man.extent[2];
      pos[i * 3] = (X - c[0]) * s; pos[i * 3 + 1] = (Z - c[2]) * s; pos[i * 3 + 2] = -(Y - c[1]) * s;
    }
    let idx = P.idx;
    const crop = o.crop?.[key] ?? o.cropAll;
    if (crop) { // conserva caras cuyo centro está dentro de la caja (mm)
      const lo = toThree([crop[0][0], crop[1][1], crop[0][2]]), hi = toThree([crop[1][0], crop[0][1], crop[1][2]]);
      const keep = []; for (let f = 0; f < idx.length; f += 3) { let x = 0, y = 0, z = 0; for (let k = 0; k < 3; k++) { const v = idx[f + k]; x += pos[v * 3]; y += pos[v * 3 + 1]; z += pos[v * 3 + 2]; } x /= 3; y /= 3; z /= 3;
        if (x >= lo.x && x <= hi.x && y >= lo.y && y <= hi.y && z >= Math.min(lo.z, hi.z) && z <= Math.max(lo.z, hi.z)) keep.push(idx[f], idx[f + 1], idx[f + 2]); }
      idx = idx instanceof Uint32Array ? new Uint32Array(keep) : new Uint16Array(keep);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals(); g.computeBoundingBox(); g.computeBoundingSphere();
    // UV esféricas (para textura de tejido y relieve)
    const ctr = g.boundingSphere.center, uv = new Float32Array(P.nv * 2);
    for (let i = 0; i < P.nv; i++) { const dx = pos[i * 3] - ctr.x, dy = pos[i * 3 + 1] - ctr.y, dz = pos[i * 3 + 2] - ctr.z, r = Math.hypot(dx, dy, dz) || 1; uv[i * 2] = Math.atan2(dz, dx) / (2 * Math.PI) + .5; uv[i * 2 + 1] = Math.acos(dy / r) / Math.PI; }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.geo[key] = g;
  }
  return out;
}

// ---------- materiales realistas ----------
let _noise;
function noiseTex() {
  if (_noise) return _noise; const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'), img = g.createImageData(n, n);
  const v = new Float32Array(n * n);
  for (let o = 0; o < 4; o++) {
    const s = 2 ** (o + 2), grid = []; for (let i = 0; i <= s; i++) { grid[i] = []; for (let j = 0; j <= s; j++) grid[i][j] = Math.random(); }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const gx = x / n * s, gy = y / n * s, ix = Math.floor(gx), iy = Math.floor(gy), fx = gx - ix, fy = gy - iy; const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
      const a = grid[iy][ix], b = grid[iy][(ix + 1) % s], cc = grid[(iy + 1) % s][ix], d = grid[(iy + 1) % s][(ix + 1) % s];
      v[y * n + x] += (a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy) / 2 ** o;
    }
  }
  for (let i = 0; i < n * n; i++) { const k = Math.min(255, v[i] / 1.9 * 255); img.data.set([k, k, k, 255], i * 4); }
  g.putImageData(img, 0, 0); _noise = new THREE.CanvasTexture(c); _noise.wrapS = _noise.wrapT = THREE.RepeatWrapping; _noise.repeat.set(3, 3); return _noise;
}
const _tints = {};
function tintTex(c1, c2, streak = 6) {
  const key = c1 + c2 + streak; if (_tints[key]) return _tints[key];
  const src = noiseTex().image, n = src.width, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
  g.drawImage(src, 0, 0); const d = g.getImageData(0, 0, n, n), A = new THREE.Color(c1), B = new THREE.Color(c2);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647); const cells = streak > 0 ? [] : Array.from({ length: 70 }, () => [rnd() * n, rnd() * n]);
  for (let i = 0; i < n * n; i++) {
    const x = i % n, y = (i / n) | 0, v = d.data[i * 4] / 255;
    // streak > 0: fibras (músculo); streak 0: superficie moteada con lobulillos (pulmón), sin franjas
    let k;
    if (streak > 0) { const st = .5 + .5 * Math.sin((y / n) * Math.PI * 2 * streak + v * 9 + x / n * 3); k = Math.min(1, Math.max(0, v * .7 + st * .45 - .15)); }
    else { let d1 = 1e9, d2 = 1e9; for (const [px, py] of cells) { let dx = Math.abs(x - px), dy = Math.abs(y - py); dx = Math.min(dx, n - dx); dy = Math.min(dy, n - dy); const d = Math.hypot(dx, dy); if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
      const edge = Math.max(0, 1 - (d2 - d1) / 2.2); k = Math.min(1, Math.max(0, .42 + (v - .5) * .9 - edge * .32)); }
    d.data[i * 4] = (A.r + (B.r - A.r) * k) * 255; d.data[i * 4 + 1] = (A.g + (B.g - A.g) * k) * 255; d.data[i * 4 + 2] = (A.b + (B.b - A.b) * k) * 255;
  }
  g.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); _tints[key] = t; return t;
}
const PRESETS = {
  muscle: { color: '#ffffff', tint: ['#5e0f17', '#a8323a', 7], roughness: .4, clearcoat: .65, clearcoatRoughness: .3, sheen: .6, sheenColor: '#ff8a8a', bump: 1.4 },
  artery: { color: '#a3172b', roughness: .38, clearcoat: .6, clearcoatRoughness: .3, bump: .3 },
  vein: { color: '#3a3f8c', roughness: .4, clearcoat: .5, bump: .3 },
  fat: { color: '#e3c27a', roughness: .6, sheen: .4, sheenColor: '#fff2c4', bump: 1.2 },
  lung: { color: '#ffffff', tint: ['#a85a64', '#eab0b2', 0], roughness: .78, sheen: .7, sheenColor: '#ffe4e6', bump: 2.2 },
  diaphragm: { color: '#ffffff', tint: ['#7d1f27', '#b8474f', 18], roughness: .5, clearcoat: .3, sheen: .5, sheenColor: '#ff9a9a', bump: 1 },
  skin: { color: '#ffffff', tint: ['#b98269', '#d8a68e', 3], roughness: .58, sheen: .45, sheenColor: '#f3cdb8', clearcoat: .06, clearcoatRoughness: .5, bump: .35 },
  nail: { color: '#efcfc4', roughness: .22, clearcoat: 1, bump: .1 },
  bone: { color: '#ffffff', tint: ['#a8977a', '#cdbf9f', 3], roughness: .68, bump: 1.1 },
  cartilage: { color: '#c9b4aa', roughness: .4, clearcoat: .5, bump: .3 },
  tendon: { color: '#c8b89c', roughness: .48, sheen: .3, sheenColor: '#f3ead8', bump: .5 },
  plastic: { color: '#b9c0c8', roughness: .55, clearcoat: .25, clearcoatRoughness: .4 },
  plasticDark: { color: '#2a313c', roughness: .38, clearcoat: .4 },
  plasticTint: { color: '#38bdf8', roughness: .45, clearcoat: .2, clearcoatRoughness: .5 },
  clampYellow: { color: '#f2c230', roughness: .35, clearcoat: .5 },
  rubber: { color: '#1d232b', roughness: .7 },
  metal: { color: '#7d848d', metalness: .9, roughness: .38 },
  glass: { color: '#eaf6ff', roughness: .06, transmission: 1, thickness: .15, ior: 1.45 },
  bagPlastic: { color: '#f4fbff', roughness: .12, transmission: .92, thickness: .1, ior: 1.4 },
  fluid: { color: '#cfeeff', roughness: .05, transmission: .85, thickness: .6, ior: 1.33 },
  tube: { color: '#f2fbff', roughness: .1, transmission: .8, thickness: .05, ior: 1.4 }
};
export function realMat(kind, over = {}) {
  const p = { ...(PRESETS[kind] || PRESETS.plastic), ...over }; const bump = p.bump, tint = p.tint; delete p.bump; delete p.tint;
  if (over.color && tint) { p.color = over.color; }
  if (p.sheenColor) p.sheenColor = new THREE.Color(p.sheenColor); p.color = new THREE.Color(p.color);
  const m = new THREE.MeshPhysicalMaterial(p);
  if (bump) { m.bumpMap = noiseTex(); m.bumpScale = bump; }
  if (tint && !over.color) m.map = tintTex(...tint);
  return m;
}
const xrayItems = []; let xrayOn = false;
export const xray = { get on() { return xrayOn; }, k: 0 };
export function realMesh(geo, kind, o = {}) {
  const m = new THREE.Mesh(geo, kind.isMaterial ? kind : realMat(kind, o.opts)); m.castShadow = m.receiveShadow = o.shadow !== false;
  if (o.ghost !== false) xrayItems.push({ real: m, holoParts: [], ghost: o.ghost ?? .12 }); return m;
}
export function holoMesh(geo, color, o = {}) {
  const g = new THREE.Group();
  if (!o.real && o.solid !== false) { const sc = new THREE.Color(color).multiplyScalar(.16); const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: sc, roughness: .55, metalness: .1, transparent: true, opacity: o.solidOpacity ?? .35, depthWrite: false })); back.renderOrder = -1; g.add(back); }
  let real = null;
  if (o.real) { real = new THREE.Mesh(geo, o.real.isMaterial ? o.real : realMat(o.real, o.realOpts)); real.castShadow = real.receiveShadow = o.shadow !== false; }
  const mesh = new THREE.Mesh(geo, holoMat(color, o)); g.add(mesh);
  if (o.edges !== false) { const e = new THREE.LineSegments(new THREE.EdgesGeometry(geo, o.edgeAngle ?? 28), lineMat(color, o.edgeOpacity ?? .35)); g.add(e); g.userData.edges = e; }
  if (o.wire) { const w = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: o.wire, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(w); }
  g.userData.mat = mesh.material; g.userData.mesh = mesh;
  if (real) { const holoParts = [...g.children]; g.add(real); g.userData.real = real; xrayItems.push({ real, holoParts, ghost: o.ghost ?? .1 }); holoParts.forEach((h) => (h.visible = xrayOn)); }
  return g;
}
// Manga de tela ajustada a la piel real: anillos del contorno de la piel a lo largo de un eje, con holgura y dobladillo.
// geo: geometría de la piel; p0: punto del eje; dir: dirección del eje (hacia donde sigue la manga);
// from/to: tramo a cubrir sobre el eje; extra: cuánto se prolonga después de «to» (tapa cortes del modelo).
export function fitSleeve(geo, p0, dir, from, to, o = {}) {
  const d = dir.clone().normalize(), e1 = new THREE.Vector3(1, 0, 0); if (Math.abs(d.x) > .9) e1.set(0, 1, 0); e1.addScaledVector(d, -e1.dot(d)).normalize(); const e2 = d.clone().cross(e1);
  const pa = geo.attributes.position, v = new THREE.Vector3(), N = o.segments ?? 72, steps = o.steps ?? 10, grow = o.grow ?? .02, slab = o.slab ?? (to - from) / steps;
  const rings = [];
  for (let s = 0; s <= steps; s++) {
    const h = from + (to - from) * s / steps, r = new Float32Array(N), cen = new THREE.Vector3(); let n = 0;
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).sub(p0); const t = v.dot(d); if (Math.abs(t - h) > slab) continue; if (o.keep && !o.keep(v.clone().add(p0))) continue; cen.add(v.addScaledVector(d, -t)); n++; }
    if (n) cen.multiplyScalar(1 / n);
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).sub(p0); const t = v.dot(d); if (Math.abs(t - h) > slab) continue; if (o.keep && !o.keep(v.clone().add(p0))) continue; v.addScaledVector(d, -t).sub(cen); const a = Math.atan2(v.dot(e2), v.dot(e1)); const b = ((Math.round(a / (Math.PI * 2) * N) % N) + N) % N; r[b] = Math.max(r[b], v.length()); }
    for (let k = 0; k < 3; k++) for (let i = 0; i < N; i++) if (!r[i]) { let a = 1; while (!r[(i + a) % N] && a < N) a++; r[i] = r[(i + a) % N]; }
    for (let k = 0; k < 4; k++) { const cp = r.slice(); for (let i = 0; i < N; i++) r[i] = Math.max(cp[i], (cp[(i + N - 1) % N] + 2 * cp[i] + cp[(i + 1) % N]) / 4); }
    rings.push({ h, r, cen: cen.clone() });
  }
  // holgura uniforme y anillos monótonos (la tela no se mete en los huecos)
  for (let s = 1; s < rings.length; s++) for (let i = 0; i < N; i++) rings[s].r[i] = Math.max(rings[s].r[i], rings[s - 1].r[i] * .97);
  if (o.extra) { const L2 = rings[rings.length - 1]; for (let k = 1; k <= 3; k++) rings.push({ h: to + o.extra * k / 3, r: L2.r.map((x) => x * (1 + .02 * k)), cen: L2.cen.clone() }); }
  const pt = (rg, i, add) => { const a = i / N * Math.PI * 2, rr = rg.r[i] + grow + add; return p0.clone().addScaledVector(d, rg.h).add(rg.cen).addScaledVector(e1, Math.cos(a) * rr).addScaledVector(e2, Math.sin(a) * rr); };
  const pos = [], idx = [], uv = [];
  rings.forEach((rg, s) => { for (let i = 0; i <= N; i++) { const q = pt(rg, i % N, 0); pos.push(q.x, q.y, q.z); uv.push(i / N, s / (rings.length - 1)); } });
  for (let s = 0; s < rings.length - 1; s++) for (let i = 0; i < N; i++) { const a = s * (N + 1) + i, b = a + 1, c2 = a + N + 1, e = c2 + 1; idx.push(a, b, c2, b, e, c2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mat = o.material || new THREE.MeshPhysicalMaterial({ color: o.color ?? '#7f9cbc', roughness: .9, sheen: .5, sheenColor: new THREE.Color('#dfe9f5'), side: THREE.DoubleSide });
  const grp = new THREE.Group(), shell = new THREE.Mesh(g, mat); shell.castShadow = shell.receiveShadow = true; grp.add(shell);
  // dobladillo: borde enrollado en la abertura
  const hemR = o.hem ?? grow * 1.2, hemPts = []; for (let i = 0; i < N; i++) hemPts.push(pt(rings[0], i, hemR * .4));
  const hem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hemPts, true), N * 2, hemR, 10, true), mat); hem.castShadow = true; grp.add(hem);
  return grp;
}
// Costura entre dos piezas de piel: pares de vértices que coinciden en reposo, para promediar sus normales
// después de cada deformación (así no se ve una línea en la unión).
// Suelda el borde de dos piezas de malla simplificadas por separado: cada vértice del borde de B se mueve
// al vértice del borde de A más cercano (si está a menos de maxDist). Así no queda abertura en la unión.
export function weldBorders(ga, gb, maxDist) {
  const border = (g) => { const ix = g.index.array, cnt = new Map(), k = (a, b) => (a < b ? a * 4294967 + b : b * 4294967 + a);
    for (let f = 0; f < ix.length; f += 3) for (const [a, b] of [[ix[f], ix[f + 1]], [ix[f + 1], ix[f + 2]], [ix[f + 2], ix[f]]]) cnt.set(k(a, b), (cnt.get(k(a, b)) || 0) + 1);
    const set = new Set(); for (let f = 0; f < ix.length; f += 3) for (const [a, b] of [[ix[f], ix[f + 1]], [ix[f + 1], ix[f + 2]], [ix[f + 2], ix[f]]]) if (cnt.get(k(a, b)) === 1) { set.add(a); set.add(b); } return [...set]; };
  const pa = ga.attributes.position, pb = gb.attributes.position, A = border(ga), B = border(gb), m2 = maxDist * maxDist; let n = 0;
  for (const j of B) { let best = -1, bd = m2; for (const i of A) { const d = (pa.getX(i) - pb.getX(j)) ** 2 + (pa.getY(i) - pb.getY(j)) ** 2 + (pa.getZ(i) - pb.getZ(j)) ** 2; if (d < bd) { bd = d; best = i; } }
    if (best >= 0) { pb.setXYZ(j, pa.getX(best), pa.getY(best), pa.getZ(best)); n++; } }
  pb.needsUpdate = true; gb.computeVertexNormals(); return n;
}
export function seamPairs(ga, gb, eps = 1e-4) {
  const pa = ga.attributes.position, pb = gb.attributes.position, key = (x, y, z) => `${Math.round(x / eps)},${Math.round(y / eps)},${Math.round(z / eps)}`, m = new Map(), A = [], B = [];
  for (let i = 0; i < pa.count; i++) m.set(key(pa.getX(i), pa.getY(i), pa.getZ(i)), i);
  for (let j = 0; j < pb.count; j++) { const i = m.get(key(pb.getX(j), pb.getY(j), pb.getZ(j))); if (i !== undefined) { A.push(i); B.push(j); } }
  return { A, B, ga, gb };
}
export function fixSeam(sp) {
  const na = sp.ga.attributes.normal, nb = sp.gb.attributes.normal; if (!na || !nb) return;
  for (let k = 0; k < sp.A.length; k++) { const i = sp.A[k], j = sp.B[k]; let x = na.getX(i) + nb.getX(j), y = na.getY(i) + nb.getY(j), z = na.getZ(i) + nb.getZ(j); const L = Math.hypot(x, y, z) || 1; x /= L; y /= L; z /= L; na.setXYZ(i, x, y, z); nb.setXYZ(j, x, y, z); }
  na.needsUpdate = nb.needsUpdate = true;
}
export function gridFloor(color = '#2dd4bf', size = 40, y = 0) {
  // piso de estudio: superficie mate oscura con luz central suave y una rejilla técnica muy tenue
  const m = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vW;void main(){vec4 w=modelMatrix*vec4(position,1.);vW=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`,
    fragmentShader: `uniform vec3 uColor;varying vec3 vW;
      float grid(vec2 p,float s){vec2 g=abs(fract(p/s-.5)-.5)/fwidth(p/s);return 1.-min(min(g.x,g.y),1.);}
      void main(){float d=length(vW.xz);float fade=1.-smoothstep(1.5,13.,d);
      vec3 base=mix(vec3(.075,.08,.095),vec3(.028,.03,.038),smoothstep(0.,9.,d));
      float gl=grid(vW.xz,1.)*.05+grid(vW.xz,5.)*.07;
      vec3 c=base+mix(vec3(.5),uColor,.25)*gl;
      gl_FragColor=vec4(c,fade*.92);}`,
    transparent: true, depthWrite: false
  });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); p.rotation.x = -Math.PI / 2; p.position.y = y - .003; p.renderOrder = -2; return p;
}
// Flecha brillante (cilindro + cono) para vectores de fuerza
export function arrow(color) {
  const g = new THREE.Group(); const mat = glowMat(color, .95);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1, 12), mat); shaft.position.y = .5;
  const head = new THREE.Mesh(new THREE.ConeGeometry(.075, .2, 16), mat);
  g.add(shaft, head);
  g.set = (from, dir, len) => {
    g.position.copy(from); const L = Math.max(.001, len);
    shaft.scale.y = Math.max(.001, L - .18); shaft.position.y = shaft.scale.y / 2; head.position.y = L - .1;
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()); g.visible = len > .02;
  };
  return g;
}

// ---------- sonido ----------
export const sound = {
  ctx: null, on: false,
  enable(v) { this.on = v; if (v && !this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx && v) this.ctx.resume(); },
  beep(f = 880, d = .09, type = 'sine', g = .06) {
    if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), a = c.createGain();
    o.type = type; o.frequency.value = f; a.gain.setValueAtTime(0, c.currentTime); a.gain.linearRampToValueAtTime(g, c.currentTime + .008);
    a.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d); o.connect(a).connect(c.destination); o.start(); o.stop(c.currentTime + d + .02);
  },
  noise(d = .5, g = .04, freq = 900) {
    if (!this.on || !this.ctx) return; const c = this.ctx, n = c.sampleRate * d, b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < n; i++) x[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; a.gain.value = g;
    s.connect(f).connect(a).connect(c.destination); s.start();
  },
  // golpe grave con caída de tono (ruidos cardiacos)
  thump(f = 55, d = .12, g = .22) {
    if (!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), a = c.createGain(), lp = c.createBiquadFilter();
    o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + d * .6); lp.type = 'lowpass'; lp.frequency.value = 180;
    a.gain.setValueAtTime(0, t); a.gain.linearRampToValueAtTime(g, t + .012); a.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(lp).connect(a).connect(c.destination); o.start(t); o.stop(t + d + .03);
  },
  // aire: ruido filtrado con envolvente suave (respiración)
  breath(d = 1.5, g = .05, freq = 650) {
    if (!this.on || !this.ctx) return; const c = this.ctx, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), x = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const k = i / n; x[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * k) ** 1.5; }
    const s = c.createBufferSource(), f = c.createBiquadFilter(), a = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .7; a.gain.value = g;
    s.connect(f).connect(a).connect(c.destination); s.start();
  }
};

// ---------- demo ----------
export function createDemo(cfg) {
  const L = {
    back: { es: 'Volver a las demos', en: 'Back to demos' }, sound: { es: 'Sonido', en: 'Sound' }, chapters: { es: 'Capítulos', en: 'Chapters' },
    chapter: { es: 'Capítulo', en: 'Chapter' }, loading: { es: 'Cargando', en: 'Loading' }, hint: { es: 'Arrastra para girar · rueda o pellizco para acercar', en: 'Drag to orbit · scroll or pinch to zoom' },
    other: { es: 'Read in English', en: 'Leer en español' }, prev: { es: 'Capítulo anterior', en: 'Previous chapter' }, next: { es: 'Capítulo siguiente', en: 'Next chapter' },
    pause: { es: 'Pausar narración', en: 'Pause narration' }, edu: { es: 'Material educativo · no es consejo médico', en: 'Educational material · not medical advice' }
  };
  const accent = cfg.accent || '#2dd4bf';
  document.documentElement.style.setProperty('--accent', accent);
  document.title = `${t(cfg.title)} | ${lang === 'en' ? 'Demos' : 'Demos'} | Andrés Monreal Ciencia`;
  if (isThumb) document.body.classList.add('thumb');

  // Loader
  const loader = el('div', '', `<div class="mark"><div class="logo"><i></i><i></i><i></i></div><div class="brand">AM Ciencia</div><div class="name">${t(cfg.title)}</div><div class="bar"><b></b></div><div class="pct">0%</div></div><div class="foot">© 2026 Andrés Monreal Ciencia · ${t(L.edu)}</div>`);
  loader.id = 'loader'; document.body.appendChild(loader);
  const setLoad = (p) => { loader.querySelector('.bar b').style.width = p + '%'; loader.querySelector('.pct').textContent = Math.round(p) + '%'; };
  setLoad(8);
  // Si algo falla, explicarlo en el propio cargador en vez de dejarlo congelado
  const fail = (why) => {
    loader.classList.remove('done'); loader.classList.add('failed');
    const tx = why === 'webgl'
      ? (lang === 'en' ? 'Your browser or device cannot show 3D graphics (WebGL is off or not supported). Try an up-to-date Chrome, Edge, Firefox or Safari, or turn on hardware acceleration.' : 'Tu navegador o equipo no puede mostrar gráficos 3D (WebGL está desactivado o no es compatible). Prueba con Chrome, Edge, Firefox o Safari actualizados, o activa la aceleración por hardware.')
      : (lang === 'en' ? 'The 3D model could not load. Check your connection and try again.' : 'No se pudo cargar el modelo 3D. Revisa tu conexión e inténtalo de nuevo.');
    loader.querySelector('.bar').remove(); loader.querySelector('.pct').outerHTML = `<p class="err" role="alert">${tx}</p><div class="erra"><button type="button" class="retry">${lang === 'en' ? 'Try again' : 'Reintentar'}</button><a href="${cfg.backHref || '../'}">${lang === 'en' ? 'Back to demos' : 'Volver a las demos'}</a></div>`;
    loader.querySelector('.retry').onclick = () => location.reload();
  };
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!hasGL) { fail('webgl'); throw new Error('WebGL no disponible'); }

  // Render
  const canvas = el('canvas', 'stage'); document.body.prepend(canvas);
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${t(cfg.title)} — ${lang === 'en' ? 'interactive 3D model; drag to rotate' : 'modelo 3D interactivo; arrastra para girar'}`);
  document.body.appendChild(el('div', 'vignette'));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: isThumb });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = (cfg.exposure ?? 1) * .82;
  const scene = new THREE.Scene();
  { const c = document.createElement('canvas'); c.width = 16; c.height = 512; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 512);
    gr.addColorStop(0, cfg.bgTop || '#1b2231'); gr.addColorStop(.55, cfg.bgMid || '#0e131c'); gr.addColorStop(1, cfg.bg || '#06080c'); g.fillStyle = gr; g.fillRect(0, 0, 16, 512);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; scene.background = tx; }
  scene.fog = new THREE.FogExp2(cfg.bg || '#06080c', (cfg.fog ?? .045) * .6);
  const camera = new THREE.PerspectiveCamera(cfg.fov ?? 40, 1, .05, 200);
  const cam0 = cfg.camera || { pos: [0, 2, 8], target: [0, 1, 0] };
  camera.position.set(...cam0.pos);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .07; controls.target.set(...cam0.target);
  controls.minDistance = cfg.minDist ?? 1.2; controls.maxDistance = (cfg.maxDist ?? 18) * portraitK(); controls.enablePan = false; controls.rotateSpeed = .6;
  controls.maxPolarAngle = Math.PI * .92;
  // multimuestreo 4× en el posprocesado: bordes suaves sin perder el brillo selectivo
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), (cfg.bloom?.strength ?? .7) * .45, cfg.bloom?.radius ?? .4, Math.max(.85, cfg.bloom?.threshold ?? .85));
  composer.addPass(bloom); composer.addPass(new OutputPass());
  renderer.localClippingEnabled = true; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = cfg.envIntensity ?? .3;
  scene.add(new THREE.HemisphereLight('#dfe9ff', '#1a1410', .35));
  const key = new THREE.DirectionalLight('#fff3e6', cfg.keyLight ?? 1.9); key.position.set(4, 7, 5); key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 6, bottom: -4, near: 1, far: 25 }); key.shadow.bias = -.0004; key.shadow.radius = 4; scene.add(key);
  const rim = new THREE.DirectionalLight('#9cc8ff', 1.4); rim.position.set(-5, 3, -6); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffd9c2', .45); fill.position.set(-4, 1, 6); scene.add(fill);
  if (cfg.floorY != null) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .38 })); sh.rotation.x = -Math.PI / 2; sh.position.y = cfg.floorY + .002; sh.receiveShadow = true; scene.add(sh); }

  function resize() {
    const w = Math.max(1, innerWidth), h = Math.max(1, innerHeight); renderer.setSize(w, h, false); composer.setSize(w, h); controls.maxDistance = (cfg.maxDist ?? 18) * portraitK();
    bloom.resolution.set(w / 2, h / 2); camera.aspect = w / h;
    // pantallas verticales: abrir el campo de visión para conservar el encuadre horizontal (con tope para no deformar)
    const f0 = cfg.fov ?? 40, asp = w / h, vf = 2 * Math.atan(Math.tan(f0 * Math.PI / 360) * Math.max(1, 1.2 / asp)) * 180 / Math.PI;
    camera.fov = Math.min(vf, f0 * 1.45); camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  // Cámara animada
  // en pantallas muy verticales el campo de visión tiene tope; lo que falta se compensa alejando la cámara
  function portraitK() {
    const f0 = (cfg.fov ?? 40) * Math.PI / 360, asp = innerWidth / innerHeight; if (isThumb || !(asp > 0) || !Number.isFinite(asp)) return 1;
    const want = Math.tan(f0) * Math.max(1, 1.2 / asp), got = Math.tan(Math.min(Math.atan(want), f0 * 1.45));
    return Math.min(1.5, Math.max(1, want / got) ** .75);
  }
  let fly = null;
  function flyTo(pos, target, dur = 1.8) {
    if (!pos) return; const p0 = camera.position.clone(), t0 = controls.target.clone();
    const t1 = new THREE.Vector3(...(target || [t0.x, t0.y, t0.z])), p1 = new THREE.Vector3(...pos);
    p1.sub(t1).multiplyScalar(portraitK()).add(t1);
    fly = { p0, t0, p1, t1, k: 0, dur: reduced ? .01 : dur };
  }

  // HUD
  const top = el('div', 'topbar');
  const back = el('a', 'rbtn glass', '←'); back.href = cfg.backHref || '../'; back.setAttribute('aria-label', t(L.back)); back.title = t(L.back);
  const pill = el('div', 'pill glass', `<button class="nav prev" type="button" aria-label="${t(L.prev)}">‹</button><span class="ic"></span><span class="tt"><b>${t(cfg.title)}</b><small></small></span><button class="nav next" type="button" aria-label="${t(L.next)}">›</button>`);
  const tr = el('div', 'tr');
  const sbtn = el('button', 'rbtn glass', '♪'); sbtn.type = 'button'; sbtn.setAttribute('aria-pressed', 'false'); sbtn.setAttribute('aria-label', t(L.sound)); sbtn.title = t(L.sound);
  const mbtn = el('button', 'rbtn glass', '☰'); mbtn.type = 'button'; mbtn.setAttribute('aria-label', t(L.chapters)); mbtn.setAttribute('aria-expanded', 'false');
  const xbtn = el('button', 'rbtn glass', '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><path d="M12 4v16M4 12h16" opacity=".5"/></svg>'); xbtn.type = 'button';
  const XL = { es: 'Rayos X: ver por dentro', en: 'X-ray: see inside' }; xbtn.setAttribute('aria-label', t(XL)); xbtn.title = t(XL); xbtn.setAttribute('aria-pressed', 'false');
  const setX = (v) => { xrayOn = v; xbtn.setAttribute('aria-pressed', String(v)); xrayItems.forEach((it) => it.holoParts.forEach((h) => (h.visible = v))); };
  xbtn.onclick = () => setX(!xrayOn);
  tr.append(xbtn, sbtn, mbtn); top.append(back, pill, tr); document.body.appendChild(top);
  const menu = el('nav', 'menu glass'); menu.setAttribute('aria-label', t(L.chapters)); document.body.appendChild(menu);
  sbtn.onclick = () => { const v = !sound.on; sound.enable(v); sbtn.setAttribute('aria-pressed', String(v)); };
  mbtn.onclick = () => { const o = menu.classList.toggle('open'); mbtn.setAttribute('aria-expanded', String(o)); };

  const bottom = el('div', 'bottom');
  const caption = el('div', 'caption glass', `<div class="ch"><span class="lab"></span><span class="dashes"></span></div><div class="line" aria-live="polite"></div>`);
  const action = el('div', 'action glass');
  bottom.append(caption, action); document.body.appendChild(bottom);
  const hint = el('div', 'hint', t(L.hint)); document.body.appendChild(hint);
  const labelsLayer = el('div'); labelsLayer.id = 'labels'; labelsLayer.setAttribute('aria-hidden', 'true'); document.body.appendChild(labelsLayer);
  const toastEl = el('div', 'toast glass'); document.body.appendChild(toastEl);
  let toastT;
  function toast(msg, ms = 2200) { toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), ms); }

  // Etiquetas 3D
  const labels = [];
  function label(name, detail, at, color = accent) {
    const e = el('div', 'lbl glass', `<i class="d" style="background:${color};color:${color}"></i><b>${t(name)}</b>${detail ? `<span>${t(detail)}</span>` : ''}`);
    labelsLayer.appendChild(e); const L1 = { e, at, show: true, set(v) { this.show = v; } }; labels.push(L1); return L1;
  }
  const v3 = new THREE.Vector3();
  function placeLabels() {
    const w = innerWidth, h = innerHeight;
    for (const l of labels) {
      if (l.at.isObject3D) l.at.getWorldPosition(v3); else v3.copy(l.at);
      v3.project(camera); const vis = l.show && v3.z < 1 && Math.abs(v3.x) < 1.1 && Math.abs(v3.y) < 1.1;
      l.e.classList.toggle('hide', !vis);
      if (vis) {
        // mantener la etiqueta completa dentro de la pantalla (en móvil se salían por los bordes)
        if (!l.wid || ++l.wc > 60) { l.wid = l.e.offsetWidth; l.hgt = l.e.offsetHeight; l.wc = 0; }
        const hw = l.wid / 2 + 6, x = Math.min(Math.max((v3.x * .5 + .5) * w, hw), Math.max(hw, w - hw));
        const y = Math.max((-v3.y * .5 + .5) * h, 66 + l.hgt * 1.4);
        vis_.push({ l, x, y, hw: l.wid / 2 + 3 });
      }
    }
    // separar etiquetas que se enciman: de arriba abajo, la de abajo se recorre lo justo
    vis_.sort((a, b) => a.y - b.y);
    for (let i = 0; i < vis_.length; i++) {
      const A = vis_[i]; let ny = A.y;
      for (let j = 0; j < i; j++) { const B = vis_[j], gap = Math.max(A.l.hgt, B.l.hgt) + 4; if (Math.abs(A.x - B.x) < A.hw + B.hw && ny - B.y < gap) ny = B.y + gap; }
      const off = ny - A.y; A.l.off = (A.l.off ?? off) + (off - (A.l.off ?? off)) * .25; A.y += A.l.off;
      A.l.e.style.transform = `translate(${A.x}px,${A.y}px) translate(-50%,-140%)`;
    }
    vis_.length = 0;
  }
  const vis_ = [];
  function showLabels(names) { labels.forEach((l, i) => l.set(names === 'all' || (names || []).includes(i))); }

  // Panel lateral
  function side(title, h = 110) {
    const s = el('div', 'side glass', `<h3><span>${t(title)}</span><span class="r"></span></h3>`);
    const c = el('canvas'); c.width = 640; c.height = h * 2; c.style.height = h + 'px'; s.appendChild(c); document.body.appendChild(s);
    return { root: s, canvas: c, ctx: c.getContext('2d'), right: s.querySelector('.r') };
  }

  // Barra de acción
  const ui = {
    clear() { action.innerHTML = ''; },
    metric(label, unit) {
      const m = el('div', 'metric', `<b>--</b><span><em>${t(unit)}</em>${t(label)}</span>`); action.appendChild(m);
      const b = m.querySelector('b'); return (v) => { b.textContent = v; };
    },
    button(label, onClick, o = {}) {
      const b = el('button', 'abtn', t(label)); b.type = 'button';
      if (o.toggle) { b.setAttribute('aria-pressed', String(!!o.value)); b.onclick = () => { const v = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', String(v)); onClick(v); }; }
      else b.onclick = onClick;
      action.appendChild(b); return b;
    },
    hold(label, onChange) {
      const b = el('button', 'hold', `<i></i>${t(label)}`); b.type = 'button'; let d = false;
      const set = (v) => { if (v === d) return; d = v; b.classList.toggle('down', v); onChange(v); };
      b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(true); });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => b.addEventListener(ev, () => set(false)));
      b.addEventListener('keydown', (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); set(true); } });
      b.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') set(false); });
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      action.appendChild(b); return b;
    },
    seg(options, value, onChange) {
      const s = el('div', 'seg'); s.setAttribute('role', 'group');
      options.forEach((o) => { const b = el('button', '', t(o.label)); b.type = 'button'; b.setAttribute('aria-pressed', String(o.value === value));
        b.onclick = () => { [...s.children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); onChange(o.value); }; s.appendChild(b); });
      action.appendChild(s); return s;
    },
    slider(label, o, onInput) {
      const w = el('label', 'slider'); const sp = el('span'); const i = el('input'); i.type = 'range';
      Object.assign(i, { min: o.min, max: o.max, step: o.step ?? 1, value: o.value });
      const fmt = o.fmt || ((v) => v); const upd = () => { sp.textContent = `${t(label)}: ${fmt(+i.value)}`; };
      i.oninput = () => { upd(); onInput(+i.value); }; upd(); w.append(sp, i); action.appendChild(w);
      return { input: i, set(v) { i.value = v; upd(); } };
    }
  };

  // Quiz
  const quizEl = el('div', 'quiz glass'); quizEl.setAttribute('role', 'dialog'); quizEl.setAttribute('aria-modal', 'false'); document.body.appendChild(quizEl);
  function quiz(questions, onDone) {
    let i = 0, score = 0; quizEl.classList.add('open');
    const show = () => {
      const q = questions[i];
      quizEl.innerHTML = `<div class="k">${lang === 'en' ? 'Quiz' : 'Ponte a prueba'} · ${i + 1}/${questions.length}</div><h2>${t(q.q)}</h2><div class="opts"></div><p class="fb" aria-live="polite"></p><div class="foot"></div>`;
      const opts = quizEl.querySelector('.opts'), fb = quizEl.querySelector('.fb'), foot = quizEl.querySelector('.foot');
      q.o.forEach((o, j) => { const b = el('button', 'opt', t(o)); b.type = 'button'; b.onclick = () => {
        [...opts.children].forEach((x, k) => { x.disabled = true; if (k === q.a) x.classList.add('ok'); });
        if (j === q.a) { score++; sound.beep(990, .12); } else { b.classList.add('bad'); sound.beep(220, .2, 'square', .03); }
        fb.textContent = (j === q.a ? (lang === 'en' ? 'Right. ' : 'Correcto. ') : (lang === 'en' ? 'Not quite. ' : 'No exactamente. ')) + t(q.e);
        const n = el('button', 'abtn', i < questions.length - 1 ? (lang === 'en' ? 'Next' : 'Siguiente') : (lang === 'en' ? 'See score' : 'Ver resultado')); n.type = 'button';
        n.onclick = () => { if (++i < questions.length) show(); else end(); }; foot.appendChild(n); n.focus(); }; opts.appendChild(b); });
    };
    const end = () => {
      quizEl.innerHTML = `<div class="k">${lang === 'en' ? 'Score' : 'Resultado'}</div><h2>${score} / ${questions.length}</h2><div class="foot"></div>`;
      const foot = quizEl.querySelector('.foot');
      const r = el('button', 'abtn', lang === 'en' ? 'Try again' : 'Repetir'); r.type = 'button'; r.onclick = () => { i = 0; score = 0; show(); };
      const c = el('button', 'abtn', lang === 'en' ? 'Close' : 'Cerrar'); c.type = 'button'; c.onclick = () => { quizEl.classList.remove('open'); onDone && onDone(score); };
      foot.append(r, c);
    };
    show();
  }
  const closeQuiz = () => quizEl.classList.remove('open');

  // Enlace a la siguiente demo (mismo idioma, orden de la galería)
  const ORDER = [['corazon', 'heart'], ['pulsioximetro', 'pulse-oximeter'], ['goteo', 'iv-drip'], ['pulmones', 'lungs'], ['rodilla', 'knee'], ['valvulas', 'heart-valves'], ['marcha', 'gait'], ['ventilador', 'ventilator'], ['tensiometro', 'blood-pressure'], ['desfibrilador', 'defibrillator'], ['ecg', 'ecg-12-lead']];
  const TITLES = { corazon: ['El corazón eléctrico', 'The electric heart'], pulsioximetro: ['La luz que mide el oxígeno', 'The light that measures oxygen'], goteo: ['Gota a gota', 'Drop by drop'], pulmones: ['Cómo respiras', 'How you breathe'],
    rodilla: ['La rodilla como palanca', 'The knee as a lever'], valvulas: ['Válvulas y ruidos del corazón', 'Heart valves and sounds'], marcha: ['Marcha paso a paso', 'Gait, step by step'], ventilador: ['Dentro del ventilador', 'Inside the ventilator'],
    tensiometro: ['Tomar la presión arterial', 'Taking blood pressure'], desfibrilador: ['El desfibrilador (DEA)', 'The defibrillator (AED)'], ecg: ['El ECG de 12 derivaciones', 'The 12-lead ECG'] };
  // Para saber más: referencias verificadas (PubMed) de cada demo
  const demoSlug = location.pathname.split('/').filter(Boolean).pop(), refs = refsFor(demoSlug);
  const refsEl = el('div', 'refs glass'); refsEl.setAttribute('role', 'dialog'); refsEl.setAttribute('aria-modal', 'true'); refsEl.setAttribute('aria-label', lang === 'en' ? 'Further reading' : 'Para saber más'); document.body.appendChild(refsEl);
  const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function openRefs() {
    if (!refs.length) return;
    refsEl.innerHTML = `<div class="rh"><div><span class="k">${lang === 'en' ? 'Further reading' : 'Para saber más'}</span><h2>${lang === 'en' ? 'Research behind this demo' : 'Investigación detrás de esta demo'}</h2></div><button type="button" class="x" aria-label="${lang === 'en' ? 'Close' : 'Cerrar'}">×</button></div>
      <ol>${refs.map((r) => `<li><p class="why">${esc(lang === 'en' ? r.en : r.es)}</p><a class="tt" href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener">${esc(r.t)}</a><p class="src">${esc(r.a)} <i>${esc(r.j)}</i>. ${r.y};${esc(r.v)}.</p>
        <p class="lk"><a href="https://doi.org/${esc(r.doi)}" target="_blank" rel="noopener">DOI ${esc(r.doi)}</a> · <a href="https://pubmed.ncbi.nlm.nih.gov/${esc(r.pmid)}/" target="_blank" rel="noopener">PubMed</a>${r.oa ? ` · <span class="oa">${lang === 'en' ? 'free full text' : 'texto completo gratis'}</span>` : ''}</p></li>`).join('')}</ol>
      <p class="note">${lang === 'en' ? 'References verified in PubMed. Teaching material: it does not replace clinical training or guidelines.' : 'Referencias verificadas en PubMed. Material educativo: no sustituye la formación clínica ni las guías.'}</p>`;
    refsEl.classList.add('open'); refsEl.querySelector('.x').onclick = closeRefs; refsEl.querySelector('.x').focus();
  }
  function closeRefs() { refsEl.classList.remove('open'); }
  function nextDemoLink() {
    if (refs.length) { const b = el('button', 'abtn refs-btn', lang === 'en' ? 'Further reading' : 'Para saber más'); b.type = 'button'; b.onclick = openRefs; action.appendChild(b); }
    const slug = location.pathname.split('/').filter(Boolean).pop(); const i = ORDER.findIndex((o) => o.includes(slug)); if (i < 0) return;
    const nx = ORDER[(i + 1) % ORDER.length], a = el('a', 'abtn next-demo', `${lang === 'en' ? 'Next demo' : 'Siguiente demo'}: ${TITLES[nx[0]][lang === 'en' ? 1 : 0]} →`);
    a.href = `../${lang === 'en' ? nx[1] : nx[0]}/`; action.appendChild(a);
    if (!document.querySelector('link[rel=prefetch]')) { const pf = document.createElement('link'); pf.rel = 'prefetch'; pf.href = a.href; document.head.appendChild(pf); }
  }
  // Capítulos y narración
  const chapters = cfg.chapters; let ci = -1, li = 0, lineT = 0, paused = false;
  const lineEl = caption.querySelector('.line'), labEl = caption.querySelector('.lab'), dashEl = caption.querySelector('.dashes');
  const LINE_S = 5.2;
  function renderLine() {
    const ch = chapters[ci]; lineEl.classList.add('fade');
    setTimeout(() => { lineEl.textContent = t(ch.lines[li]); lineEl.classList.remove('fade'); }, 180);
    [...dashEl.querySelectorAll('i')].forEach((d, k) => { d.classList.toggle('on', k < li); d.querySelector('b').style.width = k < li ? '100%' : '0'; });
  }
  function go(n, push = true) {
    n = clamp(n, 0, chapters.length - 1); if (n === ci) return;
    const prev = chapters[ci]; prev?.exit?.(ctx); closeQuiz();
    ci = n; li = 0; lineT = 0; const ch = chapters[ci];
    labEl.textContent = `${t(L.chapter)} ${ci + 1} · ${t(ch.title)}`;
    pill.querySelector('small').textContent = `${ci + 1} / ${chapters.length} · ${t(ch.title)}`;
    pill.querySelector('.prev').disabled = ci === 0; pill.querySelector('.next').disabled = ci === chapters.length - 1;
    dashEl.innerHTML = ch.lines.map(() => '<i><b></b></i>').join('') + `<button class="pause" type="button" aria-label="${t(L.pause)}">${paused ? '▶' : '❚❚'}</button>`;
    dashEl.querySelector('.pause').onclick = (e) => { paused = !paused; e.currentTarget.textContent = paused ? '▶' : '❚❚'; };
    [...menu.querySelectorAll('button')].forEach((b, k) => b.setAttribute('aria-current', String(k === ci)));
    if (ch.cam) flyTo(ch.cam.pos, ch.cam.target, ch.cam.dur);
    showLabels(ch.labels ?? []);
    setX(ch.xray ?? cfg.xray ?? false);
    ui.clear(); cfg.action?.(ui, ctx, ci); ch.enter?.(ctx);
    if (ci === chapters.length - 1) nextDemoLink();
    renderLine();
    if (push) history.replaceState(null, '', `#${lang === 'en' ? 'chapter' : 'capitulo'}-${ci + 1}`);
    sound.beep(660, .06, 'triangle', .03);
  }
  chapters.forEach((c, k) => { const b = el('button', '', `<span>${k + 1}</span><span>${t(c.title)}</span>`); b.type = 'button'; b.onclick = () => { go(k); menu.classList.remove('open'); }; menu.appendChild(b); });
  const other = cfg.otherLang ?? document.documentElement.dataset.other;
  if (cfg.sources) { menu.appendChild(el('div', 'lang', `<span style="font-size:.72rem">${lang === 'en' ? 'Model and sources: ' : 'Modelo y fuentes: '}${t(cfg.sources)}</span>`)); }
  if (cfg.credit) { const cr = el('div', 'lang', `<span style="font-size:.72rem">${t(cfg.credit)}</span>`); menu.appendChild(cr); hint.innerHTML = `${t(L.hint)}<br><span style="opacity:.75">${t(cfg.credit)}</span>`; }
  if (refs.length) { const rb = el('div', 'lang', `<button type="button" class="share">${lang === 'en' ? 'Further reading · references' : 'Para saber más · referencias'} (${refs.length})</button>`); menu.appendChild(rb); rb.querySelector('button').onclick = () => { menu.classList.remove('open'); openRefs(); }; }
  { const sh = el('div', 'lang', `<button type="button" class="share">${lang === 'en' ? 'Share this demo' : 'Compartir esta demo'} ↗</button>`); menu.appendChild(sh);
    sh.querySelector('button').onclick = async () => {
      const url = location.href.split('#')[0] + (ci > 0 ? `#${lang === 'en' ? 'chapter' : 'capitulo'}-${ci + 1}` : '');
      try { if (navigator.share) { await navigator.share({ title: document.title, url }); return; } await navigator.clipboard.writeText(url); toast(lang === 'en' ? 'Link copied' : 'Enlace copiado'); }
      catch (e) { if (e.name !== 'AbortError') toast(url); }
    }; }
  const fsOn = () => !!document.fullscreenElement;
  const toggleFS = () => { if (!document.fullscreenEnabled) return; (fsOn() ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {}); };
  if (document.fullscreenEnabled && !isThumb) {
    const fs = el('div', 'lang', '<button type="button" class="share fs"></button>'); menu.appendChild(fs); const fb = fs.querySelector('button');
    const setFB = () => { fb.textContent = fsOn() ? (lang === 'en' ? 'Exit full screen (F)' : 'Salir de pantalla completa (F)') : (lang === 'en' ? 'Full screen (F)' : 'Pantalla completa (F)'); };
    setFB(); document.addEventListener('fullscreenchange', setFB); fb.onclick = () => { toggleFS(); menu.classList.remove('open'); };
  }
  if (other) { const a = el('div', 'lang',`<a href="${other}" hreflang="${lang === 'en' ? 'es' : 'en'}">${t(L.other)}</a>`); menu.appendChild(a); }
  pill.querySelector('.prev').onclick = () => go(ci - 1);
  pill.querySelector('.next').onclick = () => go(ci + 1);
  addEventListener('keydown', (e) => {
    if (e.target.closest && e.target.closest('input,select,textarea')) return;
    if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) toggleFS();
    if (e.key === 'ArrowRight') go(ci + 1); if (e.key === 'ArrowLeft') go(ci - 1); if (e.key === 'Escape') { menu.classList.remove('open'); closeQuiz(); closeRefs(); }
  });

  const ctx = { setXray: (v) => setX(v), THREE, scene, camera, controls, renderer, flyTo, label, showLabels, side, ui, quiz, toast, sound, t, lang, state: {}, time: 0, timeScale: 1, accent, chapter: () => ci, go };
  if (params.has('audit') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__demo = ctx; // inspección local

  // Construcción y bucle
  const updaters = [];
  ctx.onFrame = (f) => updaters.push(f);
  (async () => {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) { /* sin fuentes */ }
    setLoad(35); dl.cb = (f) => setLoad(35 + 45 * f);
    try { await cfg.build(ctx); } catch (e) { console.error(e); fail('load'); return; }
    dl.cb = null; setLoad(80);
    const m = /(?:capitulo|chapter)-(\d+)/.exec(location.hash);
    const tc = params.get('thumb');
    if (isThumb && tc) { const ch = chapters[+tc - 1]; go(+tc - 1, false); fly = null; camera.position.set(...ch.cam.pos); controls.target.set(...ch.cam.target); controls.autoRotate = false; }
    else if (isThumb && cfg.thumb) { go(cfg.thumb.chapter ?? 0, false); fly = null; camera.position.set(...cfg.thumb.pos); controls.target.set(...cfg.thumb.target); controls.autoRotate = false; }
    else go(m ? +m[1] - 1 : 0, false);
    let last = performance.now(), frames = 0; const perf = { t: 0, n: 0, prev: performance.now(), done: isThumb };
    renderer.setAnimationLoop((now) => {
      const rdt = Math.min(.05, (now - last) / 1000); last = now;
      // rendimiento adaptativo: si el equipo no llega a ~30 fps, baja resolución y sombras (una sola vez)
      if (frames > 30 && frames <= 150 && !perf.done) { perf.t += (now - perf.prev); perf.n++; if (frames === 150) { perf.done = true; if (perf.t / perf.n > 33) { renderer.setPixelRatio(1); key.shadow.mapSize.set(1024, 1024); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } resize(); } } }
      perf.prev = now;
      const dt = rdt * ctx.timeScale; ctx.time += dt;
      for (const m of timed) m.uniforms.uTime.value += rdt;
      if (fly) { fly.k = Math.min(1, fly.k + rdt / fly.dur); const k = ease(fly.k); camera.position.lerpVectors(fly.p0, fly.p1, k); controls.target.lerpVectors(fly.t0, fly.t1, k); if (fly.k >= 1) fly = null; }
      if (reduced) controls.autoRotate = false; // respeta «reducir movimiento»
      controls.update();
      xray.k += ((xrayOn ? 1 : 0) - xray.k) * (1 - Math.exp(-rdt * 6));
      for (const it of xrayItems) { const m = it.real.material; if (it.base == null) it.base = m.opacity; const op = it.base * (1 - (1 - it.ghost) * xray.k), tr = op < .999 || m.transmission > 0; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = op; m.depthWrite = op > .6; it.real.castShadow = op > .6 && it.base > .9; }
      for (const f of updaters) f(dt, rdt);
      if (!paused && ci >= 0 && !isThumb) {
        const ch = chapters[ci]; lineT += rdt;
        const dash = dashEl.querySelectorAll('i')[li]; if (dash) dash.querySelector('b').style.width = Math.min(100, lineT / LINE_S * 100) + '%';
        if (lineT > LINE_S && li < ch.lines.length - 1) { li++; lineT = 0; renderLine(); }
      }
      composer.render(); placeLabels();
      if (++frames === 3) { setLoad(100); loader.classList.add('done'); }
    });
  })();
  return ctx;
}

// Utilidades de dibujo 2D para monitores
export function drawGrid(g, w, h, step = 24, color = 'rgba(45,212,191,.08)') {
  g.strokeStyle = color; g.lineWidth = 1; g.beginPath();
  for (let x = 0; x <= w; x += step) { g.moveTo(x, 0); g.lineTo(x, h); }
  for (let y = 0; y <= h; y += step) { g.moveTo(0, y); g.lineTo(w, y); } g.stroke();
}
// Traza de barrido como un monitor real: escribe en posición x y borra adelante
export function sweepTrace(canvas, color, o = {}) {
  const g = canvas.getContext('2d'), W = canvas.width, H = canvas.height; const buf = new Float32Array(W).fill(NaN); let x = 0, acc = 0;
  return {
    push(v, dt, speed = o.speed ?? 180) {
      acc += dt * speed; while (acc >= 1) { acc -= 1; buf[x] = v; for (let k = 1; k < 18; k++) buf[(x + k) % W] = NaN; x = (x + 1) % W; }
    },
    draw(scale = H * .38, base = H * .62) {
      g.clearRect(0, 0, W, H); drawGrid(g, W, H, 28);
      g.strokeStyle = color; g.lineWidth = 3; g.lineJoin = 'round'; g.shadowColor = color; g.shadowBlur = 10; g.beginPath(); let pen = false;
      for (let i = 0; i < W; i++) { const v = buf[i]; if (Number.isNaN(v)) { pen = false; continue; } const y = base - v * scale; if (pen) g.lineTo(i, y); else { g.moveTo(i, y); pen = true; } }
      g.stroke(); g.shadowBlur = 0; g.fillStyle = color; g.beginPath(); const yv = buf[(x - 1 + W) % W]; if (!Number.isNaN(yv)) { g.arc(x - 1, base - yv * scale, 5, 0, 7); g.fill(); }
    }
  };
}
