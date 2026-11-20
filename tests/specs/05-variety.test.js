/**
 * SOMBRA · tests/specs/05-variety.test.js
 * Pesos por estado [área 4] y variedad / memoria [área 5].
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  function countIn(SB, sessions, ids) {
    const out = {};
    ids.forEach(function (id) { out[id] = 0; });
    sessions.forEach(function (s) {
      SBT.h.combos(s).forEach(function (x) { x.c.seq.forEach(function (id) { if (out[id] !== undefined) out[id] += x.c.duration; }); });
    });
    return out;
  }

  SBT.describe('Pesos por estado (área 4)', function () {
    SBT.it('los movimientos EN PRÁCTICA aparecen más que sus equivalentes dominados', function (env, assert) {
      const pairs = [['slip_lead', 'slip_rear'], ['jab_body', 'cross_body']];
      const N = 14;
      const runs = {};
      ['A', 'B'].forEach(function (run) {
        const SB = env.fresh();
        SBT.h.settings(SB);
        SB.library.applyPreset('golpes_defensa');
        pairs.forEach(function (p) {
          SB.library.setStatus(p[0], run === 'A' ? 'practica' : 'dominado');
          SB.library.setStatus(p[1], run === 'A' ? 'dominado' : 'practica');
        });
        const sessions = [];
        for (let i = 0; i < N; i++) {
          sessions.push(SB.session.generate({ durationMin: 30, level: 'basico', goalId: i % 2 ? 'defensa' : 'completo', seed: 'w' + i }));
        }
        runs[run] = countIn(SB, sessions, [].concat.apply([], pairs));
      });
      // Cada movimiento aparece más (tiempo en pantalla) cuando está en práctica que cuando está dominado.
      pairs.forEach(function (p) {
        p.forEach(function (id, k) {
          const prac = k === 0 ? runs.A[id] : runs.B[id];
          const dom = k === 0 ? runs.B[id] : runs.A[id];
          SBT.info(id + ': ' + Math.round(prac) + ' s en práctica vs ' + Math.round(dom) + ' s dominado (' + N + ' sesiones de 30 min)');
          assert.ok(prac > dom * 1.15, id + ' en práctica debe aparecer claramente más');
        });
        const ratioA = runs.A[p[0]] / Math.max(1, runs.A[p[1]]);
        const ratioB = runs.B[p[0]] / Math.max(1, runs.B[p[1]]);
        assert.ok(ratioA > ratioB, 'el par ' + p.join('/') + ' se inclina hacia el que está en práctica');
      });
    });

    SBT.it('pesos del selector según §6.3', function (env, assert) {
      const W = env.SB.selector.statusWeight;
      assert.equal(W('practica', 'repeticion', 'basico'), 2.5);
      assert.equal(W('aprendido', 'repeticion', 'basico'), 1.8);
      assert.equal(W('aprendido', 'variacion', 'basico'), 1);
      assert.equal(W('dominado', 'variacion', 'basico'), 1);
      assert.equal(W('dominado', 'variacion', 'avanzado'), 1.2);
      assert.equal(W('practica', 'variacion', 'avanzado', true), 3, 'combinación personal en práctica');
      assert.equal(W(null, 'variacion', 'basico'), 0);
    });
  });

  SBT.describe('Variedad y memoria (área 5)', function () {
    SBT.it('10 sesiones seguidas registradas: similitud media baja y ninguna repetida', function (env, assert) {
      // Umbral de similitud media por nivel: en básico el pool elegible es mucho menor
      // (solo combinaciones de nivel básico), así que el solapamiento natural es mayor.
      const LIMIT = { basico: 0.4, avanzado: 0.3 };
      ['basico', 'avanzado'].forEach(function (level) {
        const SB = env.fresh();
        SBT.h.settings(SB);
        SB.library.applyPreset('completo');
        const fps = [];
        const sims = [];
        let attempts = 0;
        let poolSize = 0;
        for (let i = 0; i < 10; i++) {
          const s = SB.session.generate({ durationMin: 30, level: level, goalId: 'completo', seed: 'var' + i });
          sims.push(s.similarity);
          attempts += s.attempts;
          poolSize = s.stats.poolSize;
          fps.push(s.fingerprint);
          const rec = SB.session.toRecord(s, { completed: true, date: new Date(2026, 9, 1 + i, 18) });
          assert.ok(SB.history.record(rec), 'registrada');
        }
        const pair = [];
        for (let i = 0; i < fps.length; i++) for (let j = i + 1; j < fps.length; j++) pair.push(SB.util.jaccard(fps[i], fps[j]));
        const mean = SBT.h.mean(pair);
        const max = Math.max.apply(null, pair);
        SBT.info(level + ': Jaccard media entre las 10 sesiones ' + SBT.h.round(mean) + ' · máxima ' + SBT.h.round(max) +
          ' · similitud con el historial al generar (media) ' + SBT.h.round(SBT.h.mean(sims)) + ' · intentos ' + attempts + ' · pool ' + poolSize + ' combinaciones');
        assert.ok(mean < LIMIT[level], level + ': similitud media baja (< ' + LIMIT[level] + ')');
        assert.ok(max <= 0.45, level + ': ninguna sesión parecida a otra (≤ 0,45)');
        assert.equal(new Set(fps.map(function (f) { return f.slice().sort().join('|'); })).size, 10, level + ': ninguna repetida');
        assert.equal(SB.history.all().length, 10);
        assert.equal(SB.history.recent(3)[0].id, SB.history.all()[9].id, 'recent() empieza por la última');
      });
    });

    SBT.it('la recencia reduce la frecuencia de las combinaciones recientes', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.applyPreset('completo');
      const seeds = ['rc0', 'rc1', 'rc2', 'rc3', 'rc4', 'rc5'];
      const gen = function () {
        return seeds.map(function (sd) { return SB.session.generate({ durationMin: 30, level: 'avanzado', goalId: 'completo', seed: sd }); });
      };
      const count = function (sessions, set) {
        let n = 0;
        sessions.forEach(function (s) { SBT.h.combos(s).forEach(function (x) { if (set.has(x.c.signature)) n++; }); });
        return n;
      };
      // Sin historial: las combinaciones más frecuentes.
      const base = gen();
      const freq = new Map();
      base.forEach(function (s) { SBT.h.combos(s).forEach(function (x) { freq.set(x.c.signature, (freq.get(x.c.signature) || 0) + 1); }); });
      const top = Array.from(freq.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 10).map(function (e) { return e[0]; });
      const topSet = new Set(top);
      const before = count(base, topSet);
      // Historial: 3 sesiones recientes que usaron mucho esas combinaciones.
      for (let k = 0; k < 3; k++) {
        const combos = [];
        top.forEach(function (sig) { for (let r = 0; r < 4; r++) combos.push(sig); });
        SB.history.record({ id: 'fake' + k, date: new Date(2026, 9, 20 + k).toISOString(), dayKey: '2026-10-2' + k, goalId: 'completo', level: 'basico', durationMin: 30, plannedSec: 1800, completedSec: 1800, activeSec: 1500, completed: true, combos: combos, movements: {}, hiit: [], hiitStart: 'fuerza', focuses: [], fingerprint: [] });
      }
      assert.closeTo(SB.history.comboRecency(top[0]), 4 * (1 + 0.7 + 0.49), 1e-9, 'r = Σ usos · 0,7^k');
      const after = count(gen(), topSet);
      SBT.info('usos de las 10 combinaciones más frecuentes: ' + before + ' sin historial → ' + after + ' con historial reciente');
      assert.ok(after < before * 0.7, 'la recencia reduce su frecuencia');
    });

    SBT.it('historial: solo sesiones entrenadas, máximo 200, métricas', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.applyPreset('golpes');
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'tecnica', seed: 1 });
      assert.ok(!SB.history.record(SB.session.toRecord(s, { completed: false, completedSec: 200, activeSec: 120 })), 'vista previa / <5 min no se registra');
      const partial = SB.session.toRecord(s, { completed: false, completedSec: 500 });
      assert.ok(partial.activeSec >= 300, 'activeSec calculado: ' + partial.activeSec);
      assert.ok(partial.combos.length < SB.session.toRecord(s, { completed: true }).combos.length, 'solo lo hecho');
      assert.ok(SB.history.record(partial), '≥5 min activos sí se registra');
      const rec = SB.history.all()[0];
      ['id', 'date', 'dayKey', 'goalId', 'level', 'durationMin', 'plannedSec', 'completedSec', 'activeSec', 'completed', 'combos', 'movements', 'hiit', 'hiitStart', 'focuses', 'fingerprint']
        .forEach(function (k) { assert.ok(rec[k] !== undefined, 'campo ' + k); });
      assert.ok(SB.history.lastGoalDate('tecnica'), 'lastGoalDate');
      assert.equal(SB.history.lastGoalDate('defensa'), null);
      assert.ok(SB.history.movementExposure().jab > 0, 'exposición');
      assert.ok(SB.history.hiitRecency(rec.hiit[0]) >= 1, 'recencia HIIT');
      assert.equal(SB.history.similarity(rec.fingerprint), 1, 'similitud consigo misma');
      const many = [];
      for (let i = 0; i < 205; i++) many.push(Object.assign({}, rec, { id: 'r' + i }));
      SB.storage.set('history', many.slice(0, 199));
      SB.history.record(many[199]);
      SB.history.record(many[200]);
      SB.history.record(many[201]);
      assert.equal(SB.history.all().length, 200, 'máximo 200');
      assert.equal(SB.history.all()[199].id, 'r201');
      SB.history.clear();
      assert.equal(SB.history.all().length, 0);
    });
  });

  SBT.describe('Sugerencias', function () {
    SBT.it('priorizan los objetivos que hace más tiempo que no se entrenan', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB, { lastDuration: 30, lastLevel: 'basico' });
      SB.library.applyPreset('golpes');
      const goals = SB.session.availableGoals('basico').filter(function (g) { return g.available; }).map(function (g) { return g.goal.id; });
      // Entrena todos los disponibles menos uno en días distintos (el primero hace más tiempo).
      const never = goals[goals.length - 1];
      goals.slice(0, -1).forEach(function (gid, i) {
        SB.history.record({ id: 'g' + i, date: new Date(2026, 9, 1 + i).toISOString(), dayKey: '', goalId: gid, level: 'basico', durationMin: 30, plannedSec: 1, completedSec: 1, activeSec: 400, completed: true, combos: [], movements: {}, hiit: [], hiitStart: null, focuses: [], fingerprint: [] });
      });
      const list = SB.suggestions.list({ count: 3, seed: 1, now: new Date(2026, 9, 30) });
      assert.equal(list.length, Math.min(3, goals.length));
      assert.equal(list[0].goalId, never, 'primero el nunca entrenado');
      if (goals.length > 2) assert.equal(list[1].goalId, goals[0], 'después el más antiguo');
      assert.equal(list[0].durationMin, 30, 'duración habitual');
      list.forEach(function (x) {
        assert.ok(x.reasons.length > 0 && x.title && x.level === 'basico', 'motivos y título');
        assert.ok(goals.indexOf(x.goalId) !== -1, 'solo objetivos disponibles');
      });
      assert.ok(!list.some(function (x) { return x.goalId === 'defensa'; }), 'defensa no disponible con el preset golpes');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
