// Demo: Válvulas y ruidos del corazón / Heart valves and sounds — corazón, válvulas y piel reales (BodyParts3D)
import { createDemo, THREE, holoMesh, gridFloor, loadPack, realMat, xray, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const CEN = [21.5, -121.9, 1237], SC = 1 / 45;
const S = { hr: 64, ph: 0, focus: 'mitral', murmur: 'none', s1: false, s2: false };
const g = (x, m, s, a) => a * Math.exp(-(((x - m) / s) ** 2));
// Focos de auscultación (mm, BodyParts3D): x = izquierda del paciente, z = altura
const FOCI = {
  aortic: { mm: [-30, 1292], es: 'Foco aórtico', en: 'Aortic area', d: { es: '2.º espacio intercostal derecho', en: '2nd right intercostal space' }, valve: 'aortic' },
  pulmonary: { mm: [30, 1292], es: 'Foco pulmonar', en: 'Pulmonic area', d: { es: '2.º espacio intercostal izquierdo', en: '2nd left intercostal space' }, valve: 'pulmonary' },
  tricuspid: { mm: [16, 1212], es: 'Foco tricuspídeo', en: 'Tricuspid area', d: { es: 'borde esternal izquierdo bajo', en: 'lower left sternal border' }, valve: 'tricuspid' },
  mitral: { mm: [88, 1200], es: 'Foco mitral', en: 'Mitral area', d: { es: '5.º espacio, línea medioclavicular', en: '5th space, midclavicular line' }, valve: 'mitral' }
};
// cuánto se oye cada ruido en cada foco
const GAIN = { aortic: { s1: .5, s2: 1 }, pulmonary: { s1: .5, s2: .9 }, tricuspid: { s1: .9, s2: .5 }, mitral: { s1: 1, s2: .45 } };
const MURMUR = { as: { focus: 'aortic', es: 'Estenosis aórtica', en: 'Aortic stenosis' }, mr: { focus: 'mitral', es: 'Insuficiencia mitral', en: 'Mitral regurgitation' } };

const chapters = [
  { title: { es: 'Cuatro puertas', en: 'Four doors' }, cam: { pos: [1.4, .9, 6.8], target: [0, .3, 0] }, labels: [0, 1, 2, 3], xray: true,
    lines: [
      { es: 'El corazón tiene cuatro válvulas: dos entre aurículas y ventrículos y dos a la salida de las arterias.', en: 'The heart has four valves: two between atria and ventricles and two at the exits to the arteries.' },
      { es: 'Tricúspide y mitral dejan pasar la sangre a los ventrículos. Pulmonar y aórtica la dejan salir.', en: 'Tricuspid and mitral let blood into the ventricles. Pulmonary and aortic let it out.' },
      { es: 'Solo dejan pasar la sangre en un sentido. Estas son válvulas reales de un atlas anatómico; la aórtica es una reconstrucción.', en: 'They only let blood flow one way. These are real valves from an anatomical atlas; the aortic one is a reconstruction.' }
    ], enter: (c) => { c.controls.autoRotate = true; c.controls.autoRotateSpeed = .35; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'Abren y cierran', en: 'Open and shut' }, cam: { pos: [.8, 1.1, 4.2], target: [.3, .5, 0] }, labels: [0, 1, 2, 3], xray: true,
    lines: [
      { es: 'Cuando los ventrículos se contraen, se cierran tricúspide y mitral: es el primer ruido, S1 («lub»).', en: 'When the ventricles contract, the tricuspid and mitral close: that is the first sound, S1 ("lub").' },
      { es: 'Al terminar la contracción se cierran la aórtica y la pulmonar: es el segundo ruido, S2 («dub»).', en: 'When contraction ends the aortic and pulmonary valves close: the second sound, S2 ("dub").' },
      { es: 'Activa el sonido ♪ y mira el fonocardiograma. Va en cámara lenta.', en: 'Turn on sound ♪ and watch the phonocardiogram. This is slow motion.' }
    ], enter: (c) => { c.timeScale = .35; }, exit: (c) => { c.timeScale = 1; } },
  { title: { es: 'Dónde escuchar', en: 'Where to listen' }, cam: { pos: [.8, .4, 10.8], target: [.4, .2, 0] }, labels: [4, 5, 6, 7], xray: true,
    lines: [
      { es: 'Cada válvula se escucha mejor en un punto del tórax: los focos de auscultación.', en: 'Each valve is heard best at a spot on the chest: the auscultation areas.' },
      { es: 'Elige un foco y escucha: en los de la base domina S2; en los de la punta domina S1.', en: 'Pick an area and listen: at the base S2 dominates; at the apex S1 dominates.' },
      { es: 'La piel es real, del mismo atlas; el corazón queda detrás, visto con rayos X.', en: 'The skin is real, from the same atlas; the heart sits behind it, seen with X-ray.' }
    ], enter: () => { S.showChest = true; }, exit: () => { S.showChest = false; } },
  { title: { es: 'Los soplos', en: 'Murmurs' }, cam: { pos: [.8, .4, 10.8], target: [.4, .2, 0] }, labels: [4, 5, 6, 7], xray: true,
    lines: [
      { es: 'Un soplo es el ruido de la sangre que pasa con turbulencia por una válvula enferma.', en: 'A murmur is the sound of blood flowing turbulently through a diseased valve.' },
      { es: 'La estenosis aórtica da un soplo sistólico que crece y decrece; se oye mejor en el foco aórtico.', en: 'Aortic stenosis gives a systolic murmur that rises and falls; loudest at the aortic area.' },
      { es: 'La insuficiencia mitral da un soplo que ocupa toda la sístole; se oye mejor en la punta. Simulación educativa.', en: 'Mitral regurgitation gives a murmur that fills all of systole; loudest at the apex. Educational simulation.' }
    ], enter: () => { S.showChest = true; }, exit: () => { S.showChest = false; S.murmur = 'none'; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [1.4, .9, 6.8], target: [0, .3, 0] }, labels: [], xray: true,
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 4 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: '¿Qué produce el primer ruido cardiaco (S1)?', en: 'What makes the first heart sound (S1)?' }, o: [{ es: 'El cierre de mitral y tricúspide', en: 'Mitral and tricuspid closure' }, { es: 'El cierre de aórtica y pulmonar', en: 'Aortic and pulmonary closure' }, { es: 'La apertura de la aórtica', en: 'Aortic opening' }], a: 0,
    e: { es: 'Se cierran al empezar la contracción ventricular.', en: 'They close as ventricular contraction begins.' } },
  { q: { es: '¿Dónde está el foco mitral?', en: 'Where is the mitral area?' }, o: [{ es: '2.º espacio intercostal derecho', en: '2nd right intercostal space' }, { es: '5.º espacio intercostal, línea medioclavicular izquierda', en: '5th intercostal space, left midclavicular line' }, { es: 'En la espalda', en: 'On the back' }], a: 1,
    e: { es: 'Coincide con la punta del corazón.', en: 'It matches the apex of the heart.' } },
  { q: { es: 'Un soplo sistólico en crescendo-decrescendo en el foco aórtico sugiere…', en: 'A crescendo-decrescendo systolic murmur at the aortic area suggests…' }, o: [{ es: 'Estenosis aórtica', en: 'Aortic stenosis' }, { es: 'Insuficiencia mitral', en: 'Mitral regurgitation' }, { es: 'Un corazón sano', en: 'A healthy heart' }], a: 0,
    e: { es: 'La válvula estrecha genera turbulencia durante la eyección.', en: 'The narrowed valve creates turbulence during ejection.' } }
];

