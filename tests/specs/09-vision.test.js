/**
 * SOMBRA · tests/specs/09-vision.test.js
 * Análisis por cámara y material. No usa la cámara ni MediaPipe: genera un cuerpo sintético
 * (los 33 puntos de BlazePose, en metros y en la imagen) a 30 fotogramas/s que lanza golpes
 * limpios o con errores concretos, y comprueba lo que detectan SB.vision.Analyzer y Coach.
 * También comprueba el plan de material de las sesiones (mancuernas, pelotas, papel, toalla,
 * cuerda de esquivas, cinta y goma) y que las defensas entren en el circuito.
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  // ------------------------------------------------------------- cuerpo sintético
  const U = 0.26, F = 0.28;          // brazo y antebrazo (m)
  const K = 0.49, ASPECT = 4 / 3;    // proyección a la imagen (640×480)
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function len(a) { return Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }
  function lerp(a, b, k) { return add(a, mul(sub(b, a), k)); }
  function rotY(p, deg) { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
  /** Codo por IK de dos huesos con un vector polo. */
  function elbow(sh, wr, pole) {
    const v = sub(wr, sh);
    let d = Math.min(len(v), U + F - 1e-4);
    const dir = mul(v, 1 / (len(v) || 1));
    const a = (U * U - F * F + d * d) / (2 * d);
    const hh = Math.sqrt(Math.max(0, U * U - a * a));
    let p = sub(pole, mul(dir, pole[0] * dir[0] + pole[1] * dir[1] + pole[2] * dir[2]));
    p = mul(p, 1 / (len(p) || 1));
    return add(add(sh, mul(dir, a)), mul(p, hh));
  }

  const GUARD = { l: [0.11, -0.60, -0.26], r: [-0.10, -0.61, -0.16] };
  /**
   * Pose: {l, r} muñecas, yaw (giro de hombros), hipYaw, noseY, poleL/poleR, leanZ.
   * Devuelve un fotograma {t, lm, wl, w, h} como el de SB.vision.pose.
   */
  function frame(t, o) {
    const q = o || {};
    const W = new Array(33);
    const yaw = q.yaw || 0, hipYaw = q.hipYaw != null ? q.hipYaw : yaw * 0.7;
    const lean = q.leanZ || 0;
    W[23] = rotY([0.1, 0, 0], hipYaw); W[24] = rotY([-0.1, 0, 0], hipYaw);
    W[11] = add(rotY([0.17, -0.5, 0], yaw), [0, 0, -lean]); W[12] = add(rotY([-0.17, -0.5, 0], yaw), [0, 0, -lean]);
    const noseY = q.noseY != null ? q.noseY : -0.66;
    W[0] = [0, noseY, -0.09 - lean];
    W[7] = [0.075, -0.69, 0.02 - lean]; W[8] = [-0.075, -0.69, 0.02 - lean];
    W[9] = [0.025, -0.635, -0.07 - lean]; W[10] = [-0.025, -0.635, -0.07 - lean];
    for (const i of [1, 2, 3]) W[i] = [0.035, -0.70, -0.06 - lean];
    for (const i of [4, 5, 6]) W[i] = [-0.035, -0.70, -0.06 - lean];
    const wl = q.l || GUARD.l, wr = q.r || GUARD.r;
    W[15] = wl; W[16] = wr;
    W[13] = elbow(W[11], wl, q.poleL || [0.3, 1, 0.1]);
    W[14] = elbow(W[12], wr, q.poleR || [-0.3, 1, 0.1]);
    for (const i of [17, 19, 21]) W[i] = add(wl, [0, -0.04, -0.03]);
    for (const i of [18, 20, 22]) W[i] = add(wr, [0, -0.04, -0.03]);
    W[25] = [0.1, 0.42, -0.03]; W[26] = [-0.1, 0.42, -0.03];
    W[27] = [0.12, 0.85, -0.15]; W[28] = [-0.14, 0.85, 0.15];
    W[29] = add(W[27], [0, 0.03, 0.04]); W[30] = add(W[28], [0, 0.03, 0.04]);
    W[31] = add(W[27], [0, 0.05, -0.1]); W[32] = add(W[28], [0, 0.05, -0.1]);
    const wlm = W.map(function (p) { return { x: p[0], y: p[1], z: p[2], visibility: 0.99 }; });
    const lm = W.map(function (p) { return { x: 0.5 + p[0] * K / ASPECT, y: 0.45 + p[1] * K, z: p[2], visibility: 0.99 }; });
    return { t: t, lm: lm, wl: wlm, w: 640, h: 480 };
  }

  const EXT = { l: [0.12, -0.62, -0.80], r: [0.0, -0.62, -0.80] };
  const HOOK = { l: [-0.12, -0.60, -0.38] };
  function ease(k) { return 0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, Math.min(1, k))); }

  /**
   * Genera los fotogramas de una ronda: el ciclo de golpes se repite.
   * punches: [{hand:'l'|'r', kind:'straight'|'hook', rot?: grados, otherDrop?, windup?}]
   */
  function roundFrames(sec, punches, opts) {
    const o = opts || {};
    const out = [];
    const dt = 1 / 30, OUT = 0.15, BACK = 0.16, GAP = 0.45, PRE = o.windupT || 0.2;
    const cycle = punches.length * (OUT + BACK + GAP) + 0.6;
    for (let t = 0; t < sec; t += dt) {
      const tc = t % cycle;
      let pose = { noseY: o.noseY, leanZ: o.leanZ };
      if (o.lowHands) pose.l = add(GUARD.l, [0, 0.16, 0]), pose.r = add(GUARD.r, [0, 0.16, 0]);
      let acc = 0.6;
      for (let i = 0; i < punches.length; i++) {
        const p = punches[i];
        const t0 = acc, t1 = t0 + OUT, t2 = t1 + BACK;
        acc = t2 + GAP;
        const base = p.hand === 'l' ? (pose.l || GUARD.l) : (pose.r || GUARD.r);
        const target = p.kind === 'hook' ? HOOK.l : EXT[p.hand];
        let wr = null, k = 0;
        if (p.windup && tc >= t0 - PRE && tc < t0) wr = add(base, [0, 0.03, 0.12]);
        if (tc >= t0 && tc < t1) { k = ease((tc - t0) / OUT); wr = lerp(base, target, k); }
        else if (tc >= t1 && tc < t2) { k = 1 - ease((tc - t1) / BACK); wr = lerp(p.lowBack ? add(base, [0, 0.2, 0]) : base, target, k); }
        if (!wr) continue;
        pose[p.hand] = wr;
        if (p.kind === 'hook') pose.poleL = [1, 0, 0.2];
        if (p.rot) { pose.yaw = -p.rot * k; pose.hipYaw = -p.rot * 0.7 * k; }
        if (p.otherDrop && k > 0.2) { const oh = p.hand === 'l' ? 'r' : 'l'; pose[oh] = add(oh === 'l' ? GUARD.l : GUARD.r, [0, 0.22, 0]); }
      }
      out.push(frame(t, pose));
    }
    return out;
  }

  function runRound(SB, frames, opts) {
    const o = opts || {};
    const an = o.analyzer || new SB.vision.Analyzer({ stance: 'diestro' });
    an.startRound({ round: o.round || 1, material: o.material || {}, durationSec: frames.length / 30 });
    if (o.combo) an.setCombo(o.combo);
    const cues = [], kinds = [], series = [];
    const coach = o.coach;
    if (coach) coach.startRound({ round: o.round || 1, material: o.material || {} }, frames[0].t);
    // Series (intervalos) de serieSec segundos y una combinación nueva cada comboSec segundos.
    let serie = -1, combo = -1;
    frames.forEach(function (f) {
      an.push(f);
      if (!coach) return;
      const el = f.t - frames[0].t;
      if (o.serieSec && Math.floor(el / o.serieSec) !== serie) { serie = Math.floor(el / o.serieSec); coach.startSerie(f.t); }
      if (o.comboSec && Math.floor(el / o.comboSec) !== combo) { combo = Math.floor(el / o.comboSec); coach.onCombo(); }
      const c = coach.update(f.t);
      if (c) { cues.push(c.id); kinds.push(c.kind); series.push(Math.max(0, serie)); }
    });
    const stats = an.endRound();
    return { an: an, stats: stats, cues: cues, kinds: kinds, series: series, summary: coach ? coach.endRound(stats) : null };
  }

  /** Fotogramas seguidos de dos tramos (el segundo empieza donde acaba el primero). */
  function joinFrames(a, b) {
    const off = a.length ? a[a.length - 1].t + 1 / 30 : 0;
    return a.concat(b.map(function (f) { return Object.assign({}, f, { t: f.t + off }); }));
  }

  function hasVision(env) { return env.SB.vision && env.SB.vision.Analyzer && env.SB.vision.Coach; }

  SBT.describe('Análisis por cámara (cuerpo sintético)', function () {
    SBT.it('uno-dos limpio: golpes, manos, tipo, velocidad y guardia', function (env, assert) {
      if (!hasVision(env)) { SBT.info('js/vision no cargado'); return; }
      const SB = env.fresh();
      const r = runRound(SB, roundFrames(20, [{ hand: 'l' }, { hand: 'r', rot: 35 }]), { combo: ['jab', 'cross'] });
      const P = r.stats.punches;
      assert.ok(P.length >= 18 && P.length <= 26, 'golpes detectados: ' + P.length);
      assert.ok(P.every(function (p) { return p.type === 'straight'; }), 'todos rectos: ' + P.map(function (p) { return p.type; }).join(','));
      const nl = P.filter(function (p) { return p.hand === 'lead'; }).length, nr = P.filter(function (p) { return p.hand === 'rear'; }).length;
      assert.ok(Math.abs(nl - nr) <= 1, 'las dos manos por igual (la ronda puede cortar el último ciclo): ' + nl + '/' + nr);
      assert.ok(P.every(function (p) { return !p.otherLow && !p.windup && !p.lowReturn; }), 'sin errores de guardia, carga ni recogida');
      assert.ok(P.filter(function (p) { return p.hand === 'rear'; }).every(function (p) { return !p.armOnly && p.hipRot >= 10; }), 'el directo gira la cadera');
      const sp = SB.vision.analyzerUtil.median(P.map(function (p) { return p.speed; }));
      assert.ok(sp > 2.5 && sp < 9, 'velocidad plausible: ' + sp + ' m/s');
      const m = SB.vision.coachUtil.metricsOf(r.stats);
      assert.ok(m.guard > 0.9, 'guardia alta: ' + m.guard);
      assert.ok(m.handOrder > 0.9, 'orden de manos de la combinación: ' + m.handOrder);
      assert.equal(m.chinUp, 0, 'barbilla bien');
      SBT.info(P.length + ' golpes · ' + sp + ' m/s · cadera en el directo ' + P.filter(function (p) { return p.hand === 'rear'; })[0].hipRot + '°');
    });

    SBT.it('detecta la otra mano baja, el golpe cargado, la vuelta por abajo y el brazo sin cadera', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      const a = runRound(SB, roundFrames(15, [{ hand: 'l' }, { hand: 'r', rot: 35, otherDrop: true }])).stats.punches;
      assert.ok(a.filter(function (p) { return p.hand === 'rear'; }).every(function (p) { return p.otherLow; }), 'mano adelantada baja durante el directo');
      assert.ok(a.filter(function (p) { return p.hand === 'lead'; }).every(function (p) { return !p.otherLow; }), 'en el jab no baja');
      const b = runRound(SB, roundFrames(15, [{ hand: 'l', windup: true }])).stats.punches;
      assert.ok(b.length >= 5 && b.every(function (p) { return p.windup; }), 'jab cargado: ' + b.map(function (p) { return p.windup; }).join(','));
      const c = runRound(SB, roundFrames(15, [{ hand: 'l', lowBack: true }])).stats.punches;
      assert.ok(c.length >= 5 && c.filter(function (p) { return p.lowReturn; }).length >= c.length - 1, 'vuelve por abajo');
      const d = runRound(SB, roundFrames(15, [{ hand: 'r', rot: 0 }])).stats.punches;
      assert.ok(d.length >= 5 && d.every(function (p) { return p.armOnly; }), 'directo sin girar = solo brazo');
    });

    SBT.it('distingue el gancho del recto', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      const P = runRound(SB, roundFrames(15, [{ hand: 'l', kind: 'hook' }]), { combo: ['lead_hook'] }).stats.punches;
      assert.ok(P.length >= 5, 'ganchos detectados: ' + P.length);
      const hooks = P.filter(function (p) { return p.type === 'hook'; }).length;
      assert.ok(hooks >= P.length - 1, 'clasificados como gancho: ' + P.map(function (p) { return p.type + '/' + p.elbow + '°'; }).join(','));
    });

    SBT.it('guardia baja y barbilla arriba: un comentario por serie, sin repetir, clips y resumen', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      const an = new SB.vision.Analyzer({ stance: 'diestro' });
      const said = [], faults = {};
      const coach = new SB.vision.Coach({ analyzer: an, say: function (t) { said.push(t); },
        onFault: function (id, w) { faults[id] = w; } });
      const r = runRound(SB, roundFrames(60, [{ hand: 'l' }, { hand: 'r', rot: 35 }], { lowHands: true, noseY: -0.72 }),
        { analyzer: an, coach: coach, serieSec: 20, comboSec: 4 });
      assert.ok(['rear_low', 'lead_low', 'other_hand', 'chin_up'].indexOf(r.cues[0]) !== -1, 'primero, una corrección de guardia o barbilla: ' + r.cues.join(','));
      assert.ok(said[0].indexOf('Ronda 1') === 0, 'anuncia el tema: ' + said[0]);
      [0, 1, 2].forEach(function (k) { assert.ok(r.series.filter(function (s) { return s === k; }).length <= 1, 'serie ' + (k + 1) + ': un comentario como mucho (' + r.series.join(',') + ')'); });
      assert.ok(r.cues.filter(function (id) { return ['rear_low', 'lead_low', 'other_hand'].indexOf(id) !== -1; }).length <= 1, '«sube la mano» una vez por ronda: ' + r.cues.join(','));
      assert.ok(r.kinds.every(function (k) { return k === 'fault'; }), 'sin felicitar mientras siguen los errores: ' + r.kinds.join(','));
      assert.ok((faults.rear_low || faults.lead_low) && faults.chin_up, 'clips: guardia y barbilla (' + Object.keys(faults).join(',') + ')');
      const w = faults.chin_up;
      assert.ok(w.t1 > w.t0 && w.t1 - w.t0 <= 3, 'ventana del clip de 3 s como mucho: ' + (w.t1 - w.t0).toFixed(1) + ' s');
      SBT.info('comentarios: ' + r.cues.join(', ') + ' · clips: ' + Object.keys(faults).join(', '));
      const fb = SB.vision.coachUtil.feedbackOf([SB.vision.coachUtil.metricsOf(r.stats)]);
      assert.ok(fb.improve.some(function (x) { return x.area === 'guardia'; }), 'informe: mejorar guardia');
      assert.ok(fb.improve.some(function (x) { return x.area === 'barbilla'; }), 'informe: mejorar barbilla');
      assert.ok(r.summary && r.summary.fix, 'resumen de ronda con un punto a mejorar');
    });

    SBT.it('felicita: al corregir lo que se dijo y cuando los golpes salen limpios', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      // Serie 1: jab cargado; series 2 y 3: jab limpio.
      const an = new SB.vision.Analyzer({ stance: 'diestro' });
      const coach = new SB.vision.Coach({ analyzer: an });
      const frames = joinFrames(roundFrames(20, [{ hand: 'l', windup: true }, { hand: 'r', rot: 35 }]), roundFrames(40, [{ hand: 'l' }, { hand: 'r', rot: 35 }]));
      const r = runRound(SB, frames, { analyzer: an, coach: coach, serieSec: 20, comboSec: 4 });
      assert.equal(r.cues[0], 'windup', 'primero corrige el golpe cargado: ' + r.cues.join(','));
      assert.ok(r.cues.indexOf('fixed_windup') !== -1, 'después felicita la corrección: ' + r.cues.join(','));
      assert.ok(r.cues.length <= 3, 'un comentario por serie como mucho: ' + r.cues.join(','));
      // Ronda limpia: alguna felicitación y nunca más de una por serie.
      const an2 = new SB.vision.Analyzer({ stance: 'diestro' });
      const coach2 = new SB.vision.Coach({ analyzer: an2 });
      const r2 = runRound(SB, roundFrames(60, [{ hand: 'l' }, { hand: 'r', rot: 35 }]), { analyzer: an2, coach: coach2, serieSec: 20, comboSec: 4 });
      assert.ok(r2.kinds.length >= 1 && r2.kinds.every(function (k) { return k === 'good'; }), 'ronda limpia: solo felicitaciones (' + r2.cues.join(',') + ')');
      [0, 1, 2].forEach(function (k) { assert.ok(r2.series.filter(function (s) { return s === k; }).length <= 1, 'serie ' + (k + 1) + ': una como mucho'); });
      SBT.info('con corrección: ' + r.cues.join(' → ') + ' · limpia: ' + r2.cues.join(' → '));
    });

    SBT.it('temas por ronda: técnica, velocidad (sin mancuernas) y luego lo peor', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      const an = new SB.vision.Analyzer({ stance: 'diestro' });
      const coach = new SB.vision.Coach({ analyzer: an });
      const themes = [];
      const plan = [
        { mat: {}, frames: roundFrames(20, [{ hand: 'l' }, { hand: 'r', rot: 35 }]) },
        { mat: { dumbbells: true }, frames: roundFrames(20, [{ hand: 'l' }, { hand: 'r', rot: 0 }]) },
        { mat: {}, frames: roundFrames(20, [{ hand: 'l' }, { hand: 'r', rot: 0 }]) },
        { mat: {}, frames: roundFrames(20, [{ hand: 'l' }, { hand: 'r', rot: 0 }]) }
      ];
      plan.forEach(function (p, i) {
        runRound(SB, p.frames, { analyzer: an, coach: coach, round: i + 1, material: p.mat });
        themes.push(coach.theme);
      });
      assert.equal(themes[0], 'tecnica', 'ronda 1: técnica');
      assert.notEqual(themes[1], 'velocidad', 'con mancuernas nunca velocidad');
      assert.equal(themes[2], 'velocidad', 'primera ronda sin peso tras la 1.ª: velocidad');
      assert.equal(themes[3], 'cadera', 'después, lo peor (directo sin cadera): ' + themes.join(','));
      const rep = coach.report();
      assert.ok(rep && rep.rounds.length === 4, 'informe con 4 rondas');
      assert.ok(rep.improve.some(function (x) { return x.area === 'cadera'; }), 'informe: girar la cadera');
      assert.ok(rep.compare.some(function (c) { return c.indexOf('Con mancuernas') === 0; }), 'compara con y sin mancuernas');
      SBT.info('temas: ' + themes.join(' → '));
    });
  });

  SBT.describe('Material en las sesiones', function () {
    const ALL_ON = { equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7, equipRope: true,
      equipTape: true, equipAnkles: true, equipHangBall: true, equipElbow: true };
    const ROPE_DODGES = ['slip_lead', 'slip_rear', 'roll_lead', 'roll_rear', 'duck'];
    const DEFENSE_DRILLS = ['slip_drill', 'roll_drill', 'duck_drill', 'pull_drill'];
    const KEYS = ['dumbbells', 'ball', 'paper', 'elbow', 'rope', 'hangball', 'tape', 'ankles'];

    function leadOnly(SB, assert, b, tag) {
      b.intervals.forEach(function (iv) {
        iv.combos.forEach(function (c) {
          c.seq.forEach(function (id) {
            const m = SB.library.get(id);
            if (m && m.category === 'golpe') assert.equal(m.side, 'lead', tag + ': brazo atrasado fijo, solo golpes adelantados (' + c.seq.join('-') + ')');
          });
        });
      });
    }

    /** Ronda de brazo atrasado fijo: todo variación y sin repetir combinación. */
    function noRepeats(assert, b, tag) {
      const sigs = [];
      b.intervals.forEach(function (iv) {
        assert.equal(iv.mode, 'variacion', tag + ': brazo atrasado fijo, todos los intervalos de variación');
        iv.combos.forEach(function (c) { sigs.push(c.seq.join('>')); });
      });
      assert.equal(new Set(sigs).size, sigs.length, tag + ': sin repetir combinación en la ronda (' + sigs.length + ')');
    }
    const countOn = function (m) { return KEYS.filter(function (k) { return m[k]; }).length; };

    SBT.it('un elemento por ronda: pelota y papel una vez, mancuernas en el resto (sin la última) y papel con la mano adelantada', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, { equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7 });
      SB.library.applyPreset('completo');
      [20, 30, 45].forEach(function (d) {
        const s = SB.session.generate({ durationMin: d, level: 'basico', goalId: 'completo', seed: 'mat' + d });
        const n = s.blocks.length;
        const mat = s.blocks.map(function (b) { return b.material; });
        mat.forEach(function (m, i) { assert.ok(countOn(m) <= 1, d + ' min ronda ' + (i + 1) + ': un elemento como mucho'); });
        assert.ok(!mat[0].ball && !mat[0].paper, d + ' min: la primera ronda, sin accesorio');
        assert.equal(mat.filter(function (m) { return m.ball; }).length, 1, d + ' min: pelota en una ronda');
        assert.equal(mat.filter(function (m) { return m.paper; }).length, 1, d + ' min: papel en una ronda');
        const w = mat.filter(function (m) { return m.dumbbells; }).length;
        assert.equal(w, Math.min(Math.round(0.7 * n), n - 3), d + ' min: mancuernas en las rondas libres (' + w + '/' + n + ')');
        assert.ok(!mat[n - 1].dumbbells, d + ' min: última ronda sin peso');
        s.blocks.forEach(function (b, i) {
          if (b.material.dumbbells && b.hiit) {
            const tr = s.timeline[s.timeline.indexOf(b.hiit) - 1];
            assert.ok(tr.dropDumbbells, d + ' min: avisa de dejar las mancuernas antes del HIIT');
          }
          if (b.material.paper) { leadOnly(SB, assert, b, d + ' min ronda ' + (i + 1)); noRepeats(assert, b, d + ' min ronda ' + (i + 1)); }
        });
      });
    });

    SBT.it('papel y toalla: una sola ronda por sesión y se alternan entre sesiones', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, { equipPaper: true, equipElbow: true });
      SB.library.applyPreset('completo');
      const seen = [];
      for (let k = 0; k < 4; k++) {
        const s = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'completo', seed: 'lock' + k });
        const mat = s.blocks.map(function (b) { return b.material; });
        const paper = mat.filter(function (m) { return m.paper; }).length, elbow = mat.filter(function (m) { return m.elbow; }).length;
        assert.equal(paper + elbow, 1, 'sesión ' + (k + 1) + ': una sola ronda de brazo atrasado fijo');
        seen.push(paper ? 'papel' : 'toalla');
        SB.history.record(SB.session.toRecord(s, { completed: true }));
      }
      for (let k = 1; k < seen.length; k++) assert.notEqual(seen[k], seen[k - 1], 'se alternan: ' + seen.join(' → '));
      SBT.info('brazo atrasado fijo por sesión: ' + seen.join(' → '));
    });

    SBT.it('todo el material: un solo elemento por ronda, cada accesorio una vez, cuerda con esquivas y avisos', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, ALL_ON);
      SB.library.applyPreset('golpes_defensa');
      [20, 30, 45].forEach(function (d) {
        const s = SB.session.generate({ durationMin: d, level: 'basico', goalId: 'completo', seed: 'all' + d });
        const n = s.blocks.length;
        const mat = s.blocks.map(function (b) { return b.material; });
        mat.forEach(function (m, i) {
          const tag = d + ' min ronda ' + (i + 1);
          KEYS.forEach(function (k) { assert.equal(typeof m[k], 'boolean', tag + ': ' + k + ' booleano'); });
          assert.ok(countOn(m) <= 1, tag + ': un elemento como mucho (' + KEYS.filter(function (k) { return m[k]; }).join(', ') + ')');
        });
        KEYS.filter(function (k) { return k !== 'dumbbells'; }).forEach(function (k) {
          assert.ok(mat.filter(function (m) { return m[k]; }).length <= 1, d + ' min: ' + k + ' una vez como mucho');
        });
        assert.ok(mat.filter(function (m) { return m.paper || m.elbow; }).length <= 1, d + ' min: una ronda de papel o toalla como mucho');
        assert.ok(!mat[n - 1].dumbbells, d + ' min: última ronda sin peso');
        if (n - 1 >= 6) {
          ['ball', 'rope', 'hangball', 'tape', 'ankles'].forEach(function (k) { assert.ok(mat.some(function (m) { return m[k]; }), d + ' min: hay ronda con ' + k); });
          assert.ok(mat.some(function (m) { return m.paper || m.elbow; }), d + ' min: hay ronda con papel o toalla');
        }
        s.blocks.forEach(function (b, i) {
          const tag = d + ' min ronda ' + (i + 1);
          if (b.material.paper || b.material.elbow) {
            leadOnly(SB, assert, b, tag);
            noRepeats(assert, b, tag);
            // Foco de defensa si cabe (no siempre: dos rondas seguidas no repiten foco) y, en todo
            // caso, la mayoría de las combinaciones con una defensa o un paso entre los golpes.
            let all = 0, mixed = 0;
            b.intervals.forEach(function (iv) {
              iv.combos.forEach(function (c) {
                all++;
                if (c.seq.some(function (id) { const m = SB.library.get(id); return m && m.category !== 'golpe'; })) mixed++;
              });
            });
            assert.ok(mixed >= 0.6 * all, tag + ': con defensas o pasos (' + mixed + '/' + all + ', foco ' + b.focusId + ')');
          }
          if (b.material.rope) {
            assert.ok(['defensa', 'contra'].indexOf(b.focusId) !== -1, tag + ': ronda con cuerda con foco de defensa (' + b.focusId + ')');
            b.intervals.forEach(function (iv) {
              iv.combos.forEach(function (c) {
                assert.ok(c.seq.some(function (id) { return ROPE_DODGES.indexOf(id) !== -1; }), tag + ': con la cuerda, cada combinación lleva una esquiva (' + c.seq.join('-') + ')');
              });
            });
          }
          if (b.hiit) {
            const tr = s.timeline[s.timeline.indexOf(b.hiit) - 1];
            assert.equal(!!tr.dropDumbbells, !!b.material.dumbbells, tag + ': aviso de dejar las mancuernas');
            assert.equal(!!tr.removeAnkles, !!b.material.ankles, tag + ': aviso de quitar la goma de los tobillos');
          }
        });
        const hiits = s.timeline.filter(function (x) { return x.type === 'hiit' && !x.finisher; });
        assert.ok(hiits.some(function (x) { return DEFENSE_DRILLS.indexOf(x.exercise.id) !== -1; }), d + ' min: el HIIT lleva un ejercicio de defensa');
        hiits.forEach(function (x) {
          const withRope = ['slip_drill', 'roll_drill', 'duck_drill'].indexOf(x.exercise.id) !== -1;
          assert.equal(!!(x.material && x.material.rope), withRope, d + ' min: ' + x.exercise.id + (withRope ? ' con' : ' sin') + ' la cuerda');
        });
      });
    });

    SBT.it('sin material activado no hay material en ninguna ronda', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.applyPreset('completo');
      const s = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'completo', seed: 'nomat' });
      assert.ok(s.blocks.every(function (b) { return KEYS.every(function (k) { return !b.material[k]; }); }), 'ninguna ronda con material');
      assert.ok(s.timeline.every(function (x) { return !x.dropDumbbells && !x.removeAnkles && !(x.material && x.material.rope); }), 'sin avisos de material');
    });

    SBT.it('defensas en el circuito: sentadilla, goma y cintura completa salen en básico y el HIIT siempre lleva una', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, { equipRope: true });
      SB.library.applyPreset('golpes_defensa');
      const seen = {};
      let withDrill = 0;
      const N = 8;
      for (let k = 0; k < N; k++) {
        const s = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'completo', seed: 'def' + k });
        SBT.h.combos(s).forEach(function (x) { x.c.seq.forEach(function (id) { seen[id] = true; }); });
        if (s.timeline.some(function (x) { return x.type === 'hiit' && !x.finisher && DEFENSE_DRILLS.indexOf(x.exercise.id) !== -1; })) withDrill++;
      }
      // Con los datos reales las seis son de nivel básico; en los fixtures, cintura completa, goma y sentadilla siguen siendo avanzadas.
      const basic = ['slip_lead', 'slip_rear', 'roll_lead', 'roll_rear', 'duck', 'pull_back'].filter(function (id) { return SB.library.eligibleAtLevel(id, 'basico'); });
      if (env.dataName !== 'fixtures') assert.equal(basic.length, 6, 'las seis defensas son de nivel básico');
      basic.forEach(function (id) {
        assert.ok(seen[id], id + ' aparece en las combinaciones de nivel básico');
      });
      SBT.info('defensas de nivel básico comprobadas: ' + basic.join(', '));
      assert.equal(withDrill, N, 'todas las sesiones llevan un ejercicio de defensa en el HIIT');
    });

    SBT.it('ensureMovements añade a la biblioteca solo las técnicas que faltan', function (env, assert) {
      const SB = env.fresh();
      SB.library.applyPreset('golpes');
      SB.library.add('duck', 'dominado');
      const added = SB.library.ensureMovements(['slip_lead', 'duck', 'pull_back', 'no_existe'], 'practica');
      assert.deepEqual(added.slice().sort(), ['pull_back', 'slip_lead'], 'añade solo las que faltan y existen');
      assert.equal(SB.library.statusOf('duck'), 'dominado', 'no cambia las que ya estaban');
      assert.equal(SB.library.statusOf('pull_back'), 'practica', 'las nuevas, en práctica');
    });
  });
  SBT.describe('Cámara: orden de las cámaras y mensajes de error', function () {
    SBT.it('las cámaras virtuales van al final y la elegida o la última que funcionó, primero', function (env, assert) {
      const SB = env.fresh();
      const P = SB.vision.pose;
      const cams = [
        { deviceId: 'v1', label: 'Mirametrix Virtual Camera', virtual: P.isVirtual('Mirametrix Virtual Camera') },
        { deviceId: 'lg', label: 'LG Camera', virtual: P.isVirtual('LG Camera') },
        { deviceId: 'obs', label: 'OBS Virtual Camera', virtual: P.isVirtual('OBS Virtual Camera') },
        { deviceId: 'usb', label: 'USB Webcam', virtual: P.isVirtual('USB Webcam') },
        { deviceId: '', label: 'Cámara 5', virtual: false }
      ];
      assert.ok(cams[0].virtual && cams[2].virtual, 'Mirametrix y OBS se reconocen como virtuales');
      assert.ok(!cams[1].virtual && !cams[3].virtual, 'LG Camera y USB Webcam son reales');
      const ids = function (l) { return l.map(function (c) { return c.deviceId; }).join(','); };
      assert.equal(ids(P.orderCameras(cams, [], [])), 'lg,usb,v1,obs', 'reales primero, virtuales al final, sin las que no tienen id');
      assert.equal(ids(P.orderCameras(cams, ['obs'], [])), 'obs,lg,usb,v1', 'la elegida en Ajustes va la primera aunque sea virtual');
      assert.equal(ids(P.orderCameras(cams, ['usb', 'v1'], [])), 'usb,v1,lg,obs', 'elegida y última que funcionó, en ese orden');
      assert.equal(ids(P.orderCameras(cams, [], ['lg', 'v1'])), 'usb,obs', 'no repite las que ya se han probado');
    });

    SBT.it('cada error de cámara tiene mensaje, solución y código', function (env, assert) {
      const SB = env.fresh();
      const P = SB.vision.pose;
      const names = ['NotAllowedError', 'SecurityError', 'UnsupportedError', 'NotReadableError', 'AbortError', 'NoFramesError', 'NotFoundError', 'OverconstrainedError', 'RaroError'];
      const msgs = {};
      names.forEach(function (n) {
        const d = P.describeError({ name: n, message: '' });
        assert.ok(d.msg && d.fix, n + ': mensaje y solución');
        assert.equal(d.code, n, n + ': el código es el nombre del error');
        msgs[n] = d.msg;
      });
      assert.ok(/permiso/.test(msgs.NotAllowedError), 'sin permiso del navegador');
      assert.ok(/Windows/.test(P.describeError({ name: 'NotAllowedError', message: 'Permission denied by system' }).msg), 'bloqueo de Windows: lo dice');
      assert.ok(/otra aplicación/.test(msgs.NotReadableError) && msgs.AbortError === msgs.NotReadableError, 'ocupada (también AbortError)');
      assert.ok(/no da imagen/.test(msgs.NoFramesError), 'sin imagen');
      const det = new Error('x'); det.sbStage = 'detector';
      assert.ok(/detector/.test(P.describeError(det).msg), 'fallo del detector de postura');
    });

    SBT.it('texto para colocarse según los puntos visibles', function (env, assert) {
      const SB = env.fresh();
      const P = SB.vision.pose;
      const lm = []; for (let i = 0; i < 33; i++) lm.push({ x: 0.5, y: 0.5, visibility: 0.9 });
      assert.equal(P.framingText(null), 'No te veo');
      assert.equal(P.framingText(lm), 'Te veo entero');
      const noFeet = lm.map(function (p, i) { return i === 27 || i === 28 ? { x: 0.5, y: 0.5, visibility: 0.1 } : p; });
      assert.ok(/pies/.test(P.framingText(noFeet)), 'sin pies: aléjate');
      const noTrunk = lm.map(function (p, i) { return i === 23 ? { x: 0.5, y: 0.5, visibility: 0.1 } : p; });
      assert.ok(/tronco/.test(P.framingText(noTrunk)), 'sin cadera: no se ve el tronco');
    });
  });

  SBT.describe('Voz, clips de los fallos y vídeos del informe', function () {
    SBT.it('voz: masculina de España si la hay, la elegida en Ajustes si sigue instalada', function (env, assert) {
      const SB = env.SB;
      if (!SB.voice || !SB.voice._choose) { SBT.info('js/audio/voice.js no cargado'); return; }
      const V = function (name, lang) { return { name: name, lang: lang }; };
      const win = [V('Microsoft Helena - Spanish (Spain)', 'es-ES'), V('Microsoft Laura - Spanish (Spain)', 'es-ES'), V('Microsoft Pablo - Spanish (Spain)', 'es-ES'), V('Microsoft Sabina - Spanish (Mexico)', 'es-MX')];
      assert.equal(SB.voice._choose(win, '').name, 'Microsoft Pablo - Spanish (Spain)', 'Windows: Pablo');
      assert.equal(SB.voice._choose(win, 'Microsoft Laura - Spanish (Spain)').name, 'Microsoft Laura - Spanish (Spain)', 'respeta la elegida');
      assert.equal(SB.voice._choose(win, 'No existe').name, 'Microsoft Pablo - Spanish (Spain)', 'si la elegida ya no está, automática');
      assert.equal(SB.voice._choose([V('Mónica', 'es-ES'), V('Jorge', 'es-ES')], '').name, 'Jorge', 'Apple: Jorge');
      assert.equal(SB.voice._choose([V('Paulina', 'es-MX'), V('Juan', 'es-MX')], '').name, 'Juan', 'masculina aunque no sea de España');
      assert.equal(SB.voice._choose([V('Helena', 'es-ES'), V('Sabina', 'es-MX')], '').name, 'Helena', 'sin masculina: la de España');
      assert.ok(!SB.voice._isMale(V('Microsoft Zira female', 'es-ES')), '«female» no cuenta como masculina');
      assert.equal(SB.voice._choose([], ''), null, 'sin voces: ninguna');
    });

    SBT.it('clips: frase de cada momento del fallo', function (env, assert) {
      const SB = env.SB;
      if (!SB.vision.clips) { SBT.info('js/vision/clips.js no cargado'); return; }
      const C = SB.vision.clips;
      const w = { t0: 9.2, t1: 10.9, at: 10, peak: 10.15, end: 10.4, side: 'l' };
      assert.ok(/cargas/i.test(C.labelAt({ id: 'windup', info: w }, 9.8)), 'antes de salir: «aquí cargas»');
      assert.ok(/sale el golpe/i.test(C.labelAt({ id: 'windup', info: w }, 10.1)), 'después: el golpe');
      assert.equal(C.labelAt({ id: 'windup', info: w }, 9.3), '', 'fuera de los tramos, sin frase');
      assert.ok(/abajo/.test(C.labelAt({ id: 'low_return', info: w }, 10.3)), 'vuelta por abajo');
      assert.ok(/barbilla/i.test(C.labelAt({ id: 'chin_up', info: { t0: 0, t1: 2 } }, 1)), 'error de postura: una frase para todo el clip');
      const rec = new C.Recorder();
      assert.ok(!rec.mark('no_existe', w), 'solo errores conocidos');
      assert.ok(rec.mark('windup', w) && !rec.mark('windup', w), 'un clip por error');
      rec.dispose();
      assert.equal(rec.ids().length, 0, 'dispose lo borra todo');
    });

    SBT.it('informe: cada punto a mejorar con su clip y un vídeo de YouTube que existe en la lista', function (env, assert) {
      const SB = env.SB;
      const videos = SB.data && SB.data.videos;
      assert.ok(videos, 'lista de vídeos cargada');
      const m = { frames: 300, punches: 20, rearPunches: 10, guard: 0.4, guardThirds: [0.5, 0.4, 0.3], otherLow: 0.5, chinUp: 0.6, chinFloor: 0.4,
        windup: 0.5, slowReturn: 0.5, lowReturn: 0.5, shortStraight: 0.6, leanPunch: 0.6, armOnly: 0.7, flare: 0.6, knees: 0.7, squared: 0.7,
        narrow: 0.7, wide: null, typeOk: 0.4, handOrder: 0.9, byType: {} };
      const fb = SB.vision.coachUtil.feedbackOf([m]);
      assert.ok(fb.improve.length >= 10, 'muchos puntos a mejorar: ' + fb.improve.length);
      fb.improve.forEach(function (x) {
        assert.ok(Array.isArray(x.clips), x.title + ': lista de clips');
        x.clips.forEach(function (id) { assert.ok(SB.vision.clips.INFO[id], x.title + ': el clip ' + id + ' se sabe dibujar'); });
        assert.ok(x.video && videos[x.video], x.title + ': vídeo recomendado (' + x.video + ')');
      });
      Object.keys(videos).forEach(function (k) {
        const v = videos[k];
        [v].concat(v.alt ? [v.alt] : []).forEach(function (x) {
          assert.ok(/^[\w-]{11}$/.test(x.id) && x.title && x.channel && x.lang, k + ': id, título, canal e idioma');
        });
      });
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
