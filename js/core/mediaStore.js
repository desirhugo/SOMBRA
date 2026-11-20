/* SOMBRA · js/core/mediaStore.js — vídeos propios por movimiento (IndexedDB 'sombra-media').
   Si IndexedDB no existe o falla, todas las operaciones resuelven null / [] sin romper.
   CONTRATO: put() resuelve el id guardado o null si no se pudo; se añade `available()` y `clear()`. */
(function (SB) {
  'use strict';

  var DB_NAME = 'sombra-media';
  var STORE = 'videos';
  var dbPromise = null;
  var urlCache = {};

  function idb() {
    try { return (typeof indexedDB !== 'undefined' && indexedDB) ? indexedDB : null; } catch (e) { return null; }
  }

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var api = idb();
      if (!api) { resolve(null); return; }
      var req;
      try { req = api.open(DB_NAME, 1); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { resolve(null); };
      req.onblocked = function () { resolve(null); };
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return open().then(function (db) {
      if (!db) return null;
      return new Promise(function (resolve) {
        var t, store;
        try { t = db.transaction(STORE, mode); store = t.objectStore(STORE); }
        catch (e) { resolve(null); return; }
        var result = null;
        try {
          var req = fn(store);
          if (req) {
            req.onsuccess = function () { result = req.result; };
            req.onerror = function () { result = null; };
          }
        } catch (e) { resolve(null); return; }
        t.oncomplete = function () { resolve(result === undefined ? null : result); };
        t.onerror = function () { resolve(null); };
        t.onabort = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }

  function revoke(id) {
    if (urlCache[id]) { try { URL.revokeObjectURL(urlCache[id]); } catch (e) { /* noop */ } delete urlCache[id]; }
  }

  SB.mediaStore = {
    available: function () { return open().then(function (db) { return !!db; }); },

    put: function (movementId, blob) {
      if (!movementId || !blob) return Promise.resolve(null);
      return tx('readwrite', function (store) {
        return store.put({ blob: blob, type: blob.type || 'video/mp4', name: blob.name || '', size: blob.size || 0, updatedAt: new Date().toISOString() }, movementId);
      }).then(function (r) {
        if (r === null) return null;
        revoke(movementId);
        return movementId;
      });
    },

    getURL: function (movementId) {
      if (!movementId) return Promise.resolve(null);
      if (urlCache[movementId]) return Promise.resolve(urlCache[movementId]);
      return tx('readonly', function (store) { return store.get(movementId); }).then(function (rec) {
        if (!rec || !rec.blob) return null;
        try { urlCache[movementId] = URL.createObjectURL(rec.blob); } catch (e) { return null; }
        return urlCache[movementId];
      });
    },

    remove: function (movementId) {
      revoke(movementId);
      return tx('readwrite', function (store) { return store.delete(movementId); }).then(function () { return null; });
    },

    list: function () {
      return tx('readonly', function (store) {
        return store.getAllKeys ? store.getAllKeys() : null;
      }).then(function (keys) { return Array.isArray(keys) ? keys.map(String) : []; });
    },

    clear: function () {
      Object.keys(urlCache).forEach(revoke);
      return tx('readwrite', function (store) { return store.clear(); }).then(function () { return null; });
    }
  };
})(window.SB = window.SB || {});
