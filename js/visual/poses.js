/*
 * SOMBRA · js/visual/poses.js  [Animación]
 *
 * Biblioteca ORIGINAL de poses clave y animaciones para todos los ids de ARCHITECTURE §3.
 * Las poses usan el formato descrito en figure.js (guardia ortodoxa; el zurdo es un espejo).
 *
 * API (ARCHITECTURE §8.5):
 *   SB.visual.poses.has(animId)     -> boolean
 *   SB.visual.poses.list()          -> [animId]
 *   SB.visual.poses.clip(animId)    -> keyframes   (guardia → acción → vuelta a guardia → pausa; para bucle)
 *   SB.visual.poses.sequence(ids)   -> keyframes   (movimientos encadenados sin volver a la guardia completa)
 *
 * CONTRATO: "keyframes" es un Array de { t (ms desde el inicio), p (pose), ease, via? } al que se añaden
 *   propiedades: duration, arrows, fx, ghosts, marks, footprints, steps ([{ t, id, index }]) e id.
 *   Extra: SB.visual.poses.guardPose() (pose estática de guardia) y SB.visual.poses.CODES (código '1'..'6b' → id).
 *
 * Criterios técnicos (guardia ortodoxa; +x = lado atrasado, +z = rival):
 *   - Rectos: trayectoria en línea recta; golpes de la mano atrasada con giro de cadera y pivote
 *     del pie atrasado (talón arriba, punta hacia delante).
 *   - Ganchos: arco horizontal desde fuera (codo alto); la mano adelantada gira el tronco hacia el
 *     lado atrasado y pivota el pie adelantado.
 *   - Uppercuts: pequeña bajada de cadera y del guante y subida vertical.
 *   - Al cuerpo: flexión de piernas (cambio de nivel), no solo bajar el brazo.
 *   - Slip atrasado: la cabeza termina sobre la rodilla atrasada (tronco cargado al lado atrasado).
 *     Slip adelantado: la cabeza sobre la rodilla adelantada.
 *   - Roll: trayectoria en U bajo un gancho (flecha curva).
 *   - Agachada: flexión de piernas; la cabeza nunca baja de ~1,25 m (cintura del rival ≈ 1 m).
 *   - Pivote: gira sobre el metatarso del pie adelantado; el cuerpo sale hacia el lado adelantado
 *     (fuera de la línea de ataque) y el pie atrasado barre por detrás. En diestro: giro horario.
 */
