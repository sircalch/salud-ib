// Demo: El desfibrilador (DEA) / The defibrillator (AED) — paciente con piel, brazos, costillas y corazón reales (BodyParts3D) y un DEA modelado
import { createDemo, THREE, holoMesh, gridFloor, loadPack, realMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang, glowMat } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CEN = [0, -110, 1255], SC = 1 / 140;
const L = (x, y, z) => V((x - CEN[0]) * SC, (z - CEN[2]) * SC, -(y - CEN[1]) * SC); // mm (atlas) → coordenadas locales
const RHY = {
  vf: { es: 'Fibrilación ventricular', en: 'Ventricular fibrillation', shock: true },
  vt: { es: 'Taquicardia ventricular sin pulso', en: 'Pulseless ventricular tachycardia', shock: true },
  asys: { es: 'Asistolia', en: 'Asystole', shock: false },
  sinus: { es: 'Ritmo sinusal', en: 'Sinus rhythm', shock: false }
};
const S = { on: false, rhythm: 'vf', padsK: 0, padsGo: false, analyzing: 0, verdict: null, charge: 0, charged: false, shockT: -1, joules: 150, imp: 78, cpr: false, cprAuto: false, comp: 0, compT: [], depth: 0, ecgT: 0, ph: 0, prompt: '', shocks: 0, bte: 0 };
const T = (o) => (lang === 'en' ? o.en : o.es);

const chapters = [
  { title: { es: 'El DEA', en: 'The AED' }, cam: { pos: [-1.2, 5.4, 7.8], target: [-.6, .4, 0] }, labels: [0, 1, 2, 3],
    lines: [
      { es: 'Un desfibrilador externo automático (DEA) analiza el ritmo del corazón y, si hace falta, da una descarga eléctrica.', en: 'An automated external defibrillator (AED) analyses the heart rhythm and, if needed, delivers an electric shock.' },
      { es: 'Está pensado para que lo use cualquier persona: habla, guía cada paso y no deja descargar si no es necesario.', en: 'It is designed for anyone to use: it talks, guides each step and will not shock unless needed.' },
      { es: 'El paciente es una reconstrucción con piel, huesos y corazón reales de un atlas anatómico.', en: 'The patient is a reconstruction with real skin, bones and heart from an anatomical atlas.' }
    ], enter: () => { S.on = true; S.prompt = 'pads'; } },
  { title: { es: 'Los parches', en: 'The pads' }, cam: { pos: [.2, 5.0, 4.6], target: [-.2, .5, -.2] }, labels: [4, 5],
    lines: [
      { es: 'Tórax descubierto y seco. Un parche bajo la clavícula derecha, junto al esternón.', en: 'Bare, dry chest. One pad below the right collarbone, next to the breastbone.' },
      { es: 'El otro en el costado izquierdo, bajo la axila, a la altura del 5.º–6.º espacio intercostal.', en: 'The other on the left side, below the armpit, at the level of the 5th–6th intercostal space.' },
      { es: 'Así la corriente cruza el corazón de lado a lado. Mira la trayectoria con rayos X.', en: 'That way the current crosses the heart from side to side. See the path with X-ray.' }
    ], enter: () => { S.on = true; S.padsGo = true; S.prompt = 'pads'; } },
  { title: { es: 'Analizar el ritmo', en: 'Analysing the rhythm' }, cam: { pos: [-.4, 4.6, 4.2], target: [-.2, .6, -.3] }, labels: [6], xray: true,
    lines: [
      { es: '«No toque al paciente». El DEA lee el electrocardiograma a través de los mismos parches.', en: '"Do not touch the patient." The AED reads the ECG through the same pads.' },
      { es: 'Solo dos ritmos se tratan con descarga: la fibrilación ventricular y la taquicardia ventricular sin pulso.', en: 'Only two rhythms are treated with a shock: ventricular fibrillation and pulseless ventricular tachycardia.' },
      { es: 'Elige un ritmo y pulsa «Analizar». En la asistolia no sirve la descarga: toca RCP.', en: 'Pick a rhythm and press "Analyse". In asystole a shock does not help: CPR does.' }
    ], enter: () => { S.on = true; S.padsGo = true; S.padsK = 1; S.verdict = null; S.prompt = 'analyse'; } },
  { title: { es: 'La descarga', en: 'The shock' }, cam: { pos: [-2.4, 4.4, 5.6], target: [-.6, .5, 0] }, labels: [1, 6], xray: true,
    lines: [
      { es: 'La descarga despolariza a la vez todo el músculo cardiaco. Así el nodo sinusal puede retomar el mando.', en: 'The shock depolarises the whole heart muscle at once. That lets the sinus node take charge again.' },
      { es: 'Un DEA bifásico entrega 150–200 J en unos 10 milisegundos: más de mil voltios y decenas de amperios.', en: 'A biphasic AED delivers 150–200 J in about 10 milliseconds: over a thousand volts and tens of amps.' },
      { es: 'Nadie debe tocar al paciente. Pulsa el botón naranja cuando parpadee.', en: 'Nobody may touch the patient. Press the orange button when it flashes.' }
    ], enter: () => { S.on = true; S.padsK = 1; S.padsGo = true; S.rhythm = 'vf'; S.verdict = 'shock'; S.charge = 0; S.charged = false; S.prompt = 'charging'; } },
  { title: { es: 'RCP de alta calidad', en: 'High-quality CPR' }, cam: { pos: [.8, 4.2, 4.6], target: [-.3, .4, -.1] }, labels: [7],
    lines: [
      { es: 'Justo después de la descarga se reanudan las compresiones, sin esperar a ver el pulso.', en: 'Compressions restart right after the shock, without waiting to check for a pulse.' },
      { es: 'Centro del pecho, 5 a 6 cm de profundidad, 100 a 120 por minuto, dejando que el tórax se reexpanda.', en: 'Centre of the chest, 5 to 6 cm deep, 100 to 120 per minute, letting the chest recoil fully.' },
      { es: 'Pulsa «Comprimir» al compás o activa el modo automático. El DEA vuelve a analizar cada 2 minutos.', en: 'Press "Compress" in rhythm or turn on auto mode. The AED analyses again every 2 minutes.' }
    ], enter: () => { S.on = true; S.padsK = 1; S.padsGo = true; S.rhythm = 'vf'; S.prompt = 'cpr'; }, exit: () => { S.cpr = false; S.cprAuto = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [-1.2, 5.4, 7.8], target: [-.6, .4, 0] }, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 5 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Qué ritmos se tratan con descarga?', en: 'Which rhythms are treated with a shock?' }, o: [{ es: 'Fibrilación ventricular y TV sin pulso', en: 'VF and pulseless VT' }, { es: 'Asistolia', en: 'Asystole' }, { es: 'Cualquier paro cardiaco', en: 'Any cardiac arrest' }], a: 0,
    e: { es: 'En la asistolia no hay actividad que reorganizar: se hace RCP.', en: 'In asystole there is no activity to reset: do CPR.' } },
  { q: { es: '¿Dónde va el segundo parche?', en: 'Where does the second pad go?' }, o: [{ es: 'Costado izquierdo, bajo la axila', en: 'Left side, below the armpit' }, { es: 'Sobre el esternón', en: 'Over the breastbone' }, { es: 'En el abdomen', en: 'On the abdomen' }], a: 0,
    e: { es: 'Con el otro bajo la clavícula derecha, la corriente cruza el corazón.', en: 'With the other below the right collarbone, current crosses the heart.' } },
  { q: { es: '¿Qué se hace justo después de la descarga?', en: 'What comes right after the shock?' }, o: [{ es: 'Reanudar compresiones de inmediato', en: 'Resume compressions immediately' }, { es: 'Buscar el pulso un minuto', en: 'Check the pulse for a minute' }, { es: 'Quitar los parches', en: 'Remove the pads' }], a: 0,
    e: { es: 'Cada pausa reduce el flujo al cerebro y al corazón.', en: 'Every pause cuts blood flow to brain and heart.' } }
];

