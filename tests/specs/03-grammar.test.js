/**
 * SOMBRA · tests/specs/03-grammar.test.js
 * Gramática (§5), integridad de los datos, combinaciones curadas y generador.
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;
  const TAGS = ['fundamental', 'ofensiva', 'velocidad', 'potencia', 'defensa', 'contra', 'desplazamiento', 'angulo', 'niveles', 'finta', 'ritmo', 'entrada', 'salida'];

  function v(SB, seq, level) { return SB.grammar.validate(seq, { level: level || 'avanzado' }); }

  SBT.describe('Gramática', function () {
    SBT.it('transiciones, estados y repeatWith', function (env, assert) {
      const SB = env.fresh();
      const G = SB.grammar;
      assert.deepEqual(G.STATES, ['N', 'J', 'LL', 'RL', 'LOW']);
      assert.equal(G.nextState('N', SB.library.get('jab')), 'J');
      assert.equal(G.nextState('RL', SB.library.get('rhythm_break')), 'RL', 'keep conserva el estado');
      assert.equal(G.nextState('RL', SB.library.get('lateral_lead')), 'N', 'lateral reinicia la guardia (aclaración 30-oct)');
      assert.equal(G.transitionScore(null, 'RL', SB.library.get('jab')), 0);
      assert.equal(G.transitionScore(null, 'RL', SB.library.get('lead_hook')), 0);
      assert.equal(G.transitionScore('lead_hook_body', 'RL', SB.library.get('lead_hook')), 1, 'repeatWith');
      const ok = v(SB, ['jab', 'cross']);
      assert.ok(ok.ok, ok.errors.join(' '));
      assert.equal(ok.score, 2);
      assert.equal(ok.complexity, 1);
      assert.ok(!v(SB, ['cross', 'cross']).ok, '2-2: misma mano sin recarga');
      assert.ok(!v(SB, ['jab', 'cross', 'lead_hook', 'jab']).ok, 'jab desde RL');
      const rw = v(SB, ['lead_hook_body', 'lead_hook']);
      assert.ok(rw.ok, 'doble gancho abajo-arriba');
      assert.equal(rw.score, 1, 'repeatWith cuenta como 1 en la media');
    });

    SBT.it('reglas globales 1-8', function (env, assert) {
      const SB = env.fresh();
      assert.ok(!v(SB, []).ok, 'vacía');
      assert.ok(!v(SB, ['jab', 'xx']).ok, 'id desconocido');
      assert.ok(!v(SB, ['guard', 'jab']).ok, 'base');
      assert.ok(!v(SB, ['jab', 'slip_rear']).ok, 'termina en defensa');
      assert.ok(!v(SB, ['slip_rear', 'slip_lead', 'step_back', 'cross']).ok, 'defensa sin golpe en ≤2');
      assert.ok(v(SB, ['jab', 'cross', 'slip_rear', 'slip_lead', 'lead_hook', 'cross']).ok, 'dos defensas y golpe en ≤2');
      assert.ok(!v(SB, ['feint_jab', 'step_in', 'jab']).ok, 'finta seguida de golpe inmediato');
      assert.ok(!v(SB, ['jab', 'rhythm_break', 'step_back', 'cross']).ok, 'pausa seguida de golpe inmediato');
      assert.ok(!v(SB, ['rhythm_break', 'jab']).ok, 'pausa no al principio');
      assert.ok(!v(SB, ['jab', 'cross', 'step_in']).ok, 'paso adelante no al final');
      assert.ok(!v(SB, ['pivot', 'jab']).ok, 'pivote no al principio');
      assert.ok(v(SB, ['jab', 'jab', 'jab', 'cross']).ok, '3 jabs');
      assert.ok(!v(SB, ['jab', 'jab', 'jab_body', 'jab']).ok, '4 jabs (el jab al cuerpo cuenta)');
      assert.ok(!v(SB, ['jab', 'rhythm_break', 'rhythm_break', 'cross']).ok, 'dos pausas');
      assert.ok(!v(SB, ['step_back']).ok, 'sin golpe');
      assert.ok(!v(SB, ['step_in', 'step_back', 'lateral_lead', 'jab']).ok, '3 desplazamientos seguidos');
      // Límites por nivel
      assert.ok(!v(SB, ['jab', 'jab', 'cross', 'lead_hook', 'cross'], 'basico').ok, 'básico ≤4 golpes');
      assert.ok(v(SB, ['jab', 'jab', 'cross', 'lead_hook', 'cross'], 'avanzado').ok, 'avanzado 5 golpes');
      assert.ok(!v(SB, ['jab', 'cross', 'slip_rear', 'slip_lead', 'lead_hook', 'cross'], 'basico').ok, 'básico ≤1 defensa');
      assert.ok(!v(SB, ['step_in', 'jab', 'cross', 'lead_hook', 'step_back'], 'basico').ok, 'básico ≤1 desplazamiento');
      assert.ok(!v(SB, ['jab', 'jab', 'cross', 'lead_hook', 'cross', 'lead_hook', 'cross', 'lead_hook', 'cross'], 'avanzado').ok, 'avanzado ≤8 elementos');
      const e = v(SB, ['jab', 'slip_rear']);
      assert.ok(e.errors.length > 0 && typeof e.errors[0] === 'string', 'mensajes de error');
    });

    SBT.it('complejidad según la fórmula', function (env, assert) {
      const SB = env.fresh();
      const C = SB.grammar.complexity;
      assert.equal(C(['jab']), 1);
      assert.equal(C(['jab', 'cross', 'lead_hook']), 1.5);
      assert.equal(C(['jab', 'cross_body', 'lead_hook']), 2.5, '2 cambios de nivel');
      assert.equal(C(['jab', 'cross', 'slip_rear', 'cross']), 2.5, '2 categorías');
      // Cambio de nivel solo entre golpes contiguos.
      const mv = function (ids) { return ids.map(SB.library.get); };
      assert.equal(SB.grammar.levelChanges(mv(['jab_body', 'parry_jab', 'lead_hook'])), 0);
      assert.equal(SB.grammar.levelChanges(mv(['jab_body', 'lead_hook', 'cross_body'])), 2);
      assert.equal(C(['lead_hook_body', 'lead_hook']), 1.5, 'cambio de nivel + media de transiciones < 1,75');
      const big = ['feint_jab', 'cross', 'roll_rear', 'cross', 'lead_hook', 'pivot', 'jab', 'cross'];
      assert.ok(v(SB, big).ok, v(SB, big).errors.join(' '));
      assert.ok(C(big) >= 4 && C(big) <= 5, 'compleja: ' + C(big));
      SBT.info('complejidad de ' + big.join('>') + ' = ' + C(big));
    });
  });

  SBT.describe('Datos', function () {
    SBT.it('movimientos, HIIT, objetivos y focos con el esquema de §4', function (env, assert) {
      const SB = env.fresh();
      const D = SB.data;
      const problems = [];
      const ids = new Set();
      D.movements.forEach(function (m) {
        if (ids.has(m.id)) problems.push('movimiento duplicado ' + m.id);
        ids.add(m.id);
        const f = m.flow || {};
        SB.grammar.STATES.forEach(function (st) { if (!(f.from && f.from[st] >= 0 && f.from[st] <= 2)) problems.push(m.id + ': flow.from.' + st); });
        if (['N', 'J', 'LL', 'RL', 'LOW', 'keep'].indexOf(f.to) === -1) problems.push(m.id + ': flow.to');
        if (['golpe', 'defensa', 'desplazamiento', 'finta', 'ritmo', 'base'].indexOf(m.category) === -1) problems.push(m.id + ': categoría');
        if (['basico', 'avanzado'].indexOf(m.level) === -1) problems.push(m.id + ': nivel');
        (f.repeatWith || []).forEach(function (r) { if (!D.movements.some(function (x) { return x.id === r; })) problems.push(m.id + ': repeatWith ' + r); });
      });
      ['guard', 'jab', 'cross', 'lead_hook', 'rear_hook', 'lead_upper', 'rear_upper', 'jab_body', 'cross_body', 'lead_hook_body',
        'block_high', 'parry_jab', 'slip_lead', 'slip_rear', 'step_in', 'step_back', 'lateral_lead', 'lateral_rear', 'distance_reset',
        'roll_lead', 'roll_rear', 'pull_back', 'duck', 'pivot', 'angle_step', 'feint_jab', 'feint_level', 'rhythm_break'].forEach(function (id) {
        if (!ids.has(id)) problems.push('falta el id ' + id);
      });
      const hids = new Set();
      D.hiit.forEach(function (h) {
        if (hids.has(h.id)) problems.push('HIIT duplicado ' + h.id);
        hids.add(h.id);
        if (['fuerza', 'cardio'].indexOf(h.category) === -1) problems.push(h.id + ': categoría HIIT');
        if ([1, 2, 3].indexOf(h.demand) === -1) problems.push(h.id + ': demand');
        if (['bajo', 'alto'].indexOf(h.impact) === -1) problems.push(h.id + ': impact');
        (h.requires || []).forEach(function (r) { if (!ids.has(r)) problems.push(h.id + ': requires ' + r); });
      });
      const fids = D.focuses.map(function (f) { return f.id; });
      D.focuses.forEach(function (f) {
        (f.templates || []).forEach(function (t) { if (!SB.comboGen.parseTemplate(t)) problems.push('foco ' + f.id + ': plantilla no válida ' + t); });
        (f.tagsAny || []).forEach(function (t) { if (TAGS.indexOf(t) === -1) problems.push('foco ' + f.id + ': etiqueta ' + t); });
      });
      D.goals.forEach(function (g) {
        Object.keys(g.focusWeights || {}).forEach(function (k) { if (fids.indexOf(k) === -1) problems.push('objetivo ' + g.id + ': foco ' + k); });
      });
      problems.forEach(function (p) { SBT.info(p); });
      SBT.info(D.movements.length + ' movimientos · ' + D.combinations.length + ' combinaciones · ' + D.hiit.length + ' HIIT · ' + D.goals.length + ' objetivos · ' + D.focuses.length + ' focos');
      assert.equal(problems.length, 0, 'problemas en los datos');
    });

    SBT.it('todas las combinaciones curadas pasan la gramática de su nivel', function (env, assert) {
      const SB = env.fresh();
      const bad = [];
      const sigs = new Map();
      const idsSeen = new Set();
      SB.data.combinations.forEach(function (c) {
        if (idsSeen.has(c.id)) bad.push(c.id + ': id duplicado');
        idsSeen.add(c.id);
        const sig = (c.seq || []).join('>');
        if (sigs.has(sig)) bad.push(c.id + ': misma secuencia que ' + sigs.get(sig));
        sigs.set(sig, c.id);
        const level = c.level === 'basico' ? 'basico' : 'avanzado';
        const r = SB.grammar.validate(c.seq, { level: level });
        if (!r.ok) bad.push(c.id + ' (' + level + '): ' + r.errors.join(' '));
        else if (level === 'basico' && r.complexity > 3) bad.push(c.id + ': complejidad ' + r.complexity + ' > 3 en básico');
        (c.tags || []).forEach(function (t) { if (TAGS.indexOf(t) === -1) bad.push(c.id + ': etiqueta no permitida ' + t); });
        if (level === 'basico') {
          (c.seq || []).forEach(function (id) { const m = SB.library.get(id); if (m && m.level === 'avanzado') bad.push(c.id + ': básico con movimiento avanzado ' + id); });
        }
      });
      const cx = SB.data.combinations.map(function (c) { return SB.grammar.complexity(c.seq); });
      SBT.info(SB.data.combinations.length + ' curadas · complejidad media ' + SBT.h.round(SBT.h.mean(cx), 2) + ' · rango ' + Math.min.apply(null, cx) + '–' + Math.max.apply(null, cx));
      bad.forEach(function (b) { SBT.info('NO PASA ' + b); });
      assert.equal(bad.length, 0, 'combinaciones curadas con problemas');
    });
  });

  SBT.describe('Generador de combinaciones', function () {
    SBT.it('genera combinaciones válidas para cada foco y nivel', function (env, assert) {
      const SB = env.fresh();
      SB.library.applyPreset('completo');
      const rng = SB.util.rng('gen');
      let made = 0, nulls = 0;
      ['basico', 'avanzado'].forEach(function (level) {
        SB.data.focuses.forEach(function (f) {
          for (let i = 0; i < 15; i++) {
            const target = level === 'basico' ? 1.5 + i / 15 : 2.5 + i / 10;
            const g = SB.comboGen.generate({ level: level, focusId: f.id, rng: rng, targetComplexity: target, maxComplexity: level === 'basico' ? 3 : 5 });
            if (!g) { nulls++; continue; }
            made++;
            const r = SB.grammar.validate(g.seq, { level: level });
            assert.ok(r.ok, f.id + '/' + level + ' ' + g.seq.join('>') + ': ' + r.errors.join(' '));
            assert.ok(g.complexity <= (level === 'basico' ? 3 : 5), 'tope de complejidad');
            g.seq.forEach(function (id) { assert.ok(SB.library.eligibleAtLevel(id, level), id + ' utilizable en ' + level); });
            if (g.source === 'curated') assert.ok(g.refId && SB.data.combinations.some(function (c) { return c.id === g.refId; }), 'metadatos curados');
          }
        });
      });
      SBT.info(made + ' generadas, ' + nulls + ' sin resultado');
      assert.ok(made > nulls * 4, 'el generador casi siempre encuentra combinación');
    });

    SBT.it('respeta avoid, weightOf y la biblioteca', function (env, assert) {
      const SB = env.fresh();
      SB.library.add('jab', 'dominado');
      SB.library.add('cross', 'dominado');
      SB.library.add('lead_hook', 'aprendido');
      const rng = SB.util.rng(3);
      for (let i = 0; i < 40; i++) {
        const g = SB.comboGen.generate({ level: 'basico', focusId: 'ataque', rng: rng, targetComplexity: 2, weightOf: function (id) { return id === 'lead_hook' ? 0 : 1; } });
        if (!g) continue;
        assert.ok(g.seq.indexOf('lead_hook') === -1, 'weightOf 0 excluye');
        g.seq.forEach(function (id) { assert.ok(['jab', 'cross'].indexOf(id) !== -1, 'solo biblioteca'); });
      }
      const avoid = new Set(['jab>cross', 'jab', 'cross', 'jab>jab']);
      for (let i = 0; i < 20; i++) {
        const g = SB.comboGen.generate({ level: 'basico', focusId: null, rng: rng, targetComplexity: 1, avoid: avoid });
        if (g) assert.ok(!avoid.has(g.signature), 'avoid respetado: ' + g.signature);
      }
      // Sin defensas en la biblioteca, el foco de defensa no puede generar.
      assert.equal(SB.comboGen.generate({ level: 'basico', focusId: 'defensa', rng: rng }), null);
      // Tope por estado: aprendido ≤ 2,5
      SB.library.setStatus('jab', 'aprendido');
      SB.library.setStatus('cross', 'aprendido');
      for (let i = 0; i < 20; i++) {
        const g = SB.comboGen.generate({ level: 'avanzado', focusId: null, rng: rng, targetComplexity: 4 });
        if (g) assert.atMost(g.complexity, 2.5, 'tope por estado aprendido');
      }
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
