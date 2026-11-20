/**
 * SOMBRA · tests/specs/01-core.test.js
 * util, storage (export / import / reinicio / migración) y notación.  [área 10]
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  SBT.describe('Utilidades', function () {
    SBT.it('rng determinista y helpers', function (env, assert) {
      const U = env.SB.util;
      const a = U.rng(42), b = U.rng(42), c = U.rng('42x');
      const sa = [a.next(), a.next(), a.next()];
      assert.deepEqual(sa, [b.next(), b.next(), b.next()], 'misma semilla, misma secuencia');
      assert.notEqual(sa[0], c.next(), 'semilla distinta');
      const r = U.rng(7);
      for (let i = 0; i < 200; i++) {
        const v = r.int(2, 5);
        assert.ok(v >= 2 && v <= 5 && Number.isInteger(v), 'int en rango');
      }
      assert.equal(r.weighted([{ w: 0 }, { w: 0 }], function (x) { return x.w; }), null, 'sin pesos → null');
      const counts = { a: 0, b: 0 };
      for (let i = 0; i < 2000; i++) counts[r.weighted([{ k: 'a', w: 3 }, { k: 'b', w: 1 }], function (x) { return x.w; }).k]++;
      assert.ok(counts.a > counts.b * 2, 'ponderación respetada ' + JSON.stringify(counts));
      const arr = [1, 2, 3, 4, 5];
      const sh = r.shuffle(arr);
      assert.deepEqual(arr, [1, 2, 3, 4, 5], 'shuffle no muta');
      assert.deepEqual(sh.slice().sort(), [1, 2, 3, 4, 5], 'shuffle conserva elementos');
    });

    SBT.it('fechas, tiempo y Jaccard', function (env, assert) {
      const U = env.SB.util;
      assert.equal(U.dayKey(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
      assert.equal(U.addDays('2025-12-31', 1), '2026-01-01');
      assert.equal(U.addDays('2024-03-01', -1), '2024-02-29');
      assert.equal(U.daysBetween('2025-12-30', '2026-01-02'), 3);
      assert.equal(U.fmtTime(65), '1:05');
      assert.equal(U.fmtTime(0), '0:00');
      assert.equal(U.fmtTime(59.2), '1:00');
      assert.closeTo(U.jaccard(['a', 'b'], ['b', 'c']), 1 / 3, 1e-9);
      assert.equal(U.jaccard([], []), 0);
      assert.equal(U.clamp(9, 0, 5), 5);
      assert.deepEqual(U.deepClone({ a: [1, { b: 2 }] }), { a: [1, { b: 2 }] });
    });
  });

  SBT.describe('Almacenamiento (área 10)', function () {
    SBT.it('get/set/remove con prefijo sb. y valores por defecto', function (env, assert) {
      const SB = env.fresh();
      assert.equal(SB.storage.get('nada', 'x'), 'x');
      SB.storage.set('settings', { stance: 'zurdo' });
      assert.equal(env.rawStorage().getItem('sb.settings'), '{"stance":"zurdo"}');
      assert.equal(SB.storage.getSettings().stance, 'zurdo');
      assert.equal(SB.storage.getSettings().restSec, 30, 'valor por defecto §8.2');
      SB.storage.remove('settings');
      assert.equal(SB.storage.get('settings', null), null);
      assert.equal(SB.storage.get('schema'), SB.storage.SCHEMA_VERSION);
    });

    SBT.it('exportar → reiniciar → importar sin pérdida de datos', async function (env, assert) {
      const SB = env.fresh();
      SB.library.applyPreset('golpes_defensa');
      const cid = SB.library.addCustom({ name: 'Golpe propio', short: 'PROPIO', category: 'golpe', side: 'rear', target: 'cabeza', status: 'practica' });
      SB.library.combos.addPersonal({ seq: ['jab', 'cross'], name: 'Mío', status: 'dominado' });
      SB.calendar.mark('2026-10-01');
      SB.storage.set('settings', { stance: 'zurdo', restSec: 20 });
      SB.storage.set('hiitPrefs', { disabled: ['burpee'] });
      SB.storage.set('onboarded', true);
      const s = SB.session.generate({ durationMin: 20, level: 'basico', goalId: 'completo', seed: 1 });
      SB.history.record(SB.session.toRecord(s, { completed: true }));
      const before = SB.storage.exportAll();
      const text = JSON.stringify(before);

      SB.storage.resetAll();
      assert.equal(SB.library.personal().length, 0, 'biblioteca vacía tras reiniciar');
      assert.equal(SB.calendar.days().length, 0, 'calendario vacío tras reiniciar');
      assert.equal(SB.history.all().length, 0, 'historial vacío tras reiniciar');

      const res = SB.storage.importAll(text);
      assert.ok(res.ok, 'importación correcta');
      const after = SB.storage.exportAll();
      assert.deepEqual(after.data, before.data, 'mismos datos tras importar');
      assert.equal(SB.library.statusOf(cid), 'practica');
      assert.ok(SB.calendar.isMarked('2026-10-01'));

      // Recargar la app (nuevo contexto, mismo almacenamiento): todo sigue ahí.
      const SB2 = await env.reload();
      assert.deepEqual(SB2.storage.exportAll().data, before.data, 'datos intactos tras recargar');
      assert.equal(SB2.library.get(cid).name, 'Golpe propio');
      assert.equal(SB2.history.all().length, 1);
    });

    SBT.it('importación no válida: lanza error y no toca los datos', function (env, assert) {
      const SB = env.fresh();
      SB.library.applyPreset('golpes');
      const before = SB.storage.exportAll().data;
      assert.throws(function () { SB.storage.importAll('{no es json'); }, 'JSON dañado');
      assert.throws(function () { SB.storage.importAll({ foo: 1 }); }, 'sin claves de SOMBRA');
      assert.throws(function () { SB.storage.importAll(null); }, 'null');
      assert.deepEqual(SB.storage.exportAll().data, before, 'datos intactos');
    });

    SBT.it('migración de datos sin versión de esquema', async function (env, assert) {
      const SB = env.fresh();
      const raw = env.rawStorage();
      raw.removeItem('sb.schema');
      raw.setItem('sb.library', JSON.stringify(['jab', 'cross']));
      raw.setItem('sb.calendar', JSON.stringify(['2026-01-02']));
      const SB2 = await env.reload();
      assert.equal(SB2.storage.get('schema'), SB2.storage.SCHEMA_VERSION, 'esquema actualizado');
      assert.equal(SB2.library.statusOf('jab'), 'aprendido', 'biblioteca migrada');
      assert.ok(SB2.calendar.isMarked('2026-01-02'), 'calendario migrado');
      // Importar una copia antigua (sin schema) también migra.
      SB2.storage.importAll({ library: ['jab'], calendar: ['2026-02-02'] });
      assert.equal(SB2.library.statusOf('jab'), 'aprendido');
      assert.equal(SB2.library.statusOf('cross'), null, 'la importación sustituye');
      assert.ok(SB2.calendar.isMarked('2026-02-02'));
      SB.storage.resetAll();
    });

    SBT.it('sin localStorage: funciona en memoria', function (env, assert) {
      // Prueba de MemoryStorage directamente (el módulo cae a ella si localStorage falla).
      const M = new env.SB.storage.MemoryStorage();
      M.setItem('sb.a', '1');
      assert.equal(M.getItem('sb.a'), '1');
      assert.equal(M.length, 1);
      assert.equal(M.key(0), 'sb.a');
      M.removeItem('sb.a');
      assert.equal(M.getItem('sb.a'), null);
    });
  });

  SBT.describe('Notación', function () {
    SBT.it('fichas y texto según la guardia', function (env, assert) {
      const SB = env.fresh();
      const seq = ['jab', 'cross_body', 'slip_rear', 'cross'];
      const tk = SB.notation.tokens(seq, { stance: 'diestro' });
      assert.equal(tk[0].label, '1');
      assert.equal(tk[1].label, '2');
      assert.equal(tk[1].sub, 'CUERPO');
      assert.ok(tk[1].body);
      assert.equal(tk[2].kind, 'defensa');
      assert.equal(tk[2].sub, 'der', 'slip atrasado en diestro = der');
      assert.equal(SB.notation.tokens(['slip_rear'], { stance: 'zurdo' })[0].sub, 'izq', 'zurdo refleja');
      const txt = SB.notation.text(seq, { stance: 'diestro' });
      assert.ok(/^1 - 2 cuerpo · .+ der · 2$/.test(txt), 'texto: ' + txt);
      assert.equal(SB.notation.signature(seq), 'jab>cross_body>slip_rear>cross');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
