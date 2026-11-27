// Demo: Dentro del ventilador / Inside the ventilator — pulmones reales (BodyParts3D) + ventilador mecánico simulado
import { createDemo, THREE, drapeBlanket, pillowGeo, pillowMat, holoMesh, gridFloor, loadPack, realMat, pointsMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Modelo de un compartimento: Paw = PEEP + V/C + R·flujo (V en L, C en L/cmH2O, R en cmH2O·s/L)
const S = { mode: 'VC', Vt: .5, Pinsp: 15, PEEP: 5, RR: 14, Ti: 1.0, FiO2: 40, C: .05, R: 10, V: 0, flow: 0, Paw: 5, t: 0, hold: .3,
  ppeak: 0, pplat: 0, vtd: 0, maxV: 0, curPeak: 0, alarm: '' };
const SCEN = { normal: { C: .05, R: 10 }, stiff: { C: .02, R: 10 }, obstr: { C: .05, R: 32 } };
const fmt = (v, d = 0) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);

const chapters = [
  { title: { es: 'El equipo', en: 'The setup' }, cam: { pos: [6.4, 3.6, 13.5], target: [1.5, 2.0, 0] }, labels: [0, 1, 2, 3, 4], xray: false,
    lines: [
      { es: 'Un ventilador mecánico mueve aire hacia los pulmones cuando una persona no puede respirar bien por sí misma.', en: 'A mechanical ventilator moves air into the lungs when someone cannot breathe well on their own.' },
      { es: 'El aire viaja por un circuito corrugado y entra por un tubo endotraqueal; un globo inflado lo sella dentro de la tráquea.', en: 'Air travels through corrugated tubing and enters through an endotracheal tube; an inflated cuff seals it in the trachea.' },
      { es: 'La pantalla muestra tres curvas: presión, flujo y volumen. Son la forma de “ver” lo que pasa dentro.', en: 'The screen shows three curves: pressure, flow and volume. They are how you "see" what happens inside.' }
    ] },
  { title: { es: 'Volumen control', en: 'Volume control' }, cam: { pos: [3.2, 1.9, 6.4], target: [2.6, 1.3, 0] }, labels: [0], xray: true,
    lines: [
      { es: 'En volumen control eliges cuánto aire entra en cada respiración: el volumen corriente.', en: 'In volume control you choose how much air goes in with each breath: the tidal volume.' },
      { es: 'La presión es el resultado. La presión pico suma la resistencia de la vía aérea; la meseta, medida en una pausa, refleja al pulmón.', en: 'Pressure is the result. Peak pressure includes airway resistance; plateau, measured in a pause, reflects the lung.' },
      { es: 'Cambia el volumen y mira cómo cambian las presiones en la pantalla.', en: 'Change the volume and watch the pressures change on the screen.' }
    ], enter: () => { S.mode = 'VC'; } },
  { title: { es: 'Presión control', en: 'Pressure control' }, cam: { pos: [3.2, 1.9, 6.4], target: [2.6, 1.3, 0] }, labels: [0], xray: true,
    lines: [
      { es: 'En presión control eliges la presión; el volumen que entra depende de qué tan distensible es el pulmón.', en: 'In pressure control you set the pressure; the volume that goes in depends on how compliant the lung is.' },
      { es: 'Mira la curva de flujo: empieza alta y va cayendo a medida que el pulmón se llena.', en: 'Watch the flow curve: it starts high and falls as the lung fills.' },
      { es: 'Sube o baja la presión inspiratoria y observa el volumen corriente.', en: 'Raise or lower the inspiratory pressure and watch the tidal volume.' }
    ], enter: () => { S.mode = 'PC'; } },
  { title: { es: 'La PEEP', en: 'PEEP' }, cam: { pos: [-1.2, 1.4, 5.6], target: [0, .9, 0] }, labels: [4], xray: true,
    lines: [
      { es: 'La PEEP es una presión que se mantiene al final de cada exhalación.', en: 'PEEP is pressure kept at the end of each breath out.' },
      { es: 'Evita que los alvéolos se cierren y mejora el intercambio de oxígeno.', en: 'It keeps alveoli from collapsing and improves oxygen exchange.' },
      { es: 'Súbela y verás que los pulmones ya no se desinflan del todo.', en: 'Raise it and you will see the lungs no longer deflate completely.' }
    ] },
  { title: { es: 'Las alarmas', en: 'The alarms' }, cam: { pos: [3.2, 1.9, 6.4], target: [2.6, 1.3, 0] }, labels: [0], xray: true,
    lines: [
      { es: 'Si el pulmón se vuelve rígido, en volumen control suben la pico y la meseta; en presión control baja el volumen.', en: 'If the lung gets stiff, in volume control peak and plateau rise; in pressure control volume falls.' },
      { es: 'Si se obstruye la vía aérea (secreciones, broncoespasmo), sube la pico pero la meseta casi no cambia.', en: 'If the airway is obstructed (secretions, bronchospasm), peak rises but plateau barely changes.' },
      { es: 'Prueba cada caso. Los ajustes reales los decide el equipo clínico para cada paciente.', en: 'Try each case. Real settings are decided by the clinical team for each patient.' }
    ], exit: () => Object.assign(S, SCEN.normal) },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [6.4, 3.6, 13.5], target: [1.5, 2.0, 0] }, labels: [], xray: true,
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 5 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: 'En volumen control, si el pulmón se vuelve rígido…', en: 'In volume control, if the lung becomes stiff…' }, o: [{ es: 'Baja la presión', en: 'Pressure falls' }, { es: 'Suben la presión pico y la meseta', en: 'Peak and plateau pressures rise' }, { es: 'Baja el volumen corriente', en: 'Tidal volume falls' }], a: 1,
    e: { es: 'El volumen está fijo; hace falta más presión para meterlo.', en: 'Volume is fixed; more pressure is needed to deliver it.' } },
  { q: { es: 'Pico alta con meseta normal sugiere…', en: 'High peak with normal plateau suggests…' }, o: [{ es: 'Problema de vía aérea (resistencia)', en: 'An airway problem (resistance)' }, { es: 'Pulmón rígido', en: 'A stiff lung' }, { es: 'PEEP baja', en: 'Low PEEP' }], a: 0,
    e: { es: 'La diferencia pico − meseta refleja la resistencia.', en: 'The peak − plateau gap reflects resistance.' } },
  { q: { es: '¿Para qué sirve la PEEP?', en: 'What is PEEP for?' }, o: [{ es: 'Para que los alvéolos no se cierren al final de la exhalación', en: 'To keep alveoli open at the end of expiration' }, { es: 'Para medir la temperatura', en: 'To measure temperature' }, { es: 'Para aspirar secreciones', en: 'To suction secretions' }], a: 0,
    e: { es: 'Mantiene presión positiva al final de cada ciclo.', en: 'It keeps positive pressure at the end of each cycle.' } }
];

