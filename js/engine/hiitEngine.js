/**
 * SOMBRA · js/engine/hiitEngine.js
 * ---------------------------------------------------------------------------
 * Planificación de los ejercicios HIIT entre rondas (§6.1, §6.2, §6.4).
 *
 *  - pool(): ejercicios de SB.data.hiit que el usuario no ha desactivado
 *    (SB.storage 'hiitPrefs'.disabled), cuyos `requires` están en la biblioteca
 *    personal y cuya exigencia encaja con el ajuste (moderada → demanda ≤ 2).
 *  - plan(): alternancia ESTRICTA fuerza/cardio bloque a bloque empezando por
 *    `startCategory`; sin repetir ejercicio en la sesión salvo que el grupo de
 *    esa categoría se agote; dos ejercicios consecutivos de la misma categoría
 *    no comparten `pattern` ni son ambos de impacto alto (si hay alternativa);
 *    los usados en las 3 últimas sesiones pesan ×0,2.
 *    Los ejercicios de abdomen (pattern 'core') NO entran entre rondas: van todos al
 *    bloque final de abdomen (planCore).
 *  - planCore(): k ejercicios de abdomen distintos para el final de la sesión, con la
 *    misma preferencia por exigencia y recencia.
 *
 * Los datos mandan: un ejercicio nuevo en data/hiit.js entra sin tocar el motor.
 */
