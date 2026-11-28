// Demo: La luz que mide el oxígeno / The light that measures oxygen
import { createDemo, THREE, fitSleeve, holoMesh, holoMat, glowMat, pointsMat, gridFloor, sweepTrace, drawGrid, realMat, loadPack, BP3D_CREDIT, clamp, lerp, smooth, lang } from '../core.js';

const C = { skin: '#ffb38a', dev: '#8fe3ff', red: '#ff2d55', ir: '#b26bff', det: '#7df9ff', art: '#ff3b4e', vein: '#5b6cff', bone: '#ffe9c7' };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const S = { sat: .97, perf: 1, moving: false, polish: false, alternate: false, hr: 72, ph: 0, est: 97, R: .5, pi: 2, shake: 0, quality: 1 };
// coeficientes didácticos de absorción (hemoglobina oxigenada / reducida)
const EPS = { red: { o: .1, d: 1.0 }, ir: { o: .3, d: .2 } };
const eps = (c, s) => s * EPS[c].o + (1 - s) * EPS[c].d;
const pleth = (p) => Math.exp(-(((p - .16) / .07) ** 2)) + .38 * Math.exp(-(((p - .42) / .09) ** 2)); // pico sistólico + muesca dicrota

const chapters = [
  { title: { es: 'Un clip con dos luces', en: 'A clip with two lights' }, cam: { pos: [4.2, 2.8, -5.4], target: [-.2, -.2, .4] }, labels: [0, 1, 2, 3, 4],
    lines: [
      { es: 'Un pulsioxímetro es un clip con dos luces arriba y un sensor de luz abajo.', en: 'A pulse oximeter is a clip with two lights on top and a light sensor underneath.' },
      { es: 'La luz atraviesa piel, hueso y sangre. Lo que llega al sensor trae información.', en: 'The light crosses skin, bone and blood. Whatever reaches the sensor carries information.' },
      { es: 'Pulsa el botón de rayos X para ver el dedo por dentro.', en: 'Press the X-ray button to look inside the finger.' }
    ], enter: (c) => { c.controls.autoRotate = true; c.controls.autoRotateSpeed = .6; }, exit: (c) => { c.controls.autoRotate = false; } },
  { title: { es: 'Roja e infrarroja', en: 'Red and infrared' }, cam: { pos: [3.9, .7, -1.9], target: [.75, 0, 0] }, labels: [0, 1], xray: true,
    lines: [
      { es: 'Una luz es roja, cerca de 660 nm. La otra es infrarroja, cerca de 940 nm, invisible para ti; aquí la pintamos violeta.', en: 'One light is red, around 660 nm. The other is infrared, around 940 nm, invisible to you; we paint it violet here.' },
      { es: 'El aparato las enciende por turnos cientos de veces por segundo. Aquí van muy despacio.', en: 'The device switches them on in turn hundreds of times a second. Here they go very slowly.' },
      { es: 'Así el mismo sensor mide cada color por separado.', en: 'That way one sensor can measure each colour separately.' }
    ], enter: () => { S.alternate = true; }, exit: () => { S.alternate = false; } },
  { title: { es: 'Lo que late es la sangre', en: 'What pulses is the blood' }, cam: { pos: [-.2, 1.5, -4.0], target: [.3, -.1, 0] }, labels: [3, 5], xray: true,
    lines: [
      { es: 'Piel, hueso y sangre venosa absorben casi lo mismo todo el tiempo: es la parte constante, DC.', en: 'Skin, bone and venous blood absorb about the same all the time: that is the steady part, DC.' },
      { es: 'Con cada latido la arteria se llena un poco más y absorbe más luz: es la parte pulsátil, AC.', en: 'With each beat the artery fills a little more and absorbs more light: that is the pulsing part, AC.' },
      { es: 'Al quedarse solo con la parte que late, el aparato mide la sangre arterial.', en: 'By keeping only the pulsing part, the device measures arterial blood.' }
    ] },
  { title: { es: 'La razón R', en: 'The ratio R' }, cam: { pos: [2.6, 1.7, -4.2], target: [.45, .1, 0] }, labels: [3], xray: true,
    lines: [
      { es: 'La hemoglobina con oxígeno deja pasar más luz roja; la que no lo tiene la absorbe.', en: 'Oxygen-rich haemoglobin lets more red light through; oxygen-poor haemoglobin soaks it up.' },
      { es: 'El aparato divide la pulsación roja entre la infrarroja: esa razón es R.', en: 'The device divides the red pulse by the infrared pulse: that ratio is R.' },
      { es: 'Mueve la saturación. Una curva de calibración convierte R en el número de la pantalla.', en: 'Move the saturation. A calibration curve turns R into the number on the screen.' }
    ] },
  { title: { es: 'Cuando la lectura engaña', en: 'When the reading misleads' }, cam: { pos: [3.4, 2.2, -5.0], target: [0, -.1, .3] }, labels: [4],
    lines: [
      { es: 'Si el dedo se mueve, el movimiento se parece a un latido y confunde al aparato.', en: 'If the finger moves, the motion looks like a heartbeat and confuses the device.' },
      { es: 'Con manos frías llega poca sangre: la parte pulsátil se achica y la lectura se vuelve inestable.', en: 'With cold hands little blood arrives: the pulsing part shrinks and the reading becomes unstable.' },
      { es: 'El esmalte oscuro y la luz ambiental también estorban. Prueba cada caso.', en: 'Dark nail polish and room light also get in the way. Try each case.' }
    ], exit: () => { S.moving = false; S.perf = 1; S.polish = false; } },
  { title: { es: 'Ponte a prueba', en: 'Test yourself' }, cam: { pos: [4.2, 2.8, -5.4], target: [-.2, -.2, .4] }, labels: [],
    lines: [{ es: 'Tres preguntas para cerrar.', en: 'Three questions to finish.' }], enter: (c) => setTimeout(() => c.chapter() === 5 && c.quiz(QUIZ), 900) }
];
const QUIZ = [
  { q: { es: 'Si R aumenta, ¿qué pasa con la SpO₂ estimada?', en: 'If R goes up, what happens to the estimated SpO₂?' }, o: [{ es: 'Aumenta', en: 'It rises' }, { es: 'Disminuye', en: 'It falls' }, { es: 'No cambia', en: 'It stays the same' }], a: 1,
    e: { es: 'Más absorción roja relativa significa menos hemoglobina oxigenada.', en: 'More relative red absorption means less oxygenated haemoglobin.' } },
  { q: { es: '¿Por qué el aparato usa solo la parte pulsátil (AC)?', en: 'Why does the device use only the pulsing part (AC)?' }, o: [{ es: 'Porque es más brillante', en: 'Because it is brighter' }, { es: 'Para aislar la sangre arterial del resto del tejido', en: 'To isolate arterial blood from the rest of the tissue' }, { es: 'Para medir la temperatura', en: 'To measure temperature' }], a: 1,
    e: { es: 'Lo que late con el corazón es la sangre arterial.', en: 'What pulses with the heart is arterial blood.' } },
  { q: { es: '¿Qué puede falsear una lectura?', en: 'What can distort a reading?' }, o: [{ es: 'Dedo quieto y tibio', en: 'A still, warm finger' }, { es: 'Movimiento, mala perfusión o esmalte oscuro', en: 'Movement, poor perfusion or dark nail polish' }, { es: 'Un pulso de 70', en: 'A pulse of 70' }], a: 1,
    e: { es: 'Todo lo que agrega ruido o reduce la señal pulsátil la degrada.', en: 'Anything that adds noise or shrinks the pulsing signal degrades it.' } }
];

