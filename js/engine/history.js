/**
 * SOMBRA · js/engine/history.js
 * ---------------------------------------------------------------------------
 * Historial local de sesiones entrenadas (§6.4, §7.2) y métricas de memoria
 * que usa el motor para la variedad:
 *
 *  - Solo se registran sesiones entrenadas: terminadas o con ≥ 5 min de trabajo
 *    activo. Se guardan las 200 últimas (la más antigua sale primero).
 *  - Recencia de una combinación: r = Σ_{k=0..9} usos_en_sesión_k · 0,7^k
 *    (k = 0 la sesión más reciente).
 *  - Recencia HIIT: usos en las 3 últimas sesiones.
 *  - Exposición de movimientos: Σ usos · 0,85^k (decaimiento por antigüedad).
 *  - Similitud de una huella: Jaccard máxima con las 10 últimas sesiones.
 *
 * all() devuelve las sesiones de la más antigua a la más reciente;
 * recent(n) devuelve las n más recientes empezando por la última.
 * snapshot() precalcula todo una vez (lo usa el generador de sesiones).
 */
(function (SB) {
  'use strict';

  const MAX_RECORDS = 200;
  const MIN_ACTIVE_SEC = 300;
  const RECENCY_DECAY = 0.7;
  const RECENCY_WINDOW = 10;
  const EXPOSURE_DECAY = 0.85;
  const HIIT_WINDOW = 3;
  const SIMILARITY_WINDOW = 10;
  const RARE_WINDOW = 5;

  let snapCache = { rev: -1, snap: null };

  function load() {
    const h = SB.storage.get('history', []);
    return Array.isArray(h) ? h.filter(function (r) { return r && typeof r === 'object'; }) : [];
  }

  /** Todas las sesiones (de la más antigua a la más reciente). */
  function all() { return load(); }

  /** Las n sesiones más recientes (la primera es la última entrenada). */
  function recent(n) {
    const h = load();
    const k = n == null ? 10 : Math.max(0, n);
    return h.slice(Math.max(0, h.length - k)).reverse();
  }

  /** ¿Cuenta como sesión entrenada? */
  function qualifies(rec) {
    return !!rec && (rec.completed === true || Number(rec.activeSec) >= MIN_ACTIVE_SEC);
  }

  /**
   * Registra una sesión (§7.2). Ignora las que no cuentan como entrenadas.
   * @returns {boolean} true si se guardó
   */
  function record(rec) {
    if (!qualifies(rec)) return false;
    const h = load();
    if (rec.id && h.some(function (r) { return r.id === rec.id; })) {
      // Misma sesión registrada dos veces (p. ej. salir y terminar): se sustituye.
      for (let i = 0; i < h.length; i++) if (h[i].id === rec.id) h[i] = rec;
    } else {
      h.push(rec);
    }
    while (h.length > MAX_RECORDS) h.shift();
    SB.storage.set('history', h);
    return true;
  }

  /** Borra el historial. */
  function clear() { SB.storage.set('history', []); }

  /**
   * Métricas precalculadas (se recalculan solo si cambió el almacenamiento).
   * CONTRATO: añadido para eficiencia del motor.
   */
  function snapshot() {
    const rev = SB.storage.rev();
    if (snapCache.snap && snapCache.rev === rev) return snapCache.snap;
    const records = load().slice().reverse(); // más reciente primero
    const recency = new Map();
    const hiitRecent = new Map();
    const exposure = {};
    const uses = {};
    const inLastRare = new Set();
    const lastGoal = {};
    const fingerprints = [];

    records.forEach(function (r, k) {
      if (k < RECENCY_WINDOW) {
        const f = Math.pow(RECENCY_DECAY, k);
        (r.combos || []).forEach(function (sig) { recency.set(sig, (recency.get(sig) || 0) + f); });
      }
      if (k < HIIT_WINDOW) {
        (r.hiit || []).forEach(function (id) { hiitRecent.set(id, (hiitRecent.get(id) || 0) + 1); });
      }
      const ef = Math.pow(EXPOSURE_DECAY, k);
      const mv = r.movements || {};
      Object.keys(mv).forEach(function (id) {
        const n = Number(mv[id]) || 0;
        exposure[id] = (exposure[id] || 0) + n * ef;
        uses[id] = (uses[id] || 0) + n;
        if (k < RARE_WINDOW && n > 0) inLastRare.add(id);
      });
      if (r.goalId && !lastGoal[r.goalId]) lastGoal[r.goalId] = r.date || null;
      if (k < SIMILARITY_WINDOW) fingerprints.push(new Set(r.fingerprint || []));
    });

    const snap = {
      count: records.length,
      records: records,
      comboRecency: function (sig) { return recency.get(sig) || 0; },
      hiitRecency: function (id) { return hiitRecent.get(id) || 0; },
      exposure: exposure,
      uses: uses,
      /** «Poco habitual» (§6.3): no aparece en las 5 últimas y se ha usado < 3 veces.
       *  Solo se evalúa con ≥5 sesiones registradas: sin historial todo parecería raro. */
      isRare: function (id) { return records.length >= 5 && !inLastRare.has(id) && (uses[id] || 0) < 3; },
      lastHiitStart: records.length ? (records[0].hiitStart || null) : null,
      lastGoalDate: function (goalId) { return lastGoal[goalId] || null; },
      similarity: function (fp) {
        const A = new Set(fp || []);
        let max = 0;
        fingerprints.forEach(function (B) { max = Math.max(max, SB.util.jaccard(A, B)); });
        return max;
      }
    };
    snapCache = { rev: rev, snap: snap };
    return snap;
  }

  SB.history = {
    MAX_RECORDS: MAX_RECORDS,
    MIN_ACTIVE_SEC: MIN_ACTIVE_SEC,
    all: all,
    recent: recent,
    record: record,
    clear: clear,
    /** Recencia ponderada de una combinación (por firma). */
    comboRecency: function (signature) { return snapshot().comboRecency(signature); },
    /** Usos de un ejercicio HIIT en las 3 últimas sesiones. */
    hiitRecency: function (id) { return snapshot().hiitRecency(id); },
    /** Exposición acumulada con decaimiento: { id: número }. */
    movementExposure: function () { return Object.assign({}, snapshot().exposure); },
    /** Fecha ISO de la última sesión de ese objetivo (o null). */
    lastGoalDate: function (goalId) { return snapshot().lastGoalDate(goalId); },
    /** Similitud de Jaccard máxima de la huella con las 10 últimas sesiones. */
    similarity: function (fingerprint) { return snapshot().similarity(fingerprint); },
    /** Categoría con la que empezó el HIIT de la última sesión. */
    lastHiitStart: function () { return snapshot().lastHiitStart; },
    // CONTRATO: añadidos.
    snapshot: snapshot,
    qualifies: qualifies
  };
})(window.SB = window.SB || {});