createDemo({
  title: { es: 'Dentro del ventilador', en: 'Inside the ventilator' }, accent: '#3b82f6', bg: '#05070b', bgTop: '#1b2230', fog: .025, floorY: -4.5,
  camera: chapters[0].cam, bloom: { strength: .6, radius: .4, threshold: .45 }, credit: BP3D_CREDIT, sources: { es: 'Ecuación de movimiento del sistema respiratorio (modelo de un compartimento).', en: 'Equation of motion of the respiratory system (single-compartment model).' }, chapters, maxDist: 22,
  action(ui, c, ci) {
    c.state.mA = ui.metric({ es: 'pico / meseta', en: 'peak / plateau' }, 'cmH₂O'); c.state.mV = ui.metric({ es: 'vol. corriente', en: 'tidal volume' }, 'mL');
    if (ci === 1) ui.slider({ es: 'Volumen corriente', en: 'Tidal volume' }, { min: 250, max: 800, step: 10, value: S.Vt * 1000, fmt: (v) => v + ' mL' }, (v) => { S.Vt = v / 1000; });
    if (ci === 2) ui.slider({ es: 'Presión inspiratoria', en: 'Inspiratory pressure' }, { min: 5, max: 30, value: S.Pinsp, fmt: (v) => v + ' cmH₂O' }, (v) => { S.Pinsp = v; });
    if (ci === 3) ui.slider('PEEP', { min: 0, max: 15, value: S.PEEP, fmt: (v) => v + ' cmH₂O' }, (v) => { S.PEEP = v; });
    if (ci === 4) {
      ui.seg([{ value: 'VC', label: { es: 'Volumen', en: 'Volume' } }, { value: 'PC', label: { es: 'Presión', en: 'Pressure' } }], S.mode, (v) => { S.mode = v; });
      ui.seg([{ value: 'normal', label: { es: 'Normal', en: 'Normal' } }, { value: 'stiff', label: { es: 'Pulmón rígido', en: 'Stiff lung' } }, { value: 'obstr', label: { es: 'Obstrucción', en: 'Obstruction' } }], 'normal', (v) => Object.assign(S, SCEN[v]));
    }
    if (ci === 5) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#3b82f6', 40, -4.5));
    const CEN = [0, -110, 1255], SC = 1 / 140, L = (x, y, z) => V((x - CEN[0]) * SC, (z - CEN[2]) * SC, -(y - CEN[1]) * SC);
    const [P, UB] = await Promise.all([
      loadPack('thorax', { center: CEN, scale: SC, crop: { diaphragm: [[-200, -260, 1100], [200, 40, 1400]], spine: [[-200, -260, 1080], [200, 40, 1420]] } }),
      loadPack('body', { center: CEN, scale: SC })]);
    // ---- paciente boca arriba en cama de UCI: cabeza a la izquierda, lado derecho hacia la cámara ----
    const torso = new THREE.Group(); scene.add(torso); const tmp = V(0, 0, 0);
    { const mL = new THREE.Matrix4().makeBasis(V(0, 1, 0), V(0, 0, 1), V(1, 0, 0)), mW = new THREE.Matrix4().makeBasis(V(-1, 0, 0), V(0, 1, 0), V(0, 0, -1)); torso.quaternion.setFromRotationMatrix(mW.multiply(mL.transpose())); }
    const G = P.geo;
    const mk = (geo, color, real, opts, ghost) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .015, rim: .45, intensity: .75, edges: false }); torso.add(m); return m; };
    mk(G.ribsR, '#cbd5e1', 'bone', {}, .1); mk(G.ribsL, '#cbd5e1', 'bone', {}, .1); mk(G.spine, '#cbd5e1', 'bone', {}, .15); mk(G.sternum, '#cbd5e1', 'bone', {}, .12);
    const lungs = [mk(G.lungR, '#7dd3fc', 'lung', {}, .35), mk(G.lungL, '#7dd3fc', 'lung', {}, .35)];
    mk(G.heart, '#ff5a6e', 'muscle', {}, .25); mk(G.trachea, '#e0f7ff', 'cartilage', {}, .5);
    const bron = holoMesh(G.bronchi, '#e0f7ff', { real: 'cartilage', realOpts: { color: '#e9d8cf' }, ghost: .8, opacity: .05, rim: .6, edges: false }); torso.add(bron);
    mk(G.diaphragm, '#f472b6', 'diaphragm', { side: THREE.DoubleSide }, .3);
    const lc = lungs.map((l) => l.userData.real.geometry.boundingSphere.center.clone());
    // piel real de todo el cuerpo (cabeza a cadera, con brazos)
    const skin = holoMesh(UB.geo.skin, '#ffb38a', { real: 'skin', realOpts: { side: THREE.DoubleSide, clearcoat: .04, roughness: .62, sheen: .45 }, ghost: .06, opacity: .002, rim: .1, intensity: .3, edges: false }); torso.add(skin);
    torso.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(skin.userData.real, true); torso.position.y = -bb.min.y + .12; torso.updateMatrixWorld(true);
    // cama, colchón, barandal y almohada
    const matt = new THREE.Mesh(new THREE.BoxGeometry(14, 1.0, 5.6), new THREE.MeshPhysicalMaterial({ color: '#9fadb8', roughness: .92, sheen: .25, sheenColor: new THREE.Color('#d5dde3') })); matt.position.set(.6, -.38, 0); matt.receiveShadow = true; scene.add(matt);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(14.4, .3, 6.0), realMat('metal', { color: '#8b939c', roughness: .4 })); frame.position.set(.6, -1.05, 0); scene.add(frame);
    for (const x of [-6.2, 7.4]) for (const z of [-2.6, 2.6]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 3.4, 12), realMat('metal', { color: '#9aa2ab' })); leg.position.set(x, -2.8, z); scene.add(leg); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(5.5, .9, .08), realMat('plastic', { color: '#c9d0d6', roughness: .5 })); rail.position.set(2.4, .55, -2.9); scene.add(rail);
    const pillow = new THREE.Mesh(pillowGeo(), pillowMat()); pillow.castShadow = true; pillow.scale.set(1.3, .32, 2.0); pillow.position.copy(torso.localToWorld(L(0, -40, 1590))).setY(.12); pillow.receiveShadow = true; scene.add(pillow);
    // cobija sobre caderas y piernas: tapa el corte del modelo y sugiere las piernas debajo
    torso.updateMatrixWorld(true); scene.add(drapeBlanket(skin.userData.real, { bedTop: .12, x0: torso.localToWorld(L(0, 0, 1110)).x, x1: 7.5, zc: torso.localToWorld(L(0, -110, 1100)).z, hipHalf: 150 * SC, torsoHalf: 172 * SC }));
    // ---- tubo endotraqueal con globo: boca → orofaringe → laringe → tráquea ----
    const tb = G.trachea.boundingBox, tTop = V((tb.min.x + tb.max.x) / 2, tb.max.y, (tb.min.z + tb.max.z) / 2), tBot = V(tTop.x, tb.min.y + 25 * SC, tTop.z);
    const mouth = L(0, -198, 1515);
    const ett = new THREE.CatmullRomCurve3([L(0, -250, 1520), mouth, L(0, -160, 1506), L(0, -120, 1476), L(0, -126, 1418), tTop, tBot]);
    torso.add(new THREE.Mesh(new THREE.TubeGeometry(ett, 80, 5.2 * SC, 18, false), realMat('tube', { color: '#f4fbff', transmission: .5, opacity: 1 })));
    const cuff = new THREE.Mesh(new THREE.SphereGeometry(10 * SC, 24, 16), realMat('glass', { color: '#cfe8ff', transmission: .6, roughness: .2 })); cuff.scale.set(1, 1.6, 1); cuff.position.copy(tBot).add(V(0, 15 * SC, 0)); torso.add(cuff);
    const connector = new THREE.Mesh(new THREE.CylinderGeometry(7.5 * SC, 7.5 * SC, 20 * SC, 20), realMat('plasticTint', { color: '#2d6fd6' })); connector.position.copy(L(0, -262, 1521)); connector.rotation.x = Math.PI / 2; torso.add(connector);
    // ---- ventilador en su pedestal junto a la cabecera ----
    const vent = new THREE.Group(); vent.position.set(-4.6, 1.1, 2.9); vent.rotation.y = .75; vent.scale.setScalar(1.3); scene.add(vent);
    const rr = (w, h, d, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -h / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y); const g = new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 4 }); g.translate(0, 0, -d / 2); return g; };
    const body = new THREE.Mesh(rr(2.2, 1.6, .5, .12), realMat('plastic', { color: '#b9c0c7' })); body.castShadow = true; body.position.y = 1.4; vent.add(body);
    const scr = document.createElement('canvas'); scr.width = 1024; scr.height = 680; const sg = scr.getContext('2d'); const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 1.24), new THREE.MeshBasicMaterial({ map: scrTex, color: '#cfd5da' })); screen.position.set(0, 1.42, .3); vent.add(screen);
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.34), realMat('plasticDark', { color: '#1b2129' })); bezel.position.set(0, 1.42, .295); vent.add(bezel);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 4.4, 16), realMat('metal')); pole.position.y = -1.9; vent.add(pole);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.7, .75, .08, 5), realMat('plasticDark', { color: '#454d57' })); base.position.y = -4.15; base.castShadow = true; vent.add(base);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .08, 24), realMat('plasticTint', { color: '#3b82f6' })); knob.rotation.x = Math.PI / 2; knob.position.set(.85, .78, .3); vent.add(knob);
    const humid = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .5, 24), realMat('glass', { color: '#dff2ff', transmission: .7, roughness: .1 })); humid.position.set(-.75, .15, .25); vent.add(humid);
    // ---- circuito corrugado: del ventilador, por el borde de la cama, a la pieza en Y ----
    vent.updateMatrixWorld(true);
    const portI = vent.localToWorld(V(-.5, .55, .2)), portE = vent.localToWorld(V(-.2, .55, .2)), yPiece = connector.getWorldPosition(V(0, 0, 0)).add(V(0, 12 * SC, 0));
    const corrugated = (curve, r) => { const g = new THREE.TubeGeometry(curve, 260, r, 14, false), p = g.attributes.position, n = g.attributes.normal;
      for (let i = 0; i < p.count; i++) { const ring = Math.floor(i / 15); const k = 1 + .18 * Math.sin(ring * 1.7); p.setXYZ(i, p.getX(i) + n.getX(i) * r * (k - 1), p.getY(i) + n.getY(i) * r * (k - 1), p.getZ(i) + n.getZ(i) * r * (k - 1)); } g.computeVertexNormals(); return g; };
    const insC = new THREE.CatmullRomCurve3([portI, portI.clone().add(V(.5, -.8, -.3)), V(-3.0, .55, 2.75), V(-2.2, .85, 1.9), yPiece.clone().add(V(-.25, .32, .75)), yPiece.clone().add(V(0, .16, .18)), yPiece]);
    const expC = new THREE.CatmullRomCurve3([portE, portE.clone().add(V(.6, -1.0, -.2)), V(-2.8, .5, 2.95), V(-2.0, .8, 2.1), yPiece.clone().add(V(-.05, .34, .85)), yPiece.clone().add(V(.05, .16, .22)), yPiece.clone().add(V(.02, .04, .04))]);
    const ra = 11 * SC * 1.2;
    scene.add(new THREE.Mesh(corrugated(insC, ra), realMat('tube', { color: '#e8f4ff', transmission: .45 })), new THREE.Mesh(corrugated(expC, ra), realMat('tube', { color: '#dfe9f5', transmission: .45 })));
    const yp = new THREE.Mesh(new THREE.CylinderGeometry(ra * 1.3, ra * 1.3, 40 * SC, 16), realMat('plastic', { color: '#e9eef2' })); yp.position.copy(yPiece).add(V(0, 20 * SC, 0)); scene.add(yp);
    // aire en movimiento por el tubo
    const airN = 120, airGeo = new THREE.BufferGeometry(); airGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(airN * 3), 3));
    torso.add(new THREE.Points(airGeo, pointsMat('#bfe9ff', .03, .9))); const airU = Float32Array.from({ length: airN }, () => Math.random());
    // ---- cámaras sobre la anatomía ----
    { const chest = torso.localToWorld(L(0, -150, 1290)), w = (v) => v.toArray(), vw = vent.localToWorld(V(0, 1.4, 0));
      chapters[0].cam = { pos: w(chest.clone().add(V(-.2, 5.4, 11.2))), target: w(chest.clone().add(V(-2.3, .1, 1.3))) };
      for (const k of [1, 2, 4]) chapters[k].cam = { pos: w(vw.clone().add(V(1.6, .6, 3.6))), target: w(vw.clone().add(V(.6, -.4, -.6))) };
      chapters[3].cam = { pos: w(chest.clone().add(V(.8, 4.6, 4.0))), target: w(chest.clone().add(V(-.4, -.6, -.2))) };
      chapters[5].cam = chapters[0].cam; }
    // etiquetas
    c.label({ es: 'Ventilador', en: 'Ventilator' }, null, vent.localToWorld(V(0, 2.4, 0)), '#3b82f6');
    c.label({ es: 'Tubo endotraqueal', en: 'Endotracheal tube' }, { es: 'entra por la boca', en: 'goes in through the mouth' }, torso.localToWorld(L(0, -250, 1525)), '#e0f7ff');
    c.label({ es: 'Globo (cuff)', en: 'Cuff' }, { es: 'sella la tráquea', en: 'seals the trachea' }, cuff, '#cfe8ff');
    c.label({ es: 'Circuito', en: 'Circuit' }, null, insC.getPointAt(.55), '#e8f4ff');
    c.label({ es: 'Pulmones', en: 'Lungs' }, null, torso.localToWorld(lc[1].clone().add(V(.3, 0, .5))), '#7dd3fc');
    const mon = c.side({ es: 'Pantalla del ventilador', en: 'Ventilator screen' }, 150);
    // trazos de barrido
    const N = 512, bufP = new Float32Array(N).fill(NaN), bufF = new Float32Array(N).fill(NaN), bufV = new Float32Array(N).fill(NaN); let wx = 0, acc = 0;
    function drawScreen(g, w, h, big) {
      g.fillStyle = '#0a1018'; g.fillRect(0, 0, w, h);
      const plotW = w * (big ? .72 : 1), rows = [['Paw', bufP, '#facc15', 0, 40, 'cmH₂O'], [lang === 'en' ? 'Flow' : 'Flujo', bufF, '#34d399', -1.2, 1.2, 'L/s'], ['Vol', bufV, '#60a5fa', 0, .9, 'L']];
      rows.forEach(([name, b, col, lo, hi, unit], r) => {
        const y0 = h * r / 3, rh = h / 3; g.strokeStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.moveTo(0, y0 + rh - 1); g.lineTo(plotW, y0 + rh - 1); g.stroke();
        if (lo < 0) { const yz = y0 + rh * (1 - (0 - lo) / (hi - lo)); g.strokeStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.moveTo(0, yz); g.lineTo(plotW, yz); g.stroke(); }
        g.fillStyle = col; g.font = `700 ${big ? 26 : 22}px "Manrope Variable",system-ui`; g.fillText(`${name} (${unit})`, 10, y0 + (big ? 32 : 26));
        g.strokeStyle = col; g.lineWidth = big ? 3.5 : 3; g.beginPath(); let pen = false;
        for (let i = 0; i < N; i++) { const v = b[i]; if (Number.isNaN(v)) { pen = false; continue; } const px = i / N * plotW, py = y0 + rh * (1 - (clamp(v, lo, hi) - lo) / (hi - lo)) * .85 + rh * .1; if (pen) g.lineTo(px, py); else { g.moveTo(px, py); pen = true; } }
        g.stroke();
      });
      if (big) {
        const x = plotW + 16; const item = (lab, val, y, col = '#e6edf3') => { g.fillStyle = '#8aa0b4'; g.font = '600 22px "Manrope Variable",system-ui'; g.fillText(lab, x, y); g.fillStyle = col; g.font = '800 44px "Unbounded Variable",system-ui'; g.fillText(val, x, y + 46); };
        item(lang === 'en' ? 'Mode' : 'Modo', S.mode, 40, '#60a5fa'); item(lang === 'en' ? 'Ppeak' : 'Ppico', fmt(S.ppeak), 140, S.ppeak > 35 ? '#f87171' : '#facc15'); item(lang === 'en' ? 'Pplat' : 'Pmeseta', fmt(S.pplat), 240); item('PEEP', fmt(S.PEEP), 340); item('Vt', fmt(S.vtd * 1000) + ' mL', 440, '#60a5fa'); item('FiO₂', S.FiO2 + '%', 540);
        if (S.alarm) { g.fillStyle = Math.floor(performance.now() / 400) % 2 ? '#b91c1c' : '#7f1d1d'; g.fillRect(0, 0, plotW, 54); g.fillStyle = '#fff'; g.font = '800 30px "Manrope Variable",system-ui'; g.fillText('⚠ ' + S.alarm, 16, 38); }
      }
    }
    let scrT = 0, cycStart = 0, peakNow = 0, vmaxNow = 0;
    c.onFrame((dt, rdt) => {
      const T = 60 / S.RR, Ti = S.Ti, tc = S.t % T, inspPhase = tc < Ti;
      if (S.t - cycStart >= T) { cycStart += T; S.ppeak = peakNow; S.vtd = vmaxNow; peakNow = 0; vmaxNow = 0;
        S.alarm = S.ppeak > 35 ? (lang === 'en' ? 'HIGH PRESSURE' : 'PRESIÓN ALTA') : (S.vtd < .3 ? (lang === 'en' ? 'LOW TIDAL VOLUME' : 'VOLUMEN BAJO') : '');
        if (S.alarm) c.sound.beep(880, .25, 'square', .03); }
      S.t += dt;
      // dinámica
      let flow;
      if (inspPhase) {
        if (S.mode === 'VC') { const tf = Ti - S.hold; flow = tc < tf ? S.Vt / tf : 0; S.Paw = S.PEEP + S.V / S.C + flow * S.R; if (tc >= tf) S.pplat = S.Paw; }
        else { S.Paw = S.PEEP + S.Pinsp; flow = (S.Paw - S.PEEP - S.V / S.C) / S.R; }
      } else { S.Paw = S.PEEP; flow = -(S.V / S.C) / S.R; }
      if (S.mode === 'PC') S.pplat = S.PEEP + S.Pinsp;
      S.V = Math.max(0, S.V + flow * dt); S.flow = flow; peakNow = Math.max(peakNow, S.Paw); vmaxNow = Math.max(vmaxNow, S.V);
      // pulmones (volumen sobre la PEEP más el volumen que mantiene la PEEP)
      const n = (S.V + S.PEEP * S.C * .4) / .6;
      lungs.forEach((l, i) => { const m = l; m.scale.setScalar(1 + .09 * n); m.position.copy(lc[i]).multiplyScalar(-.09 * n); });
      cuff.scale.set(1, 1.6, 1);
      // aire en el tubo
      const a = airGeo.attributes.position;
      for (let i = 0; i < airN; i++) { airU[i] = (airU[i] + dt * flow * .9 + 1) % 1; ett.getPointAt(airU[i], tmp); a.setXYZ(i, tmp.x + (Math.random() - .5) * .02, tmp.y, tmp.z + (Math.random() - .5) * .02); }
      a.needsUpdate = true;
      // trazos
      acc += dt * N / 8; while (acc >= 1) { acc -= 1; bufP[wx] = S.Paw; bufF[wx] = flow; bufV[wx] = S.V; for (let k = 1; k < 14; k++) { bufP[(wx + k) % N] = NaN; bufF[(wx + k) % N] = NaN; bufV[(wx + k) % N] = NaN; } wx = (wx + 1) % N; }
      scrT += rdt; if (scrT > .05) { scrT = 0; drawScreen(sg, scr.width, scr.height, true); scrTex.needsUpdate = true; drawScreen(mon.ctx, mon.canvas.width, mon.canvas.height, false); }
      mon.right.textContent = S.alarm || `${S.mode} · PEEP ${S.PEEP}`;
      c.state.mA?.(`${fmt(S.ppeak)}/${fmt(S.pplat)}`); c.state.mV?.(fmt(S.vtd * 1000));
    });
  }
});
