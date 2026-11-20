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
    const cues = [];
    const coach = o.coach;
    if (coach) coach.startRound({ round: o.round || 1, material: o.material || {} }, frames[0].t);
    frames.forEach(function (f) { an.push(f); if (coach) { const c = coach.update(f.t); if (c) cues.push(c.id); } });
    const stats = an.endRound();
    return { an: an, stats: stats, cues: cues, summary: coach ? coach.endRound(stats) : null };
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

    SBT.it('guardia baja y barbilla arriba: avisos en directo y resumen', function (env, assert) {
      if (!hasVision(env)) return;
      const SB = env.fresh();
      const an = new SB.vision.Analyzer({ stance: 'diestro' });
      const said = [];
      const coach = new SB.vision.Coach({ analyzer: an, say: function (t) { said.push(t); } });
      const r = runRound(SB, roundFrames(30, [{ hand: 'l' }, { hand: 'r', rot: 35 }], { lowHands: true, noseY: -0.72 }), { analyzer: an, coach: coach });
      assert.ok(r.cues.indexOf('rear_low') !== -1 || r.cues.indexOf('lead_low') !== -1, 'avisa de la mano baja: ' + r.cues.join(','));
      assert.ok(r.cues.indexOf('chin_up') !== -1, 'avisa de la barbilla (ronda de técnica): ' + r.cues.join(','));
      assert.ok(said[0].indexOf('Ronda 1') === 0, 'anuncia el tema: ' + said[0]);
      assert.ok(r.cues.length <= 8, 'sin saturar: ' + r.cues.length + ' avisos en 30 s');
      const fb = SB.vision.coachUtil.feedbackOf([SB.vision.coachUtil.metricsOf(r.stats)]);
      assert.ok(fb.improve.some(function (x) { return x.area === 'guardia'; }), 'informe: mejorar guardia');
      assert.ok(fb.improve.some(function (x) { return x.area === 'barbilla'; }), 'informe: mejorar barbilla');
      assert.ok(r.summary && r.summary.fix, 'resumen de ronda con un punto a mejorar');
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

    SBT.it('mancuernas (70 %, última sin peso), pelota en impares y papel con solo la mano adelantada', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, { equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7 });
      SB.library.applyPreset('completo');
      [20, 30, 45].forEach(function (d) {
        const s = SB.session.generate({ durationMin: d, level: 'basico', goalId: 'completo', seed: 'mat' + d });
        const n = s.blocks.length;
        const mat = s.blocks.map(function (b) { return b.material; });
        const w = mat.filter(function (m) { return m.dumbbells; }).length;
        assert.equal(w, n >= 2 ? Math.min(n - 1, Math.round(0.7 * n)) : Math.round(0.7 * n), d + ' min: rondas con mancuernas (' + w + '/' + n + ')');
        if (n >= 2) assert.ok(!mat[n - 1].dumbbells, d + ' min: última ronda sin peso');
        mat.forEach(function (m, i) { assert.equal(m.ball, i % 2 === 0, d + ' min: pelota en rondas impares'); });
        mat.forEach(function (m, i) { assert.equal(m.paper, n >= 2 && i % 3 === 1, d + ' min: papel en las rondas 2, 5, 8…'); });
        s.blocks.forEach(function (b, i) {
          if (b.material.dumbbells && b.hiit) {
            const tr = s.timeline[s.timeline.indexOf(b.hiit) - 1];
            assert.ok(tr.dropDumbbells, d + ' min: avisa de dejar las mancuernas antes del HIIT');
          }
          if (b.material.paper) leadOnly(SB, assert, b, d + ' min ronda ' + (i + 1));
        });
        assert.ok(mat.some(function (m) { return m.paper; }) || n < 2, d + ' min: hay rondas con papel');
      });
    });

    SBT.it('todo el material: una ronda especial como mucho, cuerda con esquivas, pelota colgada sin peso y avisos', function (env, assert) {
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
          const specials = (m.paper || m.elbow ? 1 : 0) + (m.rope ? 1 : 0) + (m.hangball ? 1 : 0);
          assert.ok(specials <= 1, tag + ': como mucho una ronda especial');
          if (i === 0) assert.equal(specials, 0, tag + ': la primera ronda, sin especial');
          assert.equal(m.paper, m.elbow, tag + ': papel y toalla van juntos');
          if (m.hangball) assert.ok(!m.dumbbells, tag + ': pelota colgada sin mancuernas');
          const light = (m.ball ? 1 : 0) + (m.tape ? 1 : 0) + (m.ankles ? 1 : 0);
          assert.equal(light, 1, tag + ': un material ligero por ronda');
          assert.ok([m.ball, m.tape, m.ankles][i % 3], tag + ': pelota, cinta y goma en ciclo');
        });
        assert.ok(!mat[n - 1].dumbbells, d + ' min: última ronda sin peso');
        if (n >= 4) {
          ['rope', 'hangball', 'paper'].forEach(function (k) { assert.ok(mat.some(function (m) { return m[k]; }), d + ' min: hay rondas con ' + k); });
        }
        s.blocks.forEach(function (b, i) {
          const tag = d + ' min ronda ' + (i + 1);
          if (b.material.paper) leadOnly(SB, assert, b, tag);
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
})(typeof window !== 'undefined' ? window : globalThis);
