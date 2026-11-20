/**
 * SOMBRA · js/engine/grammar.js
 * ---------------------------------------------------------------------------
 * Gramática técnica (§5): coherencia biomecánica de una combinación.
 *
 * Modelo de estado del tronco: N (neutra), J (tras jab), LL (lado adelantado
 * cargado), RL (lado atrasado cargado), LOW (posición baja). Cada movimiento
 * declara en sus datos `flow.from[estado]` (0 no válida, 1 aceptable, 2 natural)
 * y `flow.to` (estado resultante o 'keep'). Toda la lógica sale de esos datos:
 * añadir un movimiento nuevo no requiere tocar este archivo.
 *
 * Reglas globales de validate(seq, {level}):
 *  1. ids existentes y ninguno de categoría 'base'.
 *  2. transiciones ≥ 1 (la primera desde N), salvo `flow.repeatWith`.
 *  3. `flow.position` (inicio / medio / final).
 *  4. defensas seguidas de golpe en ≤ 2 elementos; nunca terminar en defensa.
 *  5. fintas y pausa seguidas inmediatamente de golpe.
 *  6. ≤ 3 jabs seguidos, ≤ 2 defensas seguidas, ≤ 2 desplazamientos seguidos,
 *     nunca dos pausas de ritmo contiguas.
 *  7. al menos un golpe.
 *  8. límites por nivel (básico / avanzado).
 */
