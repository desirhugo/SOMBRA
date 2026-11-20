/*
 * SOMBRA · js/visual/exercises.js  [Animación]
 *
 * Animaciones ORIGINALES de los ejercicios HIIT (data/hiit.js) con la misma figura que las técnicas.
 * Requiere js/visual/figure.js (SB.visual.rig) y js/visual/poses.js (ráfagas y desplazamientos de boxeo).
 *
 * API:
 *   SB.visual.exercises.has(id)   -> boolean
 *   SB.visual.exercises.list()    -> [id]
 *   SB.visual.exercises.clip(id)  -> keyframes en bucle (mismo formato que poses.clip) con frame: 'auto'
 *                                    (la figura se encuadra sola) y speed (velocidad de reproducción)
 *   Reproducir: fig.playExercise(id)  ·  demo.showExercise(ejercicio)
 *
 * Las poses usan los campos extra de figure.js: pitch (tronco tumbado), roll, lha/rha (manos apoyadas
 * en el suelo), lk/rk (rodillas) y la inclinación del pie. Ejes como en figure.js: +z = delante del
 * pecho en la posición de pie, +x = lado derecho; la raíz gira (ry) para enseñar cada ejercicio
 * desde el ángulo que mejor se entiende.
 *
 * Criterios de ejecución que se dibujan (los mismos que dan las notas de data/hiit.js):
 *   - Flexiones y planchas: cuerpo en línea de tobillos a hombros, manos bajo los hombros, codos
 *     hacia atrás (en diamante, pegados al cuerpo; abiertas, hacia fuera).
 *   - Sentadillas: cadera atrás, rodillas en la línea de las puntas, muslos casi paralelos al suelo.
 *   - Zancadas: rodilla delantera sobre el tobillo, la trasera baja hacia el suelo.
 *   - Saltos: despegue con brazos y tobillos, aterrizaje con rodillas flexionadas.
 *   - Core: lumbar pegada en dead bug y hollow hold; brazo y pierna contrarios en superman y dead bug.
 * Las ráfagas, esquivas (media cintura, cintura completa, sentadilla, goma) y pasos de boxeo
 * reutilizan las animaciones de poses.js.
 */
