/**
 * SOMBRA · tests/harness.js
 * ---------------------------------------------------------------------------
 * Mini arnés de pruebas sin dependencias, común a Node (tests/run-node-tests.js)
 * y al navegador (tests/index.html).
 *
 *   SBT.describe('Grupo', function () {
 *     SBT.it('hace algo', function (env, assert) { ... });   // puede ser async
 *   });
 *
 * `env` lo crea cada ejecutor:
 *   env.SB        instancia actual de la app (módulos cargados)
 *   env.fresh()   borra todos los datos guardados y devuelve env.SB
 *   env.reload()  carga una instancia NUEVA de la app que comparte el mismo
 *                 almacenamiento (simula recargar la página); puede devolver promesa
 *   env.dataName  'fixtures' | 'datos reales'
 *
 * SBT.info(texto) añade una línea informativa al resultado de la prueba.
 */
(function (root) {
  'use strict';

  const suites = [];
  let current = null;
  let infoSink = null;

  function describe(name, fn) {
    const s = { name: name, tests: [] };
    suites.push(s);
    const prev = current;
    current = s;
    try { fn(); } finally { current = prev; }
  }

  function it(name, fn) {
    if (!current) describe('General', function () {});
    (current || suites[suites.length - 1]).tests.push({ name: name, fn: fn });
  }

  function AssertionError(msg) { const e = new Error(msg); e.name = 'AssertionError'; return e; }

  function fmt(v) {
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }

  function deepEq(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b) return false;
    if (a === null || b === null || typeof a !== 'object') return a !== a && b !== b; // NaN
    const aArr = Array.isArray(a), bArr = Array.isArray(b);
    if (aArr !== bArr) return false;
    if (aArr) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!deepEq(a[i], b[i])) return false;
      return true;
    }
    const ka = Object.keys(a).filter(function (k) { return a[k] !== undefined; }).sort();
    const kb = Object.keys(b).filter(function (k) { return b[k] !== undefined; }).sort();
    if (ka.length !== kb.length) return false;
    for (let i = 0; i < ka.length; i++) {
      if (ka[i] !== kb[i]) return false;
      if (!deepEq(a[ka[i]], b[kb[i]])) return false;
    }
    return true;
  }

  const assert = {
    ok: function (v, msg) { if (!v) throw AssertionError(msg || ('Se esperaba un valor verdadero, se obtuvo ' + fmt(v))); },
    equal: function (a, b, msg) { if (a !== b) throw AssertionError((msg ? msg + ': ' : '') + 'esperado ' + fmt(b) + ', obtenido ' + fmt(a)); },
    notEqual: function (a, b, msg) { if (a === b) throw AssertionError((msg ? msg + ': ' : '') + 'no debía ser ' + fmt(b)); },
    deepEqual: function (a, b, msg) { if (!deepEq(a, b)) throw AssertionError((msg ? msg + ': ' : '') + 'esperado ' + fmt(b) + ', obtenido ' + fmt(a)); },
    closeTo: function (a, b, tol, msg) { if (!(Math.abs(a - b) <= tol)) throw AssertionError((msg ? msg + ': ' : '') + fmt(a) + ' no está a ±' + tol + ' de ' + fmt(b)); },
    atMost: function (a, b, msg) { if (!(a <= b)) throw AssertionError((msg ? msg + ': ' : '') + fmt(a) + ' > ' + fmt(b)); },
    atLeast: function (a, b, msg) { if (!(a >= b)) throw AssertionError((msg ? msg + ': ' : '') + fmt(a) + ' < ' + fmt(b)); },
    includes: function (arr, v, msg) { if (!arr || arr.indexOf(v) === -1) throw AssertionError((msg ? msg + ': ' : '') + fmt(v) + ' no está en ' + fmt(arr)); },
    throws: function (fn, msg) {
      let threw = false;
      try { fn(); } catch (e) { threw = true; }
      if (!threw) throw AssertionError(msg || 'Se esperaba una excepción');
    },
    fail: function (msg) { throw AssertionError(msg || 'Fallo'); }
  };

  function info(text) { if (infoSink) infoSink.push(String(text)); }

  /**
   * Ejecuta todas las pruebas registradas con el entorno dado.
   * @param {object} env
   * @param {{onResult?: (r) => void, filter?: string}} [opts]
   * @returns {Promise<{passed, failed, results}>}
   */
  async function run(env, opts) {
    const o = opts || {};
    const results = [];
    for (let s = 0; s < suites.length; s++) {
      const suite = suites[s];
      for (let t = 0; t < suite.tests.length; t++) {
        const test = suite.tests[t];
        if (o.filter && (suite.name + ' ' + test.name).toLowerCase().indexOf(o.filter.toLowerCase()) === -1) continue;
        const r = { suite: suite.name, name: test.name, ok: true, error: null, info: [], ms: 0 };
        infoSink = r.info;
        const t0 = Date.now();
        try {
          await test.fn(env, assert);
        } catch (e) {
          r.ok = false;
          r.error = (e && (e.stack || e.message)) || String(e);
          if (e && e.name === 'AssertionError') r.error = e.message;
        }
        r.ms = Date.now() - t0;
        infoSink = null;
        results.push(r);
        if (o.onResult) o.onResult(r);
      }
    }
    const passed = results.filter(function (r) { return r.ok; }).length;
    return { passed: passed, failed: results.length - passed, results: results };
  }

  root.SBT = { describe: describe, it: it, assert: assert, info: info, run: run, suites: suites, deepEqual: deepEq };
})(typeof window !== 'undefined' ? window : globalThis);
