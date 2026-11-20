/**
 * SOMBRA · tests/specs/00-helpers.test.js
 * Utilidades compartidas por las especificaciones (no registra pruebas).
 */
(function (root) {
  'use strict';
  const SBT = root.SBT;

  SBT.h = {
    /** [{seg, c}] de todas las combinaciones de una sesión. */
    combos: function (session) {
      const out = [];
      session.timeline.forEach(function (seg) {
        if (seg.type === 'boxing') seg.combos.forEach(function (c) { out.push({ seg: seg, c: c }); });
      });
      return out;
    },
    /** Segmentos de un tipo. */
    segs: function (session, type) { return session.timeline.filter(function (s) { return s.type === type; }); },
    /** Apariciones de cada movimiento en una sesión. */
    movementCounts: function (session, into) {
      const out = into || {};
      SBT.h.combos(session).forEach(function (x) {
        x.c.seq.forEach(function (id) { out[id] = (out[id] || 0) + 1; });
      });
      return out;
    },
    mean: function (arr) { return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : 0; },
    round: function (v, d) { const k = Math.pow(10, d == null ? 3 : d); return Math.round(v * k) / k; },
    /**
     * Ajustes de prueba fijos (evita depender de valores guardados). Parten sin material ni cámara
     * (en la app vienen activados): así las pruebas estadísticas miden el selector y no las
     * restricciones del material; las pruebas del material lo activan a propósito.
     */
    NO_MATERIAL: { equipBall: false, equipPaper: false, equipDumbbells: false, equipRope: false, equipTape: false,
      equipAnkles: false, equipHangBall: false, equipElbow: false, cameraAnalysis: false },
    settings: function (SB, patch) { SB.storage.set('settings', Object.assign({}, SB.storage.DEFAULT_SETTINGS, SBT.h.NO_MATERIAL, patch || {})); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