(function (SB) {
  'use strict';

  SB.visual = SB.visual || {};
  var RG = SB.visual.rig;
  if (!RG) return;

  var GLOVE = 0.074;           // radio del guante: centro a esta altura = apoyado en el suelo

  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function mx(v) { return v ? [-v[0], v[1], v[2]] : v; }

  function clone(p) {
    var q = {};
    for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) q[k] = Array.isArray(p[k]) ? p[k].slice() : p[k];
    return q;
  }

  // ───────────────────────── postura base: de pie, de frente (+z) ─────────────────────────
  var STAND = {
    rx: 0, rz: 0, ry: 0,
    hx: 0, hy: 0.985, hz: -0.05,
    hyaw: 0, syaw: 0, lean: 0, bend: 0, pitch: 0, roll: 0,
    lsh: 0, rsh: 0, hd: [0, 0, 0],
    lh: [-0.21, -0.54, 0.03], rh: [0.21, -0.54, 0.03],
    le: [-0.2, 0, -1], re: [0.2, 0, -1],
    lk: [-0.1, 0, 1], rk: [0.1, 0, 1],
    lf: [-0.12, 0.06, -5, 0, 0, 0], rf: [0.12, 0.06, 5, 0, 0, 0],
    a: 1
  };

  /** Pose = base de pie + cambios (copia profunda de los arrays). */
  function E(over, base) {
    var p = clone(base || STAND);
    if (over) for (var k in over) if (Object.prototype.hasOwnProperty.call(over, k)) p[k] = Array.isArray(over[k]) ? over[k].slice() : over[k];
    return p;
  }

  /** Pie: [x, z, yaw, talón 0..1, altura, inclinación]. */
  function foot(x, z, yaw, lift, h, tilt) { return [x, z, yaw || 0, lift || 0, h || 0, tilt || 0]; }
  function mfoot(f) { return [-f[0], f[1], -f[2], f[3], f[4], f[5] || 0]; }

  // Brazos (objetivo del guante izquierdo relativo a la base del cuello + polo del codo); el derecho es su espejo
  var ARM = {
    side: { h: [-0.21, -0.54, 0.03], e: [-0.2, 0, -1] },
    chest: { h: [-0.07, -0.22, 0.24], e: [-0.6, -1, -0.2] },
    guard: { h: [-0.09, 0.06, 0.21], e: [-0.4, -1, -0.1] },
    front: { h: [-0.13, -0.06, 0.48], e: [-0.3, -1, 0] },
    up: { h: [-0.33, 0.48, 0.02], e: [-1, 0.1, 0] },
    hips: { h: [-0.27, -0.44, -0.02], e: [-1, 0, -0.4] },
    back: { h: [-0.2, -0.46, -0.28], e: [-0.2, 0, -1] },
    rope: { h: [-0.27, -0.42, 0.10], e: [-0.4, -0.2, -1] },
    runF: { h: [-0.15, -0.20, 0.30], e: [-0.1, -0.7, -1] },
    runB: { h: [-0.19, -0.44, -0.20], e: [-0.1, 0.4, -1] },
    wide: { h: [-0.55, 0.02, 0.06], e: [-0.3, -1, -0.2] }
  };
  /** Brazos: nombre del izquierdo y del derecho (por defecto el mismo). */
  function A(l, r) {
    var L = ARM[l], R = ARM[r || l];
    return { lh: L.h.slice(), le: L.e.slice(), rh: mx(R.h), re: mx(R.e) };
  }
  function withArms(over, l, r) { var a = A(l, r); for (var k in a) over[k] = a[k]; return over; }

  /** Intercambia izquierda y derecha (ejercicios alternos). */
  function mirror(p) {
    var q = clone(p);
    q.hx = -p.hx; q.rx = -(p.rx || 0); q.lean = -(p.lean || 0); q.hyaw = -(p.hyaw || 0); q.syaw = -(p.syaw || 0); q.roll = -(p.roll || 0);
    q.lsh = p.rsh; q.rsh = p.lsh; q.hd = mx(p.hd);
    q.lh = mx(p.rh); q.rh = mx(p.lh); q.le = mx(p.re); q.re = mx(p.le);
    if (p.lha) { q.lha = mx(p.rha); q.rha = mx(p.lha); }
    q.lk = mx(p.rk); q.rk = mx(p.lk);
    q.lf = mfoot(p.rf); q.rf = mfoot(p.lf);
    return q;
  }

  /** Convierte las manos relativas (lh/rh) en absolutas (lha/rha) para poder mezclarlas con apoyos. */
  function absHands(p) {
    var n = RG.neckBase(p);
    p.lha = add(n, p.lh); p.rha = add(n, p.rh);
    return p;
  }

  /** Sube la cabeza (hd) si queda por debajo de `y` (cuello flexionado al estar tumbado). */
  function headAbove(p, y) {
    var J = RG.solve(p);
    if (J.head[1] < y) p.hd = [p.hd[0], p.hd[1] + (y - J.head[1]), p.hd[2]];
    return p;
  }

  /** Desplaza la pose en el suelo (cadera, pies y manos apoyadas). */
  function shift(p, dx, dz) {
    var q = clone(p);
    q.hx += dx; q.hz += dz;
    q.lf[0] += dx; q.lf[1] += dz; q.rf[0] += dx; q.rf[1] += dz;
    if (q.lha) { q.lha = [q.lha[0] + dx, q.lha[1], q.lha[2] + dz]; q.rha = [q.rha[0] + dx, q.rha[1], q.rha[2] + dz]; }
    return q;
  }
  /** Sube todo el cuerpo `dy` metros (fase de vuelo de un salto). */
  function air(p, dy) {
    var q = clone(p);
    q.hy += dy; q.lf[4] += dy; q.rf[4] += dy;
    if (q.lha) { q.lha = [q.lha[0], q.lha[1] + dy, q.lha[2]]; q.rha = [q.rha[0], q.rha[1] + dy, q.rha[2]]; }
    return q;
  }
  /** Pie colocado para que su tobillo quede en (x, ay, az). */
  function footAt(x, ay, az, yaw, lift, tilt) {
    var off = RG.solveFoot([0, 0, yaw || 0, lift || 0, 0, tilt || 0], 1).ankle;
    return [x - off[0], az - off[2], yaw || 0, lift || 0, ay - off[1], tilt || 0];
  }

  // ───────────────────────── plancha y flexiones ─────────────────────────
  // Pie de plancha: apoyado en la punta, talón arriba (el empeine mira hacia la cabeza).
  var TOE_TILT = -68, TOE_H = 0.05;
  var SH_HIGH = 0.60;          // altura de la línea de hombros en plancha alta (brazos casi estirados)
  /**
   * Plancha con el cuerpo recto de tobillos a hombros; las manos no se mueven al bajar.
   * o.shY: altura de la línea de hombros · o.zb: z de los metatarsos · o.fx: mitad de separación de pies
   * o.hand: { x, dz, y } manos (mitad de separación, avance respecto a los hombros de la plancha alta, altura extra)
   * o.elb: { le, re } codos · o.hip: grados extra de flexión de cadera · o.roll · o.sx: desplazamiento lateral
   */
  function plank(o) {
    o = o || {};
    var zb = o.zb != null ? o.zb : -0.82, fx = o.fx != null ? o.fx : 0.10;
    var lf = foot(-fx, zb, 0, 0, TOE_H, TOE_TILT), rf = foot(fx, zb, 0, 0, TOE_H, TOE_TILT);
    var ank = RG.solveFoot(lf, -1).ankle;
    var L = 1.35;              // tobillo → línea de hombros (pierna + cadera + columna)
    var s = Math.max(-0.2, Math.min(0.95, ((o.shY != null ? o.shY : SH_HIGH) - ank[1] - 0.03) / L));
    var ang = Math.asin(s);
    var u = [0, s, Math.cos(ang)];
    var pel = add(add([0, ank[1], ank[2]], mul(u, 0.885)), [0, 0.03, 0]);
    var elb = o.elb || {};
    var p = E({
      hx: o.sx || 0, hy: pel[1], hz: pel[2], pitch: 90 - ang * 180 / Math.PI + (o.hip || 0), roll: o.roll || 0,
      le: elb.le || [-0.55, 0.45, -0.7], re: elb.re || [0.55, 0.45, -0.7],
      lk: [-0.05, -0.4, 1], rk: [0.05, -0.4, 1],
      lf: lf, rf: rf
    });
    var s0 = (SH_HIGH - ank[1] - 0.03) / L;
    var zs = ank[2] + Math.sqrt(1 - s0 * s0) * L;
    var hd = o.hand || {};
    var hx = hd.x != null ? hd.x : 0.22, hdz = hd.dz || 0, hy = GLOVE + (hd.y || 0);
    p.lha = [-hx, hy, zs + hdz]; p.rha = [hx, hy, zs + hdz];
    return p;
  }
  /** Plancha lateral sobre la mano izquierda (pecho hacia el lado derecho), brazo derecho arriba. */
  function sidePlank(base) {
    var p = plank({ shY: 0.74, roll: 90, fx: 0.03 });
    p.lf = foot(-0.03, -0.82, 0, 0, 0.03, -25); p.rf = foot(0.05, -0.80, 0, 0, 0.12, -25);
    p.lk = [0, -0.2, 1]; p.rk = [0, -0.2, 1];
    var J = RG.solve(p);
    p.lha = base.lha.slice();
    p.rha = add(J.rS, [0.02, 0.54, 0]);
    p.le = [-0.6, 0.2, -0.6]; p.re = [1, 0, 0];
    return p;
  }

  // ───────────────────────── catálogo ─────────────────────────
  var DEF = {};
  var FLOOR = -26;             // ejercicios en el suelo: casi de perfil (la línea del cuerpo se ve recta)

  /* ======================= FUERZA · EMPUJE ======================= */
  var PU_TOP = plank(), PU_LOW = plank({ shY: 0.24 });
  function pushKeys(top, low) { return [top, [650, low], [100, low, 'lin'], [550, top], [300, top, 'lin']]; }
  DEF.push_std = { ry: FLOOR, keys: pushKeys(PU_TOP, PU_LOW) };

  var WIDE = { x: 0.42 }, ELB_OUT = { le: [-1, 0.45, -0.25], re: [1, 0.45, -0.25] };
  DEF.push_wide = { ry: 35, keys: pushKeys(plank({ hand: WIDE, elb: ELB_OUT }), plank({ shY: 0.26, hand: WIDE, elb: ELB_OUT })) };

  var DIAM = { x: 0.06, dz: -0.08 }, ELB_IN = { le: [-0.15, 0.45, -1], re: [0.15, 0.45, -1] };
  DEF.push_diamond = { ry: 30, keys: pushKeys(plank({ hand: DIAM, elb: ELB_IN }), plank({ shY: 0.28, hand: DIAM, elb: ELB_IN })) };

  // En T: flexión y giro a plancha lateral con el brazo libre al techo, alternando lados
  var PT_SIDE = sidePlank(PU_TOP);
  DEF.push_t = { ry: FLOOR, keys: [
    PU_TOP, [600, PU_LOW], [520, PU_TOP], [560, PT_SIDE], [380, PT_SIDE, 'lin'], [480, PU_TOP],
    [600, PU_LOW], [520, PU_TOP], [560, mirror(PT_SIDE)], [380, mirror(PT_SIDE), 'lin'], [480, PU_TOP]
  ] };

  // Pica: cadera alta (V invertida); la cabeza baja entre las manos
  var PK_FEET = { lf: footAt(-0.11, 0.16, -0.70, 0, 0.8), rf: footAt(0.11, 0.16, -0.70, 0, 0.8) };
  var PK_ELB = { le: [-0.6, 0.3, -0.7], re: [0.6, 0.3, -0.7] };
  var PK_UP = E({ hy: 0.90, hz: -0.22, pitch: 128, lf: PK_FEET.lf, rf: PK_FEET.rf, lk: [0, 0, 1], rk: [0, 0, 1],
    lha: [-0.20, GLOVE, 0.16], rha: [0.20, GLOVE, 0.16], le: PK_ELB.le, re: PK_ELB.re });
  var PK_DOWN = E({ hy: 0.86, hz: -0.20, pitch: 150, lf: PK_FEET.lf, rf: PK_FEET.rf, lk: [0, 0, 1], rk: [0, 0, 1],
    lha: [-0.20, GLOVE, 0.16], rha: [0.20, GLOVE, 0.16], le: PK_ELB.le, re: PK_ELB.re });
  DEF.push_pike = { ry: FLOOR, keys: [PK_UP, [700, PK_DOWN], [100, PK_DOWN, 'lin'], [600, PK_UP], [300, PK_UP, 'lin']] };

  // Con toque: flexión y, arriba, cada mano toca el hombro contrario
  function tapPose(base) {
    var J = RG.solve(base), p = clone(base);
    p.lha = add(J.rS, [-0.07, -0.05, 0.07]);
    p.le = [-0.3, -0.6, -0.8];
    p.hx = 0.02;
    return p;
  }
  var PU_TAP = tapPose(PU_TOP);
  DEF.push_tap = { ry: FLOOR, keys: [
    PU_TOP, [600, PU_LOW], [520, PU_TOP], [300, PU_TAP], [140, PU_TAP, 'lin'], [280, PU_TOP],
    [300, mirror(PU_TAP)], [140, mirror(PU_TAP), 'lin'], [280, PU_TOP], [150, PU_TOP, 'lin']
  ] };

  // Archer: manos muy abiertas; el cuerpo baja hacia un lado con el otro brazo estirado
  var AR_TOP = plank({ hand: { x: 0.50 }, elb: ELB_OUT });
  var AR_L = plank({ shY: 0.30, sx: -0.20, hand: { x: 0.50 }, elb: ELB_OUT });
  DEF.push_archer = { ry: 35, keys: [
    AR_TOP, [700, AR_L], [120, AR_L, 'lin'], [600, AR_TOP], [700, mirror(AR_L)], [120, mirror(AR_L), 'lin'], [600, AR_TOP], [150, AR_TOP, 'lin']
  ] };

  /* ======================= FUERZA · PLIOMETRÍA ======================= */
  var PE_AIR = plank({ shY: 0.80, hand: { y: 0.12 } });
  DEF.push_explosive = { ry: FLOOR, keys: [PU_TOP, [550, PU_LOW], [230, PE_AIR, 'out'], [210, PU_TOP, 'in'], [380, PU_TOP, 'lin']] };

  var PC_CLAP = plank({ shY: 0.86, hand: { x: 0.03, y: 0.20, dz: -0.10 } });
  PC_CLAP.le = [-0.4, 0.2, -1]; PC_CLAP.re = [0.4, 0.2, -1];
  var PC_AIR = plank({ shY: 0.84, hand: { y: 0.16 } });
  DEF.push_clap = { ry: 20, keys: [
    PU_TOP, [550, PU_LOW], [170, PC_AIR, 'out'], [110, PC_CLAP, 'lin'], [110, PC_AIR, 'lin'], [200, PU_TOP, 'in'], [380, PU_TOP, 'lin']
  ] };

  var SQ_FEET = { lf: foot(-0.15, 0.06, -14), rf: foot(0.15, 0.06, 14) };
  var SQ_TOP = E(withArms({ lf: SQ_FEET.lf, rf: SQ_FEET.rf }, 'chest'));
  var SQ_LOW = E(withArms({ hy: 0.56, hz: -0.24, pitch: 36, lk: [-0.4, 0, 1], rk: [0.4, 0, 1], lf: SQ_FEET.lf, rf: SQ_FEET.rf }, 'front'));

  var SJ_TOP = E(withArms({ lf: SQ_FEET.lf, rf: SQ_FEET.rf }, 'side'));
  var SJ_LOW = E(withArms({ hy: 0.60, hz: -0.22, pitch: 34, lk: [-0.4, 0, 1], rk: [0.4, 0, 1], lf: SQ_FEET.lf, rf: SQ_FEET.rf }, 'back'));
  var SJ_AIR = air(E(withArms({ hy: 1.08, lf: foot(-0.14, 0.06, -12, 1), rf: foot(0.14, 0.06, 12, 1) }, 'up')), 0.18);
  var SJ_LAND = E(withArms({ hy: 0.76, hz: -0.15, pitch: 22, lk: [-0.4, 0, 1], rk: [0.4, 0, 1], lf: SQ_FEET.lf, rf: SQ_FEET.rf }, 'front'));
  DEF.squat_jump = { ry: 28, keys: [SJ_TOP, [600, SJ_LOW], [260, SJ_AIR, 'out'], [60, SJ_AIR, 'lin'], [260, SJ_LAND, 'in'], [420, SJ_TOP], [200, SJ_TOP, 'lin']] };

  // Zancada: pie delantero lejos, rodilla trasera cerca del suelo, tronco recto
  var LU_TOP = E(withArms({}, 'hips'));
  var LU_L = E(withArms({
    hy: 0.55, hz: 0.40, pitch: 3,
    lf: foot(-0.12, 0.86, -3), rf: foot(0.12, 0.06, 5, 0.95), lk: [-0.1, 0, 1], rk: [0.1, -1, 0.3]
  }, 'hips'));
  var STEP_L = { lf: [null, null, null, null, 0.10] }, STEP_R = { rf: [null, null, null, null, 0.10] };
  DEF.lunge = { ry: 16, keys: [
    LU_TOP, [650, LU_L, 'io', STEP_L], [120, LU_L, 'lin'], [550, LU_TOP, 'io', STEP_L],
    [650, mirror(LU_L), 'io', STEP_R], [120, mirror(LU_L), 'lin'], [550, LU_TOP, 'io', STEP_R], [150, LU_TOP, 'lin']
  ] };

  // Zancada explosiva: cambio de pierna en el aire, brazo contrario delante
  var LJ_L = E(withArms({
    hy: 0.57, hz: 0.40, pitch: 4,
    lf: foot(-0.12, 0.86, -3), rf: foot(0.12, 0.06, 5, 0.95), lk: [-0.1, 0, 1], rk: [0.1, -1, 0.3]
  }, 'runB', 'runF'));
  var LJ_AIR = E(withArms({
    hy: 1.02, hz: 0.42, pitch: 2,
    lf: foot(-0.12, 0.62, 0, 0.6, 0.22, -10), rf: foot(0.12, 0.30, 0, 0.8, 0.30, -20), lk: [-0.1, 0, 1], rk: [0.1, -0.5, 1]
  }, 'side'));
  DEF.lunge_jump = { ry: 16, keys: [
    LJ_L, [270, LJ_AIR, 'out'], [270, mirror(LJ_L), 'in'], [180, mirror(LJ_L), 'lin'],
    [270, mirror(LJ_AIR), 'out'], [270, LJ_L, 'in'], [180, LJ_L, 'lin']
  ] };

  // Saltos agrupados: rodillas al pecho en el aire
  var TJ_TOP = E(withArms({}, 'side'));
  var TJ_LOAD = E(withArms({ hy: 0.80, hz: -0.12, pitch: 16, lk: [-0.2, 0, 1], rk: [0.2, 0, 1] }, 'back'));
  var TJ_AIR = E(withArms({
    hy: 1.32, hz: -0.06, pitch: 12,
    lf: footAt(-0.13, 0.96, 0.06, 0, 0, -45), rf: footAt(0.13, 0.96, 0.06, 0, 0, -45), lk: [-0.1, 0.6, 1], rk: [0.1, 0.6, 1]
  }, 'chest'));
  var TJ_LAND = E(withArms({ hy: 0.80, hz: -0.12, pitch: 16, lk: [-0.2, 0, 1], rk: [0.2, 0, 1] }, 'front'));
  DEF.tuck_jump = { ry: 22, keys: [TJ_TOP, [320, TJ_LOAD], [280, TJ_AIR, 'out'], [80, TJ_AIR, 'lin'], [270, TJ_LAND, 'in'], [360, TJ_TOP], [150, TJ_TOP, 'lin']] };

  /* ======================= FUERZA · PIERNAS ======================= */
  DEF.squat = { ry: 28, keys: [SQ_TOP, [700, SQ_LOW], [120, SQ_LOW, 'lin'], [620, SQ_TOP], [260, SQ_TOP, 'lin']] };
  var SQ_LOW2 = E(SQ_LOW); SQ_LOW2.hy = 0.575; SQ_LOW2.pitch = 35;
  DEF.squat_hold = { ry: 28, keys: [SQ_LOW, [900, SQ_LOW2, 'sio'], [900, SQ_LOW, 'sio']], marks: [{ type: 'pause', t0: 0, t1: 1800 }] };
  DEF.squat_pause = { ry: 28, keys: [SQ_TOP, [700, SQ_LOW], [900, SQ_LOW, 'lin'], [620, SQ_TOP], [260, SQ_TOP, 'lin']], marks: [{ type: 'pause', t0: 760, t1: 1560 }] };

  // Zancada lateral: piernas abiertas, se sienta sobre una pierna con la otra estirada
  var LL_C = E(withArms({ hy: 0.90, lf: foot(-0.50, 0.06, -25), rf: foot(0.50, 0.06, 25), lk: [-0.5, 0, 1], rk: [0.5, 0, 1] }, 'chest'));
  var LL_L = E(withArms({ hx: -0.28, hy: 0.56, hz: -0.14, pitch: 26, lf: LL_C.lf, rf: LL_C.rf, lk: [-0.6, 0, 1], rk: [0.2, 0, 1] }, 'front'));
  DEF.lunge_lateral = { ry: 52, keys: [
    LL_C, [650, LL_L], [120, LL_L, 'lin'], [550, LL_C], [650, mirror(LL_L)], [120, mirror(LL_L), 'lin'], [550, LL_C], [150, LL_C, 'lin']
  ] };

  // Puente de glúteo: boca arriba, rodillas flexionadas, pies apoyados; la cadera sube hasta alinear rodilla-hombro
  var BR_BASE = { lk: [0, 1, 0.3], rk: [0, 1, 0.3], le: [-0.4, -1, 0.3], re: [0.4, -1, 0.3], lf: foot(-0.13, 0.46, -4), rf: foot(0.13, 0.46, 4) };
  var BR_DOWN = headAbove(E(Object.assign({ hy: 0.10, hz: 0.0, pitch: -88, lha: [-0.26, GLOVE, -0.08], rha: [0.26, GLOVE, -0.08] }, BR_BASE)), 0.105);
  var BR_UP = headAbove(E(Object.assign({ hy: 0.40, hz: 0.04, pitch: -119, lha: [-0.26, GLOVE, -0.12], rha: [0.26, GLOVE, -0.12] }, BR_BASE)), 0.105);
  DEF.glute_bridge = { ry: FLOOR, keys: [BR_DOWN, [600, BR_UP], [450, BR_UP, 'lin'], [600, BR_DOWN], [250, BR_DOWN, 'lin']] };

  // Pistol alterna: sentadilla a una pierna con la otra estirada delante
  var PI_TOP = E(withArms({ hx: -0.04, rf: foot(0.10, 0.30, 5, 0, 0.10, 10), rk: [0.1, 0.3, 1] }, 'chest'));
  var PI_LOW = E(withArms({
    hx: -0.06, hy: 0.46, hz: -0.30, pitch: 42,
    lf: foot(-0.12, 0.06, -5), rf: footAt(0.10, 0.33, 0.55, 0, 0, 25), lk: [-0.15, 0, 1], rk: [0.1, 1, 0.2]
  }, 'front'));
  var PI_MID = E(withArms({}, 'chest'));
  DEF.pistol_alt = { ry: -15, keys: [
    PI_TOP, [800, PI_LOW], [150, PI_LOW, 'lin'], [700, PI_TOP], [300, PI_MID],
    [300, mirror(PI_TOP)], [800, mirror(PI_LOW)], [150, mirror(PI_LOW), 'lin'], [700, mirror(PI_TOP)], [300, PI_MID], [300, PI_TOP]
  ] };

  /* ======================= FUERZA · CORE ======================= */
  var PL_TAP0 = plank({ fx: 0.17 });
  var PL_TAP = tapPose(PL_TAP0);
  DEF.plank_tap = { ry: FLOOR, keys: [
    PL_TAP0, [330, PL_TAP], [150, PL_TAP, 'lin'], [300, PL_TAP0], [330, mirror(PL_TAP)], [150, mirror(PL_TAP), 'lin'], [300, PL_TAP0], [100, PL_TAP0, 'lin']
  ] };

  // Giros rusos: sentado en V con los pies elevados; las manos van de una cadera a la otra
  var RT_BASE = {
    hy: 0.13, hz: 0.0, pitch: -40,
    lf: foot(-0.10, 0.50, -4, 0, 0.16, 10), rf: foot(0.10, 0.50, 4, 0, 0.16, 10), lk: [-0.1, 1, 0.5], rk: [0.1, 1, 0.5]
  };
  var RT_C = E(Object.assign({ lh: [-0.05, -0.26, 0.33], rh: [0.05, -0.26, 0.33], le: [-0.5, -1, 0], re: [0.5, -1, 0] }, RT_BASE));
  var RT_R = E(Object.assign({ syaw: 42, hyaw: 6, lh: [0.24, -0.40, 0.18], rh: [0.30, -0.42, 0.10], le: [-0.3, -1, 0.4], re: [0.6, -1, -0.2] }, RT_BASE));
  DEF.russian_twist = { ry: -15, keys: [RT_C, [380, RT_R], [80, RT_R, 'lin'], [300, RT_C], [380, mirror(RT_R)], [80, mirror(RT_R), 'lin'], [300, RT_C]] };

  // Superman alterno: boca abajo, brazo y pierna contrarios arriba
  var SM_BASE = { hy: 0.10, hz: 0.0, lk: [0, -1, 0], rk: [0, -1, 0], le: [-0.3, 1, 0], re: [0.3, 1, 0] };
  var SM_FLAT = headAbove(E(Object.assign({
    pitch: 89, lha: [-0.20, GLOVE, 1.0], rha: [0.20, GLOVE, 1.0],
    lf: footAt(-0.10, 0.07, -0.87, 180, 0, -15), rf: footAt(0.10, 0.07, -0.87, 180, 0, -15)
  }, SM_BASE)), 0.13);
  var SM_A = headAbove(E(Object.assign({
    pitch: 82, lha: [-0.20, 0.42, 0.96], rha: [0.20, GLOVE, 1.0],
    lf: footAt(-0.10, 0.07, -0.87, 180, 0, -15), rf: footAt(0.10, 0.36, -0.80, 180, 0, -15)
  }, SM_BASE)), 0.15);
  DEF.superman_alt = { ry: FLOOR, keys: [SM_FLAT, [450, SM_A], [300, SM_A, 'lin'], [400, SM_FLAT], [450, mirror(SM_A)], [300, mirror(SM_A), 'lin'], [400, SM_FLAT]] };

  // Dead bug: boca arriba, brazos al techo y rodillas a 90º; estira brazo y pierna contrarios
  var DB_BASE = headAbove(E({
    hy: 0.10, hz: 0.0, pitch: -90,
    lha: [-0.17, 0.66, -0.47], rha: [0.17, 0.66, -0.47], le: [-1, 0, 0], re: [1, 0, 0],
    lf: footAt(-0.12, 0.52, 0.44, 0, 0, 30), rf: footAt(0.12, 0.52, 0.44, 0, 0, 30), lk: [0, 1, -0.6], rk: [0, 1, -0.6]
  }), 0.105);
  var DB_A = clone(DB_BASE);
  DB_A.lha = [-0.17, 0.20, -1.02]; DB_A.le = [-0.3, 1, 0];
  DB_A.rf = footAt(0.12, 0.17, 0.90, 0, 0, 20); DB_A.rk = [0, 1, 0];
  DEF.dead_bug = { ry: FLOOR, keys: [DB_BASE, [600, DB_A], [200, DB_A, 'lin'], [500, DB_BASE], [600, mirror(DB_A)], [200, mirror(DB_A), 'lin'], [500, DB_BASE]] };

  // Plancha dinámica: de antebrazos a manos y vuelta, una mano cada vez
  var ELB_DOWN = { le: [-0.1, -1, -0.1], re: [0.1, -1, -0.1] };
  var PW_FORE = plank({ shY: 0.30, hand: { x: 0.14, dz: 0.22 }, elb: ELB_DOWN });
  var PW_HIGH = plank({ hand: { x: 0.20 } });
  var PW_MID = plank({ shY: 0.45, hand: { x: 0.20 } });
  PW_MID.rha = PW_FORE.rha.slice(); PW_MID.re = ELB_DOWN.re.slice(); PW_MID.roll = -6;
  DEF.plank_walkup = { ry: FLOOR, keys: [
    PW_FORE, [380, PW_MID, 'io', { lha: [null, 0.22, null] }], [380, PW_HIGH, 'io', { rha: [null, 0.22, null] }], [200, PW_HIGH, 'lin'],
    [380, PW_MID, 'io', { lha: [null, 0.22, null] }], [380, PW_FORE, 'io', { rha: [null, 0.22, null] }], [200, PW_FORE, 'lin'],
    [380, mirror(PW_MID), 'io', { rha: [null, 0.22, null] }], [380, PW_HIGH, 'io', { lha: [null, 0.22, null] }], [200, PW_HIGH, 'lin'],
    [380, mirror(PW_MID), 'io', { rha: [null, 0.22, null] }], [380, PW_FORE, 'io', { lha: [null, 0.22, null] }], [200, PW_FORE, 'lin']
  ] };

  // Plancha lateral con giro: el brazo de arriba pasa por debajo del cuerpo y vuelve al techo
  var SP_UP = sidePlank(PU_TOP);
  var SP_IN = clone(SP_UP);
  SP_IN.roll = 25; SP_IN.rha = [-0.30, 0.26, SP_UP.lha[2] - 0.20]; SP_IN.re = [0.4, 1, 0];
  DEF.side_plank_rot = { ry: FLOOR, keys: [
    SP_UP, [600, SP_IN], [150, SP_IN, 'lin'], [600, SP_UP], [200, SP_UP, 'lin'], [500, PU_TOP], [500, mirror(SP_UP)],
    [600, mirror(SP_IN)], [150, mirror(SP_IN), 'lin'], [600, mirror(SP_UP)], [200, mirror(SP_UP), 'lin'], [500, PU_TOP], [500, SP_UP]
  ] };

  // Mountain climbers: rodillas al pecho alternas desde plancha alta
  var MC_A = clone(PU_TOP);
  MC_A.lf = footAt(-0.10, 0.30, -0.18, 0, 0, -45); MC_A.lk = [-0.05, -0.6, 1]; MC_A.hy += 0.04;
  DEF.mountain_climber = { ry: FLOOR, keys: [MC_A, [300, mirror(MC_A), 'io', { lf: [null, null, null, null, 0.12] }], [300, MC_A, 'io', { rf: [null, null, null, null, 0.12] }]] };

  // Cruzados: la rodilla va hacia el codo contrario
  var MX_A = clone(PU_TOP);
  MX_A.lf = footAt(0.10, 0.30, -0.16, 20, 0, -45); MX_A.lk = [0.6, -0.6, 1]; MX_A.hy += 0.05; MX_A.roll = -8;
  DEF.mountain_cross = { ry: FLOOR, keys: [MX_A, [340, mirror(MX_A), 'io', { lf: [null, null, null, null, 0.12] }], [340, MX_A, 'io', { rf: [null, null, null, null, 0.12] }]] };

  // Hollow hold: boca arriba, hombros y piernas despegados, lumbar pegada (forma de plátano)
  var HH = headAbove(E({
    hy: 0.09, hz: 0.0, pitch: -72,
    lha: [-0.15, 0.46, -0.96], rha: [0.15, 0.46, -0.96], le: [-0.3, 1, 0], re: [0.3, 1, 0],
    lf: footAt(-0.07, 0.36, 0.84, 0, 0, 5), rf: footAt(0.07, 0.36, 0.84, 0, 0, 5), lk: [0, 1, 0], rk: [0, 1, 0]
  }), 0.12);
  var HH2 = clone(HH); HH2.pitch = -70; HH2.lf = footAt(-0.07, 0.39, 0.84, 0, 0, 5); HH2.rf = footAt(0.07, 0.39, 0.84, 0, 0, 5);
  DEF.hollow_hold = { ry: FLOOR, keys: [HH, [900, HH2, 'sio'], [900, HH, 'sio']], marks: [{ type: 'pause', t0: 0, t1: 1800 }] };

  // Abdominales en V: de tumbado estirado a V con las manos hacia los pies
  var VU_FLAT = headAbove(E({
    hy: 0.09, hz: 0.0, pitch: -89,
    lha: [-0.16, 0.09, -1.02], rha: [0.16, 0.09, -1.02], le: [-0.3, 1, 0], re: [0.3, 1, 0],
    lf: footAt(-0.09, 0.075, 0.86, 0, 0, 10), rf: footAt(0.09, 0.075, 0.86, 0, 0, 10), lk: [0, 1, 0], rk: [0, 1, 0]
  }), 0.105);
  var VU_V = E({
    hy: 0.10, hz: 0.0, pitch: -35,
    lha: [-0.07, 0.78, 0.50], rha: [0.07, 0.78, 0.50], le: [-0.3, -1, 0], re: [0.3, -1, 0],
    lf: footAt(-0.09, 0.79, 0.51, 0, 0, 40), rf: footAt(0.09, 0.79, 0.51, 0, 0, 40), lk: [0, 1, 0], rk: [0, 1, 0]
  });
  DEF.v_up = { ry: FLOOR, keys: [VU_FLAT, [650, VU_V, 'out'], [150, VU_V, 'lin'], [650, VU_FLAT], [200, VU_FLAT, 'lin']] };

  /* ======================= FUERZA · TOTAL ======================= */
  // Gateo de oso: manos y puntas de los pies, rodillas a un palmo del suelo; mano y pie contrarios a la vez
  var BC = E({
    hy: 0.52, hz: -0.10, pitch: 82,
    lha: [-0.20, GLOVE, 0.40], rha: [0.20, GLOVE, 0.40], le: [-0.3, 0.3, -1], re: [0.3, 0.3, -1],
    lf: foot(-0.12, -0.58, 0, 0, TOE_H, TOE_TILT), rf: foot(0.12, -0.58, 0, 0, TOE_H, TOE_TILT), lk: [0, -1, 0.3], rk: [0, -1, 0.3]
  });
  function crawl(p, n, first) {
    // n pasos de 0,16 m; `first` = 'l' mueve mano izquierda y pie derecho
    var q = shift(p, 0, 0.08 * n);
    var d = first === 'l' ? 0.08 : -0.08;
    q.lha = [q.lha[0], q.lha[1], q.lha[2] + d]; q.rha = [q.rha[0], q.rha[1], q.rha[2] - d];
    q.rf[1] += d; q.lf[1] -= d;
    return q;
  }
  var LIFT_LR = { lha: [null, 0.16, null], rf: [null, null, null, null, 0.12] }, LIFT_RL = { rha: [null, 0.16, null], lf: [null, null, null, null, 0.12] };
  DEF.bear_crawl = { ry: FLOOR, keys: [
    BC, [320, crawl(BC, 1, 'l'), 'io', LIFT_LR], [320, shift(BC, 0, 0.16), 'io', LIFT_RL], [320, crawl(BC, 3, 'l'), 'io', LIFT_LR], [320, shift(BC, 0, 0.32), 'io', LIFT_RL],
    [320, crawl(BC, 3, 'l'), 'io', LIFT_RL], [320, shift(BC, 0, 0.16), 'io', LIFT_LR], [320, crawl(BC, 1, 'l'), 'io', LIFT_RL], [320, BC, 'io', LIFT_LR]
  ] };

  // Burpees: de pie → manos al suelo → pies atrás a plancha (→ flexión) → pies dentro → salto
  var BU_STAND = absHands(E(withArms({}, 'side')));
  var BU_PLANK = plank({ zb: -0.90 }), BU_LOW = plank({ zb: -0.90, shY: 0.24 });
  var BU_SQUAT = E({
    hy: 0.52, hz: -0.12, pitch: 45, lk: [-0.3, 0, 1], rk: [0.3, 0, 1],
    lf: foot(-0.13, 0.06, -8, 0.4), rf: foot(0.13, 0.06, 8, 0.4),
    lha: BU_PLANK.lha.slice(), rha: BU_PLANK.rha.slice(), le: [-0.5, 0, -1], re: [0.5, 0, -1]
  });
  var BU_AIR = air(absHands(E(withArms({ hy: 1.08, lf: foot(-0.12, 0.06, -5, 1), rf: foot(0.12, 0.06, 5, 1) }, 'up'))), 0.14);
  var JUMP_FEET = { lf: [null, null, null, null, 0.14], rf: [null, null, null, null, 0.14] };
  function burpeeKeys(withPush, dx) {
    var S = shift(BU_STAND, dx, 0), Q = shift(BU_SQUAT, dx, 0), P = shift(BU_PLANK, dx, 0), L = shift(BU_LOW, dx, 0), A = shift(BU_AIR, dx, 0);
    var k = [[420, Q], [300, P, 'io', JUMP_FEET]];
    if (withPush) k.push([450, L], [400, P]); else k.push([140, P, 'lin']);
    k.push([320, Q, 'io', JUMP_FEET], [380, S], [240, A, 'out'], [260, S, 'in'], [250, S, 'lin']);
    return k;
  }
  DEF.burpee_push = { ry: FLOOR + 6, keys: [BU_STAND].concat(burpeeKeys(true, 0)) };
  DEF.burpee = { ry: FLOOR + 6, keys: [BU_STAND].concat(burpeeKeys(false, 0)) };
  var BL_AIR = air(shift(BU_AIR, 0.25, 0), 0.04);
  DEF.burpee_lateral = { ry: 48, spots: [[0, 0.0], [0.5, 0.0]], keys: [BU_STAND].concat(burpeeKeys(false, 0),
    [[320, BL_AIR, 'out'], [300, shift(BU_STAND, 0.5, 0), 'in']], burpeeKeys(false, 0.5),
    [[320, BL_AIR, 'out'], [300, BU_STAND, 'in'], [150, BU_STAND, 'lin']]) };

  /* ======================= CARDIO · SALTOS ======================= */
  var JJ_IN = E(withArms({}, 'side'));
  var JJ_OUT = E(withArms({ hy: 0.90, lf: foot(-0.42, 0.06, -14), rf: foot(0.42, 0.06, 14), lk: [-0.4, 0, 1], rk: [0.4, 0, 1] }, 'up'));
  var HOP = { lf: [null, null, null, 0.6, 0.10], rf: [null, null, null, 0.6, 0.10] };
  DEF.jumping_jack = { ry: 52, keys: [JJ_IN, [300, JJ_OUT, 'io', HOP], [90, JJ_OUT, 'lin'], [300, JJ_IN, 'io', HOP], [90, JJ_IN, 'lin']] };

  // Comba imaginaria: saltitos sobre los metatarsos, muñecas girando junto a la cadera
  var JR_DOWN = E(withArms({ hy: 0.965, lf: foot(-0.08, 0.06, -3, 0.55), rf: foot(0.08, 0.06, 3, 0.55) }, 'rope'));
  var JR_UP = air(E(withArms({ hy: 1.05, lf: foot(-0.08, 0.06, -3, 0.95), rf: foot(0.08, 0.06, 3, 0.95) }, 'rope')), 0.06);
  JR_DOWN.lh = add(JR_DOWN.lh, [0, -0.04, 0.05]); JR_DOWN.rh = add(JR_DOWN.rh, [0, -0.04, 0.05]);
  JR_UP.lh = add(JR_UP.lh, [0, 0.04, -0.05]); JR_UP.rh = add(JR_UP.rh, [0, 0.04, -0.05]);
  DEF.jump_rope = { ry: 40, keys: [JR_DOWN, [200, JR_UP, 'sio'], [200, JR_DOWN, 'sio']] };

  // Base atlética para saltos y agilidad: pies juntos o a la anchura de cadera, en metatarsos
  var ATH_T = E(withArms({ hy: 0.86, hz: -0.10, pitch: 14, lf: foot(-0.08, 0.06, -3, 0.25), rf: foot(0.08, 0.06, 3, 0.25), lk: [-0.15, 0, 1], rk: [0.15, 0, 1] }, 'guard'));
  var JUMP_V = { hy: 1.04, lf: [null, null, null, null, 0.18], rf: [null, null, null, null, 0.18] };
  DEF.lateral_jump = { ry: 52, spots: [[-0.24, 0.0], [0.24, 0.0]], spotR: 0.16, keys: [
    shift(ATH_T, -0.24, 0), [300, shift(ATH_T, 0.24, 0), 'io', JUMP_V], [110, shift(ATH_T, 0.24, 0), 'lin'],
    [300, shift(ATH_T, -0.24, 0), 'io', JUMP_V], [110, shift(ATH_T, -0.24, 0), 'lin']
  ] };
  DEF.fb_jump = { ry: 16, spots: [[0, 0.22], [0, -0.18]], spotR: 0.16, keys: [
    shift(ATH_T, 0, -0.20), [300, shift(ATH_T, 0, 0.20), 'io', JUMP_V], [110, shift(ATH_T, 0, 0.20), 'lin'],
    [300, shift(ATH_T, 0, -0.20), 'io', JUMP_V], [110, shift(ATH_T, 0, -0.20), 'lin']
  ] };

  // Giro de 180º en el aire, alternando el sentido
  var J180_LOAD = E(withArms({ hy: 0.80, hz: -0.12, pitch: 16, lf: foot(-0.13, 0.06, -8), rf: foot(0.13, 0.06, 8), lk: [-0.25, 0, 1], rk: [0.25, 0, 1] }, 'back'));
  var J180_AIR = air(E(withArms({ hy: 1.06, ry: 90, lf: foot(-0.12, 0.06, -5, 1), rf: foot(0.12, 0.06, 5, 1) }, 'up')), 0.16);
  var J180_BACK = clone(J180_LOAD); J180_BACK.ry = 180;
  var J180_BACKA = clone(J180_LOAD); J180_BACKA.ry = 180; J180_BACKA.lh = ARM.front.h.slice(); J180_BACKA.rh = mx(ARM.front.h);
  DEF.jump_180 = { ry: 20, keys: [
    J180_LOAD, [300, J180_AIR, 'out'], [300, J180_BACKA, 'in'], [260, J180_BACK],
    [300, J180_AIR, 'out'], [300, (function () { var q = clone(J180_BACKA); q.ry = 0; return q; })(), 'in'], [260, J180_LOAD]
  ] };

  // Salto en estrella: de cuclillas a una X en el aire
  var ST_LOAD = E(withArms({ hy: 0.62, hz: -0.18, pitch: 32, lf: foot(-0.12, 0.06, -8), rf: foot(0.12, 0.06, 8), lk: [-0.3, 0, 1], rk: [0.3, 0, 1] }, 'chest'));
  ST_LOAD.lh = [-0.02, -0.42, 0.30]; ST_LOAD.rh = [0.02, -0.42, 0.30];
  var ST_AIR = air(E({
    hy: 0.98, lf: foot(-0.40, 0.06, -15, 1), rf: foot(0.40, 0.06, 15, 1), lk: [-0.4, 0, 1], rk: [0.4, 0, 1],
    lh: [-0.48, 0.38, 0.04], rh: [0.48, 0.38, 0.04], le: [-1, 0.1, 0], re: [1, 0.1, 0]
  }), 0.22);
  var ST_LAND = E(withArms({ hy: 0.76, hz: -0.14, pitch: 22, lf: foot(-0.12, 0.06, -8), rf: foot(0.12, 0.06, 8), lk: [-0.3, 0, 1], rk: [0.3, 0, 1] }, 'front'));
  DEF.star_jump = { ry: 52, keys: [ST_LOAD, [300, ST_AIR, 'out'], [70, ST_AIR, 'lin'], [300, ST_LAND, 'in'], [260, ST_LOAD], [120, ST_LOAD, 'lin']] };

  /* ======================= CARDIO · COORDINACIÓN Y TOTAL ======================= */
  // Carrera en el sitio: rodilla arriba (altura según el ejercicio) y brazo contrario delante
  function runPose(kneeY, kneeZ, pitch, hy) {
    return E(withArms({
      hy: hy || 1.0, hz: -0.05, pitch: pitch || 0,
      lf: footAt(-0.12, kneeY - 0.42, kneeZ - 0.06, 0, 0, -35), lk: [-0.05, 0.3, 1],
      rf: foot(0.12, 0.06, 5, 0.7)
    }, 'runB', 'runF'));
  }
  var SK = runPose(0.74, 0.32, 0, 1.0);
  DEF.skipping = { ry: -6, keys: [SK, [300, mirror(SK), 'sio', { hy: 0.95 }], [300, SK, 'sio', { hy: 0.95 }]] };
  var HK = runPose(0.92, 0.40, -2, 1.0);
  DEF.high_knees = { ry: -6, keys: [HK, [230, mirror(HK), 'sio', { hy: 0.95 }], [230, HK, 'sio', { hy: 0.95 }]] };
  var SPR = runPose(0.72, 0.30, 8, 0.97);
  SPR.lh = [-0.19, -0.48, -0.26]; SPR.rh = [0.15, -0.12, 0.34];   // brazos con más recorrido
  DEF.sprint_place = { ry: -6, keys: [SPR, [170, mirror(SPR), 'sio', { hy: 0.93 }], [170, SPR, 'sio', { hy: 0.93 }]] };

  // Talones al glúteo
  var BK = E(withArms({
    hy: 0.99, lf: footAt(-0.12, 0.80, -0.28, 180, 0, -35), lk: [-0.05, -1, 0.35],
    rf: foot(0.12, 0.06, 5, 0.7)
  }, 'runF', 'runB'));
  DEF.butt_kick = { ry: -6, keys: [BK, [260, mirror(BK), 'sio', { hy: 0.95 }], [260, BK, 'sio', { hy: 0.95 }]] };

  // Jacks cruzados: abre piernas y brazos en cruz; al cerrar cruza pies y brazos por delante
  var CJ_OUT = E(withArms({ hy: 0.90, lf: foot(-0.40, 0.06, -14), rf: foot(0.40, 0.06, 14), lk: [-0.4, 0, 1], rk: [0.4, 0, 1] }, 'wide'));
  var CJ_IN = E({
    lf: foot(0.04, 0.17, 5), rf: foot(0.12, -0.03, 8), lk: [0.1, 0, 1], rk: [0.1, 0, 1],
    lh: [0.20, -0.20, 0.36], rh: [-0.16, -0.10, 0.34], le: [-0.4, -1, 0], re: [0.4, -1, 0]
  });
  DEF.cross_jack = { ry: 52, keys: [CJ_OUT, [280, CJ_IN, 'io', HOP], [80, CJ_IN, 'lin'], [280, CJ_OUT, 'io', HOP], [280, mirror(CJ_IN), 'io', HOP], [80, mirror(CJ_IN), 'lin'], [280, CJ_OUT, 'io', HOP]] };

  /* ======================= CARDIO · AGILIDAD ======================= */
  var ATH = E(withArms({ hy: 0.85, hz: -0.10, pitch: 14, lf: foot(-0.17, 0.06, -8, 0.4), rf: foot(0.17, 0.06, 8, 0.4), lk: [-0.3, 0, 1], rk: [0.3, 0, 1] }, 'guard'));
  var BOUNCE = { hy: 0.92, lf: [null, null, null, null, 0.05], rf: [null, null, null, null, 0.05] };
  DEF.bounce_multi = { ry: 40, keys: [
    ATH, [220, shift(ATH, 0, 0.14), 'io', BOUNCE], [220, ATH, 'io', BOUNCE], [220, shift(ATH, -0.14, 0), 'io', BOUNCE], [220, ATH, 'io', BOUNCE],
    [220, shift(ATH, 0, -0.14), 'io', BOUNCE], [220, ATH, 'io', BOUNCE], [220, shift(ATH, 0.14, 0), 'io', BOUNCE], [220, ATH, 'io', BOUNCE]
  ] };

  var QF = E(withArms({ hy: 0.82, hz: -0.12, pitch: 18, lf: foot(-0.20, 0.06, -10, 0.6, 0.06), rf: foot(0.20, 0.06, 10, 0.6), lk: [-0.3, 0, 1], rk: [0.3, 0, 1] }, 'guard'));
  DEF.quick_feet = { ry: 30, keys: [QF, [130, mirror(QF), 'sio'], [130, QF, 'sio']] };

  var SQ_PTS = [[-0.28, 0.28], [0.28, 0.28], [0.28, -0.28], [-0.28, -0.28]];
  var AGI = SQ_PTS.map(function (c) { return shift(ATH, c[0], c[1]); });
  var HOPV = { hy: 0.92, lf: [null, null, null, null, 0.07], rf: [null, null, null, null, 0.07] };
  DEF.agility_square = { ry: 40, spots: SQ_PTS.map(function (c) { return [c[0], c[1] + 0.0]; }), spotR: 0.13, keys: [
    AGI[0], [330, AGI[1], 'io', HOPV], [90, AGI[1], 'lin'], [330, AGI[2], 'io', HOPV], [90, AGI[2], 'lin'],
    [330, AGI[3], 'io', HOPV], [90, AGI[3], 'lin'], [330, AGI[0], 'io', HOPV], [90, AGI[0], 'lin']
  ] };

  // Patinador: salto lateral a una pierna; la otra cruza por detrás y el brazo contrario barre por delante
  var SKT_L = E({
    hx: -0.42, hy: 0.70, hz: -0.06, pitch: 30,
    lf: foot(-0.42, 0.06, -10), rf: foot(-0.20, -0.34, 10, 0.9), lk: [-0.2, 0, 1], rk: [0.2, -0.5, 0.6],
    rh: [-0.12, -0.30, 0.34], re: [0.3, -1, 0], lh: [-0.22, -0.40, -0.28], le: [-0.2, 0, -1]
  });
  var SKT_AIR = E(withArms({ hy: 0.95, pitch: 20, lf: foot(-0.10, 0.02, 0, 0.6, 0.18), rf: foot(0.10, -0.06, 0, 0.6, 0.14) }, 'side'));
  DEF.skater = { ry: 32, keys: [SKT_L, [270, SKT_AIR, 'out'], [270, mirror(SKT_L), 'in'], [160, mirror(SKT_L), 'lin'], [270, SKT_AIR, 'out'], [270, SKT_L, 'in'], [160, SKT_L, 'lin']] };

  /* ======================= CARDIO · ESPECÍFICO DE BOXEO ======================= */
  // Reutilizan las animaciones de las técnicas (poses.js), en bucle continuo
  DEF.shuffle_fb = { seq: ['step_in', 'step_back'], pause: 120, speed: 1.1 };
  DEF.shuffle_lateral = { seq: ['lateral_lead', 'lateral_rear'], pause: 120, speed: 1.1 };
  DEF.slip_drill = { seq: ['slip_lead', 'slip_rear'], pause: 160, speed: 1.05 };
  DEF.roll_drill = { seq: ['roll_lead', 'roll_rear'], pause: 160, speed: 1.05 };
  DEF.duck_drill = { seq: ['duck'], pause: 220, speed: 1 };
  DEF.pull_drill = { seq: ['pull_back'], pause: 220, speed: 1 };
  DEF.burst_straight = { seq: ['jab', 'cross', 'jab', 'cross', 'jab', 'cross'], pause: 260, speed: 1.3 };
  DEF.burst_upper = { seq: ['lead_upper', 'rear_upper', 'lead_upper', 'rear_upper'], pause: 260, speed: 1.25 };
  DEF.burst_hook = { seq: ['lead_hook', 'rear_hook', 'lead_hook', 'rear_hook'], pause: 260, speed: 1.25 };
  DEF.burst_body = { seq: ['jab_body', 'cross_body', 'jab_body', 'cross_body'], pause: 260, speed: 1.25 };

  // Skipping con rectos: rodilla arriba y recto con la mano contraria, de cara al rival (+z)
  var SS = E({
    hy: 1.0, hz: -0.05, syaw: -18, hyaw: -6,
    lf: footAt(-0.12, 0.22, 0.24, 0, 0, -35), lk: [-0.05, 0.3, 1], rf: foot(0.12, 0.06, 5, 0.7),
    lh: [-0.09, 0.06, 0.20], le: [-0.4, -1, -0.1], rh: [0.03, 0.07, 0.60], re: [0.2, -1, 0]
  });
  DEF.skip_straight = { ry: 4, keys: [SS, [300, mirror(SS), 'sio', { hy: 0.95 }], [300, SS, 'sio', { hy: 0.95 }]],
    fx: [{ t0: 120, t: 300, hand: 'l' }, { t0: 420, t: 600, hand: 'r' }] };

  // ───────────────────────── construcción ─────────────────────────
  var cache = {};

  function build(id) {
    var spec = DEF[id];
    if (spec.seq) {
      // técnicas de boxeo encadenadas en bucle (cámara y encuadre de las técnicas)
      var P = SB.visual.poses;
      var src = P && P.sequence(spec.seq, { pause: spec.pause });
      if (!src) return null;
      var c = src.slice();
      for (var kk in src) if (!/^\d+$/.test(kk)) c[kk] = src[kk];
      c.id = id; c.speed = spec.speed || 1; c.steps = [];
      return c;
    }
    var keys = [], t = 0;
    for (var i = 0; i < spec.keys.length; i++) {
      var k = spec.keys[i], d = 0, p, ease = 'io', via = null;
      if (Array.isArray(k)) { d = k[0]; p = k[1]; ease = k[2] || 'io'; via = k[3] || null; } else p = k;
      t += d;
      var q = clone(p);
      q.ry = (spec.ry || 0) + (p.ry || 0);
      q.rc = spec.rc || [0, -0.05];
      var key = { t: t, p: q, ease: ease };
      if (via) key.via = via;
      keys.push(key);
    }
    keys.duration = t;
    keys.frame = 'auto';
    keys.speed = spec.speed || 1;
    keys.arrows = []; keys.fx = spec.fx || []; keys.ghosts = []; keys.steps = [];
    keys.marks = spec.marks || [];
    keys.footprints = null;
    keys.spots = spec.spots ? { pts: spec.spots, r: spec.spotR, root: { ry: spec.ry || 0, rc: spec.rc || [0, -0.05] } } : null;
    keys.id = id;
    keys.peak = spec.peak || 0;
    return keys;
  }

  function has(id) { return !!id && Object.prototype.hasOwnProperty.call(DEF, id); }
  function clip(id) {
    if (!has(id)) return null;
    if (!cache[id]) cache[id] = build(id);
    return cache[id];
  }
  function list() { return Object.keys(DEF); }

  SB.visual.exercises = {
    has: has, list: list, clip: clip,
    // para pruebas y revisión de poses
    _util: { E: E, A: A, plank: plank, mirror: mirror, absHands: absHands, foot: foot, footAt: footAt, STAND: STAND }
  };
})(window.SB = window.SB || {});
