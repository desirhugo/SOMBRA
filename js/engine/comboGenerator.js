/**
 * SOMBRA · js/engine/comboGenerator.js
 * ---------------------------------------------------------------------------
 * Generador de combinaciones por plantillas con backtracking (§6.2).
 *
 * Plantillas (`focus.templates` en los datos): 'P' golpe, 'D' defensa,
 * 'F' desplazamiento, 'T' finta, 'R' pausa de ritmo. 'X{a,b}' = entre a y b
 * elementos de esa clase; 'X?' = 0 o 1. Ej.: 'P{1,3} D P{1,3}'.
 *
 * Proceso:
 *  1. Candidatos: movimientos de la biblioteca personal utilizables en el nivel
 *     (§6.3) con peso `weightOf(id)` > 0, agrupados por clase.
 *  2. Se elige una plantilla factible y se expanden sus cantidades (sesgadas
 *     hacia la complejidad objetivo y limitadas por el nivel).
 *  3. Búsqueda en profundidad con backtracking: en cada hueco se prueban los
 *     movimientos compatibles (transición ≥ 1, posición, golpe obligatorio)
 *     en orden aleatorio ponderado por `weightOf` × 2 si la transición es natural.
 *  4. La hoja se valida con SB.grammar.validate y se comprueba el tope de
 *     complejidad (nivel y estado de cada movimiento) y `avoid`.
 *  5. Se reúnen varias candidatas y se devuelve la más cercana a la complejidad
 *     objetivo. Si su firma coincide con una combinación curada, se devuelve
 *     la curada con sus metadatos (source: 'curated').
 *
 * Todo se basa en los datos (`flow` de cada movimiento, `templates` de los focos):
 * un movimiento nuevo entra en la generación sin tocar este archivo.
 */