(function (SB) {
  'use strict';

  const CATEGORIES = ['fuerza', 'cardio'];
  /** Patrón de los ejercicios de abdomen: se reservan para el bloque final. */
  const CORE_PATTERN = 'core';
  /** Duración por exigencia (§6.1). */
  const DEMAND_SEC = { moderada: 30, alta: 40, muy_alta: 45 };
  const RECENT_FACTOR = 0.2;

  /** Normaliza el ajuste de exigencia: 'moderada' | 'alta' | 'muy_alta'. */
  function normDemand(d) {
    if (d === 1 || d === '1') return 'moderada';
    if (d === 3 || d === '3') return 'muy_alta';
    const v = SB.util.slug(d || 'alta');
    if (v === 'moderada' || v === 'baja' || v === 'moderado') return 'moderada';
    if (v === 'muy_alta' || v === 'muyalta' || v === 'muy_alto' || v === 'maxima') return 'muy_alta';
    return 'alta';
  }

  /** Preferencia de demanda del ejercicio según el ajuste (0 = excluido). */
  function demandFactor(exDemand, setting) {
    const d = Number(exDemand) || 2;
    if (setting === 'moderada') return d <= 1 ? 1.5 : (d === 2 ? 1 : 0);
    if (setting === 'muy_alta') return d >= 3 ? 1.4 : (d === 2 ? 1.2 : 0.6);
    return d >= 3 ? 0.8 : 1;
  }

  function disabledIds() {
    const p = SB.storage.get('hiitPrefs', null);
    if (Array.isArray(p)) return new Set(p);
    return new Set((p && Array.isArray(p.disabled)) ? p.disabled : []);
  }

  function librarySet(library) {
    if (library instanceof Set) return library;
    if (Array.isArray(library)) return new Set(library.map(function (x) { return typeof x === 'string' ? x : x && x.id; }));
    return new Set(SB.library.personal().map(function (m) { return m.id; }));
  }

  /**
   * Ejercicios disponibles.
   * @param {{demand?: string, library?: string[]|Set}} [opts]
   */
  function pool(opts) {
    const o = opts || {};
    const demand = normDemand(o.demand);
    const off = disabledIds();
    const lib = librarySet(o.library);
    return ((SB.data && SB.data.hiit) || []).filter(function (e) {
      if (!e || !e.id || CATEGORIES.indexOf(e.category) === -1) return false;
      if (off.has(e.id)) return false;
      const req = Array.isArray(e.requires) ? e.requires : [];
      for (let i = 0; i < req.length; i++) if (!lib.has(req[i])) return false;
      return demandFactor(e.demand, demand) > 0;
    });
  }

  /**
   * Plan de ejercicios para n bloques.
   * @param {number} nBlocks
   * @param {{demand?, rng?, startCategory?: 'fuerza'|'cardio', library?, recency?: (id)=>number}} [opts]
   * @returns {object[]} un ejercicio por bloque (puede ser más corto si no hay ningún ejercicio)
   */
  function plan(nBlocks, opts) {
    const o = opts || {};
    const rng = o.rng || SB.util.rng();
    const demand = normDemand(o.demand);
    const all = pool({ demand: demand, library: o.library }).filter(function (e) { return e.pattern !== CORE_PATTERN; });
    const byCat = { fuerza: [], cardio: [] };
    all.forEach(function (e) { byCat[e.category].push(e); });
    const recency = typeof o.recency === 'function' ? o.recency : function (id) { return SB.history.hiitRecency(id); };
    let start = o.startCategory === 'cardio' || o.startCategory === 'fuerza' ? o.startCategory : (rng.next() < 0.5 ? 'fuerza' : 'cardio');
    if (!byCat[start].length) start = start === 'fuerza' ? 'cardio' : 'fuerza';
    const used = { fuerza: new Set(), cardio: new Set() };
    const lastOf = { fuerza: null, cardio: null };
    const out = [];
    if (!all.length) return out;

    for (let b = 0; b < nBlocks; b++) {
      let cat = b % 2 === 0 ? start : (start === 'fuerza' ? 'cardio' : 'fuerza');
      if (!byCat[cat].length) cat = cat === 'fuerza' ? 'cardio' : 'fuerza';
      let cands = byCat[cat].filter(function (e) { return !used[cat].has(e.id); });
      if (!cands.length) { used[cat].clear(); cands = byCat[cat].slice(); }
      const prev = lastOf[cat];
      if (prev) {
        const notSameEx = cands.filter(function (e) { return e.id !== prev.id; });
        if (notSameEx.length) cands = notSameEx;
        const diffPattern = cands.filter(function (e) { return e.pattern !== prev.pattern; });
        if (diffPattern.length) cands = diffPattern;
        if (prev.impact === 'alto') {
          const low = cands.filter(function (e) { return e.impact !== 'alto'; });
          if (low.length) cands = low;
        }
      }
      const ex = rng.weighted(cands, function (e) {
        return demandFactor(e.demand, demand) * (recency(e.id) > 0 ? RECENT_FACTOR : 1);
      }) || cands[0];
      used[cat].add(ex.id);
      lastOf[cat] = ex;
      out.push(ex);
    }
    ensureOneOf(out, all, o.ensureOne, rng, demand, recency);
    return out;
  }

  /**
   * Garantiza que el plan lleve al menos uno de los ejercicios `ids` (si alguno está disponible):
   * sustituye un ejercicio de su misma categoría, preferentemente de su mismo patrón, sin dejar
   * dos ejercicios seguidos de la categoría con el mismo patrón.
   */
  function ensureOneOf(out, all, ids, rng, demand, recency) {
    if (!Array.isArray(ids) || !ids.length || !out.length) return;
    if (out.some(function (e) { return ids.indexOf(e.id) !== -1; })) return;
    const cands = all.filter(function (e) { return ids.indexOf(e.id) !== -1; });
    if (!cands.length) return;
    const ex = rng.weighted(cands, function (e) {
      return demandFactor(e.demand, demand) * (recency(e.id) > 0 ? RECENT_FACTOR : 1);
    }) || cands[0];
    const sameCat = [];
    out.forEach(function (e, i) { if (e.category === ex.category) sameCat.push(i); });
    if (!sameCat.length) return;
    const fits = function (k) {
      const prev = k > 0 ? out[sameCat[k - 1]] : null;
      const next = k < sameCat.length - 1 ? out[sameCat[k + 1]] : null;
      return (!prev || prev.pattern !== ex.pattern) && (!next || next.pattern !== ex.pattern);
    };
    let pickK = -1;
    for (let k = 0; k < sameCat.length && pickK < 0; k++) if (out[sameCat[k]].pattern === ex.pattern && fits(k)) pickK = k;
    for (let k = 0; k < sameCat.length && pickK < 0; k++) if (fits(k)) pickK = k;
    if (pickK < 0) pickK = 0;
    out[sameCat[pickK]] = ex;
  }

  /**
   * Ejercicios de abdomen para el bloque final (sin repetir, distintos de los últimos usados).
   * @param {number} k
   * @param {{demand?, rng?, library?, recency?: (id)=>number}} [opts]
   * @returns {object[]} hasta k ejercicios (menos si no hay suficientes)
   */
  function planCore(k, opts) {
    const o = opts || {};
    const rng = o.rng || SB.util.rng();
    const demand = normDemand(o.demand);
    const recency = typeof o.recency === 'function' ? o.recency : function (id) { return SB.history.hiitRecency(id); };
    let cands = pool({ demand: demand, library: o.library }).filter(function (e) { return e.pattern === CORE_PATTERN; });
    const out = [];
    while (out.length < k && cands.length) {
      const ex = rng.weighted(cands, function (e) {
        return demandFactor(e.demand, demand) * (recency(e.id) > 0 ? RECENT_FACTOR : 1);
      }) || cands[0];
      out.push(ex);
      cands = cands.filter(function (e) { return e.id !== ex.id; });
    }
    return out;
  }

  SB.hiit = {
    CATEGORIES: CATEGORIES,
    CORE_PATTERN: CORE_PATTERN,
    DEMAND_SEC: DEMAND_SEC,
    pool: pool,
    plan: plan,
    planCore: planCore,
    // CONTRATO: añadidos.
    normDemand: normDemand,
    /** Segundos de HIIT según el ajuste de exigencia (antes de goal.timing.hiitDelta). */
    secondsFor: function (demand) { return DEMAND_SEC[normDemand(demand)]; }
  };
})(window.SB = window.SB || {});
