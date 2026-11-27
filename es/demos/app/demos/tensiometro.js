// Demo: Tomar la presión arterial / Taking blood pressure — brazo real (BodyParts3D), esfigmomanómetro aneroide y ruidos de Korotkoff
import { createDemo, THREE, holoMesh, gridFloor, loadPack, realMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang, t } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CEN = [-215, -85, 1050], SC = 1 / 90;
const Y = (zmm) => (zmm - CEN[2]) * SC;
const PATIENTS = { normal: { sbp: 118, dbp: 76, hr: 72 }, htn: { sbp: 152, dbp: 96, hr: 78 }, low: { sbp: 94, dbp: 58, hr: 88 } };
const ERRORS = { ok: { ds: 0, dd: 0, rate: 2.5, small: false, low: false }, small: { ds: 11, dd: 8, rate: 2.5, small: true, low: false }, low: { ds: 9, dd: 9, rate: 2.5, small: false, low: true }, fast: { ds: 0, dd: 0, rate: 11, small: false, low: false } };
const S = { P: 0, pt: 'normal', err: 'ok', ph: 0, beat: false, inflating: false, valve: false, rate: 2.5, pump: 0, found: { sbp: 0, dbp: 0, last: 0, silent: 0 }, max: 0, auto: null, manual: null, place: 1, hist: [] };
const pat = () => PATIENTS[S.pt];
const eff = () => { const e = ERRORS[S.err]; return { sbp: pat().sbp + e.ds, dbp: pat().dbp + e.dd }; };
// onda de presión arterial (subida rápida, muesca dícrota, caída diastólica), normalizada 0–1
const rawW = (p) => Math.exp(-(((p - .17) / .085) ** 2)) + .36 * Math.exp(-(((p - .43) / .1) ** 2)) + .14 * (1 - p);
const WMIN = Math.min(...Array.from({ length: 201 }, (_, i) => rawW(i / 200))), WMAX = Math.max(...Array.from({ length: 201 }, (_, i) => rawW(i / 200)));
const wave = (p) => (rawW(p) - WMIN) / (WMAX - WMIN);

const chapters = [
  { title: { es: 'El equipo', en: 'The kit' }, cam: { pos: [1.2, 3.9, 9.2], target: [.2, .4, -.4] }, labels: [0, 1, 2, 3],
    lines: [
      { es: 'Un esfigmomanómetro aneroide: brazalete con una bolsa de aire, pera para inflarlo y manómetro que marca la presión en mmHg.', en: 'An aneroid sphygmomanometer: a cuff with an air bladder, a bulb to inflate it and a gauge that reads pressure in mmHg.' },
      { es: 'Con el estetoscopio sobre la arteria del codo se escuchan los ruidos de Korotkoff.', en: 'With the stethoscope over the artery at the elbow you hear the Korotkoff sounds.' },
      { es: 'El brazo, sus huesos y músculos son reales, de un atlas anatómico. Gíralo con el dedo o el ratón.', en: 'The arm, its bones and muscles are real, from an anatomical atlas. Rotate it with your finger or mouse.' }
    ] },
  { title: { es: 'Colocar el brazalete', en: 'Placing the cuff' }, cam: { pos: [1.6, 2.6, 5.2], target: [.7, .3, 0] }, labels: [0, 4, 6], xray: true,
    lines: [
      { es: 'El borde inferior va 2 a 3 cm por encima del pliegue del codo, con la marca de arteria sobre la arteria braquial.', en: 'The lower edge sits 2 to 3 cm above the elbow crease, with the artery mark over the brachial artery.' },
      { es: 'La bolsa de aire debe rodear al menos el 80 % del brazo. Un brazalete chico da cifras falsamente altas.', en: 'The bladder should wrap at least 80% of the arm. A cuff that is too small gives falsely high readings.' },
      { es: 'Brazo apoyado y a la altura del corazón, paciente sentado, espalda apoyada y sin hablar.', en: 'Arm supported at heart level, patient seated, back supported and not talking.' }
    ], enter: () => { S.place = 0; }, exit: () => { S.place = 1; } },
  { title: { es: 'Mide tú', en: 'Measure it' }, cam: { pos: [-.2, 3.1, 7.2], target: [-.6, .5, 0] }, labels: [1, 3],
    lines: [
      { es: 'Mantén el botón para inflar hasta unos 30 mmHg por encima de donde desaparece el pulso radial.', en: 'Hold the button to inflate to about 30 mmHg above where the radial pulse disappears.' },
      { es: 'Suelta: la válvula deja salir el aire a 2–3 mmHg por segundo. Activa el sonido ♪ y escucha.', en: 'Let go: the valve lets air out at 2–3 mmHg per second. Turn on sound ♪ and listen.' },
      { es: 'El primer golpe es la presión sistólica; cuando los ruidos desaparecen, la diastólica.', en: 'The first tap is the systolic pressure; when the sounds disappear, the diastolic.' }
    ], enter: () => { S.P = 0; resetFound(); }, exit: () => { S.inflating = false; } },
  { title: { es: 'Por qué suena', en: 'Why it sounds' }, cam: { pos: [1.9, 1.7, 3.6], target: [.6, .25, 0] }, labels: [4, 7], xray: true,
    lines: [
      { es: 'Si el brazalete aprieta más que la presión sistólica, la arteria queda cerrada: no pasa sangre ni hay ruido.', en: 'If the cuff squeezes harder than systolic pressure, the artery stays shut: no blood gets through and there is no sound.' },
      { es: 'Entre sistólica y diastólica, la arteria se abre en cada latido: el chorro turbulento produce el golpe.', en: 'Between systolic and diastolic, the artery opens with each beat: the turbulent jet makes the tap.' },
      { es: 'Bajo la diastólica queda abierta todo el tiempo, el flujo vuelve a ser laminar y silencioso. Mueve la presión del brazalete.', en: 'Below diastolic it stays open all the time; flow is laminar and silent again. Move the cuff pressure.' }
    ], enter: (c) => { S.manual = 130; c.timeScale = .5; }, exit: (c) => { S.manual = null; c.timeScale = 1; } },
  { title: { es: 'El monitor automático', en: 'The automatic monitor' }, cam: { pos: [.2, 3.3, 7.6], target: [-.6, .5, 0] }, labels: [1],
    lines: [
      { es: 'Los monitores automáticos no escuchan: miden las pequeñas oscilaciones de presión que cada latido transmite al brazalete.', en: 'Automatic monitors do not listen: they measure the small pressure oscillations each beat passes to the cuff.' },
      { es: 'La oscilación máxima ocurre en la presión arterial media. Sistólica y diastólica se calculan con proporciones de esa curva.', en: 'The largest oscillation happens at mean arterial pressure. Systolic and diastolic are estimated from ratios of that curve.' },
      { es: 'Pulsa «Medición automática» y mira cómo desinfla por escalones.', en: 'Press "Automatic reading" and watch it deflate in steps.' }
    ], exit: () => { S.auto = null; } },
  { title: { es: 'Errores comunes', en: 'Common errors' }, cam: { pos: [-.2, 3.1, 7.2], target: [-.6, .5, 0] }, labels: [0, 8],
    lines: [
      { es: 'Elige un error y mide otra vez. Compara con la presión real del paciente.', en: 'Pick an error and measure again. Compare with the patient\'s true pressure.' },
      { es: 'Un brazalete chico o el brazo sin apoyo, por debajo del corazón, suben la lectura. Desinflar rápido hace saltar el primer ruido y subestima la sistólica.', en: 'A small cuff or an unsupported arm below heart level push the reading up. Deflating too fast skips the first tap and underestimates systolic.' },
      { es: 'Valores educativos aproximados, basados en la literatura sobre técnica de medición.', en: 'Approximate teaching values, based on the literature on measurement technique.' }
    ], enter: () => { S.P = 0; resetFound(); }, exit: () => { S.err = 'ok'; S.inflating = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [1.2, 3.9, 9.2], target: [.2, .4, -.4] }, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 6 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Qué indica el primer ruido de Korotkoff?', en: 'What does the first Korotkoff sound mark?' }, o: [{ es: 'La presión sistólica', en: 'Systolic pressure' }, { es: 'La presión diastólica', en: 'Diastolic pressure' }, { es: 'La frecuencia cardiaca', en: 'Heart rate' }], a: 0,
    e: { es: 'Es el primer latido que logra abrir la arteria bajo el brazalete.', en: 'It is the first beat able to force the artery open under the cuff.' } },
  { q: { es: '¿Qué pasa si el brazalete es demasiado pequeño?', en: 'What happens if the cuff is too small?' }, o: [{ es: 'La lectura sale falsamente alta', en: 'The reading comes out falsely high' }, { es: 'La lectura sale falsamente baja', en: 'The reading comes out falsely low' }, { es: 'No cambia nada', en: 'Nothing changes' }], a: 0,
    e: { es: 'Se necesita más presión para comprimir la arteria.', en: 'More pressure is needed to compress the artery.' } },
  { q: { es: 'En un monitor oscilométrico, la oscilación máxima corresponde a…', en: 'In an oscillometric monitor, the largest oscillation matches…' }, o: [{ es: 'La presión arterial media', en: 'Mean arterial pressure' }, { es: 'La sistólica', en: 'Systolic pressure' }, { es: 'La presión venosa', en: 'Venous pressure' }], a: 0,
    e: { es: 'Sistólica y diastólica se estiman a partir de esa curva.', en: 'Systolic and diastolic are estimated from that curve.' } }
];
function resetFound() { S.found = { sbp: 0, dbp: 0, last: 0, silent: 0 }; S.max = 0; }