createDemo({
  title: { es: 'La luz que mide el oxígeno', en: 'The light that measures oxygen' }, accent: '#ff4d6d', bg: '#06070b', bgTop: '#1d2330', fog: .045, exposure: .95, floorY: -1.25,
  camera: chapters[0].cam, thumb: { pos: [3.4, 2.0, -3.9], target: [-.1, -.25, .4], chapter: 0 }, bloom: { strength: .7, radius: .5, threshold: .2 }, credit: BP3D_CREDIT, sources: { es: 'Calibración empírica aproximada SpO₂ ≈ 110 − 25·R y coeficientes de absorción didácticos.', en: 'Approximate empirical calibration SpO₂ ≈ 110 − 25·R and teaching absorption coefficients.' }, chapters,
  action(ui, c, ci) {
    c.state.mEst = ui.metric({ es: 'SpO₂ estimada', en: 'estimated SpO₂' }, '%');
    c.state.mR = ui.metric({ es: 'razón R', en: 'ratio R' }, 'R');
    if (ci === 3 || ci === 0 || ci === 2) ui.slider({ es: 'Saturación real', en: 'True saturation' }, { min: 70, max: 100, value: Math.round(S.sat * 100), fmt: (v) => v + '%' }, (v) => { S.sat = v / 100; });
    if (ci === 4) {
      ui.hold({ es: 'Mantén para mover el dedo', en: 'Hold to move the finger' }, (v) => { S.moving = v; });
      ui.button({ es: 'Manos frías', en: 'Cold hands' }, (v) => { S.perf = v ? .18 : 1; }, { toggle: true });
      ui.button({ es: 'Esmalte oscuro', en: 'Dark polish' }, (v) => { S.polish = v; }, { toggle: true });
    }
    if (ci === 5) ui.button({ es: 'Abrir quiz', en: 'Open quiz' }, () => c.quiz(QUIZ));
  },
  async build(c) {
    const { scene } = c; const floorM = gridFloor('#ff4d6d', 40, -1.25); scene.add(floorM);
    const rig = new THREE.Group(); scene.add(rig);
    const finger = new THREE.Group(); rig.add(finger);
    // dedo esculpido: sección elíptica, nudillos, yema y punta aplanada bajo la uña
    const fingerGeo = (jp = -.5, jd = .62) => {
      const N = 160, M = 72, x0 = -4.6, xt = 1.64, pos = [], idx = [];
      for (let i = 0; i <= N; i++) {
        const x = x0 + (xt - x0) * i / N;
        let r = .5 * (1 - .07 * smooth(-1.5, 1.2, x)) + .045 * Math.exp(-(((x - jp) / .2) ** 2)) + .035 * Math.exp(-(((x - jd) / .17) ** 2));
        if (x > 1.0) { const k = (x - 1.0) / (xt - 1.0); r *= Math.sqrt(Math.max(0, 1 - k ** 2.2)); }
        for (let j = 0; j <= M; j++) {
          const v = j / M * Math.PI * 2, sv = Math.sin(v), cv = Math.cos(v);
          let y = r * .9 * sv; const z = r * cv;
          if (sv < 0) y *= 1 + .12 * smooth(.3, 1.2, x); else y *= 1 - .1 * smooth(.6, 1.3, x);
          pos.push(x, y - (sv < 0 ? .02 * smooth(.3, 1.2, x) : 0), z);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) { const a = i * (M + 1) + j, b = a + M + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const uv = []; for (let i = 0; i <= N; i++) for (let j = 0; j <= M; j++) uv.push(i / N * 4, j / M); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.computeVertexNormals(); return g;
    };
    const fg = fingerGeo();
    const skin = holoMesh(fg, C.skin, { real: 'skin', ghost: .12, opacity: .006, rim: .3, power: 2.6, scan: .02, intensity: .6, edges: false }); finger.add(skin);
    const nailG = new THREE.SphereGeometry(.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const nail = holoMesh(nailG, '#ffd9c7', { real: 'nail', ghost: .15, opacity: .05, rim: .7, edges: false }); nail.scale.set(.74, .1, .56); nail.position.set(1.08, .36, 0); nail.rotation.z = -.12; finger.add(nail);
    const nailPolish = new THREE.Mesh(nailG, new THREE.MeshBasicMaterial({ color: '#1a0f2e', transparent: true, opacity: .9 })); nailPolish.scale.set(.75, .115, .57); nailPolish.position.set(1.08, .36, 0); nailPolish.rotation.z = -.12; finger.add(nailPolish);
    // mano real (piel de BodyParts3D) + falanges del índice, en el mismo sistema de coordenadas del atlas
    const CEN = [-307.3, -174.3, 679.5];
    const [FP, AP] = await Promise.all([loadPack('finger', { scale: 1 / 20, center: CEN }), loadPack('arm', { scale: 1 / 20, center: CEN })]);
    const pc = (g) => g.boundingSphere.center.clone();
    const dirF = pc(FP.geo.dist).sub(pc(FP.geo.mid)).normalize(); // eje de la punta del dedo
    const qF = new THREE.Quaternion().setFromUnitVectors(dirF, new THREE.Vector3(1, 0, 0));
    const dors = new THREE.Vector3(0, 0, -1); dors.addScaledVector(dirF, -dors.dot(dirF)).normalize().applyQuaternion(qF);
    const qRoll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.atan2(dors.z, dors.y));
    const hand = new THREE.Group(); hand.quaternion.copy(qRoll).multiply(qF); finger.add(hand);
    const bones = new THREE.Group(); hand.add(bones);
    for (const k of ['prox', 'mid', 'dist']) bones.add(holoMesh(FP.geo[k], C.bone, { real: 'bone', ghost: .9, opacity: .05, rim: .6, edges: false }));
    const handSkin = holoMesh(AP.geo.arm, C.skin, { real: 'skin', realOpts: { side: THREE.DoubleSide }, ghost: .12, opacity: .006, rim: .3, power: 2.6, scan: .02, intensity: .6, edges: false });
    hand.add(handSkin);
    hand.updateMatrixWorld(true);
    const db = new THREE.Box3().setFromObject(bones.children[2]);
    hand.position.set(1.4 - db.max.x, .02 - (db.min.y + db.max.y) / 2, -(db.min.z + db.max.z) / 2);
    hand.updateMatrixWorld(true);
    skin.visible = false; // el dedo esculpido queda como respaldo oculto
    let deskM = null;
    // antebrazo con manga de camisa ajustada, mesa a su altura y almohadilla bajo la palma
    { const ag = AP.geo.arm; ag.computeBoundingBox(); const top = ag.boundingBox.max.y, wristY = (835 - CEN[2]) / 20;
      hand.add(fitSleeve(ag, V(0, 0, 0), V(0, 1, 0), wristY + 1.6, top - .05, { grow: .22, hem: .28, extra: 5, color: '#8aa1b9', steps: 12 }));
      // inclinar todo el conjunto para que el antebrazo descanse horizontal (mano relajada, dedo un poco hacia abajo)
      rig.updateMatrixWorld(true); const pa0 = ag.attributes.position, cenY = (y0, y1) => { const c0 = V(0, 0, 0); let n = 0; for (let i = 0; i < pa0.count; i++) { const y = pa0.getY(i); if (y > y0 && y < y1) { c0.x += pa0.getX(i); c0.y += y; c0.z += pa0.getZ(i); n++; } } return hand.localToWorld(c0.multiplyScalar(1 / Math.max(1, n))); };
      const dir = cenY(top - 3, top - 1).sub(cenY(wristY + .5, wristY + 2.5));
      let rz = Math.PI - Math.atan2(dir.y, dir.x); if (rz > Math.PI) rz -= Math.PI * 2; rig.rotation.z = rz;
      // las cámaras de los capítulos giran igual, para conservar el encuadre del oxímetro
      const rot = (a2) => { const v = V(...a2).applyAxisAngle(V(0, 0, 1), rz); return v.toArray(); };
      for (const ch of chapters) if (ch.cam) ch.cam = { ...ch.cam, pos: rot(ch.cam.pos), target: rot(ch.cam.target) };
      rig.updateMatrixWorld(true); const hb = new THREE.Box3().setFromObject(handSkin.userData.real, true);
      const pa = ag.attributes.position, tv = V(0, 0, 0), palm = new THREE.Box3(); for (let i = 0; i < pa.count; i++) { tv.fromBufferAttribute(pa, i); if (tv.y < wristY - .4 && tv.y > wristY - 4.5) palm.expandByPoint(hand.localToWorld(tv.clone())); }
      const deskY = hb.min.y - .02; floorM.position.y = deskY - 3;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(80, .6, 50), new THREE.MeshPhysicalMaterial({ color: '#b9c3cb', roughness: .88, sheen: .3, sheenColor: new THREE.Color('#eef2f5') })); desk.position.set(-10, deskY - .3, 0); desk.receiveShadow = true; scene.add(desk);
      deskM = desk; }
    // uña sobre el dorso de la falange distal
    const db2 = new THREE.Box3().setFromObject(bones.children[2]);
    [nail, nailPolish].forEach((n) => { n.position.set(db2.max.x - .3, db2.max.y + .1, (db2.min.z + db2.max.z) / 2); n.scale.set(.5, .07, .38); n.rotation.z = -.05; });
    const artCurve = new THREE.CatmullRomCurve3([V(-.35, -.14, .1), V(.3, -.15, .1), V(.8, -.13, .08), V(1.25, -.05, .05)]);
    const artMat = holoMat(C.art, { opacity: .2, rim: .9, scan: .05 });
    const artery = new THREE.Mesh(new THREE.TubeGeometry(artCurve, 60, .06, 16, false), artMat); finger.add(artery);
    const capillaries = []; for (let i = 0; i < 6; i++) { const y0 = -.1 + i * .06; const cg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(.55 + i * .1, -.15, .1), V(.8 + i * .08, y0, -.05 + i * .03), V(1.0 + i * .05, .25, -.1)]), 20, .02, 6); const m = new THREE.Mesh(cg, artMat); finger.add(m); capillaries.push(m); }
    const vein = holoMesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(1.2, .14, -.08), V(.5, .16, -.12), V(-.35, .15, -.12)]), 40, .05, 12, false), C.vein, { opacity: .08, rim: .6, edges: false }); finger.add(vein);

    // Clip
    const slab = (w, d, h, r) => { const sh = new THREE.Shape(), x = -w / 2, y = -d / 2; sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + d - r); sh.quadraticCurveTo(x + w, y + d, x + w - r, y + d); sh.lineTo(x + r, y + d); sh.quadraticCurveTo(x, y + d, x, y + d - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
      const g = new THREE.ExtrudeGeometry(sh, { depth: h - .08, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 6, curveSegments: 16 }); g.rotateX(-Math.PI / 2); g.translate(0, -(h - .08) / 2, 0); g.computeVertexNormals(); return g; };
    const clip = new THREE.Group(); clip.position.x = .75; rig.add(clip);
    // cada mitad es una sola pieza: perfil redondeado con el canal del dedo, extruida a lo largo del dedo y con bordes muy suaves
    const halfGeo = (H, W = 1.0, L2 = 1.45, R = .6, bev = .1) => { const sh = new THREE.Shape(), r = .26;
      sh.moveTo(R, 0); sh.lineTo(W / 2 + .02, 0); sh.lineTo(W / 2 + .02, H - r); sh.quadraticCurveTo(W / 2 + .02, H, W / 2 - r, H + .02); sh.quadraticCurveTo(0, H + .07, -W / 2 + r, H + .02); sh.quadraticCurveTo(-W / 2 - .02, H, -W / 2 - .02, H - r); sh.lineTo(-W / 2 - .02, 0); sh.lineTo(-R, 0);
      sh.absarc(0, 0, R, Math.PI, 0, true);
      const g = new THREE.ExtrudeGeometry(sh, { depth: L2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev * .8, bevelSegments: 8, curveSegments: 40 }); g.translate(0, 0, -L2 / 2); g.rotateY(Math.PI / 2); g.computeVertexNormals(); return g; };
    const shellG = halfGeo(.9), shellB = halfGeo(.74); shellB.rotateX(Math.PI);
    const top = holoMesh(shellG, C.dev, { real: 'plasticTint', realOpts: { color: '#2b67c9', roughness: .42, clearcoat: .35, clearcoatRoughness: .3 }, ghost: .12, opacity: .008, rim: .28, intensity: .55, scan: .03, edgeOpacity: .28 }); clip.add(top);
    const bot = holoMesh(shellB, C.dev, { real: 'plastic', realOpts: { color: '#e4e8ec', roughness: .5, clearcoat: .2 }, ghost: .12, opacity: .008, rim: .28, intensity: .55, scan: .03, edgeOpacity: .28 }); clip.add(bot);
    // ventana negra brillante bajo la pantalla
    const win = new THREE.Mesh(slab(1.5, .84, .03, .1), new THREE.MeshPhysicalMaterial({ color: '#0d1116', roughness: .15, clearcoat: 1 })); win.position.y = 1.07; clip.add(win);
    // almohadillas de silicona y botón de encendido
    const padGeo = (up) => { const g = new THREE.CylinderGeometry(.6, .6, 1.3, 48, 1, true, up ? 0 : Math.PI, Math.PI); g.rotateZ(Math.PI / 2); g.rotateX(up ? Math.PI / 2 : -Math.PI / 2); return g; };
    [true, false].forEach((up) => { const pad = holoMesh(padGeo(up), C.dev, { real: 'rubber', realOpts: { color: '#8b949e', roughness: .95, side: THREE.DoubleSide }, ghost: .08, opacity: .005, rim: .2, edges: false }); pad.scale.set(1, .985, .985); clip.add(pad); });
    const btn = holoMesh(new THREE.CylinderGeometry(.09, .09, .05, 24), C.dev, { real: 'rubber', realOpts: { color: '#d7dde3' }, ghost: .2, edges: false }); btn.rotation.x = Math.PI / 2; btn.position.set(.35, .62, .62); clip.add(btn);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, .9, 24), realMat('plasticDark', { color: '#3b4452' })); hinge.rotation.x = Math.PI / 2; hinge.position.set(-.86, .02, 0); clip.add(hinge); // bisagra con resorte atrás
    // pantalla del aparato
    const scr = document.createElement('canvas'); scr.width = 512; scr.height = 256; const sg = scr.getContext('2d'); const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .7), new THREE.MeshBasicMaterial({ map: scrTex, color: '#69737c' }));
    screen.rotation.x = -Math.PI / 2; screen.position.set(0, 1.096, 0); clip.add(screen);
    // emisores y detector
    const LED_R = V(.75, .56, -.12), LED_I = V(.75, .56, .12), DET = V(.75, -.57, 0);
    const ledR = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), glowMat(C.red)); ledR.position.copy(LED_R); rig.add(ledR);
    const ledI = new THREE.Mesh(new THREE.SphereGeometry(.07, 20, 14), glowMat(C.ir)); ledI.position.copy(LED_I); rig.add(ledI);
    const det = new THREE.Mesh(new THREE.BoxGeometry(.32, .05, .26), glowMat(C.det, .6)); det.position.copy(DET); rig.add(det);
    const coneG = new THREE.ConeGeometry(.35, 1.1, 32, 1, true); coneG.translate(0, -.55, 0);
    const beamR = new THREE.Mesh(coneG, holoMat(C.red, { opacity: .03, rim: .25, scan: 0 })); beamR.position.copy(LED_R); rig.add(beamR);
    const beamI = new THREE.Mesh(coneG, holoMat(C.ir, { opacity: .03, rim: .25, scan: 0 })); beamI.position.copy(LED_I); rig.add(beamI);

    // Fotones
    const N = 260;
    const mk = (color) => { const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(99), 3)); const pts = new THREE.Points(geo, pointsMat(color, .085, 1)); rig.add(pts); return { geo, v: new Float32Array(N * 3), alive: new Uint8Array(N), hits: 0, rate: 0 }; };
    const ph = { red: mk(C.red), ir: mk(C.ir) };
    const src = { red: LED_R, ir: LED_I };

    // Etiquetas
    c.label({ es: 'LED roja', en: 'Red LED' }, '660 nm', V(-.1, 1.55, -.7), C.red);
    c.label({ es: 'LED infrarroja', en: 'Infrared LED' }, '940 nm', V(1.55, 1.55, .7), C.ir);
    c.label({ es: 'Fotodetector', en: 'Photodetector' }, null, V(.75, -1.1, .4), C.det);
    c.label({ es: 'Arteria', en: 'Artery' }, { es: 'late', en: 'pulses' }, V(-1.2, -.25, .55), C.art);
    c.label({ es: 'Pantalla', en: 'Display' }, null, V(.75, 1.75, 0), C.dev);
    c.label({ es: 'Vena', en: 'Vein' }, { es: 'casi no late', en: 'barely pulses' }, V(-1.4, .3, -.5), C.vein);

    // Panel de pletismografía
    const panel = c.side({ es: 'Pletismografía · luz que llega', en: 'Plethysmogram · light received' }, 120);
    const trR = sweepTrace(panel.canvas, '#ff4d6d', { speed: 150 });
    const g2 = document.createElement('canvas'); g2.width = panel.canvas.width; g2.height = panel.canvas.height; const trI = sweepTrace(g2, '#c08bff', { speed: 150 });

    const artColor = new THREE.Color(); const cOx = new THREE.Color('#ff2b45'), cDe = new THREE.Color('#6a2bd9');
    let scrT = 0, alt = 0, estSm = 97, rSm = .5;
    // la mesa no debe atravesar el oxímetro (el dedo queda algo flexionado hacia abajo)
    { rig.updateMatrixWorld(true); const cb = new THREE.Box3().setFromObject(clip, true), top = deskM.position.y + .3; if (cb.min.y < top) { const dy = top - cb.min.y + .02; deskM.position.y -= dy; floorM.position.y -= dy; } }
    // almohadilla de apoyo bajo el antebrazo: su cara superior sigue la parte de abajo del brazo real
    { const ag = AP.geo.arm, pa = ag.attributes.position, tv = V(0, 0, 0), top = ag.boundingBox.max.y, wristY = (835 - CEN[2]) / 20, under = (y0, y1) => { let lo = null; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); if (y < y0 || y > y1) continue; const w = hand.localToWorld(tv.fromBufferAttribute(pa, i).clone()); if (!lo || w.y < lo.y) lo = w; } return lo; };
      const p0 = under(wristY + .5, wristY + 2), p1 = under(top - 3, top - .5), deskTop = deskM.position.y + .3;
      if (p0 && p1) { const len = p0.distanceTo(p1) + 4, ang = Math.atan2(p1.y - p0.y, p1.x - p0.x), mid = p0.clone().lerp(p1, .5), hgt = Math.max(.4, mid.y - deskTop) + 1.2;
        const sh = new THREE.Shape(), w = len, h = hgt, r = .5; sh.moveTo(-w / 2 + r, -h); sh.lineTo(w / 2 - r, -h); sh.quadraticCurveTo(w / 2, -h, w / 2, -h + r); sh.lineTo(w / 2, -r); sh.quadraticCurveTo(w / 2, 0, w / 2 - r, 0); sh.lineTo(-w / 2 + r, 0); sh.quadraticCurveTo(-w / 2, 0, -w / 2, -r); sh.lineTo(-w / 2, -h + r); sh.quadraticCurveTo(-w / 2, -h, -w / 2 + r, -h);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 4.2, bevelEnabled: true, bevelThickness: .25, bevelSize: .25, bevelSegments: 4, curveSegments: 8 }); g.translate(0, 0, -2.1);
        const pad = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#7d9db8', roughness: .8, sheen: .5, sheenColor: new THREE.Color('#c9dbea') })); pad.position.set(mid.x, mid.y - .05, mid.z); pad.rotation.z = ang + (p1.x < p0.x ? Math.PI : 0); pad.castShadow = pad.receiveShadow = true; scene.add(pad); } }
    c.onFrame((dt, rdt) => {
      S.ph = (S.ph + dt * S.hr / 60) % 1;
      const p = pleth(S.ph);
      const blood = 1 + .55 * S.perf * p;
      artery.scale.set(1, 1, 1); artery.material.uniforms.uBoost.value = .15 + .5 * p * S.perf;
      const sw = 1 + .25 * p * S.perf; artery.scale.set(1, lerp(1, sw, .5), lerp(1, sw, .5));
      artColor.copy(cDe).lerp(cOx, smooth(.6, 1, S.sat)); artMat.uniforms.uColor.value.copy(artColor);
      // movimiento del dedo
      S.shake = lerp(S.shake, S.moving ? 1 : 0, 1 - Math.exp(-rdt * 6));
      finger.position.y = S.shake * .09 * Math.sin(c.time * 9.3) ; finger.position.z = S.shake * .06 * Math.sin(c.time * 6.1 + 1); finger.rotation.x = S.shake * .08 * Math.sin(c.time * 7.7);
      nailPolish.visible = S.polish;
      // emisión alternada
      alt += dt; const redOn = S.alternate ? (Math.floor(alt * 1.2) % 2 === 0) : true, irOn = S.alternate ? !redOn : true;
      ledR.material.opacity = redOn ? 1 : .15; ledI.material.opacity = irOn ? 1 : .15;
      beamR.visible = redOn; beamI.visible = irOn;
      // fotones
      const motion = S.shake * Math.abs(Math.sin(c.time * 9.3));
      for (const k of ['red', 'ir']) {
        const P = ph[k], a = P.geo.attributes.position, on = k === 'red' ? redOn : irOn;
        const mu = (.35 + (S.polish ? (k === 'red' ? .9 : .5) : 0)) + 1.1 * blood * eps(k, S.sat) + motion * .8;
        for (let i = 0; i < N; i++) {
          if (!P.alive[i]) {
            if (on && Math.random() < .18) { P.alive[i] = 1; const s = src[k]; a.setXYZ(i, s.x + (Math.random() - .5) * .1, s.y, s.z + (Math.random() - .5) * .1); P.v[i * 3] = (Math.random() - .5) * .5; P.v[i * 3 + 1] = -1.3 - Math.random() * .4; P.v[i * 3 + 2] = (Math.random() - .5) * .5; }
            else { a.setXYZ(i, 99, 99, 99); continue; }
          }
          let x = a.getX(i), y = a.getY(i), z = a.getZ(i);
          const inside = y < .5 && y > -.5;
          if (inside) { P.v[i * 3] += (Math.random() - .5) * 6 * dt; P.v[i * 3 + 2] += (Math.random() - .5) * 6 * dt; if (Math.random() < mu * dt * 1.6) { P.alive[i] = 0; a.setXYZ(i, 99, 99, 99); continue; } }
          x += P.v[i * 3] * dt; y += P.v[i * 3 + 1] * dt; z += P.v[i * 3 + 2] * dt;
          if (y < DET.y + .03) { if (Math.abs(x - DET.x) < .3 && Math.abs(z) < .26) P.hits++; P.alive[i] = 0; a.setXYZ(i, 99, 99, 99); continue; }
          a.setXYZ(i, x, y, z);
        }
        a.needsUpdate = true;
        P.rate = lerp(P.rate, P.hits / Math.max(dt, 1e-3), 1 - Math.exp(-rdt * 3)); P.hits = 0;
      }
      det.material.opacity = clamp(.25 + (ph.red.rate + ph.ir.rate) / 900, .25, 1);
      // señales analíticas (Beer-Lambert simplificado)
      const noise = S.shake * (.6 * Math.sin(c.time * 9.3) + .3 * Math.sin(c.time * 23)) + (Math.random() - .5) * .02 * (1 / Math.max(S.perf, .2));
      const att = (k) => Math.exp(-(.35 + (S.polish ? (k === 'red' ? .9 : .5) : 0) + 1.1 * (1 + .55 * S.perf * p) * eps(k, S.sat)));
      const dc = (k) => Math.exp(-(.35 + (S.polish ? (k === 'red' ? .9 : .5) : 0) + 1.1 * (1 + .55 * S.perf * .45) * eps(k, S.sat)));
      const sR = att('red') / dc('red') - 1 + noise * .08, sI = att('ir') / dc('ir') - 1 + noise * .08;
      trR.push(-sR * 2.6, dt); trI.push(-sI * 2.6, dt);
      trR.draw(panel.canvas.height * .5, panel.canvas.height * .42); trI.draw(panel.canvas.height * .5, panel.canvas.height * .85);
      panel.ctx.drawImage(g2, 0, 0); // superpone infrarroja (dibujo separado para no borrar)
      // R y SpO2 estimada
      const acR = (1 - Math.exp(-1.1 * .55 * S.perf * eps('red', S.sat))), acI = (1 - Math.exp(-1.1 * .55 * S.perf * eps('ir', S.sat)));
      const Rtrue = acR / acI; const quality = clamp(1 - S.shake * 1.2, 0, 1) * smooth(.08, .3, S.perf) * (S.polish ? .7 : 1);
      S.quality = quality;
      const Rm = Rtrue + (1 - quality) * (Math.random() - .5) * 1.4;
      rSm = lerp(rSm, Rm, 1 - Math.exp(-rdt * 1.5)); estSm = clamp(110 - 25 * rSm, 50, 100);
      S.est = estSm; S.R = rSm;
      c.state.mEst?.(quality < .35 ? '--' : Math.round(estSm)); c.state.mR?.(rSm.toFixed(2));
      panel.right.textContent = `R ${rSm.toFixed(2)} · ${lang === 'en' ? 'PI' : 'IP'} ${(S.perf * 2.4).toFixed(1)}%`;
      // pantalla 3D
      scrT += rdt; if (scrT > .1) { scrT = 0; drawScreen(sg, scr, quality, estSm, p); scrTex.needsUpdate = true; }
    });
  }
});