(function (SB) {
  'use strict';

  SB.visual = SB.visual || {};

  var DEG = Math.PI / 180;
  var SPINE = 0.50;        // = RIG.spine de figure.js (base del cuello = cadera + columna·0,5)
  var TS = 1.15;           // escala global de tiempos (algo más lento que real, para entenderlo)
  var CHAIN = 0.92;        // golpes encadenados algo más rápidos que sueltos
  var RET = 360;           // vuelta a guardia
  var PAUSE = 650;         // pausa final de un movimiento suelto
  var PAUSE_SEQ = 820;     // pausa final de una combinación

  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }

  function neckOf(p) {
    var sx = Math.tan(p.lean * DEG), sz = Math.tan(p.bend * DEG);
    var l = Math.sqrt(sx * sx + 1 + sz * sz);
    return [p.hx + sx / l * SPINE, p.hy + 1 / l * SPINE, p.hz + sz / l * SPINE];
  }

  // ───────────────────────── guardia base ─────────────────────────
  var LF0 = [-0.12, 0.25, 12, 0, 0];      // pie adelantado: x, z, yaw punta, talón, altura
  var RF0 = [0.15, -0.27, 50, 0.3, 0];    // pie atrasado (talón algo levantado)
  var GL = [-0.05, 0.13, 0.32];           // guante adelantado (rel. base del cuello)
  var GR = [0.07, 0.10, 0.13];            // guante atrasado junto al mentón

  var GUARD = {
    rx: 0, rz: 0, ry: 0,
    hx: 0.02, hy: 0.86, hz: -0.02,
    hyaw: 44, syaw: 38, lean: 0, bend: 5,
    lsh: 0, rsh: 0, hd: [0, 0, 0],
    lh: GL, rh: GR,
    le: [-0.35, -1, -0.05], re: [0.35, -1, -0.15],
    lf: LF0, rf: RF0,
    a: 1
  };

  function F(base, o) {
    o = o || {};
    return [
      o.x != null ? o.x : base[0], o.z != null ? o.z : base[1], o.yaw != null ? o.yaw : base[2],
      o.lift != null ? o.lift : base[3], o.h != null ? o.h : base[4]
    ];
  }
  function LF(o) { return F(LF0, o); }
  function RF(o) { return F(RF0, o); }

  /** Pose = guardia + cambios. `abs.lh/rh`: objetivo del guante en coordenadas absolutas (locales). */
  function P(over, abs) {
    var p = {}, k;
    for (k in GUARD) p[k] = Array.isArray(GUARD[k]) ? GUARD[k].slice() : GUARD[k];
    if (over) for (k in over) p[k] = Array.isArray(over[k]) ? over[k].slice() : over[k];
    if (abs) {
      var n = neckOf(p);
      if (abs.lh) p.lh = sub(abs.lh, n);
      if (abs.rh) p.rh = sub(abs.rh, n);
    }
    return p;
  }

  /** Keyframe: duración (ms) hasta esta pose, easing de entrada, puntos de control (via) y extras. */
  function K(d, p, ease, via, extra) {
    var k = { d: d, p: p, ease: ease || 'io' };
    if (via) {
      var n = neckOf(p), v = {};
      for (var key in via) {
        if (key === 'lhA') v.lh = sub(via[key], n);
        else if (key === 'rhA') v.rh = sub(via[key], n);
        else v[key] = via[key];
      }
      k.via = v;
    }
    if (extra) for (var x in extra) k[x] = extra[x];
    return k;
  }

  var G = P();
  var HEAD0 = (function () { var n = neckOf(G); return [n[0] + 0.005, n[1] + 0.16, n[2] + 0.03]; })();

  // ───────────────────────── objetivos (rival imaginario) ─────────────────────────
  var T_HEAD = [-0.02, 1.50, 0.80];
  var T_BODY = [-0.02, 1.10, 0.86];

  var DEF = {};
  var LOAD = [K(110, G, 'io')];

  function punch(hand, pose, dur, via, ease) {
    return {
      kind: 'punch', hand: hand,
      load: LOAD,
      act: [K(dur, pose, ease || 'snap', via, { imp: hand })],
      hold: 110
    };
  }

  // ── 1 · Jab
  DEF.jab = punch('l', P({
    hx: 0.0, hz: 0.03, hyaw: 50, syaw: 60, bend: 7, lean: -2,
    le: [-0.25, -1, 0], rf: RF({ lift: 0.4 })
  }, { lh: T_HEAD }), 190);

  // ── 2 · Directo (cross): giro de cadera y pivote del pie atrasado
  DEF.cross = punch('r', P({
    hx: -0.02, hz: 0.06, hyaw: 12, syaw: -14, bend: 10, lean: -4,
    lh: [-0.04, 0.13, 0.17], re: [0.2, -1, 0],
    rf: RF({ yaw: 12, lift: 0.85 })
  }, { rh: [0.0, 1.50, 0.80] }), 210);

  // ── 3 · Gancho adelantado: codo alto, arco desde fuera, gira hacia el lado atrasado
  DEF.lead_hook = punch('l', P({
    hx: 0.03, hz: 0.0, hyaw: 72, syaw: 92, bend: 6, lean: 3,
    le: [-1, 0.5, -0.1], rh: [0.06, 0.11, 0.14],
    lf: LF({ yaw: 60, lift: 0.55 }), rf: RF({ yaw: 55, lift: 0.15 })
  }, { lh: [0.10, 1.48, 0.56] }), 270, { lhA: [-0.64, 1.50, 0.30] }, 'out');

  // ── 4 · Gancho atrasado
  DEF.rear_hook = punch('r', P({
    hx: -0.01, hz: 0.05, hyaw: 4, syaw: -32, bend: 8, lean: -4,
    lh: [-0.04, 0.13, 0.16], re: [1, 0.5, -0.1],
    rf: RF({ yaw: 8, lift: 0.9 })
  }, { rh: [-0.14, 1.48, 0.54] }), 280, { rhA: [0.66, 1.50, 0.14] }, 'out');

  // ── 5 · Uppercut adelantado: baja cadera y guante, sube vertical
  DEF.lead_upper = punch('l', P({
    hx: 0.02, hz: 0.02, hy: 0.86, hyaw: 64, syaw: 76, bend: 4, lean: 2,
    le: [-0.2, -1, 0.2], lf: LF({ yaw: 40, lift: 0.35 })
  }, { lh: [-0.02, 1.50, 0.50] }), 290, { lhA: [-0.16, 0.96, 0.36], hy: 0.70, lean: -10 }, 'out');

  // ── 6 · Uppercut atrasado
  DEF.rear_upper = punch('r', P({
    hx: -0.01, hz: 0.04, hyaw: 14, syaw: -6, bend: 7, lean: -2,
    lh: [-0.04, 0.13, 0.16], re: [0.2, -1, 0.2],
    rf: RF({ yaw: 12, lift: 0.85 })
  }, { rh: [0.04, 1.50, 0.52] }), 290, { rhA: [0.18, 0.96, 0.26], hy: 0.70, lean: 10 }, 'out');

  // ── Al cuerpo: cambio de nivel con las piernas
  DEF.jab_body = punch('l', P({
    hx: 0.0, hz: 0.05, hy: 0.76, hyaw: 50, syaw: 58, bend: 14, lean: -4,
    rh: [0.07, 0.12, 0.12], le: [-0.2, -1, 0.05], rf: RF({ lift: 0.45 })
  }, { lh: T_BODY }), 200);

  DEF.cross_body = punch('r', P({
    hx: -0.03, hz: 0.07, hy: 0.76, hyaw: 12, syaw: -12, bend: 15, lean: -6,
    lh: [-0.04, 0.14, 0.16], re: [0.2, -1, 0],
    rf: RF({ yaw: 12, lift: 0.7 })
  }, { rh: [0.0, 1.10, 0.84] }), 220);

  DEF.lead_hook_body = punch('l', P({
    hx: 0.0, hz: 0.02, hy: 0.76, hyaw: 70, syaw: 86, bend: 12, lean: -10,
    le: [-1, -0.15, -0.1], rh: [0.07, 0.12, 0.13],
    lf: LF({ yaw: 55, lift: 0.5 }), rf: RF({ lift: 0.2 })
  }, { lh: [0.10, 1.12, 0.60] }), 280, { lhA: [-0.62, 1.06, 0.30] }, 'out');

  DEF.rear_hook_body = punch('r', P({
    hx: 0.02, hz: 0.04, hy: 0.76, hyaw: 4, syaw: -26, bend: 12, lean: 9,
    re: [1, -0.15, -0.1], lh: [-0.04, 0.14, 0.16],
    rf: RF({ yaw: 8, lift: 0.7 })
  }, { rh: [-0.04, 1.12, 0.52] }), 290, { rhA: [0.64, 1.06, 0.12] }, 'out');

  DEF.lead_upper_body = punch('l', P({
    hx: 0.01, hz: 0.03, hy: 0.76, hyaw: 62, syaw: 72, bend: 10, lean: 0,
    le: [-0.2, -1, 0.2], lf: LF({ yaw: 40, lift: 0.35 })
  }, { lh: [-0.02, 1.18, 0.60] }), 290, { lhA: [-0.14, 0.84, 0.36], hy: 0.66, lean: -10 }, 'out');

  DEF.rear_upper_body = punch('r', P({
    hx: -0.01, hz: 0.05, hy: 0.75, hyaw: 14, syaw: -4, bend: 11, lean: -2,
    lh: [-0.04, 0.14, 0.16], re: [0.2, -1, 0.2],
    rf: RF({ yaw: 12, lift: 0.7 })
  }, { rh: [0.03, 1.18, 0.60] }), 290, { rhA: [0.17, 0.84, 0.30], hy: 0.66, lean: 10 }, 'out');

  // ───────────────────────── defensas ─────────────────────────
  // Flechas: pts en coordenadas locales absolutas; tiempos relativos al inicio de la acción.
  function straightAt(fromX, toPt, extra) {
    var a = { pts: [[fromX, toPt[1], 1.40], toPt], curve: false, t0: -260, t1: 300, t2: 560, t3: 760 };
    if (extra) for (var k in extra) a[k] = extra[k];
    return a;
  }

  function defense(pose, dur, arrows, opts) {
    opts = opts || {};
    var act = opts.act || [K(dur, pose, opts.ease || 'out', opts.via)];
    return { kind: 'defense', act: act, hold: opts.hold != null ? opts.hold : 320, arrows: arrows || [] };
  }

  // Bloqueo alto: guante atrasado a la sien ante un gancho que llega por el lado atrasado
  DEF.block_high = defense(P({
    hx: 0.03, hy: 0.84, hyaw: 46, syaw: 44, lean: 4, bend: 5,
    rh: [0.13, 0.19, 0.04], re: [0.4, -0.6, 0.8], lh: [-0.05, 0.15, 0.27]
  }), 210, [{
    pts: [[0.95, 1.72, -0.10], [0.75, 1.74, -0.32], [0.28, 1.55, 0.08]], curve: true,
    t0: -280, t1: 220, t2: 520, t3: 720
  }]);

  // Bloqueo con el codo: codo atrasado cubre el costado ante un gancho al cuerpo
  DEF.block_body = defense(P({
    hx: 0.04, hy: 0.81, hz: -0.02, hyaw: 50, syaw: 50, lean: 8, bend: 10,
    rh: [0.06, 0.12, 0.10], re: [0.15, -1, 0.45], lh: [-0.05, 0.14, 0.26]
  }), 220, [{
    pts: [[0.95, 1.25, -0.10], [0.75, 1.27, -0.32], [0.30, 1.08, 0.04]], curve: true,
    t0: -280, t1: 230, t2: 520, t3: 720
  }]);

  // Parada del jab con la mano atrasada (palmada corta que desvía hacia el lado adelantado)
  DEF.parry_jab = defense(null, 0, [{
    pts: [[0.16, 1.53, 1.40], [0.05, 1.52, 0.44], [-0.22, 1.36, 0.36]], curve: false,
    t0: -250, t1: 270, t2: 520, t3: 700
  }], {
    act: [
      K(160, P({ syaw: 34, hz: -0.01, lh: [-0.13, 0.08, 0.29], rh: [0.02, 0.16, 0.34], re: [0.25, -1, 0.1] }), 'out'),
      K(110, P({ syaw: 36, lh: [-0.13, 0.08, 0.29], rh: [-0.07, 0.03, 0.31], re: [0.25, -1, 0.1] }), 'out')
    ],
    hold: 200
  });

  // Parada del directo con la mano adelantada (desvía hacia el lado atrasado)
  DEF.parry_cross = defense(null, 0, [{
    pts: [[-0.16, 1.53, 1.40], [0.04, 1.52, 0.46], [0.28, 1.36, 0.34]], curve: false,
    t0: -250, t1: 270, t2: 520, t3: 700
  }], {
    act: [
      K(160, P({ syaw: 42, lh: [0.03, 0.16, 0.34], le: [-0.4, -1, 0.1], rh: [0.10, 0.05, 0.11] }), 'out'),
      K(110, P({ syaw: 44, lh: [0.13, 0.06, 0.29], le: [-0.4, -1, 0.1], rh: [0.10, 0.05, 0.11] }), 'out')
    ],
    hold: 200
  });

  // Slip al lado atrasado (ante el jab): cabeza sobre la rodilla atrasada, carga la mano atrasada
  DEF.slip_rear = defense(P({
    hx: 0.05, hz: -0.05, hy: 0.80, hyaw: 50, syaw: 54, lean: 10, bend: 8,
    lf: LF({ lift: 0.1 }), rf: RF({ lift: 0.15 })
  }), 230, [straightAt(0.16, [-0.02, 1.53, -0.20])]);

  // Slip al lado adelantado (ante el directo): cabeza sobre la rodilla adelantada
  DEF.slip_lead = defense(P({
    hx: -0.03, hz: 0.05, hy: 0.80, hyaw: 36, syaw: 24, lean: -10, bend: 12,
    rf: RF({ lift: 0.5, yaw: 40 })
  }), 230, [straightAt(-0.16, [0.06, 1.53, -0.20])]);

  // Roll: U bajo un gancho; termina en el lado adelantado (gancho que llega por el lado atrasado)
  DEF.roll_lead = defense(P({
    hx: -0.03, hz: 0.03, hy: 0.83, hyaw: 36, syaw: 26, lean: -8, bend: 8,
    rf: RF({ lift: 0.45 })
  }), 480, [{
    pts: [[0.95, 1.70, -0.05], [0.30, 1.68, -0.42], [-0.62, 1.50, 0.10]], curve: true,
    t0: -160, t1: 340, t2: 560, t3: 760
  }], { ease: 'sio', via: { hy: 0.48, bend: 30, hz: 0.06 } });

  DEF.roll_rear = defense(P({
    hx: 0.05, hz: -0.04, hy: 0.82, hyaw: 50, syaw: 54, lean: 9, bend: 8,
    lf: LF({ lift: 0.1 })
  }), 480, [{
    pts: [[-0.88, 1.52, 0.85], [-0.74, 1.55, -0.24], [0.62, 1.52, 0.0]], curve: true,
    t0: -160, t1: 340, t2: 560, t3: 760
  }], { ease: 'sio', via: { hy: 0.48, bend: 30, hz: 0.04 } });

  // Pull back: el peso va a la pierna atrasada y el tronco se inclina atrás; el golpe se queda corto
  DEF.pull_back = defense(P({
    hx: 0.05, hz: -0.10, hy: 0.85, hyaw: 48, syaw: 46, lean: 4, bend: -15,
    lf: LF({ lift: 0.2 }), rf: RF({ lift: 0.05 })
  }), 240, [straightAt(0.16, [0.04, 1.53, 0.17], { t1: 260 })]);

  // Agachada: flexión de piernas, tronco casi vertical (cabeza ≥ 1,25 m: nunca bajo la cintura rival)
  DEF.duck = defense(P({
    hx: 0.02, hz: 0.0, hy: 0.66, hyaw: 44, syaw: 40, bend: 14,
    rf: RF({ lift: 0.35 })
  }), 260, [straightAt(0.14, [0.0, 1.56, -0.30])]);

  // Shoulder roll: hombro adelantado sube al mentón, giro hacia el lado atrasado
  DEF.shoulder_roll = defense(P({
    hx: 0.05, hz: -0.06, hy: 0.84, hyaw: 58, syaw: 74, lean: 7, bend: 2,
    lsh: 0.05, hd: [0.01, -0.03, -0.01],
    lh: [0.02, -0.30, 0.22], le: [-0.3, -1, 0.3], rh: [0.07, 0.11, 0.11],
    lf: LF({ lift: 0.25 }), rf: RF({ lift: 0.1 })
  }), 240, [{
    pts: [[-0.12, 1.50, 1.40], [0.04, 1.42, 0.24], [0.18, 1.62, 0.10]], curve: false,
    t0: -260, t1: 260, t2: 540, t3: 740
  }]);

  // ───────────────────────── desplazamientos ─────────────────────────
  var S = 0.22; // longitud de paso (m)

  function move(act, delta) { return { kind: 'move', act: act, hold: 0, delta: delta }; }

  // Paso adelante: primero el pie adelantado, después el atrasado
  DEF.step_in = move([
    K(230, P({ rz: S / 2, lf: LF({ z: LF0[1] + S / 2 }), rf: RF({ z: RF0[1] - S / 2, lift: 0.55 }) }), 'io',
      { lf: [null, null, null, null, 0.10] }),
    K(210, P({ rz: S }), 'io', { rf: [null, null, null, 0.6, 0.07] })
  ], { x: 0, z: S, y: 0 });

  // Paso atrás: primero el pie atrasado
  DEF.step_back = move([
    K(230, P({ rz: -S / 2, lf: LF({ z: LF0[1] + S / 2 }), rf: RF({ z: RF0[1] - S / 2 }) }), 'io',
      { rf: [null, null, null, null, 0.09] }),
    K(210, P({ rz: -S }), 'io', { lf: [null, null, null, null, 0.07] })
  ], { x: 0, z: -S, y: 0 });

  // Lateral hacia el lado adelantado: se mueve primero el pie adelantado
  DEF.lateral_lead = move([
    K(230, P({ rx: -S / 2, lf: LF({ x: LF0[0] - S / 2 }), rf: RF({ x: RF0[0] + S / 2 }) }), 'io',
      { lf: [null, null, null, null, 0.09] }),
    K(210, P({ rx: -S }), 'io', { rf: [null, null, null, null, 0.07] })
  ], { x: -S, z: 0, y: 0 });

  // Lateral hacia el lado atrasado: se mueve primero el pie atrasado
  DEF.lateral_rear = move([
    K(230, P({ rx: S / 2, lf: LF({ x: LF0[0] - S / 2 }), rf: RF({ x: RF0[0] + S / 2 }) }), 'io',
      { rf: [null, null, null, null, 0.09] }),
    K(210, P({ rx: S }), 'io', { lf: [null, null, null, null, 0.07] })
  ], { x: S, z: 0, y: 0 });

  // Pivote sobre el pie adelantado (giro horario en diestro): el pie atrasado barre por detrás
  DEF.pivot = move([
    K(300, P({ ry: 34, lf: LF({ lift: 0.5 }), rf: RF({ lift: 0.65 }) }), 'io', { rf: [null, null, null, null, 0.05] }),
    K(300, P({ ry: 75 }), 'io', { rf: [null, null, null, null, 0.04] })
  ], { x: 0, z: 0, y: 75 });

  // Cambio de ángulo: paso diagonal hacia fuera con el pie adelantado y reorientación hacia el rival
  DEF.angle_step = move([
    K(240, P({ rx: -0.10, rz: 0.08, lf: LF({ x: LF0[0] - 0.10, z: LF0[1] + 0.08 }), rf: RF({ x: RF0[0] + 0.10, z: RF0[1] - 0.08 }) }), 'io',
      { lf: [null, null, null, null, 0.09] }),
    K(300, P({ rx: -0.20, rz: 0.16, ry: 30, lf: LF({ lift: 0.3 }) }), 'io', { rf: [null, null, null, null, 0.06] }),
    K(120, P({ rx: -0.20, rz: 0.16, ry: 30 }), 'io')
  ], { x: -0.20, z: 0.16, y: 30 });

  // Ajuste de distancia: pequeño rebote fuera y dentro
  DEF.distance_reset = move([
    K(170, P({ rz: -0.09, hz: -0.03 }), 'io', { lf: [null, null, null, null, 0.035], rf: [null, null, null, null, 0.035] }),
    K(120, P({ rz: -0.09, hz: -0.03 }), 'io'),
    K(180, P({ rz: 0 }), 'io', { lf: [null, null, null, null, 0.035], rf: [null, null, null, null, 0.035] })
  ], { x: 0, z: 0, y: 0 });
  DEF.distance_reset.showFootprints = true;

  // Péndulo: vaivén adelante-atrás con los dos pies a la vez (pequeño impulso), sin cambiar la base
  DEF.pendulum = move([
    K(180, P({ rz: 0.17, hz: 0.04, bend: 8 }), 'io', { lf: [null, null, null, null, 0.06], rf: [null, null, null, null, 0.065], hy: 0.89 }),
    K(90, P({ rz: 0.17, hz: 0.04, bend: 8 }), 'lin'),
    K(200, P({ rz: -0.07, hz: -0.03, bend: 3 }), 'io', { lf: [null, null, null, null, 0.06], rf: [null, null, null, null, 0.065], hy: 0.89 }),
    K(170, P({ rz: 0 }), 'io', { lf: [null, null, null, null, 0.04], rf: [null, null, null, null, 0.04] })
  ], { x: 0, z: 0, y: 0 });
  DEF.pendulum.showFootprints = true;

  // Salida en L: paso atrás y, enlazado, lateral hacia el lado atrasado (pie atrasado primero en ambos)
  DEF.l_step = move([
    K(220, P({ rz: -S / 2, lf: LF({ z: LF0[1] + S / 2 }), rf: RF({ z: RF0[1] - S / 2 }) }), 'io',
      { rf: [null, null, null, null, 0.09] }),
    K(190, P({ rz: -S }), 'io', { lf: [null, null, null, null, 0.07] }),
    K(210, P({ rz: -S, rx: S / 2, lf: LF({ x: LF0[0] - S / 2 }), rf: RF({ x: RF0[0] + S / 2 }) }), 'io',
      { rf: [null, null, null, null, 0.09] }),
    K(190, P({ rz: -S, rx: S }), 'io', { lf: [null, null, null, null, 0.07] })
  ], { x: S, z: -S, y: 0 });

  // Paso en Z: lateral hacia el lado adelantado y pivote sobre el pie adelantado (giro horario en diestro)
  DEF.z_step = move([
    K(220, P({ rx: -S / 2, lf: LF({ x: LF0[0] - S / 2 }), rf: RF({ x: RF0[0] + S / 2 }) }), 'io',
      { lf: [null, null, null, null, 0.09] }),
    K(190, P({ rx: -S }), 'io', { rf: [null, null, null, null, 0.07] }),
    K(260, P({ rx: -S, ry: 30, lf: LF({ lift: 0.5 }), rf: RF({ lift: 0.65 }) }), 'io', { rf: [null, null, null, null, 0.05] }),
    K(260, P({ rx: -S, ry: 65 }), 'io', { rf: [null, null, null, null, 0.04] })
  ], { x: -S, z: 0, y: 65 });

  // Cambio D'Amato: el pie atrasado pasa delante en diagonal y el cuerpo gira a la guardia contraria;
  // en SOMBRA cierra la combinación, así que la animación vuelve después a la guardia propia.
  var SWITCHED = P({
    rx: -0.03, rz: 0.17, hx: -0.02, hz: 0.02, hyaw: -34, syaw: -30, bend: 7,
    lh: [-0.07, 0.10, 0.14], rh: [0.05, 0.13, 0.31], le: [-0.35, -1, -0.15], re: [0.35, -1, -0.05],
    lf: LF({ x: -0.09, z: 0.08, yaw: -40, lift: 0.4 }), rf: RF({ x: 0.06, z: 0.41, yaw: -12, lift: 0 })
  });
  DEF.damato_shift = move([
    K(120, P({ hyaw: 30, syaw: 22, bend: 8, rf: RF({ lift: 0.7 }) }), 'io'),
    K(300, SWITCHED, 'io', { rf: [null, null, null, null, 0.10], hyaw: 0, syaw: -4 }),
    K(320, SWITCHED, 'lin'),
    K(320, G, 'io', { rf: [null, null, null, null, 0.09], hyaw: 4, syaw: 0 })
  ], { x: 0, z: 0, y: 0 });
  DEF.damato_shift.showFootprints = true;

  // Shift de Lomachenko: el pie atrasado avanza en diagonal hacia su lado y el adelantado lo rodea;
  // termina en la guardia propia, más adelante, desplazado hacia el lado atrasado y reorientado al rival.
  DEF.loma_shift = move([
    K(260, P({
      rx: 0.10, rz: 0.22, hyaw: 20, syaw: 14, bend: 7,
      lf: LF({ x: -0.22, z: 0.03, yaw: 30, lift: 0.3 }), rf: RF({ x: 0.22, z: -0.04, yaw: 20, lift: 0 })
    }), 'io', { rf: [null, null, null, null, 0.10] }),
    K(300, P({ rx: 0.17, rz: 0.45, ry: -25 }), 'io', { lf: [null, null, null, null, 0.10], hyaw: 30 }),
    K(120, P({ rx: 0.17, rz: 0.45, ry: -25 }), 'io')
  ], { x: 0.17, z: 0.45, y: -25 });

  // ───────────────────────── fintas y ritmo ─────────────────────────
  DEF.feint_jab = {
    kind: 'feint', hand: 'l',
    act: [
      K(130, P({ hz: 0.02, hy: 0.83, syaw: 48, hyaw: 47, bend: 7, lsh: 0.02, lh: [-0.05, 0.13, 0.44] }), 'snap',
        { lf: [null, null, null, null, 0.035] }),
      K(220, G, 'io')
    ],
    hold: 0,
    peakKey: 0,
    ghosts: [{ t0: -40, t1: 520, at: [-0.02, 1.50, 0.78], hand: 'l' }]
  };

  DEF.feint_level = {
    kind: 'feint', hand: 'l',
    act: [
      K(220, P({ hy: 0.76, bend: 14, hz: 0.03, syaw: 44, lh: [-0.05, 0.0, 0.33], le: [-0.3, -1, 0], rf: RF({ lift: 0.45 }) }), 'out'),
      K(140, P({ hy: 0.76, bend: 14, hz: 0.03, syaw: 44, lh: [-0.05, 0.0, 0.33], le: [-0.3, -1, 0], rf: RF({ lift: 0.45 }) }), 'io'),
      K(240, G, 'io')
    ],
    hold: 0,
    peakKey: 1,
    ghosts: [{ t0: 60, t1: 640, at: [-0.02, 1.10, 0.84], hand: 'l' }]
  };

  var UP = P({ hy: 0.885, lf: LF({ lift: 0.35 }), rf: RF({ lift: 0.55 }) });
  var SETTLE = P({ hy: 0.85, bend: 6 });
  DEF.rhythm_break = {
    kind: 'rhythm',
    act: [
      K(150, UP, 'sio'), K(150, G, 'sio'), K(150, UP, 'sio'), K(150, G, 'sio'),
      K(180, SETTLE, 'io'), K(600, SETTLE, 'lin')
    ],
    chainAct: [K(160, SETTLE, 'io'), K(460, SETTLE, 'lin')],
    hold: 0,
    peakKey: 4,
    marks: [{ type: 'pause', t0: 600, t1: 1380 }],
    chainMarks: [{ type: 'pause', t0: 40, t1: 620 }]
  };

  // Guardia: rebote suave sobre los metatarsos
  var UP2 = P({ hy: 0.875, lf: LF({ lift: 0.2 }), rf: RF({ lift: 0.45 }) });
  DEF.guard = {
    kind: 'base',
    act: [K(320, UP2, 'sio'), K(320, G, 'sio'), K(320, UP2, 'sio'), K(320, G, 'sio')],
    hold: 0
  };

  // ───────────────────────── construcción de clips ─────────────────────────
  function compose(R, k) {
    var a = R.y * DEG, c = Math.cos(a), s = Math.sin(a);
    return { x: R.x + k.x * c + k.z * s, z: R.z - k.x * s + k.z * c, y: R.y + k.y };
  }
  function withRoot(p, R) {
    var q = {}, k;
    for (k in p) q[k] = p[k];
    var r = compose(R, { x: p.rx || 0, z: p.rz || 0, y: p.ry || 0 });
    q.rx = r.x; q.rz = r.z; q.ry = r.y;
    return q;
  }
  function fade(p, a) { var q = {}; for (var k in p) q[k] = p[k]; q.a = a; return q; }
  function isZero(R) { return Math.abs(R.x) < 1e-6 && Math.abs(R.z) < 1e-6 && Math.abs(R.y) < 1e-6; }

  function Builder() {
    this.t = 0;
    this.R = { x: 0, z: 0, y: 0 };
    this.keys = [{ t: 0, p: G, ease: 'lin' }];
    this.arrows = []; this.fx = []; this.ghosts = []; this.marks = []; this.steps = [];
    this.moved = false; this.showFoot = false; this.prev = null; this.last = G;
  }
  Builder.prototype.push = function (d, p, ease, via) {
    this.t += d * TS;
    var k = { t: this.t, p: withRoot(p, this.R), ease: ease || 'io' };
    if (via) k.via = via;
    this.keys.push(k);
    this.last = p;
  };
  Builder.prototype.add = function (def, id, index, chain) {
    var prev = this.prev, i, k;
    this.steps.push({ t: this.t, id: id, index: index });
    if (def.kind === 'punch' && chain && prev && (prev.kind !== 'punch' || prev.hand === def.hand)) {
      for (i = 0; i < def.load.length; i++) { k = def.load[i]; this.push(k.d * CHAIN, k.p, k.ease, k.via); }
    }
    // defensa tras un golpe: breve vuelta a guardia mientras llega el golpe rival (la flecha no se solapa)
    if (def.kind === 'defense' && chain && prev && prev.kind === 'punch') this.push(240, G, 'io');
    var actStart = this.t;
    var act = (chain && def.chainAct) || def.act;
    var sp = chain && def.kind === 'punch' ? CHAIN : 1;
    for (i = 0; i < act.length; i++) {
      k = act[i];
      var tStart = this.t;
      this.push(k.d * sp, k.p, k.ease, k.via);
      if (k.imp) this.fx.push({ t: this.t, t0: tStart, hand: k.imp });
      if (i === (def.peakKey != null ? def.peakKey : act.length - 1) && this.peak == null) this.peak = this.t;
    }
    var hold = chain ? Math.round((def.hold || 0) * 0.6) : (def.hold || 0);
    if (hold) this.push(hold, this.last, 'lin');
    var R = { x: this.R.x, z: this.R.z, y: this.R.y };
    var self = this;
    function rel(list, into) {
      (list || []).forEach(function (o) {
        var c = {}, kk;
        for (kk in o) c[kk] = o[kk];
        ['t0', 't1', 't2', 't3'].forEach(function (f) { if (o[f] != null) c[f] = actStart + o[f] * TS; });
        c.root = R;
        into.push(c);
      });
    }
    rel(def.arrows, this.arrows);
    rel(def.ghosts, this.ghosts);
    rel((chain && def.chainMarks) || def.marks, this.marks);
    if (def.delta) {
      this.R = compose(this.R, def.delta);
      if (!isZero(def.delta)) this.moved = true;
    }
    if (def.showFootprints || (def.delta && !isZero(def.delta))) this.showFoot = true;
    this.prev = def;
  };
  Builder.prototype.finish = function (pause, id) {
    var last = this.prev;
    var settleOnly = last && (last.kind === 'move' || last.kind === 'base' || last.kind === 'feint' || last.kind === 'rhythm');
    this.push(settleOnly ? 140 : RET, G, 'io');
    var fpEnd = Infinity;
    if (!isZero(this.R)) {
      // reinicio suave de la posición: se desvanece y reaparece en el origen
      this.push(260, G, 'lin');
      this.push(200, fade(G, 0), 'io');
      fpEnd = this.t;
      this.R = { x: 0, z: 0, y: 0 };
      this.keys.push({ t: this.t, p: withRoot(fade(G, 0), this.R), ease: 'lin' });
      this.push(220, G, 'io');
    }
    this.push(pause, G, 'lin');
    var keys = this.keys;
    keys.duration = this.t;
    keys.arrows = this.arrows;
    keys.fx = this.fx;
    keys.ghosts = this.ghosts;
    keys.marks = this.marks;
    keys.steps = this.steps;
    keys.id = id;
    keys.peak = this.peak != null ? this.peak : 0;
    keys.footprints = this.showFoot ? { feet: [LF0, RF0], root: { x: 0, z: 0, y: 0 }, t0: 0, t1: fpEnd === Infinity ? keys.duration : fpEnd } : null;
    return keys;
  };

  var clipCache = {};
  var seqCache = {};

  function clip(animId) {
    if (!has(animId)) return null;
    if (clipCache[animId]) return clipCache[animId];
    var def = DEF[animId];
    var b = new Builder();
    b.push(def.kind === 'base' ? 60 : 380, G, 'lin');
    b.add(def, animId, 0, false);
    var out = b.finish(def.kind === 'base' ? 120 : PAUSE, animId);
    clipCache[animId] = out;
    return out;
  }

  function sequence(ids, pause) {
    ids = (ids || []).filter(function (id) { return has(id) && id !== 'guard'; });
    if (!ids.length) return null;
    var p = pause != null ? pause : PAUSE_SEQ;
    var key = ids.join('>') + (pause != null ? '|' + pause : '');
    if (seqCache[key]) return seqCache[key];
    var b = new Builder();
    b.push(pause != null ? Math.min(380, pause) : 380, G, 'lin');
    for (var i = 0; i < ids.length; i++) b.add(DEF[ids[i]], ids[i], i, i > 0);
    var out = b.finish(p, key);
    seqCache[key] = out;
    return out;
  }

  // sequence(): los índices de steps son los de la lista filtrada; los ajustamos a la lista original.
  // CONTRATO: extra opts.pause (ms de pausa final; por defecto PAUSE_SEQ) para las ráfagas del HIIT.
  function sequenceFor(ids, opts) {
    var src = ids || [];
    var map = [];
    for (var i = 0; i < src.length; i++) if (has(src[i]) && src[i] !== 'guard') map.push(i);
    var out = sequence(src, opts && opts.pause != null ? opts.pause : null);
    if (!out) return null;
    var copy = out.slice();
    for (var k in out) if (!/^\d+$/.test(k)) copy[k] = out[k];
    copy.steps = out.steps.map(function (s) { return { t: s.t, id: s.id, index: map[s.index] }; });
    return copy;
  }

  function has(animId) { return !!animId && Object.prototype.hasOwnProperty.call(DEF, animId); }
  function list() { return Object.keys(DEF); }

  var CODES = {
    '1': 'jab', '2': 'cross', '3': 'lead_hook', '4': 'rear_hook', '5': 'lead_upper', '6': 'rear_upper',
    '1b': 'jab_body', '2b': 'cross_body', '3b': 'lead_hook_body', '4b': 'rear_hook_body', '5b': 'lead_upper_body', '6b': 'rear_upper_body'
  };

  SB.visual.poses = {
    has: has,
    list: list,
    clip: clip,
    sequence: sequenceFor,
    guardPose: function () { return G; },
    CODES: CODES,
    HEAD0: HEAD0
  };
})(window.SB = window.SB || {});