createDemo({
  title: { es: 'Válvulas y ruidos del corazón', en: 'Heart valves and sounds' }, accent: '#ff6b81', bg: '#07060a', bgTop: '#2a1c22', bgMid: '#120c10', fog: .03, floorY: -2.4,
  camera: chapters[0].cam, thumb: { pos: [1.0, .8, 5.4], target: [.2, .4, 0], chapter: 1 }, bloom: { strength: .7, radius: .45, threshold: .4 }, credit: BP3D_CREDIT, sources: { es: 'Focos de auscultación clásicos; ruidos y soplos sintetizados con fines educativos.', en: 'Classic auscultation areas; heart sounds and murmurs synthesized for teaching.' }, chapters,
  action(ui, c, ci) {
    c.state.mHR = ui.metric({ es: 'latidos/min', en: 'beats/min' }, '♥');
    if (ci === 1) ui.button({ es: 'Cámara lenta', en: 'Slow motion' }, (v) => { c.timeScale = v ? .35 : 1; }, { toggle: true, value: true });
    if (ci === 2 || ci === 3) ui.seg(Object.entries(FOCI).map(([k, f]) => ({ value: k, label: { es: f.es.replace('Foco ', ''), en: f.en.replace(' area', '') } })), S.focus, (v) => { S.focus = v; c.state.goFocus?.(v); });
    if (ci === 3) ui.seg([{ value: 'none', label: { es: 'Sin soplo', en: 'No murmur' } }, { value: 'as', label: { es: 'Estenosis aórtica', en: 'Aortic stenosis' } }, { value: 'mr', label: { es: 'Insuf. mitral', en: 'Mitral regurg.' } }], S.murmur, (v) => { S.murmur = v; });
    if (ci === 4) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; scene.add(gridFloor('#ff4d6d', 40, -2.4));
    const box = [[-75, -215, 1150], [120, -30, 1365]];
    const [H, VP, CH] = await Promise.all([
      loadPack('heart', { center: CEN, scale: SC, crop: { aorta: [[-40, -200, 1150], [70, -40, 1360]], ivc: [[-60, -200, 1150], [40, -40, 1260]], pulmArtery: [[-30, -175, 1225], [88, -60, 1345]], pulmVeins: [[-25, -150, 1195], [80, -55, 1290]], svc: box } }),
      loadPack('valves', { center: CEN, scale: SC }), loadPack('body', { center: CEN, scale: SC })]);
    const toT = (x, y, z) => V((x - CEN[0]) * SC, (z - CEN[2]) * SC, -(y - CEN[1]) * SC);
    const heart = new THREE.Group(); scene.add(heart);
    const add = (geo, color, real, opts = {}, ghost = .08) => { const m = holoMesh(geo, color, { real, realOpts: opts, ghost, opacity: .015, rim: .45, intensity: .75, edges: false }); heart.add(m); return m; };
    add(H.geo.wall, '#ff5a6e', 'muscle', {}, .06); add(H.geo.coronary, '#ff3b5c', 'artery', { color: '#b11d2d' }, .05);
    add(H.geo.aorta, '#ff3b5c', 'artery', { color: '#b8343f' }, .1); add(H.geo.pulmArtery, '#6f8bff', 'vein', { color: '#3f52b3' }, .1);
    add(H.geo.pulmVeins, '#ff3b5c', 'artery', { color: '#a8323e' }, .08); add(H.geo.svc, '#6f8bff', 'vein', { color: '#34408e' }, .08); add(H.geo.ivc, '#6f8bff', 'vein', { color: '#34408e' }, .08);
    // válvulas reales + aórtica reconstruida
    const valveMat = (col) => realMat('cartilage', { color: col, emissive: col, emissiveIntensity: .0 });
    const valves = {};
    for (const [k, col] of [['tricuspid', '#f2d6b8'], ['mitral', '#f2d6b8'], ['pulmonary', '#e9e0ff']]) {
      const geo = VP.geo[k], ctr = geo.boundingSphere.center.clone(); geo.translate(-ctr.x, -ctr.y, -ctr.z);
      const grp = new THREE.Group(); grp.position.copy(ctr); heart.add(grp); const mesh = new THREE.Mesh(geo, valveMat(col)); grp.add(mesh); valves[k] = { grp, mesh, ctr };
    }
    const nearest = (geo, ref) => { const pa = geo.attributes.position, t = V(0, 0, 0), b = V(0, 0, 0); let d = 1e9; for (let i = 0; i < pa.count; i++) { t.fromBufferAttribute(pa, i); const e = t.distanceToSquared(ref); if (e < d) { d = e; b.copy(t); } } return b; };
    const aoRoot = nearest(H.geo.aorta, valves.mitral.ctr.clone().lerp(valves.pulmonary.ctr, .5)); const aoUp = nearest(H.geo.aorta, aoRoot.clone().add(V(0, .6, 0))).sub(aoRoot).normalize();
    const aoG = new THREE.Group(); aoG.position.copy(aoRoot); aoG.quaternion.setFromUnitVectors(V(0, 1, 0), aoUp); heart.add(aoG);
    // válvula aórtica: tres valvas semilunares en bolsillo; cerradas forman una «Y», abiertas se pegan a la pared
    const AR = .23, AD = .19, NU = 18, NV = 9, aoMat = valveMat('#f2d6b8'); aoMat.side = THREE.DoubleSide;
    const cusps = []; for (let i = 0; i < 3; i++) {
      const g2 = new THREE.BufferGeometry(); g2.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array((NU + 1) * (NV + 1) * 3), 3));
      const idx = []; for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) { const q = a * (NV + 1) + b, r = q + NV + 1; idx.push(q, r, q + 1, r, r + 1, q + 1); } g2.setIndex(idx);
      const m = new THREE.Mesh(g2, aoMat); aoG.add(m); cusps.push({ g: g2, a0: i * Math.PI * 2 / 3 });
    }
    const shapeCusps = (o, narrow) => { const maxO = narrow ? .45 : 1, oo = o * maxO;
      for (const cp of cusps) { const arr = cp.g.attributes.position.array; let k = 0;
        for (let a = 0; a <= NU; a++) { const u = a / NU, ang = cp.a0 + u * Math.PI * 2 / 3, ca = Math.cos(ang), sa = Math.sin(ang);
          const wy = -AD * Math.sin(Math.PI * u);                    // línea de inserción en U
          const rc = AR * Math.abs(1 - 2 * u) * .98, ro = AR * .9;    // borde libre: cerrado (hacia el centro) / abierto (hacia la pared)
          const rf = lerp(rc, ro, oo), yf = lerp(0, .1, oo);
          for (let b = 0; b <= NV; b++) { const v = b / NV, belly = (1 - oo) * .12 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u);
            const r = lerp(AR, rf, v), y = lerp(wy, yf, v) - belly;
            arr[k++] = r * ca; arr[k++] = y; arr[k++] = r * sa; } }
        cp.g.attributes.position.needsUpdate = true; cp.g.computeVertexNormals(); } };
    shapeCusps(0, false);
    // capítulo 2: vista desde la aorta hacia abajo (se ven las sigmoideas y, más abajo, mitral y tricúspide)
    { const top = aoRoot.clone().addScaledVector(aoUp, 2.3).add(V(-.55, 0, -.8)); chapters[1].cam.pos = top.toArray(); chapters[1].cam.target = aoRoot.clone().addScaledVector(aoUp, -.35).toArray(); }
    // pared del seno aórtico (anillo translúcido) para dar contexto
    const sinus = new THREE.Mesh(new THREE.CylinderGeometry(AR * 1.05, AR * 1.08, AD * 1.4, 36, 1, true), realMat('artery', { color: '#b8343f', transparent: true, opacity: .25, side: THREE.DoubleSide, depthWrite: false })); sinus.position.y = -AD * .35; aoG.add(sinus);
    valves.aortic = { grp: aoG, mesh: { material: aoMat }, ctr: aoRoot };
    // piel del tórax con los focos
    const chest = holoMesh(CH.geo.skin, '#ffb38a', { real: 'skin', realOpts: { side: THREE.DoubleSide }, ghost: .22, opacity: .01, rim: .35, intensity: .6, edges: false }); scene.add(chest);
    const sp = CH.geo.skin.attributes.position, tv = V(0, 0, 0);
    const surf = (xmm, zmm) => { const tgt = toT(xmm, -120, zmm); let best = null, bd = 1e9; for (let i = 0; i < sp.count; i++) { tv.fromBufferAttribute(sp, i); const d = (tv.x - tgt.x) ** 2 + (tv.y - tgt.y) ** 2 - tv.z * .02; if (d < bd) { bd = d; best = tv.clone(); } } return best; };
    const markers = {};
    for (const [k, f] of Object.entries(FOCI)) { const p = surf(...f.mm); const ring = new THREE.Mesh(new THREE.TorusGeometry(.11, .02, 10, 32), new THREE.MeshBasicMaterial({ color: '#ffe66d', transparent: true, opacity: .9 })); ring.position.copy(p).add(V(0, 0, .02)); scene.add(ring); markers[k] = ring; f.pos = p; }
    // etiquetas: válvulas 0-3, focos 4-7
    c.label({ es: 'Tricúspide', en: 'Tricuspid' }, null, valves.tricuspid.grp, '#f2d6b8');
    c.label({ es: 'Mitral', en: 'Mitral' }, null, valves.mitral.grp, '#f2d6b8');
    c.label({ es: 'Pulmonar', en: 'Pulmonary' }, null, valves.pulmonary.grp, '#c4b5fd');
    c.label({ es: 'Aórtica', en: 'Aortic' }, null, aoG, '#f2d6b8');
    for (const [k, f] of Object.entries(FOCI)) c.label({ es: f.es, en: f.en }, f.d, markers[k], '#ffe66d');
    c.state.goFocus = (k) => { const p = FOCI[k].pos; c.flyTo([p.x * .5, p.y + .1, p.z + 6.5], [p.x * .6, p.y - .2, 0], 1.2); };
    // fonocardiograma
    const mon = c.side({ es: 'Fonocardiograma', en: 'Phonocardiogram' }, 110);
    const pg = mon.ctx, W = mon.canvas.width, Hh = mon.canvas.height, buf = new Float32Array(W).fill(NaN); let wx = 0, acc = 0;
    c.onFrame((dt, rdt) => {
      const RR = 60 / S.hr; S.ph += dt; if (S.ph >= RR) { S.ph -= RR; S.s1 = false; S.s2 = false; }
      const ph = S.ph, s1t = .12, s2t = .12 + .33;
      const gain = GAIN[S.focus], chapter = c.chapter();
      chest.visible = !!S.showChest; Object.values(markers).forEach((m) => (m.visible = !!S.showChest)); Object.entries(markers).forEach(([k, m]) => { m.material.color.set(k === S.focus ? '#ffe66d' : '#9aa4ad'); m.scale.setScalar(k === S.focus ? 1.25 + .08 * Math.sin(c.time * 6) : 1); });
      // estados de las válvulas: AV abiertas en diástole; sigmoideas abiertas en eyección
      const sys = ph > s1t && ph < s2t;
      const avOpen = !sys ? smooth(s2t + .05, s2t + .15, ph) + (ph < s1t ? 1 - smooth(s1t - .04, s1t, ph) : 0) : 0;
      const slOpen = smooth(s1t + .04, s1t + .1, ph) * (1 - smooth(s2t - .05, s2t, ph));
      for (const k of ['tricuspid', 'mitral']) { const v = valves[k]; const o = clamp(avOpen, 0, 1); v.grp.scale.set(1 - .22 * o, 1 + .12 * o, 1 - .22 * o); v.mesh.material.emissiveIntensity = (FOCI[S.focus].valve === k && S.showChest ? .5 : 0) + .25 * (1 - o) * (sys ? 1 : 0); }
      { const v = valves.pulmonary, o = slOpen; v.grp.scale.set(1 - .25 * o, 1 + .1 * o, 1 - .25 * o); v.mesh.material.emissiveIntensity = (FOCI[S.focus].valve === 'pulmonary' && S.showChest ? .5 : 0); }
      const as = S.murmur === 'as'; shapeCusps(slOpen, as); valves.aortic.mesh.material.emissiveIntensity = (FOCI[S.focus].valve === 'aortic' && S.showChest ? .5 : 0);
      // ruidos
      if (!S.s1 && ph >= s1t) { S.s1 = true; c.sound.thump(52, .13, .3 * gain.s1); }
      if (!S.s2 && ph >= s2t) { S.s2 = true; c.sound.thump(80, .085, .26 * gain.s2); }
      if (S.murmur !== 'none' && S.s1 && !S.murmurOn && ph >= s1t + .03 && ph < s1t + .05) { S.murmurOn = true; const near = MURMUR[S.murmur].focus === S.focus ? 1 : .35; c.sound.breath((s2t - s1t - .06) / c.timeScale, .06 * near, S.murmur === 'as' ? 320 : 700); }
      if (ph < s1t) S.murmurOn = false;
      // fonocardiograma (envolvente de los ruidos + soplo)
      let sig = gain.s1 * g(ph, s1t + .02, .018, 1) * Math.sin(ph * 380) + gain.s2 * g(ph, s2t + .015, .012, .8) * Math.sin(ph * 520);
      if (S.murmur === 'as') { const near = MURMUR.as.focus === S.focus ? 1 : .35; const k = (ph - s1t - .03) / (s2t - s1t - .06); if (k > 0 && k < 1) sig += near * .45 * Math.sin(k * Math.PI) * (Math.random() - .5) * 2; }
      if (S.murmur === 'mr') { const near = MURMUR.mr.focus === S.focus ? 1 : .35; if (ph > s1t + .01 && ph < s2t) sig += near * .32 * (Math.random() - .5) * 2; }
      acc += dt * 180; while (acc >= 1) { acc -= 1; buf[wx] = sig; for (let k = 1; k < 16; k++) buf[(wx + k) % W] = NaN; wx = (wx + 1) % W; }
      pg.clearRect(0, 0, W, Hh); pg.strokeStyle = 'rgba(255,255,255,.12)'; pg.beginPath(); pg.moveTo(0, Hh / 2); pg.lineTo(W, Hh / 2); pg.stroke();
      pg.strokeStyle = '#ffd166'; pg.lineWidth = 2.5; pg.beginPath(); let pen = false; for (let i = 0; i < W; i++) { const v = buf[i]; if (Number.isNaN(v)) { pen = false; continue; } const y = Hh / 2 - v * Hh * .4; pen ? pg.lineTo(i, y) : pg.moveTo(i, y); pen = true; } pg.stroke();
      mon.right.textContent = (lang === 'en' ? FOCI[S.focus].en : FOCI[S.focus].es) + (S.murmur !== 'none' ? ' · ' + (lang === 'en' ? MURMUR[S.murmur].en : MURMUR[S.murmur].es) : '');
      c.state.mHR?.(S.hr);
    });
  }
});
