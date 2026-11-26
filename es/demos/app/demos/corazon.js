// Demo: El corazón eléctrico / The electric heart — modelo anatómico real (BodyParts3D)
import { createDemo, THREE, holoMesh, pulseMat, glowMat, pointsMat, gridFloor, sweepTrace, loadPack, xray, BP3D_CREDIT, clamp, smooth, lang } from '../core.js';

const C = { vent: '#ff5a6e', elec: '#ffe66d', pulm: '#6f8bff', aorta: '#ff3b5c' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const g = (x, m, s, a) => a * Math.exp(-(((x - m) / s) ** 2));
const bump = (x, a, b) => smooth(a, (a + b) / 2, x) * (1 - smooth((a + b) / 2, b, x));
const S = { rhythm: 'sinus', hr: 72, target: 72, rr: 60 / 72, ph: 0, exercising: false, flash: 0 };

function ecgAt(ph, q, rhythm, time) {
  if (rhythm === 'vf') return .55 * Math.sin(time * 15.7) * (.6 + .4 * Math.sin(time * 1.7)) + .3 * Math.sin(time * 27 + 1) + .08 * (Math.random() - .5);
  let v = 0;
  if (rhythm === 'sinus') v += g(ph, .06, .025, .15); else v += .05 * Math.sin(time * 37) + .035 * Math.sin(time * 53 + 2);
  v += g(ph, .185, .01, -.12) + g(ph, .2, .012, 1) + g(ph, .215, .012, -.25) + g(ph, .22 + .25 * q, .05 * q, .3);
  return v + .01 * (Math.random() - .5);
}

const chapters = [
  { title: { es: 'Conoce el corazón', en: 'Meet the heart' }, cam: { pos: [1.6, 1.0, 8.6], target: [0, .2, 0] }, labels: [0, 1, 2, 3, 4, 9], xray: false,
    lines: [
      { es: 'Este es un corazón humano real, reconstruido a partir de imágenes médicas. Gíralo con el dedo o el ratón.', en: 'This is a real human heart, rebuilt from medical images. Spin it with your finger or mouse.' },
      { es: 'Arriba, dos aurículas reciben la sangre. Abajo, dos ventrículos la empujan. Por fuera corren las arterias coronarias.', en: 'At the top, two atria take blood in. Below, two ventricles push it out. The coronary arteries run over the surface.' },
      { es: 'Cada latido lo dispara una señal eléctrica. Pulsa el botón de rayos X para verla por dentro.', en: 'Every beat is triggered by an electrical signal. Press the X-ray button to see it inside.' }
    ], enter: (c) => { c.controls.autoRotate = true; c.controls.autoRotateSpeed = .35; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'El marcapasos natural', en: 'The natural pacemaker' }, cam: { pos: [-2.6, 1.6, 3.2], target: [-.4, .5, 0] }, labels: [5], xray: true,
    lines: [
      { es: 'El nodo sinusal, en la aurícula derecha junto a la vena cava, genera un impulso por sí solo: 60 a 100 veces por minuto.', en: 'The sinus node, in the right atrium next to the vena cava, fires on its own: 60 to 100 times a minute.' },
      { es: 'La onda recorre las dos aurículas y las hace contraerse.', en: 'The wave sweeps across both atria and makes them squeeze.' },
      { es: 'En el electrocardiograma ese paso se ve como la onda P. Va en cámara lenta.', en: 'On the ECG that step shows up as the P wave. This is slow motion.' }
    ], enter: (c) => slow(c, true), exit: (c) => slow(c, false) },
  { title: { es: 'Una pausa necesaria', en: 'A necessary pause' }, cam: { pos: [-1.6, .6, 3.2], target: [0, .2, 0] }, labels: [6], xray: true,
    lines: [
      { es: 'El impulso llega al nodo auriculoventricular y espera cerca de una décima de segundo.', en: 'The impulse reaches the atrioventricular node and waits about a tenth of a second.' },
      { es: 'Esa pausa deja que las aurículas terminen de llenar los ventrículos.', en: 'That pause lets the atria finish filling the ventricles.' },
      { es: 'En el trazo es el tramo plano entre la onda P y el QRS: el intervalo PR.', en: 'On the trace it is the flat stretch between the P wave and QRS: the PR interval.' }
    ], enter: (c) => slow(c, true), exit: (c) => slow(c, false) },
  { title: { es: 'Los ventrículos se disparan', en: 'The ventricles fire' }, cam: { pos: [3.0, -.3, 6.0], target: [0, -.3, 0] }, labels: [7, 8], xray: true,
    lines: [
      { es: 'Por el haz de His y sus dos ramas, la señal baja por el tabique hasta la punta del corazón.', en: 'Down the bundle of His and its two branches, the signal runs along the septum to the tip of the heart.' },
      { es: 'Las fibras de Purkinje la reparten por las paredes en milisegundos.', en: 'The Purkinje fibres spread it through the walls in milliseconds.' },
      { es: 'Los ventrículos se contraen de la punta hacia arriba: es el complejo QRS.', en: 'The ventricles squeeze from the tip upwards: that is the QRS complex.' }
    ], enter: (c) => slow(c, true), exit: (c) => slow(c, false) },
  { title: { es: 'Recarga y ritmo', en: 'Recharge and rhythm' }, cam: { pos: [2.8, .9, 7.8], target: [0, .2, 0] }, labels: [2, 9], xray: false,
    lines: [
      { es: 'Las células se recargan para el siguiente latido: es la onda T.', en: 'The cells recharge for the next beat: that is the T wave.' },
      { es: 'Mantén presionado el botón para hacer ejercicio y mira subir la frecuencia.', en: 'Hold the button to exercise and watch the rate climb.' },
      { es: 'Al acelerar, el corazón acorta sobre todo el tiempo de llenado entre latidos.', en: 'When it speeds up, the heart mostly shortens the filling time between beats.' }
    ] },
  { title: { es: 'Cuando el ritmo falla', en: 'When the rhythm fails' }, cam: { pos: [2.6, .9, 7.4], target: [0, .2, 0] }, labels: [], xray: true,
    lines: [
      { es: 'En la fibrilación auricular las aurículas tiemblan sin orden y el pulso se vuelve irregular.', en: 'In atrial fibrillation the atria quiver chaotically and the pulse turns irregular.' },
      { es: 'En la fibrilación ventricular no hay bombeo útil: es un paro cardiaco y requiere desfibrilación inmediata.', en: 'In ventricular fibrillation there is no useful pumping: it is cardiac arrest and needs defibrillation at once.' },
      { es: 'Prueba cada ritmo. Es una simulación educativa: no sirve para diagnosticar.', en: 'Try each rhythm. This is an educational simulation, not a diagnostic tool.' }
    ], exit: () => { S.rhythm = 'sinus'; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [1.6, 1.0, 8.6], target: [0, .2, 0] }, labels: [], xray: false,
    lines: [{ es: 'Tres preguntas para cerrar. Puedes repetir el quiz las veces que quieras.', en: 'Three questions to finish. Retake the quiz as often as you like.' }],
    enter: (c) => setTimeout(() => c.chapter() === 6 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Dónde nace normalmente cada latido?', en: 'Where does each beat normally start?' }, o: [{ es: 'En el nodo sinusal', en: 'In the sinus node' }, { es: 'En la punta del ventrículo', en: 'At the tip of the ventricle' }, { es: 'En la aorta', en: 'In the aorta' }], a: 0,
    e: { es: 'El nodo sinusal, en la aurícula derecha, es el marcapasos natural.', en: 'The sinus node, in the right atrium, is the natural pacemaker.' } },
  { q: { es: '¿Qué representa el intervalo PR?', en: 'What does the PR interval show?' }, o: [{ es: 'La recarga de los ventrículos', en: 'The ventricles recharging' }, { es: 'El paso del impulso por aurículas y nodo AV', en: 'The impulse crossing the atria and AV node' }, { es: 'El cierre de la válvula aórtica', en: 'The aortic valve closing' }], a: 1,
    e: { es: 'Incluye la pausa del nodo AV que da tiempo al llenado ventricular.', en: 'It includes the AV-node pause that gives the ventricles time to fill.' } },
  { q: { es: 'En la fibrilación ventricular, ¿qué se necesita?', en: 'What does ventricular fibrillation need?' }, o: [{ es: 'Esperar a que pase', en: 'Wait for it to pass' }, { es: 'Desfibrilación y reanimación inmediatas', en: 'Immediate defibrillation and CPR' }, { es: 'Solo oxígeno', en: 'Oxygen only' }], a: 1,
    e: { es: 'Sin bombeo efectivo no llega sangre al cerebro: cada minuto cuenta.', en: 'Without effective pumping no blood reaches the brain: every minute counts.' } }
];
function slow(c, on) { c.timeScale = on ? .28 : 1; c.state.slowBtn?.setAttribute('aria-pressed', String(on)); }

let defibBtn;
createDemo({
  title: { es: 'El corazón eléctrico', en: 'The electric heart' }, accent: '#ff6b81', bg: '#07060a', bgTop: '#2a1c22', bgMid: '#120c10', fog: .035, floorY: -2.0,
  camera: chapters[0].cam, thumb: { pos: [1.2, .7, 6.4], target: [0, .2, 0], chapter: 0 }, bloom: { strength: .8, radius: .5, threshold: .3 }, credit: BP3D_CREDIT, sources: { es: 'Secuencia eléctrica cardiaca y ECG simplificados con fines didácticos.', en: 'Simplified cardiac electrical sequence and ECG for teaching.' }, chapters,
  action(ui, c, ci) {
    c.state.bpm = ui.metric({ es: 'latidos/min', en: 'beats/min' }, '♥');
    c.state.slowBtn = ui.button({ es: 'Cámara lenta', en: 'Slow motion' }, (v) => slow(c, v), { toggle: true, value: c.timeScale < 1 });
    if (ci === 5) {
      ui.seg([{ value: 'sinus', label: { es: 'Sinusal', en: 'Sinus' } }, { value: 'af', label: { es: 'Fib. auricular', en: 'Atrial fib.' } }, { value: 'vf', label: { es: 'Fib. ventricular', en: 'Ventricular fib.' } }], S.rhythm, (v) => {
        S.rhythm = v; defibBtn.hidden = v !== 'vf'; if (v === 'vf') c.toast(lang === 'en' ? 'Cardiac arrest: no effective pumping' : 'Paro cardiaco: no hay bombeo efectivo', 2600);
      });
      defibBtn = ui.button({ es: '⚡ Desfibrilar', en: '⚡ Defibrillate' }, () => { S.flash = 1; c.sound.noise(.35, .09, 400); setTimeout(() => { S.rhythm = 'sinus'; S.ph = 0; c.go(4); c.toast(lang === 'en' ? 'Shock delivered: sinus rhythm restored (simulation)' : 'Descarga aplicada: vuelve el ritmo sinusal (simulación)'); }, 450); });
      defibBtn.hidden = S.rhythm !== 'vf';
    } else if (ci === 6) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
    else ui.hold({ es: 'Mantén para hacer ejercicio', en: 'Hold to exercise' }, (v) => { S.exercising = v; });
  },
  async build(c) {
    const { scene } = c;
    scene.add(gridFloor('#ff4d6d', 40, -2.0));
    const box = [[-75, -215, 1150], [120, -30, 1365]];
    const P = await loadPack('heart', { center: [21.5, -121.9, 1237], scale: 1 / 45, crop: { aorta: [[-40, -200, 1150], [70, -40, 1360]], ivc: [[-60, -200, 1150], [40, -40, 1260]], pulmArtery: [[-30, -175, 1225], [88, -60, 1345]], pulmVeins: [[-25, -150, 1195], [80, -55, 1290]], svc: box } });
    const heart = new THREE.Group(); scene.add(heart);
    const G = P.geo;

    // Referencias anatómicas tomadas del propio modelo
    const wallPos = G.wall.attributes.position, nW = wallPos.count;
    const valvesCtr = G.valves.boundingSphere.center.clone();
    const apex = V(0, 0, 0); let best = -1e9; const tmp = V(0, 0, 0);
    // punta: hacia la izquierda del paciente (+x), abajo (−y) y adelante (+z)
    best = -1e9; for (let i = 0; i < nW; i++) { tmp.fromBufferAttribute(wallPos, i); const d = tmp.x * .55 - tmp.y * .65 + tmp.z * .5; if (d > best) { best = d; apex.copy(tmp); } }
    const axis = valvesCtr.clone().sub(apex); const L = axis.length(); axis.normalize();
    const e1 = V(1, 0, 0).sub(axis.clone().multiplyScalar(axis.x)).normalize(), e2 = axis.clone().cross(e1);
    // nodo sinusal: punto de la pared más cercano a la desembocadura de la cava superior
    const svcPos = G.svc.attributes.position; const sv = []; let low = 1e9;
    for (let i = 0; i < svcPos.count; i++) { tmp.fromBufferAttribute(svcPos, i); sv.push(tmp.clone()); low = Math.min(low, tmp.y); }
    const svLow = sv.filter((p) => p.y < low + .12); const svcEnd = svLow.reduce((a, p) => a.add(p), V(0, 0, 0)).divideScalar(Math.max(1, svLow.length));
    const SA = V(0, 0, 0); best = 1e9; for (let i = 0; i < nW; i++) { tmp.fromBufferAttribute(wallPos, i); const d = tmp.distanceToSquared(svcEnd); if (d < best) { best = d; SA.copy(tmp); } }
    // válvula tricúspide (lado derecho del paciente = −x) y nodo AV
    const vp = G.valves.attributes.position; const right = []; for (let i = 0; i < vp.count; i++) { tmp.fromBufferAttribute(vp, i); if (tmp.x < valvesCtr.x - .05) right.push(tmp.clone()); }
    const TV = right.reduce((a, p) => a.add(p), V(0, 0, 0)).divideScalar(Math.max(1, right.length));
    const AV = TV.clone().lerp(valvesCtr, .55).addScaledVector(axis, -.1).add(V(0, 0, -.08));
    const HIS = AV.clone().addScaledVector(axis, -.16 * L);
    const lv0 = V(1, 0, -.6); const lvDir = lv0.sub(axis.clone().multiplyScalar(axis.dot(lv0))).normalize();
    const nearApex = apex.clone().addScaledVector(axis, .1 * L);
    // radio de la pared por altura y ángulo (para fibras de Purkinje)
    const NB = 18, NH = 10, rmax = Array.from({ length: NH }, () => new Float32Array(NB));
    const hW = new Float32Array(nW);
    for (let i = 0; i < nW; i++) {
      tmp.fromBufferAttribute(wallPos, i).sub(apex); const ax = tmp.dot(axis); const h = ax / L; hW[i] = h;
      const rv = tmp.addScaledVector(axis, -ax); const r = rv.length(), phi = Math.atan2(rv.dot(e2), rv.dot(e1));
      const hb = Math.floor(h * NH), pb = Math.floor((phi / (2 * Math.PI) + .5) * NB) % NB;
      if (hb >= 0 && hb < NH && r > rmax[hb][pb]) rmax[hb][pb] = r;
    }

    // Mallas reales + holograma para rayos X
    const wall = holoMesh(G.wall, C.vent, { real: 'muscle', ghost: .07, opacity: .015, rim: .5, power: 2.6, scan: .04, intensity: .8, edges: false });
    heart.add(wall);
    const add = (geo, color, real, opts = {}, ghost = .08) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .02, rim: .5, intensity: .8, edges: false }); heart.add(m); return m; };
    add(G.coronary, C.aorta, 'artery', { color: '#b11d2d' }, .05);
    add(G.cardiacVeins, C.pulm, 'vein', { color: '#3d4596' }, .05);
    add(G.aorta, C.aorta, 'artery', { color: '#b8343f' });
    add(G.pulmArtery, C.pulm, 'vein', { color: '#3f52b3' });
    add(G.pulmVeins, C.aorta, 'artery', { color: '#a8323e' });
    add(G.svc, C.pulm, 'vein', { color: '#34408e' }); add(G.ivc, C.pulm, 'vein', { color: '#34408e' });
    add(G.valves, '#ffe3c4', 'cartilage', { color: '#d9c7ae' }, .12);

    // Sistema de conducción
    const elec = [], paths = [];
    const tube = (pts, r) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 10, false);
    const addPath = (pts, r, a, b) => { const m = pulseMat(C.elec, { base: .16 }); const mesh = new THREE.Mesh(tube(pts, r), m); heart.add(mesh); paths.push({ m, a, b }); elec.push(mesh); return mesh; };
    const mid = (a, b, k, off) => a.clone().lerp(b, k).add(off);
    addPath([SA, mid(SA, AV, .4, V(0, 0, .12)), mid(SA, AV, .75, V(0, 0, .08)), AV], .016, 0, .07);
    addPath([SA, mid(SA, AV, .5, V(.05, 0, -.1)), AV], .016, 0, .065);
    const LAc = valvesCtr.clone().add(V(.35, .35, -.45));
    addPath([SA, mid(SA, LAc, .5, V(0, .15, .05)), LAc], .016, 0, .08);
    addPath([AV, HIS], .024, .16, .18);
    for (const side of [1, -1]) addPath([HIS, HIS.clone().addScaledVector(axis, -.3 * L).addScaledVector(lvDir, .1 * L * side), nearApex.clone().addScaledVector(lvDir, .12 * L * side), nearApex], .018, .18, .215);
    for (let k = 0; k < NB; k++) {
      const pts = [nearApex.clone()];
      for (let hb = 1; hb < 7; hb++) { const phi = ((k + .5) / NB - .5) * 2 * Math.PI, r = (rmax[hb][k] || rmax[hb][(k + 1) % NB]) * .86, h = (hb + .5) / NH;
        pts.push(apex.clone().addScaledVector(axis, h * L).addScaledVector(e1, r * Math.cos(phi)).addScaledVector(e2, r * Math.sin(phi))); }
      addPath(pts, .009, .205 + (k % 3) * .004, .25);
    }
    const node = (p, r) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), glowMat(C.elec, .95)); m.position.copy(p); heart.add(m); elec.push(m); return m; };
    const saNode = node(SA, .07), avNode = node(AV, .055);
    const fibGeo = new THREE.BufferGeometry(), fibN = 70; fibGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(fibN * 3), 3));
    const fib = new THREE.Points(fibGeo, pointsMat(C.elec, .1, 1)); heart.add(fib); fib.visible = false;
    const atrialIdx = []; for (let i = 0; i < nW; i += 7) if (hW[i] > 1.02) atrialIdx.push(i);

    // cámaras de capítulos ajustadas a las referencias reales
    chapters[1].cam.target = SA.toArray(); chapters[1].cam.pos = SA.clone().add(V(-1.8, .9, 2.4)).toArray();
    chapters[2].cam.target = AV.toArray(); chapters[2].cam.pos = AV.clone().add(V(-1.4, .5, 2.6)).toArray();

    // Etiquetas
    const cen = (f) => { const acc = V(0, 0, 0); let n = 0; for (let i = 0; i < nW; i += 3) { tmp.fromBufferAttribute(wallPos, i); if (f(tmp, hW[i])) { acc.add(tmp); n++; } } return acc.divideScalar(Math.max(n, 1)); };
    const out = (p, k) => p.clone().add(p.clone().sub(valvesCtr).setY(0).normalize().multiplyScalar(k));
    const raPt = out(cen((p, h) => h > 1 && p.x < valvesCtr.x - .2), .75).add(V(0, .2, .3)), laPt = out(cen((p, h) => h > 1 && p.x > valvesCtr.x && p.z < valvesCtr.z), .6).add(V(0, .35, 0));
    const vPt = out(cen((p, h) => h > .25 && h < .6 && p.z > apex.z), .3).add(V(.9, 0, .6));
    const aoTop = V(0, -1e9, 0); { const pa = G.aorta.attributes.position; for (let i = 0; i < pa.count; i++) { tmp.fromBufferAttribute(pa, i); if (tmp.y > aoTop.y) aoTop.copy(tmp); } }
    const paPt = G.pulmArtery.boundingBox.max.clone().setZ(G.pulmArtery.boundingSphere.center.z);
    // Flujo sanguíneo por las cavidades (visible en rayos X), sincronizado con sístole y diástole
    const nearest = (geo, ref) => { const pa = geo.attributes.position, b = V(0, 0, 0); let d = 1e9; for (let i = 0; i < pa.count; i++) { tmp.fromBufferAttribute(pa, i); const e = tmp.distanceToSquared(ref); if (e < d) { d = e; b.copy(tmp); } } return b; };
    const raC = cen((p, h) => h > 1 && p.x < valvesCtr.x - .2), laC = cen((p, h) => h > 1 && p.x > valvesCtr.x && p.z < valvesCtr.z);
    const rvC = apex.clone().addScaledVector(axis, .45 * L).addScaledVector(lvDir, -.2 * L), lvC = apex.clone().addScaledVector(axis, .4 * L).addScaledVector(lvDir, .12 * L);
    const MV = valvesCtr.clone().add(valvesCtr.clone().sub(TV).multiplyScalar(.8));
    const aoRoot = nearest(G.aorta, valvesCtr), paRoot = nearest(G.pulmArtery, valvesCtr), pvIn = nearest(G.pulmVeins, laC);
    const paOut = nearest(G.pulmArtery, paRoot.clone().add(V(.3, .9, -.3)));
    const crv = (pts) => new THREE.CatmullRomCurve3(pts);
    const sides = [
      { color: '#5b7dff', inC: crv([svcEnd.clone().add(V(0, .25, 0)), svcEnd, raC, TV, rvC]), outC: crv([rvC, paRoot, paRoot.clone().lerp(paOut, .5).add(V(0, .1, 0)), paOut]) },
      { color: '#ff4d5e', inC: crv([pvIn, laC, MV, lvC]), outC: crv([lvC, aoRoot, aoRoot.clone().lerp(aoTop, .5).add(V(0, .15, 0)), aoTop]) }
    ];
    const BN = 110;
    for (const sd of sides) {
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(BN * 3), 3));
      sd.pts = new THREE.Points(geo, pointsMat(sd.color, .13, 1)); heart.add(sd.pts); sd.geo = geo;
      sd.p = Array.from({ length: BN }, () => ({ out: Math.random() < .3, u: Math.random(), j: V((Math.random() - .5) * .22, (Math.random() - .5) * .22, (Math.random() - .5) * .22) }));
    }
    c.label({ es: 'Aurícula derecha', en: 'Right atrium' }, null, raPt, '#ff9a7a');
    c.label({ es: 'Aurícula izquierda', en: 'Left atrium' }, null, laPt, '#ff9a7a');
    c.label({ es: 'Ventrículos', en: 'Ventricles' }, { es: 'la bomba', en: 'the pump' }, vPt, C.vent);
    c.label({ es: 'Aorta', en: 'Aorta' }, { es: 'al cuerpo', en: 'to the body' }, aoTop.clone().add(V(0, .15, 0)), C.aorta);
    c.label({ es: 'Arteria pulmonar', en: 'Pulmonary artery' }, { es: 'a los pulmones', en: 'to the lungs' }, paPt, C.pulm);
    c.label({ es: 'Nodo sinusal', en: 'Sinus node' }, { es: 'marcapasos', en: 'pacemaker' }, saNode, C.elec);
    c.label({ es: 'Nodo AV', en: 'AV node' }, { es: 'la pausa', en: 'the pause' }, avNode, C.elec);
    c.label({ es: 'Haz de His', en: 'Bundle of His' }, null, HIS.clone().add(V(.5, 0, .3)), C.elec);
    c.label({ es: 'Fibras de Purkinje', en: 'Purkinje fibres' }, null, apex.clone().lerp(valvesCtr, .3).add(V(-1.0, 0, .4)), C.elec);
    c.label({ es: 'Arterias coronarias', en: 'Coronary arteries' }, { es: 'riegan el músculo', en: 'feed the muscle' }, out(cen((p, h) => h > .5 && h < .8 && p.z > valvesCtr.z && p.x < valvesCtr.x), .5).add(V(-.4, -.2, .4)), '#ff6b6b');

    // Deformación de la contracción (pared, coronarias, venas cardiacas, válvulas)
    const deformables = [G.wall, G.coronary, G.cardiacVeins, G.valves].map((geo) => {
      const pa = geo.attributes.position, n = pa.count, h = new Float32Array(n), r = new Float32Array(n * 3), ax = new Float32Array(n);
      for (let i = 0; i < n; i++) { tmp.fromBufferAttribute(pa, i).sub(apex); const a = tmp.dot(axis); ax[i] = a; h[i] = a / L; tmp.addScaledVector(axis, -a); r[i * 3] = tmp.x; r[i * 3 + 1] = tmp.y; r[i * 3 + 2] = tmp.z; }
      return { pa, n, h, r, ax };
    });
    function deform(sys, atr, jitter, time) {
      for (const D of deformables) {
        const a = D.pa.array;
        for (let i = 0; i < D.n; i++) {
          const h = D.h[i]; let rad, axk;
          if (h <= 1) { rad = 1 - .075 * sys * (.4 + .6 * smooth(0, .5, h)); axk = 1 - .05 * sys; } else { rad = 1 - .1 * atr; axk = 1 - .025 * sys; }
          if (jitter) rad += jitter * Math.sin(i * .37 + time * 40);
          const A = D.ax[i] * axk;
          a[i * 3] = apex.x + axis.x * A + D.r[i * 3] * rad; a[i * 3 + 1] = apex.y + axis.y * A + D.r[i * 3 + 1] * rad; a[i * 3 + 2] = apex.z + axis.z * A + D.r[i * 3 + 2] * rad;
        }
        D.pa.needsUpdate = true;
      }
    }

    // Monitor ECG
    const mon = c.side({ es: 'Monitor · derivación II (simulada)', en: 'Monitor · lead II (simulated)' });
    const trace = sweepTrace(mon.canvas, '#5ef2a6', { speed: 160 });
    const wallMat = wall.userData.real.material, holoW = wall.userData.mat;
    wallMat.emissive = new THREE.Color('#ff2a40');
    let beatFired = false, s2Fired = true, rrPrev = S.rr;
    c.onFrame((dt, rdt) => {
      const showE = xray.k > .08; elec.forEach((m) => (m.visible = showE));
      S.target = S.exercising ? 150 : 72; S.hr += clamp(S.target - S.hr, -12 * rdt, 20 * rdt);
      S.ph += dt; const q = clamp(S.rr / .85, .55, 1.2);
      if (S.rhythm !== 'vf' && S.ph >= S.rr) {
        S.ph -= S.rr; beatFired = false; rrPrev = S.rr; const b = 60 / S.hr;
        S.rr = S.rhythm === 'af' ? b * (.55 + Math.random() * .9) * .85 : b; if (S.rhythm === 'af') S.ph = .07;
      }
      const ph = S.ph, vf = S.rhythm === 'vf', af = S.rhythm === 'af';
      if (!vf && !beatFired && ph >= .2) { beatFired = true; s2Fired = false; c.sound.beep(1046, .05, 'sine', .025); c.sound.thump(52, .14, .26); c.state.bpm?.(af ? Math.round(60 / rrPrev) : Math.round(S.hr)); }
      if (!vf && beatFired && !s2Fired && ph >= .2 + .3 * q) { s2Fired = true; c.sound.thump(78, .09, .18); } // 2.º ruido (cierre de válvulas sigmoideas)
      if (vf) c.state.bpm?.('--');
      for (const p of paths) {
        if (vf) { p.m.uniforms.uProg.value = Math.random() < .08 ? Math.random() : -1; continue; }
        if (af && p.a < .1) { p.m.uniforms.uProg.value = -1; continue; }
        p.m.uniforms.uProg.value = ph < p.a ? -1 : (ph - p.a) / (p.b - p.a);
      }
      saNode.material.opacity = af || vf ? .2 : .3 + .9 * bump(ph, -.01, .05); saNode.scale.setScalar(1 + .6 * bump(ph, -.01, .05) * (af || vf ? 0 : 1));
      avNode.material.opacity = vf ? .25 : .3 + .7 * smooth(.05, .08, ph) * (1 - smooth(.15, .19, ph));
      const venDep = vf ? .3 + .5 * Math.random() : bump(ph, .18, .3) + .3 * bump(ph, .2 + .2 * q, .3 + .32 * q);
      holoW.uniforms.uBoost.value = .5 * venDep + S.flash * 2;
      wallMat.emissiveIntensity = .16 * venDep + S.flash * 1.2;
      const atrC = af || vf ? 0 : bump(ph, .08, .22);
      const sys = vf ? 0 : smooth(.21, .3, ph) * (1 - smooth(.3 + .14 * q, .3 + .32 * q, ph));
      deform(sys, atrC, vf ? .006 : 0, c.time);
      S.flash = Math.max(0, S.flash - rdt * 2.5);
      fib.visible = af && showE;
      // sangre: entra en diástole, espera en el ventrículo y sale en la sístole
      const pump = vf ? .05 : 1, hrK = S.hr / 72;
      for (const sd of sides) {
        sd.pts.visible = showE; if (!showE) continue;
        const a = sd.geo.attributes.position;
        sd.p.forEach((q, i) => {
          if (!q.out) { q.u = Math.min(1, q.u + dt * (sys > .05 ? .08 : .55) * hrK * pump * (.7 + .6 * ((i * 37) % 10) / 10)); if (q.u >= 1 && sys > .3) { q.out = true; q.u = 0; } }
          else { q.u += dt * (sys > .05 ? 2.6 : .06) * hrK * pump; if (q.u >= 1) { q.out = false; q.u = 0; } }
          (q.out ? sd.outC : sd.inC).getPointAt(Math.min(q.u, 1), tmp);
          const spread = q.out ? .5 : (q.u > .85 ? 1.4 : .8);
          a.setXYZ(i, tmp.x + q.j.x * spread, tmp.y + q.j.y * spread, tmp.z + q.j.z * spread);
        });
        a.needsUpdate = true;
      }
      if (af) { const a = fibGeo.attributes.position; for (let i = 0; i < fibN; i++) if (Math.random() < .2) { const j = atrialIdx[Math.floor(Math.random() * atrialIdx.length)]; a.setXYZ(i, wallPos.getX(j), wallPos.getY(j), wallPos.getZ(j)); } a.needsUpdate = true; }
      trace.push(ecgAt(ph, q, S.rhythm, c.time), dt); trace.draw();
      mon.right.textContent = vf ? (lang === 'en' ? 'VF' : 'FV') : `♥ ${Math.round(af ? 60 / rrPrev : S.hr)}`;
    });
  }
});
