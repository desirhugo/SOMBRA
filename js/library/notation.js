/**
 * SOMBRA · js/library/notation.js
 * ---------------------------------------------------------------------------
 * Convierte secuencias de ids de movimiento en fichas y texto para la pantalla.
 *
 *  - Golpes: número grande ('1'..'6'); si es al cuerpo, `sub` = 'CUERPO' y body = true
 *    (nunca se muestra '1b').
 *  - Resto de técnicas: palabra corta (`short` del movimiento) y, si tiene lado,
 *    `sub` = 'izq' / 'der' según la guardia: diestro → adelantado = izq;
 *    zurdo → adelantado = der.
 *  - text(): golpes seguidos se unen con ' - ' y el resto con ' · '
 *    (p. ej. '1 - 2 · MEDIA CINTURA der · 2').
 *  - signature(): firma estable de una secuencia ('jab>cross>slip_rear>cross').
 *
 * Sin DOM. Busca los movimientos en SB.library (incluye personalizados y
 * ediciones) y, si aún no está cargada, en SB.data.movements.
 */
(function (SB) {
  'use strict';

  // CONTRATO: nombres de icono por categoría (la UI decide cómo dibujarlos).
  const ICONS = { golpe: 'punch', defensa: 'shield', desplazamiento: 'move', finta: 'feint', ritmo: 'rhythm', base: 'guard' };

  function findMovement(id) {
    if (SB.library && typeof SB.library.get === 'function') {
      const m = SB.library.get(id);
      if (m) return m;
    }
    const list = (SB.data && SB.data.movements) || [];
    for (let i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function sideLabel(side, stance) {
    if (side !== 'lead' && side !== 'rear') return '';
    const zurdo = stance === 'zurdo';
    if (side === 'lead') return zurdo ? 'der' : 'izq';
    return zurdo ? 'izq' : 'der';
  }

  function stanceOf(opts) {
    if (opts && opts.stance) return opts.stance;
    try { return SB.storage ? SB.storage.getSettings().stance : 'diestro'; } catch (e) { return 'diestro'; }
  }

  /**
   * Fichas para dibujar una combinación.
   * @param {string[]} seq
   * @param {{stance?: 'diestro'|'zurdo'}} [opts]
   * @returns {{id, label, sub, icon, kind, body, side, name}[]}
   */
  function tokens(seq, opts) {
    const stance = stanceOf(opts);
    return (seq || []).map(function (id) {
      const m = findMovement(id);
      if (!m) return { id: id, label: String(id).toUpperCase(), sub: '', icon: null, kind: 'desconocido', body: false, side: 'none', name: String(id) };
      const kind = m.category;
      let label, sub = '', body = false;
      if (kind === 'golpe') {
        const code = String(m.code || '');
        if (/^[1-6]b?$/.test(code)) label = code.charAt(0);
        else label = String(m.short || m.name || id).replace(/\s*\(CUERPO\)\s*/i, '');
        body = m.target === 'cuerpo';
        sub = body ? 'CUERPO' : '';
      } else {
        label = String(m.short || m.name || id);
        sub = sideLabel(m.side, stance);
      }
      return { id: id, label: label, sub: sub, icon: ICONS[kind] || null, kind: kind, body: body, side: m.side || 'none', name: m.name || id };
    });
  }

  /** Texto compacto de una combinación: '1 - 2 · MEDIA CINTURA der · 2'. */
  function text(seq, opts) {
    const toks = tokens(seq, opts);
    let out = '';
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const piece = t.label + (t.sub ? ' ' + String(t.sub).toLowerCase() : '');
      if (i > 0) {
        const prev = toks[i - 1];
        out += (prev.kind === 'golpe' && t.kind === 'golpe') ? ' - ' : ' · ';
      }
      out += piece;
    }
    return out;
  }

  /** Firma estable de la secuencia. */
  function signature(seq) { return (seq || []).join('>'); }

  SB.notation = { tokens: tokens, text: text, signature: signature, ICONS: ICONS };
})(window.SB = window.SB || {});
