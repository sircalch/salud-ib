// Demo: Cómo respiras / How you breathe
import { createDemo, THREE, holoMesh, pointsMat, gridFloor, sweepTrace, loadPack, realMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const C = { lung: '#7dd3fc', air: '#e0f7ff', rib: '#cbd5e1', dia: '#f472b6', heart: '#ff5a6e', o2: '#bfe9ff', co2: '#fbbf24', cap: '#ff4d6d' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
// Modelo de un compartimento: Pmus o Pvent = V/C + R·dV/dt
const S = { mode: 'auto', vent: false, C: .1, R: 2, V: 0, flow: 0, palv: 0, pmus: 0, holding: false, cyc: 0, rr: 14, peep: 5 };


const chapters = [
  { title: { es: 'Dos pulmones y un músculo', en: 'Two lungs and a muscle' }, cam: { pos: [3.2, 1.2, 9.8], target: [0, .2, 0] }, labels: [0, 1, 2, 3, 4], xray: false,
    lines: [
      { es: 'Los pulmones no tienen músculo propio. Los mueve el diafragma, un músculo en forma de cúpula.', en: 'The lungs have no muscle of their own. They are moved by the diaphragm, a dome-shaped muscle.' },
      { es: 'El aire baja por la tráquea y se reparte por un árbol de bronquios cada vez más finos.', en: 'Air flows down the trachea and spreads through a tree of ever-finer bronchi.' },
      { es: 'Al final de cada rama hay racimos de alvéolos, donde ocurre el intercambio de gases.', en: 'At the end of every branch are clusters of alveoli, where gas exchange happens.' }
    ], enter: (c) => { c.controls.autoRotate = true; c.controls.autoRotateSpeed = .5; S.mode = 'auto'; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'El diafragma baja', en: 'The diaphragm moves down' }, cam: { pos: [5.6, -.6, 6.6], target: [0, -.6, 0] }, labels: [3],
    lines: [
      { es: 'Mantén presionado para inhalar: el diafragma se contrae y baja, y las costillas se abren.', en: 'Hold to breathe in: the diaphragm contracts and moves down, and the ribs swing out.' },
      { es: 'El tórax crece, los pulmones se estiran con él y entra aire.', en: 'The chest gets bigger, the lungs stretch with it and air flows in.' },
      { es: 'Suelta para exhalar: en reposo, sacar el aire no cuesta esfuerzo; el pulmón regresa solo, como un resorte.', en: 'Let go to breathe out: at rest it takes no effort; the lung springs back on its own.' }
    ], enter: () => { S.mode = 'manual'; }, exit: () => { S.mode = 'auto'; S.holding = false; } },
  { title: { es: 'Presión negativa', en: 'Negative pressure' }, cam: { pos: [2.6, 1.0, 8.4], target: [0, .4, 0] }, labels: [], xray: true,
    lines: [
      { es: 'Al inhalar, la presión dentro de los alvéolos baja un poco por debajo de la del aire exterior.', en: 'When you breathe in, pressure inside the alveoli drops slightly below the air outside.' },
      { es: 'El aire siempre va de mayor a menor presión: por eso entra.', en: 'Air always moves from higher to lower pressure: that is why it flows in.' },
      { es: 'Mira el monitor: la presión baja al inhalar y sube al exhalar; el volumen dibuja la respiración.', en: 'Watch the monitor: pressure dips on the way in and rises on the way out; volume traces each breath.' }
    ] },
  { title: { es: 'Los alvéolos', en: 'The alveoli' }, cam: { pos: [7.4, 1.6, 2.9], target: [5.95, .9, 0], dur: 2.4 }, labels: [5, 6], xray: true,
    lines: [
      { es: 'Cada alvéolo es una bolsita de aire envuelta en capilares.', en: 'Each alveolus is a tiny air sac wrapped in capillaries.' },
      { es: 'El oxígeno cruza a la sangre; el dióxido de carbono sale hacia el aire.', en: 'Oxygen crosses into the blood; carbon dioxide leaves into the air.' },
      { es: 'Juntos suman una superficie del tamaño de media cancha de tenis.', en: 'Together they add up to about half a tennis court of surface.' }
    ] },
  { title: { es: 'Un pulmón rígido', en: 'A stiff lung' }, cam: { pos: [3.0, .8, 8.8], target: [0, .2, 0] }, labels: [],
    lines: [
      { es: 'La distensibilidad dice cuánto volumen entra por cada unidad de presión.', en: 'Compliance tells you how much volume goes in per unit of pressure.' },
      { es: 'En un pulmón rígido, como en la fibrosis, el mismo esfuerzo mueve mucho menos aire.', en: 'In a stiff lung, as in fibrosis, the same effort moves much less air.' },
      { es: 'Compara los dos casos y mira el volumen en el monitor.', en: 'Compare both cases and watch the volume on the monitor.' }
    ], exit: () => { S.C = .1; } },
  { title: { es: 'Con ventilador', en: 'On a ventilator' }, cam: { pos: [3.0, 1.0, 9.0], target: [0, .3, 0] }, labels: [0], xray: true,
    lines: [
      { es: 'Un ventilador hace lo contrario que tu diafragma: empuja aire con presión positiva.', en: 'A ventilator does the opposite of your diaphragm: it pushes air in with positive pressure.' },
      { es: 'Ahora la presión sube al inhalar. Al final queda una presión mínima, la PEEP, que evita que los alvéolos se cierren.', en: 'Now pressure rises on the way in. A minimum pressure, PEEP, stays at the end so alveoli do not collapse.' },
      { es: 'Los parámetros reales los decide el equipo clínico para cada paciente.', en: 'Real settings are chosen by the clinical team for each patient.' }
    ], enter: () => { S.vent = true; }, exit: () => { S.vent = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [3.2, 1.2, 9.8], target: [0, .2, 0] }, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 6 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Qué músculo hace la mayor parte del trabajo al inhalar en reposo?', en: 'Which muscle does most of the work when you breathe in at rest?' }, o: [{ es: 'El corazón', en: 'The heart' }, { es: 'El diafragma', en: 'The diaphragm' }, { es: 'Los bronquios', en: 'The bronchi' }], a: 1,
    e: { es: 'Al contraerse baja y agranda el tórax.', en: 'When it contracts it moves down and enlarges the chest.' } },
  { q: { es: 'Durante una inhalación espontánea, la presión alveolar es…', en: 'During a spontaneous breath in, alveolar pressure is…' }, o: [{ es: 'Un poco menor que la atmosférica', en: 'Slightly below atmospheric' }, { es: 'Mucho mayor que la atmosférica', en: 'Much higher than atmospheric' }, { es: 'Siempre cero', en: 'Always zero' }], a: 0,
    e: { es: 'Esa pequeña diferencia hace que entre el aire.', en: 'That small difference draws air in.' } },
  { q: { es: 'Si la distensibilidad baja (pulmón rígido), con el mismo esfuerzo…', en: 'If compliance falls (stiff lung), with the same effort…' }, o: [{ es: 'Entra más aire', en: 'More air goes in' }, { es: 'Entra menos aire', en: 'Less air goes in' }, { es: 'No cambia nada', en: 'Nothing changes' }], a: 1,
    e: { es: 'Volumen = distensibilidad × presión.', en: 'Volume = compliance × pressure.' } }
];

createDemo({
  title: { es: 'Cómo respiras', en: 'How you breathe' }, accent: '#7dd3fc', bg: '#05070b', bgTop: '#1d2432', fog: .03, floorY: -3.0,
  camera: chapters[0].cam, thumb: { pos: [2.2, .8, 7.6], target: [0, .2, 0], chapter: 0 }, credit: BP3D_CREDIT, sources: { es: 'Modelo de un compartimento: presión = volumen/distensibilidad + resistencia × flujo.', en: 'Single-compartment model: pressure = volume/compliance + resistance × flow.' }, bloom: { strength: .72, radius: .5, threshold: .2 }, maxDist: 20, chapters,
  action(ui, c, ci) {
    c.state.mV = ui.metric({ es: 'volumen', en: 'volume' }, 'mL'); c.state.mP = ui.metric({ es: 'presión alveolar', en: 'alveolar pressure' }, 'cmH₂O');
    if (ci === 1) ui.hold({ es: 'Mantén para inhalar', en: 'Hold to breathe in' }, (v) => { S.holding = v; c.sound.breath(v ? 1.6 : 1.9, v ? .05 : .03, v ? 650 : 420); });
    if (ci === 4) ui.seg([{ value: .1, label: { es: 'Pulmón sano', en: 'Healthy lung' } }, { value: .035, label: { es: 'Pulmón rígido', en: 'Stiff lung' } }], S.C, (v) => { S.C = v; });
    if (ci === 5) ui.slider('PEEP', { min: 0, max: 12, value: S.peep, fmt: (v) => v + ' cmH₂O' }, (v) => { S.peep = v; });
    if (ci === 6) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#7dd3fc', 40, -3.0));
    const P = await loadPack('thorax', { center: [0, -110, 1255], scale: 1 / 70, crop: { diaphragm: [[-200, -260, 1100], [200, 40, 1400]], spine: [[-200, -260, 1080], [200, 40, 1420]] } });
    const G = P.geo, torso = new THREE.Group(); scene.add(torso);
    const tmp = V(0, 0, 0);
    const mk = (geo, color, real, opts, ghost) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .015, rim: .45, intensity: .75, edges: false }); torso.add(m); return m; };
    const ribsR = mk(G.ribsR, C.rib, 'bone', {}, .12), ribsL = mk(G.ribsL, C.rib, 'bone', {}, .12);
    mk(G.spine, C.rib, 'bone', {}, .18); mk(G.sternum, C.rib, 'bone', {}, .15);
    const lungR = mk(G.lungR, C.lung, 'lung', {}, .1), lungL = mk(G.lungL, C.lung, 'lung', {}, .1);
    mk(G.heart, C.heart, 'muscle', {}, .1);
    const trachea = mk(G.trachea, C.air, 'cartilage', {}, .2);
    const bronchi = holoMesh(G.bronchi, C.air, { real: 'cartilage', realOpts: { color: '#e9d8cf' }, ghost: .35, opacity: .05, rim: .6, intensity: .9, edges: false }); torso.add(bronchi);
    // árbol vascular pulmonar real (visible en rayos X): arteria en azul (sangre sin oxígeno), venas en rojo
    const PV = await loadPack('pvessels', { center: [0, -110, 1255], scale: 1 / 70 });
    const pv = new THREE.Group(); torso.add(pv);
    pv.add(new THREE.Mesh(PV.geo.artery, realMat('vein', { color: '#3f55c8' })), new THREE.Mesh(PV.geo.veins, realMat('artery', { color: '#c43a4a' }))); pv.visible = false;
    const dia = mk(G.diaphragm, C.dia, 'diaphragm', { side: THREE.DoubleSide }, .2);
    { const cut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 1.5); dia.userData.real.material.clippingPlanes = [cut]; dia.userData.real.material.clipShadows = true; }
    // centros para deformar
    const center = (geo) => geo.boundingSphere.center.clone();
    const deformable = (geo, fn) => { const pa = geo.attributes.position, b = new Float32Array(pa.array); return { pa, b, fn, bb: geo.boundingBox.clone() }; };
    const cR = center(G.lungR), cL = center(G.lungL), diaBB = G.diaphragm.boundingBox, spineZ = G.spine.boundingSphere.center.z;
    const lungFn = (c0, bb) => (x, y, z, n, out) => { const k = 1 - (y - bb.min.y) / (bb.max.y - bb.min.y); out.set(c0.x + (x - c0.x) * (1 + .05 * n), y - .32 * n * k * k, c0.z + (z - c0.z) * (1 + .045 * n)); };
    const D = [
      deformable(G.lungR, lungFn(cR, G.lungR.boundingBox)), deformable(G.lungL, lungFn(cL, G.lungL.boundingBox)),
      deformable(G.diaphragm, (x, y, z, n, out) => { const k = (y - diaBB.min.y) / (diaBB.max.y - diaBB.min.y); out.set(x * (1 + .02 * n), y - .34 * n * (.25 + .75 * k), z); }),
      deformable(G.ribsR, (x, y, z, n, out) => { const k = clamp((y + 2) / 4, 0, 1); out.set(x * (1 + .03 * n * k), y + .04 * n * k, spineZ + (z - spineZ) * (1 + .045 * n * k)); }),
      deformable(G.ribsL, (x, y, z, n, out) => { const k = clamp((y + 2) / 4, 0, 1); out.set(x * (1 + .03 * n * k), y + .04 * n * k, spineZ + (z - spineZ) * (1 + .045 * n * k)); }),
      deformable(G.sternum, (x, y, z, n, out) => out.set(x, y + .04 * n, spineZ + (z - spineZ) * (1 + .045 * n)))
    ];
    const applyBreath = (n) => { for (const d of D) { const a = d.pa.array, b = d.b; for (let i = 0; i < a.length; i += 3) { d.fn(b[i], b[i + 1], b[i + 2], n, tmp); a[i] = tmp.x; a[i + 1] = tmp.y; a[i + 2] = tmp.z; } d.pa.needsUpdate = true; } };
    // aire: de la tráquea a puntos del árbol bronquial
    const tb = G.trachea.boundingBox, tTop = V((tb.min.x + tb.max.x) / 2, tb.max.y, (tb.min.z + tb.max.z) / 2), carina = V(tTop.x, tb.min.y + .05, tTop.z);
    const bp = G.bronchi.attributes.position, targets = []; for (let i = 0; i < bp.count; i += 5) { tmp.fromBufferAttribute(bp, i); targets.push(tmp.clone()); }
    const airN = 260, airGeo = new THREE.BufferGeometry(); airGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(airN * 3), 3));
    const airPts = new THREE.Points(airGeo, pointsMat(C.air, .07, 1)); torso.add(airPts);
    const air = Array.from({ length: airN }, () => ({ t: targets[Math.floor(Math.random() * targets.length)], u: Math.random() }));
    // alvéolos (vista ampliada, a la derecha)
    const alv = new THREE.Group(); alv.position.set(6.2, .9, 0); scene.add(alv);
    // acino pulmonar: bronquiolo terminal → conductos alveolares → racimos de alvéolos con red capilar
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const tissue = realMat('lung', { color: '#e6a3a8', transmission: .2, thickness: .15, roughness: .55, sheen: .8 });
    const bro = V(-.5, .35, 0);
    alv.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(-1.7, 1.25, 0), V(-1.0, .75, .05), bro]), 30, .11, 14, false), realMat('cartilage', { color: '#d9b9b2' })));
    const ends = [V(.15, .62, .38), V(.25, -.12, -.34), V(-.12, -.5, .38)];
    const sacs = [], caps = [];
    const alvGeo = (r) => { const g = new THREE.IcosahedronGeometry(r, 3), q = g.attributes.position, v = V(0, 0, 0); const k1 = rnd() * 9, k2 = rnd() * 9;
      for (let i = 0; i < q.count; i++) { v.fromBufferAttribute(q, i); const n = 1 + .07 * Math.sin(v.x * 18 + k1) * Math.sin(v.y * 15 + k2) + .05 * Math.sin(v.z * 22 + k1); v.multiplyScalar(n); q.setXYZ(i, v.x, v.y, v.z); } g.computeVertexNormals(); return g; };
    for (const E of ends) {
      const duct = new THREE.CatmullRomCurve3([bro, bro.clone().lerp(E, .5).add(V(0, .05, 0)), E]);
      alv.add(new THREE.Mesh(new THREE.TubeGeometry(duct, 20, .065, 10, false), tissue));
      for (let i = 0; i < 13; i++) {
        const t = .35 + .65 * rnd(); duct.getPointAt(t, tmp); const d = V(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), r = .1 + .07 * rnd();
        const c0 = tmp.clone().addScaledVector(d, .08 + r * .9);
        const m = new THREE.Mesh(alvGeo(r), tissue); m.position.copy(c0); m.castShadow = true; alv.add(m); sacs.push(m);
        for (let j = 0; j < 4; j++) { // capilares que abrazan el alvéolo
          const ax = V(rnd() - .5, rnd() - .5, rnd() - .5).normalize(), u0 = V(1, 0, 0).cross(ax).normalize(), w0 = ax.clone().cross(u0), ph = rnd() * 6.28, R = r * 1.04;
          const pts = Array.from({ length: 14 }, (_, k) => { const a2 = ph + k / 13 * Math.PI * 1.5; return c0.clone().addScaledVector(u0, Math.cos(a2) * R).addScaledVector(w0, Math.sin(a2) * R); });
          const cv = new THREE.CatmullRomCurve3(pts); caps.push(cv);
          alv.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 28, .011, 6, false), realMat('artery', { color: '#a3192a' })));
        }
      }
    }
    const capCurve = caps[0];
    // glóbulos rojos bicóncavos (tamaño exagerado para que se vean)
    const prof = []; for (let i = 0; i <= 16; i++) { const x = i / 16; prof.push(new THREE.Vector2(x, .5 * Math.sqrt(Math.max(0, 1 - x * x)) * (.14 + 2 * x * x - 1.12 * x ** 4))); }
    for (let i = 16; i >= 0; i--) { const x = i / 16; prof.push(new THREE.Vector2(x, -.5 * Math.sqrt(Math.max(0, 1 - x * x)) * (.14 + 2 * x * x - 1.12 * x ** 4))); }
    const rbcGeo = new THREE.LatheGeometry(prof, 24); rbcGeo.scale(.05, .05, .05); rbcGeo.computeVertexNormals();
    const RBC_N = 90, rbc = new THREE.InstancedMesh(rbcGeo, new THREE.MeshPhysicalMaterial({ roughness: .35, clearcoat: .4, sheen: .5, sheenColor: new THREE.Color('#ff9a9a') }), RBC_N);
    rbc.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(RBC_N * 3), 3); alv.add(rbc);
    const cells = Array.from({ length: RBC_N }, () => ({ c: caps[Math.floor(rnd() * caps.length)], u: rnd(), sp: .25 + .2 * rnd(), rot: new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6) }));
    const gN = 80, gasGeo = new THREE.BufferGeometry(); gasGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(gN * 3), 3));
    const co2Geo = new THREE.BufferGeometry(); co2Geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(gN * 3), 3));
    alv.add(new THREE.Points(gasGeo, pointsMat(C.o2, .05, 1))); alv.add(new THREE.Points(co2Geo, pointsMat(C.co2, .05, 1)));
    const gas = Array.from({ length: gN }, () => { const sac = sacs[Math.floor(Math.random() * sacs.length)]; return { k: Math.random(), sac, cap: caps[sacs.indexOf(sac) * 4], cu: Math.random() }; });

    const bbR = G.lungR.boundingBox, bbL = G.lungL.boundingBox;
    c.label({ es: 'Tráquea', en: 'Trachea' }, null, tTop.clone().add(V(.35, .1, 0)), C.air);
    c.label({ es: 'Pulmón derecho', en: 'Right lung' }, { es: '3 lóbulos', en: '3 lobes' }, V(bbR.min.x - .2, (bbR.min.y + bbR.max.y) / 2 + .6, cR.z + .4), C.lung);
    c.label({ es: 'Pulmón izquierdo', en: 'Left lung' }, { es: '2 lóbulos', en: '2 lobes' }, V(bbL.max.x + .2, (bbL.min.y + bbL.max.y) / 2 + .6, cL.z + .4), C.lung);
    c.label({ es: 'Diafragma', en: 'Diaphragm' }, { es: 'el motor', en: 'the engine' }, V(diaBB.max.x * .7, diaBB.min.y + .3, diaBB.max.z), C.dia);
    c.label({ es: 'Costillas', en: 'Ribs' }, null, V(G.ribsR.boundingBox.min.x - .1, 0, .6), C.rib);
    c.label({ es: 'Alvéolos', en: 'Alveoli' }, null, V(6.9, 1.6, .3), C.lung);
    c.label({ es: 'Capilar', en: 'Capillary' }, { es: 'O₂ entra · CO₂ sale', en: 'O₂ in · CO₂ out' }, V(5.7, .1, .6), C.cap);

    const mon = c.side({ es: 'Monitor respiratorio', en: 'Breathing monitor' }, 120);
    const vCan = document.createElement('canvas'); vCan.width = mon.canvas.width; vCan.height = mon.canvas.height;
    const trP = sweepTrace(mon.canvas, '#fbbf24', { speed: 60 }), trV = sweepTrace(vCan, '#7dd3fc', { speed: 60 });
    const showAir = () => xray.k > .1;

    c.onFrame((dt, rdt) => {
      const prevCyc = S.cyc; S.cyc = (S.cyc + dt * S.rr / 60) % 1; const insp = S.cyc < .38;
      if (S.mode !== 'manual') { const T = 60 / S.rr; if (S.cyc < prevCyc) c.sound.breath(T * .38 / c.timeScale, S.vent ? .07 : .05, S.vent ? 900 : 650); else if (prevCyc < .38 && S.cyc >= .38) c.sound.breath(T * .55 / c.timeScale, .03, 420); }
      const wave = insp ? Math.sin(S.cyc / .38 * Math.PI / 2) : Math.cos((S.cyc - .38) / .62 * Math.PI / 2) ** 2;
      let drive;
      if (S.vent) drive = insp ? 6 : 0;
      else if (S.mode === 'manual') { S.pmus = lerp(S.pmus, S.holding ? 7 : 0, 1 - Math.exp(-dt * 4)); drive = S.pmus; }
      else drive = 5 * wave;
      const Vtarget = drive * S.C * 1000, tau = Math.max(S.R * S.C * 1.6, .06);
      const dV = (Vtarget - S.V) * (1 - Math.exp(-dt / tau)); S.flow = dV / Math.max(dt, 1e-4) / 1000; S.V += dV;
      S.palv = S.vent ? S.peep + S.V / 1000 / S.C : -S.R * S.flow;
      const vol = S.V + (S.vent ? S.peep * S.C * 1000 * .35 : 0), n = clamp(vol / 700, -.2, 1.4);
      applyBreath(n);
      dia.userData.mat.uniforms.uBoost.value = S.vent ? 0 : clamp(drive / 8, 0, 1) * .6;
      dia.userData.real.material.emissive = dia.userData.real.material.emissive || new THREE.Color(); dia.userData.real.material.emissive.set('#ff4050'); dia.userData.real.material.emissiveIntensity = S.vent ? 0 : clamp(drive / 8, 0, 1) * .25;
      // aire
      airPts.visible = showAir();
      pv.visible = xray.k > .35;
      const a = airGeo.attributes.position, sp = S.flow * 1.3;
      air.forEach((p, i) => {
        p.u += dt * sp; if (p.u > 1 || p.u < 0) { p.t = targets[Math.floor(Math.random() * targets.length)]; p.u = sp >= 0 ? 0 : 1; }
        const u = clamp(p.u, 0, 1); if (u < .35) tmp.copy(tTop).lerp(carina, u / .35); else tmp.copy(carina).lerp(p.t, (u - .35) / .65);
        a.setXYZ(i, tmp.x, tmp.y, tmp.z);
      });
      a.needsUpdate = true;
      // alvéolos (solo en su capítulo)
      alv.visible = c.chapter() === 3; torso.visible = !alv.visible || c.chapter() !== 3;
      if (c.chapter() === 3) torso.visible = false;
      sacs.forEach((s, i) => s.scale.setScalar(1 + .06 * n + .02 * Math.sin(c.time * 2 + i)));
      const ga = gasGeo.attributes.position, ca = co2Geo.attributes.position;
      gas.forEach((g, i) => {
        g.k += dt * .35; if (g.k > 1) { g.k = 0; g.sac = sacs[Math.floor(Math.random() * sacs.length)]; g.cap = caps[sacs.indexOf(g.sac) * 4]; g.cu = Math.random(); }
        g.cap.getPointAt(g.cu, tmp); const sp2 = g.sac.position, k = smooth(0, 1, g.k);
        ga.setXYZ(i, lerp(sp2.x, tmp.x, k), lerp(sp2.y, tmp.y, k), lerp(sp2.z, tmp.z, k));
        ca.setXYZ(i, lerp(tmp.x, sp2.x, k) + .03, lerp(tmp.y, sp2.y, k), lerp(tmp.z, sp2.z, k));
      });
      if (alv.visible) { const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), one = V(1, 1, 1), col = new THREE.Color(), dark = new THREE.Color('#5e0f1c'), oxy = new THREE.Color('#e0263a');
        cells.forEach((cl, i) => { cl.u += dt * cl.sp; if (cl.u > 1) { cl.u = 0; cl.c = caps[Math.floor(Math.random() * caps.length)]; }
          cl.c.getPointAt(cl.u, tmp); cl.rot.x += dt * 1.3; cl.rot.y += dt * .9; Q.setFromEuler(cl.rot); M.compose(tmp, Q, one); rbc.setMatrixAt(i, M);
          col.copy(dark).lerp(oxy, smooth(.15, .85, cl.u)); rbc.setColorAt(i, col); });
        rbc.instanceMatrix.needsUpdate = true; rbc.instanceColor.needsUpdate = true; }
      ga.needsUpdate = ca.needsUpdate = true;
      const shownP = S.palv;
      trP.push(clamp(shownP / (S.vent ? 16 : 1.6), -1.2, 1.3), dt); trV.push(vol / 900, dt);
      trP.draw(mon.canvas.height * .35, mon.canvas.height * .45); trV.draw(mon.canvas.height * .32, mon.canvas.height * .92);
      mon.ctx.drawImage(vCan, 0, 0);
      mon.right.innerHTML = `<span style="color:#fbbf24">P</span> · <span style="color:#7dd3fc">V</span> · C ${S.C.toFixed(3)}`;
      c.state.mV?.(Math.round(Math.max(0, vol))); c.state.mP?.(shownP.toFixed(1));
    });
  }
});
