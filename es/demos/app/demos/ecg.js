// Demo: El electrocardiograma de 12 derivaciones / The 12-lead ECG — paciente con piel, costillas y corazón reales (BodyParts3D)
import { createDemo, THREE, drapeBlanket, pillowGeo, pillowMat, holoMesh, gridFloor, loadPack, realMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang, glowMat } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CEN = [0, -110, 1255], SC = 1 / 140;
const L = (x, y, z) => V((x - CEN[0]) * SC, (z - CEN[2]) * SC, -(y - CEN[1]) * SC);
const T = (o) => (lang === 'en' ? o.en : o.es);
// colores AHA de los cables
const EL = {
  RA: { col: '#f2f2f2', es: 'RA · brazo derecho', en: 'RA · right arm' }, LA: { col: '#1a1a1a', es: 'LA · brazo izquierdo', en: 'LA · left arm' },
  RL: { col: '#2fa35a', es: 'RL · pierna derecha (tierra)', en: 'RL · right leg (ground)' }, LL: { col: '#d8342c', es: 'LL · pierna izquierda', en: 'LL · left leg' },
  V1: { col: '#d8342c', es: 'V1 · 4.º espacio, borde esternal derecho', en: 'V1 · 4th space, right sternal border' }, V2: { col: '#e9c21b', es: 'V2 · 4.º espacio, borde esternal izquierdo', en: 'V2 · 4th space, left sternal border' },
  V3: { col: '#2fa35a', es: 'V3 · entre V2 y V4', en: 'V3 · between V2 and V4' }, V4: { col: '#2b67d6', es: 'V4 · 5.º espacio, línea medioclavicular', en: 'V4 · 5th space, midclavicular line' },
  V5: { col: '#f08a24', es: 'V5 · línea axilar anterior', en: 'V5 · anterior axillary line' }, V6: { col: '#7d3fc0', es: 'V6 · línea axilar media', en: 'V6 · mid-axillary line' }
};
// dirección de cada derivación (x = izquierda del paciente, y = inferior, z = anterior)
const deg = (a) => a * Math.PI / 180;
const fr = (a) => V(Math.cos(deg(a)), Math.sin(deg(a)), 0);
const hz = (a) => V(Math.cos(deg(a)), .12, Math.sin(deg(a))).normalize();
const LEADS = { I: fr(0), II: fr(60), III: fr(120), aVR: fr(-150), aVL: fr(-30), aVF: fr(90), V1: hz(115), V2: hz(94), V3: hz(76), V4: hz(58), V5: hz(32), V6: hz(5) };
const ORDER = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
const GRID = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
const S = { hr: 70, ph: 0, axis: 55, swap: false, lead: 'II', placed: 0, limbs: 0, show3d: false, xr: 0 };

// ---------- dipolo cardiaco (vectocardiograma didáctico) ----------
const gs = (x, m, s) => Math.exp(-(((x - m) / s) ** 2));
const rotF = (v, a) => { const c = Math.cos(deg(a)), s = Math.sin(deg(a)); return V(v.x * c - v.y * s, v.x * s + v.y * c, v.z); };
function dipole(p) { // p = fase del ciclo 0..1
  const out = V(0, 0, 0), ax = S.axis - 55; // rotación del eje QRS respecto al normal
  out.addScaledVector(V(.55, .75, .15).normalize(), .16 * gs(p, .11, .035)); // P
  const q = (p - .2) / .1; // QRS de 100 ms
  if (q > -.3 && q < 1.4) {
    out.addScaledVector(rotF(V(-.45, .2, .75).normalize(), ax * .4), .32 * gs(q, .12, .1)); // septal: derecha-anterior
    out.addScaledVector(rotF(V(.78, .55, -.3).normalize(), ax), 1.7 * gs(q, .45, .15)); // pared libre del VI
    out.addScaledVector(rotF(V(.05, -.45, -.6).normalize(), ax * .5), .45 * gs(q, .8, .1)); // basal posterior
  }
  out.addScaledVector(rotF(V(.6, .6, .2).normalize(), ax * .6), .34 * gs(p, .52, .07)); // T
  return out;
}
function leadVal(name, p) {
  const d = dipole(p); let v = d.dot(LEADS[name]);
  if (S.swap) { if (name === 'I') v = -v; else if (name === 'II') v = d.dot(LEADS.III); else if (name === 'III') v = d.dot(LEADS.II); else if (name === 'aVR') v = d.dot(LEADS.aVL); else if (name === 'aVL') v = d.dot(LEADS.aVR); }
  return v;
}