// ---------- señales ----------
const gs = (x, m, s, a) => a * Math.exp(-(((x - m) / s) ** 2));
const sinusECG = (p) => gs(p, .12, .025, .12) - gs(p, .225, .008, .1) + gs(p, .25, .012, 1) - gs(p, .275, .01, .25) + gs(p, .5, .045, .3);
let vfA = Math.random() * 10;
function ecgAt(rh, tt) {
  if (rh === 'sinus') { const RR = .8, p = (tt % RR) / RR; return sinusECG(p); }
  if (rh === 'vt') { const RR = 60 / 185, p = (tt % RR) / RR; return .9 * Math.sin(p * Math.PI * 2) * (p < .55 ? 1 : .4) - .1; }
  if (rh === 'vf') return .32 * Math.sin(tt * 2 * Math.PI * 5.1 + Math.sin(tt * 1.3 + vfA) * 2.2) * (.6 + .4 * Math.sin(tt * .7)) + .18 * Math.sin(tt * 2 * Math.PI * 7.3 + vfA);
  return .015 * Math.sin(tt * 1.7) + (Math.random() - .5) * .01;
}

// ---------- utilidades de modelado ----------
function roundedBox(w, h, d, r, seg = 6) {
  const s = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r;
  s.moveTo(-w / 2, y); s.lineTo(-w / 2, h / 2 - r); s.quadraticCurveTo(-w / 2, h / 2, x, h / 2); s.lineTo(w / 2 - r, h / 2); s.quadraticCurveTo(w / 2, h / 2, w / 2, h / 2 - r);
  s.lineTo(w / 2, y); s.quadraticCurveTo(w / 2, -h / 2, w / 2 - r, -h / 2); s.lineTo(x, -h / 2); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: d - r * 2, bevelEnabled: true, bevelThickness: r, bevelSize: r * .9, bevelSegments: seg, curveSegments: seg * 2 }); g.translate(0, 0, -d / 2 + r); g.computeVertexNormals(); return g;
}
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
function padTexture(side) {
  return canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#f4f4f1'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#d23a2e'; g.lineWidth = 10; g.strokeRect(22, 22, w - 44, h - 44);
    // pictograma del torso con la posición
    g.strokeStyle = '#2a2f36'; g.lineWidth = 9; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(150, 140); g.quadraticCurveTo(256, 100, 362, 140); g.lineTo(390, 420); g.quadraticCurveTo(256, 470, 122, 420); g.closePath(); g.stroke();
    g.beginPath(); g.arc(256, 92, 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#d23a2e'; if (side === 'R') g.fillRect(170, 170, 70, 90); else { g.save(); g.translate(345, 330); g.rotate(-.35); g.fillRect(-35, -45, 70, 90); g.restore(); }
    g.fillStyle = '#2a2f36'; g.font = '700 46px Manrope, sans-serif'; g.textAlign = 'center'; g.fillText(side === 'R' ? (lang === 'en' ? 'RIGHT' : 'DERECHO') : (lang === 'en' ? 'LEFT' : 'IZQUIERDO'), 256, 560);
  });
}
function faceTexture() {
  return canvasTex(1024, 768, (g, w, h) => {
    g.fillStyle = '#2e333a'; g.fillRect(0, 0, w, h);
    // pasos ilustrados 1-2-3
    const steps = lang === 'en' ? ['1  POWER ON', '2  APPLY PADS', '3  SHOCK'] : ['1  ENCENDER', '2  COLOCAR PARCHES', '3  DESCARGA'];
    g.font = '700 34px Manrope, sans-serif'; g.fillStyle = '#e9edf2'; steps.forEach((s, i) => g.fillText(s, 60, 560 + i * 58));
    // rejilla del altavoz
    g.fillStyle = '#1b1f24'; for (let y = 0; y < 6; y++) for (let x = 0; x < 9; x++) { g.beginPath(); g.arc(700 + x * 28, 590 + y * 26, 7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#9aa3ad'; g.font = '600 26px Manrope, sans-serif'; g.fillText(lang === 'en' ? 'AED · TRAINING MODEL' : 'DEA · MODELO DIDÁCTICO', 60, 740);
  });
}

createDemo({
  title: { es: 'El desfibrilador (DEA)', en: 'The defibrillator (AED)' }, accent: '#3ddc84', bg: '#07090b', bgTop: '#20262c', bgMid: '#0f1317', fog: .026, floorY: 0, exposure: .95, envIntensity: .3,
  camera: chapters[0].cam, thumb: { pos: [-1.6, 4.4, 5.6], target: [-.5, .5, 0], chapter: 3 }, minDist: 1.6, maxDist: 16,
  credit: BP3D_CREDIT, sources: { es: 'Secuencia según guías de reanimación (AHA/ERC); posición anterolateral de parches; ritmos y forma de onda bifásica simulados con fines educativos.', en: 'Sequence per resuscitation guidelines (AHA/ERC); anterolateral pad placement; rhythms and biphasic waveform simulated for teaching.' }, chapters,
  action(ui, c, ci) {
    if (ci === 0) ui.button({ es: 'Encender / apagar', en: 'Power on / off' }, () => { S.on = !S.on; c.sound.beep(S.on ? 880 : 440, .15, 'sine', .05); });
    if (ci === 1) ui.button({ es: 'Colocar parches', en: 'Apply pads' }, () => { S.padsK = 0; S.padsGo = true; });
    if (ci === 2) {
      ui.seg(Object.entries(RHY).map(([k, r]) => ({ value: k, label: { es: { vf: 'FV', vt: 'TV sin pulso', asys: 'Asistolia', sinus: 'Sinusal' }[k], en: { vf: 'VF', vt: 'Pulseless VT', asys: 'Asystole', sinus: 'Sinus' }[k] } })), S.rhythm, (v) => { S.rhythm = v; S.verdict = null; });
      ui.button({ es: 'Analizar', en: 'Analyse' }, () => { S.analyzing = 3.2; S.verdict = null; S.prompt = 'analysing'; c.sound.beep(660, .2, 'sine', .04); });
    }
    if (ci === 3) {
      c.state.mE = ui.metric({ es: 'energía', en: 'energy' }, 'J'); c.state.mI = ui.metric({ es: 'corriente pico', en: 'peak current' }, 'A');
      c.state.shockBtn = ui.button({ es: '⚡ Descarga', en: '⚡ Shock' }, () => doShock(c));
    }
    if (ci === 4) {
      c.state.mRate = ui.metric({ es: 'compresiones/min', en: 'compressions/min' }, '');
      c.state.mD = ui.metric({ es: 'profundidad', en: 'depth' }, 'cm');
      ui.button({ es: 'Comprimir', en: 'Compress' }, () => compress(c));
      ui.button({ es: 'Automático', en: 'Auto' }, (v) => { S.cprAuto = v; }, { toggle: true, value: false });
    }
    if (ci === 5) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#3ddc84', 40, 0));
    const box = [[-75, -215, 1150], [120, -30, 1365]];
    const [UB, TX, H] = await Promise.all([
      loadPack('body', { center: CEN, scale: SC }),
      loadPack('thorax', { center: CEN, scale: SC, crop: { diaphragm: [[-200, -260, 1100], [200, 40, 1400]] } }),
      loadPack('heart', { center: CEN, scale: SC, crop: { aorta: [[-40, -200, 1150], [70, -40, 1360]], ivc: [[-60, -200, 1150], [40, -40, 1260]], pulmArtery: [[-30, -175, 1225], [88, -60, 1345]], pulmVeins: [[-25, -150, 1195], [80, -55, 1290]], svc: box } })]);
    // ---- paciente acostado boca arriba: cabeza a la izquierda, lado derecho hacia la cámara ----
    const pt = new THREE.Group(); scene.add(pt);
    { const mL = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)), mW = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 1, 0), V(0, 0, -1)); pt.quaternion.setFromRotationMatrix(mW.multiply(mL.transpose())); }
    const add = (geo, kind, opts, ghost, color = '#ffb38a', parent = pt) => { const m = holoMesh(geo, color, { real: kind, realOpts: opts, ghost, opacity: .012, rim: .4, intensity: .6, edges: false }); parent.add(m); return m; };
    const skin = add(UB.geo.skin, 'skin', { side: THREE.DoubleSide, clearcoat: .04, roughness: .62, sheen: .45 }, .06);
    // huesos, pulmones y corazón (visibles con rayos X)
    const thx = new THREE.Group(); pt.add(thx);
    for (const k of ['ribsR', 'ribsL', 'sternum']) add(TX.geo[k], 'bone', {}, .5, '#ffe9c7', thx); add(TX.geo.spine, 'bone', {}, .5, '#ffe9c7');
    for (const k of ['lungR', 'lungL']) add(TX.geo[k], 'lung', {}, .12, '#ffc2c8', thx);
    const heart = new THREE.Group(); thx.add(heart);
    const wall = holoMesh(H.geo.wall, '#ff5a6e', { real: 'muscle', ghost: .85, opacity: .015, rim: .45, intensity: .75, edges: false }); heart.add(wall);
    const wallMat = wall.userData.real.material; wallMat.emissive = new THREE.Color('#ff3040'); wallMat.emissiveIntensity = 0;
    for (const [k, kind, col] of [['aorta', 'artery', '#b8343f'], ['pulmArtery', 'vein', '#3f52b3'], ['svc', 'vein', '#34408e'], ['coronary', 'artery', '#b11d2d']]) heart.add(holoMesh(H.geo[k], col, { real: kind, realOpts: { color: col }, ghost: .7, opacity: .015, edges: false }));
    H.geo.wall.computeBoundingBox(); const hc = H.geo.wall.boundingBox.getCenter(V(0, 0, 0)); heart.children.forEach((m) => m.position.sub(hc)); heart.position.copy(hc);
    // sobre el piso
    pt.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(skin.userData.real, true); pt.position.y = -bb.min.y + .005; pt.updateMatrixWorld(true);
    // ---- pantalón: cubre el corte del modelo en la cadera ----
    const cloth = new THREE.MeshPhysicalMaterial({ color: '#2f3d55', roughness: .92, sheen: .45, sheenColor: new THREE.Color('#6f84a6'), side: THREE.DoubleSide });
    const sp = UB.geo.skin.attributes.position, tv = V(0, 0, 0);
    const ringAt = (zmm, grow, n = 80) => { // contorno real del tronco a una altura (sin brazos)
      const yLoc = L(0, 0, zmm).y, r = new Float32Array(n).fill(0); for (let i = 0; i < sp.count; i++) { tv.fromBufferAttribute(sp, i); if (Math.abs(tv.y - yLoc) > 22 * SC || Math.abs(tv.x) > 160 * SC) continue; const a = Math.atan2(tv.z, tv.x); const b = ((Math.round(a / (Math.PI * 2) * n) % n) + n) % n; r[b] = Math.max(r[b], Math.hypot(tv.x, tv.z)); }
      for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) if (!r[i]) { let a = 1; while (!r[(i + a) % n] && a < n) a++; r[i] = r[(i + a) % n]; }
      for (let k = 0; k < 5; k++) { const cp = r.slice(); for (let i = 0; i < n; i++) r[i] = Math.max(cp[i], (cp[(i + n - 1) % n] + 2 * cp[i] + cp[(i + 1) % n]) / 4); }
      return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return V(Math.cos(a) * (r[i] + grow), yLoc, Math.sin(a) * (r[i] + grow)); }); };
    { const levels = [1012, 990, 965, 940, 915, 893].map((z) => ringAt(z, 14 * SC)); const last = levels[levels.length - 1];
      for (let k = 1; k <= 8; k++) levels.push(last.map((p) => V(p.x * (1 - .012 * k), p.y - k * 70 * SC, p.z * (1 - .03 * k))));
      const N = levels[0].length, g2 = new THREE.BufferGeometry(), pos = [], idx = []; levels.forEach((ring) => ring.forEach((p) => pos.push(p.x, p.y, p.z)));
      for (let v = 0; v < levels.length - 1; v++) for (let i = 0; i < N; i++) { const a = v * N + i, b = v * N + (i + 1) % N, c2 = a + N, d = b + N; idx.push(a, c2, b, b, c2, d); }
      g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(idx); g2.computeVertexNormals(); const m = new THREE.Mesh(g2, cloth); m.castShadow = m.receiveShadow = true; pt.add(m);
      const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringAt(1012, 16 * SC), true), 160, 6 * SC, 8, true), new THREE.MeshPhysicalMaterial({ color: '#1f2838', roughness: .8 })); band.castShadow = true; pt.add(band); }
    // ---- superficie de la piel para colocar parches ----
    UB.geo.skin.computeVertexNormals(); const sn = UB.geo.skin.attributes.normal;
    const surfPick = (yLoc, dir) => { let best = -1, bd = -1e9; for (let i = 0; i < sp.count; i++) { tv.fromBufferAttribute(sp, i); if (Math.abs(tv.y - yLoc) > 9 * SC || Math.abs(tv.x) > 160 * SC) continue; const d = tv.x * dir.x + tv.z * dir.z; if (d > bd) { bd = d; best = i; } } return best; };
    const padAt = (i) => { const p = V(0, 0, 0).fromBufferAttribute(sp, i), n = V(0, 0, 0); let k = 0; for (let j = 0; j < sp.count; j += 3) { tv.fromBufferAttribute(sp, j); if (tv.distanceToSquared(p) < (25 * SC) ** 2) { n.add(V(0, 0, 0).fromBufferAttribute(sn, j)); k++; } } n.normalize(); const na = V(p.x, 0, p.z).normalize(); if (n.dot(na) < 0) n.negate(); if (n.dot(na) < .6) n.copy(na); return { p, n }; };
    const PR = padAt(surfPick(L(0, 0, 1335).y, V(-.32, 0, 1).normalize())), PLft = padAt(surfPick(L(0, 0, 1185).y, V(1, 0, 1.15).normalize()));
    // parche: malla que sigue la superficie de la piel
    const mkPad = (P, side, rot) => {
      const t1 = V(0, 1, 0).sub(P.n.clone().multiplyScalar(P.n.y)).normalize().applyAxisAngle(P.n, rot), t2 = P.n.clone().cross(t1).normalize();
      const W2 = 120 * SC, H2 = 150 * SC, NU = 14, NVv = 16, pos = [], uv = [], idx = [];
      // trozo local de piel (triángulos cercanos) para lanzar rayos rápido
      const ix = UB.geo.skin.index.array, loc = [], R2 = ((W2 + H2) * .75) ** 2, ta = V(0, 0, 0);
      for (let f = 0; f < ix.length; f += 3) { ta.fromBufferAttribute(sp, ix[f]); if (ta.distanceToSquared(P.p) > R2 || ta.clone().sub(P.p).dot(P.n) < -50 * SC || Math.abs(ta.x) > 166 * SC) continue; for (let k = 0; k < 3; k++) { ta.fromBufferAttribute(sp, ix[f + k]); loc.push(ta.x, ta.y, ta.z); } }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(loc, 3)); const lm = new THREE.Mesh(lg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      const rc = new THREE.Raycaster();
      // altura de la piel sobre el plano del parche en cada punto; huecos rellenados y alisados (el parche es flexible pero no se arruga)
      const NB2 = (NU + 1) * (NVv + 1), hh = new Float32Array(NB2).fill(NaN), base = [];
      for (let a = 0; a <= NU; a++) for (let b = 0; b <= NVv; b++) { const u = a / NU - .5, v = b / NVv - .5, q = P.p.clone().addScaledVector(t2, u * W2).addScaledVector(t1, v * H2); base.push(q);
        rc.set(q.clone().addScaledVector(P.n, 60 * SC), P.n.clone().negate()); const hit = rc.intersectObject(lm, false)[0]; if (hit) hh[a * (NVv + 1) + b] = hit.point.clone().sub(q).dot(P.n); }
      const at = (a, b) => hh[clamp(a, 0, NU) * (NVv + 1) + clamp(b, 0, NVv)];
      for (let it = 0; it < 40 && hh.some(Number.isNaN); it++) { const cp = hh.slice(); for (let a = 0; a <= NU; a++) for (let b = 0; b <= NVv; b++) { const i = a * (NVv + 1) + b; if (!Number.isNaN(cp[i])) continue; let sum = 0, n2 = 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a2 = clamp(a + da, 0, NU), b2 = clamp(b + db, 0, NVv), v2 = cp[a2 * (NVv + 1) + b2]; if (!Number.isNaN(v2)) { sum += v2; n2++; } } if (n2) hh[i] = sum / n2; } }
      for (let it = 0; it < 3; it++) { const cp = hh.slice(); for (let a = 0; a <= NU; a++) for (let b = 0; b <= NVv; b++) { const i = a * (NVv + 1) + b; const nb = [at(a + 1, b), at(a - 1, b), at(a, b + 1), at(a, b - 1)].filter((x) => !Number.isNaN(x)); hh[i] = Math.max(cp[i], (cp[i] * 2 + nb.reduce((x, y) => x + y, 0)) / (2 + nb.length)); } }
      for (let a = 0; a <= NU; a++) for (let b = 0; b <= NVv; b++) { const i = a * (NVv + 1) + b, q = base[i].addScaledVector(P.n, (Number.isNaN(hh[i]) ? 0 : hh[i]) + 1.8 * SC); pos.push(q.x, q.y, q.z); uv.push(a / NU, b / NVv); }
      for (let a = 0; a < NU; a++) for (let b = 0; b < NVv; b++) { const q = a * (NVv + 1) + b, r = q + NVv + 1; idx.push(q, r, q + 1, r, r + 1, q + 1); }
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g2.setIndex(idx); g2.computeVertexNormals();
      const top = new THREE.Mesh(g2, new THREE.MeshPhysicalMaterial({ map: padTexture(side), color: '#c9c9c4', roughness: .85, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); top.castShadow = true;
      const grp = new THREE.Group(); grp.add(top); pt.add(grp); return { grp, P, t1, t2, W2, H2 };
    };
    const padR = mkPad(PR, 'R', 0), padL = mkPad(PLft, 'L', -.35);
    // ---- DEA ----
    const aed = new THREE.Group(); scene.add(aed); aed.position.set(-3.3, 0, 1.7); aed.rotation.y = .55;
    const shell = new THREE.Mesh(roundedBox(2.0, .5, 1.5, .14), realMat('plastic', { color: '#1f9d55', roughness: .45, clearcoat: .5 })); shell.position.y = .25; shell.rotation.x = Math.PI / 2; shell.castShadow = true; aed.add(shell);
    const faceP = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), new THREE.MeshStandardMaterial({ map: faceTexture(), roughness: .6 })); faceP.rotation.x = -Math.PI / 2; faceP.position.y = .505; aed.add(faceP);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.32, .07, 14, 32, Math.PI), realMat('plasticDark', { color: '#1a1e23' })); handle.position.set(0, .26, -.82); handle.rotation.set(0, 0, 0); aed.add(handle);
    // pantalla
    const scr = document.createElement('canvas'); scr.width = 512; scr.height = 300; const sg = scr.getContext('2d'); const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(.78, .46), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })); screen.rotation.x = -Math.PI / 2; screen.position.set(-.35, .508, -.22); aed.add(screen);
    const bezel = new THREE.Mesh(roundedBox(.86, .54, .04, .02, 3), realMat('plasticDark', { color: '#15181c' })); bezel.rotation.x = -Math.PI / 2; bezel.position.set(-.35, .49, -.22); aed.add(bezel);
    // botones
    const mkBtn = (r, col, x, z, icon) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.05, .07, 40), realMat('plastic', { color: col, roughness: .35, clearcoat: .6, emissive: col, emissiveIntensity: 0 })); b.position.set(x, .52, z); aed.add(b);
      if (icon) { const ic = new THREE.Mesh(new THREE.CircleGeometry(r * .7, 32), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, icon), transparent: true, toneMapped: false })); ic.rotation.x = -Math.PI / 2; ic.position.set(x, .558, z); aed.add(ic); } return b; };
    const powerBtn = mkBtn(.11, '#2fbf6b', .55, -.4, (g) => { g.strokeStyle = '#fff'; g.lineWidth = 12; g.beginPath(); g.arc(64, 70, 34, -1.1, Math.PI + 1.1); g.stroke(); g.beginPath(); g.moveTo(64, 20); g.lineTo(64, 64); g.stroke(); });
    const shockBtn = mkBtn(.17, '#ff7a1a', .5, .12, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(74, 10); g.lineTo(38, 72); g.lineTo(62, 72); g.lineTo(50, 118); g.lineTo(92, 50); g.lineTo(66, 50); g.closePath(); g.fill(); });
    const socket = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .14, 24), realMat('plasticDark', { color: '#0f1215' })); socket.position.set(.95, .3, -.45); socket.rotation.z = Math.PI / 2; aed.add(socket);
    // cables de los parches
    const cableMat = realMat('rubber', { color: '#22262b', roughness: .45, clearcoat: .3 });
    const cables = [padR, padL].map((pd) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), cableMat); m.castShadow = true; scene.add(m); return m; });
    const packPos = V(-2.0, .06, 2.1);
    const updCables = () => { const s0 = socket.getWorldPosition(V(0, 0, 0));
      [padR, padL].forEach((pd, i) => { const end = pd.grp.localToWorld(pd.P.p.clone().addScaledVector(pd.t1, -pd.H2 * .5)); const mid = s0.clone().lerp(end, .5); mid.y = .05; const m2 = s0.clone().lerp(end, .25); m2.y = .06 + i * .03;
        cables[i].geometry.dispose(); cables[i].geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([s0.clone().add(V(.15, 0, 0)), m2, mid, end.clone().add(V(0, .15, 0)), end]), 60, .028, 8); }); };
    // ---- trayectoria de la corriente (rayos X) ----
    const cur = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([PR.p.clone().addScaledVector(PR.n, -10 * SC), hc.clone().add(V(-14 * SC, 14 * SC, 7 * SC)), hc.clone(), hc.clone().add(V(28 * SC, -17 * SC, -7 * SC)), PLft.p.clone().addScaledVector(PLft.n, -10 * SC)]), 80, 7 * SC, 12), glowMat('#7fd3ff', 0));
    pt.add(cur); const curMat = cur.material;
    // ---- cámaras sobre la anatomía real ----
    { const chest = pt.localToWorld(L(20, -200, 1250)), w = (v) => v.toArray();
      chapters[0].cam = { pos: w(chest.clone().add(V(-2.2, 5.0, 6.8))), target: w(chest.clone().add(V(-1.5, -1.0, .9))) };
      chapters[1].cam = { pos: w(chest.clone().add(V(.6, 4.3, .9))), target: w(chest.clone().add(V(0, -.5, -.45))) };
      chapters[2].cam = { pos: w(chest.clone().add(V(.5, 3.2, 2.6))), target: w(chest.clone().add(V(0, -.5, -.3))) };
      chapters[3].cam = { pos: w(chest.clone().add(V(-1.2, 4.6, 4.9))), target: w(chest.clone().add(V(-1.0, -.7, .7))) };
      chapters[4].cam = { pos: w(chest.clone().add(V(1.7, 2.6, 3.2))), target: w(chest.clone().add(V(0, -.4, 0))) };
      chapters[5].cam = chapters[0].cam; }
    // ---- etiquetas ----
    c.label({ es: 'DEA', en: 'AED' }, null, shell, '#3ddc84'); // 0
    c.label({ es: 'Botón de descarga', en: 'Shock button' }, null, shockBtn, '#ff9a4d'); // 1
    c.label({ es: 'Encendido', en: 'Power' }, null, powerBtn, '#3ddc84'); // 2
    c.label({ es: 'Pantalla', en: 'Screen' }, { es: 'ritmo y avisos', en: 'rhythm and prompts' }, screen, '#cfe8d8'); // 3
    const lp = (pd) => { const o = new THREE.Object3D(); o.position.copy(pd.P.p).addScaledVector(pd.P.n, 15 * SC); pt.add(o); return o; };
    c.label({ es: 'Parche derecho', en: 'Right pad' }, { es: 'bajo la clavícula', en: 'below the collarbone' }, lp(padR), '#ff7a6b'); // 4
    c.label({ es: 'Parche izquierdo', en: 'Left pad' }, { es: 'costado, bajo la axila', en: 'side, below the armpit' }, lp(padL), '#ff7a6b'); // 5
    c.label({ es: 'Corazón', en: 'Heart' }, null, heart, '#ff5a6e'); // 6
    const cpt = new THREE.Object3D(); cpt.position.copy(L(0, -225, 1215)); pt.add(cpt); c.label({ es: 'Centro del pecho', en: 'Centre of the chest' }, { es: 'mitad inferior del esternón', en: 'lower half of breastbone' }, cpt, '#ffd166'); // 7
    // ---- compresiones: deforman la piel y el corazón ----
    const orig = sp.array.slice(), ctrC = L(0, -200, 1215); const wgt = new Float32Array(sp.count);
    for (let i = 0; i < sp.count; i++) { tv.fromBufferAttribute(sp, i); if (tv.z < ctrC.z - 70 * SC || Math.abs(tv.x) > 170 * SC) continue; const d2 = (tv.x - ctrC.x) ** 2 + (tv.y - ctrC.y) ** 2; wgt[i] = Math.exp(-d2 / (75 * SC) ** 2); }
    let lastDepth = -1;
    const deform = (dep) => { if (Math.abs(dep - lastDepth) < .0005) return; lastDepth = dep; const a = sp.array; for (let i = 0; i < sp.count; i++) { if (wgt[i] < .002) continue; a[i * 3 + 2] = orig[i * 3 + 2] - dep * wgt[i]; } sp.needsUpdate = true; };
    // ---- funciones de acción ----
    c.state.doShock = null;
    window.__aed = { doShock: (cc) => {
      if (!S.charged) { cc.toast(lang === 'en' ? 'Not charged: no shock advised or still charging.' : 'Sin carga: no se indicó descarga o aún está cargando.'); return; }
      S.charged = false; S.shockT = 0; S.shocks++; cc.sound.thump(40, .25, .5); cc.sound.noise(.25, .08, 1400);
      const Rr = S.imp, E = S.joules; S.bte = 1; cc.state.mI?.(Math.round(Math.sqrt(E / (Rr * .0065)) * .9)); cc.toast(lang === 'en' ? 'Shock delivered. Start CPR now.' : 'Descarga administrada. Inicie RCP ahora.', 3500);
      setTimeout(() => { S.rhythm = Math.random() < .8 ? 'sinus' : 'vf'; }, 1800); } };
    window.__aedComp = (cc) => { const now = performance.now() / 1000; S.compT.push(now); S.compT = S.compT.filter((x) => now - x < 6); S.comp = 1; cc.sound.beep(220, .04, 'square', .02); };
    // ---- monitor lateral ----
    const mon = c.side({ es: 'Electrocardiograma (parches)', en: 'ECG (via pads)' }, 110);
    const g = mon.ctx, MW = mon.canvas.width, MH = mon.canvas.height, buf = new Float32Array(MW).fill(NaN); let wx = 0, acc = 0;
    let metro = 0, lastPrompt = '';
    c.onFrame((dt, rdt) => {
      const ci = c.chapter(); S.ecgT += dt; S.ph += dt;
      // parches: vuelan desde el paquete a su posición
      if (S.padsGo && S.padsK < 1) S.padsK = Math.min(1, S.padsK + rdt / 2.2);
      const show = ci >= 1 ? 1 : 0;
      for (const [i, pd] of [padR, padL].entries()) { const k = smooth(i * .35, .65 + i * .35, S.padsK) * show + (ci >= 2 ? 1 : 0) * (1 - show); const kk = ci >= 2 ? 1 : k;
        pd.grp.visible = kk > 0.01; const from = pt.worldToLocal(packPos.clone()); pd.grp.position.copy(from.sub(pd.P.p).multiplyScalar(1 - kk)).addScaledVector(pd.P.n, Math.sin(kk * Math.PI) * 90 * SC); pd.grp.scale.setScalar(lerp(.6, 1, kk)); cables[i].visible = kk > .01; }
      if (ci >= 1) updCables();
      // ritmo, análisis, carga
      if (S.analyzing > 0) { S.analyzing -= rdt; if (S.analyzing <= 0) { S.verdict = RHY[S.rhythm].shock ? 'shock' : 'noshock'; S.prompt = S.verdict === 'shock' ? 'charging' : 'noshock'; S.charge = 0; c.toast(S.verdict === 'shock' ? (lang === 'en' ? 'Shock advised. Charging…' : 'Descarga indicada. Cargando…') : (lang === 'en' ? 'No shock advised. Start CPR.' : 'Descarga no indicada. Inicie RCP.'), 3200); } }
      if (S.verdict === 'shock' && !S.charged && S.shockT < 0 && (ci === 2 || ci === 3)) { S.charge += rdt / 3; if (Math.floor(S.charge * 12) !== Math.floor((S.charge - rdt / 3) * 12)) c.sound.beep(500 + S.charge * 900, .05, 'sine', .02); if (S.charge >= 1) { S.charged = true; S.prompt = 'press'; c.sound.beep(1200, .3, 'square', .03); } }
      if (S.shockT >= 0) { S.shockT += rdt; if (S.shockT > 2.2) { S.shockT = -1; S.verdict = null; S.prompt = 'cpr'; } }
      const flash = S.shockT >= 0 ? Math.max(0, 1 - S.shockT / .5) : 0;
      // botón de descarga parpadea cuando está cargado
      shockBtn.material.emissiveIntensity = S.charged ? (Math.sin(c.time * 12) > 0 ? 1.4 : .2) : 0; powerBtn.material.emissiveIntensity = S.on ? .6 : 0;
      // corriente y sacudida
      curMat.uniforms ? (curMat.uniforms.uOpacity ? (curMat.uniforms.uOpacity.value = flash) : null) : (curMat.opacity = flash); cur.visible = flash > .01;
      pt.position.y = -bb.min.y + .005 + (flash > 0 ? Math.sin(S.shockT * 60) * .03 * flash : 0);
      // corazón: fibrila, se detiene o late
      const rh = S.rhythm;
      if (rh === 'sinus') { const p = (S.ph % .8) / .8, cnt = gs(p, .3, .07, 1); heart.scale.setScalar(1 - .06 * cnt); wallMat.emissiveIntensity = .5 * gs(p, .25, .04, 1) * xray.k; }
      else if (rh === 'vf') { heart.scale.set(1 + (Math.random() - .5) * .012, 1 + (Math.random() - .5) * .012, 1 + (Math.random() - .5) * .012); wallMat.emissiveIntensity = (.25 + .25 * Math.abs(ecgAt('vf', S.ecgT))) * xray.k; }
      else if (rh === 'vt') { const p = (S.ph % (60 / 185)) / (60 / 185); heart.scale.setScalar(1 - .025 * gs(p, .3, .12, 1)); wallMat.emissiveIntensity = .35 * gs(p, .25, .1, 1) * xray.k; }
      else { heart.scale.setScalar(1); wallMat.emissiveIntensity = 0; }
      wallMat.emissiveIntensity += flash * 2.5;
      // RCP
      if (ci === 4) { if (S.cprAuto) { metro += rdt * 110 / 60; if (metro >= 1) { metro -= 1; window.__aedComp(c); } }
        S.comp = Math.max(0, S.comp - rdt * 3.6); const depth = 5.4 * Math.sin(Math.min(1, S.comp) * Math.PI / 2) ** .8 * (S.comp > 0 ? 1 : 0); deform(depth * 10 * SC); thx.position.z = -depth * 10 * SC * .8; heart.scale.y *= 1 - .1 * (depth / 5.4);
        const n = S.compT.length; const rate = n >= 2 ? Math.round(60 * (n - 1) / (S.compT[n - 1] - S.compT[0])) : 0; c.state.mRate?.(rate || '--'); c.state.mD?.(n && performance.now() / 1000 - S.compT[n - 1] < 1.2 ? '5.4' : '0');
        if (n >= 4) { const msg = rate < 100 ? (lang === 'en' ? 'Push faster' : 'Más rápido') : rate > 120 ? (lang === 'en' ? 'Slow down' : 'Más despacio') : (lang === 'en' ? 'Good rate' : 'Buen ritmo'); if (msg !== lastPrompt) { lastPrompt = msg; c.toast(msg, 1200); } } }
      else { deform(0); thx.position.z = 0; }
      // pantalla del DEA
      sg.fillStyle = S.on ? '#06140c' : '#0b0d0f'; sg.fillRect(0, 0, 512, 300);
      if (S.on) { sg.strokeStyle = 'rgba(61,220,132,.12)'; sg.lineWidth = 1; for (let x = 0; x < 512; x += 32) { sg.beginPath(); sg.moveTo(x, 40); sg.lineTo(x, 220); sg.stroke(); }
        sg.strokeStyle = '#3ddc84'; sg.lineWidth = 3; sg.beginPath(); for (let i = 0; i < 512; i++) { const v = buf[(wx + 1 + Math.floor(i / 512 * MW)) % MW]; const y = 140 - (Number.isNaN(v) ? 0 : v) * 70; i ? sg.lineTo(i, y) : sg.moveTo(i, y); } sg.stroke();
        const P = { pads: { es: 'Coloque los parches', en: 'Apply pads' }, analyse: { es: 'Pulse Analizar', en: 'Press Analyse' }, analysing: { es: 'Analizando… no toque al paciente', en: 'Analysing… do not touch the patient' }, charging: { es: 'Descarga indicada · cargando', en: 'Shock advised · charging' }, press: { es: 'Pulse el botón naranja', en: 'Press the orange button' }, noshock: { es: 'Descarga no indicada · RCP', en: 'No shock advised · CPR' }, cpr: { es: 'Inicie RCP', en: 'Start CPR' } }[S.prompt] || { es: '', en: '' };
        sg.fillStyle = S.prompt === 'press' && Math.sin(c.time * 12) > 0 ? '#ff9a4d' : '#e8f5ec'; sg.font = '700 30px Manrope, sans-serif'; sg.fillText(T(P), 18, 272);
        sg.fillStyle = '#9fd8b7'; sg.font = '600 22px Manrope, sans-serif'; sg.fillText(T(RHY[S.rhythm]).slice(0, 34), 18, 30); sg.textAlign = 'right'; sg.fillText(`${S.joules} J · ${S.shocks} ⚡`, 494, 30); sg.textAlign = 'left';
        if (S.verdict === 'shock' && !S.charged && S.shockT < 0) { sg.fillStyle = '#ff9a4d'; sg.fillRect(18, 232, 476 * clamp(S.charge, 0, 1), 8); } }
      scrTex.needsUpdate = true;
      // monitor lateral: ECG (o la onda bifásica justo tras la descarga)
      acc += dt * 160; while (acc >= 1) { acc -= 1; wx = (wx + 1) % MW; let v = S.on ? ecgAt(S.rhythm, S.ecgT - (acc / 160)) : 0; if (ci === 4 && S.comp > 0) v += .6 * Math.sin(S.comp * Math.PI); if (flash > .6) v = 2.2 * Math.sign(Math.sin(S.shockT * 80)); buf[wx] = v; for (let k = 1; k < 14; k++) buf[(wx + k) % MW] = NaN; }
      g.clearRect(0, 0, MW, MH); g.strokeStyle = 'rgba(61,220,132,.08)'; g.lineWidth = 1; for (let x = 0; x < MW; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MH); g.stroke(); }
      if (S.bte > 0 && ci === 3 && S.shockT >= 0) { // forma de onda bifásica exponencial truncada
        g.strokeStyle = '#7fd3ff'; g.lineWidth = 3; g.beginPath(); const x0 = 40, x1 = MW - 40, y0 = MH / 2; for (let i = 0; i <= 200; i++) { const tt = i / 200 * 10; const I = tt < 6 ? Math.exp(-tt / 7) : tt < 6.2 ? 0 : -.55 * Math.exp(-(tt - 6.2) / 6) * (tt < 10 ? 1 : 0); const x = x0 + (x1 - x0) * i / 200, y = y0 - I * (MH * .38); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
        g.fillStyle = 'rgba(255,255,255,.6)'; g.font = '600 18px Manrope, sans-serif'; g.fillText(lang === 'en' ? 'biphasic current · 10 ms' : 'corriente bifásica · 10 ms', 46, 22); }
      else { g.strokeStyle = '#3ddc84'; g.lineWidth = 2.5; g.beginPath(); let pen = false; for (let i = 0; i < MW; i++) { const v = buf[i]; if (Number.isNaN(v)) { pen = false; continue; } const y = MH / 2 - v * MH * .32; pen ? g.lineTo(i, y) : g.moveTo(i, y); pen = true; } g.stroke(); }
      mon.right.textContent = S.on ? T(RHY[S.rhythm]) : (lang === 'en' ? 'off' : 'apagado');
      c.state.mE?.(S.joules);
    });
  }
});
function doShock(c) { window.__aed?.doShock(c); }
function compress(c) { window.__aedComp?.(c); }
