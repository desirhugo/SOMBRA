/**
 * SOMBRA · tests/specs/07-calendar.test.js
 * Calendario: marcar, toggle, rachas, cambio de mes y de año, cuadrícula con lunes primero.  [área 9]
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  SBT.describe('Calendario (área 9)', function () {
    SBT.it('marcar, toggle, isMarked y days', function (env, assert) {
      const SB = env.fresh();
      const C = SB.calendar;
      assert.equal(C.days().length, 0);
      const today = C.mark();
      assert.equal(today, SB.util.dayKey(), 'mark() sin argumento marca hoy');
      assert.ok(C.isMarked(today));
      C.mark('2026-03-05');
      C.mark('2026-03-05');
      assert.equal(C.days().filter(function (d) { return d === '2026-03-05'; }).length, 1, 'sin duplicados');
      assert.equal(C.toggle('2026-03-05'), false, 'toggle desmarca');
      assert.ok(!C.isMarked('2026-03-05'));
      assert.equal(C.toggle('2026-03-05'), true, 'toggle marca');
      assert.deepEqual(C.days(), ['2026-03-05', today].sort(), 'ordenados');
    });

    SBT.it('racha actual (incluido «hoy sin marcar, ayer sí») con cambio de mes y de año', function (env, assert) {
      const SB = env.fresh();
      const C = SB.calendar;
      ['2025-12-30', '2025-12-31', '2026-01-01', '2026-01-02'].forEach(C.mark);
      assert.equal(C.currentStreak('2026-01-02'), 4, 'termina hoy, cruza el año');
      assert.equal(C.currentStreak('2026-01-03'), 4, 'hoy sin marcar, ayer sí');
      assert.equal(C.currentStreak('2026-01-04'), 0, 'ni hoy ni ayer');
      assert.equal(C.currentStreak('2025-12-31'), 2);
      ['2026-02-27', '2026-02-28', '2026-03-01'].forEach(C.mark);
      assert.equal(C.currentStreak('2026-03-01'), 3, 'cruza el cambio de mes (febrero de 28 días)');
      assert.equal(C.currentStreak('2026-03-02'), 3, 'ayer sí');
    });

    SBT.it('mejor racha', function (env, assert) {
      const SB = env.fresh();
      const C = SB.calendar;
      assert.equal(C.bestStreak(), 0);
      ['2026-04-01', '2026-04-02', '2026-04-04'].forEach(C.mark);
      assert.equal(C.bestStreak(), 2);
      ['2026-05-29', '2026-05-30', '2026-05-31', '2026-06-01', '2026-06-02'].forEach(C.mark);
      assert.equal(C.bestStreak(), 5, 'cruza el mes');
      C.toggle('2026-05-31');
      assert.equal(C.bestStreak(), 2, 'al desmarcar se recalcula');
    });

    SBT.it('cuadrícula del mes: lunes primero, semanas completas', function (env, assert) {
      const SB = env.fresh();
      const C = SB.calendar;
      C.mark('2026-02-14');
      C.mark('2026-01-30');
      function check(year, m, firstKey, lastKey, inMonthDays) {
        const g = C.monthGrid(year, m, '2026-02-14');
        g.forEach(function (w) {
          assert.equal(w.length, 7, 'semanas de 7 días');
          assert.equal(SB.util.parseDayKey(w[0].key).getDay(), 1, 'la semana empieza en lunes (' + w[0].key + ')');
        });
        assert.equal(g[0][0].key, firstKey, 'primer día de la cuadrícula');
        const last = g[g.length - 1][6];
        assert.equal(last.key, lastKey, 'último día de la cuadrícula');
        const inMonth = [].concat.apply([], g).filter(function (d) { return d.inMonth; });
        assert.equal(inMonth.length, inMonthDays, 'días del mes');
        assert.equal(inMonth[0].day, 1);
        return g;
      }
      const feb = check(2026, 1, '2026-01-26', '2026-03-01', 28);
      const cells = [].concat.apply([], feb);
      assert.ok(cells.find(function (d) { return d.key === '2026-02-14'; }).marked, 'marcado');
      assert.ok(cells.find(function (d) { return d.key === '2026-02-14'; }).isToday, 'hoy');
      assert.ok(cells.find(function (d) { return d.key === '2026-01-30'; }).marked && !cells.find(function (d) { return d.key === '2026-01-30'; }).inMonth, 'día de otro mes marcado');
      check(2025, 11, '2025-12-01', '2026-01-04', 31);   // diciembre → enero (cambio de año)
      check(2026, 0, '2025-12-29', '2026-02-01', 31);    // enero empieza en jueves
      check(2024, 1, '2024-01-29', '2024-03-03', 29);    // bisiesto
    });

    SBT.it('persiste tras recargar', async function (env, assert) {
      const SB = env.fresh();
      SB.calendar.mark('2026-07-07');
      const SB2 = await env.reload();
      assert.ok(SB2.calendar.isMarked('2026-07-07'));
      SB.storage.resetAll();
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
