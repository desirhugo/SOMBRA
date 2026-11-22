/**
 * SOMBRA · js/engine/sessionGenerator.js
 * ---------------------------------------------------------------------------
 * Construye una sesión completa (§6.1, §6.2, §7.1):
 *
 *   preparación 5 s → [ronda de boxeo (intervalos) → transición 5 s → HIIT → descanso] × n
 *   (el último bloque termina con el HIIT, sin descanso; sin calentamiento ni vuelta a la calma)
 *
 *  - Tiempos: intervalo por nivel (45 / 55 s) o del objetivo / personalizado; HIIT según
 *    la exigencia del usuario (30 / 40 / 45 s) + goal.timing.hiitDelta; descanso del
 *    usuario (30 s) o del objetivo; descanso largo (+30 s) en el bloque central si n ≥ 10.
 *    Se elige el nº de bloques más cercano al tiempo pedido y se reparten ajustes de ±5 s
 *    en los intervalos (30–75 s) hasta quedar a ≤ 30 s del objetivo.
 *  - HIIT: alternancia estricta fuerza/cardio; el primer bloque empieza por la categoría
 *    contraria a la que abrió la sesión anterior (SB.hiit.plan). Sin abdomen entre rondas.
 *  - Bloque final de abdomen: tras el último HIIT, descanso → [transición 5 s → ejercicio
 *    de abdomen] × k (k = 1-4 según la duración; SB.hiit.planCore). Cuenta en el tiempo pedido.
 *  - Material (ajustes; ver materialPlan): UN elemento por ronda como mucho (20-nov-2026).
 *    Cada accesorio una vez por sesión desde la 2.ª ronda: pelota bajo la barbilla, brazo
 *    atrasado fijo (papel O toalla, alternando entre sesiones; solo golpes de la mano
 *    adelantada, todo variación, sin repetir combinación y con foco de defensa), cuerda de
 *    esquivas (todas las combinaciones con media cintura, cintura completa o sentadilla y foco
 *    de defensa), pelota colgada, cinta y goma. Mancuernas en las rondas libres (nunca la última).
 *  - HIIT: al menos un ejercicio de defensa por sesión (media cintura, cintura completa,
 *    sentadilla o goma continuas); con la cuerda puesta, los tres primeros se hacen con ella.
 *  - Cada ronda tiene un foco (goal.focusWeights, solo focos disponibles, sin repetir en
 *    rondas consecutivas si hay alternativa). Progresión: las primeras rondas tienen más
 *    REPETICIÓN y menor complejidad; las últimas, más VARIACIÓN y algo más de complejidad.
 *    Básico: ≥ 1 intervalo de REPETICIÓN por ronda; avanzado: ≥ 1 de VARIACIÓN.
 *  - Transferencia: la combinación de REPETICIÓN aparece una vez dentro de la VARIACIÓN
 *    de la misma ronda.
 *  - Variedad: si la huella se parece (Jaccard > 0,45) a alguna de las 10 últimas
 *    sesiones, se regenera con otra semilla (hasta 6 intentos) y se elige la menos parecida.
 *  - Novedad: hasta 2 movimientos añadidos hace ≤ 21 días (aprendido / práctica) se
 *    destacan (featuredNew, peso ×2); la primera aparición de un movimiento destacado o
 *    «poco habitual» se marca isNew / newIds.
 *
 * Determinista: con la misma semilla y los mismos datos guardados produce la misma sesión
 * (salvo id y createdAt).
 */