// ---------- texturas ----------
function cuffTexture() {
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; const g = c.getContext('2d');
  g.fillStyle = '#1d2c48'; g.fillRect(0, 0, 2048, 512);
  // tejido de nylon
  for (let y = 0; y < 512; y += 3) { g.fillStyle = `rgba(255,255,255,${.025 + .02 * ((y / 3) % 2)})`; g.fillRect(0, y, 2048, 1); }
  for (let x = 0; x < 2048; x += 3) { g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(x, 0, 1, 512); }
  // costuras perimetrales
  g.strokeStyle = 'rgba(214,224,240,.55)'; g.lineWidth = 3; g.setLineDash([14, 10]);
  for (const y of [26, 486]) { g.beginPath(); g.moveTo(0, y); g.lineTo(2048, y); g.stroke(); }
  g.setLineDash([]);
  // velcro (zona áspera)
  g.fillStyle = '#16223a'; g.fillRect(1250, 40, 760, 432); for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * .05})`; g.fillRect(1250 + Math.random() * 760, 40 + Math.random() * 432, 2, 2); }
  // marca de arteria, índice y rango
  g.fillStyle = '#f2f5fa'; g.font = '600 44px Manrope, sans-serif'; g.textAlign = 'center';
  const ax = 1024 * .25 + 0; // marca sobre la cara medial
  g.beginPath(); g.moveTo(ax - 34, 330); g.lineTo(ax + 34, 330); g.lineTo(ax, 400); g.closePath(); g.fill();
  g.fillText(lang === 'en' ? 'ARTERY' : 'ARTERIA', ax, 300);
  g.fillRect(760, 120, 6, 280); g.font = '600 34px Manrope, sans-serif'; g.fillText('INDEX', 763, 100);
  g.fillStyle = 'rgba(242,245,250,.85)'; g.fillRect(560, 430, 420, 8); g.font = '600 30px Manrope, sans-serif'; g.fillText(lang === 'en' ? 'ADULT 22–32 cm' : 'ADULTO 22–32 cm', 770, 470);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}
function gaugeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const g = c.getContext('2d'), R = 512;
  const gr = g.createRadialGradient(R, R * .85, 50, R, R, R); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#e7e9ec'); g.fillStyle = gr; g.beginPath(); g.arc(R, R, R, 0, Math.PI * 2); g.fill();
  g.translate(R, R); g.fillStyle = '#1b1f24'; g.strokeStyle = '#1b1f24';
  const ang = (p) => (-135 + p / 300 * 270) * Math.PI / 180;
  for (let p = 0; p <= 300; p += 2) { const a = ang(p), big = p % 10 === 0, r0 = big ? 400 : 425; g.lineWidth = big ? 6 : 3; g.beginPath(); g.moveTo(Math.sin(a) * r0, -Math.cos(a) * r0); g.lineTo(Math.sin(a) * 460, -Math.cos(a) * 460); g.stroke(); }
  g.font = '700 62px Manrope, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let p = 0; p <= 300; p += 20) { const a = ang(p); g.fillText(String(p), Math.sin(a) * 335, -Math.cos(a) * 335); }
  // zona inicial del cero (tolerancia)
  g.fillStyle = '#2f9e6a'; g.beginPath(); g.arc(0, 0, 470, ang(-3) - Math.PI / 2, ang(3) - Math.PI / 2); g.arc(0, 0, 455, ang(3) - Math.PI / 2, ang(-3) - Math.PI / 2, true); g.fill();
  g.fillStyle = '#1b1f24'; g.font = '700 54px Manrope, sans-serif'; g.fillText('mmHg', 0, 150); g.font = '500 30px Manrope, sans-serif'; g.fillStyle = '#5b6470'; g.fillText(lang === 'en' ? 'ANEROID' : 'ANEROIDE', 0, 210);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx;
}

createDemo({
  title: { es: 'Tomar la presión arterial', en: 'Taking blood pressure' }, accent: '#5b8def', bg: '#07090d', bgTop: '#232a36', bgMid: '#10141b', fog: .028, floorY: -3, exposure: .92, envIntensity: .3,
  camera: chapters[0].cam, thumb: { pos: [.2, 2.8, 6.4], target: [-.5, .4, 0], chapter: 2 }, minDist: 1.6, maxDist: 14,
  credit: BP3D_CREDIT, sources: { es: 'Técnica según guías AHA/ESH de medición de la presión arterial; ruidos de Korotkoff y oscilometría simulados con fines educativos.', en: 'Technique per AHA/ESH blood pressure measurement guidance; Korotkoff sounds and oscillometry simulated for teaching.' }, chapters,
  action(ui, c, ci) {
    c.state.mP = ui.metric({ es: 'brazalete', en: 'cuff' }, 'mmHg');
    if (ci === 1) ui.button({ es: 'Repetir colocación', en: 'Replay placement' }, () => { S.place = 0; });
    if (ci === 2 || ci === 5) {
      c.state.mR = ui.metric({ es: 'tu lectura', en: 'your reading' }, 'mmHg');
      ui.hold({ es: 'Mantén para inflar', en: 'Hold to inflate' }, (v) => { S.inflating = v; if (v) { S.auto = null; if (S.P < 20 || S.found.sbp < 0 || S.found.dbp) { resetFound(); S.max = S.P; } } });
      ui.button({ es: 'Vaciar', en: 'Deflate' }, () => { S.inflating = false; S.dump = true; });
    }
    if (ci === 2) ui.seg([{ value: 'normal', label: { es: 'Normal', en: 'Normal' } }, { value: 'htn', label: { es: 'Hipertenso', en: 'Hypertensive' } }, { value: 'low', label: { es: 'Hipotenso', en: 'Hypotensive' } }], S.pt, (v) => { S.pt = v; S.P = 0; resetFound(); });
    if (ci === 3) ui.slider({ es: 'Presión del brazalete', en: 'Cuff pressure' }, { min: 0, max: 200, step: 1, value: S.manual ?? 130, fmt: (v) => v + ' mmHg' }, (v) => { S.manual = v; });
    if (ci === 4) { c.state.mR = ui.metric({ es: 'resultado (PAM)', en: 'result (MAP)' }, 'mmHg'); ui.button({ es: 'Medición automática', en: 'Automatic reading' }, () => startAuto(c)); }
    if (ci === 5) ui.seg([{ value: 'ok', label: { es: 'Correcto', en: 'Correct' } }, { value: 'small', label: { es: 'Brazalete chico', en: 'Small cuff' } }, { value: 'low', label: { es: 'Brazo sin apoyo', en: 'Unsupported arm' } }, { value: 'fast', label: { es: 'Desinflar rápido', en: 'Fast deflation' } }], S.err, (v) => { S.err = v; S.P = 0; resetFound(); });
    if (ci === 6) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#5b8def', 40, -3));
    const [A, BD] = await Promise.all([loadPack('bparm', { center: CEN, scale: SC }), loadPack('body', { center: CEN, scale: SC })]);
    // ---- paciente real acostado: el brazo derecho descansa junto al cuerpo, palma arriba; la cámara mira desde el lado del profesional ----
    const arm = new THREE.Group(); scene.add(arm);
    { // orientación a partir del eje real del brazo: hombro → mano apunta a −x, cara anterior (palma) hacia arriba, cara medial hacia la cámara
      const cen = (geo) => { geo.computeBoundingBox(); return geo.boundingBox.getCenter(V(0, 0, 0)); };
      const aL = cen(A.geo.hand).sub(cen(A.geo.humerus)).normalize(), upL = V(0, 0, 1).addScaledVector(aL, -aL.z).normalize(), thL = aL.clone().cross(upL);
      const mL = new THREE.Matrix4().makeBasis(aL, upL, thL), aW = V(1, 0, 0), upW = V(0, 1, 0), mW = new THREE.Matrix4().makeBasis(aW, upW, aW.clone().cross(upW));
      arm.quaternion.setFromRotationMatrix(mW.multiply(mL.transpose())); }
    const add = (geo, kind, opts, ghost, color = '#ffb38a') => { const m = holoMesh(geo, color, { real: kind, realOpts: opts, ghost, opacity: .012, rim: .4, intensity: .6, edges: false }); arm.add(m); return m; };
    const skin = add(BD.geo.skin, 'skin', { side: THREE.DoubleSide, clearcoat: .04, roughness: .62, sheen: .45 }, .05);
    for (const k of ['humerus', 'radius', 'ulna', 'hand']) add(A.geo[k], 'bone', {}, .55, '#ffe9c7');
    for (const k of ['biceps', 'brachialis', 'triceps', 'brachiorad']) add(A.geo[k], 'muscle', {}, .16, '#ff7a7a');
    const skinReal = skin.userData.real;
    // cama: el paciente descansa sobre ella
    arm.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(skinReal, true); arm.position.y = -bb.min.y - .02; arm.updateMatrixWorld(true);
    const bodyZ = arm.localToWorld(V(215 * SC, Y(1100), 0)).z;
    const table = new THREE.Mesh(new THREE.BoxGeometry(17, .9, 7.6), new THREE.MeshPhysicalMaterial({ color: '#a7b3bd', roughness: .92, sheen: .3, sheenColor: new THREE.Color('#dde5eb') })); table.position.set(-2.2, -.45, bodyZ + .6); table.receiveShadow = true; scene.add(table);
    { const fr = new THREE.Mesh(new THREE.BoxGeometry(17.4, .25, 8), realMat('metal', { color: '#8b939c', roughness: .4 })); fr.position.set(-2.2, -1.05, bodyZ + .6); scene.add(fr);
      for (const x of [-10.3, 5.9]) for (const z of [-3.6, 3.6]) { const lg = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.9, 12), realMat('metal', { color: '#9aa2ab' })); lg.position.set(x, -2.1, bodyZ + .6 + z); scene.add(lg); }
      const pillow = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshPhysicalMaterial({ color: '#aeb9c2', roughness: .92, sheen: .2 })); pillow.scale.set(1.9, .4, 2.6); pillow.position.copy(arm.localToWorld(V(215 * SC, Y(1590), -(-40 + 85) * SC))).setY(.14); pillow.receiveShadow = true; scene.add(pillow); }
    const pad = new THREE.Object3D();
    // pantalón: tapa el corte del modelo en la cadera
    { const bsp = BD.geo.skin.attributes.position, tv2 = V(0, 0, 0), cx = 215 * SC, cz2 = -(-110 + 85) * SC;
      const ringAt = (zmm, grow, n = 80) => { const yLoc = Y(zmm), r = new Float32Array(n).fill(0); for (let i = 0; i < bsp.count; i++) { tv2.fromBufferAttribute(bsp, i); if (Math.abs(tv2.y - yLoc) > 22 * SC || Math.abs(tv2.x - cx) > 160 * SC) continue; const a = Math.atan2(tv2.z - cz2, tv2.x - cx); const b = ((Math.round(a / (Math.PI * 2) * n) % n) + n) % n; r[b] = Math.max(r[b], Math.hypot(tv2.x - cx, tv2.z - cz2)); }
        for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) if (!r[i]) { let a = 1; while (!r[(i + a) % n] && a < n) a++; r[i] = r[(i + a) % n]; }
        for (let k = 0; k < 5; k++) { const cp = r.slice(); for (let i = 0; i < n; i++) r[i] = Math.max(cp[i], (cp[(i + n - 1) % n] + 2 * cp[i] + cp[(i + 1) % n]) / 4); }
        return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return V(cx + Math.cos(a) * (r[i] + grow), yLoc, cz2 + Math.sin(a) * (r[i] + grow)); }); };
      const cloth = new THREE.MeshPhysicalMaterial({ color: '#4d6b8a', roughness: .92, sheen: .45, sheenColor: new THREE.Color('#9fb6cf'), side: THREE.DoubleSide });
      const levels = [1012, 990, 965, 940, 915, 893].map((z) => ringAt(z, 14 * SC)); const last = levels[levels.length - 1];
      for (let k = 1; k <= 8; k++) levels.push(last.map((p2) => V(cx + (p2.x - cx) * (1 - .012 * k), p2.y - k * 70 * SC, cz2 + (p2.z - cz2) * (1 - .03 * k))));
      const N2 = levels[0].length, g2 = new THREE.BufferGeometry(), pos = [], idx = []; levels.forEach((ring) => ring.forEach((p2) => pos.push(p2.x, p2.y, p2.z)));
      for (let v = 0; v < levels.length - 1; v++) for (let i = 0; i < N2; i++) { const a = v * N2 + i, b = v * N2 + (i + 1) % N2, c2 = a + N2, d = b + N2; idx.push(a, c2, b, b, c2, d); }
      g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.setIndex(idx); g2.computeVertexNormals(); const m = new THREE.Mesh(g2, cloth); m.castShadow = m.receiveShadow = true; m.userData.static = true; arm.add(m);
      const band = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ringAt(1012, 16 * SC), true), 160, 6 * SC, 8, true), new THREE.MeshPhysicalMaterial({ color: '#2c3e52', roughness: .8 })); band.userData.static = true; arm.add(band); }
    // ---- ejes y perfiles del brazo (coordenadas locales del brazo) ----
    const sp = A.geo.skin.attributes.position, tv = V(0, 0, 0);
    const slab = (geo, y0, y1) => { const p = geo.attributes.position, s = V(0, 0, 0); let n = 0; for (let i = 0; i < p.count; i++) { tv.fromBufferAttribute(p, i); if (tv.y > y0 && tv.y < y1) { s.add(tv); n++; } } return s.multiplyScalar(1 / Math.max(1, n)); };
    const W = 150 * SC, TH = 7 * SC, cz = 1150;
    const cA = slab(A.geo.skin, Y(cz - 75), Y(cz - 55)), cB = slab(A.geo.skin, Y(cz + 55), Y(cz + 75));
    const ax = cB.clone().sub(cA).normalize(), c0 = cA.clone().lerp(cB, .5);
    const e1 = V(1, 0, 0).sub(ax.clone().multiplyScalar(ax.x)).normalize(), e2 = ax.clone().cross(e1).normalize();
    // perfil radial real de la piel bajo el brazalete (64 sectores)
    const NB = 96, prof = new Float32Array(NB);
    for (const gg of [A.geo.skin, A.geo.biceps, A.geo.triceps, A.geo.brachialis, A.geo.brachiorad, A.geo.humerus]) { const pp = gg.attributes.position; for (let i = 0; i < pp.count; i++) { tv.fromBufferAttribute(pp, i).sub(c0); const h = tv.dot(ax); if (Math.abs(h) > W * .62) continue; const r1 = tv.dot(e1), r2 = tv.dot(e2), r = Math.hypot(r1, r2); const b = ((Math.round(Math.atan2(r2, r1) / (Math.PI * 2) * NB) % NB) + NB) % NB; if (r > prof[b]) prof[b] = r; } }
    for (let i = 0; i < NB; i++) if (!prof[i]) { let a = 1, b = 1; while (!prof[(i - a + NB) % NB]) a++; while (!prof[(i + b) % NB]) b++; prof[i] = lerp(prof[(i - a + NB) % NB], prof[(i + b) % NB], a / (a + b)); }
    for (let k = 0; k < 4; k++) { const cp = prof.slice(); for (let i = 0; i < NB; i++) prof[i] = Math.max(cp[i], (cp[(i - 1 + NB) % NB] + cp[i] * 2 + cp[(i + 1) % NB]) / 4); }
    const profAt = (th) => { const f = ((th / (Math.PI * 2)) * NB % NB + NB) % NB, i = Math.floor(f), k = f - i; return lerp(prof[i], prof[(i + 1) % NB], k); };
    // ---- brazalete: sigue la forma real del brazo; la cara externa se abomba al inflarse ----
    const NU = 128, NV = 14, cuff = new THREE.Group(); arm.add(cuff);
    const mkGrid = (outer) => { const g = new THREE.BufferGeometry(), pos = new Float32Array((NU + 1) * (NV + 1) * 3), uv = new Float32Array((NU + 1) * (NV + 1) * 2), idx = [];
      for (let a = 0; a <= NU; a++) for (let b = 0; b <= NV; b++) { const q = a * (NV + 1) + b; uv[q * 2] = a / NU; uv[q * 2 + 1] = b / NV; if (a < NU && b < NV) { const r = q + NV + 1; outer ? idx.push(q, r, q + 1, r, r + 1, q + 1) : idx.push(q, q + 1, r, r, q + 1, r + 1); } }
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g; };
    const outerG = mkGrid(true), innerG = mkGrid(false);
    const fabric = new THREE.MeshPhysicalMaterial({ map: cuffTexture(), roughness: .82, sheen: 1, sheenColor: new THREE.Color('#6d7fa6'), sheenRoughness: .6 });
    const innerMat = new THREE.MeshPhysicalMaterial({ color: '#141d30', roughness: .9, side: THREE.DoubleSide }); const outer = new THREE.Mesh(outerG, fabric), inner = new THREE.Mesh(innerG, innerMat);
    outer.castShadow = true; cuff.add(outer, inner);
    const bindMat = new THREE.MeshPhysicalMaterial({ color: '#121a2b', roughness: .7, sheen: .8, sheenColor: new THREE.Color('#44527a') });
    const binds = [-1, 1].map((s) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), bindMat); m.userData.s = s; m.castShadow = true; cuff.add(m); return m; });
    const pnt = (th, h, off, out) => { const r = profAt(th) + off; return out.copy(c0).addScaledVector(ax, h).addScaledVector(e1, Math.cos(th) * r).addScaledVector(e2, Math.sin(th) * r); };
    const tmp = V(0, 0, 0);
    let lastInf = -1, lastLoose = -1, lastSmall = null;
    const shapeCuff = (inf, loose, small) => {
      if (Math.abs(inf - lastInf) < .002 && Math.abs(loose - lastLoose) < .002 && small === lastSmall) return; lastInf = inf; lastLoose = loose; lastSmall = small;
      const w = small ? W * .62 : W;
      for (const [g, isOut] of [[outerG, true], [innerG, false]]) { const p = g.attributes.position.array; let k = 0;
        for (let a = 0; a <= NU; a++) { const th = a / NU * Math.PI * 2; for (let b = 0; b <= NV; b++) { const v = b / NV, h = (v - .5) * w, bul = Math.sin(Math.PI * v) ** .7;
          const off = (isOut ? TH + inf * (5 * SC) * bul + .6 * SC : 1.6 * SC) + loose; pnt(th, h, off, tmp); p[k++] = tmp.x; p[k++] = tmp.y; p[k++] = tmp.z; } }
        g.attributes.position.needsUpdate = true; g.computeVertexNormals(); }
      for (const m of binds) { const pts = []; for (let a = 0; a < 96; a++) pts.push(pnt(a / 96 * Math.PI * 2, m.userData.s * w / 2, TH * .55 + loose + inf * 1.5 * SC, V(0, 0, 0)));
        m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, TH * .62, 8, true); }
    };
    shapeCuff(0, 0, false);
    // ---- manga de camisa ajustada al brazo real: tapa el corte del modelo en el hombro ----
    // ---- arteria braquial → radial, construida sobre los huesos reales ----
    const hp = []; const pushC = (geo, zmm, dx, dz) => { const s = slab(geo, Y(zmm - 8), Y(zmm + 8)); hp.push(s.add(V(dx * SC, 0, dz * SC))); };
    for (let z = 1245; z >= 1075; z -= 17) pushC(A.geo.humerus, z, 15, 9);
    { const el = slab(A.geo.humerus, Y(1040), Y(1060)).lerp(slab(A.geo.radius, Y(1010), Y(1030)), .5); hp.push(el.add(V(4 * SC, 0, 20 * SC))); }
    for (let z = 995; z >= 840; z -= 22) pushC(A.geo.radius, z, -2, 9);
    const path = new THREE.CatmullRomCurve3(hp); const NS = 200, NR = 14, R0 = 3.6 * SC;
    const fr = path.computeFrenetFrames(NS, false); const ctr = [], nrm = [], bin = []; for (let i = 0; i <= NS; i++) { ctr.push(path.getPointAt(i / NS)); nrm.push(fr.normals[i]); bin.push(fr.binormals[i]); }
    const aG = new THREE.BufferGeometry(), apos = new Float32Array((NS + 1) * NR * 3), anrm = new Float32Array((NS + 1) * NR * 3), aidx = [];
    for (let i = 0; i <= NS; i++) for (let j = 0; j < NR; j++) { const q = i * NR + j, a = j / NR * Math.PI * 2; const d = nrm[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(bin[i], Math.sin(a)); anrm.set([d.x, d.y, d.z], q * 3); if (i < NS) { const r = q + NR, q1 = i * NR + (j + 1) % NR, r1 = q1 + NR; aidx.push(q, r, q1, r, r1, q1); } }
    aG.setAttribute('position', new THREE.BufferAttribute(apos, 3)); aG.setAttribute('normal', new THREE.BufferAttribute(anrm, 3)); aG.setIndex(aidx);
    const artery = new THREE.Mesh(aG, realMat('artery', { color: '#b3202f', emissive: '#5a0710', emissiveIntensity: .25 })); arm.add(artery);
    // tramo bajo el brazalete
    const hOf = (p) => tmp.copy(p).sub(c0).dot(ax); let u0 = 1, u1 = 0; ctr.forEach((p, i) => { if (Math.abs(hOf(p)) < W / 2) { u0 = Math.min(u0, i); u1 = Math.max(u1, i); } });
    const rad = new Float32Array(NS + 1).fill(1);
    const shapeArtery = () => { for (let i = 0; i <= NS; i++) { const r = R0 * rad[i]; for (let j = 0; j < NR; j++) { const q = (i * NR + j) * 3; apos[q] = ctr[i].x + anrm[q] * r; apos[q + 1] = ctr[i].y + anrm[q + 1] * r; apos[q + 2] = ctr[i].z + anrm[q + 2] * r; } } aG.attributes.position.needsUpdate = true; aG.computeBoundingSphere(); };
    shapeArtery();
    // glóbulos rojos que viajan por la arteria
    const NP = 90, cells = new THREE.InstancedMesh(new THREE.SphereGeometry(1.3 * SC, 8, 6), new THREE.MeshStandardMaterial({ color: '#ff4a5a', emissive: '#a3101f', emissiveIntensity: .7, roughness: .4 }), NP); arm.add(cells);
    const pu = Float32Array.from({ length: NP }, () => Math.random() * NS), pj = Float32Array.from({ length: NP * 2 }, () => Math.random() * 2 - 1); const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), S1 = V(1, 1, 1), S0 = V(0, 0, 0);
    // ---- manómetro aneroide ----
    const gauge = new THREE.Group(); scene.add(gauge); gauge.position.set(-1.9, 1.05, 1.55); gauge.rotation.set(-.3, .35, 0);
    const GR = .62;
    const caseM = new THREE.Mesh(new THREE.CylinderGeometry(GR * 1.04, GR * 1.04, .2, 64), realMat('plasticDark', { color: '#2b3038' })); caseM.rotation.x = Math.PI / 2; caseM.position.z = -.1; caseM.castShadow = true; gauge.add(caseM);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(GR * 1.02, .05, 16, 72), realMat('metal', { color: '#9aa2ab', roughness: .38 })); gauge.add(bezel);
    const face = new THREE.Mesh(new THREE.CircleGeometry(GR * .98, 72), new THREE.MeshStandardMaterial({ map: gaugeTexture(), color: '#c9cdd2', roughness: .85 })); face.position.z = .005; gauge.add(face);
    const needle = new THREE.Group(); needle.position.z = .03; gauge.add(needle);
    { const nm = new THREE.MeshStandardMaterial({ color: '#0f1216', roughness: .4, metalness: .3 }); const n1 = new THREE.Mesh(new THREE.BoxGeometry(.018, GR * .86, .01), nm); n1.position.y = GR * .36; needle.add(n1); const n2 = new THREE.Mesh(new THREE.BoxGeometry(.03, GR * .2, .01), nm); n2.position.y = -GR * .08; needle.add(n2);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .03, 24), realMat('metal', { color: '#2a2e33' })); hub.rotation.x = Math.PI / 2; needle.add(hub); }
    const glass = new THREE.Mesh(new THREE.CircleGeometry(GR * .99, 64), new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: .08, metalness: 0, transparent: true, opacity: .1, depthWrite: false })); glass.position.z = .06; gauge.add(glass);
    const nipple = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, .22, 16), realMat('metal', { color: '#b9bfc6' })); nipple.position.set(0, -GR * 1.1, -.1); gauge.add(nipple);
    // ---- pera con válvula ----
    const bulb = new THREE.Group(); scene.add(bulb); bulb.position.set(-.5, .3, 2.05); bulb.rotation.set(0, -.5, Math.PI / 2 - .12);
    const bulbM = new THREE.Mesh(new THREE.SphereGeometry(.3, 40, 24), realMat('rubber', { color: '#202328', roughness: .55, clearcoat: .4 })); bulbM.scale.set(1, 1.5, 1); bulbM.castShadow = true; bulb.add(bulbM);
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .28, 24), realMat('metal', { color: '#c9ced4', roughness: .25 })); valve.position.y = .56; bulb.add(valve);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .07, 20), realMat('metal', { color: '#9aa1a9', roughness: .35 })); screw.position.y = .6; screw.rotation.z = Math.PI / 2; bulb.add(screw);
    const intake = new THREE.Mesh(new THREE.CylinderGeometry(.05, .06, .14, 16), realMat('metal', { color: '#c9ced4' })); intake.position.y = -.5; bulb.add(intake);
    // ---- tubos de goma desde el brazalete ----
    arm.updateMatrixWorld(true);
    const upTh = (() => { let best = 0, by = -1e9; for (let a = 0; a < 64; a++) { const th = a / 64 * Math.PI * 2; const p = arm.localToWorld(pnt(th, 0, 0, V(0, 0, 0))); if (p.y > by) { by = p.y; best = th; } } return best; })();
    const exitW = (h, dth) => arm.localToWorld(pnt(upTh + dth, h, TH + 2 * SC, V(0, 0, 0)));
    const tubeMat = realMat('rubber', { color: '#2a2f36', roughness: .5, clearcoat: .3 });
    const mkTube = (pts, r = .042) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, r, 10), tubeMat); m.castShadow = true; scene.add(m); return m; };
    const eA = exitW(-W * .15, .25), eB = exitW(W * .1, .3);
    const tubeA = { pts: [eA, eA.clone().add(V(-.1, .45, .3)), V(-1.6, .6, 1.25), nipple.getWorldPosition(V(0, 0, 0))], n: 2, r: .042 }; tubeA.m = mkTube(tubeA.pts);
    const vtip = valve.getWorldPosition(V(0, 0, 0)).add(V(-.18, .05, 0));
    const tubeB = { pts: [eB, eB.clone().add(V(.1, .3, .45)), V(-.35, .38, 1.75), vtip], n: 2, r: .042 }; tubeB.m = mkTube(tubeB.pts);
    // ---- estetoscopio sobre la fosa del codo ----
    const fossa = arm.localToWorld(hp[Math.floor(hp.length * .55)].clone());
    let top = null; { let bd = 1e9; for (let i = 0; i < sp.count; i += 2) { const w = arm.localToWorld(tv.fromBufferAttribute(sp, i).clone()); const d = (w.x - fossa.x) ** 2 + (w.z - fossa.z) ** 2 - w.y * .004; if (d < bd && w.y > fossa.y) { bd = d; top = w; } } }
    const steth = new THREE.Group(); scene.add(steth); steth.position.copy(top).add(V(0, .045, 0));
    const chrome = realMat('metal', { color: '#b8bec6', roughness: .28 });
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(.25, .27, .09, 48), chrome); rim.castShadow = true; steth.add(rim);
    const diaph = new THREE.Mesh(new THREE.CircleGeometry(.235, 48), realMat('plastic', { color: '#eef1f4', roughness: .35 })); diaph.rotation.x = Math.PI / 2; diaph.position.y = -.046; steth.add(diaph);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .05, .26, 16), chrome); stem.position.set(.12, .14, 0); stem.rotation.z = -1.0; steth.add(stem);
    const sTip = stem.getWorldPosition(V(0, 0, 0)).add(V(.14, .08, 0)), tubeS = { n: 2, r: .05 };
    { const rest = V(sTip.x + 1.2, .07, sTip.z + 1.5); tubeS.pts = [sTip, sTip.clone().add(V(.3, .45, .35)), sTip.clone().add(V(.8, .3, .9)), rest]; tubeS.m = mkTube(tubeS.pts, .05);
      // yugo y olivas del estetoscopio apoyados sobre la cama
      for (const sgn of [-1, 1]) { const end = rest.clone().add(V(.9, .05, sgn * .35)); const bin = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([rest, rest.clone().add(V(.35, .12, sgn * .1)), end]), 30, .022, 8), chrome); bin.castShadow = true; scene.add(bin);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(.05, 16, 12), realMat('rubber', { color: '#1d2228' })); tip.position.copy(end); scene.add(tip); } }
    // ---- etiquetas ----
    const cuffTop = arm.localToWorld(pnt(upTh, 0, TH * 2, V(0, 0, 0)));
    c.label({ es: 'Brazalete', en: 'Cuff' }, { es: 'bolsa de aire', en: 'air bladder' }, cuffTop, '#8fb0ff'); // 0
    c.label({ es: 'Manómetro', en: 'Gauge' }, 'mmHg', gauge, '#e8edf3'); // 1
    c.label({ es: 'Pera', en: 'Bulb' }, { es: 'con válvula', en: 'with valve' }, bulb, '#c7ced6'); // 2
    c.label({ es: 'Estetoscopio', en: 'Stethoscope' }, { es: 'sobre la arteria', en: 'over the artery' }, steth, '#e8edf3'); // 3
    const artMid = new THREE.Object3D(); artMid.position.copy(ctr[Math.floor(u1 * 1.04)] || ctr[NS >> 1]); arm.add(artMid);
    c.label({ es: 'Arteria braquial', en: 'Brachial artery' }, null, artMid, '#ff5a6e'); // 4
    c.label({ es: 'Válvula', en: 'Valve' }, null, screw, '#c7ced6'); // 5
    const crease = new THREE.Object3D(); crease.position.copy(steth.position); scene.add(crease); c.label({ es: 'Pliegue del codo', en: 'Elbow crease' }, { es: '2–3 cm abajo del brazalete', en: '2–3 cm below the cuff' }, crease, '#ffd08a'); // 6
    const radial = new THREE.Object3D(); radial.position.copy(ctr[NS - 6]); arm.add(radial); c.label({ es: 'Pulso radial', en: 'Radial pulse' }, null, radial, '#ff8a9a'); // 7
    // cámaras calculadas sobre la anatomía real: tramo de arteria bajo el borde distal del brazalete
    { const tg = arm.localToWorld(ctr[Math.min(NS, u1 + 4)].clone()); chapters[3].cam = { pos: tg.clone().add(V(.6, 1.3, 3.1)).toArray(), target: tg.clone().add(V(-.45, -.1, 0)).toArray() };
      chapters[1].cam = { pos: tg.clone().add(V(.4, 2.2, 4.6)).toArray(), target: tg.clone().add(V(-.7, 0, 0)).toArray() }; }
    // ---- apoyo: cuña bajo el brazo a la altura del corazón (técnica correcta en decúbito). En el error «brazo bajo» la cuña se retira y el brazo baja ----
    const TH0 = .085, RIG = { th: 0 };
    { const cenG = (geo) => { geo.computeBoundingBox(); return geo.boundingBox.getCenter(V(0, 0, 0)); };
      const aL2 = cenG(A.geo.hand).sub(cenG(A.geo.humerus)).normalize(), hc = cenG(A.geo.humerus), hpp = A.geo.humerus.attributes.position, SL = V(0, 0, 0); let tmin = 1e9;
      for (let i = 0; i < hpp.count; i++) { tv.fromBufferAttribute(hpp, i); const t = tv.clone().sub(hc).dot(aL2); if (t < tmin) { tmin = t; SL.copy(tv); } }
      arm.updateMatrixWorld(true); const SW = arm.localToWorld(SL.clone()), kL = V(0, 0, 1).applyQuaternion(arm.quaternion.clone().invert()).normalize(), zW = V(0, 0, 1);
      // piel: solo el brazo (cerca de su eje), con transición suave en el hombro
      const skG = skinReal.geometry, bsp = skG.attributes.position, base = Float32Array.from(bsp.array), idxW = [], wts = [];
      for (let i = 0; i < bsp.count; i++) { tv.fromBufferAttribute(bsp, i).sub(SL); const t = tv.dot(aL2); if (t < -.4) continue; const d = tv.addScaledVector(aL2, -t).length(); const w = smooth(-.3, .9, t) * (1 - smooth(.8, 1.02, d)); if (w > 0) { idxW.push(i); wts.push(w); } }
      // huesos, músculos, brazalete, arteria y glóbulos giran juntos alrededor del hombro
      const piv = new THREE.Group(); piv.position.copy(SL); const inner = new THREE.Group(); inner.position.copy(SL).negate(); piv.add(inner);
      for (const o of arm.children.slice()) if (o !== skin && !o.userData.static) inner.add(o); arm.add(piv);
      // objetos del mundo que acompañan al brazo
      const rigW = [steth, crease].map((o) => ({ o, p: o.position.clone(), q: o.quaternion.clone() })), tubes = [tubeA, tubeB, tubeS].map((T2) => ({ ...T2, base: T2.pts.map((q) => q.clone()) }));
      // cuña de espuma con funda
      let zA = 1e9, zB = -1e9; for (let k = 0; k < idxW.length; k += 3) { if (wts[k] < .95) continue; const w = arm.localToWorld(tv.fromBufferAttribute(bsp, idxW[k]).clone()); if (w.x < SW.x + 1.2 || w.x > SW.x + 6.6) continue; zA = Math.min(zA, w.z); zB = Math.max(zB, w.z); }
      const cz0 = (zA + zB) / 2, wdW = Math.max(1, zB - zA - .1), under = (x, th) => { const dx = x - SW.x, dy = -.02 - SW.y; return SW.y + dx * Math.sin(th) + dy * Math.cos(th); };
      const x0 = SW.x + 1.1, x1 = SW.x + 6.8;
      const wedge = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshPhysicalMaterial({ color: '#7590a8', roughness: .7, sheen: .3, sheenColor: new THREE.Color('#c9d8e5'), clearcoat: .2, clearcoatRoughness: .5 })); wedge.position.z = cz0; wedge.castShadow = wedge.receiveShadow = true; scene.add(wedge);
      const wAnchor = new THREE.Object3D(); wAnchor.position.set(x1 - .8, .25, zB + .1); scene.add(wAnchor);
      c.label({ es: 'Cuña de apoyo', en: 'Arm wedge' }, { es: 'brazo a la altura del corazón', en: 'arm at heart level' }, wAnchor, '#c7ced6'); // 8
      const q = new THREE.Quaternion(), qW = new THREE.Quaternion(), v = V(0, 0, 0);
      RIG.apply = () => { const th = RIG.th; piv.quaternion.setFromAxisAngle(kL, th);
        const a = bsp.array; for (let k = 0; k < idxW.length; k++) { const i = idxW[k]; q.setFromAxisAngle(kL, th * wts[k]); v.set(base[i * 3] - SL.x, base[i * 3 + 1] - SL.y, base[i * 3 + 2] - SL.z).applyQuaternion(q); a[i * 3] = v.x + SL.x; a[i * 3 + 1] = v.y + SL.y; a[i * 3 + 2] = v.z + SL.z; }
        bsp.needsUpdate = true; skG.computeVertexNormals();
        qW.setFromAxisAngle(zW, th); for (const r of rigW) { r.o.position.copy(r.p).sub(SW).applyQuaternion(qW).add(SW); r.o.quaternion.copy(qW).multiply(r.q); }
        for (const T2 of tubes) { const pts = T2.base.map((b, j) => (j < T2.n ? b.clone().sub(SW).applyQuaternion(qW).add(SW) : b)); T2.m.geometry.dispose(); T2.m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, T2.r, 10); }
        wedge.scale.y = Math.max(.001, Math.sin(th) / Math.sin(TH0)); wedge.visible = th > .004; };
      RIG.th = TH0; RIG.apply();
      // la cara superior de la cuña sigue la parte de abajo real del brazo ya apoyado (se hunde 1 cm)
      { const NSx = 16, low = new Float32Array(NSx + 1).fill(1e9); arm.updateMatrixWorld(true);
        for (let k = 0; k < idxW.length; k++) { if (wts[k] < .9) continue; const w = arm.localToWorld(tv.fromBufferAttribute(bsp, idxW[k]).clone()); const f = (w.x - x0) / (x1 - x0); if (f < -.03 || f > 1.03) continue; const j = Math.round(clamp(f, 0, 1) * NSx); low[j] = Math.min(low[j], w.y); }
        for (let j = 0; j <= NSx; j++) if (low[j] > 1e8) low[j] = low[j - 1] ?? .1;
        const top = Array.from(low, (y, j) => new THREE.Vector2(x0 + (x1 - x0) * j / NSx, Math.max(.08, Math.min(...[low[j - 1], y, low[j + 1]].filter((u) => u !== undefined)) - .2)));
        const sh = new THREE.Shape([new THREE.Vector2(x0, 0), new THREE.Vector2(x1, 0), ...top.reverse()]);
        const wg = new THREE.ExtrudeGeometry(sh, { depth: Math.max(.4, wdW - .36), bevelEnabled: true, bevelSize: .18, bevelThickness: .18, bevelSegments: 8, steps: 1, curveSegments: 4 }); wg.translate(0, 0, -Math.max(.4, wdW - .36) / 2); wg.computeVertexNormals(); wedge.geometry.dispose(); wedge.geometry = wg; } }
    const cuffMats = [fabric, innerMat, bindMat];
    // ---- monitor lateral ----
    const mon = c.side({ es: 'Presión del brazalete y arterial', en: 'Cuff and arterial pressure' }, 120);
    const g = mon.ctx, MW = mon.canvas.width, MH = mon.canvas.height; const bufA = new Float32Array(MW).fill(NaN), bufC = new Float32Array(MW).fill(NaN), tick = new Uint8Array(MW); let wx = 0, acc = 0;
    const yOf = (p) => MH - 12 - p / 200 * (MH - 24);
    // ---- automático oscilométrico ----
    function startAuto(cc) { S.auto = { st: 'inflate', target: Math.max(165, eff().sbp + 30), t: 0, steps: [], res: null }; S.P = Math.max(S.P, 0); cc.toast(lang === 'en' ? 'Inflating…' : 'Inflando…'); }
    const oscAmp = (P) => { const e = eff(), map = e.dbp + (e.sbp - e.dbp) / 3, sa = (e.sbp - map) / Math.sqrt(Math.log(2)), sb = (map - e.dbp) / Math.sqrt(Math.log(1 / .8)); return 3.2 * Math.exp(-(((P - map) / (P > map ? sa : sb)) ** 2)); };
    // ---- bucle ----
    let pumpSq = 0;
    c.onFrame((dt, rdt) => {
      const ci = c.chapter(), e = eff(), hr = pat().hr, RR = 60 / hr, er = ERRORS[S.err];
      // presión del brazalete
      if (S.manual != null && ci === 3) S.P += (S.manual - S.P) * (1 - Math.exp(-rdt * 4));
      else if (S.auto) { const A2 = S.auto; A2.t += dt;
        if (A2.st === 'inflate') { S.P += 55 * dt; if (S.P >= A2.target) { A2.st = 'step'; A2.t = 0; A2.osc = 0; } }
        else if (A2.st === 'step') { if (A2.t > RR * 2.2) { A2.steps.push({ P: S.P, a: A2.osc }); A2.osc = 0; A2.t = 0; S.P -= 8; if (S.P < Math.min(45, e.dbp - 18)) { A2.st = 'done'; const best = A2.steps.reduce((m, s) => (s.a > m.a ? s : m)); const mx = best.a, at = (r, above) => { const arr = above ? A2.steps.filter((s) => s.P >= best.P) : A2.steps.filter((s) => s.P <= best.P); let pick = arr[above ? 0 : arr.length - 1]; for (let i = 0; i < arr.length - 1; i++) { const a = arr[i], b = arr[i + 1]; if ((a.a - r * mx) * (b.a - r * mx) <= 0) { const k = (r * mx - a.a) / ((b.a - a.a) || 1); pick = { P: lerp(a.P, b.P, k) }; break; } } return pick.P; };
          A2.res = { map: best.P, sbp: at(.5, true), dbp: at(.8, false) }; c.toast(`${Math.round(A2.res.sbp)}/${Math.round(A2.res.dbp)} mmHg · ${lang === 'en' ? 'MAP' : 'PAM'} ${Math.round(A2.res.map)}`, 4000); } } }
        else S.P = Math.max(0, S.P - 40 * dt); }
      else if (S.inflating) { S.pump += rdt * 2.4; const sq = Math.max(0, Math.sin(S.pump * Math.PI * 2)); pumpSq = sq; S.P = Math.min(300, S.P + 120 * sq * rdt); S.max = Math.max(S.max, S.P); S.dump = false; }
      else { pumpSq *= .85; const rate = S.dump ? 45 : (ci === 2 || ci === 5) ? er.rate : 30; S.P = Math.max(0, S.P - rate * dt * (S.P > 0 ? 1 : 0)); if (S.P <= 0) S.dump = false; }
      if (ci !== 2 && ci !== 5 && ci !== 3 && !S.auto) S.P = Math.max(0, S.P - 30 * dt);
      // latido y presión arterial
      S.ph += dt; let newBeat = false; if (S.ph >= RR) { S.ph -= RR; newBeat = true; }
      const p = S.ph / RR, pa = e.dbp + (e.sbp - e.dbp) * wave(p);
      // estado de la arteria bajo el brazalete
      const open = clamp((pa - S.P) / 14, 0, 1), meanOpen = clamp((e.dbp + (e.sbp - e.dbp) * .35 - S.P) / 14, 0, 1);
      const turb = S.P > e.dbp && S.P < e.sbp;
      for (let i = 0; i <= NS; i++) { const under = i >= u0 && i <= u1; const edge = under ? Math.min(1, Math.min(i - u0, u1 - i) / 8) : 0; let s = 1 + .08 * (pa - 90) / 40;
        if (under) s = lerp(s, .12 + .88 * open, edge); else if (i > u1) s *= S.P > e.sbp ? .82 : 1; rad[i] = s; }
      shapeArtery();
      // glóbulos rojos
      const flow = S.P >= e.sbp ? 0 : S.P <= e.dbp ? 1 : open;
      for (let k = 0; k < NP; k++) { const before = pu[k] < u0; const v = (before ? (S.P >= e.sbp ? .15 : .6 + .9 * wave(p)) : (.2 + 1.6 * wave(p)) * flow) * 55 * dt; pu[k] += v;
        if (S.P >= e.sbp && pu[k] >= u0 - 2 && before) pu[k] = Math.max(0, u0 - 2 - Math.random() * 6);
        if (pu[k] >= NS) pu[k] = Math.random() * 10;
        const i = clamp(Math.floor(pu[k]), 0, NS), cc = ctr[i]; const jet = turb && pu[k] > u1 && pu[k] < u1 + 25 ? 1.8 : .5;
        tmp.copy(cc).addScaledVector(nrm[i], pj[k * 2] * R0 * .55 * rad[i] * jet).addScaledVector(bin[i], pj[k * 2 + 1] * R0 * .55 * rad[i] * jet);
        if (turb && pu[k] > u1 && pu[k] < u1 + 25) { pj[k * 2] = clamp(pj[k * 2] + (Math.random() - .5) * .5, -1, 1); pj[k * 2 + 1] = clamp(pj[k * 2 + 1] + (Math.random() - .5) * .5, -1, 1); }
        const hide = flow === 0 && pu[k] >= u0 - 1; M4.compose(tmp, Q0, hide ? S0 : S1); cells.setMatrixAt(k, M4); }
      cells.instanceMatrix.needsUpdate = true; cells.visible = xray.k > .4; artery.visible = xray.k > .05;
      // Korotkoff: en el pico sistólico de cada latido
      if (!S.beat && p > .17) { S.beat = true;
        const heard = S.P < e.sbp && S.P > e.dbp && S.P > 0;
        if (heard) { const k = (e.sbp - S.P) / (e.sbp - e.dbp); const ph4 = k > .8, ph2 = k > .14 && k < .4;
          c.sound.thump(ph4 ? 48 : 64, ph4 ? .09 : .06, ph4 ? .14 : .26); if (ph2) c.sound.breath(.14, .045, 520);
          tick[wx] = 1;
          if ((ci === 2 || ci === 5) && !S.inflating && S.P < S.max - 4) { if (!S.found.sbp && S.P > S.max - 8) { S.found.sbp = -1; c.toast(lang === 'en' ? 'Not inflated enough: the taps start right away. Deflate and pump higher.' : 'Inflaste poco: los golpes empiezan de inmediato. Vacía y sube más la presión.', 3800); } else if (!S.found.sbp) { S.found.sbp = S.P; c.toast((lang === 'en' ? 'First tap: ' : 'Primer golpe: ') + Math.round(S.P) + ' mmHg ' + (lang === 'en' ? '(systolic)' : '(sistólica)'), 2600); } S.found.last = S.P; S.found.silent = 0; } }
        else if ((ci === 2 || ci === 5) && S.found.sbp > 0 && !S.found.dbp && !S.inflating) { S.found.silent++; if (S.found.silent >= 2) { S.found.dbp = S.found.last; const r = `${Math.round(S.found.sbp)}/${Math.round(S.found.dbp)}`; c.toast((lang === 'en' ? 'Sounds gone: ' : 'Desaparecen los ruidos: ') + Math.round(S.found.dbp) + ' mmHg · ' + r + (S.err !== 'ok' ? (lang === 'en' ? ` (true ${pat().sbp}/${pat().dbp})` : ` (real ${pat().sbp}/${pat().dbp})`) : ''), 4200); } }
      }
      if (p < .1) S.beat = false;
      // oscilaciones transmitidas al brazalete (aguja y monitor automático)
      const osc = S.P > 8 ? oscAmp(S.P) * (wave(p) - .35) : 0;
      if (S.auto?.st === 'step') S.auto.osc = Math.max(S.auto.osc, oscAmp(S.P));
      const shown = clamp(S.P + osc, 0, 300);
      needle.rotation.z = -(-135 + shown / 300 * 270) * Math.PI / 180;
      // pera
      bulbM.scale.set(1 - .18 * pumpSq, 1.5 - .12 * pumpSq, 1 - .18 * pumpSq); screw.rotation.x = (S.inflating ? 0 : S.dump ? 2.5 : 1.0);
      // brazalete translúcido en rayos X para ver la arteria
      { const f = 1 - .78 * xray.k, tr = f < .99; for (const m of cuffMats) { if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } m.opacity = f; m.depthWrite = !tr; } }
      // brazalete: inflado y colocación
      if (S.place < 1) S.place = Math.min(1, S.place + rdt / 2.6);
      const pl = smooth(0, 1, S.place);
      cuff.position.copy(ax).multiplyScalar((1 - pl) * -1.6 * (1 - smooth(.6, 1, S.place)));
      shapeCuff(clamp(S.P / 160, 0, 1.3), (1 - smooth(.55, 1, S.place)) * 14 * SC, er.small && ci === 5);
      // brazo colgando (error): bajar el brazo por debajo del corazón
      const low = er.low && ci === 5 ? 1 : 0; arm.userData.low = lerp(arm.userData.low ?? 0, low, 1 - Math.exp(-rdt * 3));
      arm.position.y = -bb.min.y - .02;
      { const tg = er.low && ci === 5 ? 0 : TH0; if (RIG.th !== tg) { RIG.th += (tg - RIG.th) * (1 - Math.exp(-rdt * 2.5)); if (Math.abs(RIG.th - tg) < 3e-4) RIG.th = tg; RIG.apply(); } }
      // monitor
      acc += dt * 70; while (acc >= 1) { acc -= 1; wx = (wx + 1) % MW; bufA[wx] = pa; bufC[wx] = S.P; tick[wx] = tick[wx] || 0; for (let k = 1; k < 14; k++) { const j = (wx + k) % MW; bufA[j] = bufC[j] = NaN; tick[j] = 0; } }
      g.clearRect(0, 0, MW, MH);
      g.font = '600 18px Manrope, sans-serif'; g.fillStyle = 'rgba(255,255,255,.35)'; g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      for (const v of [50, 100, 150]) { g.beginPath(); g.moveTo(0, yOf(v)); g.lineTo(MW, yOf(v)); g.stroke(); g.fillText(String(v), 4, yOf(v) - 4); }
      if (ci === 4 && S.auto?.steps?.length) { const st = S.auto.steps, mx = Math.max(...st.map((s) => s.a)) || 1;
        for (const s of st) { const x = MW - 40 - (200 - s.P) / 200 * (MW - 80); g.fillStyle = 'rgba(91,141,239,.85)'; const h = s.a / mx * (MH - 40); g.fillRect(MW - x - 8, MH - 12 - h, 14, h); }
        g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText(lang === 'en' ? 'oscillation per step (high → low pressure)' : 'oscilación por escalón (presión alta → baja)', 70, 22);
        if (S.auto.res) { c.state.mR?.(Math.round(S.auto.res.map)); } }
      else {
        g.lineWidth = 2.5; g.strokeStyle = '#ff5a6e'; g.beginPath(); let pen = false; for (let i = 0; i < MW; i++) { const v = bufA[i]; if (Number.isNaN(v)) { pen = false; continue; } pen ? g.lineTo(i, yOf(v)) : g.moveTo(i, yOf(v)); pen = true; } g.stroke();
        g.strokeStyle = '#e8edf3'; g.beginPath(); pen = false; for (let i = 0; i < MW; i++) { const v = bufC[i]; if (Number.isNaN(v)) { pen = false; continue; } pen ? g.lineTo(i, yOf(v)) : g.moveTo(i, yOf(v)); pen = true; } g.stroke();
        g.fillStyle = '#ffd166'; for (let i = 0; i < MW; i++) if (tick[i]) g.fillRect(i - 2, 6, 4, 14);
      }
      mon.right.textContent = turb && S.P > 0 ? (lang === 'en' ? 'tap ♪' : 'golpe ♪') : S.P >= e.sbp ? (lang === 'en' ? 'artery shut' : 'arteria cerrada') : (lang === 'en' ? 'open' : 'abierta');
      c.state.mP?.(Math.round(shown));
      if (ci === 2 || ci === 5) c.state.mR?.(S.found.sbp < 0 ? '?' : S.found.dbp ? `${Math.round(S.found.sbp)}/${Math.round(S.found.dbp)}` : S.found.sbp ? `${Math.round(S.found.sbp)}/…` : '--');
    });
  }
});
