/**
 * SOMBRA · tests/specs/06-player.test.js
 * Timer sin deriva y Player: tiempos, countdown, skip/back, pausa, finish, activeSec.  [área 8]
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  /** Sesión sintética: total 100 s (boxeo 40 s + HIIT 35 s = 75 s activos). */
  function synthetic() {
    const tl = [
      { type: 'prepare', start: 0, duration: 5, label: 'Preparación', next: { type: 'boxing', title: 'Ronda 1', detail: '1' } },
      { type: 'boxing', start: 5, duration: 20, round: 1, roundsTotal: 2, interval: 1, intervalsTotal: 1, mode: 'variacion', combos: [
        { seq: ['jab'], signature: 'jab', start: 0, duration: 10 }, { seq: ['cross'], signature: 'cross', start: 10, duration: 10 }] },
      { type: 'transition', start: 25, duration: 5, label: 'Prepárate', next: { type: 'hiit', title: 'Flexiones' } },
      { type: 'hiit', start: 30, duration: 20, category: 'fuerza', exercise: { id: 'push' } },
      { type: 'rest', start: 50, duration: 10, label: 'Descanso', next: { type: 'boxing', title: 'Ronda 2' } },
      { type: 'boxing', start: 60, duration: 20, round: 2, roundsTotal: 2, interval: 1, intervalsTotal: 1, mode: 'repeticion', combos: [
        { seq: ['jab', 'cross'], signature: 'jab>cross', start: 0, duration: 20 }] },
      { type: 'transition', start: 80, duration: 5, label: 'Prepárate', next: { type: 'hiit', title: 'Saltos' } },
      { type: 'hiit', start: 85, duration: 15, category: 'cardio', exercise: { id: 'jacks' } }
    ];
    return { id: 'syn', totalSec: 100, timeline: tl };
  }

  function rig(SB, opts) {
    const clock = { ms: 0 };
    const p = new SB.Player(synthetic(), Object.assign({ now: function () { return clock.ms; } }, opts || {}));
    const ev = [];
    ['segment', 'combo', 'countdown', 'finish', 'pause', 'resume'].forEach(function (name) {
      p.on(name, function (a) {
        ev.push({ name: name, t: clock.ms / 1000, v: name === 'segment' ? a.type : (name === 'combo' ? a.signature : (name === 'countdown' ? a : null)) });
      });
    });
    const at = function (sec) { clock.ms = sec * 1000; return p.update(); };
    return { p: p, clock: clock, ev: ev, at: at };
  }

  SBT.describe('Timer', function () {
    SBT.it('sin deriva, pausa, velocidad y seek', function (env, assert) {
      let ms = 1000;
      const t = new env.SB.Timer({ now: function () { return ms; } });
      assert.ok(!t.running);
      t.start();
      for (let i = 0; i < 1000; i++) ms += 16.7 + (i % 7); // fotogramas irregulares
      assert.closeTo(t.elapsed(), (ms - 1000) / 1000, 1e-9, 'tiempo exacto por marcas');
      t.pause();
      const e = t.elapsed();
      ms += 50000;
      assert.equal(t.elapsed(), e, 'en pausa no avanza');
      t.resume();
      ms += 2000;
      assert.closeTo(t.elapsed(), e + 2, 1e-9);
      const f = new env.SB.Timer({ now: function () { return ms; }, speed: 4 });
      f.start();
      ms += 1000;
      assert.closeTo(f.elapsed(), 4, 1e-9, 'velocidad x4');
      f.seek(10);
      ms += 500;
      assert.closeTo(f.elapsed(), 12, 1e-9, 'seek');
    });
  });

  SBT.describe('Player (área 8)', function () {
    SBT.it('eventos, tiempos, countdown y finish recorriendo la sesión', function (env, assert) {
      const r = rig(env.SB);
      r.p.start();
      for (let t = 0; t <= 101; t += 0.25) r.at(t);
      const segs = r.ev.filter(function (e) { return e.name === 'segment'; });
      assert.deepEqual(segs.map(function (e) { return e.v; }), ['prepare', 'boxing', 'transition', 'hiit', 'rest', 'boxing', 'transition', 'hiit'], 'un evento por segmento');
      assert.deepEqual(segs.map(function (e) { return e.t; }), [0, 5, 25, 30, 50, 60, 80, 85], 'en su instante');
      const combos = r.ev.filter(function (e) { return e.name === 'combo'; });
      assert.deepEqual(combos.map(function (e) { return e.v; }), ['jab', 'cross', 'jab>cross']);
      assert.deepEqual(combos.map(function (e) { return e.t; }), [5, 15, 60]);
      const cd = r.ev.filter(function (e) { return e.name === 'countdown'; });
      assert.deepEqual(cd.map(function (e) { return e.v; }), [3, 2, 1, 3, 2, 1], 'cuenta atrás en preparación y descanso antes de ronda (no antes del HIIT)');
      assert.deepEqual(cd.map(function (e) { return e.t; }), [2, 3, 4, 57, 58, 59]);
      const fin = r.ev.filter(function (e) { return e.name === 'finish'; });
      assert.equal(fin.length, 1, 'finish una vez');
      assert.equal(fin[0].t, 100);
      const st = r.p.getState();
      assert.ok(st.finished);
      assert.equal(st.totalRemaining, 0);
      assert.closeTo(st.activeSec, 75, 1e-6, 'activeSec = boxeo + HIIT');
    });

    SBT.it('getState: segmento, combinación, siguiente y cuenta atrás', function (env, assert) {
      const r = rig(env.SB);
      r.p.start();
      let st = r.at(2.5);
      assert.equal(st.segIndex, 0);
      assert.equal(st.countdown, 3);
      assert.equal(st.nextCombo.signature, 'jab', 'siguiente combinación desde la preparación');
      st = r.at(12);
      assert.equal(st.segment.type, 'boxing');
      assert.equal(st.combo.signature, 'jab');
      assert.equal(st.comboIndex, 0);
      assert.closeTo(st.comboRemaining, 3, 1e-9);
      assert.equal(st.nextCombo.signature, 'cross');
      assert.closeTo(st.segRemaining, 13, 1e-9);
      assert.closeTo(st.segElapsed, 7, 1e-9);
      assert.closeTo(st.totalElapsed, 12, 1e-9);
      assert.closeTo(st.totalRemaining, 88, 1e-9);
      assert.equal(st.countdown, null);
      st = r.at(27);
      assert.equal(st.segment.type, 'transition');
      assert.equal(st.countdown, null, 'sin cuenta atrás antes del HIIT');
      assert.equal(st.nextCombo.signature, 'jab>cross');
    });

    SBT.it('pausa: el tiempo no avanza; reanudar continúa', function (env, assert) {
      const r = rig(env.SB);
      r.p.start();
      r.at(10);
      r.p.pause();
      assert.ok(r.p.getState().paused);
      let st = r.at(60);
      assert.closeTo(st.totalElapsed, 10, 1e-9, 'pausado no avanza');
      assert.closeTo(st.activeSec, 5, 1e-9, 'activeSec no avanza en pausa');
      r.p.resume();
      st = r.at(65);
      assert.closeTo(st.totalElapsed, 15, 1e-9);
      assert.ok(!st.paused);
      r.p.toggle();
      assert.ok(r.p.getState().paused, 'toggle pausa');
      r.p.toggle();
      assert.ok(!r.p.getState().paused, 'toggle reanuda');
      assert.deepEqual(r.ev.filter(function (e) { return e.name === 'pause' || e.name === 'resume'; }).map(function (e) { return e.name; }), ['pause', 'resume', 'pause', 'resume']);
    });

    SBT.it('skip y back; activeSec no cuenta lo saltado', function (env, assert) {
      const r = rig(env.SB);
      r.p.start();
      r.at(12);
      let st = r.p.skip();
      assert.equal(st.segment.type, 'transition', 'skip → siguiente segmento');
      assert.closeTo(st.totalElapsed, 25, 1e-9);
      assert.closeTo(st.activeSec, 7, 1e-9, 'solo 7 s de boxeo reales');
      r.at(13); // +1 s real dentro de la transición
      st = r.p.back();
      assert.equal(st.segment.type, 'boxing', 'back a los ≤2 s → segmento anterior');
      assert.closeTo(st.totalElapsed, 5, 1e-9);
      r.at(21); // 8 s dentro del boxeo
      st = r.p.back();
      assert.closeTo(st.totalElapsed, 5, 1e-9, 'back tras >2 s → reinicia el segmento');
      assert.closeTo(st.activeSec, 15, 1e-9, 'lo repetido cuenta como trabajo');
      const segEvents = r.ev.filter(function (e) { return e.name === 'segment'; }).map(function (e) { return e.v; });
      assert.deepEqual(segEvents, ['prepare', 'boxing', 'transition', 'boxing', 'boxing'], 'segment se emite tras cada salto');
      // Saltar hasta el final
      for (let i = 0; i < 10; i++) r.p.skip();
      st = r.p.getState();
      assert.ok(st.finished, 'skip desde el último termina');
      assert.equal(r.ev.filter(function (e) { return e.name === 'finish'; }).length, 1);
      r.p.skip();
      assert.equal(r.ev.filter(function (e) { return e.name === 'finish'; }).length, 1, 'finish no se repite');
    });

    SBT.it('stop y velocidad', function (env, assert) {
      const r = rig(env.SB, { speed: 5 });
      r.p.start();
      let st = r.at(10);
      assert.closeTo(st.totalElapsed, 50, 1e-9, 'speed x5');
      r.p.stop();
      st = r.at(20);
      assert.closeTo(st.totalElapsed, 50, 1e-9, 'detenido');
      assert.ok(st.stopped && !st.finished);
    });

    SBT.it('reproduce una sesión generada hasta el final', function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.applyPreset('golpes_defensa');
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'completo', seed: 'play' });
      let ms = 0;
      const p = new SB.Player(s, { now: function () { return ms; }, speed: 1 });
      let segs = 0, combos = 0, countdowns = 0, finished = 0;
      p.on('segment', function () { segs++; });
      p.on('combo', function () { combos++; });
      p.on('countdown', function () { countdowns++; });
      p.on('finish', function () { finished++; });
      p.start();
      while (!p.getState().finished && ms < (s.totalSec + 10) * 1000) { ms += 250; p.update(); }
      const expectedActive = s.timeline.filter(function (x) { return x.type === 'boxing' || x.type === 'hiit'; }).reduce(function (a, x) { return a + x.duration; }, 0);
      const expectedCombos = SBT.h.combos(s).length;
      assert.equal(finished, 1);
      assert.equal(segs, s.timeline.length, 'un evento por segmento');
      assert.equal(combos, expectedCombos, 'un evento por combinación');
      // La cuenta atrás solo precede a una ronda de boxeo (el descanso antes del abdomen no la lleva).
      assert.equal(countdowns, 3 * (1 + SBT.h.segs(s, 'rest').filter(function (r) { return !r.finisher; }).length), '3-2-1 en preparación y en cada descanso');
      assert.closeTo(p.getState().activeSec, expectedActive, 1e-6);
      const rec = SB.session.toRecord(s, { completed: true, activeSec: p.getState().activeSec, completedSec: s.totalSec });
      assert.ok(SB.history.record(rec));
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