const chapters = [
  { title: { es: 'El electrocardiógrafo', en: 'The electrocardiograph' }, cam: null, labels: [0, 1],
    lines: [
      { es: 'Un electrocardiograma registra la actividad eléctrica del corazón desde la piel, con 10 electrodos.', en: 'An electrocardiogram records the heart\'s electrical activity from the skin, using 10 electrodes.' },
      { es: 'Con esos 10 electrodos el equipo calcula 12 derivaciones: 12 puntos de vista del mismo latido.', en: 'From those 10 electrodes the machine computes 12 leads: 12 points of view of the same heartbeat.' },
      { es: 'El paciente es una reconstrucción con piel, costillas y corazón reales de un atlas anatómico.', en: 'The patient is a reconstruction with real skin, ribs and heart from an anatomical atlas.' }
    ], enter: () => { S.placed = 0; S.limbs = 0; } },
  { title: { es: 'Electrodos de extremidades', en: 'Limb electrodes' }, cam: null, labels: [2, 3, 4, 5],
    lines: [
      { es: 'Cuatro electrodos: brazo derecho, brazo izquierdo, pierna izquierda y pierna derecha (tierra).', en: 'Four electrodes: right arm, left arm, left leg and right leg (ground).' },
      { es: 'Forman el triángulo de Einthoven: I, II y III miden la diferencia entre dos de ellos.', en: 'They form Einthoven\'s triangle: I, II and III measure the difference between two of them.' },
      { es: 'Aquí las piernas van en la parte baja del abdomen (colocación de Mason-Likar), como en monitorización y pruebas de esfuerzo.', en: 'Here the leg electrodes sit on the lower abdomen (Mason-Likar placement), as used in monitoring and stress tests.' }
    ], enter: () => { S.limbs = 0; } },
  { title: { es: 'Precordiales V1–V6', en: 'Chest leads V1–V6' }, cam: null, labels: [6, 7, 8, 9, 10, 11], xray: true,
    lines: [
      { es: 'Cuenta los espacios entre costillas: V1 y V2 van en el 4.º espacio, a cada lado del esternón.', en: 'Count the spaces between ribs: V1 and V2 go in the 4th space, on each side of the breastbone.' },
      { es: 'V4 en el 5.º espacio sobre la línea medioclavicular; V3 entre V2 y V4.', en: 'V4 in the 5th space on the midclavicular line; V3 between V2 and V4.' },
      { es: 'V5 y V6 siguen la misma altura hacia el costado: líneas axilar anterior y media.', en: 'V5 and V6 follow the same level towards the side: anterior and mid-axillary lines.' }
    ], enter: () => { S.placed = 0; } },
  { title: { es: '12 miradas al corazón', en: '12 views of the heart' }, cam: null, labels: [12], xray: true,
    lines: [
      { es: 'La flecha es el vector eléctrico del corazón: cambia de dirección durante cada latido.', en: 'The arrow is the heart\'s electrical vector: it changes direction during each beat.' },
      { es: 'Cada derivación mira desde un ángulo. Si el vector se le acerca, la onda sube; si se aleja, baja.', en: 'Each lead looks from one angle. If the vector heads towards it, the wave goes up; if it heads away, it goes down.' },
      { es: 'Elige una derivación y compara: V1 ve sobre todo ondas negativas; V6, positivas.', en: 'Pick a lead and compare: V1 sees mostly negative waves; V6, positive ones.' }
    ], enter: () => { S.show3d = true; }, exit: (c) => { S.show3d = false; c.timeScale = 1; } },
  { title: { es: 'El eje eléctrico', en: 'The electrical axis' }, cam: null, labels: [12], xray: true,
    lines: [
      { es: 'El eje es la dirección media del QRS en el plano frontal. Lo normal: entre −30° y +90°.', en: 'The axis is the average QRS direction in the frontal plane. Normal: between −30° and +90°.' },
      { es: 'Truco rápido: si el QRS es positivo en I y en aVF, el eje es normal.', en: 'Quick trick: if QRS is positive in I and in aVF, the axis is normal.' },
      { es: 'Mueve el eje y mira cómo cambian I y aVF. Valores didácticos.', en: 'Move the axis and watch I and aVF change. Teaching values.' }
    ], enter: () => { S.show3d = true; }, exit: () => { S.show3d = false; S.axis = 55; } },
  { title: { es: 'Un error común', en: 'A common mistake' }, cam: null, labels: [2, 3],
    lines: [
      { es: 'Si se intercambian los electrodos de los brazos, I se invierte y aVR y aVL cambian de lugar.', en: 'If the arm electrodes are swapped, lead I flips and aVR and aVL trade places.' },
      { es: 'Una I con P, QRS y T negativas y aVR positiva hace sospechar de esta inversión.', en: 'A lead I with negative P, QRS and T and a positive aVR should make you suspect this swap.' },
      { es: 'Activa el intercambio y compara las derivaciones.', en: 'Turn on the swap and compare the leads.' }
    ], exit: () => { S.swap = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: null, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 6 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Dónde va V1?', en: 'Where does V1 go?' }, o: [{ es: '4.º espacio intercostal, borde esternal derecho', en: '4th intercostal space, right sternal border' }, { es: '5.º espacio, línea medioclavicular', en: '5th space, midclavicular line' }, { es: 'Línea axilar media', en: 'Mid-axillary line' }], a: 0,
    e: { es: 'V2 va en el mismo espacio, al otro lado del esternón.', en: 'V2 goes in the same space, on the other side of the breastbone.' } },
  { q: { es: 'QRS positivo en I y en aVF. ¿Cómo es el eje?', en: 'QRS positive in I and in aVF. What is the axis?' }, o: [{ es: 'Normal', en: 'Normal' }, { es: 'Desviado a la izquierda', en: 'Left deviation' }, { es: 'Desviado a la derecha', en: 'Right deviation' }], a: 0,
    e: { es: 'Apunta hacia abajo y a la izquierda, entre 0° y 90°.', en: 'It points down and to the left, between 0° and 90°.' } },
  { q: { es: 'Lead I invertida y aVR positiva sugieren…', en: 'Inverted lead I and positive aVR suggest…' }, o: [{ es: 'Electrodos de brazos intercambiados', en: 'Swapped arm electrodes' }, { es: 'Un infarto', en: 'A heart attack' }, { es: 'Un ritmo normal', en: 'A normal rhythm' }], a: 0,
    e: { es: 'Antes de pensar en dextrocardia, revisa los cables.', en: 'Before thinking of dextrocardia, check the cables.' } }
];

const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw && draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return { t, c, g }; };
// dibuja un ECG de 12 derivaciones en formato 3×4 (+ tira de ritmo)
function draw12(g, w, h, opt = {}) {
  const paper = opt.paper; g.fillStyle = paper ? '#fff6f4' : '#05100c'; g.fillRect(0, 0, w, h);
  const small = w / 100; g.lineWidth = 1;
  for (let x = 0; x <= w; x += small) { g.strokeStyle = paper ? (Math.round(x / small) % 5 ? 'rgba(232,120,120,.25)' : 'rgba(220,80,80,.5)') : (Math.round(x / small) % 5 ? 'rgba(61,220,132,.05)' : 'rgba(61,220,132,.13)'); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 0; y <= h; y += small) { g.strokeStyle = paper ? (Math.round(y / small) % 5 ? 'rgba(232,120,120,.25)' : 'rgba(220,80,80,.5)') : (Math.round(y / small) % 5 ? 'rgba(61,220,132,.05)' : 'rgba(61,220,132,.13)'); g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  const rows = 3 + (opt.rhythm ? 1 : 0), rh = h / rows, cw = w / 4, RR = 60 / S.hr, sec = cw / 2.5; const t0 = opt.t ?? 0;
  g.lineWidth = Math.max(1.4, w / 500); g.font = `700 ${Math.round(rh * .18)}px Manrope, sans-serif`;
  const trace = (name, x0, y0, wd, tStart) => { g.beginPath(); for (let i = 0; i <= wd; i += 1) { const tt = tStart + i / sec, p = ((tt % RR) + RR) % RR / RR; const v = leadVal(name, p); const y = y0 - v * rh * .34; i ? g.lineTo(x0 + i, y) : g.moveTo(x0 + i, y); } g.stroke(); };
  GRID.forEach((row, r) => row.forEach((name, k) => { const y0 = rh * (r + .58), x0 = k * cw; g.strokeStyle = paper ? '#1b1b1b' : (name === S.lead && opt.hl ? '#ffd166' : '#3ddc84'); trace(name, x0 + 4, y0, cw - 8, t0 + k * 2.5);
    g.fillStyle = paper ? '#1b1b1b' : (name === S.lead && opt.hl ? '#ffd166' : '#bfeed4'); g.fillText(name, x0 + 8, rh * r + rh * .22); if (k) { g.strokeStyle = paper ? '#555' : 'rgba(255,255,255,.25)'; g.beginPath(); g.moveTo(x0, y0 - rh * .1); g.lineTo(x0, y0 + rh * .1); g.stroke(); } }));
  if (opt.rhythm) { g.strokeStyle = paper ? '#1b1b1b' : '#3ddc84'; trace('II', 4, rh * 3.58, w - 8, t0); g.fillStyle = paper ? '#1b1b1b' : '#bfeed4'; g.fillText('II', 8, rh * 3.22); }
}

createDemo({
  title: { es: 'El electrocardiograma de 12 derivaciones', en: 'The 12-lead ECG' }, accent: '#3ddc84', bg: '#07090b', bgTop: '#1f262b', bgMid: '#0e1316', fog: .024, floorY: -4.5, exposure: .82, envIntensity: .26,
  camera: { pos: [0, 6, 8], target: [0, 1, 0] }, thumb: { pos: [1.2, 3.6, 3.4], target: [.2, 1.3, -.2], chapter: 3 }, minDist: 1.4, maxDist: 16,
  credit: BP3D_CREDIT, sources: { es: 'Colocación según AHA/ACC/HRS; señales generadas proyectando un vector cardiaco (vectocardiograma) didáctico sobre cada derivación.', en: 'Placement per AHA/ACC/HRS; signals generated by projecting a teaching cardiac vector (vectorcardiogram) onto each lead.' }, chapters,
  action(ui, c, ci) {
    c.state.mHR = ui.metric({ es: 'latidos/min', en: 'beats/min' }, '♥');
    if (ci === 1) ui.button({ es: 'Colocar', en: 'Place' }, () => { S.limbs = 0; });
    if (ci === 2) ui.button({ es: 'Colocar V1–V6', en: 'Place V1–V6' }, () => { S.placed = 0; });
    if (ci === 3) { ui.seg(['I', 'II', 'aVF', 'aVL', 'V1', 'V3', 'V6'].map((k) => ({ value: k, label: { es: k, en: k } })), S.lead, (v) => { S.lead = v; }); ui.button({ es: 'Cámara lenta', en: 'Slow motion' }, (v) => { c.timeScale = v ? .25 : 1; }, { toggle: true, value: false }); }
    if (ci === 4) { c.state.mAx = ui.metric({ es: 'eje QRS', en: 'QRS axis' }, '°'); ui.slider({ es: 'Eje', en: 'Axis' }, { min: -90, max: 180, step: 5, value: S.axis, fmt: (v) => v + '°' }, (v) => { S.axis = v; }); }
    if (ci === 5) ui.button({ es: 'Intercambiar RA/LA', en: 'Swap RA/LA' }, (v) => { S.swap = v; c.toast(v ? (lang === 'en' ? 'Arm electrodes swapped' : 'Electrodos de brazos intercambiados') : (lang === 'en' ? 'Correct placement' : 'Colocación correcta')); }, { toggle: true, value: false });
    if (ci === 6) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#3ddc84', 40, -4.5));
    const box = [[-75, -215, 1150], [120, -30, 1365]];
    const [UB, TX, H] = await Promise.all([
      loadPack('body', { center: CEN, scale: SC }),
      loadPack('thorax', { center: CEN, scale: SC, crop: { diaphragm: [[-200, -260, 1100], [200, 40, 1400]] } }),
      loadPack('heart', { center: CEN, scale: SC, crop: { aorta: [[-40, -200, 1150], [70, -40, 1360]], ivc: [[-60, -200, 1150], [40, -40, 1260]], pulmArtery: [[-30, -175, 1225], [88, -60, 1345]], pulmVeins: [[-25, -150, 1195], [80, -55, 1290]], svc: box } })]);
    // ---- paciente en una camilla: boca arriba, cabeza a la izquierda ----
    const pt = new THREE.Group(); scene.add(pt);
    { const mL = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)), mW = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 1, 0), V(0, 0, -1)); pt.quaternion.setFromRotationMatrix(mW.multiply(mL.transpose())); }
    const add = (geo, kind, opts, ghost, color = '#ffb38a', parent = pt) => { const m = holoMesh(geo, color, { real: kind, realOpts: opts, ghost, opacity: .012, rim: .4, intensity: .6, edges: false }); parent.add(m); return m; };
    const skin = add(UB.geo.skin, 'skin', { side: THREE.DoubleSide, clearcoat: .04, roughness: .62, sheen: .45 }, .07);
    for (const k of ['ribsR', 'ribsL', 'sternum', 'spine']) add(TX.geo[k], 'bone', {}, .55, '#ffe9c7');
    const heart = new THREE.Group(); pt.add(heart);
    const wall = holoMesh(H.geo.wall, '#ff5a6e', { real: 'muscle', ghost: .55, opacity: .015, rim: .45, intensity: .75, edges: false }); heart.add(wall);
    const wallMat = wall.userData.real.material; wallMat.emissive = new THREE.Color('#ff3040'); wallMat.emissiveIntensity = 0;
    for (const [k, kind, col] of [['aorta', 'artery', '#b8343f'], ['pulmArtery', 'vein', '#3f52b3'], ['svc', 'vein', '#34408e'], ['coronary', 'artery', '#b11d2d']]) heart.add(holoMesh(H.geo[k], col, { real: kind, realOpts: { color: col }, ghost: .45, opacity: .015, edges: false }));
    H.geo.wall.computeBoundingBox(); const hc = H.geo.wall.boundingBox.getCenter(V(0, 0, 0)); heart.children.forEach((m) => m.position.sub(hc)); heart.position.copy(hc);
    pt.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(skin.userData.real, true); pt.position.y = -bb.min.y + .12; pt.updateMatrixWorld(true);
    // camilla con sábana
    const bed = new THREE.Group(); scene.add(bed);
    const matt = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 5.6), new THREE.MeshPhysicalMaterial({ color: '#9fadb8', roughness: .92, sheen: .25, sheenColor: new THREE.Color('#d5dde3') })); matt.position.set(.6, -.38, 0); matt.receiveShadow = true; bed.add(matt);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(14.4, .3, 6.0), realMat('metal', { color: '#8b939c', roughness: .4 })); frame.position.set(.6, -1.05, 0); bed.add(frame);
    for (const x of [-6.2, 7.4]) for (const z of [-2.6, 2.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 3.4, 12), realMat('metal', { color: '#9aa2ab' })); leg.position.set(x, -2.8, z); bed.add(leg); }
    const pillow = new THREE.Mesh(pillowGeo(), pillowMat()); pillow.castShadow = true; pillow.scale.set(1.3, .32, 2.0); pillow.position.copy(pt.localToWorld(L(0, -40, 1590))).setY(.12); pillow.receiveShadow = true; scene.add(pillow);
    // cobija sobre caderas y piernas: tapa el corte del modelo y sugiere las piernas debajo
    { pt.updateMatrixWorld(true); const xw = pt.localToWorld(((z) => L(0, -110, z))(1110)).x, xh = pt.localToWorld(((z) => L(0, -110, z))(1590)).x, dirB = Math.sign(xw - xh);
      scene.add(drapeBlanket(skin.userData.real, { bedTop: .12, x0: xw, x1: dirB > 0 ? 7.5 : -6.3, zc: pt.localToWorld(((z) => L(0, -110, z))(1100)).z, hipHalf: 150 * SC, torsoHalf: 172 * SC })); }
    const sp = UB.geo.skin.attributes.position, tv = V(0, 0, 0);
    // ---- puntos de la piel ----
    const pick = (zmm, xmm, mode) => { const yL = L(0, 0, zmm).y, xL = xmm * SC; let best = -1, bd = -1e9;
      for (let i = 0; i < sp.count; i++) { tv.fromBufferAttribute(sp, i); if (Math.abs(tv.y - yL) > 7 * SC) continue;
        let sc2; if (mode === 'front') { if (Math.abs(tv.x - xL) > 9 * SC) continue; sc2 = tv.z; } else if (mode === 'side') { if (Math.abs(tv.x) > 165 * SC) continue; sc2 = tv.x * Math.sign(xmm) + .15 * tv.z; } else { if (Math.abs(tv.x - xL) > 30 * SC) continue; sc2 = tv.z; }
        if (sc2 > bd) { bd = sc2; best = i; } }
      const p = V(0, 0, 0).fromBufferAttribute(sp, best); const n = V(p.x, 0, p.z).normalize(); if (mode !== 'side') n.lerp(V(0, 0, 1), .6).normalize(); return { p, n }; };
    const SPOTS = { RA: pick(845, -245, 'limb'), LA: pick(845, 245, 'limb'), RL: pick(1045, -105, 'front'), LL: pick(1045, 105, 'front'),
      V1: pick(1262, -22, 'front'), V2: pick(1262, 22, 'front'), V4: pick(1222, 88, 'front'), V5: pick(1220, 125, 'front'), V6: pick(1218, 150, 'side') };
    SPOTS.V3 = (() => { const m = SPOTS.V2.p.clone().lerp(SPOTS.V4.p, .5); return pick(1242, m.x / SC, 'front'); })();
    // ---- electrodos (espuma, gel y broche metálico) ----
    const foam = new THREE.MeshPhysicalMaterial({ color: '#f3f1ea', roughness: .85, sheen: .3 }), stud = realMat('metal', { color: '#c9ced4', roughness: .25 });
    const elec = {}; const ER = 13 * SC;
    for (const [k, sp2] of Object.entries(SPOTS)) { const g2 = new THREE.Group(); g2.position.copy(sp2.p).addScaledVector(sp2.n, 1.2 * SC); g2.quaternion.setFromUnitVectors(V(0, 1, 0), sp2.n); pt.add(g2);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(ER, ER, 1.4 * SC, 32), foam); disc.castShadow = true; g2.add(disc);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(ER * .45, .7 * SC, 8, 24), new THREE.MeshStandardMaterial({ color: EL[k].col, roughness: .5 })); ring.rotation.x = Math.PI / 2; ring.position.y = .8 * SC; g2.add(ring);
      const s2 = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * SC, 2.8 * SC, 3.2 * SC, 16), stud); s2.position.y = 2 * SC; g2.add(s2);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(5 * SC, 4 * SC, 11 * SC), new THREE.MeshStandardMaterial({ color: EL[k].col, roughness: .45 })); clip.position.set(0, 4.5 * SC, 4 * SC); g2.add(clip);
      elec[k] = { g: g2, sp: sp2, tip: () => g2.localToWorld(V(0, 4.5 * SC, 9 * SC)) }; }
    // ---- electrocardiógrafo portátil sobre la camilla ----
    const dev = new THREE.Group(); scene.add(dev); dev.position.set(-2.2, .2, 4.4); dev.rotation.y = .35;
    { const cart = new THREE.Group(); scene.add(cart); cart.position.set(-.6, 0, 4.7);
      const top = new THREE.Mesh(new THREE.BoxGeometry(6.2, .16, 2.8), realMat('plastic', { color: '#7b858f', roughness: .5 })); top.position.y = .1; top.receiveShadow = true; cart.add(top);
      for (const x of [-2.9, 2.9]) for (const z of [-1.2, 1.2]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, 4.4, 12), realMat('metal', { color: '#9aa2ab' })); lg.position.set(x, -2.2, z); cart.add(lg); } }
    const body2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, .45, 1.8), realMat('plastic', { color: '#aab2ba', roughness: .5, clearcoat: .3 })); body2.position.y = .22; body2.castShadow = true; dev.add(body2);
    const lid = new THREE.Group(); lid.position.set(0, .45, -.9); lid.rotation.x = -1.2; dev.add(lid);
    const lidB = new THREE.Mesh(new THREE.BoxGeometry(2.4, .12, 1.7), realMat('plastic', { color: '#a3abb3', roughness: .5 })); lidB.position.set(0, 0, .85); lid.add(lidB);
    const scr = canvasTex(1024, 640); const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.3), new THREE.MeshBasicMaterial({ map: scr.t, toneMapped: false })); screen.rotation.x = Math.PI / 2; screen.position.set(0, -.065, .85); screen.rotation.z = Math.PI; screen.rotation.y = 0; lid.add(screen);
    const keys = new THREE.Mesh(new THREE.PlaneGeometry(2.0, .8), new THREE.MeshStandardMaterial({ map: canvasTex(512, 200, (g, w, h) => { g.fillStyle = '#cfd5db'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a424b'; for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) { g.beginPath(); g.roundRect(14 + i * 49, 20 + j * 58, 40, 44, 8); g.fill(); } g.fillStyle = '#2fbf6b'; g.beginPath(); g.roundRect(430, 140, 70, 44, 8); g.fill(); }).t, roughness: .6 })); keys.rotation.x = -Math.PI / 2; keys.position.set(0, .451, .3); dev.add(keys);
    // papel impreso saliendo del equipo
    const ppr = canvasTex(1600, 500); const paperG = new THREE.PlaneGeometry(3.6, 1.1, 40, 1); { const p = paperG.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), k = (x + 1.8) / 3.6; p.setZ(i, -Math.sin(k * Math.PI) * .25 * k); } paperG.computeVertexNormals(); }
    const paper = new THREE.Mesh(paperG, new THREE.MeshStandardMaterial({ map: ppr.t, color: '#cfc8c4', roughness: .9, side: THREE.DoubleSide })); paper.rotation.x = -Math.PI / 2; paper.position.set(2.7, .03, .1); paper.receiveShadow = true; dev.add(paper);
    // ---- cables: de cada electrodo al yugo y de ahí al equipo ----
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(.35, .14, .22), realMat('plasticDark', { color: '#2a3038' })); yoke.position.copy(pt.localToWorld(L(-200, -260, 1000))).setY(.16); yoke.position.z += .9; scene.add(yoke);
    const wires = {}; for (const k of Object.keys(EL)) { const m = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: EL[k].col === '#1a1a1a' ? '#2a2a2a' : EL[k].col, roughness: .45 })); m.castShadow = true; scene.add(m); wires[k] = m; }
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([yoke.position.clone(), yoke.position.clone().add(V(.4, -.1, .5)), dev.localToWorld(V(-1.25, .25, .3))]), 40, .03, 8), realMat('rubber', { color: '#2a3038' })); scene.add(trunk);
    const updWire = (k, vis) => { const m = wires[k]; m.visible = vis; if (!vis) return; const a = elec[k].tip(), b = yoke.position.clone(); const mid = a.clone().lerp(b, .5); mid.y = Math.max(.12, Math.min(a.y, b.y) - .15);
      m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([a, a.clone().add(V(0, .12, 0)), mid, b]), 40, .011, 6); };
    // ---- triángulo de Einthoven y vector cardiaco ----
    const triMat = new THREE.LineBasicMaterial({ color: '#ffd166', transparent: true, opacity: .9 }); const tri = new THREE.Line(new THREE.BufferGeometry(), triMat); scene.add(tri);
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, toneMapped: false }); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 1, 12), arrowMat), headA = new THREE.Mesh(new THREE.ConeGeometry(.08, .18, 16), arrowMat);
    const vec = new THREE.Group(); vec.add(shaft, headA); pt.add(vec); vec.position.copy(hc);
    for (const m of [arrowMat]) { m.depthTest = false; m.opacity = 1; } shaft.renderOrder = headA.renderOrder = 20;
    const leadAx = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, 1, 8), glowMat('#7fd3ff', .9)); leadAx.material.depthTest = false; leadAx.renderOrder = 19; pt.add(leadAx);
    const leadEye = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 12), glowMat('#7fd3ff', 1)); leadEye.material.depthTest = false; leadEye.renderOrder = 19; pt.add(leadEye);
    // dirección (paciente) → local: x = izquierda, y(inferior) = −y local, z = anterior
    const toLocal = (d) => V(d.x, -d.y, d.z);
    // ---- cámaras ----
    { const chest = pt.localToWorld(L(30, -200, 1240)), w = (v) => v.toArray();
      chapters[0].cam = { pos: w(chest.clone().add(V(.4, 5.4, 9.0))), target: w(chest.clone().add(V(.2, -1.2, 2.2))) };
      chapters[1].cam = { pos: w(chest.clone().add(V(1.3, 6.0, 2.4))), target: w(chest.clone().add(V(1.1, -.8, -.1))) };
      chapters[2].cam = { pos: w(chest.clone().add(V(.2, 3.2, 1.4))), target: w(chest.clone().add(V(0, -.3, -.35))) };
      chapters[3].cam = { pos: w(chest.clone().add(V(.6, 3.6, 3.0))), target: w(chest.clone().add(V(0, -.6, -.2))) };
      chapters[4].cam = { pos: w(chest.clone().add(V(.2, 3.4, .6))), target: w(chest.clone().add(V(0, -.5, -.3))) };
      chapters[5].cam = chapters[0].cam; chapters[6].cam = chapters[0].cam; }
    // ---- etiquetas ----
    c.label({ es: 'Electrocardiógrafo', en: 'Electrocardiograph' }, { es: '12 derivaciones', en: '12 leads' }, lidB, '#3ddc84'); // 0
    c.label({ es: 'Trazado impreso', en: 'Printout' }, { es: '25 mm/s · 10 mm/mV', en: '25 mm/s · 10 mm/mV' }, paper, '#ffb3b3'); // 1
    for (const k of ['RA', 'LA', 'LL', 'RL']) c.label({ es: k, en: k }, { es: EL[k].es.split('· ')[1], en: EL[k].en.split('· ')[1] }, elec[k].g, EL[k].col === '#1a1a1a' ? '#9aa3ad' : EL[k].col); // 2-5
    for (const k of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']) c.label({ es: k, en: k }, null, elec[k].g, EL[k].col); // 6-11
    c.label({ es: 'Vector cardiaco', en: 'Cardiac vector' }, null, headA, '#ffd166'); // 12
    // ---- monitor lateral: 12 derivaciones ----
    const mon = c.side({ es: 'ECG de 12 derivaciones', en: '12-lead ECG' }, 150);
    let tPrint = 0, lastDraw = 0;
    c.onFrame((dt, rdt) => {
      const ci = c.chapter(); S.ph += dt; const RR = 60 / S.hr, p = (S.ph % RR) / RR; tPrint += dt;
      // aparición de electrodos
      if (ci === 1) S.limbs = Math.min(1, S.limbs + rdt / 2.4); else if (ci >= 2) S.limbs = 1;
      if (ci === 2) S.placed = Math.min(1, S.placed + rdt / 4.2); else if (ci >= 3) S.placed = 1; else if (ci < 2) S.placed = 0;
      const limbK = ci === 0 ? 0 : S.limbs;
      ['RA', 'LA', 'LL', 'RL'].forEach((k, i) => { const v = smooth(i * .2, i * .2 + .3, limbK); elec[k].g.visible = v > .02; elec[k].g.scale.setScalar(Math.max(.01, v)); updWire(k, v > .5); });
      ['V1', 'V2', 'V3', 'V4', 'V5', 'V6'].forEach((k, i) => { const v = smooth(i / 7, i / 7 + .2, S.placed); elec[k].g.visible = v > .02; elec[k].g.scale.setScalar(Math.max(.01, v)); updWire(k, v > .5); });
      // triángulo de Einthoven
      tri.visible = ci === 1 && S.limbs > .8;
      if (tri.visible) { const a = pt.localToWorld(elec.RA.g.position.clone()), b = pt.localToWorld(elec.LA.g.position.clone()), d = pt.localToWorld(elec.LL.g.position.clone()); [a, b, d].forEach((q) => (q.y += .25)); tri.geometry.setFromPoints([a, b, d, a]); triMat.opacity = .5 + .4 * Math.sin(c.time * 3); }
      // vector cardiaco y eje de la derivación
      const show = S.show3d && xray.k > .3; vec.visible = leadAx.visible = leadEye.visible = show;
      if (show) { const d = dipole(p), dl = toLocal(d), len = dl.length(); const dir = len > 1e-4 ? dl.clone().normalize() : V(0, 1, 0); const sc2 = .55 * len;
        vec.quaternion.setFromUnitVectors(V(0, 1, 0), dir); shaft.scale.y = Math.max(.001, sc2); shaft.position.y = sc2 / 2; headA.position.y = sc2 + .08; headA.visible = len > .05;
        const ld = toLocal(ci === 4 ? LEADS.I : LEADS[S.lead]).normalize(); leadAx.position.copy(hc).addScaledVector(ld, .9); leadAx.quaternion.setFromUnitVectors(V(0, 1, 0), ld); leadAx.scale.y = 1.8; leadEye.position.copy(hc).addScaledVector(ld, 1.85); }
      // activación del miocardio (brillo con el QRS)
      wallMat.emissiveIntensity = xray.k * (.15 * gs(p, .11, .03) + .6 * gs(p, .25, .04) + .12 * gs(p, .52, .06));
      heart.scale.setScalar(1 - .04 * gs(p, .33, .08));
      // pantalla del equipo, papel y panel (a ~20 fps)
      if (tPrint - lastDraw > .05) { lastDraw = tPrint;
        draw12(scr.g, 1024, 640, { rhythm: true, t: Math.floor(S.ph / RR) * RR, hl: ci === 3 }); scr.g.fillStyle = '#bfeed4'; scr.g.font = '600 26px Manrope, sans-serif'; scr.g.fillText(`${S.hr} lpm · 25 mm/s · 10 mm/mV${S.swap ? (lang === 'en' ? ' · CHECK LEADS' : ' · REVISE CABLES') : ''}`, 20, 632); scr.t.needsUpdate = true;
        draw12(mon.ctx, mon.canvas.width, mon.canvas.height, { t: Math.floor(S.ph / RR) * RR, hl: ci === 3 }); }
      if (!ppr.done || S.swap !== ppr.swap || S.axis !== ppr.axis) { ppr.done = true; ppr.swap = S.swap; ppr.axis = S.axis; draw12(ppr.g, 1600, 500, { paper: true, t: 0 }); ppr.t.needsUpdate = true; }
      mon.right.textContent = ci === 4 ? `${lang === 'en' ? 'axis' : 'eje'} ${S.axis}°` : ci === 3 ? S.lead : (S.swap ? (lang === 'en' ? 'RA/LA swapped' : 'RA/LA invertidos') : '');
      c.state.mHR?.(S.hr);
      if (ci === 4) { c.state.mAx?.(S.axis); }
    });
  }
});