(function (SB) {
  'use strict';

  const CLASS_OF_CATEGORY = { golpe: 'P', defensa: 'D', desplazamiento: 'F', finta: 'T', ritmo: 'R' };
  const CATEGORY_OF_CLASS = { P: 'golpe', D: 'defensa', F: 'desplazamiento', T: 'finta', R: 'ritmo' };
  const LEVEL_KEY_OF_CLASS = { P: 'golpe', D: 'defensa', F: 'desplazamiento' };
  const DEFAULT_TEMPLATES = ['P{1,3}', 'P{2,4}'];
  const FALLBACK_TEMPLATE = 'P{1,4}';
  const NODE_BUDGET = 400;   // nodos por intento de búsqueda
  const ATTEMPTS = 12;       // intentos (plantilla + expansión) por llamada
  const WANT = 4;            // candidatas válidas que se comparan
  const DEFAULT_STATUS_WEIGHT = { practica: 2.5, aprendido: 1.4, dominado: 1 };

  // ---------------------------------------------------------------------------
  // Plantillas
  // ---------------------------------------------------------------------------

  const templateCache = Object.create(null);

  /**
   * Analiza una plantilla. 'P{1,3} D' → [{cls:'P',min:1,max:3},{cls:'D',min:1,max:1}]
   * @returns {Array|null} null si la plantilla no es válida
   */
  function parseTemplate(str) {
    const key = String(str || '');
    if (templateCache[key] !== undefined) return templateCache[key];
    const parts = key.trim().split(/\s+/).filter(Boolean);
    const out = [];
    for (let i = 0; i < parts.length; i++) {
      const m = /^([PDFTR])(?:\{(\d+)(?:,(\d+))?\}|(\?))?$/.exec(parts[i]);
      if (!m) { templateCache[key] = null; return null; }
      let min = 1, max = 1;
      if (m[2] !== undefined) { min = Number(m[2]); max = m[3] !== undefined ? Number(m[3]) : min; }
      else if (m[4]) { min = 0; max = 1; }
      if (max < min) { const t = max; max = min; min = t; }
      out.push({ cls: m[1], min: min, max: max });
    }
    templateCache[key] = out.length ? out : null;
    return templateCache[key];
  }

  function findFocus(focusId) {
    if (!focusId) return null;
    if (typeof focusId === 'object') return focusId;
    const list = (SB.data && SB.data.focuses) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === focusId) return list[i];
    return null;
  }

  // ---------------------------------------------------------------------------
  // Candidatos
  // ---------------------------------------------------------------------------

  function defaultWeightOf(id) {
    return DEFAULT_STATUS_WEIGHT[SB.library.statusOf(id)] || 0;
  }

  /** Movimientos utilizables agrupados por clase de plantilla. */
  function candidatesByClass(level, weightOf) {
    const by = { P: [], D: [], F: [], T: [], R: [] };
    SB.library.personal().forEach(function (m) {
      const cls = CLASS_OF_CATEGORY[m.category];
      if (!cls) return;
      if (!SB.library.eligibleAtLevel(m.id, level)) return;
      const w = Number(weightOf(m.id));
      if (!(w > 0) || !isFinite(w)) return;
      by[cls].push({ m: m, w: w });
    });
    return by;
  }

  /** ¿Se puede rellenar la plantilla con los candidatos y límites del nivel? */
  function feasibleTemplate(tpl, byClass, lim) {
    let len = 0;
    const per = { golpe: 0, defensa: 0, desplazamiento: 0 };
    for (let i = 0; i < tpl.length; i++) {
      const t = tpl[i];
      if (t.min > 0 && !byClass[t.cls].length) return false;
      len += t.min;
      const k = LEVEL_KEY_OF_CLASS[t.cls];
      if (k) per[k] += t.min;
    }
    if (len > lim.maxLen) return false;
    if (per.golpe > lim.golpe || per.defensa > lim.defensa || per.desplazamiento > lim.desplazamiento) return false;
    return tpl.some(function (t) { return t.cls === 'P' && t.max > 0; });
  }

  /** Expande cantidades de la plantilla → lista de clases ('P','D',...). */
  function expand(tpl, rng, lim, target) {
    // Sesgo: objetivo bajo → cantidades pequeñas; objetivo alto → grandes.
    const bias = target <= 2 ? 1.7 : (target >= 3.5 ? 0.6 : 1);
    const counts = tpl.map(function (t) {
      const span = t.max - t.min + 1;
      const k = Math.min(span - 1, Math.floor(Math.pow(rng.next(), bias) * span));
      return t.min + k;
    });
    const total = function () { return counts.reduce(function (a, b) { return a + b; }, 0); };
    const perKey = function (key) {
      let s = 0;
      tpl.forEach(function (t, i) { if (LEVEL_KEY_OF_CLASS[t.cls] === key) s += counts[i]; });
      return s;
    };
    const shrink = function (pred) {
      // Reduce el token reducible con más elementos que cumpla pred.
      let best = -1;
      tpl.forEach(function (t, i) {
        if (pred(t) && counts[i] > t.min && (best === -1 || counts[i] > counts[best])) best = i;
      });
      if (best === -1) return false;
      counts[best]--;
      return true;
    };
    let guard = 0;
    while (total() > lim.maxLen && guard++ < 50) if (!shrink(function () { return true; })) return null;
    ['golpe', 'defensa', 'desplazamiento'].forEach(function (key) {
      let g = 0;
      while (perKey(key) > lim[key] && g++ < 50) {
        if (!shrink(function (t) { return LEVEL_KEY_OF_CLASS[t.cls] === key; })) break;
      }
    });
    if (perKey('golpe') > lim.golpe || perKey('defensa') > lim.defensa || perKey('desplazamiento') > lim.desplazamiento) return null;
    const classes = [];
    tpl.forEach(function (t, i) { for (let k = 0; k < counts[i]; k++) classes.push(t.cls); });
    if (!classes.length || classes.indexOf('P') === -1) return null;
    return classes;
  }

  // ---------------------------------------------------------------------------
  // Búsqueda con backtracking
  // ---------------------------------------------------------------------------

  function capOf(id) {
    const st = SB.library.statusOf(id);
    return (SB.library.STATUS_CAP && SB.library.STATUS_CAP[st]) || 5;
  }

  function search(classes, byClass, rng, level, maxC, avoid) {
    const G = SB.grammar;
    const n = classes.length;
    const seq = [];
    let nodes = 0;

    function followOk(m, i) {
      const rule = G.followRule(m);
      if (!rule) return true;
      for (let j = i + 1; j <= Math.min(n - 1, i + rule.within); j++) {
        if (CATEGORY_OF_CLASS[classes[j]] === rule.cat) return true;
      }
      return false;
    }

    function jabRunOk(m) {
      if (m.id !== 'jab' && m.id !== 'jab_body') return true;
      let run = 0;
      for (let k = seq.length - 1; k >= 0 && (seq[k] === 'jab' || seq[k] === 'jab_body'); k--) run++;
      return run < 3;
    }

    function rec(i, state, prevId) {
      nodes++;
      if (i === n) {
        if (avoid && avoid.has(seq.join('>'))) return false;
        const v = G.validate(seq, { level: level });
        if (!v.ok) return false;
        let cap = maxC;
        for (let k = 0; k < seq.length; k++) cap = Math.min(cap, capOf(seq[k]));
        return v.complexity <= cap;
      }
      const opts = [];
      const list = byClass[classes[i]];
      for (let k = 0; k < list.length; k++) {
        const c = list[k];
        const s = G.transitionScore(prevId, state, c.m);
        if (s < 1) continue;
        if (G.positionAllowed(c.m, i, n)) continue;
        if (!followOk(c.m, i) || !jabRunOk(c.m)) continue;
        opts.push({ c: c, s: s });
      }
      const order = rng.weightedOrder(opts, function (x) { return x.c.w * (x.s === 2 ? 2 : 1); });
      for (let k = 0; k < order.length; k++) {
        const m = order[k].c.m;
        seq.push(m.id);
        if (rec(i + 1, G.nextState(state, m), m.id)) return true;
        seq.pop();
        if (nodes > NODE_BUDGET) return false;
      }
      return false;
    }

    return rec(0, 'N', null) ? seq.slice() : null;
  }

  // ---------------------------------------------------------------------------
  // Etiquetas y coincidencias con combinaciones existentes
  // ---------------------------------------------------------------------------

  function norm(s) { return SB.util.slug(s || ''); }

  /**
   * Etiquetas deducidas del contenido de una secuencia (§4.2).
   * Se usan para combinaciones generadas y personales (que no traen etiquetas).
   */
  function inferTags(seq) {
    const moves = (seq || []).map(function (id) { return SB.library.get(id); }).filter(Boolean);
    const tags = [];
    const add = function (t) { if (tags.indexOf(t) === -1) tags.push(t); };
    if (!moves.length) return tags;
    const punches = moves.filter(function (m) { return m.category === 'golpe'; });
    const onlyPunches = punches.length === moves.length;
    const levelChanges = SB.grammar.levelChanges(moves);
    if (onlyPunches) add('ofensiva');
    if (onlyPunches && moves.length <= 3 && !levelChanges && moves.every(function (m) { return m.level !== 'avanzado'; })) add('fundamental');
    if (onlyPunches && moves.length >= 3 && punches.every(function (m) { return norm(m.subcategory) === 'recto'; })) add('velocidad');
    if (punches.some(function (m) { return m.side === 'rear' && norm(m.subcategory) !== 'recto'; })) add('potencia');
    moves.forEach(function (m, i) {
      if (m.category === 'defensa') {
        add('defensa');
        for (let j = i + 1; j <= Math.min(moves.length - 1, i + 2); j++) if (moves[j].category === 'golpe') { add('contra'); break; }
      }
      if (m.category === 'desplazamiento') {
        add('desplazamiento');
        const sc = norm(m.subcategory);
        if (sc === 'lateral' || sc === 'pivote' || sc === 'angulo' || m.id === 'pivot' || m.id === 'angle_step') add('angulo');
      }
      if (m.category === 'finta') add('finta');
      if (m.category === 'ritmo') add('ritmo');
    });
    if (levelChanges) add('niveles');
    if (moves[0].category === 'desplazamiento') add('entrada');
    if (moves[moves.length - 1].category === 'desplazamiento') add('salida');
    return tags;
  }

  let curatedRef = null;
  let curatedIdx = null;
  function curatedIndex() {
    const list = (SB.data && SB.data.combinations) || [];
    if (curatedRef !== list || !curatedIdx) {
      curatedIdx = new Map();
      list.forEach(function (c) { if (c && Array.isArray(c.seq)) curatedIdx.set(c.seq.join('>'), c); });
      curatedRef = list;
    }
    return curatedIdx;
  }

  function describe(seq, complexity, focus) {
    const sig = seq.join('>');
    const cur = curatedIndex().get(sig);
    if (cur) {
      return { seq: seq, signature: sig, tags: (cur.tags || []).slice(), complexity: complexity, source: 'curated', refId: cur.id, name: cur.name || '', note: cur.note || '' };
    }
    const tags = inferTags(seq);
    const any = (focus && focus.tagsAny) || [];
    if (any.length && !tags.some(function (t) { return any.indexOf(t) !== -1; })) tags.push(any[0]);
    return { seq: seq, signature: sig, tags: tags, complexity: complexity, source: 'generated', refId: null, name: '', note: '' };
  }

  // ---------------------------------------------------------------------------
  // API
  // ---------------------------------------------------------------------------

  /**
   * Plantillas factibles. Si el foco trae plantillas, solo se usan las suyas
   * (para no etiquetar con el foco algo que no le corresponde); si no trae,
   * se usan las de por defecto y, en último caso, 'P{1,4}'.
   */
  function usableTemplates(focus, byClass, lim) {
    const own = ((focus && focus.templates) || []).map(parseTemplate).filter(Boolean);
    const feasible = function (t) { return feasibleTemplate(t, byClass, lim); };
    if (own.length) return own.filter(feasible);
    let list = DEFAULT_TEMPLATES.map(parseTemplate).filter(feasible);
    if (!list.length) {
      const fb = parseTemplate(FALLBACK_TEMPLATE);
      if (feasible(fb)) list = [fb];
    }
    return list;
  }

  /**
   * Genera una combinación coherente.
   * @param {{level, focusId, rng, targetComplexity, maxComplexity, avoid: Set<string>, weightOf: (id)=>number}} opts
   * @returns {{seq, tags, complexity, source, signature, refId, name, note}|null}
   */
  function generate(opts) {
    const o = opts || {};
    const level = o.level === 'avanzado' ? 'avanzado' : 'basico';
    const lim = SB.grammar.LIMITS[level];
    const rng = o.rng || SB.util.rng();
    const focus = findFocus(o.focusId);
    const target = isFinite(o.targetComplexity) ? Number(o.targetComplexity) : (level === 'basico' ? 2 : 3);
    const maxC = Math.min(isFinite(o.maxComplexity) ? Number(o.maxComplexity) : lim.maxComplexity, lim.maxComplexity);
    const avoid = o.avoid instanceof Set ? o.avoid : new Set(o.avoid || []);
    const weightOf = typeof o.weightOf === 'function' ? o.weightOf : defaultWeightOf;

    const byClass = candidatesByClass(level, weightOf);
    if (!byClass.P.length) return null;
    const templates = usableTemplates(focus, byClass, lim);
    if (!templates.length) return null;

    const found = [];
    const seen = new Set();
    for (let a = 0; a < ATTEMPTS && found.length < WANT; a++) {
      const classes = expand(rng.pick(templates), rng, lim, target);
      if (!classes) continue;
      const seq = search(classes, byClass, rng, level, maxC, avoid);
      if (!seq) continue;
      const sig = seq.join('>');
      if (seen.has(sig)) continue;
      seen.add(sig);
      found.push(seq);
    }
    if (!found.length) return null;
    let best = null;
    let bestScore = Infinity;
    found.forEach(function (seq) {
      const c = SB.grammar.complexity(seq);
      const score = Math.abs(c - target) + rng.next() * 0.35;
      if (score < bestScore) { bestScore = score; best = { seq: seq, c: c }; }
    });
    return describe(best.seq, best.c, focus);
  }

  // CONTRATO: añadido. ¿Hay alguna plantilla del foco factible con la biblioteca?
  function canGenerate(focusId, level) {
    const lv = level === 'avanzado' ? 'avanzado' : 'basico';
    const byClass = candidatesByClass(lv, defaultWeightOf);
    if (!byClass.P.length) return false;
    return usableTemplates(findFocus(focusId), byClass, SB.grammar.LIMITS[lv]).length > 0;
  }

  SB.comboGen = {
    generate: generate,
    // CONTRATO: añadidos.
    inferTags: inferTags,
    parseTemplate: parseTemplate,
    canGenerate: canGenerate,
    curatedBySignature: function (sig) { return curatedIndex().get(sig) || null; }
  };
})(window.SB = window.SB || {});
