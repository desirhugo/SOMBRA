/**
 * SOMBRA · js/vision/analyzer.js
 * ---------------------------------------------------------------------------
 * Análisis de la técnica de boxeo a partir de los 33 puntos de MediaPipe Pose
 * (BlazePose). Módulo puro: no toca el DOM ni la cámara; se le pasan fotogramas
 * { t (s), lm: puntos normalizados de la imagen, wl: puntos 3D en metros, w, h }.
 * Solo se usa durante las rondas de boxeo. No guarda imágenes: solo contadores
 * y una lista corta de golpes de la ronda en curso, que se descartan al salir.
 *
 * Qué mide (todas las medidas son aproximadas, con una sola cámara de frente):
 *  - Guardia: altura de cada muñeca entre el hombro (0) y la boca (1) en la imagen.
 *    La muñeca queda algo por debajo del guante: muñeca a la altura del mentón ≈ 0,75.
 *  - Barbilla: altura de la nariz respecto a las orejas, dividida por la distancia entre
 *    orejas. Negativo = nariz por encima de las orejas (barbilla levantada).
 *  - Golpes: la muñeca se separa de su posición de guardia (relativa al hombro, en 3D)
 *    con velocidad. De cada golpe: mano, tipo (recto / gancho / uppercut por la dirección
 *    del desplazamiento y el ángulo del codo), velocidad máxima aproximada de la muñeca
 *    (m/s), tiempo de ida y de vuelta, si la otra mano bajó, si se cargó el golpe antes
 *    de salir (telegrafiar), si volvió por abajo, y el giro de cadera y hombros en los
 *    golpes de la mano atrasada.
 *  - Postura: inclinación del tronco, codos abiertos, rodillas bloqueadas, anchura de la
 *    base y si estás «cuadrado» (pies en línea), cuando se ven los pies.
 *
 * Los umbrales (CFG) son orientativos: salen de la técnica descrita por entrenadores
 * (ver docs/ANALISIS_VIDEO.md), no de un estudio que los valide con esta cámara.
 */
