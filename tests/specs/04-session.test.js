/**
 * SOMBRA · tests/specs/04-session.test.js
 * Generación de sesiones: estructura y tiempos [área 1], HIIT [área 2],
 * coherencia y biblioteca [área 3], biblioteca pequeña y objetivos [área 6].
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;
  const DURATIONS = [20, 30, 45];
  const LEVELS = ['basico', 'avanzado'];
  const setCache = new WeakMap();

  function prepare(env, preset) {
    const SB = env.fresh();
    SBT.h.settings(SB);
    SB.library.applyPreset(preset || 'completo');
    return SB;
  }

  /** Sesiones de 20/30/45 min × básico/avanzado × objetivos disponibles (biblioteca completa). */
  function sessionSet(env) {
    if (setCache.has(env)) return setCache.get(env);
    const SB = prepare(env, 'completo');
    const list = [];
    LEVELS.forEach(function (level) {
      const goals = SB.session.availableGoals(level).filter(function (g) { return g.available; }).map(function (g) { return g.goal.id; });
      goals.forEach(function (goalId) {
        DURATIONS.forEach(function (d) {
          const s = SB.session.generate({ durationMin: d, level: level, goalId: goalId, seed: 'set-' + level + '-' + goalId + '-' + d });
          list.push({ level: level, goalId: goalId, durationMin: d, s: s });
        });
      });
    });
    setCache.set(env, list);
    return list;
  }

  /** Comprobaciones estructurales de una sesión (§6.1, §6.2, §7.1). */
  function checkStructure(SB, assert, x) {
    const s = x.s;
    const tag = x.level + '/' + x.goalId + '/' + x.durationMin + ' min';
    const tl = s.timeline;
    assert.ok(Math.abs(s.totalSec - x.durationMin * 60) <= 60, tag + ': total ' + s.totalSec + ' s a ≤60 s del objetivo');
    assert.equal(tl[0].type, 'prepare', tag + ': empieza con preparación');
    assert.equal(tl[0].duration, 5, tag + ': preparación de 5 s');
    let t = 0;
    tl.forEach(function (seg, i) {
      assert.equal(seg.start, t, tag + ': segmento ' + i + ' contiguo');
      assert.ok(seg.duration > 0, tag + ': duración positiva');
      t += seg.duration;
    });
    assert.equal(t, s.totalSec, tag + ': totalSec = suma de segmentos');
    const n = s.blocks.length;
    assert.ok(n >= 1, tag + ': al menos un bloque');
    assert.equal(tl[tl.length - 1].type, 'hiit', tag + ': termina con HIIT');
    assert.equal(s.blocks[n - 1].rest, null, tag + ': último bloque sin descanso');
    const notFin = function (x) { return !x.finisher; };
    const rests = SBT.h.segs(s, 'rest').filter(notFin);
    assert.equal(rests.length, n - 1, tag + ': un descanso entre bloques');
    assert.equal(SBT.h.segs(s, 'hiit').filter(notFin).length, n, tag + ': un HIIT por bloque');
    assert.equal(SBT.h.segs(s, 'transition').filter(notFin).length, n, tag + ': una transición por HIIT');
    // Abdomen: nunca entre rondas; todo al final, tras un descanso.
    SBT.h.segs(s, 'hiit').filter(notFin).forEach(function (hs) { assert.notEqual(hs.exercise.pattern, 'core', tag + ': abdomen entre rondas (' + hs.exercise.id + ')'); });
    const fin = SBT.h.segs(s, 'hiit').filter(function (x) { return x.finisher; });
    assert.ok(s.finisher && fin.length >= 1, tag + ': bloque final de abdomen');
    fin.forEach(function (hs) { assert.equal(hs.exercise.pattern, 'core', tag + ': el bloque final es de abdomen'); });
    assert.equal(new Set(fin.map(function (x) { return x.exercise.id; })).size, fin.length, tag + ': abdomen sin repetir');
    assert.ok(tl.indexOf(fin[0]) > tl.indexOf(s.blocks[n - 1].hiit), tag + ': el abdomen va después del último HIIT');
    assert.equal(tl[tl.indexOf(s.blocks[n - 1].hiit) + 1].type, 'rest', tag + ': descanso antes del abdomen');
    const longs = rests.filter(function (r) { return r.long; });
    if (n >= 10) {
      assert.equal(longs.length, 1, tag + ': descanso largo con ≥10 bloques');
      assert.equal(longs[0].duration, s.params.restSec + 30, tag + ': descanso largo = restSec + 30');
    } else {
      assert.equal(longs.length, 0, tag + ': sin descanso largo');
    }
    s.blocks.forEach(function (b, bi) {
      assert.equal(b.intervals.length, s.params.intervalsPerRound, tag + ': intervalos por ronda');
      const reps = b.intervals.filter(function (iv) { return iv.mode === 'repeticion'; }).length;
      if (x.level === 'basico') assert.ok(reps >= 1, tag + ' ronda ' + (bi + 1) + ': ≥1 REPETICIÓN en básico');
      else assert.ok(reps < b.intervals.length, tag + ' ronda ' + (bi + 1) + ': ≥1 VARIACIÓN en avanzado');
      const hiitIdx = tl.indexOf(b.hiit);
      assert.equal(tl[hiitIdx - 1].type, 'transition', tag + ': transición antes del HIIT');
      assert.equal(tl[hiitIdx - 1].duration, 5, tag + ': transición de 5 s');
      assert.equal(tl[hiitIdx - 1].next.title, b.hiit.exercise.name, tag + ': la transición anuncia el ejercicio');
      b.intervals.forEach(function (iv) {
        assert.ok(iv.duration >= 30 && iv.duration <= 75, tag + ': intervalo entre 30 y 75 s');
        assert.ok(iv.combos.length >= 1, tag + ': intervalo con combinaciones');
        if (iv.mode === 'repeticion') assert.equal(iv.combos.length, 1, tag + ': REPETICIÓN = una combinación');
        let ct = 0;
        iv.combos.forEach(function (c) { assert.equal(c.start, ct, tag + ': combinaciones contiguas'); ct += c.duration; });
        assert.equal(ct, iv.duration, tag + ': combinaciones llenan el intervalo');
        assert.equal(iv.round, bi + 1);
        assert.equal(iv.roundsTotal, n);
        assert.ok(['controlado', 'fluido', 'explosivo', 'continuo'].indexOf(iv.tempo) !== -1, 'tempo');
        assert.ok(iv.focusId && iv.focusName, 'foco');
      });
      // Transferencia REPETICIÓN → VARIACIÓN
      const repIv = b.intervals.filter(function (iv) { return iv.mode === 'repeticion'; });
      const varIv = b.intervals.filter(function (iv) { return iv.mode === 'variacion'; });
      if (repIv.length && varIv.length && varIv.every(function (iv) { return iv.combos.length >= 2; })) {
        repIv.forEach(function (r) {
          const sig = r.combos[0].signature;
          assert.ok(varIv.some(function (iv) { return iv.combos.some(function (c) { return c.signature === sig; }); }), tag + ': transferencia de ' + sig);
        });
      }
    });
    tl.forEach(function (seg) {
      if (seg.type === 'prepare' || (seg.type === 'rest' && !seg.finisher)) {
        assert.equal(seg.next.type, 'boxing', tag + ': ' + seg.type + ' anuncia la ronda');
        assert.ok(seg.next.title.indexOf('Ronda') === 0, tag + ': título de la siguiente ronda');
      }
    });
  }

  SBT.describe('Sesiones: estructura y tiempos (área 1)', function () {
    SBT.it('20/30/45 min · básico y avanzado · todos los objetivos disponibles', function (env, assert) {
      const set = sessionSet(env);
      const SB = prepare(env, 'completo');
      let maxDiff = 0;
      set.forEach(function (x) { checkStructure(SB, assert, x); maxDiff = Math.max(maxDiff, Math.abs(x.s.totalSec - x.durationMin * 60)); });
      SBT.info(set.length + ' sesiones · desviación máxima respecto al objetivo: ' + maxDiff + ' s');
      const goals = SB.session.availableGoals('basico').filter(function (g) { return g.available; }).length;
      assert.equal(goals, SB.data.goals.length, 'con la biblioteca completa todos los objetivos están disponibles');
    });

    SBT.it('progresión: más REPETICIÓN al principio y complejidad algo mayor al final', function (env, assert) {
      const set = sessionSet(env);
      let early = 0, late = 0, cEarly = [], cLate = [];
      set.filter(function (x) { return x.durationMin === 45; }).forEach(function (x) {
        const b = x.s.blocks;
        const half = Math.floor(b.length / 2);
        b.forEach(function (blk, i) {
          const reps = blk.intervals.filter(function (iv) { return iv.mode === 'repeticion'; }).length;
          const cx = [];
          blk.intervals.forEach(function (iv) { iv.combos.forEach(function (c) { cx.push(c.complexity); }); });
          if (i < half) { early += reps; cEarly = cEarly.concat(cx); } else if (i >= b.length - half) { late += reps; cLate = cLate.concat(cx); }
        });
      });
      SBT.info('intervalos de REPETICIÓN 1.ª mitad / 2.ª mitad: ' + early + ' / ' + late +
        ' · complejidad media: ' + SBT.h.round(SBT.h.mean(cEarly), 2) + ' → ' + SBT.h.round(SBT.h.mean(cLate), 2));
      assert.ok(early > late, 'más repetición al principio');
      assert.ok(SBT.h.mean(cLate) > SBT.h.mean(cEarly), 'más complejidad al final');
    });

    SBT.it('determinista con la misma semilla; focos sin repetir en rondas consecutivas', function (env, assert) {
      const SB = prepare(env, 'completo');
      const a = SB.session.generate({ durationMin: 30, level: 'avanzado', goalId: 'completo', seed: 99 });
      const b = SB.session.generate({ durationMin: 30, level: 'avanzado', goalId: 'completo', seed: 99 });
      assert.deepEqual(a.timeline, b.timeline, 'misma semilla, misma sesión');
      const c = SB.session.generate({ durationMin: 30, level: 'avanzado', goalId: 'completo', seed: 100 });
      assert.ok(SB.util.jaccard(a.fingerprint, c.fingerprint) < 0.6, 'semilla distinta, sesión distinta');
      sessionSet(env).forEach(function (x) {
        for (let i = 1; i < x.s.blocks.length; i++) {
          assert.notEqual(x.s.blocks[i].focusId, x.s.blocks[i - 1].focusId, x.goalId + ': foco repetido en rondas consecutivas');
        }
      });
    });

    SBT.it('opciones personalizadas y ajustes del usuario', function (env, assert) {
      const SB = prepare(env, 'completo');
      const s = SB.session.generate({
        durationMin: 25, level: 'basico', goalId: 'completo', seed: 5,
        custom: { intervalSec: 60, intervalsPerRound: 2, restSec: 15, hiitSec: 20, repRatio: 0, focuses: ['ataque'] }
      });
      assert.ok(Math.abs(s.totalSec - 1500) <= 60, 'total ' + s.totalSec);
      assert.equal(s.params.intervalsPerRound, 2);
      assert.equal(s.params.restSec, 15);
      SBT.h.segs(s, 'hiit').forEach(function (h) { assert.equal(h.duration, 20, 'HIIT personalizado'); });
      SBT.h.segs(s, 'rest').forEach(function (r) { assert.ok(r.duration === 15 || r.duration === 45, 'descanso personalizado'); });
      s.blocks.forEach(function (b) {
        assert.equal(b.focusId, 'ataque', 'custom.focuses limita los focos');
        assert.ok(b.intervals.some(function (iv) { return iv.mode === 'repeticion'; }), 'básico mantiene ≥1 REPETICIÓN aunque repRatio = 0');
      });
      // Ajustes: exigencia HIIT y descanso del usuario
      SBT.h.settings(SB, { hiitDemand: 'moderada', restSec: 45, changePace: 'rapida' });
      const m = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'completo', seed: 6 });
      SBT.h.segs(m, 'hiit').forEach(function (h) { assert.equal(h.duration, 30, 'moderada = 30 s'); assert.ok(h.exercise.demand <= 2, 'moderada: demanda ≤ 2'); });
      SBT.h.segs(m, 'rest').forEach(function (r) { assert.ok(r.duration === 45 || r.duration === 75, 'descanso del usuario'); });
      SBT.h.settings(SB, { hiitDemand: 'muy_alta' });
      const v = SB.session.generate({ durationMin: 30, level: 'avanzado', goalId: 'velocidad', seed: 7 });
      SBT.h.segs(v, 'hiit').forEach(function (h) { assert.equal(h.duration, 45, 'muy alta = 45 s'); });
      const goal = SB.data.goals.find(function (g) { return g.id === 'velocidad'; });
      const iv = goal.timing.intervalSec;
      if (iv && typeof iv === 'object') assert.equal(v.params.intervalSec, iv.avanzado, 'timing.intervalSec por nivel');
      const res = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'resistencia', seed: 8 });
      const rg = SB.data.goals.find(function (g) { return g.id === 'resistencia'; });
      if (rg.timing.restSec) assert.equal(res.params.restSec, rg.timing.restSec, 'el objetivo fija el descanso');
    });
  });

  SBT.describe('Sesiones: HIIT (área 2)', function () {
    SBT.it('alternancia estricta, sin repetidos y patrón distinto en consecutivos de la misma categoría', function (env, assert) {
      const set = sessionSet(env);
      const SB = prepare(env, 'completo');
      const pool = SB.hiit.pool({ demand: 'alta' });
      const byCat = { fuerza: pool.filter(function (e) { return e.category === 'fuerza'; }), cardio: pool.filter(function (e) { return e.category === 'cardio'; }) };
      let highPairs = 0;
      set.forEach(function (x) {
        const h = SBT.h.segs(x.s, 'hiit').filter(function (s) { return !s.finisher; });
        const tag = x.level + '/' + x.goalId + '/' + x.durationMin;
        for (let i = 1; i < h.length; i++) assert.notEqual(h[i].category, h[i - 1].category, tag + ': alternancia estricta');
        ['fuerza', 'cardio'].forEach(function (cat) {
          const list = h.filter(function (s) { return s.category === cat; });
          const ids = list.map(function (s) { return s.exercise.id; });
          if (byCat[cat].length >= ids.length) assert.equal(new Set(ids).size, ids.length, tag + ': sin repetir ' + cat);
          for (let i = 1; i < list.length; i++) {
            assert.notEqual(list[i].exercise.pattern, list[i - 1].exercise.pattern, tag + ': patrón distinto en ' + cat + ' consecutivos');
            if (list[i].exercise.impact === 'alto' && list[i - 1].exercise.impact === 'alto') highPairs++;
          }
        });
      });
      SBT.info('pares consecutivos de impacto alto en la misma categoría: ' + highPairs);
    });

    SBT.it('el primer bloque empieza por la categoría contraria a la sesión anterior', function (env, assert) {
      const SB = prepare(env, 'completo');
      let prev = null;
      for (let i = 0; i < 4; i++) {
        const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'completo', seed: 'alt' + i });
        const first = SBT.h.segs(s, 'hiit')[0].category;
        if (prev) assert.notEqual(first, prev, 'empieza por la contraria');
        SB.history.record(SB.session.toRecord(s, { completed: true }));
        assert.equal(SB.history.lastHiitStart(), first);
        prev = first;
      }
    });

    SBT.it('respeta hiitPrefs.disabled y requires', function (env, assert) {
      const SB = prepare(env, 'golpes');
      const all = SB.data.hiit;
      const disabled = all.filter(function (e, i) { return i % 3 === 0; }).map(function (e) { return e.id; });
      SB.storage.set('hiitPrefs', { disabled: disabled });
      const lib = new Set(SB.library.personal().map(function (m) { return m.id; }));
      for (let k = 0; k < 3; k++) {
        const s = SB.session.generate({ durationMin: 45, level: 'avanzado', goalId: 'completo', seed: 'pref' + k });
        SBT.h.segs(s, 'hiit').forEach(function (h) {
          assert.ok(disabled.indexOf(h.exercise.id) === -1, 'ejercicio desactivado: ' + h.exercise.id);
          const ex = all.find(function (e) { return e.id === h.exercise.id; });
          (ex.requires || []).forEach(function (r) { assert.ok(lib.has(r), h.exercise.id + ' requiere ' + r); });
        });
      }
      // Todo desactivado: la sesión sigue siendo válida, sin HIIT y con nota.
      SB.storage.set('hiitPrefs', { disabled: all.map(function (e) { return e.id; }) });
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'completo', seed: 1 });
      assert.equal(SBT.h.segs(s, 'hiit').length, 0);
      assert.ok(s.notes.length > 0, 'nota sin HIIT');
      assert.ok(Math.abs(s.totalSec - 1200) <= 60);
    });
  });

  SBT.describe('Sesiones: coherencia y biblioteca (área 3)', function () {
    function checkCombos(SB, assert, s, level, tag) {
      const caps = SB.library.STATUS_CAP;
      SBT.h.combos(s).forEach(function (x) {
        const c = x.c;
        const r = SB.grammar.validate(c.seq, { level: level });
        assert.ok(r.ok, tag + ': ' + c.signature + ' → ' + r.errors.join(' '));
        let cap = level === 'basico' ? 3 : 5;
        c.seq.forEach(function (id) {
          const st = SB.library.statusOf(id);
          assert.ok(st, tag + ': ' + id + ' no está en la biblioteca personal');
          cap = Math.min(cap, caps[st]);
          if (level === 'basico' && SB.library.get(id).level === 'avanzado') assert.equal(st, 'dominado', tag + ': avanzado no dominado en básico (' + id + ')');
        });
        assert.atMost(r.complexity, cap, tag + ': tope de complejidad de ' + c.signature);
        assert.equal(c.signature, c.seq.join('>'));
        assert.ok(['curated', 'generated', 'personal'].indexOf(c.source) !== -1, 'source');
        if (c.source === 'curated') assert.ok(c.refId && c.name, 'curada con metadatos');
      });
    }

    SBT.it('todas las combinaciones pasan la gramática y usan solo la biblioteca (completo)', function (env, assert) {
      const set = sessionSet(env);
      const SB = prepare(env, 'completo');
      const src = { curated: 0, generated: 0, personal: 0 };
      set.forEach(function (x) {
        checkCombos(SB, assert, x.s, x.level, x.level + '/' + x.goalId + '/' + x.durationMin);
        SBT.h.combos(x.s).forEach(function (y) { src[y.c.source]++; });
      });
      SBT.info('origen de las combinaciones: ' + JSON.stringify(src));
      assert.ok(src.generated > 0 && src.curated > 0, 'mezcla curada/generada');
    });

    SBT.it('topes por estado y nivel con biblioteca mixta (golpes_defensa)', function (env, assert) {
      const SB = prepare(env, 'golpes_defensa');
      SB.library.add('rear_hook_body', 'practica'); // avanzado en práctica: nunca en básico
      SB.library.add('parry_cross', 'aprendido'); // avanzado aprendido: nunca en básico
      LEVELS.forEach(function (level) {
        ['completo', 'defensa', 'movilidad'].forEach(function (goalId) {
          const s = SB.session.generate({ durationMin: 30, level: level, goalId: goalId, seed: 'mix-' + level + goalId });
          checkCombos(SB, assert, s, level, 'golpes_defensa ' + level + '/' + goalId);
          if (level === 'basico') {
            SBT.h.combos(s).forEach(function (x) {
              assert.ok(x.c.seq.indexOf('rear_hook_body') === -1 && x.c.seq.indexOf('parry_cross') === -1, 'avanzado no dominado en básico');
            });
          }
        });
      });
    });

    SBT.it('novedad: featuredNew e isNew en la primera aparición', function (env, assert) {
      const SB = prepare(env, 'golpes');
      SB.library.add('slip_rear', 'practica');
      const s = SB.session.generate({ durationMin: 30, level: 'basico', goalId: 'defensa', seed: 'new' });
      assert.ok(s.featuredNew.length <= 2, 'como máximo 2 destacados');
      assert.includes(s.featuredNew, 'slip_rear', 'el movimiento recién añadido se destaca');
      const apps = SBT.h.combos(s).filter(function (x) { return x.c.seq.indexOf('slip_rear') !== -1; });
      assert.ok(apps.length > 0, 'aparece en la sesión');
      assert.ok(apps[0].c.isNew && apps[0].c.newIds.indexOf('slip_rear') !== -1, 'primera aparición marcada isNew');
      apps.slice(1).forEach(function (x) { assert.ok(x.c.newIds.indexOf('slip_rear') === -1, 'solo la primera aparición'); });
    });
  });

  SBT.describe('Biblioteca pequeña y objetivos (área 6)', function () {
    SBT.it('solo jab y cross: sesión válida con nota y sin movimientos no autorizados', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.add('jab', 'dominado');
      SB.library.add('cross', 'practica');
      LEVELS.forEach(function (level) {
        DURATIONS.forEach(function (d) {
          const s = SB.session.generate({ durationMin: d, level: level, goalId: 'completo', seed: 'small-' + level + d });
          assert.ok(Math.abs(s.totalSec - d * 60) <= 60, 'tiempo');
          assert.includes(s.notes, SB.session.SMALL_LIBRARY_NOTE, 'nota de biblioteca pequeña');
          const used = {};
          SBT.h.combos(s).forEach(function (x) {
            x.c.seq.forEach(function (id) { used[id] = 1; assert.ok(id === 'jab' || id === 'cross', 'movimiento no autorizado: ' + id); });
            assert.ok(SB.grammar.validate(x.c.seq, { level: level }).ok, 'coherente: ' + x.c.signature);
          });
          assert.ok(used.jab && used.cross, 'usa los dos golpes');
          SBT.h.segs(s, 'hiit').forEach(function (h) {
            const ex = SB.data.hiit.find(function (e) { return e.id === h.exercise.id; });
            (ex.requires || []).forEach(function (r) { assert.ok(r === 'jab' || r === 'cross', 'HIIT requiere ' + r); });
          });
          s.blocks.forEach(function (b) { assert.notEqual(b.focusId, 'niveles', 'sin golpes al cuerpo no hay foco de niveles'); });
        });
      });
    });

    SBT.it('availableGoals() detecta los objetivos no disponibles', function (env, assert) {
      const SB = env.fresh();
      const empty = SB.session.availableGoals();
      assert.ok(empty.every(function (g) { return !g.available && g.missing.indexOf('golpe') !== -1; }), 'sin biblioteca nada está disponible');
      SB.library.add('jab', 'dominado');
      SB.library.add('cross', 'dominado');
      const ag = SB.session.availableGoals();
      const byId = {};
      ag.forEach(function (g) { byId[g.goal.id] = g; });
      SB.data.goals.forEach(function (g) {
        const req = (g.requires && g.requires.categories) || [];
        const x = byId[g.id];
        if (req.length) {
          assert.ok(!x.available, g.id + ' no disponible');
          assert.deepEqual(x.missing, req, g.id + ' categorías que faltan');
        } else {
          assert.ok(x.available, g.id + ' disponible');
        }
      });
      assert.ok(!byId.defensa.available && !byId.movilidad.available, 'defensa y movilidad requieren técnicas');
      SB.library.add('slip_lead', 'aprendido');
      assert.ok(SB.session.availableGoals().find(function (g) { return g.goal.id === 'defensa'; }).available, 'con una defensa ya está disponible');
      // Nivel: un avanzado no dominado no cuenta en básico
      SB.library.remove('slip_lead');
      SB.library.add('parry_cross', 'practica');
      assert.ok(!SB.session.availableGoals('basico').find(function (g) { return g.goal.id === 'defensa'; }).available, 'parada del directo en práctica no cuenta en básico');
      assert.ok(SB.session.availableGoals('avanzado').find(function (g) { return g.goal.id === 'defensa'; }).available, 'sí en avanzado');
      // Objetivo no disponible pedido igualmente: sesión válida con nota
      SB.library.remove('parry_cross');
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'defensa', seed: 3 });
      assert.ok(s.notes.length >= 1, 'nota');
      SBT.h.combos(s).forEach(function (x) { x.c.seq.forEach(function (id) { assert.ok(id === 'jab' || id === 'cross'); }); });
    });

    SBT.it('biblioteca sin golpes: sesión sin combinaciones y con aviso (no lanza)', function (env, assert) {
      const SB = env.fresh();
      SB.library.add('step_in', 'dominado');
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'completo', seed: 1 });
      assert.ok(s.notes.some(function (n) { return /golpes/.test(n); }), 'aviso');
      assert.equal(SBT.h.combos(s).length, 0);
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
