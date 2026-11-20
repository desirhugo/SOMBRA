/**
 * SOMBRA · js/core/storage.js
 * ---------------------------------------------------------------------------
 * Persistencia local con prefijo 'sb.' y valores JSON.
 *
 *  - Usa `localStorage` si existe y funciona; si no (modo privado, file://
 *    restringido, Node sin simulación) cae a un almacén en memoria.
 *  - Para pruebas se puede inyectar un almacén propio antes de cargar el módulo:
 *    `window.SB = { config: { storage: objetoConGetItemSetItem } }`.
 *  - Versión de esquema (`SCHEMA_VERSION`) con migraciones al arrancar y al importar.
 *  - Exportar / importar todo (copia de seguridad) y reinicio completo.
 *  - `rev()` devuelve un contador que cambia con cada escritura: los módulos lo
 *    usan para invalidar sus cachés sin volver a parsear JSON en cada lectura.
 *
 * Claves conocidas: 'library', 'history', 'calendar', 'settings', 'hiitPrefs',
 * 'customPresets', 'onboarded', 'schema'.
 */
(function (SB) {
  'use strict';

  const PREFIX = 'sb.';
  const SCHEMA_VERSION = 1;
  const KEYS = ['library', 'history', 'calendar', 'settings', 'hiitPrefs', 'customPresets', 'onboarded', 'schema'];

  /** Ajustes por defecto (§8.2). */
  const DEFAULT_SETTINGS = {
    stance: 'diestro', sound: true, volume: 0.7, countdownTicks: true, showNext: true, autoDemo: true, showFigure: true,
    hiitDemand: 'alta', restSec: 30, changePace: 'normal', theme: 'oscuro', keepAwake: true,
    lastLevel: 'basico', lastDuration: 30, lastGoal: 'completo',
    // Material (activado por defecto desde el 15-nov-2026): pelota bajo la barbilla, papel en la mejilla,
    // mancuernas de 1 kg, comba como cuerda de esquivas, cinta en el suelo, goma en los tobillos,
    // pelota de tenis colgada y toalla bajo el codo. Análisis por cámara activado por defecto.
    equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7,
    equipRope: true, equipTape: true, equipAnkles: true, equipHangBall: true, equipElbow: true,
    cameraAnalysis: true, voiceCues: true, cameraPreview: true,
    // Cámara elegida en Ajustes ('' = automática) y la última que funcionó (se prueba primero).
    cameraId: '', cameraLastId: ''
  };

  /** Almacén en memoria con la misma interfaz que localStorage. */
  function MemoryStorage() { this._m = Object.create(null); }
  MemoryStorage.prototype.getItem = function (k) { return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null; };
  MemoryStorage.prototype.setItem = function (k, v) { this._m[k] = String(v); };
  MemoryStorage.prototype.removeItem = function (k) { delete this._m[k]; };
  MemoryStorage.prototype.key = function (i) { return Object.keys(this._m)[i] || null; };
  MemoryStorage.prototype.clear = function () { this._m = Object.create(null); };
  Object.defineProperty(MemoryStorage.prototype, 'length', { get: function () { return Object.keys(this._m).length; } });

  /** Elige el almacén: inyectado → localStorage operativo → memoria. */
  function pickBackend() {
    const cfg = SB.config && SB.config.storage;
    if (cfg && typeof cfg.getItem === 'function' && typeof cfg.setItem === 'function') {
      return { store: cfg, kind: 'custom' };
    }
    try {
      let ls = null;
      if (typeof window !== 'undefined' && window.localStorage) ls = window.localStorage;
      else if (typeof localStorage !== 'undefined') ls = localStorage; // eslint-disable-line no-undef
      if (ls) {
        const probe = PREFIX + '__probe__';
        ls.setItem(probe, '1');
        ls.removeItem(probe);
        return { store: ls, kind: 'localStorage' };
      }
    } catch (e) { /* acceso denegado: seguimos con memoria */ }
    return { store: new MemoryStorage(), kind: 'memory' };
  }

  const backend = pickBackend();
  const overlay = new MemoryStorage(); // escrituras que el almacén real rechazó (cuota llena)
  let revision = 0;

  function bump() { revision++; }

  function rawGet(fullKey) {
    const o = overlay.getItem(fullKey);
    if (o !== null) return o;
    try { return backend.store.getItem(fullKey); } catch (e) { return null; }
  }

  function rawSet(fullKey, str) {
    try {
      backend.store.setItem(fullKey, str);
      overlay.removeItem(fullKey);
      return true;
    } catch (e) {
      overlay.setItem(fullKey, str);
      if (typeof console !== 'undefined') console.warn('[SB.storage] No se pudo guardar en localStorage; se mantiene en memoria:', fullKey);
      return false;
    }
  }

  function rawRemove(fullKey) {
    overlay.removeItem(fullKey);
    try { backend.store.removeItem(fullKey); } catch (e) { /* ignorar */ }
  }

  /** Claves (sin prefijo) presentes en el almacén. */
  function listKeys() {
    const out = new Set();
    try {
      const n = backend.store.length;
      const all = [];
      for (let i = 0; i < n; i++) all.push(backend.store.key(i));
      all.forEach(function (k) { if (k && k.indexOf(PREFIX) === 0 && k !== PREFIX + '__probe__') out.add(k.slice(PREFIX.length)); });
    } catch (e) { /* ignorar */ }
    Object.keys(overlay._m).forEach(function (k) { if (k.indexOf(PREFIX) === 0) out.add(k.slice(PREFIX.length)); });
    return Array.from(out);
  }

  /**
   * Lee una clave. Devuelve `fallback` si no existe o el JSON está dañado.
   * Cada llamada devuelve una copia nueva (se puede modificar sin efectos).
   */
  function get(key, fallback) {
    const raw = rawGet(PREFIX + key);
    if (raw === null || raw === undefined) return fallback === undefined ? null : fallback;
    try { return JSON.parse(raw); } catch (e) { return fallback === undefined ? null : fallback; }
  }

  /** Guarda un valor serializable. Devuelve true si quedó en almacenamiento persistente. */
  function set(key, value) {
    bump();
    if (value === undefined) { rawRemove(PREFIX + key); return true; }
    return rawSet(PREFIX + key, JSON.stringify(value));
  }

  /** Borra una clave. */
  function remove(key) { bump(); rawRemove(PREFIX + key); }

  // ---------------------------------------------------------------------------
  // Migraciones de esquema. MIGRATIONS[v] transforma datos de la versión v a v+1.
  // ---------------------------------------------------------------------------

  /** Normaliza la forma del objeto de biblioteca (v1). */
  function normalizeLibrary(lib) {
    const nowIso = new Date().toISOString();
    if (Array.isArray(lib)) {
      const m = {};
      lib.forEach(function (id) { if (typeof id === 'string') m[id] = { status: 'aprendido', addedAt: nowIso }; });
      lib = { movements: m };
    }
    if (!lib || typeof lib !== 'object') lib = {};
    const out = {
      movements: lib.movements && typeof lib.movements === 'object' && !Array.isArray(lib.movements) ? lib.movements : {},
      custom: Array.isArray(lib.custom) ? lib.custom : [],
      edits: lib.edits && typeof lib.edits === 'object' ? lib.edits : {},
      combos: Array.isArray(lib.combos) ? lib.combos : []
    };
    Object.keys(out.movements).forEach(function (id) {
      const e = out.movements[id];
      if (typeof e === 'string') out.movements[id] = { status: e, addedAt: nowIso };
      else if (!e || typeof e !== 'object') out.movements[id] = { status: 'aprendido', addedAt: nowIso };
    });
    return out;
  }

  const MIGRATIONS = {
    // 0 → 1: datos anteriores al control de versiones (formas sueltas).
    0: function (d) {
      if (d.library !== undefined) d.library = normalizeLibrary(d.library);
      if (Array.isArray(d.calendar)) d.calendar = { days: d.calendar };
      if (d.calendar && !Array.isArray(d.calendar.days)) d.calendar = { days: [] };
      if (d.history !== undefined && !Array.isArray(d.history)) d.history = [];
      return d;
    }
  };

  /** Aplica las migraciones necesarias a un objeto {clave: valor}. */
  function migrateData(data, fromVersion) {
    let v = Number(fromVersion) || 0;
    while (v < SCHEMA_VERSION) {
      const fn = MIGRATIONS[v];
      if (fn) data = fn(data) || data;
      v++;
    }
    data.schema = SCHEMA_VERSION;
    return data;
  }

  /** Migración al arrancar: lee todo, migra y reescribe si la versión es antigua. */
  function initSchema() {
    const keys = listKeys().filter(function (k) { return k !== 'schema'; });
    const current = get('schema', null);
    if (current === null && !keys.length) { set('schema', SCHEMA_VERSION); return; }
    const from = current === null ? 0 : Number(current);
    if (from >= SCHEMA_VERSION) return; // igual o más nuevo: no se toca
    const data = {};
    keys.forEach(function (k) { data[k] = get(k, null); });
    const migrated = migrateData(data, from);
    Object.keys(migrated).forEach(function (k) { set(k, migrated[k]); });
  }

  /** Copia de seguridad completa: { app, format, schema, exportedAt, data: {clave: valor} }. */
  function exportAll() {
    const data = {};
    listKeys().forEach(function (k) { data[k] = get(k, null); });
    data.schema = SCHEMA_VERSION;
    return { app: 'SOMBRA', format: 'sombra-backup', schema: SCHEMA_VERSION, exportedAt: new Date().toISOString(), data: data };
  }

  /** Borra todos los datos de SOMBRA (solo claves con el prefijo 'sb.'). */
  function resetAll() {
    listKeys().forEach(function (k) { rawRemove(PREFIX + k); });
    set('schema', SCHEMA_VERSION);
  }

  /**
   * Importa una copia (objeto o texto JSON) y SUSTITUYE los datos actuales.
   * Acepta el formato de exportAll() o un objeto plano {clave: valor}.
   * Lanza Error si el contenido no es una copia válida (sin tocar los datos).
   * @returns {{ok: true, keys: string[]}}
   */
  function importAll(obj) {
    let src = obj;
    if (typeof src === 'string') {
      try { src = JSON.parse(src); } catch (e) { throw new Error('El archivo no es una copia válida de SOMBRA (JSON dañado).'); }
    }
    if (!src || typeof src !== 'object' || Array.isArray(src)) throw new Error('El archivo no es una copia válida de SOMBRA.');
    const data = src.data && typeof src.data === 'object' && !Array.isArray(src.data) ? src.data : src;
    const known = Object.keys(data).filter(function (k) { return KEYS.indexOf(k) !== -1; });
    if (!known.filter(function (k) { return k !== 'schema'; }).length) {
      throw new Error('La copia no contiene datos de SOMBRA.');
    }
    const version = Number(src.schema != null ? src.schema : (data.schema != null ? data.schema : 0)) || 0;
    const subset = {};
    known.forEach(function (k) { subset[k] = deepCopy(data[k]); });
    const migrated = migrateData(subset, version);
    resetAll();
    const written = [];
    Object.keys(migrated).forEach(function (k) {
      if (migrated[k] === undefined) return;
      set(k, migrated[k]);
      written.push(k);
    });
    return { ok: true, keys: written };
  }

  function deepCopy(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }

  // CONTRATO: añadido. Ajustes con valores por defecto aplicados (§8.2).
  function getSettings() {
    const s = get('settings', null);
    return Object.assign({}, DEFAULT_SETTINGS, s && typeof s === 'object' ? s : {});
  }

  // CONTRATO: añadido. Mezcla parcial de ajustes.
  function setSettings(patch) {
    const s = Object.assign({}, get('settings', {}) || {}, patch || {});
    set('settings', s);
    return getSettings();
  }

  // Otras pestañas del navegador: invalidamos cachés si cambia algo nuestro.
  try {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', function (ev) {
        if (!ev || !ev.key || ev.key.indexOf(PREFIX) === 0) bump();
      });
    }
  } catch (e) { /* ignorar */ }

  SB.storage = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    PREFIX: PREFIX,
    KEYS: KEYS.slice(),
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    get: get,
    set: set,
    remove: remove,
    exportAll: exportAll,
    importAll: importAll,
    resetAll: resetAll,
    // CONTRATO: añadidos (ver cabecera).
    rev: function () { return revision; },
    keys: listKeys,
    kind: function () { return backend.kind; },
    isPersistent: function () { return backend.kind !== 'memory'; },
    getSettings: getSettings,
    setSettings: setSettings,
    migrateData: migrateData,
    normalizeLibrary: normalizeLibrary,
    MemoryStorage: MemoryStorage
  };

  initSchema();
})(window.SB = window.SB || {});
