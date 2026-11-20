/**
 * SOMBRA · js/core/util.js
 * ---------------------------------------------------------------------------
 * Utilidades puras y sin DOM compartidas por todos los módulos:
 *  - Generador pseudoaleatorio determinista (mulberry32) con helpers de
 *    selección ponderada, mezcla y orden ponderado sin reemplazo.
 *  - Hash de cadenas (FNV-1a 32 bits), identificadores únicos.
 *  - Fechas locales en formato 'YYYY-MM-DD' (dayKey) y aritmética de días.
 *  - Clonado profundo de datos JSON y similitud de Jaccard.
 *
 * Funciona en navegador (file:// o http) y en Node (vm con `window` simulado).
 * Este archivo se carga el primero: también inicializa `SB.data` para que los
 * archivos de datos puedan hacer `SB.data.movements = [...]` sin más.
 */
(function (SB) {
  'use strict';

  // CONTRATO: util.js garantiza que exista el contenedor SB.data.
  SB.data = SB.data || {};

  /** Hash FNV-1a de 32 bits (entero sin signo) de cualquier valor convertido a texto. */
  function hashString(str) {
    const s = String(str);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  /** Núcleo mulberry32: devuelve una función que produce números en [0, 1). */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Convierte cualquier semilla (número, texto, null) en un entero de 32 bits. */
  function seedToInt(seed) {
    if (typeof seed === 'number' && Number.isInteger(seed)) return seed >>> 0;
    if (seed == null) return hashString(String(Date.now()) + ':' + Math.random());
    return hashString(String(seed));
  }

  /**
   * Generador determinista.
   * @param {number|string} seed
   * @returns {{seed:number, next:Function, int:Function, pick:Function, weighted:Function,
   *            shuffle:Function, weightedOrder:Function, fork:Function}}
   */
  function rng(seed) {
    const s = seedToInt(seed);
    const next = mulberry32(s);
    const api = {
      seed: s,
      /** Número en [0, 1). */
      next: next,
      /** Entero en [a, b] (ambos incluidos). */
      int: function (a, b) { return a + Math.floor(next() * (b - a + 1)); },
      /** Elemento aleatorio del array (undefined si está vacío). */
      pick: function (arr) {
        if (!arr || !arr.length) return undefined;
        return arr[Math.floor(next() * arr.length)];
      },
      /**
       * Elección ponderada. weightFn(item) -> peso ≥ 0 (por defecto item.weight ?? 1).
       * Devuelve null si no hay elementos con peso positivo.
       */
      weighted: function (items, weightFn) {
        if (!items || !items.length) return null;
        const fn = weightFn || function (it) { return it && it.weight != null ? it.weight : 1; };
        const ws = new Array(items.length);
        let total = 0;
        for (let i = 0; i < items.length; i++) {
          const w = Number(fn(items[i], i));
          ws[i] = w > 0 && isFinite(w) ? w : 0;
          total += ws[i];
        }
        if (!(total > 0)) return null;
        let r = next() * total;
        for (let i = 0; i < items.length; i++) {
          r -= ws[i];
          if (r < 0 && ws[i] > 0) return items[i];
        }
        for (let i = items.length - 1; i >= 0; i--) if (ws[i] > 0) return items[i];
        return null;
      },
      /** Copia mezclada (Fisher-Yates); no modifica el array original. */
      shuffle: function (arr) {
        const a = (arr || []).slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(next() * (i + 1));
          const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
      },
      // CONTRATO: añadido. Orden ponderado sin reemplazo (Efraimidis-Spirakis);
      // omite los elementos con peso 0. Útil para backtracking.
      weightedOrder: function (items, weightFn) {
        const keyed = [];
        for (let i = 0; i < (items || []).length; i++) {
          const w = Number(weightFn ? weightFn(items[i], i) : 1);
          if (!(w > 0) || !isFinite(w)) continue;
          const u = Math.max(next(), 1e-12);
          keyed.push({ k: -Math.log(u) / w, v: items[i] });
        }
        keyed.sort(function (x, y) { return x.k - y.k; });
        return keyed.map(function (x) { return x.v; });
      },
      // CONTRATO: añadido. Subgenerador independiente y reproducible.
      fork: function (label) { return rng(hashString(s + ':' + label)); }
    };
    return api;
  }

  let uidCounter = 0;
  /** Identificador único legible: '<prefijo>_<tiempo><contador><azar>'. */
  function uid(prefix) {
    uidCounter = (uidCounter + 1) % 1679616;
    return (prefix || 'id') + '_' + Date.now().toString(36) +
      uidCounter.toString(36) + Math.floor(Math.random() * 1679616).toString(36);
  }

  /** Limita v al rango [a, b]. */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /** Segundos → 'm:ss' (redondeo hacia arriba: pensado para cuentas atrás). */
  function fmtTime(sec) {
    let s = Math.ceil(Math.max(0, Number(sec) || 0) - 1e-6);
    if (s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** Fecha (Date, ISO o timestamp) → 'YYYY-MM-DD' en hora local. */
  function dayKey(date) {
    let d = date == null ? new Date() : (date instanceof Date ? date : new Date(date));
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
    if (isNaN(d.getTime())) d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  // CONTRATO: añadido. 'YYYY-MM-DD' → Date local a mediodía (evita saltos por horario de verano).
  function parseDayKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  }

  // CONTRATO: añadido. Suma n días a una dayKey.
  function addDays(key, n) {
    const d = parseDayKey(key);
    if (!d) return null;
    d.setDate(d.getDate() + n);
    return dayKey(d);
  }

  // CONTRATO: añadido. Días enteros de a hasta b (b - a).
  function daysBetween(a, b) {
    const da = parseDayKey(a), db = parseDayKey(b);
    if (!da || !db) return NaN;
    return Math.round((db.getTime() - da.getTime()) / 86400000);
  }

  /** Clonado profundo de datos serializables en JSON. */
  function deepClone(obj) {
    if (obj === undefined) return undefined;
    return JSON.parse(JSON.stringify(obj));
  }

  // CONTRATO: añadido. Similitud de Jaccard entre dos colecciones (arrays o Sets).
  function jaccard(a, b) {
    const A = a instanceof Set ? a : new Set(a || []);
    const B = b instanceof Set ? b : new Set(b || []);
    if (!A.size && !B.size) return 0;
    let inter = 0;
    A.forEach(function (x) { if (B.has(x)) inter++; });
    return inter / (A.size + B.size - inter);
  }

  // CONTRATO: añadido. Texto → identificador en minúsculas sin acentos.
  function slug(str) {
    return String(str || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'x';
  }

  SB.util = {
    rng: rng,
    hashString: hashString,
    uid: uid,
    clamp: clamp,
    fmtTime: fmtTime,
    dayKey: dayKey,
    deepClone: deepClone,
    parseDayKey: parseDayKey,
    addDays: addDays,
    daysBetween: daysBetween,
    jaccard: jaccard,
    slug: slug
  };
})(window.SB = window.SB || {});
