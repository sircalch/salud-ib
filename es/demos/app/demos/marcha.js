// Demo: Marcha paso a paso / Gait, step by step — pierna real (BodyParts3D) con cinemática normativa de la marcha
import { createDemo, THREE, seamPairs, fixSeam, weldBorders, holoMesh, gridFloor, loadPack, xray, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const C = { bone: '#f5e9cc', mus: '#ff6b6b', hip: '#fbbf24', knee: '#2dd4bf', ankle: '#a78bfa' };
const S = { cyc: 0, cadence: 105, layer: 'muscle', slow: false };

// Curvas normativas aproximadas (grados) a lo largo del ciclo (%). Flexión positiva; tobillo: dorsiflexión positiva.
const KEYS = {
  hip: [[0, 30], [10, 26], [30, 8], [50, -10], [60, -2], [75, 24], [87, 33], [100, 30]],
  knee: [[0, 4], [14, 18], [40, 4], [60, 38], [72, 62], [87, 25], [100, 4]],
  ankle: [[0, 0], [8, -6], [30, 6], [46, 10], [62, -17], [72, -8], [87, 1], [100, 0]]
};
function curve(k, x) { // interpolación coseno periódica
  const a = KEYS[k]; x = ((x % 100) + 100) % 100;
  for (let i = 0; i < a.length - 1; i++) if (x >= a[i][0] && x <= a[i + 1][0]) { const t = (x - a[i][0]) / (a[i + 1][0] - a[i][0]); const w = (1 - Math.cos(t * Math.PI)) / 2; return a[i][1] + (a[i + 1][1] - a[i][1]) * w; }
  return a[0][1];
}
const PHASES = [[0, 2, 'Contacto inicial', 'Initial contact'], [2, 12, 'Respuesta a la carga', 'Loading response'], [12, 31, 'Apoyo medio', 'Mid stance'], [31, 50, 'Apoyo terminal', 'Terminal stance'],
  [50, 62, 'Prebalanceo', 'Pre-swing'], [62, 75, 'Balanceo inicial', 'Initial swing'], [75, 87, 'Balanceo medio', 'Mid swing'], [87, 100.1, 'Balanceo terminal', 'Terminal swing']];
const phaseName = (x) => { const p = PHASES.find((q) => x >= q[0] && x < q[1]) || PHASES[0]; return lang === 'en' ? p[3] : p[2]; };
const win = (x, a, b) => smooth(a - 4, a + 4, x) * (1 - smooth(b - 4, b + 4, x));
const EMG = {
  quads: (x) => Math.max(win(x, -2, 15), win(x, 86, 104)),
  hams: (x) => Math.max(win(x, -2, 10), win(x, 82, 104)),
  calf: (x) => win(x, 10, 52) * smooth(10, 45, x),
  tibA: (x) => Math.max(win(x, -2, 12), win(x, 57, 104) * .8),
  medial: (x) => win(x, 60, 80) * .6,
  fib: (x) => win(x, 15, 50) * .7,
  glut: (x) => Math.max(win(x, -2, 30), win(x, 90, 104))
};

const chapters = [
  { title: { es: 'El ciclo de la marcha', en: 'The gait cycle' }, cam: { pos: [10.8, .8, 5.2], target: [0, -.2, .3] }, labels: [0, 1, 2], xray: false,
    lines: [
      { es: 'Un ciclo de marcha va de un contacto del talón al siguiente contacto del mismo pie.', en: 'A gait cycle runs from one heel strike to the next heel strike of the same foot.' },
      { es: 'Cerca del 60 % del ciclo el pie está en el suelo (apoyo) y el 40 % restante en el aire (balanceo).', en: 'About 60% of the cycle the foot is on the ground (stance) and the other 40% in the air (swing).' },
      { es: 'Esta es una pierna humana real. Cambia entre piel, músculo y hueso con los botones.', en: 'This is a real human leg. Switch between skin, muscle and bone with the buttons.' }
    ] },
  { title: { es: 'Las ocho fases', en: 'The eight phases' }, cam: { pos: [8.4, -.6, 2.4], target: [0, -.9, .4] }, labels: [], xray: false,
    lines: [
      { es: 'La clínica divide el ciclo en ocho fases. Su nombre aparece en el monitor mientras caminas.', en: 'Clinicians split the cycle into eight phases. Their names appear on the monitor as the leg walks.' },
      { es: 'En la respuesta a la carga la rodilla se dobla un poco para amortiguar el peso.', en: 'In loading response the knee bends slightly to absorb body weight.' },
      { es: 'En el balanceo la rodilla se flexiona unos 60° para que el pie no arrastre.', en: 'In swing the knee bends about 60° so the foot clears the ground.' }
    ], enter: (c) => { c.timeScale = .4; }, exit: (c) => { c.timeScale = 1; } },
  { title: { es: 'Cadera, rodilla y tobillo', en: 'Hip, knee and ankle' }, cam: { pos: [10.4, .7, 4.4], target: [0, -.2, .3] }, labels: [0, 1, 2], xray: true,
    lines: [
      { es: 'El monitor dibuja los ángulos de las tres articulaciones durante el ciclo.', en: 'The monitor plots the three joint angles through the cycle.' },
      { es: 'La cadera va de unos 30° de flexión a 10° de extensión; la rodilla tiene dos picos de flexión.', en: 'The hip moves from about 30° of flexion to 10° of extension; the knee shows two flexion peaks.' },
      { es: 'El tobillo hace una flexión plantar fuerte al despegar: es el empuje.', en: 'The ankle plantarflexes strongly at toe-off: that is the push.' }
    ] },
  { title: { es: '¿Quién trabaja?', en: 'Who is working?' }, cam: { pos: [-10.2, .6, 4.6], target: [0, -.2, .2] }, labels: [3, 4, 5], xray: false,
    lines: [
      { es: 'Los músculos se encienden cuando trabajan, según patrones típicos de electromiografía.', en: 'Muscles light up when they work, following typical electromyography patterns.' },
      { es: 'El cuádriceps frena la rodilla al apoyar; el tríceps sural (pantorrilla) empuja al final del apoyo.', en: 'The quadriceps brakes the knee at loading; the calf pushes at the end of stance.' },
      { es: 'El tibial anterior levanta el pie durante el balanceo para que no tropiece.', en: 'The tibialis anterior lifts the foot during swing so it does not trip.' }
    ] },
  { title: { es: 'Más rápido', en: 'Faster' }, cam: { pos: [10.8, .8, 5.2], target: [0, -.2, .3] }, labels: [], xray: false,
    lines: [
      { es: 'Mueve la cadencia: pasos por minuto. Una caminata cómoda ronda 100 a 115.', en: 'Change the cadence: steps per minute. A comfortable walk is around 100 to 115.' },
      { es: 'En fisioterapia se observan estas fases para detectar compensaciones y planear el tratamiento.', en: 'Physiotherapists watch these phases to spot compensations and plan treatment.' },
      { es: 'Curvas aproximadas de adultos sanos; cada persona camina distinto.', en: 'Approximate curves for healthy adults; everyone walks a little differently.' }
    ] },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [10.8, .8, 5.2], target: [0, -.2, .3] }, labels: [], xray: false,
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 5 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Qué porcentaje del ciclo dura el apoyo al caminar?', en: 'What share of the cycle is stance when walking?' }, o: [{ es: 'Cerca del 40 %', en: 'About 40%' }, { es: 'Cerca del 60 %', en: 'About 60%' }, { es: 'Cerca del 90 %', en: 'About 90%' }], a: 1,
    e: { es: 'Apoyo ≈ 60 % y balanceo ≈ 40 % a velocidad cómoda.', en: 'Stance ≈ 60% and swing ≈ 40% at a comfortable speed.' } },
  { q: { es: '¿Qué músculo evita que el pie arrastre en el balanceo?', en: 'Which muscle keeps the foot from dragging in swing?' }, o: [{ es: 'Gastrocnemio', en: 'Gastrocnemius' }, { es: 'Tibial anterior', en: 'Tibialis anterior' }, { es: 'Isquiotibiales', en: 'Hamstrings' }], a: 1,
    e: { es: 'Mantiene el tobillo en dorsiflexión durante el balanceo.', en: 'It keeps the ankle dorsiflexed during swing.' } },
  { q: { es: '¿Cuánto se flexiona la rodilla en el balanceo?', en: 'How much does the knee bend in swing?' }, o: [{ es: 'Unos 10°', en: 'About 10°' }, { es: 'Unos 60°', en: 'About 60°' }, { es: 'Unos 120°', en: 'About 120°' }], a: 1,
    e: { es: 'Ese pico permite que el pie despeje el suelo.', en: 'That peak lets the foot clear the ground.' } }
];

