/**
 * SOMBRA · js/engine/selector.js
 * ---------------------------------------------------------------------------
 * Elección ponderada de combinaciones para cada hueco de la sesión (§6.3, §6.4).
 *
 * Fuentes (mezcla): curadas (SB.data.combinations), personales del usuario y
 * generadas al vuelo (SB.comboGen) con probabilidad 0,25 (básico) / 0,40 (avanzado).
 *
 * Elegibilidad (pool): todos los movimientos en la biblioteca personal y
 * utilizables en el nivel; pasa la gramática del nivel; complejidad ≤ tope del
 * nivel y ≤ tope por estado de cada movimiento (aprendido 2,5 · práctica 4 ·
 * dominado 5). En básico se omiten las curadas de nivel 'avanzado'.
 *
 * Peso de una combinación:
 *   estado        práctica ×2,5 · aprendido ×1,8 (REPETICIÓN) / ×1 (VARIACIÓN) ·
 *                 dominado ×1 (×1,2 en VARIACIÓN avanzada) → se toma el mayor de sus movimientos;
 *                 personales: estado propio (práctica ×3) y ×1,5 por ser del usuario
 *   foco          solo las que tienen alguna etiqueta de focus.tagsAny (+25 % por etiqueta extra)
 *   complejidad   campana gaussiana alrededor del objetivo (σ = 0,6)
 *   recencia      × 1 / (1 + 1,5·r)   (r de SB.history)
 *   sesión        ya usada ×0,05; las de REPETICIÓN no se repiten como REPETICIÓN
 *   novedad       contiene un movimiento destacado (featuredNew) ×2
 *   exposición    × (1 + 0,6·déficit) del movimiento menos expuesto
 *   personalizado contiene un movimiento de custom.focusMovementIds ×3
 *   un solo golpe ×0,35 (se prefieren combinaciones de verdad)
 *
 * Si no hay candidatos se relajan las condiciones en este orden: generador
 * forzado → sin foco → se permiten repeticiones → golpes sueltos de la biblioteca.
 * Las relajaciones quedan anotadas en ctx.flags (nota de biblioteca pequeña).
 */