(function (SB) {
  'use strict';

  const STATES = ['N', 'J', 'LL', 'RL', 'LOW'];

  /** Límites por nivel (§5 regla 8) y complejidad máxima (§6.1). */
  const LIMITS = {
    basico: { minLen: 1, maxLen: 5, golpe: 4, defensa: 1, desplazamiento: 1, maxComplexity: 3 },
    avanzado: { minLen: 1, maxLen: 8, golpe: 6, defensa: 2, desplazamiento: 2, maxComplexity: 5 }
  };

  /** Golpe obligatorio a continuación por categoría (si los datos no lo indican). */
  const FOLLOW_DEFAULT = { defensa: 2, finta: 1, ritmo: 1 };
  const JAB_IDS = { jab: true, jab_body: true };

  function getMovement(id) {
    if (SB.library && typeof SB.library.get === 'function') return SB.library.get(id);
    const list = (SB.data && SB.data.movements) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function nameOf(m) { return m ? (m.name || m.id) : 'inicio'; }

  function levelKey(level) { return level === 'basico' ? 'basico' : 'avanzado'; }

  /** Estado del tronco tras ejecutar `movement` desde `state`. */
  function nextState(state, movement) {
    const to = movement && movement.flow && movement.flow.to;
    if (!to || to === 'keep') return state || 'N';
    return to;
  }

  /**
   * Puntuación de la transición hacia `movement` desde `state`.
   * Si la puntuación base es 0 pero el anterior está en flow.repeatWith, vale 1.
   * @returns {0|1|2}
   */
  function transitionScore(prevId, state, movement) {
    if (!movement) return 0;
    const flow = movement.flow || {};
    const from = flow.from || {};
    let s = Number(from[state || 'N']);
    if (!(s >= 0)) s = 0;
    s = s >= 2 ? 2 : (s >= 1 ? 1 : 0);
    if (s === 0 && prevId && Array.isArray(flow.repeatWith) && flow.repeatWith.indexOf(prevId) !== -1) s = 1;
    return s;
  }

  /** Regla "debe ir seguido de" de un movimiento: {cat, within} o null. */
  function followRule(m) {
    const flow = m.flow || {};
    const def = FOLLOW_DEFAULT[m.category];
    if (flow.mustBeFollowedBy) {
      const w = Number(flow.within);
      return { cat: flow.mustBeFollowedBy, within: w >= 1 ? w : (def || 1) };
    }
    if (def) return { cat: 'golpe', within: def };
    return null;
  }

  /** Posición permitida según flow.position (por defecto todas). */
  function positionAllowed(m, i, n) {
    const p = (m.flow && m.flow.position) || {};
    const where = n === 1 ? ['start', 'end'] : (i === 0 ? ['start'] : (i === n - 1 ? ['end'] : ['middle']));
    for (let k = 0; k < where.length; k++) if (p[where[k]] === false) return where[k];
    return null;
  }

  /** Transiciones de la secuencia: {scores[], avg, firstBad}. */
  function transitions(moves) {
    let state = 'N';
    let prev = null;
    const scores = [];
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      const s = transitionScore(prev, state, m);
      scores.push({ score: s, state: state });
      state = nextState(state, m);
      prev = m.id;
    }
    const sum = scores.reduce(function (a, x) { return a + x.score; }, 0);
    return { scores: scores, avg: moves.length ? sum / moves.length : 0 };
  }

  /**
   * Valida una combinación.
   * @param {string[]} seq
   * @param {{level?: 'basico'|'avanzado'}} [opts]  (por defecto, límites de avanzado)
   * @returns {{ok: boolean, errors: string[], score: number, complexity: number}}
   */
  function validate(seq, opts) {
    const errors = [];
    const lv = LIMITS[levelKey(opts && opts.level)];
    if (!Array.isArray(seq) || !seq.length) {
      return { ok: false, errors: ['La combinación está vacía.'], score: 0, complexity: 1 };
    }
    const n = seq.length;
    const moves = seq.map(getMovement);
    // 1. ids y categoría
    for (let i = 0; i < n; i++) {
      if (!moves[i]) errors.push('Movimiento desconocido: «' + seq[i] + '».');
      else if (moves[i].category === 'base') errors.push('«' + nameOf(moves[i]) + '» no puede formar parte de una combinación.');
    }
    if (errors.length) return { ok: false, errors: errors, score: 0, complexity: 1 };

    // 2. transiciones
    const tr = transitions(moves);
    tr.scores.forEach(function (x, i) {
      if (x.score < 1) {
        errors.push('Transición incoherente: ' + nameOf(i ? moves[i - 1] : null) + ' → ' + nameOf(moves[i]) + ' (desde ' + x.state + ').');
      }
    });

    // 3. posición
    for (let i = 0; i < n; i++) {
      const bad = positionAllowed(moves[i], i, n);
      if (bad) {
        const where = bad === 'start' ? 'al principio' : (bad === 'end' ? 'al final' : 'en medio');
        errors.push('«' + nameOf(moves[i]) + '» no puede ir ' + where + '.');
      }
    }

    // 4 y 5. golpe obligatorio a continuación; no terminar en defensa
    for (let i = 0; i < n; i++) {
      const rule = followRule(moves[i]);
      if (!rule) continue;
      let ok = false;
      for (let j = i + 1; j <= Math.min(n - 1, i + rule.within); j++) {
        if (moves[j].category === rule.cat) { ok = true; break; }
      }
      if (!ok) {
        errors.push('«' + nameOf(moves[i]) + '» debe ir seguido de un golpe' + (rule.within > 1 ? ' en ' + rule.within + ' elementos como máximo.' : ' inmediatamente.'));
      }
    }
    if (moves[n - 1].category === 'defensa') errors.push('Una combinación no puede terminar en defensa.');

    // 6. repeticiones seguidas
    let jabRun = 0, defRun = 0, movRun = 0;
    let maxJab = 0, maxDef = 0, maxMov = 0, doubleRhythm = false;
    for (let i = 0; i < n; i++) {
      const m = moves[i];
      jabRun = JAB_IDS[m.id] ? jabRun + 1 : 0;
      defRun = m.category === 'defensa' ? defRun + 1 : 0;
      movRun = m.category === 'desplazamiento' ? movRun + 1 : 0;
      maxJab = Math.max(maxJab, jabRun);
      maxDef = Math.max(maxDef, defRun);
      maxMov = Math.max(maxMov, movRun);
      if (i > 0 && m.category === 'ritmo' && moves[i - 1].category === 'ritmo') doubleRhythm = true;
    }
    if (maxJab > 3) errors.push('Máximo 3 jabs seguidos.');
    if (maxDef > 2) errors.push('Máximo 2 defensas seguidas.');
    if (maxMov > 2) errors.push('Máximo 2 desplazamientos seguidos.');
    if (doubleRhythm) errors.push('No puede haber dos pausas de ritmo seguidas.');

    // 7. al menos un golpe
    const count = { golpe: 0, defensa: 0, desplazamiento: 0 };
    moves.forEach(function (m) { if (count[m.category] !== undefined) count[m.category]++; });
    if (!count.golpe) errors.push('La combinación debe contener al menos un golpe.');

    // 8. límites por nivel
    const lvName = lv === LIMITS.basico ? 'básico' : 'avanzado';
    if (n < lv.minLen || n > lv.maxLen) errors.push('En nivel ' + lvName + ' la combinación tiene entre ' + lv.minLen + ' y ' + lv.maxLen + ' elementos.');
    if (count.golpe > lv.golpe) errors.push('En nivel ' + lvName + ' se permiten como máximo ' + lv.golpe + ' golpes.');
    if (count.defensa > lv.defensa) errors.push('En nivel ' + lvName + ' se permiten como máximo ' + lv.defensa + ' defensa(s).');
    if (count.desplazamiento > lv.desplazamiento) errors.push('En nivel ' + lvName + ' se permiten como máximo ' + lv.desplazamiento + ' desplazamiento(s).');

    return { ok: errors.length === 0, errors: errors, score: Math.round(tr.avg * 1000) / 1000, complexity: complexityOf(moves, tr.avg) };
  }

  /**
   * Cambios de nivel: pares de elementos CONTIGUOS que son ambos golpes y cambian
   * cabeza ↔ cuerpo (aclaración §5 del 30-oct).
   */
  function levelChanges(moves) {
    let changes = 0;
    for (let i = 1; i < moves.length; i++) {
      const a = moves[i - 1], b = moves[i];
      if (a.category === 'golpe' && b.category === 'golpe' && (a.target || 'cabeza') !== (b.target || 'cabeza')) changes++;
    }
    return changes;
  }

  function complexityOf(moves, avgScore) {
    const n = moves.length;
    let c = 1;
    c += (n >= 3 ? 0.5 : 0) + (n >= 5 ? 0.5 : 0) + (n >= 7 ? 0.5 : 0);
    const cats = new Set();
    moves.forEach(function (m) { if (m.category !== 'base') cats.add(m.category); });
    if (cats.size > 0) c += (cats.size - 1) * 0.75;
    c += 0.4 * levelChanges(moves);
    const adv = moves.filter(function (m) { return m.level === 'avanzado'; }).length;
    c += Math.min(1, 0.5 * adv);
    if (avgScore < 1.75) c += 0.3;
    return Math.min(5, Math.max(1, Math.round(c * 2) / 2));
  }

  /** Complejidad de 1 a 5 en pasos de 0,5 (§5). */
  function complexity(seq) {
    const moves = (seq || []).map(getMovement).filter(Boolean);
    if (!moves.length) return 1;
    return complexityOf(moves, transitions(moves).avg);
  }

  SB.grammar = {
    STATES: STATES,
    LIMITS: LIMITS,
    validate: validate,
    complexity: complexity,
    nextState: nextState,
    transitionScore: transitionScore,
    // CONTRATO: añadidos para el generador.
    followRule: followRule,
    positionAllowed: positionAllowed,
    levelChanges: levelChanges,
    getMovement: getMovement
  };
})(window.SB = window.SB || {});