(function (SB) {
  'use strict';

  const PREPARE_SEC = 5;
  const TRANSITION_SEC = 5;
  const LONG_REST_EXTRA = 30;
  const LONG_REST_MIN_BLOCKS = 10;
  const ADJUST_STEP = 5;
  const INTERVAL_MIN = 30;
  const INTERVAL_MAX = 75;
  const MAX_ATTEMPTS = 6;
  const SIMILARITY_MAX = 0.45;
  const NEW_DAYS = 21;
  const MAX_FEATURED = 2;
  const SMALL_LIBRARY_NOTE = 'Biblioteca pequeña: se prioriza la coherencia técnica';

  /** Parámetros por nivel (§6.1). */
  const LEVELS = {
    basico: { intervalSec: 45, intervalsPerRound: 3, cStart: 1.5, cEnd: 2.5, cMax: 3, repRatio: 0.6, genProb: 0.25, combo: { a: 4, b: 2.6, min: 8, max: 18 } },
    avanzado: { intervalSec: 55, intervalsPerRound: 3, cStart: 2.5, cEnd: 4, cMax: 5, repRatio: 0.35, genProb: 0.40, combo: { a: 4, b: 2.1, min: 7, max: 18 } }
  };
  /** Ritmo de cambio (ajuste del usuario). */
  const PACE = { lenta: 1.25, normal: 1, rapida: 0.8 };
  const CATEGORY_NAME = { fuerza: 'Fuerza', cardio: 'Cardio' };
  const PSEUDO_FOCUS = { id: 'libre', name: 'Libre', tagsAny: [], requiresCategory: [], templates: [] };
  const PSEUDO_GOAL = {
    id: 'completo', name: 'Completo', short: 'Completo', description: '', icon: 'star', repRatio: null,
    focusWeights: {}, requires: { categories: [] }, timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
    changeSpeed: 1, complexityShift: 0, tempo: null
  };

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function posNum(v) { return isNum(v) && v > 0 ? v : null; }

  function goals() { return (SB.data && SB.data.goals) || []; }
  function focuses() { return (SB.data && SB.data.focuses) || []; }

  function findGoal(goalId) {
    const list = goals();
    return list.find(function (g) { return g.id === goalId; }) ||
      list.find(function (g) { return g.id === 'completo'; }) || list[0] || PSEUDO_GOAL;
  }

  /** Categorías con al menos un movimiento utilizable (en el nivel, si se indica). */
  function eligibleCategories(level) {
    const cats = new Set();
    SB.library.personal().forEach(function (m) {
      if (m.category === 'base') return;
      if (level && !SB.library.eligibleAtLevel(m.id, level)) return;
      cats.add(m.category);
    });
    return cats;
  }

  /**
   * Objetivos y su disponibilidad con la biblioteca personal.
   * CONTRATO: `level` opcional; si se indica, solo cuentan los movimientos utilizables
   * en ese nivel (en básico, los avanzados no dominados no cuentan).
   * @returns {{goal, available: boolean, missing: string[]}[]}
   */
  function availableGoals(level) {
    const cats = eligibleCategories(level);
    return goals().map(function (g) {
      const req = (g.requires && Array.isArray(g.requires.categories)) ? g.requires.categories : [];
      const missing = req.filter(function (c) { return !cats.has(c); });
      if (!cats.has('golpe') && missing.indexOf('golpe') === -1) missing.unshift('golpe');
      return { goal: g, available: missing.length === 0, missing: missing };
    });
  }

  /**
   * Valor de timing que puede venir por nivel.
   * CONTRATO (data/goals.js): goal.timing.X admite número, null u objeto { basico, avanzado }.
   */
  function byLevel(v, level) {
    if (v && typeof v === 'object') return v[level] != null ? v[level] : null;
    return v;
  }

  /** Parámetros efectivos de la sesión. */
  function resolveParams(level, goal, settings, custom) {
    const L = LEVELS[level];
    const raw = goal.timing || {};
    const t = {
      intervalSec: byLevel(raw.intervalSec, level),
      intervalsPerRound: byLevel(raw.intervalsPerRound, level),
      restSec: byLevel(raw.restSec, level),
      hiitDelta: byLevel(raw.hiitDelta, level)
    };
    const c = custom || {};
    const pace = PACE[SB.util.slug(settings.changePace || 'normal')] || 1;
    return {
      intervalSec: posNum(c.intervalSec) || posNum(t.intervalSec) || L.intervalSec,
      intervalsPerRound: Math.max(1, Math.round(posNum(c.intervalsPerRound) || posNum(t.intervalsPerRound) || L.intervalsPerRound)),
      restSec: Math.max(0, isNum(c.restSec) ? c.restSec : (isNum(t.restSec) ? t.restSec : (isNum(settings.restSec) ? settings.restSec : 30))),
      hiitSec: Math.max(0, isNum(c.hiitSec) ? c.hiitSec : SB.hiit.secondsFor(settings.hiitDemand) + (Number(t.hiitDelta) || 0)),
      hiitDemand: SB.hiit.normDemand(settings.hiitDemand),
      repRatio: SB.util.clamp(isNum(c.repRatio) ? c.repRatio : (isNum(goal.repRatio) ? goal.repRatio : L.repRatio), 0, 1),
      pace: pace,
      changeSpeed: Number(goal.changeSpeed) > 0 ? Number(goal.changeSpeed) : 1,
      shift: SB.util.clamp(Number(goal.complexityShift) || 0, -1, 1)
    };
  }

  // ---------------------------------------------------------------------------
  // Estructura y ajuste al tiempo pedido
  // ---------------------------------------------------------------------------

  function longRestIndex(n) { return n >= LONG_REST_MIN_BLOCKS ? Math.ceil(n / 2) - 1 : -1; }

  function blockOverhead(P) { return P.hiitSec > 0 ? TRANSITION_SEC + P.hiitSec : 0; }

  function totalFor(n, intervalsSum, P) {
    return PREPARE_SEC + intervalsSum + n * blockOverhead(P) + (n - 1) * P.restSec + (n >= LONG_REST_MIN_BLOCKS ? LONG_REST_EXTRA : 0) +
      (P.finisherSec || 0);
  }

  /** Nº de ejercicios del bloque final de abdomen según la duración pedida. */
  function coreCountFor(durationMin) {
    const d = Number(durationMin) || 30;
    return d < 15 ? 1 : d <= 25 ? 2 : d <= 40 ? 3 : 4;
  }

  /** Duración del bloque final: descanso + k × (transición + ejercicio). */
  function finisherSecFor(k, P) {
    return k > 0 && P.hiitSec > 0 ? P.restSec + k * (TRANSITION_SEC + P.hiitSec) : 0;
  }

  /**
   * Elige nº de bloques y reparte ajustes de ±5 s en los intervalos.
   * @returns {{n, intervals: number[][], total}}
   */
  function fitStructure(targetSec, P) {
    const ipr = P.intervalsPerRound;
    let best = 1, bestDiff = Infinity;
    for (let n = 1; n <= 80; n++) {
      const d = Math.abs(totalFor(n, n * ipr * P.intervalSec, P) - targetSec);
      if (d < bestDiff) { bestDiff = d; best = n; }
    }
    const n = best;
    const intervals = [];
    for (let r = 0; r < n; r++) { const row = []; for (let i = 0; i < ipr; i++) row.push(P.intervalSec); intervals.push(row); }
    const sum = function () { return intervals.reduce(function (a, row) { return a + row.reduce(function (x, y) { return x + y; }, 0); }, 0); };
    let diff = targetSec - totalFor(n, sum(), P);
    const lo = Math.min(INTERVAL_MIN, P.intervalSec);
    const hi = Math.max(INTERVAL_MAX, P.intervalSec);
    // Orden de reparto: primero un ajuste por ronda, luego el segundo, etc.
    const order = [];
    for (let i = 0; i < ipr; i++) for (let r = 0; r < n; r++) order.push([r, i]);
    let changed = true;
    while (Math.abs(diff) > ADJUST_STEP / 2 && changed) {
      changed = false;
      for (let k = 0; k < order.length && Math.abs(diff) > ADJUST_STEP / 2; k++) {
        const step = diff > 0 ? ADJUST_STEP : -ADJUST_STEP;
        const r = order[k][0], i = order[k][1];
        const v = intervals[r][i] + step;
        if (v < lo || v > hi) continue;
        intervals[r][i] = v;
        diff -= step;
        changed = true;
      }
    }
    return { n: n, intervals: intervals, total: totalFor(n, sum(), P) };
  }

  // ---------------------------------------------------------------------------
  // Focos, modos y ritmo
  // ---------------------------------------------------------------------------

  /**
   * ¿Se puede trabajar el foco con la biblioteca en este nivel?
   * requiresCategory + (CONTRATO, data/goals.js) requiresAnyMovement opcional +
   * que haya combinaciones del pool con sus etiquetas o plantillas realizables.
   */
  function focusAvailable(f, cats, level) {
    const req = Array.isArray(f.requiresCategory) ? f.requiresCategory : [];
    for (let i = 0; i < req.length; i++) if (!cats.has(req[i])) return false;
    const anyMov = Array.isArray(f.requiresAnyMovement) ? f.requiresAnyMovement : [];
    if (anyMov.length && !anyMov.some(function (id) { return SB.library.eligibleAtLevel(id, level); })) return false;
    const poolHas = SB.selector.pool(level).some(function (e) { return SB.selector.focusMatches(e, f) > 0; });
    return poolHas || SB.comboGen.canGenerate(f, level);
  }

  function chooseFocuses(n, goal, level, rng, custom, cats) {
    const weights = goal.focusWeights || {};
    const noWeights = !Object.keys(weights).length;
    const limitTo = custom && Array.isArray(custom.focuses) && custom.focuses.length ? new Set(custom.focuses) : null;
    const avail = focuses().filter(function (f) { return focusAvailable(f, cats, level); });
    let cands = avail.map(function (f) {
      let w = Number(weights[f.id]) || 0;
      if (noWeights) w = 1;
      if (limitTo) w = limitTo.has(f.id) ? (w > 0 ? w : 1) : 0;
      return { f: f, w: w };
    }).filter(function (x) { return x.w > 0; });
    if (!cands.length) cands = avail.map(function (f) { return { f: f, w: 1 }; });
    if (!cands.length) cands = [{ f: PSEUDO_FOCUS, w: 1 }];
    const out = [];
    const count = {};
    for (let r = 0; r < n; r++) {
      const prev = out[r - 1];
      let opts = cands.filter(function (x) { return !prev || x.f.id !== prev.id; });
      if (!opts.length) opts = cands;
      const pick = rng.weighted(opts, function (x) { return x.w / (1 + 0.5 * (count[x.f.id] || 0)); }) || opts[0];
      count[pick.f.id] = (count[pick.f.id] || 0) + 1;
      out.push(pick.f);
    }
    return out;
  }

  /** Nº de intervalos de REPETICIÓN por ronda (más al principio, menos al final). */
  function allocateModes(n, ipr, repRatio, level) {
    const out = [];
    let carry = 0;
    for (let r = 0; r < n; r++) {
      const p = n > 1 ? r / (n - 1) : 0.5;
      const rho = SB.util.clamp(repRatio * (1 + 0.6 * (1 - 2 * p)), 0, 1);
      const desired = rho * ipr + carry;
      let reps = SB.util.clamp(Math.round(desired), 0, ipr);
      if (level === 'basico') reps = Math.max(1, reps);
      else reps = Math.min(ipr - 1, reps);
      reps = Math.max(0, reps);
      carry = desired - reps;
      out.push(reps);
    }
    return out;
  }

  function tempoFor(goal, focus, mode, progress) {
    if (goal.tempo) return goal.tempo;
    if (focus.id === 'velocidad') return 'explosivo';
    if (mode === 'repeticion') return progress < 0.5 ? 'controlado' : 'fluido';
    if (focus.id === 'movilidad' || focus.id === 'integracion' || goal.id === 'resistencia') return 'continuo';
    return 'fluido';
  }

  // ---------------------------------------------------------------------------
  // Relleno de intervalos
  // ---------------------------------------------------------------------------

  function mkCombo(e, start, duration) {
    return {
      seq: e.seq.slice(), signature: e.signature, start: start, duration: duration,
      source: e.source, refId: e.refId || null, name: e.name || '', isNew: false, newIds: [],
      // CONTRATO: añadidos informativos.
      tags: (e.tags || []).slice(), complexity: e.complexity, note: e.note || ''
    };
  }

  function comboTimeFn(level, P) {
    const k = LEVELS[level].combo;
    return function (nElems) {
      const base = SB.util.clamp(k.a + k.b * nElems, k.min, k.max);
      return Math.max(4, Math.round(base * P.pace * P.changeSpeed));
    };
  }

  /** Intervalo de VARIACIÓN: combinaciones distintas hasta completar (la última se alarga). */
  function fillVariation(ctx, opt) {
    const list = [];
    const transfers = opt.transfers || [];
    // Las transferencias se insertan aparte: no se eligen además por sorteo en este intervalo.
    const inInterval = new Set(transfers.map(function (e) { return e.signature; }));
    const minTail = Math.max(3, opt.comboTime(1) * 0.5);
    let t = 0, ti = 0, guard = 0;
    while (t < opt.dur && guard++ < 80) {
      const injecting = ti < transfers.length && list.length >= 1 + ti;
      let e;
      if (injecting) {
        e = transfers[ti];
      } else {
        const excl = new Set(inInterval);
        const ld = opt.lead;
        if (ld) ld.roundUsed.forEach(function (s) { excl.add(s); });
        e = SB.selector.pick(ctx, {
          mode: 'variacion', focus: opt.focus, target: opt.target, exclude: excl, allow: opt.allow || null,
          allowMove: ld ? ld.allowMove : null, boost: ld ? ld.boost : null, boostMax: ld ? ld.boostMax : null, genProb: ld ? ld.genProb : null
        });
      }
      if (!e) break;
      let d = opt.comboTime(e.seq.length);
      const rem = opt.dur - t;
      if (d > rem && list.length) { list[list.length - 1].duration += rem; t = opt.dur; break; }
      if (d > rem) d = rem;
      list.push({ e: e, start: t, duration: d, transfer: injecting });
      SB.selector.commit(ctx, e, 'variacion');
      inInterval.add(e.signature);
      if (opt.lead) opt.lead.roundUsed.add(e.signature);
      if (injecting) ti++;
      t += d;
      const left = opt.dur - t;
      if (left > 0 && left < minTail) { list[list.length - 1].duration += left; t = opt.dur; }
    }
    if (t < opt.dur && list.length) list[list.length - 1].duration += opt.dur - t;
    // Transferencias que no cupieron: sustituyen combinaciones normales, empezando por las
    // últimas (la primera solo como último recurso), para que la repetida aparezca igualmente.
    for (let k = list.length - 1; k >= 0 && ti < transfers.length; k--) {
      if (list[k].transfer) continue;
      list[k].e = transfers[ti];
      list[k].transfer = true;
      ti++;
    }
    return list.map(function (x) { return mkCombo(x.e, x.start, x.duration); });
  }

  // ---------------------------------------------------------------------------
  // Novedad
  // ---------------------------------------------------------------------------

  function pickFeatured(level, snap, rng) {
    const now = Date.now();
    const cands = SB.library.personal().filter(function (m) {
      if (m.status !== 'aprendido' && m.status !== 'practica') return false;
      if (m.fromPreset) return false;
      if (!SB.library.eligibleAtLevel(m.id, level)) return false;
      const t = Date.parse(m.addedAt || '');
      return isFinite(t) && now - t <= NEW_DAYS * 86400000;
    }).map(function (m) { return { id: m.id, ex: snap.exposure[m.id] || 0, r: rng.next() }; });
    cands.sort(function (a, b) { return (a.ex - b.ex) || (a.r - b.r); });
    return cands.slice(0, MAX_FEATURED).map(function (x) { return x.id; });
  }

  // ---------------------------------------------------------------------------
  // Material (pelota, papel, mancuernas)
  // ---------------------------------------------------------------------------

  /** Proporciones admitidas de rondas con mancuernas. */
  const DUMBBELL_SHARES = [0.3, 0.5, 0.7];
  /** Claves del material de una ronda. */
  const MATERIAL_KEYS = ['dumbbells', 'ball', 'paper', 'elbow', 'rope', 'hangball', 'tape', 'ankles'];
  /** Ejercicios HIIT de defensa: al menos uno por sesión. */
  const DEFENSE_DRILLS = ['slip_drill', 'roll_drill', 'duck_drill', 'pull_drill'];
  /** Esquivas que se hacen con la cuerda (a su lado o por debajo). */
  const ROPE_DODGES = ['slip_lead', 'slip_rear', 'roll_lead', 'roll_rear', 'duck'];
  /** Ejercicios HIIT que se hacen con la cuerda de esquivas si está puesta. */
  const ROPE_DRILLS = ['slip_drill', 'roll_drill', 'duck_drill'];

  function emptyMaterial() {
    const o = {};
    MATERIAL_KEYS.forEach(function (k) { o[k] = false; });
    return o;
  }

  /**
   * Material de cada ronda según los ajustes (20-nov-2026, a petición del usuario: «una vez la
   * pelota, una vez la toalla… pero todo por separado»). Cada ronda lleva UN elemento como mucho:
   *  - Accesorios: pelota bajo la barbilla, brazo atrasado fijo (papel en la mejilla O toalla bajo
   *    el codo), cuerda de esquivas, pelota colgada, cinta en el suelo y goma en los tobillos. Cada
   *    uno sale una vez por sesión, desde la 2.ª ronda y repartidos. Si hay más accesorios que
   *    rondas, `rot` rota el orden para que los que no caben salgan en otras sesiones.
   *  - Papel y toalla solo admiten golpes de la mano adelantada: una sola ronda así por sesión,
   *    con el papel en una sesión y la toalla en la siguiente (`lastLock`: el de la última sesión).
   *  - Mancuernas: también solas. Van en las rondas sin accesorio, hasta round(share·n), nunca en
   *    la última (con ≥ 2 rondas).
   * @param {number} n
   * @param {object} settings
   * @param {number} [rot]
   * @param {'paper'|'elbow'|null} [lastLock]
   * @returns {{dumbbells, ball, paper, elbow, rope, hangball, tape, ankles}[]} booleanos por ronda
   */
  function materialPlan(n, settings, rot, lastLock) {
    const st = settings || {};
    const R = Math.abs(Math.round(Number(rot) || 0));
    const out = [];
    for (let r = 0; r < n; r++) out.push(emptyMaterial());

    // Brazo atrasado fijo: papel o toalla, nunca los dos; si están los dos, se alternan.
    let lock = null;
    if (st.equipPaper && st.equipElbow) lock = lastLock === 'paper' ? 'elbow' : (lastLock === 'elbow' ? 'paper' : (R % 2 ? 'elbow' : 'paper'));
    else if (st.equipPaper) lock = 'paper';
    else if (st.equipElbow) lock = 'elbow';

    const acc = [];
    if (st.equipBall) acc.push('ball');
    if (lock) acc.push(lock);
    if (st.equipRope) acc.push('rope');
    if (st.equipHangBall) acc.push('hangball');
    if (st.equipTape) acc.push('tape');
    if (st.equipAnkles) acc.push('ankles');
    if (acc.length && n >= 1) {
      const sh = R % acc.length;
      const order = acc.slice(sh).concat(acc.slice(0, sh));
      const first = n >= 2 ? 1 : 0;
      const slots = n - first;
      const k = Math.min(order.length, slots);
      const at = [];
      for (let j = 0; j < k; j++) at.push({ r: first + Math.floor(j * slots / k), key: order[j] });
      // Papel/toalla y cuerda piden foco de defensa: que no vayan en rondas seguidas.
      const L = at.find(function (x) { return x.key === lock; }), C = at.find(function (x) { return x.key === 'rope'; });
      if (L && C && Math.abs(L.r - C.r) === 1) {
        const other = at.find(function (x) { return x !== L && x !== C && Math.abs(x.r - C.r) > 1; });
        if (other) { const t = other.key; other.key = L.key; L.key = t; }
      }
      at.forEach(function (x) { out[x.r][x.key] = true; });
    }

    // Mancuernas: solo en rondas sin accesorio y nunca en la última.
    if (st.equipDumbbells) {
      const share = DUMBBELL_SHARES.indexOf(Number(st.dumbbellShare)) !== -1 ? Number(st.dumbbellShare) : 0.7;
      const free = [];
      for (let r = 0; r < n; r++) {
        if (n >= 2 && r === n - 1) continue;
        if (MATERIAL_KEYS.some(function (k) { return out[r][k]; })) continue;
        free.push(r);
      }
      const w = Math.min(Math.round(share * n), free.length);
      for (let j = 0; j < w; j++) out[free[Math.floor(j * free.length / w)]].dumbbells = true;
    }
    return out;
  }

  /** Brazo atrasado fijo de la sesión ('paper', 'elbow' o null). */
  function lockOf(material) {
    for (let r = 0; r < (material || []).length; r++) {
      const m = material[r] || {};
      if (m.paper) return 'paper';
      if (m.elbow) return 'elbow';
    }
    return null;
  }

  /** Filtro de las rondas con la cuerda de esquivas: cada combinación lleva al menos una esquiva. */
  function ropeAllow() {
    return function (seq) {
      for (let i = 0; i < seq.length; i++) if (ROPE_DODGES.indexOf(seq[i]) !== -1) return true;
      return false;
    };
  }

  /**
   * Filtro de las rondas con papel en la mejilla trasera: la mano trasera no se separa de la cara,
   * así que solo valen golpes de la mano adelantada, defensas que no usan la mano trasera y
   * desplazamientos (sin cambios de guardia).
   */
  function paperAllow() {
    const move = leadOnlyMove();
    const allow = function (seq) {
      for (let i = 0; i < seq.length; i++) if (!move(seq[i])) return false;
      return seq.length > 0;
    };
    allow.move = move;
    return allow;
  }

  /** ¿Vale la técnica con el brazo atrasado fijo? (con caché) */
  function leadOnlyMove() {
    const ok = new Map();
    return function (id) {
      if (!ok.has(id)) {
        const m = SB.library.get(id);
        let v = !!m;
        if (m && m.category === 'golpe') v = m.side === 'lead';
        else if (m && m.subcategory === 'parada') v = m.side !== 'rear';
        else if (m && m.subcategory === 'cambio de guardia') v = false;
        ok.set(id, v);
      }
      return ok.get(id);
    };
  }

  /**
   * Ronda con el brazo atrasado fijo: como todos los golpes son de la mano adelantada, se da
   * prioridad a las combinaciones con defensas o desplazamientos para que no sea solo jab.
   */
  function leadRoundBoost(seq) {
    for (let i = 0; i < seq.length; i++) {
      const m = SB.library.get(seq[i]);
      if (m && m.category !== 'golpe') return 3;
    }
    return 1;
  }

  // ---------------------------------------------------------------------------
  // Construcción de una sesión (un intento con una semilla)
  // ---------------------------------------------------------------------------

  function build(input, seed, snap) {
    const level = input.level;
    const goal = input.goal;
    const settings = input.settings;
    const custom = input.custom || {};
    const L = LEVELS[level];
    const P = resolveParams(level, goal, settings, custom);
    const rngFocus = SB.util.rng(SB.util.hashString(seed + ':focus'));
    const rngHiit = SB.util.rng(SB.util.hashString(seed + ':hiit'));
    const rngCombo = SB.util.rng(SB.util.hashString(seed + ':combo'));
    const rngMisc = SB.util.rng(SB.util.hashString(seed + ':misc'));
    const stance = settings.stance || 'diestro';
    const notes = [];
    const cats = eligibleCategories(level);
    const personalIds = SB.library.personal().map(function (m) { return m.id; });

    if (!cats.has('golpe')) notes.push('Tu biblioteca no tiene golpes utilizables en este nivel: añade al menos uno para entrenar boxeo.');
    const goalInfo = availableGoals(level).find(function (x) { return x.goal.id === goal.id; });
    if (goalInfo && !goalInfo.available && cats.has('golpe')) {
      notes.push('Tu biblioteca no tiene técnicas de ' + goalInfo.missing.join(', ') + ': la sesión usa los focos disponibles.');
    }

    // HIIT disponible
    if (P.hiitSec > 0 && !SB.hiit.pool({ demand: P.hiitDemand, library: personalIds }).length) {
      notes.push('No hay ejercicios HIIT disponibles: los bloques no llevan HIIT.');
      P.hiitSec = 0;
    }

    // Bloque final de abdomen (se reserva su tiempo antes de ajustar la estructura)
    const rngCore = SB.util.rng(SB.util.hashString(seed + ':core'));
    const coreList = P.hiitSec > 0 ? SB.hiit.planCore(coreCountFor(input.durationMin), {
      demand: P.hiitDemand, rng: rngCore, library: personalIds, recency: snap.hiitRecency
    }) : [];
    if (P.hiitSec > 0 && !coreList.length) notes.push('No hay ejercicios de abdomen disponibles: la sesión no termina con bloque de abdomen.');
    P.finisherSec = finisherSecFor(coreList.length, P);

    const struct = fitStructure(Math.round(input.durationMin * 60), P);
    const n = struct.n;
    const ipr = P.intervalsPerRound;

    const lastStart = snap.lastHiitStart;
    const startCat = lastStart === 'fuerza' ? 'cardio' : (lastStart === 'cardio' ? 'fuerza' : (rngHiit.next() < 0.5 ? 'fuerza' : 'cardio'));
    const hiitPlan = P.hiitSec > 0 ? SB.hiit.plan(n, {
      demand: P.hiitDemand, rng: rngHiit, startCategory: startCat, library: personalIds, recency: snap.hiitRecency,
      ensureOne: DEFENSE_DRILLS
    }) : [];
    for (let b = 1; b < hiitPlan.length; b++) {
      if (hiitPlan[b].category === hiitPlan[b - 1].category) {
        notes.push('Solo hay ejercicios HIIT de una categoría: no se puede alternar fuerza y cardio.');
        break;
      }
    }

    const featured = pickFeatured(level, snap, rngMisc);
    const roundFocus = chooseFocuses(n, goal, level, rngFocus, custom, cats);
    const reps = allocateModes(n, ipr, P.repRatio, level);
    const ctx = SB.selector.createContext({
      level: level, rng: rngCombo, snapshot: snap, featured: featured,
      focusMovementIds: custom.focusMovementIds || [], genProb: L.genProb
    });
    const comboTime = comboTimeFn(level, P);

    // Material por ronda
    const material = materialPlan(n, settings, SB.util.hashString(seed + ':mat'), snap.lastLock || null);
    const allowPaper = paperAllow();
    const allowRope = ropeAllow();
    if (material.some(function (m) { return m.paper || m.elbow; }) && !ctx.pool.some(function (e) { return allowPaper(e.seq); })) {
      material.forEach(function (m) { m.paper = false; m.elbow = false; });
      notes.push('Tu biblioteca no tiene combinaciones solo con la mano adelantada: no hay rondas con papel ni toalla.');
    }
    if (material.some(function (m) { return m.rope; }) && !ctx.pool.some(function (e) { return allowRope(e.seq); })) {
      material.forEach(function (m) { m.rope = false; });
      notes.push('Tu biblioteca no tiene combinaciones con media cintura, cintura completa o sentadilla: no hay rondas con la cuerda.');
    }
    // Rondas con la cuerda: foco de defensa o contraataque si están disponibles, entran en los
    // focos elegidos por el usuario y no repiten el de la ronda anterior ni el de la siguiente.
    const limitFocus = custom && Array.isArray(custom.focuses) && custom.focuses.length ? custom.focuses : null;
    const defFocus = focuses().filter(function (f) {
      return (f.id === 'defensa' || f.id === 'contra') && (!limitFocus || limitFocus.indexOf(f.id) !== -1) && focusAvailable(f, cats, level);
    });
    let defTurn = 0;
    // También la ronda de brazo atrasado fijo (papel o toalla): con foco de defensa o contraataque
    // lleva esquivas y pasos entre los golpes de la mano adelantada, no solo jab. La cuerda va
    // primero: si las dos rondas quedan juntas y no hay foco para ambas, se queda la cuerda.
    [function (m) { return m.rope; }, function (m) { return m.paper || m.elbow; }].forEach(function (want) {
      material.forEach(function (m, r) {
        if (!want(m) || !defFocus.length) return;
        if (defFocus.some(function (f) { return roundFocus[r] && f.id === roundFocus[r].id; })) return;
        const prev = roundFocus[r - 1], next = roundFocus[r + 1];
        const opts = defFocus.filter(function (f) { return (!prev || prev.id !== f.id) && (!next || next.id !== f.id); });
        if (opts.length) {
          roundFocus[r] = opts[defTurn % opts.length];
          defTurn++;
          return;
        }
        // Sin hueco: se intercambia el foco con otra ronda que ya tenga uno de defensa (que no sea
        // de cuerda), si el cambio no deja dos rondas seguidas con el mismo foco.
        const fits = function (pos, f) {
          return (!roundFocus[pos - 1] || pos - 1 === r || roundFocus[pos - 1].id !== f.id) &&
            (!roundFocus[pos + 1] || pos + 1 === r || roundFocus[pos + 1].id !== f.id);
        };
        for (let q = 0; q < n; q++) {
          if (q === r || Math.abs(q - r) === 1 || material[q].rope || !roundFocus[q]) continue;
          if (!defFocus.some(function (f) { return f.id === roundFocus[q].id; })) continue;
          if (!fits(r, roundFocus[q]) || !fits(q, roundFocus[r])) continue;
          const t = roundFocus[q]; roundFocus[q] = roundFocus[r]; roundFocus[r] = t;
          return;
        }
        // Papel o toalla: la petición del usuario (defensas y pasos, no solo jab) pesa más que no
        // repetir el foco de la ronda de al lado.
        if (m.paper || m.elbow) {
          const half = defFocus.filter(function (f) { return (!prev || prev.id !== f.id) || (!next || next.id !== f.id); });
          roundFocus[r] = (half.length ? half : defFocus)[0];
        }
      });
    });

    // Rondas
    const rounds = [];
    const J = n * ipr;
    let gi = 0;
    for (let r = 0; r < n; r++) {
      const focus = roundFocus[r];
      const lockRound = !!(material[r].paper || material[r].elbow);
      const allow = lockRound ? allowPaper : (material[r].rope ? allowRope : null);
      // Brazo atrasado fijo: todo variación y sin repetir combinación en la ronda; las generadas
      // solo con técnicas válidas y con prioridad para las que llevan defensa o desplazamiento.
      const lead = lockRound ? { roundUsed: new Set(), allowMove: allowPaper.move, boost: leadRoundBoost, boostMax: 3, genProb: 0.6 } : null;
      const nRep = lockRound ? 0 : reps[r];
      const nVar = ipr - nRep;
      const repEntries = [];
      const ivs = [];
      let vi = 0;
      for (let i = 0; i < ipr; i++) {
        const mode = i < nRep ? 'repeticion' : 'variacion';
        const progress = J > 1 ? gi / (J - 1) : 0;
        let target = L.cStart + (L.cEnd - L.cStart) * progress + P.shift;
        if (mode === 'repeticion') target -= 0.25;
        target = SB.util.clamp(target, 1, L.cMax);
        const dur = struct.intervals[r][i];
        let combos = [];
        if (mode === 'repeticion') {
          const e = SB.selector.pick(ctx, { mode: mode, focus: focus, target: target, allow: allow });
          if (e) {
            SB.selector.commit(ctx, e, mode);
            combos = [mkCombo(e, 0, dur)];
            repEntries.push(e);
          }
        } else {
          const transfers = repEntries.filter(function (_, k) { return nVar > 0 && k % nVar === vi; });
          combos = fillVariation(ctx, { focus: focus, target: target, dur: dur, transfers: transfers, comboTime: comboTime, allow: allow, lead: lead });
          vi++;
        }
        ivs.push({ interval: i + 1, mode: mode, focus: focus, tempo: tempoFor(goal, focus, mode, progress), duration: dur, combos: combos });
        gi++;
      }
      rounds.push(ivs);
    }

    // Novedad: primera aparición de destacados o poco habituales
    const featuredSet = new Set(featured);
    const seen = new Set();
    rounds.forEach(function (ivs) {
      ivs.forEach(function (iv) {
        iv.combos.forEach(function (c) {
          const ids = Array.from(new Set(c.seq)).filter(function (id) {
            return !seen.has(id) && (featuredSet.has(id) || snap.isRare(id));
          });
          c.newIds = ids;
          c.isNew = ids.length > 0;
          c.seq.forEach(function (id) { seen.add(id); });
        });
      });
    });

    // Línea de tiempo
    const timeline = [];
    const blocks = [];
    let t = 0;
    const push = function (seg) { seg.start = t; timeline.push(seg); t += seg.duration; return seg; };
    const nextBoxing = function (r) {
      const iv = rounds[r] && rounds[r][0];
      const first = iv && iv.combos[0];
      const f = roundFocus[r];
      return {
        type: 'boxing', title: 'Ronda ' + (r + 1) + ' · ' + (f ? f.name : ''),
        detail: first ? SB.notation.text(first.seq, { stance: stance }) : '',
        // CONTRATO: añadidos para que la UI pueda dibujar fichas.
        seq: first ? first.seq.slice() : [], focusId: f ? f.id : null, mode: iv ? iv.mode : null, round: r + 1,
        material: material[r] ? Object.assign({}, material[r]) : null
      };
    };
    const longIdx = longRestIndex(n);
    push({ type: 'prepare', block: 0, duration: PREPARE_SEC, label: 'Preparación', next: nextBoxing(0) });
    for (let b = 0; b < n; b++) {
      const f = roundFocus[b];
      const intervals = rounds[b].map(function (iv) {
        return push({
          type: 'boxing', block: b, duration: iv.duration,
          round: b + 1, roundsTotal: n, interval: iv.interval, intervalsTotal: ipr,
          mode: iv.mode, focusId: f.id, focusName: f.name, tempo: iv.tempo, combos: iv.combos,
          material: Object.assign({}, material[b])
        });
      });
      let hiit = null;
      const ex = hiitPlan[b];
      if (P.hiitSec > 0 && ex) {
        push({
          type: 'transition', block: b, duration: TRANSITION_SEC, label: 'Prepárate',
          // CONTRATO: añadido. La ronda anterior era con mancuernas: hay que dejarlas.
          dropDumbbells: !!material[b].dumbbells,
          // CONTRATO: añadido. La ronda anterior era con la goma en los tobillos: hay que quitarla.
          removeAnkles: !!material[b].ankles,
          next: { type: 'hiit', title: ex.name, detail: (CATEGORY_NAME[ex.category] || ex.category) + (ex.note ? ' · ' + ex.note : ''), category: ex.category, exerciseId: ex.id }
        });
        const hm = (settings.equipRope && ROPE_DRILLS.indexOf(ex.id) !== -1) ? Object.assign(emptyMaterial(), { rope: true }) : null;
        hiit = push({
          type: 'hiit', block: b, duration: P.hiitSec, category: ex.category, label: 'HIIT · ' + String(ex.category).toUpperCase(),
          exercise: { id: ex.id, name: ex.name, demand: ex.demand, pattern: ex.pattern, note: ex.note || '', impact: ex.impact || null },
          // CONTRATO: añadido. Material del ejercicio (la cuerda de esquivas, si está puesta).
          material: hm
        });
      }
      let rest = null;
      if (b < n - 1) {
        const isLong = b === longIdx;
        const d = P.restSec + (isLong ? LONG_REST_EXTRA : 0);
        if (d > 0) rest = push({ type: 'rest', block: b, duration: d, label: isLong ? 'Descanso largo' : 'Descanso', long: isLong, next: nextBoxing(b + 1) });
      }
      blocks.push({ index: b, intervals: intervals, hiit: hiit, rest: rest, focusId: f.id, focusName: f.name, material: Object.assign({}, material[b]) });
    }

    // Bloque final de abdomen
    let finisher = null;
    if (coreList.length && P.hiitSec > 0) {
      const coreNext = function (k) {
        const cx = coreList[k];
        return {
          type: 'hiit', title: cx.name, detail: 'Abdomen ' + (k + 1) + '/' + coreList.length + (cx.note ? ' · ' + cx.note : ''),
          category: cx.category, exerciseId: cx.id, finisher: true
        };
      };
      finisher = { rest: null, segments: [] };
      if (P.restSec > 0) {
        finisher.rest = push({ type: 'rest', block: n, duration: P.restSec, label: 'Descanso', long: false, finisher: true, next: coreNext(0) });
      }
      coreList.forEach(function (cx, k) {
        push({ type: 'transition', block: n, duration: TRANSITION_SEC, label: 'Prepárate', finisher: true, next: coreNext(k) });
        finisher.segments.push(push({
          type: 'hiit', block: n, duration: P.hiitSec, category: cx.category, label: 'ABDOMEN · ' + (k + 1) + '/' + coreList.length,
          finisher: true, finisherIndex: k + 1, finisherTotal: coreList.length,
          exercise: { id: cx.id, name: cx.name, demand: cx.demand, pattern: cx.pattern, note: cx.note || '', impact: cx.impact || null }
        }));
      });
    }

    // Notas de biblioteca pequeña
    const eligibleCount = SB.library.personal().filter(function (m) { return SB.library.eligibleAtLevel(m.id, level); }).length;
    if (ctx.flags.forcedReuse > 0 || ctx.flags.singles > 0 || ctx.flags.empty > 0 || ctx.pool.length < 8 || eligibleCount < 5) {
      notes.push(SMALL_LIBRARY_NOTE);
    }

    const fp = fingerprintOf(timeline);
    return {
      id: SB.util.uid('s'),
      seed: input.baseSeed,
      createdAt: new Date().toISOString(),
      title: goal.name || goal.short || 'Sesión',
      goalId: goal.id,
      level: level,
      durationMin: input.durationMin,
      totalSec: t,
      notes: notes,
      featuredNew: featured.filter(function (id) { return seen.has(id); }),
      blocks: blocks,
      // CONTRATO: añadidos. Bloque final de abdomen ({rest, segments} o null) y material por ronda.
      finisher: finisher,
      material: material,
      timeline: timeline,
      // CONTRATO: añadidos.
      variantSeed: seed,
      goalName: goal.name || '',
      params: { intervalSec: P.intervalSec, intervalsPerRound: ipr, restSec: P.restSec, hiitSec: P.hiitSec, repRatio: P.repRatio, hiitDemand: P.hiitDemand },
      fingerprint: fp,
      stats: { generated: ctx.flags.generated, poolSize: ctx.pool.length, relaxedFocus: ctx.flags.relaxedFocus, forcedReuse: ctx.flags.forcedReuse }
    };
  }

  /** Huella: firmas de combinaciones + 'h:' ids HIIT (§6.4). */
  function fingerprintOf(timeline, untilSec) {
    const set = new Set();
    timeline.forEach(function (seg) {
      if (untilSec != null && seg.start >= untilSec) return;
      if (seg.type === 'boxing') {
        seg.combos.forEach(function (c) {
          if (untilSec != null && seg.start + c.start >= untilSec) return;
          set.add(c.signature);
        });
      } else if (seg.type === 'hiit' && seg.exercise) {
        set.add('h:' + seg.exercise.id);
      }
    });
    return Array.from(set);
  }

  /**
   * Genera una sesión.
   * @param {{durationMin?, level?, goalId?, seed?, custom?: {intervalSec, intervalsPerRound, restSec,
   *          hiitSec, repRatio, focusMovementIds: string[], focuses: string[]}}} opts
   * @returns {object} sesión (§7.1)
   */
  function generate(opts) {
    const o = opts || {};
    const settings = SB.storage.getSettings();
    const level = (o.level || settings.lastLevel) === 'avanzado' ? 'avanzado' : 'basico';
    const durationMin = Math.max(1, Number(o.durationMin) || Number(settings.lastDuration) || 30);
    const goal = findGoal(o.goalId || settings.lastGoal);
    const baseSeed = o.seed != null ? o.seed : ((Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0);
    const snap = SB.history.snapshot();
    const input = { level: level, durationMin: durationMin, goal: goal, settings: settings, custom: o.custom || null, baseSeed: baseSeed };

    let best = null;
    let tries = 0;
    for (let k = 0; k < MAX_ATTEMPTS; k++) {
      const seedK = k === 0 ? baseSeed : SB.util.hashString(String(baseSeed) + ':' + k);
      const s = build(input, seedK, snap);
      tries++;
      s.similarity = Math.round(snap.similarity(s.fingerprint) * 1000) / 1000;
      if (!best || s.similarity < best.similarity) best = s;
      if (s.similarity <= SIMILARITY_MAX) break;
    }
    // CONTRATO: añadido. Nº de semillas probadas (1 = no hizo falta regenerar).
    best.attempts = tries;
    return best;
  }

  /** Segundos de boxeo + HIIT entre 0 y untilSec. */
  function activeUntil(session, untilSec) {
    let a = 0;
    (session.timeline || []).forEach(function (seg) {
      if (seg.type !== 'boxing' && seg.type !== 'hiit') return;
      const end = Math.min(seg.start + seg.duration, untilSec);
      if (end > seg.start) a += end - seg.start;
    });
    return a;
  }

  /**
   * Registro de historial (§7.2) a partir de una sesión reproducida.
   * Solo cuenta lo que empezó antes de `completedSec`.
   * @param {object} session
   * @param {{completedSec?, activeSec?, completed?, date?}} info
   */
  function toRecord(session, info) {
    const i = info || {};
    const total = session.totalSec || 0;
    const completed = !!i.completed;
    const completedSec = isNum(i.completedSec) ? Math.max(0, Math.min(i.completedSec, total)) : total;
    const combos = [];
    const movements = {};
    const hiit = [];
    const focusesDone = [];
    let hiitStart = null;
    (session.timeline || []).forEach(function (seg) {
      if (seg.type === 'hiit' && seg.category && !hiitStart) hiitStart = seg.category;
      if (seg.start >= completedSec) return;
      if (seg.type === 'boxing') {
        if (seg.interval === 1) focusesDone.push(seg.focusId); // un foco por ronda empezada
        (seg.combos || []).forEach(function (c) {
          if (seg.start + c.start >= completedSec) return;
          combos.push(c.signature);
          c.seq.forEach(function (id) { movements[id] = (movements[id] || 0) + 1; });
        });
      } else if (seg.type === 'hiit' && seg.exercise) {
        hiit.push(seg.exercise.id);
      }
    });
    const date = i.date ? new Date(i.date) : new Date();
    return {
      id: session.id,
      date: date.toISOString(),
      dayKey: SB.util.dayKey(date),
      goalId: session.goalId,
      level: session.level,
      durationMin: session.durationMin,
      plannedSec: total,
      completedSec: completedSec,
      activeSec: isNum(i.activeSec) ? i.activeSec : activeUntil(session, completedSec),
      completed: completed,
      combos: combos,
      movements: movements,
      hiit: hiit,
      hiitStart: hiitStart,
      focuses: focusesDone,
      // Brazo atrasado fijo de la sesión ('paper' | 'elbow' | null): la siguiente usa el otro.
      lock: lockOf(session.material),
      fingerprint: fingerprintOf(session.timeline || [], completed ? null : completedSec)
    };
  }

  SB.session = {
    LEVELS: LEVELS,
    PREPARE_SEC: PREPARE_SEC,
    TRANSITION_SEC: TRANSITION_SEC,
    SMALL_LIBRARY_NOTE: SMALL_LIBRARY_NOTE,
    generate: generate,
    availableGoals: availableGoals,
    toRecord: toRecord,
    // CONTRATO: añadidos.
    fingerprint: function (session) { return fingerprintOf(session.timeline || []); },
    fitStructure: fitStructure,
    allocateModes: allocateModes
  };
})(window.SB = window.SB || {});