const bars = new Array(28).fill(0);
function drawScreen(g, cv, q, est, p) {
  g.clearRect(0, 0, cv.width, cv.height); g.fillStyle = 'rgba(0,10,20,.85)'; g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = 'rgba(125,249,255,.5)'; g.lineWidth = 4; g.strokeRect(4, 4, cv.width - 8, cv.height - 8);
  g.fillStyle = '#7df9ff'; g.font = '700 30px "Manrope Variable",system-ui'; g.fillText('SpO₂', 26, 54); g.fillText('PR', 300, 54);
  g.font = '800 104px "Unbounded Variable",system-ui'; g.fillStyle = q < .35 ? '#ffb020' : '#ffffff';
  g.fillText(q < .35 ? '--' : String(Math.round(est)), 22, 170); g.font = '800 70px "Unbounded Variable",system-ui'; g.fillText('72', 296, 150);
  g.fillStyle = '#ff4d6d'; g.font = '700 32px system-ui'; g.fillText('♥', 430, 150);
  bars.shift(); bars.push(p); g.fillStyle = '#7df9ff'; bars.forEach((b, i) => { const h = 6 + b * 50; g.fillRect(300 + i * 7, 236 - h, 4, h); });
  if (q < .35) { g.fillStyle = '#ffb020'; g.font = '700 24px "Manrope Variable",system-ui'; g.fillText(lang === 'en' ? 'SEARCHING…' : 'BUSCANDO…', 26, 232); }
}
