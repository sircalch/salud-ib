// Demo: Gota a gota / Drop by drop
import { createDemo, THREE, pillowGeo, pillowMat, holoMesh, holoMat, glowMat, pointsMat, gridFloor, realMat, loadPack, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const C = { bag: '#8fe3ff', fluid: '#38bdf8', drop: '#bff4ff', pole: '#94a3b8', clamp: '#facc15', line: '#7dd3fc' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = { open: .35, factor: 20, vol: 1000, vol0: 1000, gtt: 0, speed: 1, counting: 0, countN: 0, drops: 0, task: null, streak: 0, wins: 0 };
const rateFromOpen = (o) => 180 * Math.pow(clamp(o, 0, 1), 1.6);
const fmt = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toLocaleString(lang === 'en' ? 'en-US' : 'es-MX');

const TASKS = [[1000, 8, 20], [500, 4, 20], [1000, 12, 20], [250, 2, 20], [500, 6, 60], [100, 1, 60], [250, 5, 60], [1000, 10, 15], [500, 8, 10]];
function newTask(c) {
  const [v, h, f] = TASKS[Math.floor(Math.random() * TASKS.length)];
  S.task = { v, h, f, gtt: v * f / (h * 60), mlh: v / h }; S.factor = f; S.vol = S.vol0 = v;
  c.state.taskEl && (c.state.taskEl.textContent = lang === 'en' ? `Order: ${v} mL over ${h} h · set ${f} drops/mL` : `Indicación: ${v} mL en ${h} h · equipo de ${f} gotas/mL`);
}

const chapters = [
  { title: { es: 'El equipo', en: 'The kit' }, cam: { pos: [6.2, 3.4, 9.4], target: [1.5, -.3, -1.0] }, labels: [0, 1, 2, 3, 4],
    lines: [
      { es: 'Una bolsa de solución, una cámara de goteo, una pinza de rodillo y la línea hacia la vena.', en: 'A bag of fluid, a drip chamber, a roller clamp and the line to the vein.' },
      { es: 'La gravedad empuja el líquido. La cámara te deja ver y contar cada gota.', en: 'Gravity drives the fluid. The chamber lets you see and count every drop.' },
      { es: 'La pinza aprieta el tubo: más apretado, menos gotas por minuto.', en: 'The clamp squeezes the tube: tighter means fewer drops per minute.' }
    ], enter: (c) => { c.controls.autoRotate = true; c.controls.autoRotateSpeed = .5; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'Cada gota cuenta', en: 'Every drop counts' }, cam: { pos: [1.2, 1.35, 2.4], target: [0, 1.05, 0] }, labels: [1],
    lines: [
      { es: 'El factor de goteo dice cuántas gotas hacen 1 mL. Viene impreso en el empaque del equipo.', en: 'The drop factor says how many drops make 1 mL. It is printed on the set packaging.' },
      { es: 'Un macrogotero suele dar 10, 15 o 20 gotas por mL. Un microgotero da 60, con gotas más pequeñas.', en: 'A macro-drip set usually gives 10, 15 or 20 drops per mL. A micro-drip set gives 60, with smaller drops.' },
      { es: 'Cambia el equipo y mira el tamaño de la gota.', en: 'Switch sets and watch the drop size.' }
    ] },
  { title: { es: 'La pinza manda', en: 'The clamp is in charge' }, cam: { pos: [2.0, .6, 3.4], target: [0, .45, 0] }, labels: [2],
    lines: [
      { es: 'Arrastra la rueda de la pinza hacia arriba o abajo, o usa el control de la barra.', en: 'Drag the clamp wheel up or down, or use the control in the bar.' },
      { es: 'mL/h = gotas por minuto × 60 ÷ factor de goteo.', en: 'mL/h = drops per minute × 60 ÷ drop factor.' },
      { es: 'Gotas por minuto = volumen × factor ÷ minutos totales.', en: 'Drops per minute = volume × factor ÷ total minutes.' }
    ] },
  { title: { es: 'Cuenta como en la sala', en: 'Count like on the ward' }, cam: { pos: [1.2, 1.3, 2.5], target: [0, 1.05, 0] }, labels: [1],
    lines: [
      { es: 'En la práctica se cuentan las gotas durante 15 segundos y se multiplica por 4.', en: 'In practice you count drops for 15 seconds and multiply by 4.' },
      { es: 'Pulsa «Contar 15 s» y cuenta tú también. Luego compara con el aparato.', en: 'Press "Count 15 s" and count along. Then compare with the readout.' },
      { es: 'Mira la gota al caer, no la que se está formando.', en: 'Watch the drop as it falls, not the one still forming.' }
    ] },
  { title: { es: 'Reto: ajusta la indicación', en: 'Challenge: set the order' }, cam: { pos: [3.0, 1.2, 5.4], target: [-.1, .6, 0] }, labels: [2],
    lines: [
      { es: 'Lee la indicación, calcula las gotas por minuto y ajusta la pinza.', en: 'Read the order, work out drops per minute and set the clamp.' },
      { es: 'Pulsa «Comprobar» cuando creas que está bien. Se acepta ±2 gotas/min.', en: 'Press "Check" when you think it is right. ±2 drops/min is accepted.' },
      { es: 'Casos ficticios de práctica: en la clínica sigue el protocolo y la doble verificación de tu institución.', en: 'Practice cases only: on the ward follow your institution\'s protocol and double-check.' }
    ], enter: (c) => newTask(c), exit: (c) => { S.task = null; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [3.6, 1.8, 6.6], target: [-.1, .55, 0] }, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 5 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '1000 mL en 8 h con equipo de 20 gotas/mL: ¿cuántas gotas por minuto?', en: '1000 mL over 8 h with a 20 drops/mL set: how many drops per minute?' }, o: [{ es: 'Unas 21', en: 'About 21' }, { es: 'Unas 42', en: 'About 42' }, { es: 'Unas 125', en: 'About 125' }], a: 1,
    e: { es: '1000 × 20 ÷ 480 min = 41.7 gotas/min.', en: '1000 × 20 ÷ 480 min = 41.7 drops/min.' } },
  { q: { es: 'Con microgotero (60 gotas/mL), ¿qué relación hay entre gotas/min y mL/h?', en: 'With a micro-drip set (60 drops/mL), how do drops/min and mL/h relate?' }, o: [{ es: 'Son el mismo número', en: 'They are the same number' }, { es: 'mL/h es el triple', en: 'mL/h is three times higher' }, { es: 'No tienen relación', en: 'They are unrelated' }], a: 0,
    e: { es: 'mL/h = gotas/min × 60 ÷ 60.', en: 'mL/h = drops/min × 60 ÷ 60.' } },
  { q: { es: '¿Cómo se verifica el goteo en la práctica?', en: 'How do you check the rate in practice?' }, o: [{ es: 'A ojo, sin contar', en: 'By eye, without counting' }, { es: 'Contando gotas 15 s y multiplicando por 4', en: 'Counting drops for 15 s and multiplying by 4' }, { es: 'Pesando la bolsa cada hora', en: 'Weighing the bag every hour' }], a: 1,
    e: { es: 'Contar al menos 15 s (o un minuto completo) reduce el error.', en: 'Counting for at least 15 s (or a full minute) reduces the error.' } }
];

let openSlider;
createDemo({
  title: { es: 'Gota a gota', en: 'Drop by drop' }, accent: '#38bdf8', bg: '#05080c', bgTop: '#1c2433', fog: .03, floorY: -4.6, envIntensity: .35,
  camera: chapters[0].cam, thumb: { pos: [4.6, 1.0, 7.6], target: [1.0, .35, 0], chapter: 0 }, bloom: { strength: .75, radius: .5, threshold: .2 }, credit: BP3D_CREDIT, sources: { es: 'Fórmulas estándar: gotas/min = volumen × factor ÷ minutos; mL/h = volumen ÷ horas.', en: 'Standard formulas: drops/min = volume × factor ÷ minutes; mL/h = volume ÷ hours.' }, chapters,
  action(ui, c, ci) {
    c.state.mG = ui.metric({ es: 'gotas/min', en: 'drops/min' }, 'gtt'); c.state.mM = ui.metric({ es: 'mL por hora', en: 'mL per hour' }, 'mL/h');
    if (ci === 1 || ci === 2) ui.seg([{ value: 20, label: { es: 'Macro 20', en: 'Macro 20' } }, { value: 15, label: '15' }, { value: 10, label: '10' }, { value: 60, label: { es: 'Micro 60', en: 'Micro 60' } }], S.factor, (v) => { S.factor = v; });
    if (ci >= 1 && ci <= 4) openSlider = ui.slider({ es: 'Pinza', en: 'Clamp' }, { min: 0, max: 100, value: Math.round(S.open * 100), fmt: (v) => v + '%' }, (v) => { S.open = v / 100; });
    if (ci === 3) ui.button({ es: 'Contar 15 s', en: 'Count 15 s' }, () => { S.counting = 15; S.countN = 0; c.toast(lang === 'en' ? 'Counting… watch the chamber' : 'Contando… mira la cámara', 1600); });
    if (ci === 2 || ci === 0) ui.button({ es: 'Tiempo ×60', en: 'Time ×60' }, (v) => { S.speed = v ? 60 : 1; }, { toggle: true, value: S.speed > 1 });
    if (ci === 4) {
      const tEl = document.createElement('div'); tEl.className = 'metric'; tEl.style.cssText = 'font-weight:800;font-size:.85rem;flex-basis:100%'; ui.clear();
      document.querySelector('.action').appendChild(tEl); c.state.taskEl = tEl;
      c.state.mG = ui.metric({ es: 'gotas/min', en: 'drops/min' }, 'gtt');
      openSlider = ui.slider({ es: 'Pinza', en: 'Clamp' }, { min: 0, max: 100, value: Math.round(S.open * 100), fmt: (v) => v + '%' }, (v) => { S.open = v / 100; });
      ui.button({ es: 'Comprobar', en: 'Check' }, () => {
        const T = S.task; if (!T) return; const ok = Math.abs(S.gtt - T.gtt) <= 2;
        if (ok) { S.streak++; S.wins++; c.sound.beep(1175, .15); c.toast((lang === 'en' ? `Correct: ${fmt(T.gtt, 1)} drops/min = ${fmt(T.mlh, 1)} mL/h · streak ${S.streak}` : `Correcto: ${fmt(T.gtt, 1)} gotas/min = ${fmt(T.mlh, 1)} mL/h · racha ${S.streak}`), 3200); setTimeout(() => newTask(c), 1400); }
        else { S.streak = 0; c.sound.beep(220, .2, 'square', .03); c.toast(lang === 'en' ? `Not yet: you have ${fmt(S.gtt, 1)}; aim for ${T.v} × ${T.f} ÷ ${T.h * 60} min` : `Aún no: tienes ${fmt(S.gtt, 1)}; busca ${T.v} × ${T.f} ÷ ${T.h * 60} min`, 3600); }
      });
      ui.button({ es: 'Otro caso', en: 'New case' }, () => newTask(c));
      if (S.task) newTask(c);
    }
    if (ci === 5) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene, camera, controls, renderer } = c; const FLOOR = -4.6; scene.add(gridFloor('#38bdf8', 40, FLOOR));
    // poste
    const pole = holoMesh(new THREE.CylinderGeometry(.035, .035, 8.0, 16), C.pole, { real: 'metal', opacity: .05, rim: .4, edges: false }); pole.position.set(-.85, -.6, -.1); scene.add(pole);
    const arm = holoMesh(new THREE.CylinderGeometry(.03, .03, .9, 12), C.pole, { real: 'metal', opacity: .05, rim: .4, edges: false }); arm.rotation.z = Math.PI / 2; arm.position.set(-.42, 3.35, -.1); scene.add(arm);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(.08, .015, 8, 24, Math.PI * 1.5), realMat('metal')); hook.position.set(0, 3.25, -.1); scene.add(hook);
    const baseFoot = holoMesh(new THREE.CylinderGeometry(.55, .6, .08, 5), C.pole, { real: 'plasticDark', realOpts: { color: '#4a525c', roughness: .6 }, opacity: .05, rim: .4 }); baseFoot.position.set(-.85, -4.58, -.1); scene.add(baseFoot);
    // bolsa
    const bagGeo = new THREE.BoxGeometry(1.0, 1.45, .36, 10, 14, 4); const bp = bagGeo.attributes.position;
    for (let i = 0; i < bp.count; i++) { const x = bp.getX(i), y = bp.getY(i), z = bp.getZ(i); const bx = 1 - (x / .5) ** 2, by = 1 - (y / .725) ** 4; bp.setZ(i, z * (.35 + .65 * bx) * (.5 + .5 * by)); bp.setX(i, x * (1 - .25 * smooth(.45, .725, y))); }
    bagGeo.computeVertexNormals();
    const bag = holoMesh(bagGeo, C.bag, { real: 'bagPlastic', realOpts: { side: THREE.DoubleSide }, shadow: false, opacity: .015, rim: .45, intensity: .7, scan: .04, edgeOpacity: .2, edgeAngle: 40 }); bag.position.set(0, 2.35, 0); scene.add(bag);
    // etiqueta impresa de la bolsa
    { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 420; const g = cv.getContext('2d');
      g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(0, 0, 512, 420); g.fillStyle = '#0b4f8a'; g.fillRect(0, 0, 512, 70);
      g.fillStyle = '#fff'; g.font = '800 40px "Manrope Variable",system-ui'; g.fillText(lang === 'en' ? 'Sodium chloride' : 'Cloruro de sodio', 24, 50);
      g.fillStyle = '#0b2540'; g.font = '800 64px "Unbounded Variable",system-ui'; g.fillText('0.9 %', 24, 150);
      g.font = '600 28px "Manrope Variable",system-ui'; g.fillText(lang === 'en' ? 'Solution for infusion' : 'Solución inyectable', 24, 200); g.fillText(lang === 'en' ? 'Single use · Sterile' : 'Uso único · Estéril', 24, 240);
      g.font = '800 72px "Unbounded Variable",system-ui'; g.fillStyle = '#0b4f8a'; g.fillText('1000 mL', 24, 340);
      g.font = '600 20px "Manrope Variable",system-ui'; g.fillStyle = '#516173'; g.fillText(lang === 'en' ? 'Demo label · not a real product' : 'Etiqueta de demostración · no es un producto real', 24, 395);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(.6, .49), new THREE.MeshStandardMaterial({ map: tx, roughness: .75, color: '#b9c1c9' }));
      lab.position.set(-.05, 2.33, .205); scene.add(lab); }
    const fluidWrap = new THREE.Group(); fluidWrap.position.set(0, 2.35 - .7, 0); scene.add(fluidWrap);
    const fluidGeo = bagGeo.clone(); fluidGeo.scale(.9, .94, .82); fluidGeo.translate(0, .7, 0);
    const fluid = new THREE.Mesh(fluidGeo, realMat('fluid', { color: '#d7f0ff' })); fluidWrap.add(fluid);
    // graduaciones
    const gpts = []; for (let i = 1; i < 10; i++) { const y = -.62 + i * .125, w = i % 2 ? .12 : .22; gpts.push(.3 - w, y, .2, .3, y, .2); }
    const grad = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3)), new THREE.LineBasicMaterial({ color: '#2b3a4a', transparent: true, opacity: .85 })); grad.position.copy(bag.position); scene.add(grad);
    const port = holoMesh(new THREE.CylinderGeometry(.06, .06, .3, 16), C.bag, { real: 'plastic', opacity: .05, rim: .5, edges: false }); port.position.set(0, 1.5, 0); scene.add(port);
    { const rr = (sh, w, h, r, x0, y0, hole) => { const x = x0 - w / 2, y = y0 - h / 2, P = hole ? new THREE.Path() : sh; P.moveTo(x + r, y); P.lineTo(x + w - r, y); P.quadraticCurveTo(x + w, y, x + w, y + r); P.lineTo(x + w, y + h - r); P.quadraticCurveTo(x + w, y + h, x + w - r, y + h); P.lineTo(x + r, y + h); P.quadraticCurveTo(x, y + h, x, y + h - r); P.lineTo(x, y + r); P.quadraticCurveTo(x, y, x + r, y); if (hole) sh.holes.push(P); };
      const sh = new THREE.Shape(); rr(sh, 1.12, 1.74, .08, 0, .07, false); rr(sh, .97, 1.42, .14, 0, 0, true); rr(sh, .3, .07, .035, 0, .84, true);
      const flange = new THREE.Mesh(new THREE.ShapeGeometry(sh, 12), realMat('bagPlastic', { side: THREE.DoubleSide, transmission: .6, roughness: .3, color: '#eef6fb' }));
      flange.position.set(0, 2.35, 0); scene.add(flange);
      // puerto de inyección con tapón
      const p2 = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .22, 16), realMat('plastic', { color: '#e9edf1' })); p2.position.set(.24, 1.54, 0); scene.add(p2);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.065, .06, .09, 20), realMat('plasticTint', { color: '#2f6fd1' })); cap.position.set(.24, 1.41, 0); scene.add(cap);
      const hook2 = new THREE.Mesh(new THREE.TorusGeometry(.05, .012, 8, 24), realMat('metal')); hook2.position.set(0, 3.2, 0); scene.add(hook2); }
    // cámara de goteo
    const chamber = holoMesh(new THREE.CylinderGeometry(.17, .17, .62, 40, 1, true), C.bag, { real: 'glass', realOpts: { side: THREE.DoubleSide, transmission: 0, opacity: .3, roughness: .06, clearcoat: 1, color: '#e6f4fb' }, shadow: false, opacity: .02, rim: .55, edges: false }); chamber.position.set(0, 1.04, 0); scene.add(chamber);
    const capT = holoMesh(new THREE.CylinderGeometry(.18, .17, .05, 40), C.bag, { real: 'plastic', opacity: .05, rim: .4, edges: false }); capT.position.set(0, 1.36, 0); scene.add(capT);
    const capB = holoMesh(new THREE.CylinderGeometry(.17, .1, .08, 40), C.bag, { real: 'plastic', opacity: .05, rim: .4, edges: false }); capB.position.set(0, .7, 0); scene.add(capB);
    const pool = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .1, 40), realMat('fluid', { color: '#cdeeff' })); pool.position.set(0, .79, 0); scene.add(pool);
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), realMat('glass', { color: '#e6f7ff', transmission: .7, roughness: 0, ior: 1.33, thickness: .05, emissive: '#9fdcff', emissiveIntensity: .25 })); scene.add(drop);
    const orifice = new THREE.Mesh(new THREE.CylinderGeometry(.025, .02, .1, 12), realMat('plastic')); orifice.position.set(0, 1.29, 0); scene.add(orifice);
    // línea
    const lineCurve = new THREE.CatmullRomCurve3([V(0, .66, 0), V(0, .2, 0), V(0, -.35, 0), V(.05, -.85, .06), V(.6, -.9, -.35), V(1.55, -1.12, -.95), V(2.4, -1.27, -1.15)]);
    scene.add(holoMesh(new THREE.TubeGeometry(lineCurve, 140, .035, 10, false), C.line, { real: 'tube', shadow: false, opacity: .05, rim: .6, edges: false }));
    const flowN = 90, flowGeo = new THREE.BufferGeometry(); flowGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(flowN * 3), 3));
    scene.add(new THREE.Points(flowGeo, pointsMat('#9fdcff', .02, .14))); const flowU = Float32Array.from({ length: flowN }, () => Math.random());
    // pinza de rodillo
    const clampG = new THREE.Group(); clampG.position.set(0, -.05, 0); scene.add(clampG);
    const housing = new THREE.Group(); clampG.add(housing);
    const clampMat = realMat('plastic', { color: '#e4e9ee', roughness: .4 });
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(.03, .64, .22), clampMat); side.position.set(sx * .115, 0, 0); side.castShadow = true; housing.add(side); }
    const backP = new THREE.Mesh(new THREE.BoxGeometry(.26, .64, .03), clampMat); backP.position.set(0, 0, -.095); housing.add(backP);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(.2, .56, .02), clampMat); ramp.position.set(0, 0, -.06); ramp.rotation.x = -.12; housing.add(ramp);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .14, 28), realMat('plasticTint', { color: '#1d7fd6' }));
    wheel.rotation.z = Math.PI / 2; clampG.add(wheel);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rib = new THREE.Mesh(new THREE.BoxGeometry(.012, .13, .02), realMat('plasticTint', { color: '#1766b0' })); rib.position.set(Math.cos(a) * .112, 0, Math.sin(a) * .112); rib.rotation.y = -a; wheel.add(rib); }
    const wheelEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(.11, .11, .14, 14), 10), new THREE.LineBasicMaterial({ color: '#0d3b66' })); wheelEdge.visible = false; wheel.add(wheelEdge);
    const grip = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 10), new THREE.MeshBasicMaterial({ visible: false })); clampG.add(grip);
    // paciente completo acostado (piel real continua de BodyParts3D): cabeza hacia +x, lado izquierdo hacia la cámara.
    // La vía va en la cara anterior del antebrazo izquierdo, cerca de la muñeca.
    const SCg = 1 / 170, CEN = [0, -110, 1255], Lg = (x, y, z) => V((x - CEN[0]) * SCg, (z - CEN[2]) * SCg, -(y - CEN[1]) * SCg);
    const BP = await loadPack('body', { center: CEN, scale: SCg });
    const bodyGeo = BP.geo.skin, bsp = bodyGeo.attributes.position, tv = V(0, 0, 0);
    const pt = new THREE.Group(); scene.add(pt);
    { const mL = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)), mW = new THREE.Matrix4().makeBasis(V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)); pt.quaternion.setFromRotationMatrix(mW.multiply(mL.transpose())); }
    // punto de punción: vértice más anterior de la piel del antebrazo izquierdo, a ~4 cm de la muñeca
    let siteL = null; { const yL = Lg(0, 0, 885).y; let best = -1e9; for (let i = 0; i < bsp.count; i++) { tv.fromBufferAttribute(bsp, i); if (Math.abs(tv.y - yL) > 8 * SCg || tv.x < 205 * SCg) continue; if (tv.z > best) { best = tv.z; siteL = tv.clone(); } } }
    const target = V(2.45, -1.3, -1.15);
    pt.updateMatrixWorld(true); { const w0 = pt.localToWorld(siteL.clone()); pt.position.copy(target).sub(w0); } pt.updateMatrixWorld(true);
    const patient = holoMesh(bodyGeo, '#ffb38a', { real: 'skin', realOpts: { side: THREE.DoubleSide, clearcoat: .04, roughness: .62, sheen: .45 }, opacity: .015, rim: .35, intensity: .6, edges: false }); pt.add(patient); pt.updateMatrixWorld(true);
    const bbx = new THREE.Box3().setFromObject(patient.userData.real, true); const bedTop = bbx.min.y - .01, bodyZ = pt.localToWorld(Lg(0, -110, 1100)).z;
    // cama: colchón con sábana, base y patas hasta el piso
    const ab = { min: { x: bbx.min.x - 3.2 }, max: { x: bbx.max.x + .5 } };
    const board = new THREE.Mesh(new THREE.BoxGeometry(ab.max.x - ab.min.x, .8, 4.2), new THREE.MeshPhysicalMaterial({ color: '#b8c2ca', roughness: .92, sheen: .3, sheenColor: new THREE.Color('#e6ecf0') }));
    board.position.set((ab.min.x + ab.max.x) / 2, bedTop - .4, bodyZ); board.receiveShadow = true; scene.add(board);
    const frameB = new THREE.Mesh(new THREE.BoxGeometry(ab.max.x - ab.min.x + .2, .18, 4.4), realMat('metal', { color: '#8b939c', roughness: .4 })); frameB.position.copy(board.position).add(V(0, -.5, 0)); scene.add(frameB);
    for (const x of [ab.min.x + .3, ab.max.x - .3]) for (const z of [-1.9, 1.9]) { const h = frameB.position.y - FLOOR; const leg = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, h, 12), realMat('metal', { color: '#9aa2ab' })); leg.position.set(x, FLOOR + h / 2, bodyZ + z); scene.add(leg); }
    const pillow = new THREE.Mesh(pillowGeo(), pillowMat()); pillow.castShadow = true; pillow.scale.set(1.1, .28, 1.7); pillow.position.copy(pt.localToWorld(Lg(0, -40, 1590))).setY(bedTop + .12); pillow.receiveShadow = true; scene.add(pillow);
    // cobija sobre caderas y piernas (tapa el corte del modelo); los brazos quedan encima
    { const hipX = pt.localToWorld(Lg(0, 0, 905)).x, x0 = hipX + 1.25, x1 = ab.min.x + .1, zw = 150 * SCg, NX = 60, NZ = 40, pos = [], idx = [], uv = [];
      const hHip = pt.localToWorld(Lg(0, -230, 960)).y - bedTop + .06;
      // mapas de altura de la piel: el tronco queda debajo de la cobija y los brazos encima
      const CELL = .09, armLo = new Map(), trunkHi = new Map(), key = (x, z) => Math.round(x / CELL) + ',' + Math.round(z / CELL), wv = V(0, 0, 0);
      for (let i = 0; i < bsp.count; i++) { tv.fromBufferAttribute(bsp, i); const arm = Math.abs(tv.x) > 170 * SCg; wv.copy(tv); pt.localToWorld(wv); if (wv.x > x0 + .3) continue;
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const k = key(wv.x + dx * CELL, wv.z + dz * CELL); if (arm) armLo.set(k, Math.min(armLo.get(k) ?? 1e9, wv.y)); else trunkHi.set(k, Math.max(trunkHi.get(k) ?? -1e9, wv.y)); } }
      for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) { const u = i / NX, w = j / NZ, x = lerp(x0, x1, u), z = (w - .5) * 2 * (zw + .42);
        const prof = Math.max(0, 1 - (Math.abs(z) / (zw + .05)) ** 2.2), legs = 1 - .14 * Math.exp(-((z / (zw * .28)) ** 2)) * smooth(.5, .7, u), hump = hHip * (1 - .45 * smooth(.15, .7, u)) * (1 - smooth(.86, 1, u)) * Math.pow(prof, .32) * legs;
        const fold = (.018 * Math.sin(x * 2.3 + Math.sin(z * 3.1) * 1.7) + .01 * Math.sin(x * 5.1 - z * 1.3 + 1.7)) * Math.pow(prof, .5) * (1 - .6 * smooth(.6, 1, Math.abs(z) / (zw + .05)));
        let y = bedTop + .02 + Math.max(hump * 1.06 + .04 * Math.pow(prof, .3) + fold, 0); const kk = key(x, bodyZ + z), th = trunkHi.get(kk), al = armLo.get(kk);
        if (th !== undefined) y = Math.max(y, th + .035); if (al !== undefined && (th === undefined || al > th + .06)) y = Math.min(y, al - .02);
        pos.push(x, y, bodyZ + z); uv.push(u * 4, w * 2); }
      for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + NZ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
      const blanket = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#8497a8', roughness: 1, sheen: .3, sheenRoughness: .8, sheenColor: new THREE.Color('#b9c9d6'), side: THREE.DoubleSide })); blanket.castShadow = blanket.receiveShadow = true; scene.add(blanket);
      // borde doblado de la cobija
      const edge = []; for (let j = 0; j <= 40; j++) { const k = j / 40, z = (k - .5) * 2 * (zw + .42); const prof = Math.max(0, 1 - (Math.abs(z) / (zw + .05)) ** 2.2); edge.push(V(x0 + .02, bedTop + .05 + Math.max(0, hHip * Math.pow(prof, .32)), bodyZ + z)); }
      const hem = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 80, .06, 10), blanket.material); hem.castShadow = true; scene.add(hem); }
    // cánula periférica con alas y apósito transparente
    const can = new THREE.Group(); can.position.copy(target); scene.add(can);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(.022, .03, .2, 20), realMat('plastic', { color: '#f2f4f6' })); hub.rotation.z = Math.PI / 2 + .15; hub.position.set(.06, .03, 0); can.add(hub);
    const canPort = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .05, 20), realMat('plasticTint', { color: '#1fb6a6' })); canPort.rotation.z = Math.PI / 2; canPort.position.set(-.06, .045, 0); can.add(canPort);
    const wings = new THREE.Mesh(new THREE.BoxGeometry(.09, .008, .2), realMat('plasticTint', { color: '#1fb6a6' })); wings.position.set(.08, .012, 0); can.add(wings);
    const film = new THREE.Mesh(new THREE.BoxGeometry(.34, .004, .3), realMat('glass', { color: '#dfe7ee', transmission: .35, roughness: .5, thickness: .01 })); film.position.set(.08, .02, 0); can.add(film);

    c.label({ es: 'Bolsa', en: 'Bag' }, null, V(-.7, 2.9, .3), C.bag);
    c.label({ es: 'Cámara de goteo', en: 'Drip chamber' }, null, V(.7, 1.2, .2), C.drop);
    c.label({ es: 'Pinza de rodillo', en: 'Roller clamp' }, { es: 'arrástrala', en: 'drag it' }, V(.75, -.05, .2), C.clamp);
    c.label({ es: 'Línea', en: 'Line' }, { es: 'a la vena', en: 'to the vein' }, V(1.4, -1.35, .5), C.line);
    c.label({ es: 'Cánula', en: 'Cannula' }, { es: 'en el antebrazo', en: 'in the forearm' }, target.clone().add(V(.1, .35, 0)), '#1fb6a6');

    // arrastre de la rueda
    const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let dragging = false, y0 = 0, o0 = 0;
    const hit = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ndc, camera); return ray.intersectObject(grip).length > 0; };
    renderer.domElement.addEventListener('pointerdown', (e) => { if (hit(e)) { dragging = true; y0 = e.clientY; o0 = S.open; controls.enabled = false; renderer.domElement.setPointerCapture(e.pointerId); } }, true);
    renderer.domElement.addEventListener('pointermove', (e) => { if (dragging) { S.open = clamp(o0 + (y0 - e.clientY) / 260, 0, 1); openSlider?.set(Math.round(S.open * 100)); } else renderer.domElement.style.cursor = hit(e) ? 'ns-resize' : ''; });
    const end = () => { if (dragging) { dragging = false; controls.enabled = true; } };
    renderer.domElement.addEventListener('pointerup', end); renderer.domElement.addEventListener('pointercancel', end);

    // gota: forma, cae y salpica
    let form = 0, fall = -1, fy = 0, fv = 0, splash = 0, wheelRot = 0, gSm = 0;
    c.onFrame((dt, rdt) => {
      S.gtt = rateFromOpen(S.open); gSm = lerp(gSm, S.gtt, 1 - Math.exp(-rdt * 4));
      const interval = S.gtt > .3 ? 60 / S.gtt : Infinity;
      const rMax = S.factor >= 60 ? .028 : S.factor >= 20 ? .048 : S.factor >= 15 ? .053 : .06;
      orifice.scale.set(S.factor >= 60 ? .5 : 1, 1, S.factor >= 60 ? .5 : 1);
      if (fall < 0) { form += dt / Math.max(interval, .25); const r = rMax * Math.cbrt(clamp(form, 0, 1)); drop.scale.set(r, r * 1.1, r); drop.position.set(0, 1.24 - r, 0); drop.visible = r > .004;
        if (form >= 1 && interval < Infinity) { fall = 0; fy = 1.24 - rMax; fv = 0; form = 0; } }
      else {
        fv += 3.2 * rdt; fy -= fv * rdt; drop.position.y = fy; drop.scale.set(rMax * .9, rMax * 1.35, rMax * .9);
        if (fy < .86) { fall = -1; splash = 1; S.drops++; if (S.counting > 0) S.countN++; c.sound.beep(1600 + Math.random() * 200, .03, 'sine', .03); }
      }
      splash = Math.max(0, splash - rdt * 4); pool.scale.set(1 + splash * .06, 1 + splash * .5, 1 + splash * .06);
      // pinza
      clampG.position.y = -.05; wheel.position.y = lerp(-.2, .2, S.open); wheelRot += (S.open - (wheel.userData.prev ?? S.open)) * 18; wheel.userData.prev = S.open; wheel.rotation.x = wheelRot;
      grip.position.y = wheel.position.y;
      // flujo en la línea y nivel de la bolsa
      const mlh = S.gtt * 60 / S.factor;
      const a = flowGeo.attributes.position, tmp = new THREE.Vector3();
      for (let i = 0; i < flowN; i++) { const fu = flowU[i] + dt * (Number.isFinite(mlh) ? mlh : 0) / 3000; flowU[i] = ((fu % 1) + 1) % 1; lineCurve.getPointAt(clamp(flowU[i], 0, 1), tmp); a.setXYZ(i, tmp.x, tmp.y, tmp.z); }
      a.needsUpdate = true;
      S.vol = Math.max(0, S.vol - mlh / 3600 * dt * S.speed); if (S.vol <= 0) S.vol = S.vol0;
      fluid.scale.y = Math.max(.02, S.vol / S.vol0);
      // conteo
      if (S.counting > 0) { S.counting -= dt; if (S.counting <= 0) { const est = S.countN * 4; c.toast(lang === 'en' ? `${S.countN} drops in 15 s × 4 = ${est} drops/min (readout ${fmt(S.gtt)})` : `${S.countN} gotas en 15 s × 4 = ${est} gotas/min (aparato ${fmt(S.gtt)})`, 4200); c.sound.beep(880, .2); } }
      c.state.mG?.(S.counting > 0 ? `${Math.ceil(S.counting)}s` : fmt(gSm)); c.state.mM?.(fmt(mlh, 1));
    });
  }
});
