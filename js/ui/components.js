/* SOMBRA · js/ui/components.js — utilidades de interfaz (DOM, iconos, controles, diálogos).
   CONTRATO: añade SB.ui (no definido en §7) para que las pantallas compartan componentes. */
(function (SB) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Iconos (trazo, 24×24). Mismos dibujos que assets/icons/*.svg
  // ---------------------------------------------------------------------------
  var ICONS = {
    glove: '<path d="M6.5 12V8.5A6.5 6.5 0 0 1 13 2h.5A5.5 5.5 0 0 1 19 7.5V13a4 4 0 0 1-4 4H9.5a3 3 0 0 1-3-3"/><path d="M6.5 12H10a2 2 0 0 1 0 4H8"/><path d="M8.5 17v4h8v-4"/>',
    shield: '<path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z"/><path d="M9 12l2 2 4-4"/>',
    feet: '<ellipse cx="8" cy="7.5" rx="2.6" ry="4.2"/><path d="M6.2 14.5h3.6v1.2a1.8 1.8 0 0 1-3.6 0z"/><ellipse cx="16" cy="10.5" rx="2.6" ry="4.2"/><path d="M14.2 17.5h3.6v1.2a1.8 1.8 0 0 1-3.6 0z"/>',
    bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
    heart: '<path d="M12 20s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.8-8 11-8 11z"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 17l9 5 9-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    library: '<rect x="3" y="4" width="4" height="16" rx="1"/><rect x="9" y="4" width="4" height="16" rx="1"/><path d="M15.3 5.4l3.9-1 3.4 14.3-3.9 1z"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/><circle cx="12" cy="12" r="7"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    play: '<path d="M7 4.5v15L19.5 12z"/>',
    pause: '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',
    next: '<path d="M5 5l10 7-10 7z"/><path d="M19 5v14"/>',
    prev: '<path d="M19 5L9 12l10 7z"/><path d="M5 5v14"/>',
    exit: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    fullscreen: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    'fullscreen-exit': '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
    demo: '<circle cx="12" cy="4.5" r="2"/><path d="M12 7v6.5M12 13.5L9 21M12 13.5l3 7.5M6.5 10.5l5.5-2 5.5 2"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    'chevron-down': '<path d="M5 9l7 7 7-7"/>',
    back: '<path d="M20 12H5M11 5l-7 7 7 7"/>',
    flame: '<path d="M12 22c4 0 7-2.7 7-6.8 0-3.2-2-5.4-3.6-7.2-.3 2-1.3 3.2-2.4 3.6.4-3.5-1-7.1-4-9.6.3 3.8-2.2 6.3-3.6 8.2C4.3 11.8 5 13.8 5 15.2 5 19.3 8 22 12 22z"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    warning: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M4 20h16"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5.5 9.5V20h5v-6h3v6h5V9.5"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    combo: '<rect x="2.5" y="8" width="6" height="8" rx="1.5"/><rect x="15.5" y="8" width="6" height="8" rx="1.5"/><path d="M8.5 12h7"/>',
    volume: '<path d="M4 9.5h3.5L12 5v14l-4.5-4.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
  };
  var ALIASES = {
    fist: 'glove', punch: 'glove', boxing: 'glove', gloves: 'glove', attack: 'glove',
    defense: 'shield', guard: 'shield',
    foot: 'feet', footsteps: 'feet', footwork: 'feet', steps: 'feet', move: 'feet',
    lightning: 'bolt', speed: 'bolt', zap: 'bolt', flash: 'bolt',
    heartbeat: 'pulse', activity: 'pulse', endurance: 'pulse', cardio: 'pulse',
    aim: 'target', crosshair: 'target', technique: 'target', focus: 'target',
    all: 'layers', full: 'layers', complete: 'layers', stack: 'layers',
    book: 'library', books: 'library', gear: 'settings', cog: 'settings',
    x: 'close', logout: 'exit', stopwatch: 'timer', clock: 'timer', figure: 'demo'
  };
  var GOAL_ICON_FALLBACK = {
    tecnica: 'target', velocidad: 'bolt', ofensiva: 'glove', defensa: 'shield',
    movilidad: 'feet', resistencia: 'pulse', completo: 'layers'
  };
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function icon(name, opts) {
    opts = opts || {};
    var key = ICONS[name] ? name : (ALIASES[name] || 'target');
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', 'icon' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.size) { svg.style.width = opts.size; svg.style.height = opts.size; }
    if (opts.label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', opts.label); }
    else { svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false'); }
    svg.innerHTML = ICONS[key];
    return svg;
  }

  // ---------------------------------------------------------------------------
  // Hiperscript mínimo: h('div', { class, on: {click}, ... }, hijos)
  // Todo el texto entra como nodo de texto (seguro frente a inyección).
  // ---------------------------------------------------------------------------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        var v = attrs[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class' || k === 'className') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (k === 'on') { for (var ev in v) el.addEventListener(ev, v[ev]); }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'text') el.textContent = v;
        else if (k === 'value') el.value = v;
        else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'required' || k === 'multiple') el[k] = !!v;
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c === null || c === undefined || c === false || c === true) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    if (typeof c === 'string' || typeof c === 'number') { el.appendChild(document.createTextNode(String(c))); return; }
    el.appendChild(c);
  }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

  function safe(fn, fallback) {
    try { var r = fn(); return r === undefined ? fallback : r; }
    catch (e) { if (window.console) console.error('[SOMBRA]', e); return fallback; }
  }
  function has(path) {
    var parts = path.split('.'); var o = SB;
    for (var i = 0; i < parts.length; i++) { if (o == null) return false; o = o[parts[i]]; }
    return o != null;
  }

  // ---------------------------------------------------------------------------
  // Etiquetas
  // ---------------------------------------------------------------------------
  var L = {
    status: { aprendido: 'Aprendido', practica: 'En práctica', dominado: 'Dominado' },
    statusShort: { aprendido: 'Aprendido', practica: 'Práctica', dominado: 'Dominado' },
    level: { basico: 'Básico', avanzado: 'Avanzado' },
    category: { golpe: 'Golpes', defensa: 'Defensas', desplazamiento: 'Desplazamientos', finta: 'Fintas', ritmo: 'Ritmo', base: 'Base' },
    categoryOne: { golpe: 'golpe', defensa: 'defensa', desplazamiento: 'desplazamiento', finta: 'finta', ritmo: 'ritmo', base: 'base' },
    mode: { repeticion: 'Repetición', variacion: 'Variación' },
    demand: { 1: 'Moderada', 2: 'Alta', 3: 'Muy alta' },
    hiitCat: { fuerza: 'Fuerza', cardio: 'Cardio' },
    side: { lead: 'Adelantado', rear: 'Atrasado', none: 'Ninguno' },
    target: { cabeza: 'Cabeza', cuerpo: 'Cuerpo' },
    tempo: { controlado: 'ritmo controlado', fluido: 'ritmo fluido', explosivo: 'ritmo explosivo', continuo: 'ritmo continuo' },
    segType: { prepare: 'Preparación', boxing: 'Boxeo', transition: 'Transición', hiit: 'HIIT', rest: 'Descanso' }
  };
  var CATEGORY_ORDER = ['golpe', 'defensa', 'desplazamiento', 'finta', 'ritmo', 'base'];
  var STATUSES = ['aprendido', 'practica', 'dominado'];

  // ---------------------------------------------------------------------------
  // Datos auxiliares (protegidos frente a módulos ausentes)
  // ---------------------------------------------------------------------------
  function movement(id) {
    var m = safe(function () { return SB.library && SB.library.get ? SB.library.get(id) : null; }, null);
    if (m) return m;
    var list = (SB.data && SB.data.movements) || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function movementName(id) { var m = movement(id); return m ? m.name : id; }
  function goals() { return (SB.data && SB.data.goals) || []; }
  function goal(id) { var g = goals(); for (var i = 0; i < g.length; i++) if (g[i].id === id) return g[i]; return null; }
  function goalName(id) { var g = goal(id); return g ? (g.short || g.name) : (id || ''); }
  function goalIcon(g) {
    if (!g) return 'target';
    if (g.icon && (ICONS[g.icon] || ALIASES[g.icon])) return g.icon;
    return GOAL_ICON_FALLBACK[g.id] || 'target';
  }
  function focuses() { return (SB.data && SB.data.focuses) || []; }
  function focusName(id) { var f = focuses().filter(function (x) { return x.id === id; })[0]; return f ? f.name : (id || ''); }
  function isCustomMovement(m) {
    return !!(m && (m.custom === true || m.isCustom === true || m.source === 'custom' || m.origin === 'custom' || /^(custom|cm|u)[_-]/.test(m.id)));
  }
  function stance() { return (SB.app && SB.app.settings) ? SB.app.settings().stance : 'diestro'; }

  function kindOf(m) {
    if (!m) return 'golpe';
    var c = m.category;
    return (c === 'defensa' || c === 'desplazamiento' || c === 'finta' || c === 'ritmo') ? c : 'golpe';
  }

  /** Fichas de notación: usa SB.notation si existe; si no, aproxima con los datos. */
  function tokenData(seq, st) {
    st = st || stance();
    var t = safe(function () { return SB.notation && SB.notation.tokens ? SB.notation.tokens(seq, { stance: st }) : null; }, null);
    if (t && t.length) return t;
    return (seq || []).map(function (id) {
      var m = movement(id);
      var body = !!(m && m.target === 'cuerpo') || /_body$/.test(id);
      return { id: id, label: m ? (m.short || m.code || id).replace(/\s*\(CUERPO\)/i, '') : id, sub: body ? 'CUERPO' : '', kind: kindOf(m), body: body };
    });
  }
  function comboText(seq, st) {
    var txt = safe(function () { return SB.notation && SB.notation.text ? SB.notation.text(seq, { stance: st || stance() }) : null; }, null);
    if (txt) return txt;
    return tokenData(seq, st).map(function (t) { return t.label + (t.sub ? ' ' + t.sub : ''); }).join(' · ');
  }
  function subText(t) {
    if (t.body) return 'CUERPO';
    return t.sub ? String(t.sub) : '';
  }

  /** Fila compacta de fichas (listas, vista previa). */
  function tokens(seq, opts) {
    opts = opts || {};
    var data = tokenData(seq, opts.stance);
    var wrap = h('span', { class: 'tokens' + (opts.size ? ' tokens-' + opts.size : ''), role: 'img', 'aria-label': 'Combinación: ' + comboText(seq, opts.stance) });
    data.forEach(function (t, i) {
      if (i > 0) wrap.appendChild(h('span', { class: 'tok-sep', 'aria-hidden': 'true' }));
      var sub = subText(t);
      wrap.appendChild(h('span', { class: 'tok k-' + (t.kind || 'golpe') + (t.body ? ' is-body' : ''), 'aria-hidden': 'true' },
        h('span', { class: 'tok-label' }, t.label),
        sub ? h('span', { class: 'tok-sub' }, sub) : null));
    });
    return wrap;
  }

  // ---------------------------------------------------------------------------
  // Controles
  // ---------------------------------------------------------------------------
  function button(label, opts) {
    opts = opts || {};
    var cls = 'btn btn-' + (opts.variant || 'secondary') + (opts.size ? ' btn-' + opts.size : '') + (opts.block ? ' btn-block' : '') + (opts.cls ? ' ' + opts.cls : '') + (!label ? ' btn-icon' : '');
    var attrs = { class: cls, type: opts.type || 'button', 'aria-label': opts.ariaLabel || null, title: opts.title || (!label ? opts.ariaLabel : null) || null, disabled: opts.disabled };
    if (opts.onClick) attrs.onclick = opts.onClick;
    var el;
    if (opts.href) { attrs.href = opts.href; delete attrs.type; delete attrs.disabled; el = h('a', attrs); }
    else el = h('button', attrs);
    if (opts.icon) el.appendChild(icon(opts.icon));
    if (label) el.appendChild(h('span', null, label));
    return el;
  }

  /** Grupo de opciones exclusivas (radiogroup accesible con flechas). */
  function segmented(opts) {
    var group = h('div', { class: 'seg' + (opts.cls ? ' ' + opts.cls : ''), role: 'radiogroup', 'aria-label': opts.label || null });
    var value = opts.value;
    var btns = [];
    function sync() {
      btns.forEach(function (b) {
        var on = b._value === value;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (!btns.some(function (b) { return b.tabIndex === 0; })) {
        var first = btns.filter(function (b) { return !b.disabled; })[0];
        if (first) first.tabIndex = 0;
      }
    }
    function choose(v, focus) {
      if (v === value) return;
      value = v; sync();
      if (focus) btns.forEach(function (b) { if (b._value === v) b.focus(); });
      if (opts.onChange) opts.onChange(v);
    }
    (opts.options || []).forEach(function (o) {
      var b = h('button', {
        type: 'button', class: 'seg-opt' + (o.cls ? ' ' + o.cls : ''), role: 'radio', disabled: o.disabled,
        title: o.title || null, 'aria-label': o.ariaLabel || null,
        onclick: function () { choose(o.value, false); }
      },
        o.icon ? icon(o.icon) : null,
        h('span', { class: 'seg-label' }, o.label),
        o.desc ? h('span', { class: 'seg-desc' }, o.desc) : null);
      b._value = o.value;
      btns.push(b);
      group.appendChild(b);
    });
    group.addEventListener('keydown', function (e) {
      var keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      if (!keys[e.key]) return;
      e.preventDefault();
      var enabled = btns.filter(function (b) { return !b.disabled; });
      var idx = enabled.findIndex(function (b) { return b._value === value; });
      var next = enabled[(idx + keys[e.key] + enabled.length) % enabled.length];
      if (next) choose(next._value, true);
    });
    sync();
    group.getValue = function () { return value; };
    group.setValue = function (v) { value = v; sync(); };
    return group;
  }

  function statusControl(value, onChange, opts) {
    opts = opts || {};
    return segmented({
      label: opts.label || 'Estado',
      cls: 'seg-status' + (opts.compact ? ' seg-compact' : ''),
      value: value,
      options: STATUSES.map(function (s) { return { value: s, label: opts.compact ? L.statusShort[s] : L.status[s], cls: 'st-' + s }; }),
      onChange: onChange
    });
  }

  /** Interruptor accesible (role="switch"). */
  function toggle(opts) {
    var checked = !!opts.checked;
    var id = 'sw-' + Math.random().toString(36).slice(2, 8);
    var sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': String(checked), 'aria-labelledby': id + '-l', disabled: opts.disabled },
      h('span', { class: 'switch-knob', 'aria-hidden': 'true' }));
    sw.addEventListener('click', function () {
      checked = !checked;
      sw.setAttribute('aria-checked', String(checked));
      if (opts.onChange) opts.onChange(checked);
    });
    var row = h('div', { class: 'switch-row' + (opts.cls ? ' ' + opts.cls : '') },
      h('div', { class: 'switch-text' },
        h('span', { id: id + '-l', class: 'switch-label' }, opts.label),
        opts.desc ? h('span', { class: 'switch-desc' }, opts.desc) : null),
      sw);
    row.switchEl = sw;
    return row;
  }

  /** Control deslizante con valor visible. */
  function slider(opts) {
    var id = 'rg-' + Math.random().toString(36).slice(2, 8);
    var fmt = opts.format || function (v) { return String(v); };
    var out = h('output', { class: 'range-value num', for: id }, fmt(opts.value));
    var input = h('input', { type: 'range', id: id, class: 'range', min: opts.min, max: opts.max, step: opts.step || 1, value: opts.value, 'aria-valuetext': fmt(opts.value) });
    function paint() {
      var p = (Number(input.value) - Number(opts.min)) / (Number(opts.max) - Number(opts.min)) * 100;
      input.style.setProperty('--p', p + '%');
    }
    input.addEventListener('input', function () {
      var v = Number(input.value);
      out.textContent = fmt(v);
      input.setAttribute('aria-valuetext', fmt(v));
      paint();
      if (opts.onInput) opts.onInput(v);
    });
    input.addEventListener('change', function () { if (opts.onChange) opts.onChange(Number(input.value)); });
    paint();
    var wrap = h('div', { class: 'field field-range' },
      h('div', { class: 'field-head' }, h('label', { for: id, class: 'field-label' }, opts.label), out),
      input,
      opts.hint ? h('p', { class: 'field-hint' }, opts.hint) : null);
    wrap.input = input;
    wrap.setValue = function (v) { input.value = v; out.textContent = fmt(Number(v)); input.setAttribute('aria-valuetext', fmt(Number(v))); paint(); };
    return wrap;
  }

  function field(label, control, hint, opts) {
    opts = opts || {};
    var id = control.id || ('f-' + Math.random().toString(36).slice(2, 8));
    if (control.tagName === 'INPUT' || control.tagName === 'SELECT' || control.tagName === 'TEXTAREA') control.id = id;
    var isNative = control.tagName === 'INPUT' || control.tagName === 'SELECT' || control.tagName === 'TEXTAREA';
    var lab = isNative ? h('label', { class: 'field-label', for: id }, label) : h('span', { class: 'field-label', id: id + '-lbl' }, label);
    if (!isNative && control.getAttribute && !control.getAttribute('aria-label')) control.setAttribute('aria-labelledby', id + '-lbl');
    return h('div', { class: 'field' + (opts.cls ? ' ' + opts.cls : '') }, lab, control, hint ? h('p', { class: 'field-hint' }, hint) : null);
  }

  function select(options, value, onChange, attrs) {
    var s = h('select', Object.assign({ class: 'select' }, attrs || {}));
    options.forEach(function (o) { s.appendChild(h('option', { value: o.value, selected: o.value === value, disabled: o.disabled }, o.label)); });
    if (onChange) s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }

  function badge(text, cls) { return h('span', { class: 'badge' + (cls ? ' ' + cls : '') }, text); }
  function levelBadge(level) { return badge(L.level[level] || level, 'badge-level lv-' + level); }
  function statusBadge(status) { return status ? badge(L.status[status] || status, 'badge-status st-' + status) : null; }

  function demandDots(n) {
    n = Number(n) || 1;
    var wrap = h('span', { class: 'demand', role: 'img', 'aria-label': 'Exigencia ' + (L.demand[n] || n).toLowerCase() });
    for (var i = 1; i <= 3; i++) wrap.appendChild(h('span', { class: 'demand-dot' + (i <= n ? ' on' : ''), 'aria-hidden': 'true' }));
    return wrap;
  }

  /**
   * Material de una ronda ({dumbbells, ball, paper}) como lista de textos.
   * El papel va en la mejilla de la mano atrasada: derecha si es diestro, izquierda si es zurdo.
   * @returns {{key: string, short: string, long: string}[]}
   */
  function materialItems(m, stanceValue) {
    if (!m) return [];
    var rearSide = stanceValue === 'zurdo' ? 'izquierda' : 'derecha';
    var out = [];
    if (m.dumbbells) out.push({ key: 'dumbbells', short: 'Mancuernas', long: 'Mancuernas de 1 kg: golpes controlados, sin bloquear el codo' });
    if (m.rope) out.push({ key: 'rope', short: 'Cuerda', long: 'Cuerda de esquivas: pasa por debajo con cintura completa o sentadilla y haz la media cintura a su lado' });
    if (m.hangball) out.push({ key: 'hangball', short: 'Pelota colgada', long: 'Pelota de tenis colgada: golpéala, esquívala y gira a su alrededor' });
    if (m.paper) out.push({ key: 'paper', short: 'Papel', long: 'Papel entre el guante y la mejilla ' + rearSide + ': esa mano no se separa de la cara' });
    if (m.elbow) out.push({ key: 'elbow', short: 'Toalla', long: 'Toalla o guante bajo el codo ' + (stanceValue === 'zurdo' ? 'izquierdo' : 'derecho') + ': aprieta el codo contra el costado' });
    if (m.ball) out.push({ key: 'ball', short: 'Pelota', long: 'Pelota bajo la barbilla: que no se caiga' });
    if (m.tape) out.push({ key: 'tape', short: 'Cinta', long: 'Cinta en el suelo: punta del pie delantero y talón trasero junto a la línea; en la cruz, pivota 90°' });
    if (m.ankles) out.push({ key: 'ankles', short: 'Goma tobillos', long: 'Goma en los tobillos: al moverte, los pies siempre a la anchura de los hombros' });
    return out;
  }

  /**
   * Cómo preparar cada objeto antes de empezar (solo los que se usan en la sesión).
   * @param {object[]} list material de cada ronda (y de los ejercicios)
   * @returns {{key, short, text}[]}
   */
  function materialSetup(list, stanceValue) {
    var used = {};
    (list || []).forEach(function (m) { if (m) Object.keys(m).forEach(function (k) { if (m[k]) used[k] = true; }); });
    var rearSide = stanceValue === 'zurdo' ? 'izquierda' : 'derecha';
    var SETUP = [
      ['dumbbells', 'Mancuernas de 1 kg', 'Déjalas a mano: la app te dice en qué rondas cogerlas y cuándo dejarlas.'],
      ['rope', 'Comba como cuerda de esquivas', 'Átala tensa entre dos puntos (pomos, muebles) a la altura del pecho, con unos 3 m libres. Pasa por debajo flexionando las piernas, no la espalda.'],
      ['hangball', 'Pelota de tenis colgada', 'Cuélgala de un hilo (del techo o del marco de una puerta) a la altura de la cara. Golpes suaves: solo hay que tocarla.'],
      ['paper', 'Papel', 'Una hoja doblada entre el guante y la mejilla ' + rearSide + '.'],
      ['elbow', 'Toalla o guante', 'Una toalla pequeña o un guante bajo el codo ' + (stanceValue === 'zurdo' ? 'izquierdo' : 'derecho') + ', apretado contra el costado.'],
      ['ball', 'Pelota pequeña', 'Bajo la barbilla, sujeta con el mentón recogido.'],
      ['tape', 'Cinta en el suelo', 'Pega con cinta de pintor una línea recta de 2-3 m y una cruz. En la línea: punta del pie delantero y talón trasero junto a ella. En la cruz: pivota 90° sin perder la guardia.'],
      ['ankles', 'Goma en los tobillos', 'Una goma circular ligera en los tobillos que quede justa con los pies a la anchura de los hombros: si se tensa, has abierto demasiado. Que se quite en segundos: antes del HIIT solo hay 5 s.']
    ];
    return SETUP.filter(function (x) { return used[x[0]]; }).map(function (x) { return { key: x[0], short: x[1], text: x[2] }; });
  }
  function materialChips(m, stanceValue, cls) {
    var items = materialItems(m, stanceValue);
    if (!items.length) return null;
    return h('span', { class: 'mat-chips' + (cls ? ' ' + cls : '') },
      items.map(function (it) { return h('span', { class: 'mat-chip mat-' + it.key, title: it.long }, it.short); }));
  }

  function screenHeader(opts) {
    var back = opts.back ? h('a', { class: 'btn btn-ghost btn-icon back-btn', href: opts.back, 'aria-label': opts.backLabel || 'Volver' }, icon('back')) : null;
    return h('header', { class: 'screen-head' + (opts.cls ? ' ' + opts.cls : '') },
      back,
      h('div', { class: 'screen-head-text' },
        opts.eyebrow ? h('p', { class: 'eyebrow' }, opts.eyebrow) : null,
        h('h1', { class: 'h1' }, opts.title)),
      opts.actions ? h('div', { class: 'screen-head-actions' }, opts.actions) : null);
  }

  function section(title, content, opts) {
    opts = opts || {};
    return h('section', { class: 'section' + (opts.cls ? ' ' + opts.cls : ''), 'aria-label': opts.ariaLabel || null },
      (title || opts.actions) ? h('div', { class: 'section-head' },
        title ? h('h2', { class: 'h2' }, title) : h('span'),
        opts.actions || null) : null,
      opts.desc ? h('p', { class: 'section-desc' }, opts.desc) : null,
      content);
  }

  function empty(text, action) {
    return h('div', { class: 'empty' }, h('p', null, text), action || null);
  }

  function callout(text, kind, iconName) {
    return h('div', { class: 'callout' + (kind ? ' callout-' + kind : '') }, icon(iconName || 'info'), h('div', null, text));
  }

  // ---------------------------------------------------------------------------
  // Diálogos (<dialog> nativo: foco atrapado y Esc gestionados por el navegador)
  // ---------------------------------------------------------------------------
  function modal(opts) {
    var dlg = h('dialog', { class: 'modal' + (opts.size ? ' modal-' + opts.size : ''), 'aria-labelledby': 'mdl-t' });
    var titleId = 'mdl-' + Math.random().toString(36).slice(2, 8);
    dlg.setAttribute('aria-labelledby', titleId);
    var closed = false;
    function close(result) {
      if (closed) return; closed = true;
      try { dlg.close(); } catch (e) { /* noop */ }
      if (dlg.parentNode) dlg.parentNode.removeChild(dlg);
      if (opts.onClose) opts.onClose(result);
    }
    var head = h('div', { class: 'modal-head' },
      h('h2', { class: 'h2', id: titleId }, opts.title || ''),
      opts.noClose ? null : button('', { icon: 'close', variant: 'ghost', ariaLabel: 'Cerrar', onClick: function () { close(null); } }));
    var body = h('div', { class: 'modal-body' });
    append(body, opts.body);
    var foot = opts.actions ? h('div', { class: 'modal-foot' }, opts.actions) : null;
    dlg.appendChild(head); dlg.appendChild(body); if (foot) dlg.appendChild(foot);
    dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(null); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg && !opts.noBackdropClose) close(null); });
    document.body.appendChild(dlg);
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    var api = { el: dlg, body: body, foot: foot, close: close };
    if (opts.onOpen) opts.onOpen(api);
    return api;
  }

  function confirmDialog(opts) {
    return new Promise(function (resolve) {
      var m;
      var ok = button(opts.okLabel || 'Aceptar', { variant: opts.danger ? 'danger-solid' : 'primary', onClick: function () { m.close(true); } });
      var cancel = button(opts.cancelLabel || 'Cancelar', { variant: 'secondary', onClick: function () { m.close(false); } });
      m = modal({
        title: opts.title || '¿Seguro?', size: 's',
        body: opts.message ? h('p', { class: 'modal-text' }, opts.message) : null,
        actions: [cancel, ok],
        onClose: function (r) { resolve(r === true); }
      });
      setTimeout(function () { (opts.focusCancel ? cancel : ok).focus(); }, 30);
    });
  }

  function promptDialog(opts) {
    return new Promise(function (resolve) {
      var input = h('input', { class: 'input', type: 'text', value: opts.value || '', maxlength: opts.maxlength || 60, placeholder: opts.placeholder || '' });
      var m;
      var form = h('form', { onsubmit: function (e) { e.preventDefault(); if (input.value.trim()) m.close(input.value.trim()); } },
        field(opts.label || 'Nombre', input));
      m = modal({
        title: opts.title, size: 's', body: form,
        actions: [
          button('Cancelar', { onClick: function () { m.close(null); } }),
          button(opts.okLabel || 'Guardar', { variant: 'primary', onClick: function () { if (input.value.trim()) m.close(input.value.trim()); else input.focus(); } })
        ],
        onClose: function (r) { resolve(typeof r === 'string' ? r : null); }
      });
      setTimeout(function () { input.focus(); input.select(); }, 30);
    });
  }

  /** Diálogo con demostración (animación o vídeo) de un movimiento o combinación. */
  function demoDialog(opts) {
    var holder = h('div', { class: 'demo-holder' });
    var demo = null;
    var m = modal({
      title: opts.title || 'Demostración', size: 'm',
      body: [holder, opts.caption ? h('div', { class: 'demo-caption' }, opts.caption) : null],
      onClose: function () { if (demo) safe(function () { demo.destroy(); }); }
    });
    if (has('visual.demo.mount')) {
      demo = safe(function () { return SB.visual.demo.mount(holder, { stance: stance() }); }, null);
      if (demo) safe(function () {
        if (opts.exercise && demo.showExercise) demo.showExercise(opts.exercise);
        else if (opts.seq && opts.seq.length > 1) demo.showCombo(opts.seq);
        else demo.showMovement(opts.id || (opts.seq && opts.seq[0]));
      });
    }
    if (!demo) holder.appendChild(h('p', { class: 'muted demo-missing' }, 'La demostración no está disponible.'));
    return m;
  }

  // ---------------------------------------------------------------------------
  // Avisos breves
  // ---------------------------------------------------------------------------
  function toast(msg, opts) {
    opts = opts || {};
    var host = document.getElementById('toasts');
    if (!host) { host = h('div', { id: 'toasts', class: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.appendChild(host); }
    var t = h('div', { class: 'toast' + (opts.kind ? ' toast-' + opts.kind : '') }, msg);
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () {
      t.classList.remove('in');
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, opts.duration || 2800);
  }

  // ---------------------------------------------------------------------------
  // Formato
  // ---------------------------------------------------------------------------
  function fmtTime(sec) {
    if (SB.util && SB.util.fmtTime) return SB.util.fmtTime(sec);
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }
  function fmtDuration(sec) {
    sec = Math.round(sec || 0);
    var m = Math.floor(sec / 60), s = sec % 60;
    if (m && s) return m + ' min ' + s + ' s';
    if (m) return m + ' min';
    return s + ' s';
  }
  function dayKey(d) {
    if (SB.util && SB.util.dayKey) return SB.util.dayKey(d || new Date());
    d = d || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  function downloadFile(name, text, type) {
    var blob = new Blob([text], { type: type || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name, style: { display: 'none' } });
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  /**
   * «Probar cámara»: abre la cámara (probando otra si la primera falla), carga el detector y dice
   * si te ve entero, o qué falla y cómo arreglarlo. Con varias cámaras deja elegir cuál usar.
   * No graba nada y se apaga sola al minuto. Devuelve un elemento con .dispose() (apaga la cámara).
   */
  function cameraTester() {
    var P = SB.vision && SB.vision.pose;
    var video = h('video', { class: 'camtest-video', 'aria-hidden': 'true' });
    video.muted = true; video.playsInline = true; video.setAttribute('playsinline', '');
    var canvas = h('canvas', { class: 'camtest-canvas', 'aria-hidden': 'true' });
    var view = h('div', { class: 'camtest-view', hidden: true }, video, canvas);
    var status = h('p', { class: 'camtest-status small', role: 'status', 'aria-live': 'polite' });
    var fix = h('p', { class: 'camtest-fix small', hidden: true });
    var sel = h('select', { class: 'select camtest-select', id: 'camsel-' + Math.random().toString(36).slice(2, 8) });
    var pick = h('div', { class: 'camtest-pick', hidden: true }, h('label', { class: 'field-label', for: sel.id }, 'Cámara'), sel);
    var btn = button('Probar cámara', { icon: 'video', variant: 'secondary', size: 's', cls: 'camtest-btn', onClick: function () { if (stream || busy) { stop(); say('Cámara apagada.'); fix.hidden = true; } else start(); } });
    var stream = null, tracker = null, busy = false, token = 0, offTimer = 0, okShown = false;

    function settings() { return SB.app ? SB.app.settings() : {}; }
    function say(text, kind) { status.textContent = text || ''; status.className = 'camtest-status small' + (kind ? ' is-' + kind : ''); }
    function label(text) { var s = btn.querySelector('span'); if (s) s.textContent = text; }
    function fillPicker() {
      if (!P || !P.listCameras) return;
      P.listCameras().then(function (list) {
        list = list.filter(function (c) { return c.deviceId; });
        pick.hidden = list.length < 2;
        if (list.length < 2) return;
        var cur = settings().cameraId || '';
        clear(sel);
        sel.appendChild(h('option', { value: '' }, 'Automática (recomendada)'));
        list.forEach(function (c) { sel.appendChild(h('option', { value: c.deviceId, selected: c.deviceId === cur }, c.label + (c.virtual ? ' · virtual' : ''))); });
        if (cur && !list.some(function (c) { return c.deviceId === cur; })) sel.value = '';
      });
    }
    sel.addEventListener('change', function () {
      if (SB.app) SB.app.saveSettings({ cameraId: sel.value, cameraLastId: '' });
      if (stream || busy) { stop(); start(); }
    });

    function stop() {
      token++;
      busy = false;
      clearTimeout(offTimer);
      if (tracker) { tracker.stop(); tracker = null; }
      if (P) P.closeCamera(video, stream);
      stream = null;
      view.hidden = true;
      label('Probar cámara');
    }
    function fail(e) {
      var d = P ? P.describeError(e) : { msg: 'No se pudo iniciar la cámara.', fix: '', code: (e && e.name) || 'Error' };
      say(d.msg + ' (' + d.code + ')', 'error');
      fix.textContent = d.fix; fix.hidden = !d.fix;
      stop();
      fillPicker();
    }
    function start() {
      if (!P || !P.supported()) { fail({ name: 'UnsupportedError' }); return; }
      var my = ++token;
      busy = true; okShown = false;
      fix.hidden = true;
      label('Apagar cámara');
      say('Abriendo la cámara…');
      var s = settings();
      P.openCamera(video, { deviceId: s.cameraId || '', lastId: s.cameraLastId || '' }).then(function (r) {
        if (my !== token) { P.closeCamera(video, r.stream); return; }
        stream = r.stream;
        view.hidden = false;
        if (SB.app && r.deviceId && r.deviceId !== s.cameraLastId) SB.app.saveSettings({ cameraLastId: r.deviceId });
        fillPicker();
        var name = r.label ? '«' + r.label + '»' : 'la cámara';
        if (r.black) { say('Se abre ' + name + ', pero la imagen sale negra.', 'warn'); fix.textContent = 'Quita la tapa o enciéndela con la tecla del portátil. Si tienes otra cámara, elígela abajo.'; fix.hidden = false; }
        else say('La cámara funciona: ' + name + '. Cargando el detector de postura…');
        offTimer = setTimeout(function () { if (my === token) { stop(); say('Prueba terminada: la cámara se ha apagado.'); } }, 60000);
        return P.load(function (m) { if (my === token && !r.black) say(m); }).then(function (lm) {
          if (my !== token) return;
          busy = false;
          tracker = new P.Tracker(video, lm, function (f) {
            if (my !== token) return;
            if (canvas.width !== f.w) { canvas.width = f.w; canvas.height = f.h; }
            P.drawSkeleton(canvas, f.lm);
            var t = P.framingText(f.lm);
            if (r.black) return;
            if (t === 'Te veo entero') { okShown = true; say('Todo listo: te veo entero con ' + name + '.', 'ok'); }
            else if (!okShown) say('Cámara y detector funcionan. ' + t + '.', 'warn');
          });
          tracker.active = true;
          tracker.start();
          if (!r.black) say('Cámara y detector funcionan. Colócate para que se te vea de la cabeza a los pies.');
        });
      }).catch(function (e) {
        if (my !== token) return;
        console.warn('[SOMBRA] prueba de cámara', e);
        fail(e);
      });
    }

    var box = h('div', { class: 'camtest' },
      h('div', { class: 'camtest-row' }, btn, h('p', { class: 'muted small camtest-note' }, 'Comprueba que funciona antes de entrenar. No se graba nada.')),
      status, fix, view, pick);
    box.dispose = stop;
    fillPicker();
    return box;
  }

  SB.ui = {
    ICONS: ICONS, icon: icon, h: h, append: append, clear: clear, safe: safe, has: has,
    cameraTester: cameraTester,
    labels: L, CATEGORY_ORDER: CATEGORY_ORDER, STATUSES: STATUSES,
    movement: movement, movementName: movementName, goals: goals, goal: goal, goalName: goalName, goalIcon: goalIcon,
    focuses: focuses, focusName: focusName, isCustomMovement: isCustomMovement, kindOf: kindOf, stance: stance,
    tokenData: tokenData, comboText: comboText, subText: subText, tokens: tokens,
    button: button, segmented: segmented, statusControl: statusControl, toggle: toggle, slider: slider,
    field: field, select: select, badge: badge, levelBadge: levelBadge, statusBadge: statusBadge, demandDots: demandDots,
    materialItems: materialItems, materialChips: materialChips, materialSetup: materialSetup,
    screenHeader: screenHeader, section: section, empty: empty, callout: callout,
    modal: modal, confirm: confirmDialog, prompt: promptDialog, demoDialog: demoDialog, toast: toast,
    fmtTime: fmtTime, fmtDuration: fmtDuration, dayKey: dayKey, plural: plural, downloadFile: downloadFile
  };
  SB.screens = SB.screens || {};
})(window.SB = window.SB || {});