createDemo({
  title: { es: 'Marcha paso a paso', en: 'Gait, step by step' }, accent: '#ffb020', bg: '#06080b', bgTop: '#1d2427', fog: .025, floorY: -4,
  camera: chapters[0].cam, thumb: { pos: [8.6, .7, 4.0], target: [0, .1, .3], chapter: 0 }, bloom: { strength: .6, radius: .4, threshold: .4 }, credit: BP3D_CREDIT, sources: { es: 'Ángulos y EMG aproximados de datos normativos (Perry y Burnfield, Gait Analysis, 2010; Winter, Biomechanics and Motor Control of Human Movement, 2009).', en: 'Angles and EMG approximated from normative data (Perry & Burnfield, Gait Analysis, 2010; Winter, Biomechanics and Motor Control of Human Movement, 2009).' }, chapters, minDist: 1.5, maxDist: 14,
  action(ui, c, ci) {
    c.state.mPh = ui.metric({ es: 'del ciclo', en: 'of the cycle' }, '%');
    ui.seg([{ value: 'skin', label: { es: 'Piel', en: 'Skin' } }, { value: 'muscle', label: { es: 'Músculo', en: 'Muscle' } }, { value: 'bone', label: { es: 'Hueso', en: 'Bone' } }], S.layer, (v) => { S.layer = v; c.state.applyLayer?.(); });
    ui.button({ es: 'Cámara lenta', en: 'Slow motion' }, (v) => { c.timeScale = v ? .3 : 1; }, { toggle: true, value: c.timeScale < 1 });
    if (ci === 4) ui.slider({ es: 'Cadencia', en: 'Cadence' }, { min: 70, max: 135, value: S.cadence, fmt: (v) => v + (lang === 'en' ? ' steps/min' : ' pasos/min') }, (v) => { S.cadence = v; });
    if (ci === 5) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c;
    const [P, SK, PV] = await Promise.all([loadPack('knee', { center: [-80, -78, 405], scale: 1 / 190 }), loadPack('legskin', { center: [-80, -78, 405], scale: 1 / 190 }), loadPack('pelvis', { center: [-80, -78, 405], scale: 1 / 190 })]);
    weldBorders(SK.geo.thigh, SK.geo.shank, .06);
    const G = P.geo, tmp = V(0, 0, 0);
    const pts = (geo, f) => { const a = geo.attributes.position, o = []; for (let i = 0; i < a.count; i++) { tmp.fromBufferAttribute(a, i); if (f(tmp)) o.push(tmp.clone()); } return o; };
    const avg = (arr) => arr.reduce((s, p) => s.add(p), V(0, 0, 0)).divideScalar(Math.max(1, arr.length));
    const fb = G.femur.boundingBox, tbb = G.tibia.boundingBox;
    const K = avg(pts(G.femur, (p) => p.y < fb.min.y + .1)).lerp(avg(pts(G.tibia, (p) => p.y > tbb.max.y - .08)), .5);
    const A = avg(pts(G.tibia, (p) => p.y < tbb.min.y + .08)).add(V(0, -.06, 0));
    const top = pts(G.femur, (p) => p.y > fb.max.y - .14); const mx = top.reduce((s, p) => s + p.x, 0) / top.length;
    const H = avg(top.filter((p) => p.x > mx)); // cabeza femoral (lado medial)
    // jerarquía: cadera → muslo → rodilla → pierna → tobillo → pie. La pierna izquierda es el reflejo anatómico (línea media x = 0 del atlas)
    const MID = (0 - (-80)) / 190, ax = V(1, 0, 0);
    const buildLeg = (mirror) => {
      const leg = new THREE.Group(); scene.add(leg); if (mirror) { leg.scale.x = -1; leg.position.x = 2 * MID; }
      const pivot = (parent, at) => { const p = new THREE.Group(); p.position.copy(at); parent.add(p); const inner = new THREE.Group(); inner.position.copy(at).negate(); p.add(inner); return [p, inner]; };
      const [pH, thigh] = pivot(leg, H);
      const [pK0, shankRaw] = pivot(thigh, K); // pK0 está en coordenadas del muslo
      const [pA, foot] = pivot(shankRaw, A);
      const mk = (parent, geo, color, real, ghost, opts) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .015, rim: .45, intensity: .75, edges: false }); parent.add(m); return m; };
      mk(thigh, G.femur, C.bone, 'bone', .9); mk(thigh, G.patella, C.bone, 'bone', .9);
      // pelvis fija (hueso iliaco y sacro) y glúteos
      let topRing = [];
      const pelvisB = [mk(leg, PV.geo.hip, C.bone, 'bone', .9)]; if (!mirror) pelvisB.push(mk(leg, PV.geo.sacrum, C.bone, 'bone', .9));
      mk(shankRaw, G.tibia, C.bone, 'bone', .9); mk(shankRaw, G.fibula, C.bone, 'bone', .9);
      mk(foot, G.foot, C.bone, 'bone', .9);
      const M = {
        quads: ['rectus', 'vlat', 'vmed', 'vint'].map((k) => mk(thigh, G[k], C.mus, 'muscle', .08)),
        hams: [mk(thigh, G.hamstrings, C.mus, 'muscle', .08)], medial: [mk(thigh, G.medial, C.mus, 'muscle', .08)],
        glut: [mk(leg, PV.geo.gmax, C.mus, 'muscle', .08), mk(leg, PV.geo.gmed, C.mus, 'muscle', .08)],
        calf: [mk(shankRaw, G.calf, C.mus, 'muscle', .08)], tibA: [mk(shankRaw, G.tibAnt, C.mus, 'muscle', .08)], fib: [mk(shankRaw, G.fibLong, C.mus, 'muscle', .08)]
      };
      Object.values(M).flat().forEach((m) => { m.userData.real.material.emissive = new THREE.Color('#b3261c'); });
      // piel con skinning de tres segmentos (muslo, pierna, pie); cada pierna deforma su propia copia
      const geos = ['thigh', 'shank'].map((k) => (mirror ? SK.geo[k].clone() : SK.geo[k]));
      const skins = geos.map((geo) => mk(leg, geo, '#ffb38a', 'skin', .1, { side: THREE.DoubleSide }));
      const skinD = geos.map((geo) => { const pa = geo.attributes.position, b = Float32Array.from(pa.array), n = pa.count, w = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) { const y = b[i * 3 + 1]; const wt = smooth(K.y - .14, K.y + .14, y), wf = (1 - smooth(A.y - .02, A.y + .1, y)) * (1 - wt); w[i * 3] = wt; w[i * 3 + 2] = wf; w[i * 3 + 1] = Math.max(0, 1 - wt - wf); } return { pa, b, w, n, geo }; });
      // short deportivo: copia de la piel del muslo superior y la pelvis, separada 6 mm hacia afuera y deformada igual que la piel.
      // Los bordes se recortan en el shader según la altura original (y de reposo), así quedan rectos; arriba lo cierra una tapa.
      { const src = geos[0], sp = src.attributes.position, ix = src.index.array, yS = K.y + (H.y - K.y) * .48;
        let yMax = -1e9; for (let i = 0; i < sp.count; i++) yMax = Math.max(yMax, sp.getY(i)); const yT = Math.min(H.y + .2, yMax - .12);
        const bins = new Map(), bk = (y) => Math.round(y / .03);
        for (let i = 0; i < sp.count; i++) { const k = bk(sp.getY(i)); const b = bins.get(k) || [0, 0, 0]; b[0] += sp.getX(i); b[1] += sp.getZ(i); b[2]++; bins.set(k, b); }
        // tubo liso: en cada altura, envolvente convexa del corte de la piel (sin la zona medial de la ingle), separada hacia afuera;
        // así la tela no copia los bultos del modelo anatómico y el dobladillo queda recto
        const OFF = .04, NA = 72, yHi = yT - .18, NLV = Math.max(8, Math.round((yHi - yS) / .02) + 1), xMed = MID - .16; // la piel medial por encima del dobladillo ya está oculta (ingle): la tela no la envuelve
        const hullOf = (P) => { P.sort((a2, b2) => a2.x - b2.x || a2.z - b2.z); const cr = (o, a2, b2) => (a2.x - o.x) * (b2.z - o.z) - (a2.z - o.z) * (b2.x - o.x), lo = [], hi = [];
          for (const q of P) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
          for (let i = P.length - 1; i >= 0; i--) { const q = P[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); } return lo.slice(0, -1).concat(hi.slice(0, -1)); };
        const rays = (H2, c) => Array.from({ length: NA }, (_, j) => { const t = j / NA * Math.PI * 2, dx = Math.cos(t), dz = Math.sin(t); let best = 0;
          for (let i = 0; i < H2.length; i++) { const p0 = H2[i], p1 = H2[(i + 1) % H2.length], ex = p1.x - p0.x, ez = p1.z - p0.z, den = dx * ez - dz * ex; if (Math.abs(den) < 1e-9) continue;
            const ox = p0.x - c.x, oz = p0.z - c.z, r = (ox * ez - oz * ex) / den, u = (ox * dz - oz * dx) / den; if (r > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.max(best, r); } return best; });
        // eje recto (regresión de los centros por altura) y, para cada altura y ángulo, el radio máximo de la piel; luego dilatar y suavizar
        const lvY = Array.from({ length: NLV }, (_, k) => yS - .01 + (yHi - yS + .01) * k / (NLV - 1)), pts = [];
        for (let i = 0; i < sp.count; i++) { const y = sp.getY(i); if (y > yS - .08 && y < yHi + .08 && (sp.getX(i) < xMed || y < yS)) pts.push([sp.getX(i), y, sp.getZ(i)]); }
        let sy = 0, sx = 0, sz = 0, syy = 0, sxy = 0, szy = 0; for (const q of pts) { sy += q[1]; sx += q[0]; sz += q[2]; syy += q[1] * q[1]; sxy += q[0] * q[1]; szy += q[2] * q[1]; }
        const nP = pts.length || 1, vy = syy / nP - (sy / nP) ** 2 || 1, kx = (sxy / nP - sx / nP * sy / nP) / vy, kz = (szy / nP - sz / nP * sy / nP) / vy, axc = (y) => ({ x: sx / nP + kx * (y - sy / nP), z: sz / nP + kz * (y - sy / nP) });
        let R0 = lvY.map(() => new Float32Array(NA));
        for (const q of pts) { for (let k = 0; k < NLV; k++) { if (Math.abs(q[1] - lvY[k]) > .045) continue; const c = axc(q[1]), dx = q[0] - c.x, dz = q[2] - c.z, j = ((Math.round(Math.atan2(dz, dx) / (Math.PI * 2) * NA) % NA) + NA) % NA; R0[k][j] = Math.max(R0[k][j], Math.hypot(dx, dz)); } }
        for (const row of R0) { const mx = Math.max(...row); for (let j = 0; j < NA; j++) if (!row[j]) { let l = 1; while (l < NA && !row[(j + l) % NA] && !row[(j - l + NA) % NA]) l++; row[j] = Math.max(row[(j + l) % NA], row[(j - l + NA) % NA]) || mx; } }
        const dil = R0.map((row, k) => row.map((_, j) => { let m = 0; for (let dk = -3; dk <= 3; dk++) { const kk = Math.min(NLV - 1, Math.max(0, k + dk)); for (let dj = -4; dj <= 4; dj++) m = Math.max(m, R0[kk][(j + dj + NA) % NA]); } return m; }));
        let Rs = dil; for (let it = 0; it < 8; it++) Rs = Rs.map((row, k) => row.map((v, j) => { const a2 = Rs[Math.max(0, k - 1)][j], b2 = Rs[Math.min(NLV - 1, k + 1)][j]; return (v * 4 + a2 + b2 + row[(j + 1) % NA] + row[(j + NA - 1) % NA]) / 8; }));
        const lv = lvY.map((y, k) => { const c = axc(y); return { y, c, r: Rs[k].map((v, j) => { const ct = Math.cos(j / NA * Math.PI * 2), lim = ct > .05 ? (MID - .012 - c.x) / ct - OFF : 1e9; return Math.min(Math.max(v, R0[k][j]), Math.max(lim, R0[k][j] * .9)); }) }; }); // la cara interna no cruza la línea media
        const pos = [], byA = [], keep = [];
        lv.forEach((L2, k) => { for (let j = 0; j < NA; j++) { const t = j / NA * Math.PI * 2, rr = L2.r[j] + OFF + (k === 0 ? -.006 : 0); pos.push(L2.c.x + Math.cos(t) * rr, L2.y, L2.c.z + Math.sin(t) * rr); byA.push(L2.y); } });
        for (let k = 0; k < NLV - 1; k++) for (let j = 0; j < NA; j++) { const a2 = k * NA + j, b2 = k * NA + (j + 1) % NA; keep.push(a2, b2, a2 + NA, b2, b2 + NA, a2 + NA); }
        { const Lt = lv[NLV - 1], ci = pos.length / 3, t0 = (NLV - 1) * NA; pos.push(Lt.c.x, Lt.y, Lt.c.z); byA.push(Lt.y - .001); for (let j = 0; j < NA; j++) keep.push(ci, t0 + (j + 1) % NA, t0 + j); } // tapa del tubo: si el muslo sube, se ve tela y no un hueco
        const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute('aBy', new THREE.Float32BufferAttribute(byA, 1)); sg.setAttribute('aBx', new THREE.Float32BufferAttribute(new Float32Array(byA.length), 1)); sg.setIndex(keep); sg.addGroup(0, (NLV - 1) * NA * 6, 0); sg.addGroup((NLV - 1) * NA * 6, NA * 3, 1); sg.computeVertexNormals();
        const NL = String.fromCharCode(10);
        const cutMat = (m, lo, hi, groin = false) => { m.onBeforeCompile = (sh) => { sh.vertexShader = 'attribute float aBy;' + NL + 'attribute float aBx;' + NL + 'varying float vBy;' + NL + 'varying float vBx;' + NL + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + NL + 'vBy = aBy; vBx = aBx;');
          sh.fragmentShader = 'varying float vBy;' + NL + 'varying float vBx;' + NL + sh.fragmentShader.replace('void main() {', 'void main() {' + NL + ` if (vBy < ${lo.toFixed(4)} || vBy > ${hi.toFixed(4)}) discard;` + (groin ? ` if (vBy > ${yS.toFixed(4)} && vBx > ${(MID - .16).toFixed(4)}) discard;` : '')); }; m.customProgramCacheKey = () => `cut${lo.toFixed(3)}_${hi.toFixed(3)}_${groin ? 1 : 0}`; m.needsUpdate = true; };
        const cloth = new THREE.MeshPhysicalMaterial({ color: '#1f2a3a', roughness: .72, sheen: .6, sheenColor: new THREE.Color('#5a6f8f'), side: THREE.DoubleSide }); cutMat(cloth, yS, 99);
        const shorts = new THREE.Mesh(sg, [cloth, new THREE.MeshStandardMaterial({ color: '#0b0f16', roughness: 1, side: THREE.DoubleSide })]); shorts.castShadow = true; leg.add(shorts);
        shorts.userData.cloth = true; geos.push(sg); skins.push(shorts);
        const pa = sg.attributes.position, b = Float32Array.from(pa.array), n = pa.count, w = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const y = b[i * 3 + 1], wt = smooth(K.y - .14, K.y + .14, y); w[i * 3] = wt; w[i * 3 + 1] = 1 - wt; } skinD.push({ pa, b, w, n, geo: sg }); // mismos pesos que la piel
        // arriba, tela y piel se mezclan con la pelvis (fija): se doblan en la ingle en vez de despegarse de la cintura
        for (const D of [skinD[0], skinD[skinD.length - 1]]) { D.wp = new Float32Array(D.n); for (let i = 0; i < D.n; i++) D.wp[i] = smooth(yHi - .32, yHi + .01, D.b[i * 3 + 1]); }
        // la piel también se corta a la misma altura (oculta el borde irregular del modelo)
        src.setAttribute('aBy', new THREE.Float32BufferAttribute(Float32Array.from({ length: sp.count }, (_, i) => sp.getY(i)), 1)); src.setAttribute('aBx', new THREE.Float32BufferAttribute(Float32Array.from({ length: sp.count }, (_, i) => sp.getX(i)), 1)); cutMat(skins[0].userData.real.material, -99, yHi - .015, true);
        // contorno superior (en reposo) para la pretina común a las dos piernas
        topRing = []; for (let i = 0; i < n; i++) if (Math.abs(b[i * 3 + 1] - (yT - .15)) < .04) topRing.push(V(b[i * 3], yT, b[i * 3 + 2])); }
      const seam = seamPairs(geos[0], geos[1], .004);
      const mT = new THREE.Matrix4(), mS = new THREE.Matrix4(), mF = new THREE.Matrix4(), v1 = V(0, 0, 0), v2 = V(0, 0, 0), v3 = V(0, 0, 0);
      const deformSkin = () => {
        leg.updateMatrixWorld(true); const inv = leg.matrixWorld.clone().invert();
        mT.multiplyMatrices(inv, thigh.matrixWorld); mS.multiplyMatrices(inv, shankRaw.matrixWorld); mF.multiplyMatrices(inv, foot.matrixWorld);
        for (const D of skinD) { const a = D.pa.array, b = D.b, w = D.w; for (let i = 0; i < D.n; i++) {
          v1.set(b[i * 3], b[i * 3 + 1], b[i * 3 + 2]); v2.copy(v1); v3.copy(v1); v1.applyMatrix4(mT); v2.applyMatrix4(mS); v3.applyMatrix4(mF);
          a[i * 3] = v1.x * w[i * 3] + v2.x * w[i * 3 + 1] + v3.x * w[i * 3 + 2]; a[i * 3 + 1] = v1.y * w[i * 3] + v2.y * w[i * 3 + 1] + v3.y * w[i * 3 + 2]; a[i * 3 + 2] = v1.z * w[i * 3] + v2.z * w[i * 3 + 1] + v3.z * w[i * 3 + 2];
            if (D.wp) { const p = D.wp[i]; if (p > 0) for (let q = 0; q < 3; q++) a[i * 3 + q] += (b[i * 3 + q] - a[i * 3 + q]) * p; } }
          D.pa.needsUpdate = true; D.geo.computeVertexNormals(); }
        fixSeam(seam);
      };
      const pose = (x) => { pH.quaternion.setFromAxisAngle(ax, -curve('hip', x) * Math.PI / 180); pK0.quaternion.setFromAxisAngle(ax, curve('knee', x) * Math.PI / 180); pA.quaternion.setFromAxisAngle(ax, -curve('ankle', x) * Math.PI / 180); leg.updateMatrixWorld(true); };
      const bones = []; for (const g of [thigh, shankRaw, foot]) g.children.forEach((m) => { if (m.userData?.real?.material && !Object.values(M).flat().includes(m) && !skins.includes(m)) bones.push(m); });
      return { leg, pH, pK0, pA, thigh, shankRaw, foot, M, skins, deformSkin, pose, pelvisB, bones, topRing };
    };
    const R = buildLeg(false), Lf = buildLeg(true);
    { // pretina y tapa únicas que rodean las dos piernas: envolvente convexa del contorno superior, suavizada
      const pts = [...R.topRing.map((p) => ({ x: p.x, z: p.z })), ...Lf.topRing.map((p) => ({ x: 2 * MID - p.x, z: p.z }))].sort((a, b) => a.x - b.x || a.z - b.z);
      const cr = (o, a, b) => (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x); const lo = [], hi = [];
      for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
      for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
      const hull = lo.slice(0, -1).concat(hi.slice(0, -1)), yT = (R.topRing[0]?.y ?? H.y) - .15;
      if (hull.length > 3) { const curve = new THREE.CatmullRomCurve3(hull.map((p) => V(p.x, yT, p.z)), true, 'centripetal'); const ring = curve.getSpacedPoints(120); const c0 = ring.reduce((a2, p2) => a2.add(p2), V(0, 0, 0)).divideScalar(ring.length); ring.forEach((p2) => p2.sub(c0).multiplyScalar(1.03).add(c0));
        // al flexionar la cadera el muslo sube: todo lo que pase por encima de la tapa se recorta (la tapa cierra el corte)
        { const clipP = new THREE.Plane(V(0, -1, 0), yT + .004); for (const Lg of [R, Lf]) Lg.skins.filter((m) => !m.userData.cloth).forEach((m) => { for (const mt of new Set([m.material, m.userData?.real?.material])) if (mt) { mt.clippingPlanes = [clipP]; mt.needsUpdate = true; } }); }
        const plain = new THREE.MeshPhysicalMaterial({ color: '#1f2a3a', roughness: .72, sheen: .6, sheenColor: new THREE.Color('#5a6f8f'), side: THREE.DoubleSide });
        const cap = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(ring.map((p2) => new THREE.Vector2(p2.x - c0.x, -(p2.z - c0.z))))), plain); cap.rotation.x = -Math.PI / 2; cap.position.copy(c0); cap.position.y += .1; cap.scale.set(.5, .5, 1); scene.add(cap);
        const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 160, .022, 8, true), new THREE.MeshPhysicalMaterial({ color: '#18212e', roughness: .7, sheen: .4, sheenColor: new THREE.Color('#4a5d7a') })); R.skins.push(cap); // sin aro oscuro: la cintura es una cúpula de tela, no una bandeja
        // faja fija alrededor de la pelvis: tapa el borde del muslo cuando la cadera se flexiona
        { const SC = [.5, .72, .87, .955, .995, 1.005, 1.01, 1.012], levels = [-.1, -.088, -.065, -.035, -.01, 0, .05, .1].map((dy, k) => ring.map((p2) => V(c0.x + (p2.x - c0.x) * SC[k], yT - dy, c0.z + (p2.z - c0.z) * SC[k]))), N = ring.length, pos = [], idx = [];
          levels.forEach((rg) => rg.forEach((p2) => pos.push(p2.x, p2.y, p2.z))); for (let v = 0; v < levels.length - 1; v++) for (let i = 0; i < N; i++) { const a2 = v * N + i, b2 = v * N + (i + 1) % N, c2 = a2 + N, d2 = b2 + N; idx.push(a2, c2, b2, b2, c2, d2); }
          const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(idx); g2.computeVertexNormals(); const wm = plain.clone(); wm.side = THREE.BackSide; const waist = new THREE.Mesh(g2, wm); waist.castShadow = true; scene.add(waist); const liner = new THREE.Mesh(g2, new THREE.MeshStandardMaterial({ color: '#0b0f16', roughness: 1, side: THREE.FrontSide })); scene.add(liner); R.skins.push(waist, liner); } } }
    const { pH, pK0, pA, thigh, shankRaw, foot, M } = R;
    const opp = (x) => (x + 50) % 100; // la otra pierna va medio ciclo desfasada
    const deformSkin = () => { R.deformSkin(); Lf.deformSkin(); };
    c.state.applyLayer = () => { for (const Lg of [R, Lf]) { Lg.skins.forEach((m) => (m.visible = S.layer === 'skin')); Object.values(Lg.M).flat().forEach((m) => (m.visible = S.layer === 'muscle' || (S.layer === 'skin' && xray.k > .05))); Lg.pelvisB.concat(Lg.bones).forEach((m) => (m.visible = S.layer !== 'skin' || xray.k > .05)); } };
    c.state.applyLayer();
    // postura según el porcentaje del ciclo
    const pose = (x) => { R.pose(x); Lf.pose(opp(x)); };
    // suelo: punto más bajo del pie a lo largo del ciclo; banda que avanza a la velocidad del pie en apoyo
    const fbb = G.foot.boundingBox, corners = []; for (const x of [fbb.min.x, fbb.max.x]) for (const y of [fbb.min.y, fbb.max.y]) for (const z of [fbb.min.z, fbb.max.z]) corners.push(V(x, y, z));
    const footLow = () => corners.reduce((m, p) => Math.min(m, foot.localToWorld(p.clone()).y), 1e9);
    let floorY = 1e9; for (let x = 0; x < 100; x += 2) { pose(x); floorY = Math.min(floorY, footLow()); }
    pose(5); const z0 = pA.getWorldPosition(V(0, 0, 0)).z; pose(45); const z1 = pA.getWorldPosition(V(0, 0, 0)).z; const stanceDz = Math.abs(z0 - z1);
    const floor = gridFloor('#ffb020', 60, floorY - .01); scene.add(floor);
    const shadowY = floorY; scene.traverse((o) => { if (o.material && o.material.isShadowMaterial) o.position.y = shadowY; });
    // monitor: ángulos articulares
    const mon = c.side({ es: 'Ángulos articulares', en: 'Joint angles' }, 130);
    const g = mon.ctx, W = mon.canvas.width, Hh = mon.canvas.height;
    const drawChart = (x) => {
      g.clearRect(0, 0, W, Hh); const y = (deg) => Hh * .88 - (deg + 20) / 90 * Hh * .8;
      g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(0, 0, W * .6, Hh); // apoyo
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; g.beginPath(); for (const d of [-20, 0, 20, 40, 60]) { g.moveTo(0, y(d)); g.lineTo(W, y(d)); } g.stroke();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '600 20px "Manrope Variable",system-ui'; g.fillText(lang === 'en' ? 'stance' : 'apoyo', 10, 24); g.fillText(lang === 'en' ? 'swing' : 'balanceo', W * .62, 24);
      for (const [k, col] of [['hip', C.hip], ['knee', C.knee], ['ankle', C.ankle]]) { g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); for (let i = 0; i <= 100; i++) { const px = i / 100 * W, py = y(curve(k, i)); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(x / 100 * W, y(curve(k, x)), 7, 0, 7); g.fill(); }
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(x / 100 * W, 0); g.lineTo(x / 100 * W, Hh); g.stroke();
    };
    // etiquetas
    c.label({ es: 'Cadera', en: 'Hip' }, null, pH, C.hip);
    c.label({ es: 'Rodilla', en: 'Knee' }, null, thigh.localToWorld(K.clone()) && pK0, C.knee);
    c.label({ es: 'Tobillo', en: 'Ankle' }, null, pA, C.ankle);
    const lq = new THREE.Object3D(); lq.position.copy(G.rectus.boundingSphere.center).add(V(0, 0, .45)); thigh.add(lq);
    const lc = new THREE.Object3D(); lc.position.copy(G.calf.boundingSphere.center).add(V(0, 0, -.45)); shankRaw.add(lc);
    const lt = new THREE.Object3D(); lt.position.copy(G.tibAnt.boundingSphere.center).add(V(0, 0, .4)); shankRaw.add(lt);
    c.label({ es: 'Cuádriceps', en: 'Quadriceps' }, null, lq, C.mus);
    c.label({ es: 'Pantorrilla', en: 'Calf' }, null, lc, C.mus);
    c.label({ es: 'Tibial anterior', en: 'Tibialis anterior' }, null, lt, C.mus);
    let lastPhase = '';
    c.onFrame((dt) => {
      const T = 120 / S.cadence; // segundos por ciclo (dos pasos)
      S.cyc = (S.cyc + dt / T * 100) % 100; const x = S.cyc;
      pose(x);
      if (S.layer === 'skin' || xray.k > .05) deformSkin();
      if (S.layer === 'skin') c.state.applyLayer();
      floor.position.z = (floor.position.z - dt * stanceDz / (.4 * T)) % 5; // la banda acompaña al pie de apoyo
      const act = { quads: EMG.quads(x), hams: EMG.hams(x), calf: EMG.calf(x), tibA: EMG.tibA(x), medial: EMG.medial(x), fib: EMG.fib(x), glut: EMG.glut(x) };
      for (const [k, arr] of Object.entries(M)) arr.forEach((m) => { m.userData.real.material.emissiveIntensity = .28 * act[k]; m.userData.mat.uniforms.uBoost.value = act[k] * .8; });
      const xo = opp(x), act2 = { quads: EMG.quads(xo), hams: EMG.hams(xo), calf: EMG.calf(xo), tibA: EMG.tibA(xo), medial: EMG.medial(xo), fib: EMG.fib(xo), glut: EMG.glut(xo) };
      for (const [k, arr] of Object.entries(Lf.M)) arr.forEach((m) => { m.userData.real.material.emissiveIntensity = .28 * act2[k]; m.userData.mat.uniforms.uBoost.value = act2[k] * .8; });
      drawChart(x);
      const ph = phaseName(x); mon.right.textContent = ph;
      if (ph !== lastPhase) { lastPhase = ph; if (x < 2) c.sound.thump(70, .08, .12); }
      c.state.mPh?.(Math.round(x));
    });
  }
});