(function (SB) {
  'use strict';

  const GEN_PROB = { basico: 0.25, avanzado: 0.40 };
  const PERSONAL_SOURCE_FACTOR = 1.5;
  const USED_FACTOR = 0.05;
  // Una combinación personal EN PRÁCTICA (secuencia de clase) puede reaparecer en la misma sesión.
  const PRACTICE_USED_FACTOR = 0.35;
  const PRACTICE_MAX_USES = 3;
  const RECENCY_K = 1.5;
  const FEATURED_FACTOR = 2;
  const DEFICIT_K = 0.6;
  const FOCUS_MOVEMENT_FACTOR = 3;
  const BELL_SIGMA = 0.6;
  const SINGLE_FACTOR = 0.35;
  const EMPTY = new Set();

  /**
   * Peso por estado (§6.3).
   * @param {string} status
   * @param {'repeticion'|'variacion'} mode
   * @param {'basico'|'avanzado'} level
   * @param {boolean} [personalCombo] combinación personal (práctica ×3)
   */
  function statusWeight(status, mode, level, personalCombo) {
    if (status === 'practica') return personalCombo ? 3 : 2.5;
    if (status === 'aprendido') return mode === 'repeticion' ? 1.8 : 1;
    if (status === 'dominado') return (mode === 'variacion' && level === 'avanzado') ? 1.2 : 1;
    return 0;
  }

  // ---------------------------------------------------------------------------
  // Pool de combinaciones elegibles (curadas + personales), en caché
  // ---------------------------------------------------------------------------

  let poolCache = { key: null, list: null };

  function unique(arr) { return Array.from(new Set(arr)); }

  /** Combinaciones elegibles para el nivel con la biblioteca actual. */
  function pool(level) {
    const lv = level === 'avanzado' ? 'avanzado' : 'basico';
    const curated = (SB.data && SB.data.combinations) || [];
    const key = lv + '|' + SB.storage.rev() + '|' + curated.length + '|' + ((SB.data && SB.data.movements) || []).length;
    if (poolCache.key === key && poolCache.ref === curated) return poolCache.list;
    const lim = SB.grammar.LIMITS[lv];
    const caps = SB.library.STATUS_CAP;
    const bySig = new Map();
    const list = [];

    function eligible(seq) {
      if (!Array.isArray(seq) || !seq.length) return null;
      for (let i = 0; i < seq.length; i++) if (!SB.library.eligibleAtLevel(seq[i], lv)) return null;
      const v = SB.grammar.validate(seq, { level: lv });
      if (!v.ok) return null;
      let cap = lim.maxComplexity;
      for (let i = 0; i < seq.length; i++) cap = Math.min(cap, caps[SB.library.statusOf(seq[i])] || 5);
      if (v.complexity > cap) return null;
      return v;
    }

    SB.library.combos.personal().forEach(function (p) {
      const v = eligible(p.seq);
      if (!v) return;
      const sig = p.seq.join('>');
      if (bySig.has(sig)) return;
      const e = {
        seq: p.seq.slice(), signature: sig, complexity: v.complexity, source: 'personal', refId: p.id,
        name: p.name || '', note: p.note || '', tags: SB.comboGen.inferTags(p.seq), comboStatus: p.status,
        movIds: unique(p.seq)
      };
      bySig.set(sig, e);
      list.push(e);
    });

    curated.forEach(function (c) {
      if (!c || !Array.isArray(c.seq)) return;
      if (lv === 'basico' && c.level === 'avanzado') return;
      const sig = c.seq.join('>');
      if (bySig.has(sig)) {
        // Una personal idéntica a una curada hereda sus etiquetas.
        const e = bySig.get(sig);
        (c.tags || []).forEach(function (t) { if (e.tags.indexOf(t) === -1) e.tags.push(t); });
        return;
      }
      const v = eligible(c.seq);
      if (!v) return;
      const e = {
        seq: c.seq.slice(), signature: sig, complexity: v.complexity, source: 'curated', refId: c.id,
        name: c.name || '', note: c.note || '', tags: (c.tags || []).slice(), movIds: unique(c.seq)
      };
      bySig.set(sig, e);
      list.push(e);
    });

    poolCache = { key: key, ref: curated, list: list, bySig: bySig };
    return list;
  }

  function poolBySig() { return poolCache.bySig || new Map(); }

  // ---------------------------------------------------------------------------
  // Contexto de selección (uno por sesión generada)
  // ---------------------------------------------------------------------------

  /**
   * Crea el contexto de selección de una sesión.
   * @param {{level, rng, snapshot?, featured?: string[]|Set, focusMovementIds?: string[]|Set, genProb?: number}} opts
   */
  function createContext(opts) {
    const o = opts || {};
    const level = o.level === 'avanzado' ? 'avanzado' : 'basico';
    const snapshot = o.snapshot || SB.history.snapshot();
    const list = pool(level);
    const ctx = {
      level: level,
      rng: o.rng || SB.util.rng(),
      snapshot: snapshot,
      featured: new Set(o.featured || []),
      focusMovementIds: new Set(o.focusMovementIds || []),
      pGen: o.genProb != null ? o.genProb : GEN_PROB[level],
      pool: list,
      bySig: poolBySig(),
      usage: new Map(),
      repUsed: new Set(),
      deficit: computeDeficit(level, snapshot),
      byFocus: new Map(),
      staticW: new Map(),
      flags: { generated: 0, relaxedFocus: 0, forcedReuse: 0, singles: 0, empty: 0 }
    };
    return ctx;
  }

  /** Déficit de exposición de cada movimiento utilizable: (media − e) / media ∈ [0, 1]. */
  function computeDeficit(level, snapshot) {
    const ids = SB.library.personal()
      .filter(function (m) { return SB.library.eligibleAtLevel(m.id, level); })
      .map(function (m) { return m.id; });
    const out = {};
    if (!ids.length) return out;
    const ex = snapshot.exposure || {};
    const mean = ids.reduce(function (a, id) { return a + (ex[id] || 0); }, 0) / ids.length;
    ids.forEach(function (id) {
      out[id] = mean > 0 ? SB.util.clamp((mean - (ex[id] || 0)) / mean, 0, 1) : 0;
    });
    return out;
  }

  /** Peso de un movimiento suelto (lo usa el generador como weightOf). */
  function movementWeight(ctx, id, mode) {
    if (!SB.library.eligibleAtLevel(id, ctx.level)) return 0;
    let w = statusWeight(SB.library.statusOf(id), mode, ctx.level, false);
    if (ctx.featured.has(id)) w *= FEATURED_FACTOR;
    w *= 1 + DEFICIT_K * (ctx.deficit[id] || 0);
    if (ctx.focusMovementIds.has(id)) w *= FOCUS_MOVEMENT_FACTOR;
    return w;
  }

  /** Parte del peso que no depende del hueco (se calcula una vez por modo). */
  function staticWeight(ctx, e, mode) {
    let cache = ctx.staticW.get(e);
    if (!cache) { cache = {}; ctx.staticW.set(e, cache); }
    if (cache[mode] !== undefined) return cache[mode];
    let sw = 0, def = 0, featured = false, focusMov = false;
    for (let i = 0; i < e.movIds.length; i++) {
      const id = e.movIds[i];
      sw = Math.max(sw, statusWeight(SB.library.statusOf(id), mode, ctx.level, false));
      def = Math.max(def, ctx.deficit[id] || 0);
      if (ctx.featured.has(id)) featured = true;
      if (ctx.focusMovementIds.has(id)) focusMov = true;
    }
    if (e.source === 'personal') {
      sw = Math.max(sw, statusWeight(e.comboStatus, mode, ctx.level, true)) * PERSONAL_SOURCE_FACTOR;
    }
    let w = sw;
    if (featured) w *= FEATURED_FACTOR;
    w *= 1 + DEFICIT_K * def;
    if (focusMov) w *= FOCUS_MOVEMENT_FACTOR;
    w *= 1 / (1 + RECENCY_K * ctx.snapshot.comboRecency(e.signature));
    if (e.seq.length === 1) w *= SINGLE_FACTOR;
    cache[mode] = w;
    return w;
  }

  function focusMatches(e, focus) {
    const any = (focus && focus.tagsAny) || [];
    if (!any.length) return 1;
    let n = 0;
    for (let i = 0; i < e.tags.length; i++) if (any.indexOf(e.tags[i]) !== -1) n++;
    return n ? 1 + 0.25 * (n - 1) : 0;
  }

  function focusList(ctx, focus) {
    const id = focus ? focus.id : '*';
    let l = ctx.byFocus.get(id);
    if (!l) {
      l = ctx.pool.filter(function (e) { return focusMatches(e, focus) > 0; });
      ctx.byFocus.set(id, l);
    }
    return l;
  }

  function bell(c, target) {
    if (!isFinite(target)) return 1;
    const d = c - target;
    return Math.exp(-(d * d) / (2 * BELL_SIGMA * BELL_SIGMA));
  }

  /**
   * Peso completo de una combinación para un hueco concreto.
   * @param {object} ctx
   * @param {object} e   entrada del pool
   * @param {{mode, focus, target}} req
   */
  function weightOf(ctx, e, req) {
    let w = staticWeight(ctx, e, req.mode);
    const fm = focusMatches(e, req.focus);
    w *= fm > 0 ? fm : 1;
    w *= bell(e.complexity, req.target);
    const used = ctx.usage.get(e.signature) || 0;
    if (used) {
      const practice = e.source === 'personal' && e.comboStatus === 'practica' && used < PRACTICE_MAX_USES;
      w *= practice ? PRACTICE_USED_FACTOR : USED_FACTOR;
    }
    return w;
  }

  function weightedPick(ctx, list, req, skip) {
    const boost = typeof req.boost === 'function' ? req.boost : null;
    return ctx.rng.weighted(list, function (e) { return skip(e) ? 0 : weightOf(ctx, e, req) * (boost ? boost(e.seq) : 1); });
  }

  /** Intenta generar una combinación nueva para el hueco. */
  function tryGenerate(ctx, req, forced) {
    if (!SB.comboGen) return null;
    const avoid = new Set(ctx.usage.keys());
    (req.exclude || EMPTY).forEach(function (s) { avoid.add(s); });
    const allowMove = typeof req.allowMove === 'function' ? req.allowMove : null;
    const g = SB.comboGen.generate({
      level: ctx.level,
      focusId: req.focus || null,
      rng: ctx.rng,
      targetComplexity: req.target,
      maxComplexity: SB.grammar.LIMITS[ctx.level].maxComplexity,
      avoid: avoid,
      weightOf: function (id) { return allowMove && !allowMove(id) ? 0 : movementWeight(ctx, id, req.mode); }
    });
    if (!g) return null;
    if (!forced) {
      // La recencia también se aplica a lo generado: se acepta con probabilidad 1/(1+1,5·r).
      const r = ctx.snapshot.comboRecency(g.signature);
      if (r > 0 && ctx.rng.next() > 1 / (1 + RECENCY_K * r)) return null;
    }
    const known = ctx.bySig.get(g.signature);
    if (known) return known;
    ctx.flags.generated++;
    return {
      seq: g.seq, signature: g.signature, complexity: g.complexity, source: g.source, refId: g.refId || null,
      name: g.name || '', note: g.note || '', tags: g.tags || [], movIds: unique(g.seq)
    };
  }

  /** Último recurso: golpes sueltos de la biblioteca que son válidos solos. */
  function singles(ctx) {
    return SB.library.personal()
      .filter(function (m) { return m.category === 'golpe' && SB.library.eligibleAtLevel(m.id, ctx.level); })
      .filter(function (m) { return SB.grammar.validate([m.id], { level: ctx.level }).ok; })
      .map(function (m) {
        return { seq: [m.id], signature: m.id, complexity: SB.grammar.complexity([m.id]), source: 'generated', refId: null, name: '', note: '', tags: SB.comboGen.inferTags([m.id]), movIds: [m.id] };
      });
  }

  /**
   * Elige una combinación para un hueco.
   * @param {object} ctx  createContext()
   * @param {{mode: 'repeticion'|'variacion', focus?: object, target?: number, exclude?: Set<string>,
   *          allow?: (seq: string[]) => boolean, allowMove?: (id) => boolean,
   *          boost?: (seq: string[]) => number, genProb?: number}} req  allow: filtro obligatorio (p. ej.
   *          ronda con papel: solo golpes de la mano adelantada); si nada lo cumple devuelve null.
   *          allowMove: técnicas que puede usar una combinación generada. boost: factor de peso de cada
   *          combinación. genProb: probabilidad de generar una nueva en vez de elegirla del pool.
   * @returns {object|null} entrada {seq, signature, complexity, source, refId, name, note, tags, movIds}
   */
  function pick(ctx, req) {
    const r = Object.assign({ mode: 'variacion', focus: null, target: NaN, exclude: EMPTY }, req || {});
    const exclude = r.exclude || EMPTY;
    const bad = typeof r.allow === 'function' ? function (e) { return !r.allow(e.seq); } : function () { return false; };
    const strict = function (e) { return bad(e) || exclude.has(e.signature) || (r.mode === 'repeticion' && ctx.repUsed.has(e.signature)); };
    let e = null;

    // Con boost, una generada se acepta con probabilidad boost / boostMax (las que el boost no
    // favorece salen menos, igual que en el sorteo del pool).
    const accept = function (x) {
      if (typeof r.boost !== 'function' || !(r.boostMax > 0)) return true;
      return ctx.rng.next() < Math.min(1, r.boost(x.seq) / r.boostMax);
    };
    if (ctx.rng.next() < (r.genProb != null ? r.genProb : ctx.pGen)) {
      e = tryGenerate(ctx, r, false);
      if (e && !strict(e) && accept(e)) return e;
    }
    e = weightedPick(ctx, focusList(ctx, r.focus), r, strict);
    if (e) return e;
    // Con boost se prueban hasta 3 generadas y se queda la primera que acepta (o la primera válida).
    let firstOk = null;
    for (let k = 0; k < (typeof r.boost === 'function' ? 3 : 1); k++) {
      e = tryGenerate(ctx, r, true);
      if (!e || strict(e)) continue;
      if (accept(e)) return e;
      if (!firstOk) firstOk = e;
    }
    if (firstOk) return firstOk;
    if (r.focus) {
      e = weightedPick(ctx, ctx.pool, r, strict);
      if (e) { ctx.flags.relaxedFocus++; return e; }
    }
    e = weightedPick(ctx, ctx.pool, r, function (x) { return bad(x) || exclude.has(x.signature); }) ||
      weightedPick(ctx, ctx.pool, r, bad);
    if (e) { ctx.flags.forcedReuse++; return e; }
    const s = singles(ctx).filter(function (x) { return !bad(x); });
    e = ctx.rng.weighted(s, function (x) { return (exclude.has(x.signature) ? 0.01 : 1) * movementWeight(ctx, x.seq[0], r.mode); }) || null;
    if (e) { ctx.flags.singles++; return e; }
    ctx.flags.empty++;
    return null;
  }

  /** Anota el uso de una combinación en la sesión. */
  function commit(ctx, e, mode) {
    if (!e) return;
    ctx.usage.set(e.signature, (ctx.usage.get(e.signature) || 0) + 1);
    if (mode === 'repeticion') ctx.repUsed.add(e.signature);
  }

  SB.selector = {
    GEN_PROB: GEN_PROB,
    statusWeight: statusWeight,
    pool: pool,
    createContext: createContext,
    pick: pick,
    commit: commit,
    weightOf: weightOf,
    movementWeight: movementWeight,
    focusMatches: focusMatches
  };
})(window.SB = window.SB || {});