(function (SB) {
  'use strict';

  const LM = { nose: 0, lEar: 7, rEar: 8, mL: 9, mR: 10, lSh: 11, rSh: 12, lEl: 13, rEl: 14, lWr: 15, rWr: 16, lHip: 23, rHip: 24, lKn: 25, rKn: 26, lAn: 27, rAn: 28 };
  const ARM = { l: { sh: LM.lSh, el: LM.lEl, wr: LM.lWr }, r: { sh: LM.rSh, el: LM.rEl, wr: LM.rWr } };

  /** Umbrales orientativos (ver cabecera). */
  const CFG = {
    minVis: 0.5,
    guardGood: { lead: 0.45, rear: 0.6 },   // a partir de aquí la mano está arriba
    guardLow: { lead: 0.3, rear: 0.45 },    // por debajo, la mano está baja
    chinUp: 0.0,                            // < 0: barbilla levantada
    chinGood: 0.12,                         // ≥: barbilla recogida
    chinFloor: 0.7,                         // ≥: mirando al suelo
    punchOnDisp: 0.25,      // separación de la guardia (× longitud del brazo) para empezar
    punchOnSpeed: 1.2,      // m/s
    punchOffDisp: 0.16,     // vuelta a la guardia
    punchMinPeak: 0.33,     // separación mínima para contar como golpe
    punchMinSpeed: 1.6,     // m/s
    maxOutSec: 1.2,
    maxBackSec: 1.0,
    windupWindow: 0.35,     // s antes de salir
    windupBack: 0.06,       // m hacia atrás (alejándose de la cámara)
    windupDrop: 0.08,       // m hacia abajo
    slowReturnSec: 0.45,
    slowReturnRatio: 1.8,   // vuelta más lenta que la ida × este factor
    lowReturnDrop: 0.1,     // m por debajo del punto de salida al volver
    otherHandLow: 0.4,      // altura de guardia de la otra mano durante el golpe
    rotHipMin: 8,           // grados de giro de cadera en golpes de atrás
    rotShMin: 15,           // grados de giro de hombros
    leanMax: 30,            // grados de inclinación del tronco hacia delante
    straightElbowMin: 140,  // grados: un recto «corto» se queda por debajo
    flareOut: 0.35,         // codo por fuera del hombro (× anchura de hombros)
    kneeLocked: 172,        // grados
    stanceNarrow: 1.0,      // distancia entre tobillos / anchura de hombros
    stanceWide: 2.8,
    squaredDz: 0.35,        // diferencia de profundidad entre pies / anchura de hombros
    recentSec: 6
  };

  // ------------------------------------------------------------------ vectores
  function sub(a, b) { return [a.x - b.x, a.y - b.y, a.z - b.z]; }
  function v3(p) { return [p.x, p.y, p.z]; }
  function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function vlen(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function angleAt(a, b, c) { // ángulo en b (grados)
    const u = sub(a, b), w = sub(c, b);
    const d = vlen(u) * vlen(w);
    if (!d) return 180;
    let cos = (u[0] * w[0] + u[1] * w[1] + u[2] * w[2]) / d;
    cos = Math.max(-1, Math.min(1, cos));
    return Math.acos(cos) * 180 / Math.PI;
  }
  function yawOf(a, b) { return Math.atan2(b.z - a.z, b.x - a.x) * 180 / Math.PI; }
  function angDiff(a, b) { let d = a - b; while (d > 180) d -= 360; while (d < -180) d += 360; return Math.abs(d); }
  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort(function (x, y) { return x - y; });
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function pushCapped(arr, v, cap) { arr.push(v); if (arr.length > cap) arr.shift(); }
  function vis(p) { return p ? (p.visibility == null ? 1 : p.visibility) : 0; }

  // ------------------------------------------------------- golpes esperados
  /**
   * Golpes esperados de una combinación (ids de data/movements.js).
   * @returns {{expected: {hand: 'lead'|'rear', type: string|null, body: boolean, id: string}[], defensive: boolean}}
   */
  function expectedFor(seq) {
    const out = [];
    let defensive = false;
    (seq || []).forEach(function (id) {
      const m = SB.library && SB.library.get ? SB.library.get(id) : null;
      if (!m) return;
      if (m.category === 'golpe') {
        const type = m.subcategory === 'gancho' ? 'hook' : m.subcategory === 'uppercut' ? 'upper' : m.subcategory === 'recto' ? 'straight' : null;
        out.push({ hand: m.side === 'rear' ? 'rear' : 'lead', type: type, body: m.target === 'cuerpo', id: id });
      } else if (m.category === 'defensa' || m.subcategory === 'cambio de guardia') {
        defensive = true;
      }
    });
    return { expected: out, defensive: defensive };
  }

  // ------------------------------------------------------------- estadísticas
  function newRoundStats(info) {
    const i = info || {};
    return {
      round: i.round || 0, theme: i.theme || null, material: i.material || null,
      frames: 0, visible: 0, feetFrames: 0,
      guard: { lead: { n: 0, good: 0, low: 0 }, rear: { n: 0, good: 0, low: 0 } },
      guardThirds: [{ n: 0, good: 0 }, { n: 0, good: 0 }, { n: 0, good: 0 }],
      chin: { n: 0, up: 0, good: 0, floor: 0 },
      lean: { n: 0, bad: 0 }, flare: { n: 0, bad: 0 }, knees: { n: 0, locked: 0 },
      stance: { n: 0, narrow: 0, wide: 0, squared: 0 },
      punches: [], // ver finishPunch
      match: { matched: 0, wrongHand: 0, typeOk: 0, typeChecked: 0, byType: {} },
      startT: null, endT: null
    };
  }

  function newHand() {
    return { state: 'idle', ref: null, hist: [], p: null, arm: [] };
  }

  /**
   * @param {{stance?: 'diestro'|'zurdo'}} [opts]
   */
  function Analyzer(opts) {
    const o = opts || {};
    this.cfg = Object.assign({}, CFG, o.cfg || {});
    this.stance = o.stance === 'zurdo' ? 'zurdo' : 'diestro';
    this.role = this.stance === 'zurdo' ? { l: 'rear', r: 'lead' } : { l: 'lead', r: 'rear' };
    this.S = [];               // anchuras de hombros recientes (m)
    this.hands = { l: newHand(), r: newHand() };
    this.rounds = [];
    this.cur = null;
    this.recent = [];          // muestras por fotograma de los últimos segundos
    this.events = [];          // golpes recientes
    this.combo = { expected: [], defensive: false, ptr: 0 };
    this.roundDur = 0;
    this.lastT = null;
    this.bodyHist = [];        // giro de cadera y hombros de los últimos fotogramas
  }

  /** Giro (cadera, hombros) de hace `ago` segundos: la referencia antes de que empiece el golpe. */
  Analyzer.prototype._yawBefore = function (t, ago) {
    const h = this.bodyHist;
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t - ago) return h[i];
    return h[0] || null;
  };

  Analyzer.prototype.startRound = function (info) {
    if (this.cur) this.endRound();
    this.cur = newRoundStats(info);
    this.roundDur = (info && info.durationSec) || 0;
    this.recent = [];
    this.events = [];
    this.bodyHist = [];
    this.hands.l.state = 'idle'; this.hands.r.state = 'idle';
    this.hands.l.p = null; this.hands.r.p = null;
  };

  /** Cierra la ronda en curso y devuelve sus estadísticas (o null). */
  Analyzer.prototype.endRound = function () {
    const r = this.cur;
    if (!r) return null;
    this.cur = null;
    this.rounds.push(r);
    return r;
  };

  Analyzer.prototype.currentRound = function () { return this.cur; };

  /** Combinación en pantalla (ids). */
  Analyzer.prototype.setCombo = function (seq) {
    const e = expectedFor(seq);
    this.combo = { expected: e.expected, defensive: e.defensive, ptr: 0 };
  };

  Analyzer.prototype._armLen = function (s) {
    return median(this.hands[s].arm) || 0.55;
  };
  Analyzer.prototype._shoulderW = function () { return median(this.S) || 0.33; };

  /**
   * Procesa un fotograma. Devuelve los golpes terminados en él (puede ser []).
   */
  Analyzer.prototype.push = function (f) {
    const r = this.cur;
    if (!r || !f) return [];
    const t = f.t;
    if (r.startT == null) r.startT = t;
    r.endT = t;
    r.frames++;
    const lm = f.lm, wl = f.wl;
    const C = this.cfg;
    const sample = { t: t, vis: false };
    const done = [];
    if (!lm || !wl || lm.length < 29 || wl.length < 29) { pushCapped(this.recent, sample, 400); this._trim(t); return done; }
    const need = [LM.nose, LM.lSh, LM.rSh, LM.lEl, LM.rEl, LM.lWr, LM.rWr, LM.lHip, LM.rHip];
    for (let i = 0; i < need.length; i++) if (vis(lm[need[i]]) < C.minVis) { pushCapped(this.recent, sample, 400); this._trim(t); return done; }
    sample.vis = true;
    r.visible++;

    // Calibración continua
    const S = vlen(sub(wl[LM.lSh], wl[LM.rSh]));
    if (S > 0.15 && S < 0.7) pushCapped(this.S, S, 120);
    const SW = this._shoulderW();
    const self = this;
    ['l', 'r'].forEach(function (s) {
      const a = ARM[s];
      const L = vlen(sub(wl[a.sh], wl[a.el])) + vlen(sub(wl[a.el], wl[a.wr]));
      if (L > 0.3 && L < 1.1) pushCapped(self.hands[s].arm, L, 120);
    });

    // Guardia (imagen)
    const mouthY = (lm[LM.mL].y + lm[LM.mR].y) / 2;
    const gh = {};
    ['l', 'r'].forEach(function (s) {
      const shY = lm[ARM[s].sh].y;
      const den = Math.max(0.02, shY - mouthY);
      gh[s] = (shY - lm[ARM[s].wr].y) / den;
    });

    // Barbilla
    const eL = lm[LM.lEar], eR = lm[LM.rEar];
    const aspect = f.w && f.h ? f.w / f.h : 4 / 3;
    let earY = null, earDist = Math.abs((eL.x - eR.x) * aspect);
    if (vis(eL) > 0.3 && vis(eR) > 0.3) earY = (eL.y + eR.y) / 2;
    else if (vis(eL) > 0.3) earY = eL.y;
    else if (vis(eR) > 0.3) earY = eR.y;
    if (earDist < 0.02) earDist = Math.abs((lm[LM.lSh].x - lm[LM.rSh].x) * aspect) * 0.45;
    if (earY != null && earDist > 0.01) {
      const chin = (lm[LM.nose].y - earY) / earDist;
      sample.chin = chin;
      r.chin.n++;
      if (chin < C.chinUp) r.chin.up++;
      else if (chin >= C.chinFloor) r.chin.floor++;
      else if (chin >= C.chinGood) r.chin.good++;
    }

    // Tronco: inclinación hacia la cámara (y hacia abajo en world)
    const shMid = { x: (wl[LM.lSh].x + wl[LM.rSh].x) / 2, y: (wl[LM.lSh].y + wl[LM.rSh].y) / 2, z: (wl[LM.lSh].z + wl[LM.rSh].z) / 2 };
    const hipMid = { x: (wl[LM.lHip].x + wl[LM.rHip].x) / 2, y: (wl[LM.lHip].y + wl[LM.rHip].y) / 2, z: (wl[LM.lHip].z + wl[LM.rHip].z) / 2 };
    const lean = Math.atan2(-(shMid.z - hipMid.z), -(shMid.y - hipMid.y)) * 180 / Math.PI;
    sample.lean = lean;
    const hipYaw = yawOf(wl[LM.lHip], wl[LM.rHip]);
    const shYaw = yawOf(wl[LM.lSh], wl[LM.rSh]);
    pushCapped(this.bodyHist, { t: t, hipYaw: hipYaw, shYaw: shYaw }, 30);

    // Piernas y base (si se ven los pies)
    if (vis(lm[LM.lAn]) >= C.minVis && vis(lm[LM.rAn]) >= C.minVis && vis(lm[LM.lKn]) >= C.minVis && vis(lm[LM.rKn]) >= C.minVis) {
      r.feetFrames++;
      const kL = angleAt(wl[LM.lHip], wl[LM.lKn], wl[LM.lAn]);
      const kR = angleAt(wl[LM.rHip], wl[LM.rKn], wl[LM.rAn]);
      r.knees.n++;
      if (kL > C.kneeLocked && kR > C.kneeLocked) r.knees.locked++;
      const dx = wl[LM.lAn].x - wl[LM.rAn].x, dz = wl[LM.lAn].z - wl[LM.rAn].z;
      const width = Math.sqrt(dx * dx + dz * dz) / SW;
      r.stance.n++;
      if (width < C.stanceNarrow) { r.stance.narrow++; sample.stanceW = 'narrow'; }
      else if (width > C.stanceWide) { r.stance.wide++; sample.stanceW = 'wide'; }
      else sample.stanceW = 'ok';
      if (Math.abs(dz) / SW < C.squaredDz) r.stance.squared++;
    }

    // Manos
    const states = {};
    ['l', 'r'].forEach(function (s) {
      states[s] = self._hand(s, f, gh, { hipYaw: hipYaw, shYaw: shYaw, lean: lean, SW: SW }, done);
    });

    // Guardia y postura cuando la mano está quieta
    const third = this.roundDur > 0 ? Math.min(2, Math.floor(((t - r.startT) / this.roundDur) * 3)) : 0;
    let bothGood = true, anyIdle = false;
    ['l', 'r'].forEach(function (s) {
      const role = self.role[s];
      if (states[s] !== 'idle') return;
      anyIdle = true;
      const g = r.guard[role];
      g.n++;
      if (gh[s] >= C.guardGood[role]) g.good++;
      else bothGood = false;
      if (gh[s] < C.guardLow[role]) { g.low++; sample[role + 'Low'] = true; }
      // Codo abierto (por fuera del hombro, hacia su lado)
      const a = ARM[s];
      const out = (s === 'l' ? 1 : -1) * (wl[a.el].x - wl[a.sh].x);
      r.flare.n++;
      if (out / SW > C.flareOut) { r.flare.bad++; sample.flare = true; }
    });
    if (anyIdle) {
      r.guardThirds[third].n++;
      if (bothGood) r.guardThirds[third].good++;
      sample.guardGood = bothGood;
      if (!this.combo.defensive) {
        r.lean.n++;
        if (lean > C.leanMax) { r.lean.bad++; sample.leanBad = true; }
      }
    }
    sample.gh = { lead: gh[this.role.l === 'lead' ? 'l' : 'r'], rear: gh[this.role.l === 'rear' ? 'l' : 'r'] };
    pushCapped(this.recent, sample, 400);
    this._trim(t);
    this.lastT = t;
    return done;
  };

  Analyzer.prototype._trim = function (t) {
    const lim = t - this.cfg.recentSec;
    while (this.recent.length && this.recent[0].t < lim) this.recent.shift();
    const lim2 = t - 30;
    while (this.events.length && this.events[0].tEnd < lim2) this.events.shift();
  };

  /** Máquina de estados de una mano. Devuelve 'idle' | 'out' | 'back'. */
  Analyzer.prototype._hand = function (s, f, gh, body, done) {
    const C = this.cfg;
    const H = this.hands[s];
    const a = ARM[s];
    const wl = f.wl, t = f.t;
    const rel = vsub(v3(wl[a.wr]), v3(wl[a.sh]));
    const armL = this._armLen(s);
    pushCapped(H.hist, { t: t, rel: rel }, 30);
    if (!H.ref) H.ref = rel.slice();
    // velocidad con dos fotogramas de separación
    let speed = 0;
    for (let k = H.hist.length - 3; k >= 0 && k >= H.hist.length - 4; k--) {
      const h0 = H.hist[k];
      const dt = t - h0.t;
      if (dt > 0.02) { speed = vlen(vsub(rel, h0.rel)) / dt; break; }
    }
    const disp = vlen(vsub(rel, H.ref)) / armL;
    const other = s === 'l' ? 'r' : 'l';
    const role = this.role[s];

    if (H.state === 'idle') {
      if (disp > C.punchOnDisp && speed > C.punchOnSpeed) {
        // ¿cargó el golpe? (hacia atrás o hacia abajo respecto a la guardia, justo antes)
        let back = 0, drop = 0;
        for (let k = 0; k < H.hist.length; k++) {
          const hk = H.hist[k];
          if (hk.t < t - C.windupWindow) continue;
          const d = vsub(hk.rel, H.ref);
          if (d[2] > back) back = d[2];
          if (d[1] > drop) drop = d[1];
        }
        H.state = 'out';
        const y0 = this._yawBefore(t, 0.3) || body;
        H.p = {
          hand: role, side: s, t0: t, tPeak: t, tEnd: null, peakDisp: disp, peakSpeed: speed, peakRel: rel.slice(),
          launchY: H.ref[1], otherMin: gh[other], windup: back > C.windupBack || drop > C.windupDrop,
          hip0: y0.hipYaw, sh0: y0.shYaw, hipRot: 0, shRot: 0, elbow: angleAt(wl[a.sh], wl[a.el], wl[a.wr]),
          leanPeak: body.lean, maxDropBack: 0, ref: H.ref.slice()
        };
      } else {
        // la guardia de referencia sigue lentamente a la mano quieta
        for (let i = 0; i < 3; i++) H.ref[i] += (rel[i] - H.ref[i]) * 0.08;
      }
      return H.state;
    }

    const P = H.p;
    if (gh[other] < P.otherMin) P.otherMin = gh[other];
    if (H.state === 'out') {
      if (disp >= P.peakDisp) {
        P.peakDisp = disp; P.tPeak = t; P.peakRel = rel.slice();
        P.elbow = angleAt(wl[a.sh], wl[a.el], wl[a.wr]);
        P.leanPeak = body.lean;
        P.hipRot = angDiff(body.hipYaw, P.hip0);
        P.shRot = angDiff(body.shYaw, P.sh0);
      }
      if (speed > P.peakSpeed) P.peakSpeed = speed;
      if (disp < P.peakDisp * 0.85 && t > P.tPeak) H.state = 'back';
      else if (t - P.t0 > C.maxOutSec) H.state = 'back';
      return H.state;
    }
    // back
    const dropNow = rel[1] - P.launchY;
    if (dropNow > P.maxDropBack) P.maxDropBack = dropNow;
    if (disp < C.punchOffDisp || t - P.tPeak > C.maxBackSec) {
      P.tEnd = t;
      P.returnGuard = gh[s];
      H.state = 'idle';
      H.p = null;
      const ev = this._finishPunch(P);
      if (ev) done.push(ev);
    }
    return H.state;
  };

  Analyzer.prototype._finishPunch = function (P) {
    const C = this.cfg;
    if (P.peakDisp < C.punchMinPeak || P.peakSpeed < C.punchMinSpeed) return null;
    const d = vsub(P.peakRel, P.ref);
    const forward = -d[2];
    const up = -d[1];
    const inward = (P.side === 'l' ? -1 : 1) * d[0];
    let type = 'straight';
    if (up > 0.08 && up > Math.max(forward, inward) * 0.9 && P.elbow < 135) type = 'upper';
    else if (inward > 0.08 && inward > forward * 0.8 && P.elbow < 140) type = 'hook';
    const body = P.peakRel[1] > 0.12;
    const outT = Math.max(0.01, P.tPeak - P.t0);
    const backT = Math.max(0, P.tEnd - P.tPeak);
    const ev = {
      hand: P.hand, type: type, body: body, t0: P.t0, tEnd: P.tEnd,
      speed: Math.round(P.peakSpeed * 10) / 10, outT: outT, backT: backT,
      elbow: Math.round(P.elbow),
      otherLow: P.otherMin < C.otherHandLow,
      windup: !!P.windup,
      slowReturn: backT > Math.max(C.slowReturnSec, outT * C.slowReturnRatio),
      lowReturn: P.maxDropBack > C.lowReturnDrop,
      shortStraight: type === 'straight' && P.elbow < C.straightElbowMin,
      lean: P.leanPeak > C.leanMax,
      hipRot: Math.round(P.hipRot), shRot: Math.round(P.shRot),
      armOnly: P.hand === 'rear' && (type === 'straight' || type === 'hook') && P.hipRot < C.rotHipMin && P.shRot < C.rotShMin,
      expected: null, handOk: null, typeOk: null
    };
    // Comparación con la combinación en pantalla (orden de manos, cíclico)
    const ex = this.combo.expected;
    if (ex.length) {
      let e = ex[this.combo.ptr % ex.length];
      if (e.hand !== ev.hand) {
        const e2 = ex[(this.combo.ptr + 1) % ex.length];
        if (e2.hand === ev.hand) { this.combo.ptr++; e = e2; }
      }
      ev.expected = e.id;
      ev.handOk = e.hand === ev.hand;
      if (ev.handOk) {
        this.combo.ptr++;
        if (e.type) ev.typeOk = e.type === ev.type;
      }
      const m = this.cur.match;
      if (ev.handOk) m.matched++; else m.wrongHand++;
      if (ev.typeOk != null) {
        m.typeChecked++;
        if (ev.typeOk) m.typeOk++;
        const bt = m.byType[e.type] || (m.byType[e.type] = { n: 0, ok: 0, as: {} });
        bt.n++;
        if (ev.typeOk) bt.ok++; else bt.as[ev.type] = (bt.as[ev.type] || 0) + 1;
      }
    }
    if (this.cur) {
      this.cur.punches.push(ev);
      const third = this.roundDur > 0 ? Math.min(2, Math.floor(((ev.t0 - this.cur.startT) / this.roundDur) * 3)) : 0;
      ev.third = third;
    }
    this.events.push(ev);
    return ev;
  };

  /**
   * Resumen de los últimos `sec` segundos (para las indicaciones en directo).
   */
  Analyzer.prototype.recentSummary = function (sec, now) {
    const t = now != null ? now : this.lastT;
    const lim = (t || 0) - (sec || 4);
    let n = 0, vis = 0, leadLow = 0, rearLow = 0, idleN = 0, chinN = 0, chinUp = 0, chinFloor = 0, chinGood = 0, lean = 0, flare = 0, guardGood = 0;
    let feetN = 0, narrow = 0, wide = 0;
    for (let i = this.recent.length - 1; i >= 0; i--) {
      const s = this.recent[i];
      if (s.t < lim) break;
      n++;
      if (!s.vis) continue;
      vis++;
      if (s.guardGood != null) { idleN++; if (s.guardGood) guardGood++; }
      if (s.leadLow) leadLow++;
      if (s.rearLow) rearLow++;
      if (s.leanBad) lean++;
      if (s.flare) flare++;
      if (s.stanceW) { feetN++; if (s.stanceW === 'narrow') narrow++; else if (s.stanceW === 'wide') wide++; }
      if (s.chin != null) {
        chinN++;
        if (s.chin < this.cfg.chinUp) chinUp++;
        else if (s.chin >= this.cfg.chinFloor) chinFloor++;
        else if (s.chin >= this.cfg.chinGood) chinGood++;
      }
    }
    const ev = this.events.filter(function (e) { return e.tEnd >= lim; });
    const longEv = this.events.filter(function (e) { return e.tEnd >= (t || 0) - Math.max(10, sec || 4); });
    const frac = function (a, b) { return b ? a / b : 0; };
    return {
      frames: n, visible: frac(vis, n),
      leadLow: frac(leadLow, idleN), rearLow: frac(rearLow, idleN), guardGood: frac(guardGood, idleN),
      chinUp: frac(chinUp, chinN), chinFloor: frac(chinFloor, chinN), chinGood: frac(chinGood, chinN),
      lean: frac(lean, idleN), flare: frac(flare, idleN * 2),
      feet: frac(feetN, vis), narrow: frac(narrow, feetN), wide: frac(wide, feetN),
      punches: ev, punches10: longEv.length,
      speed: median(ev.map(function (e) { return e.speed; })),
      defensive: this.combo.defensive
    };
  };

  /** Mediana de velocidad (m/s) de los golpes de una ronda, opcionalmente por mano. */
  function speedOf(round, hand) {
    return median(round.punches.filter(function (p) { return !hand || p.hand === hand; }).map(function (p) { return p.speed; }));
  }

  SB.vision = SB.vision || {};
  SB.vision.Analyzer = Analyzer;
  SB.vision.analyzerUtil = { CFG: CFG, LM: LM, expectedFor: expectedFor, median: median, speedOf: speedOf, angleAt: angleAt };
})(window.SB = window.SB || {});
