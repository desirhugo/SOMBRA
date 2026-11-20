/**
 * SOMBRA · tests/specs/02-library.test.js
 * Biblioteca personal, presets, movimientos personalizados y combinaciones
 * personales (persistencia tras recargar y uso por el motor).  [área 7]
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  SBT.describe('Biblioteca personal', function () {
    SBT.it('vacía sin onboarding; presets', function (env, assert) {
      const SB = env.fresh();
      assert.equal(SB.library.personal().length, 0, 'sin preset la biblioteca está vacía');
      SB.library.applyPreset('golpes');
      ['jab', 'cross', 'lead_hook', 'rear_hook', 'lead_upper', 'rear_upper', 'step_in', 'step_back', 'guard'].forEach(function (id) {
        assert.equal(SB.library.statusOf(id), 'dominado', 'golpes: ' + id);
      });
      assert.equal(SB.library.statusOf('slip_lead'), null);
      SB.library.applyPreset('golpes_defensa');
      ['jab_body', 'cross_body', 'lead_hook_body', 'block_high', 'parry_jab', 'slip_lead', 'slip_rear', 'lateral_lead', 'lateral_rear', 'distance_reset'].forEach(function (id) {
        const st = SB.library.statusOf(id);
        assert.ok(st === 'practica' || st === 'aprendido', 'golpes_defensa: ' + id + ' = ' + st);
      });
      assert.equal(SB.library.statusOf('jab'), 'dominado');
      SB.library.applyPreset('completo');
      SB.library.catalog().filter(function (m) { return !m.custom; }).forEach(function (m) {
        assert.equal(SB.library.statusOf(m.id), m.level === 'avanzado' ? 'practica' : 'dominado', 'completo: ' + m.id);
      });
      assert.equal(SB.library.applyPreset('nada'), -1);
    });

    SBT.it('add / setStatus / remove / isAvailable / eligibleAtLevel', function (env, assert) {
      const SB = env.fresh();
      assert.ok(SB.library.add('jab'));
      assert.equal(SB.library.statusOf('jab'), 'aprendido');
      assert.ok(SB.library.personal()[0].addedAt, 'addedAt');
      SB.library.setStatus('jab', 'dominado');
      assert.equal(SB.library.statusOf('jab'), 'dominado');
      assert.ok(!SB.library.add('no_existe'));
      assert.ok(SB.library.isAvailable(['jab', 'jab']));
      assert.ok(!SB.library.isAvailable(['jab', 'cross']));
      SB.library.add('rear_hook', 'practica');
      assert.ok(!SB.library.eligibleAtLevel('rear_hook', 'basico'), 'avanzado no dominado no se usa en básico');
      assert.ok(SB.library.eligibleAtLevel('rear_hook', 'avanzado'));
      SB.library.setStatus('rear_hook', 'dominado');
      assert.ok(SB.library.eligibleAtLevel('rear_hook', 'basico'), 'avanzado dominado sí en básico');
      SB.library.remove('jab');
      assert.equal(SB.library.statusOf('jab'), null);
    });

    SBT.it('editar el catálogo y restaurar', function (env, assert) {
      const SB = env.fresh();
      const orig = SB.library.get('jab').name;
      SB.library.editCatalog('jab', { name: 'Mi jab', level: 'avanzado', flow: { from: {} } });
      assert.equal(SB.library.get('jab').name, 'Mi jab');
      assert.equal(SB.library.get('jab').level, 'avanzado');
      assert.ok(SB.library.get('jab').flow.from.N >= 1, 'flow no editable');
      SB.library.editCatalog('jab', null);
      assert.equal(SB.library.get('jab').name, orig);
    });
  });

  SBT.describe('Personalizados y combinaciones personales (área 7)', function () {
    SBT.it('flow deducido según §8.4', function (env, assert) {
      const SB = env.fresh();
      const lead = SB.library.addCustom({ name: 'Gancho largo', category: 'golpe', side: 'lead', target: 'cabeza' });
      const rear = SB.library.addCustom({ name: 'Recto largo', category: 'golpe', side: 'atrasado', target: 'cuerpo' });
      const def = SB.library.addCustom({ name: 'Cubrirse', category: 'defensa', side: 'none' });
      const mov = SB.library.addCustom({ name: 'Paso en L', category: 'desplazamiento', side: 'none' });
      assert.deepEqual(SB.library.get(lead).flow.from, { N: 1, J: 1, LL: 2, RL: 0, LOW: 1 });
      assert.equal(SB.library.get(lead).flow.to, 'RL');
      assert.deepEqual(SB.library.get(rear).flow.from, { N: 1, J: 2, LL: 0, RL: 2, LOW: 1 });
      assert.equal(SB.library.get(rear).flow.to, 'LL');
      assert.equal(SB.library.get(rear).target, 'cuerpo');
      assert.deepEqual(SB.library.get(def).flow.from, { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 });
      assert.equal(SB.library.get(def).flow.mustBeFollowedBy, 'golpe');
      assert.equal(SB.library.get(def).flow.within, 2);
      assert.deepEqual(SB.library.get(mov).flow.from, { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 });
      assert.equal(SB.library.get(mov).flow.to, 'N');
      assert.equal(SB.library.statusOf(lead), 'aprendido', 'se añade a la biblioteca');
      SB.library.updateCustom(lead, { side: 'rear' });
      assert.equal(SB.library.get(lead).flow.to, 'LL', 'flow recalculado al cambiar el lado');
      assert.ok(SB.library.catalog().some(function (m) { return m.id === lead; }));
    });

    SBT.it('se guardan, persisten tras recargar y el motor los usa', async function (env, assert) {
      const SB = env.fresh();
      SBT.h.settings(SB);
      SB.library.applyPreset('golpes');
      const id = SB.library.addCustom({
        name: 'Gancho al hígado', short: 'HÍGADO', category: 'golpe', side: 'lead', target: 'cuerpo',
        description: 'Gancho corto al costado.', cues: 'Baja con las piernas\nCodo pegado', status: 'practica'
      });
      const seq = ['jab', 'cross', id];
      assert.ok(SB.grammar.validate(seq, { level: 'basico' }).ok, 'la combinación personal es válida');
      const pcId = SB.library.combos.addPersonal({ seq: seq, name: 'Mi uno-dos-hígado', status: 'practica', note: 'De clase' });
      assert.ok(pcId);
      assert.equal(SB.library.combos.addPersonal({ seq: ['jab', 'nada'] }), null, 'secuencia con id inexistente');

      const SB2 = await env.reload();
      const m = SB2.library.get(id);
      assert.ok(m, 'el personalizado persiste');
      assert.equal(m.short, 'HÍGADO');
      assert.deepEqual(m.cues, ['Baja con las piernas', 'Codo pegado']);
      assert.equal(SB2.library.statusOf(id), 'practica');
      const pc = SB2.library.combos.personal().find(function (c) { return c.id === pcId; });
      assert.ok(pc, 'la combinación personal persiste');
      assert.deepEqual(pc.seq, seq);
      assert.equal(SB2.notation.tokens([id])[0].label, 'HÍGADO');

      let usedCustom = 0, usedPersonal = 0;
      for (let i = 0; i < 4; i++) {
        const s = SB2.session.generate({ durationMin: 30, level: 'basico', goalId: 'completo', seed: 'p7-' + i, custom: { focusMovementIds: [id] } });
        SBT.h.combos(s).forEach(function (x) {
          if (x.c.seq.indexOf(id) !== -1) usedCustom++;
          if (x.c.source === 'personal' && x.c.refId === pcId) usedPersonal++;
          assert.ok(SB2.grammar.validate(x.c.seq, { level: 'basico' }).ok, 'válida: ' + x.c.signature);
        });
      }
      SBT.info('apariciones del personalizado: ' + usedCustom + ' · de la combinación personal: ' + usedPersonal + ' (4 sesiones de 30 min)');
      assert.ok(usedCustom > 0, 'el motor usa el movimiento personalizado');
      assert.ok(usedPersonal > 0, 'el motor usa la combinación personal');

      // Borrar el personalizado elimina las combinaciones que lo usan.
      SB2.library.deleteCustom(id);
      assert.equal(SB2.library.get(id), null);
      assert.ok(!SB2.library.combos.personal().some(function (c) { return c.id === pcId; }));
      SB.storage.resetAll();
    });

    SBT.it('actualizar y borrar combinaciones personales', function (env, assert) {
      const SB = env.fresh();
      const id = SB.library.combos.addPersonal({ seq: ['jab', 'cross'] });
      assert.ok(SB.library.combos.personal()[0].name.length > 0, 'nombre por defecto');
      assert.ok(SB.library.combos.updatePersonal(id, { status: 'dominado', name: 'X' }));
      assert.equal(SB.library.combos.personal()[0].status, 'dominado');
      assert.ok(SB.library.combos.removePersonal(id));
      assert.equal(SB.library.combos.personal().length, 0);
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
