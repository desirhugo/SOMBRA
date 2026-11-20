/**
 * SOMBRA · js/library/library.js
 * ---------------------------------------------------------------------------
 * Catálogo de movimientos y biblioteca personal del usuario.
 *
 * Estado persistido en SB.storage('library'):
 *   {
 *     movements: { [id]: { status: 'aprendido'|'practica'|'dominado', addedAt: ISO } },
 *     custom:    [movement],        // movimientos personalizados (esquema §4.1, custom: true)
 *     edits:     { [id]: patch },   // ediciones del usuario sobre el catálogo (textos / nivel)
 *     combos:    [{ id, seq, name, status, note, addedAt }]   // combinaciones personales
 *   }
 *
 *  - catalog(): SB.data.movements con ediciones aplicadas + personalizados.
 *  - Sin onboarding la biblioteca personal está vacía: la UI aplica un preset.
 *  - Los movimientos personalizados deducen `flow` a partir de categoría y lado (§8.4).
 *  - Los objetos devueltos por get()/catalog() son compartidos: tratarlos como solo lectura.
 *
 * Caché interna invalidada con SB.storage.rev() (cualquier escritura) o si cambia
 * el array SB.data.movements.
 */
(function (SB) {
  'use strict';

  const STATUSES = ['aprendido', 'practica', 'dominado'];
  /** Tope de complejidad por estado (§6.3). */
  const STATUS_CAP = { aprendido: 2.5, practica: 4, dominado: 5 };
  /** Campos del catálogo que el usuario puede editar. */
  const EDITABLE = ['name', 'short', 'description', 'cues', 'errors', 'level', 'tags', 'counters'];

  // CONTRATO: descripción de los presets para la UI.
  const PRESETS = [
    { id: 'golpes', name: 'Solo golpes', description: 'Los seis golpes a la cabeza, paso adelante y atrás.' },
    { id: 'golpes_defensa', name: 'Golpes y defensa', description: 'Golpes, golpes al cuerpo básicos, defensas y desplazamientos básicos.' },
    { id: 'completo', name: 'Completo', description: 'Todo el catálogo: lo básico como dominado y lo avanzado en práctica.' }
  ];

  let cache = { rev: -1, movRef: null, state: null, list: [], index: Object.create(null), personal: [] };

  function emptyState() { return { movements: {}, custom: [], edits: {}, combos: [] }; }

  function normalizeState(raw) {
    if (SB.storage && SB.storage.normalizeLibrary) return SB.storage.normalizeLibrary(raw || {});
    return Object.assign(emptyState(), raw || {});
  }

  function loadState() { return normalizeState(SB.storage.get('library', null)); }
  function saveState(state) { SB.storage.set('library', state); }

  /** Modifica el estado persistido de forma atómica. */
  function mutate(fn) {
    const state = loadState();
    const result = fn(state);
    saveState(state);
    return result;
  }

  function pickEditable(patch) {
    const out = {};
    EDITABLE.forEach(function (k) { if (patch && patch[k] !== undefined) out[k] = patch[k]; });
    if (out.level !== undefined && out.level !== 'basico' && out.level !== 'avanzado') delete out.level;
    return out;
  }

  /** Reconstruye la caché si cambió el almacenamiento o los datos. */
  function ensure() {
    const rev = SB.storage.rev();
    const movRef = (SB.data && SB.data.movements) || [];
    if (cache.rev === rev && cache.movRef === movRef && cache.state) return cache;
    const state = loadState();
    const list = [];
    const index = Object.create(null);
    movRef.forEach(function (m) {
      if (!m || !m.id) return;
      const e = state.edits[m.id];
      const mm = e ? Object.assign({}, m, pickEditable(e)) : m;
      list.push(mm);
      index[m.id] = mm;
    });
    state.custom.forEach(function (c) {
      if (c && c.id && !index[c.id]) { list.push(c); index[c.id] = c; }
    });
    const personal = [];
    Object.keys(state.movements).forEach(function (id) {
      const m = index[id];
      if (!m) return;
      const e = state.movements[id];
      personal.push(Object.assign({}, m, { status: STATUSES.indexOf(e.status) !== -1 ? e.status : 'aprendido', addedAt: e.addedAt || null, fromPreset: !!e.fromPreset }));
    });
    cache = { rev: rev, movRef: movRef, state: state, list: list, index: index, personal: personal };
    return cache;
  }

  function validStatus(s, fallback) { return STATUSES.indexOf(s) !== -1 ? s : fallback; }

  /** Catálogo completo (con ediciones) + movimientos personalizados. */
  function catalog() { return ensure().list.slice(); }

  /** Movimiento por id (o null). */
  function get(id) { return ensure().index[id] || null; }

  /** Biblioteca personal: [{...movimiento, status, addedAt}]. */
  function personal() { return ensure().personal.slice(); }

  /** Estado del movimiento en la biblioteca personal (o null si no está). */
  function statusOf(id) {
    const c = ensure();
    if (!c.index[id]) return null;
    const e = c.state.movements[id];
    return e ? validStatus(e.status, 'aprendido') : null;
  }

  /** Añade (o actualiza el estado de) un movimiento en la biblioteca personal. */
  function add(id, status) {
    if (!get(id)) return false;
    const st = validStatus(status, 'aprendido');
    return mutate(function (s) {
      const e = s.movements[id];
      if (e) e.status = st;
      else s.movements[id] = { status: st, addedAt: new Date().toISOString() };
      return true;
    });
  }

  /** Cambia el estado; si el movimiento no estaba en la biblioteca, lo añade. */
  function setStatus(id, status) {
    if (STATUSES.indexOf(status) === -1) return false;
    return add(id, status);
  }

  /** Quita un movimiento de la biblioteca personal. */
  function remove(id) {
    return mutate(function (s) {
      const had = !!s.movements[id];
      delete s.movements[id];
      return had;
    });
  }

  // ---------------------------------------------------------------------------
  // Movimientos personalizados (§8.4)
  // ---------------------------------------------------------------------------

  function normCategory(c) {
    const v = String(c || '').toLowerCase();
    if (v === 'defensa' || v === 'desplazamiento' || v === 'finta' || v === 'ritmo') return v;
    return 'golpe';
  }

  function normSide(s) {
    const v = String(s || '').toLowerCase();
    if (v === 'lead' || v === 'adelantado' || v === 'adelantada') return 'lead';
    if (v === 'rear' || v === 'atrasado' || v === 'atrasada') return 'rear';
    return 'none';
  }

  /**
   * Deduce las reglas de gramática de un movimiento personalizado (§8.4).
   * CONTRATO: extensiones compatibles para casos que §8.4 no cubre
   * (golpe sin lado, finta, ritmo).
   */
  function deduceFlow(category, side) {
    const pos = { start: true, middle: true, end: true };
    if (category === 'golpe') {
      if (side === 'lead') return { from: { N: 1, J: 1, LL: 2, RL: 0, LOW: 1 }, to: 'RL', repeatWith: [], position: pos, mustBeFollowedBy: null, within: 1 };
      if (side === 'rear') return { from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 1 }, to: 'LL', repeatWith: [], position: pos, mustBeFollowedBy: null, within: 1 };
      return { from: { N: 2, J: 2, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [], position: pos, mustBeFollowedBy: null, within: 1 };
    }
    if (category === 'defensa') {
      return { from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [], position: { start: true, middle: true, end: false }, mustBeFollowedBy: 'golpe', within: 2 };
    }
    if (category === 'finta') {
      return { from: { N: 2, J: 2, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [], position: { start: true, middle: true, end: false }, mustBeFollowedBy: 'golpe', within: 1 };
    }
    if (category === 'ritmo') {
      return { from: { N: 1, J: 1, LL: 1, RL: 1, LOW: 1 }, to: 'keep', repeatWith: [], position: { start: false, middle: true, end: false }, mustBeFollowedBy: 'golpe', within: 1 };
    }
    // desplazamiento
    return { from: { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [], position: pos, mustBeFollowedBy: null, within: 1 };
  }

  function toList(v) {
    if (Array.isArray(v)) return v.map(String).map(function (s) { return s.trim(); }).filter(Boolean);
    if (typeof v === 'string') return v.split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    return [];
  }

  /** Construye un movimiento completo (§4.1) a partir del borrador del formulario. */
  function buildCustom(draft, id, prev) {
    const d = draft || {};
    const category = normCategory(d.category != null ? d.category : prev && prev.category);
    const side = normSide(d.side != null ? d.side : prev && prev.side);
    const name = String(d.name != null ? d.name : (prev && prev.name) || '').trim() || 'Movimiento propio';
    const short = String(d.short != null ? d.short : (prev && prev.short) || name).trim().toUpperCase().slice(0, 8) || 'PROPIO';
    let target = null;
    if (category === 'golpe') {
      const t = d.target != null ? d.target : prev && prev.target;
      target = t === 'cuerpo' ? 'cuerpo' : 'cabeza';
    }
    const subcategory = d.subcategory || (prev && prev.subcategory) || 'personalizado';
    const m = {
      id: id,
      code: short,
      short: short,
      name: name,
      category: category,
      subcategory: subcategory,
      level: (d.level || (prev && prev.level)) === 'avanzado' ? 'avanzado' : 'basico',
      side: side,
      target: target,
      against: Array.isArray(d.against) ? d.against.slice() : (prev ? prev.against || [] : []),
      description: String(d.description != null ? d.description : (prev && prev.description) || ''),
      cues: d.cues != null ? toList(d.cues) : (prev ? prev.cues || [] : []),
      errors: d.errors != null ? toList(d.errors) : (prev ? prev.errors || [] : []),
      counters: Array.isArray(d.counters) ? d.counters.slice() : (prev ? prev.counters || [] : []),
      anim: id,
      tags: Array.isArray(d.tags) ? d.tags.slice() : (prev ? prev.tags || ['personalizado'] : ['personalizado']),
      custom: true,
      createdAt: (prev && prev.createdAt) || new Date().toISOString(),
      flow: d.flow && typeof d.flow === 'object' ? d.flow : deduceFlow(category, side)
    };
    return m;
  }

  /** Crea un movimiento personalizado y lo añade a la biblioteca personal. Devuelve su id. */
  function addCustom(draft) {
    const base = 'custom_' + SB.util.slug((draft && draft.name) || 'mov').slice(0, 24);
    let id = base;
    let k = 2;
    while (get(id)) { id = base + '_' + k; k++; }
    const m = buildCustom(draft, id, null);
    const status = validStatus(draft && draft.status, 'aprendido');
    mutate(function (s) {
      s.custom.push(m);
      s.movements[id] = { status: status, addedAt: new Date().toISOString() };
    });
    return id;
  }

  /** Actualiza un personalizado; recalcula `flow` si cambian categoría o lado. */
  function updateCustom(id, patch) {
    return mutate(function (s) {
      const i = s.custom.findIndex(function (c) { return c.id === id; });
      if (i === -1) return false;
      const prev = s.custom[i];
      const p = Object.assign({}, patch || {});
      const reflow = !p.flow && ((p.category != null && normCategory(p.category) !== prev.category) ||
        (p.side != null && normSide(p.side) !== prev.side));
      if (!reflow && !p.flow) p.flow = prev.flow;
      s.custom[i] = buildCustom(p, id, prev);
      if (p.status && STATUSES.indexOf(p.status) !== -1) {
        const e = s.movements[id];
        if (e) e.status = p.status; else s.movements[id] = { status: p.status, addedAt: new Date().toISOString() };
      }
      return true;
    });
  }

  /** Borra un personalizado (y las combinaciones personales que lo usan). */
  function deleteCustom(id) {
    return mutate(function (s) {
      const before = s.custom.length;
      s.custom = s.custom.filter(function (c) { return c.id !== id; });
      delete s.movements[id];
      delete s.edits[id];
      s.combos = s.combos.filter(function (c) { return (c.seq || []).indexOf(id) === -1; });
      return s.custom.length !== before;
    });
  }

  /**
   * Edita textos / nivel de un movimiento del catálogo.
   * CONTRATO: editCatalog(id, null) restaura el original. Con un id personalizado
   * delega en updateCustom().
   */
  function editCatalog(id, patch) {
    const m = get(id);
    if (!m) return false;
    if (m.custom) return updateCustom(id, patch || {});
    return mutate(function (s) {
      if (patch === null) { delete s.edits[id]; return true; }
      s.edits[id] = Object.assign({}, s.edits[id] || {}, pickEditable(patch));
      return true;
    });
  }

  /** Mapa id → estado del preset. */
  function presetMap(presetId) {
    const ids = (SB.data.movements || []).map(function (m) { return m.id; });
    const has = function (id) { return ids.indexOf(id) !== -1; };
    const out = {};
    const put = function (id, st) { if (has(id)) out[id] = st; };
    const golpes = function () {
      ['guard', 'jab', 'cross', 'lead_hook', 'rear_hook', 'lead_upper', 'rear_upper', 'step_in', 'step_back']
        .forEach(function (id) { put(id, 'dominado'); });
    };
    if (presetId === 'golpes') {
      golpes();
    } else if (presetId === 'golpes_defensa') {
      golpes();
      put('jab_body', 'practica');
      put('cross_body', 'practica');
      put('lead_hook_body', 'aprendido');
      put('block_high', 'practica');
      put('parry_jab', 'practica');
      put('slip_lead', 'practica');
      put('slip_rear', 'practica');
      // 15-nov-2026: cintura completa, goma y sentadilla también entran en «Golpes y defensa».
      put('roll_lead', 'practica');
      put('roll_rear', 'practica');
      put('pull_back', 'practica');
      put('duck', 'practica');
      put('lateral_lead', 'aprendido');
      put('lateral_rear', 'aprendido');
      put('distance_reset', 'aprendido');
    } else if (presetId === 'completo') {
      (SB.data.movements || []).forEach(function (m) {
        out[m.id] = m.level === 'avanzado' ? 'practica' : 'dominado';
      });
    } else {
      return null;
    }
    return out;
  }

  /**
   * Aplica un preset: sustituye los movimientos del catálogo de la biblioteca
   * personal (conserva personalizados y combinaciones personales).
   * @returns {number} nº de movimientos en la biblioteca tras aplicarlo (-1 si el preset no existe)
   */
  function applyPreset(presetId) {
    const map = presetMap(presetId);
    if (!map) return -1;
    return mutate(function (s) {
      const now = new Date().toISOString();
      const customIds = new Set(s.custom.map(function (c) { return c.id; }));
      const next = {};
      Object.keys(s.movements).forEach(function (id) { if (customIds.has(id)) next[id] = s.movements[id]; });
      Object.keys(map).forEach(function (id) {
        const prev = s.movements[id];
        // CONTRATO: fromPreset marca lo que el usuario ya conocía al empezar; no cuenta como «nuevo» (§6.3).
        next[id] = prev ? Object.assign({}, prev, { status: map[id] }) : { status: map[id], addedAt: now, fromPreset: true };
      });
      s.movements = next;
      return Object.keys(next).length;
    });
  }

  /**
   * Añade a la biblioteca los movimientos del catálogo que falten (no cambia los que ya están).
   * @returns {string[]} ids añadidos
   */
  function ensureMovements(ids, status) {
    const st = validStatus(status, 'practica');
    return mutate(function (s) {
      const added = [];
      const now = new Date().toISOString();
      (ids || []).forEach(function (id) {
        if (s.movements[id] || !(SB.data.movements || []).some(function (m) { return m.id === id; })) return;
        s.movements[id] = { status: st, addedAt: now };
        added.push(id);
      });
      return added;
    });
  }

  /** true si todos los movimientos de la secuencia están en la biblioteca personal. */
  function isAvailable(seq) {
    if (!Array.isArray(seq) || !seq.length) return false;
    for (let i = 0; i < seq.length; i++) if (statusOf(seq[i]) === null) return false;
    return true;
  }

  // CONTRATO: añadido. ¿Puede usarse el movimiento en este nivel? (§6.3: en básico,
  // un movimiento de nivel avanzado solo si está dominado; nunca categoría 'base').
  function eligibleAtLevel(id, level) {
    const m = get(id);
    if (!m || m.category === 'base') return false;
    const st = statusOf(id);
    if (!st) return false;
    if (level !== 'avanzado' && m.level === 'avanzado' && st !== 'dominado') return false;
    return true;
  }

  // ---------------------------------------------------------------------------
  // Combinaciones
  // ---------------------------------------------------------------------------

  function cleanSeq(seq) {
    if (!Array.isArray(seq) || !seq.length) return null;
    const out = seq.map(String);
    for (let i = 0; i < out.length; i++) if (!get(out[i])) return null;
    return out;
  }

  const combos = {
    /** Combinaciones curadas (SB.data.combinations). */
    curated: function () { return ((SB.data && SB.data.combinations) || []).slice(); },
    /** Combinaciones personales del usuario. */
    personal: function () {
      return ensure().state.combos.map(function (c) {
        return { id: c.id, seq: (c.seq || []).slice(), name: c.name || '', status: validStatus(c.status, 'aprendido'), note: c.note || '', addedAt: c.addedAt || null };
      });
    },
    /** Guarda una combinación personal. Devuelve su id (o null si la secuencia no es válida). */
    addPersonal: function (draft) {
      const d = draft || {};
      const seq = cleanSeq(d.seq);
      if (!seq) return null;
      const id = SB.util.uid('pc');
      const name = String(d.name || '').trim() || (SB.notation ? SB.notation.text(seq) : seq.join(' '));
      mutate(function (s) {
        s.combos.push({ id: id, seq: seq, name: name, status: validStatus(d.status, 'aprendido'), note: String(d.note || ''), addedAt: new Date().toISOString() });
      });
      return id;
    },
    /** Actualiza nombre, secuencia, estado o nota de una combinación personal. */
    updatePersonal: function (id, patch) {
      const p = patch || {};
      return mutate(function (s) {
        const c = s.combos.find(function (x) { return x.id === id; });
        if (!c) return false;
        if (p.seq !== undefined) { const seq = cleanSeq(p.seq); if (!seq) return false; c.seq = seq; }
        if (p.name !== undefined) c.name = String(p.name);
        if (p.status !== undefined) c.status = validStatus(p.status, c.status);
        if (p.note !== undefined) c.note = String(p.note);
        return true;
      });
    },
    /** Borra una combinación personal. */
    removePersonal: function (id) {
      return mutate(function (s) {
        const before = s.combos.length;
        s.combos = s.combos.filter(function (x) { return x.id !== id; });
        return s.combos.length !== before;
      });
    }
  };

  SB.library = {
    STATUSES: STATUSES,
    STATUS_CAP: STATUS_CAP,
    PRESETS: PRESETS,
    catalog: catalog,
    get: get,
    personal: personal,
    statusOf: statusOf,
    add: add,
    setStatus: setStatus,
    remove: remove,
    addCustom: addCustom,
    updateCustom: updateCustom,
    deleteCustom: deleteCustom,
    editCatalog: editCatalog,
    applyPreset: applyPreset,
    ensureMovements: ensureMovements,
    isAvailable: isAvailable,
    combos: combos,
    // CONTRATO: añadidos.
    eligibleAtLevel: eligibleAtLevel,
    deduceFlow: deduceFlow,
    presetMap: presetMap
  };
})(window.SB = window.SB || {});
