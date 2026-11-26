// Demo: La rodilla como palanca / The knee as a lever — huesos y músculos reales (BodyParts3D)
import { createDemo, THREE, holoMesh, glowMat, gridFloor, loadPack, realMat, arrow, xray, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const C = { bone: '#f5e9cc', mus: '#ff6b6b', ten: '#f2e6cf', bw: '#fbbf24', quad: '#2dd4bf', pf: '#ff4d6d' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Modelo didáctico: momento extensor = peso × brazo de palanca; fuerza del cuádriceps = momento ÷ brazo del tendón rotuliano (≈ 4.5 cm)
const S = { layer: 'muscle', theta: 20, target: 20, kg: 70, holding: false, auto: true, t: 0 };
const LS = .42, D = .045; // m: longitud de pierna (rodilla-tobillo) y brazo del tendón rotuliano
const forces = (th) => { const r = th * Math.PI / 180; const fq = .85 * LS * Math.sin(r / 2) / D; return { fq, pf: 2 * fq * Math.sin(r / 2) }; };

const chapters = [
  { title: { es: 'Huesos y palanca', en: 'Bones and a lever' }, cam: { pos: [4.2, .6, 5.6], target: [0, -.3, 0] }, labels: [0, 1, 2, 3, 4], xray: false,
    lines: [
      { es: 'Esta es una pierna humana real: músculos y huesos reconstruidos de imágenes médicas.', en: 'This is a real human leg: muscles and bones rebuilt from medical images.' },
      { es: 'El cuádriceps tira de la rótula, y la rótula tira de la tibia por el tendón rotuliano.', en: 'The quadriceps pulls on the kneecap, and the kneecap pulls on the tibia through the patellar tendon.' },
      { es: 'Pulsa rayos X para ver los huesos bajo el músculo.', en: 'Press X-ray to see the bones under the muscle.' }
    ], enter: (c) => { S.auto = true; c.controls.autoRotate = true; c.controls.autoRotateSpeed = .4; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'Subir un escalón', en: 'Climbing a step' }, cam: { pos: [5.2, -.1, 2.0], target: [0, -.5, 0] }, labels: [2, 3], xray: true,
    lines: [
      { es: 'Mantén presionado para subir: la rodilla se extiende y el cuádriceps hace el trabajo.', en: 'Hold to step up: the knee straightens and the quadriceps does the work.' },
      { es: 'La rótula se desliza por un surco del fémur, como una polea.', en: 'The kneecap slides along a groove in the femur, like a pulley.' },
      { es: 'Suelta para bajar despacio: el mismo músculo frena el movimiento.', en: 'Let go to lower slowly: the same muscle brakes the motion.' }
    ], enter: () => { S.auto = false; S.target = 75; } },
  { title: { es: 'Más flexión, más fuerza', en: 'More bend, more force' }, cam: { pos: [5.4, -.2, 1.6], target: [0, -.5, 0] }, labels: [5, 6, 7], xray: true,
    lines: [
      { es: 'Cuanto más se dobla la rodilla, más lejos queda el peso del cuerpo y mayor es la palanca.', en: 'The more the knee bends, the farther the body weight sits and the bigger the lever.' },
      { es: 'El cuádriceps solo tiene unos centímetros de brazo: necesita varias veces el peso corporal.', en: 'The quadriceps has only a few centimetres of leverage: it needs several times body weight.' },
      { es: 'Mueve el ángulo y mira cómo crecen las flechas. Es un modelo simplificado.', en: 'Move the angle and watch the arrows grow. This is a simplified model.' }
    ], enter: () => { S.auto = false; } },
  { title: { es: 'En fisioterapia', en: 'In physiotherapy' }, cam: { pos: [5.4, -.1, 2.2], target: [0, -.5, 0] }, labels: [5, 6, 7], xray: true,
    lines: [
      { es: 'Por eso, en la rehabilitación temprana de la rodilla suelen empezar con rangos pequeños.', en: 'That is why early knee rehab often starts with small ranges of motion.' },
      { es: 'Compara una minisentadilla con una sentadilla profunda: la carga en la rótula cambia mucho.', en: 'Compare a mini-squat with a deep squat: the load on the kneecap changes a lot.' },
      { es: 'Cada programa lo ajusta tu fisioterapeuta según tu caso.', en: 'Every programme is tailored by your physiotherapist to your case.' }
    ], enter: () => { S.auto = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [4.2, .6, 5.6], target: [0, -.3, 0] }, labels: [], xray: false,
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => { S.auto = true; setTimeout(() => c.chapter() === 4 && c.quiz(QUIZ), 900); } }
];
const QUIZ = [
  { q: { es: '¿Qué hueso actúa como polea del cuádriceps?', en: 'Which bone acts as the quadriceps pulley?' }, o: [{ es: 'El peroné', en: 'The fibula' }, { es: 'La rótula', en: 'The kneecap' }, { es: 'El fémur', en: 'The femur' }], a: 1,
    e: { es: 'La rótula aumenta el brazo de palanca del cuádriceps.', en: 'The kneecap increases the quadriceps lever arm.' } },
  { q: { es: 'Al pasar de 30° a 90° de flexión, la fuerza en la rótula…', en: 'Going from 30° to 90° of bend, the force on the kneecap…' }, o: [{ es: 'Baja', en: 'Drops' }, { es: 'Sube varias veces', en: 'Rises several times over' }, { es: 'No cambia', en: 'Stays the same' }], a: 1,
    e: { es: 'Crece el brazo de palanca del peso y el ángulo entre tendones.', en: 'Both the body-weight lever and the tendon angle grow.' } },
  { q: { es: '¿Quién decide el rango y la carga de tus ejercicios?', en: 'Who decides the range and load of your exercises?' }, o: [{ es: 'Una demo en internet', en: 'An online demo' }, { es: 'Tu fisioterapeuta, según tu caso', en: 'Your physiotherapist, for your case' }, { es: 'Siempre lo más profundo posible', en: 'Always as deep as possible' }], a: 1,
    e: { es: 'Este modelo es educativo; la prescripción es individual.', en: 'This model is educational; prescription is individual.' } }
];

let angSlider;
createDemo({
  title: { es: 'La rodilla como palanca', en: 'The knee as a lever' }, accent: '#2dd4bf', bg: '#05080a', bgTop: '#1a2629', fog: .03, floorY: -2.25,
  camera: chapters[0].cam, thumb: { pos: [3.4, .8, 3.4], target: [0, .3, 0], chapter: 0 }, bloom: { strength: .7, radius: .45, threshold: .35 }, credit: BP3D_CREDIT, sources: { es: 'Modelo de palanca simplificado; brazo del tendón rotuliano ≈ 4.5 cm.', en: 'Simplified lever model; patellar tendon moment arm ≈ 4.5 cm.' }, chapters, minDist: 1.5,
  action(ui, c, ci) {
    c.state.mA = ui.metric({ es: 'flexión', en: 'knee bend' }, '°');
    c.state.mQ = ui.metric({ es: 'cuádriceps', en: 'quadriceps' }, { es: '× peso', en: '× body wt' });
    c.state.mP = ui.metric({ es: 'en la rótula', en: 'on kneecap' }, { es: '× peso', en: '× body wt' });
    ui.seg([{ value: 'skin', label: { es: 'Piel', en: 'Skin' } }, { value: 'muscle', label: { es: 'Músculo', en: 'Muscle' } }, { value: 'bone', label: { es: 'Hueso', en: 'Bone' } }], S.layer, (v) => { S.layer = v; c.state.applyLayer?.(); });
    if (ci === 1) ui.hold({ es: 'Mantén para subir', en: 'Hold to step up' }, (v) => { S.holding = v; S.target = v ? 5 : 75; });
    if (ci === 2) angSlider = ui.slider({ es: 'Ángulo', en: 'Angle' }, { min: 0, max: 110, value: Math.round(S.theta), fmt: (v) => v + '°' }, (v) => { S.target = v; });
    if (ci === 2 || ci === 3) ui.slider({ es: 'Peso', en: 'Weight' }, { min: 40, max: 120, value: S.kg, fmt: (v) => v + ' kg' }, (v) => { S.kg = v; });
    if (ci === 3) ui.seg([{ value: 30, label: { es: 'Minisentadilla 30°', en: 'Mini-squat 30°' } }, { value: 60, label: { es: 'Media 60°', en: 'Half 60°' } }, { value: 90, label: { es: 'Profunda 90°', en: 'Deep 90°' } }], 30, (v) => { S.target = v; });
    if (ci === 4) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#2dd4bf', 40, -2.25));
    const P = await loadPack('knee', { center: [-80, -78, 405], scale: 1 / 190 });
    const G = P.geo, tmp = V(0, 0, 0);
    // referencias: rodilla (entre cóndilos y meseta tibial) y tobillo
    const pts = (geo, f) => { const a = geo.attributes.position, o = []; for (let i = 0; i < a.count; i++) { tmp.fromBufferAttribute(a, i); if (f(tmp)) o.push(tmp.clone()); } return o; };
    const avg = (arr) => arr.reduce((s, p) => s.add(p), V(0, 0, 0)).divideScalar(Math.max(1, arr.length));
    const fb = G.femur.boundingBox, tbb = G.tibia.boundingBox;
    const K = avg(pts(G.femur, (p) => p.y < fb.min.y + .1)).lerp(avg(pts(G.tibia, (p) => p.y > tbb.max.y - .08)), .5);
    const ankle = avg(pts(G.tibia, (p) => p.y < tbb.min.y + .08));
    const tuberosity = pts(G.tibia, (p) => p.y > tbb.max.y - .45 && p.y < tbb.max.y - .25).reduce((b, p) => (p.z > b.z ? p : b), V(0, 0, -9));
    const patC = G.patella.boundingSphere.center.clone(), patR = G.patella.boundingSphere.radius;
    const leg = new THREE.Group(); scene.add(leg);
    const thigh = new THREE.Group(), shank = new THREE.Group(), pivotT = new THREE.Group(), pivotS = new THREE.Group();
    pivotT.position.copy(K); pivotS.position.copy(K); leg.add(pivotT, pivotS); pivotT.add(thigh); pivotS.add(shank);
    thigh.position.copy(K).negate(); shank.position.copy(K).negate();
    const mk = (parent, geo, color, real, ghost, opts) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .015, rim: .45, intensity: .75, edges: false }); parent.add(m); return m; };
    mk(thigh, G.femur, C.bone, 'bone', .9);
    const muscles = ['rectus', 'vlat', 'vmed', 'vint'].map((k) => mk(thigh, G[k], C.mus, 'muscle', .08));
    mk(shank, G.tibia, C.bone, 'bone', .9); mk(shank, G.fibula, C.bone, 'bone', .9); const tibA = mk(shank, G.tibAnt, C.mus, 'muscle', .08);
    mk(shank, G.foot, C.bone, 'bone', .9);
    // músculos posteriores y mediales (dan volumen real a la pierna)
    const back = [mk(thigh, G.hamstrings, C.mus, 'muscle', .06), mk(thigh, G.medial, C.mus, 'muscle', .06),
      mk(shank, G.calf, C.mus, 'muscle', .06), mk(shank, G.fibLong, C.mus, 'muscle', .06)];
    // piel real de la pierna (dividida en la rodilla para que cada parte siga a su hueso)
    const SK = await loadPack('legskin', { center: [-80, -78, 405], scale: 1 / 190 });
    // skinning lineal: cada vértice mezcla la rotación del muslo y de la pierna según su distancia a la rodilla
    const skins = ['thigh', 'shank'].map((k) => mk(leg, SK.geo[k], '#ffb38a', 'skin', .1, { side: THREE.DoubleSide }));
    const skinD = ['thigh', 'shank'].map((k) => { const pa = SK.geo[k].attributes.position, b = Float32Array.from(pa.array), w = new Float32Array(pa.count);
      for (let i = 0; i < pa.count; i++) w[i] = smooth(K.y - .14, K.y + .14, b[i * 3 + 1]); return { pa, b, w }; });
    const va = new THREE.Vector3(), vb = new THREE.Vector3();
    c.state.skinDeform = (qT, qS) => { for (const D of skinD) { const a = D.pa.array, b = D.b; for (let i = 0; i < D.w.length; i++) {
      va.set(b[i * 3] - K.x, b[i * 3 + 1] - K.y, b[i * 3 + 2] - K.z); vb.copy(va); va.applyQuaternion(qT); vb.applyQuaternion(qS); const w = D.w[i];
      a[i * 3] = K.x + va.x * w + vb.x * (1 - w); a[i * 3 + 1] = K.y + va.y * w + vb.y * (1 - w); a[i * 3 + 2] = K.z + va.z * w + vb.z * (1 - w); } D.pa.needsUpdate = true; }
      SK.geo.thigh.computeVertexNormals(); SK.geo.shank.computeVertexNormals(); };
    const allMuscles = () => [...muscles, ...back, tibA];
    c.state.applyLayer = () => { const L = S.layer; skins.forEach((m) => (m.visible = L === 'skin')); allMuscles().forEach((m) => (m.visible = L !== 'bone')); };
    c.state.applyLayer();
    const patGroup = new THREE.Group(), pivotP = new THREE.Group(); pivotP.position.copy(K); leg.add(pivotP); pivotP.add(patGroup); patGroup.position.copy(K).negate();
    const patella = mk(patGroup, G.patella, C.bone, 'bone', .9);
    // pie simple y escalón

    const stepTop = ankle.y - .36;
    
    // tendones dinámicos
    const rb = G.rectus.boundingBox, rH = rb.max.y - rb.min.y;
    const quadBottom = avg(pts(G.rectus, (p) => p.y > patC.y + .25 && p.y < patC.y + .45));
    const tendonMat = realMat('tendon');
    const tendon = (rTop, rBot) => { const g = new THREE.CylinderGeometry(rTop, rBot, 1, 24, 4); g.scale(1.9, 1, .55); const m = new THREE.Mesh(g, tendonMat); m.castShadow = true; leg.add(m); return m; }; // banda plana que se estrecha
    const qt = tendon(.034, .05), pt = tendon(.024, .03);
    const place = (m, a, b) => { m.position.copy(a).lerp(b, .5); const d = b.clone().sub(a); m.scale.set(1, d.length(), 1); m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); };
    // flechas
    const aBW = arrow(C.bw), aQ = arrow(C.quad), aPF = arrow(C.pf); leg.add(aBW, aQ, aPF);
    const hip = avg(pts(G.femur, (p) => p.y > fb.max.y - .1));
    // etiquetas
    const lab = (o) => o;
    c.label({ es: 'Fémur', en: 'Femur' }, null, hip.clone().lerp(K, .5).add(V(-.4, 0, 0)), C.bone);
    c.label({ es: 'Cuádriceps', en: 'Quadriceps' }, { es: '4 músculos', en: '4 muscles' }, G.rectus.boundingSphere.center.clone().add(V(.2, .2, .4)), C.mus);
    c.label({ es: 'Rótula', en: 'Kneecap' }, null, patC.clone().add(V(0, 0, .35)), C.bone);
    c.label({ es: 'Tendón rotuliano', en: 'Patellar tendon' }, null, tuberosity.clone().lerp(patC, .5).add(V(0, 0, .35)), C.ten);
    c.label({ es: 'Tibia', en: 'Tibia' }, null, K.clone().lerp(ankle, .6).add(V(.35, 0, .2)), C.bone);
    const lBW = c.label({ es: 'Peso corporal', en: 'Body weight' }, null, aBW, C.bw);
    const lQ = c.label({ es: 'Fuerza del cuádriceps', en: 'Quadriceps force' }, null, aQ, C.quad);
    const lPF = c.label({ es: 'Compresión en la rótula', en: 'Kneecap compression' }, null, aPF, C.pf);
    const ax = new THREE.Vector3(1, 0, 0), q = new THREE.Quaternion();
    c.onFrame((dt, rdt) => {
      if (S.auto) S.target = 45 + 40 * Math.sin(c.time * .7);
      if (angSlider && c.chapter() === 2) S.target = +angSlider.input.value;
      S.theta = lerp(S.theta, S.target, 1 - Math.exp(-rdt * (S.holding ? 2.2 : 3)));
      const th = S.theta * Math.PI / 180;
      pivotT.quaternion.setFromAxisAngle(ax, -th / 2); pivotS.quaternion.setFromAxisAngle(ax, th / 2); if (S.layer === 'skin' || xray.k > .05) c.state.skinDeform?.(pivotT.quaternion, pivotS.quaternion); pivotP.quaternion.setFromAxisAngle(ax, -th * .1);
            leg.updateMatrixWorld(true);
      const W = (obj, p) => leg.worldToLocal(obj.localToWorld(p.clone()));
      const pc = W(patGroup, patC), qb = W(thigh, quadBottom), tub = W(shank, tuberosity), kL = K.clone(), hipL = W(thigh, hip);
      place(qt, qb, pc.clone().add(V(0, patR * .5, 0))); place(pt, pc.clone().add(V(0, -patR * .6, 0)), tub);
      const f = forces(S.theta), sc = .13;
      aBW.set(V(hipL.x - .45, hipL.y + .1, hipL.z), V(0, -1, 0), .55 + 0 * sc);
      const qdir = qb.clone().sub(pc).normalize(); aQ.set(pc.clone().addScaledVector(qdir, .1), qdir, .2 + f.fq * sc);
      const pfdir = kL.clone().sub(pc).normalize(); aPF.set(pc.clone().addScaledVector(pfdir, -(.25 + f.pf * sc)), pfdir, .2 + f.pf * sc);
      const showF = c.chapter() >= 2 && c.chapter() <= 3; aBW.visible = aQ.visible = aPF.visible = showF;
      muscles.forEach((m) => { const mat = m.userData.real.material; mat.emissive = mat.emissive || new THREE.Color(); mat.emissive.set('#ff3040'); mat.emissiveIntensity = clamp(f.fq / 8, 0, 1) * .35; m.userData.mat.uniforms.uBoost.value = clamp(f.fq / 8, 0, 1) * .6; });
      c.state.mA?.(Math.round(S.theta)); c.state.mQ?.(f.fq.toFixed(1)); c.state.mP?.(f.pf.toFixed(1));
      if (c.chapter() >= 2 && c.chapter() <= 3) c.state.mP && document.querySelectorAll('.metric span')[2] && (document.querySelectorAll('.metric span')[2].title = `${Math.round(f.pf * S.kg * 9.81)} N`);
    });
  }
});
