/**
 * SOMBRA · tests/specs/08-visual.test.js
 * Animaciones: cada técnica y cada ejercicio HIIT tiene clip; las poses son numéricas y finitas;
 * los ejercicios vuelven a la pose inicial (bucle sin saltos). No dibuja: solo comprueba los datos.
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  /** Lista de problemas de un clip: duración, tiempos crecientes y valores finitos. */
  function clipProblems(id, clip) {
    const out = [];
    if (!clip || !clip.length) return [id + ': sin keyframes'];
    if (!(clip.duration > 0)) out.push(id + ': duración ' + clip.duration);
    for (let i = 0; i < clip.length; i++) {
      const k = clip[i];
      if (i && k.t < clip[i - 1].t) out.push(id + ': tiempo decreciente en ' + i);
      for (const key in k.p) {
        const v = k.p[key];
        if (typeof v === 'number' && !isFinite(v)) out.push(id + ': ' + key + ' no finito');
        if (Array.isArray(v) && v.some(function (x) { return typeof x !== 'number' || !isFinite(x); })) out.push(id + ': ' + key + ' no numérico');
      }
    }
    return out;
  }

  SBT.describe('Animaciones (técnicas y HIIT)', function () {
    SBT.it('cada técnica del catálogo tiene animación', function (env, assert) {
      const SB = env.SB;
      if (!SB.visual || !SB.visual.poses) { SBT.info('módulos visuales no cargados'); return; }
      const missing = (SB.data.movements || []).filter(function (m) { return !SB.visual.poses.has(m.anim || m.id); }).map(function (m) { return m.id; });
      if (env.dataName === 'fixtures') { SBT.info('fixtures: sin comprobación de cobertura (' + missing.length + ' sin animación)'); return; }
      assert.deepEqual(missing, [], 'técnicas sin animación');
    });

    SBT.it('cada ejercicio HIIT tiene una animación válida que cierra el bucle', function (env, assert) {
      const SB = env.SB;
      const E = SB.visual && SB.visual.exercises;
      if (!E) { SBT.info('js/visual/exercises.js no cargado'); return; }
      const hiit = SB.data.hiit || [];
      const missing = hiit.filter(function (x) { return !E.has(x.id); }).map(function (x) { return x.id; });
      if (env.dataName === 'fixtures') SBT.info('fixtures: ' + missing.length + ' ids de prueba sin animación (normal)');
      else assert.deepEqual(missing, [], 'ejercicios sin animación');
      let problems = [];
      E.list().forEach(function (id) {
        const c = E.clip(id);
        problems = problems.concat(clipProblems(id, c));
        if (c && c.frame === 'auto') {
          // bucle: la última pose es la primera (sin salto al reiniciar)
          const a = c[0].p, b = c[c.length - 1].p;
          ['hx', 'hy', 'hz', 'pitch', 'roll', 'ry'].forEach(function (k) {
            if (Math.abs((a[k] || 0) - (b[k] || 0)) > 1e-6) problems.push(id + ': el bucle salta en ' + k);
          });
          ['lf', 'rf'].forEach(function (k) {
            if (a[k].some(function (v, i) { return Math.abs(v - b[k][i]) > 1e-6; })) problems.push(id + ': el bucle salta en ' + k);
          });
        }
      });
      assert.deepEqual(problems, [], 'clips con problemas');
      SBT.info(E.list().length + ' animaciones de ejercicios');
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
