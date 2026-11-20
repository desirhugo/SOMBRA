/* SOMBRA · biblioteca (#/library?tab=tecnicas|catalogo|combinaciones|hiit)
   Incluye el formulario de movimiento personalizado (§8.4) y el constructor de combinaciones. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  var TABS = [
    { id: 'tecnicas', label: 'Mis técnicas' },
    { id: 'catalogo', label: 'Catálogo' },
    { id: 'combinaciones', label: 'Combinaciones' },
    { id: 'hiit', label: 'HIIT' }
  ];
  var TAGS = ['fundamental', 'ofensiva', 'velocidad', 'potencia', 'defensa', 'contra', 'desplazamiento', 'angulo', 'niveles', 'finta', 'ritmo', 'entrada', 'salida'];
  var TAG_LABEL = { angulo: 'ángulo' };
  var filters = { qMine: '', qCat: '', level: 'all', tag: 'all', onlyAvailable: false };

  function lib() { return SB.library || null; }
  function personal() { return ui.safe(function () { return lib().personal(); }, []) || []; }
  function catalog() { return ui.safe(function () { return lib().catalog(); }, null) || ((SB.data && SB.data.movements) || []); }
  function statusOf(id) { return ui.safe(function () { return lib().statusOf(id); }, null); }
  function isAvailable(seq) { return ui.safe(function () { return lib().isAvailable(seq); }, false); }
  function byCategory(list) {
    var groups = {};
    list.forEach(function (m) { (groups[m.category] = groups[m.category] || []).push(m); });
    return ui.CATEGORY_ORDER.filter(function (c) { return groups[c] && groups[c].length; }).map(function (c) { return { category: c, items: groups[c] }; })
      .concat(Object.keys(groups).filter(function (c) { return ui.CATEGORY_ORDER.indexOf(c) < 0; }).map(function (c) { return { category: c, items: groups[c] }; }));
  }
  function matches(m, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return [m.name, m.short, m.id, m.subcategory].some(function (x) { return x && String(x).toLowerCase().indexOf(q) >= 0; });
  }

  /** Ficha compacta con la notación de un movimiento. */
  function moveChip(m) {
    var t = ui.tokenData([m.id])[0] || { label: m.short || m.id, kind: ui.kindOf(m) };
    var sub = ui.subText(t);
    return h('span', { class: 'move-chip k-' + (t.kind || ui.kindOf(m)), 'aria-hidden': 'true' },
      h('span', { class: 'move-chip-l' }, t.label), sub ? h('span', { class: 'move-chip-s' }, sub) : null);
  }

  function searchBox(value, placeholder, onInput) {
    var input = h('input', { type: 'search', class: 'input search', value: value, placeholder: placeholder, 'aria-label': placeholder });
    input.addEventListener('input', function () { onInput(input.value); });
    return h('div', { class: 'search-wrap' }, ui.icon('search', { cls: 'search-ico' }), input);
  }

  // ===========================================================================
  // Pestaña: Mis técnicas
  // ===========================================================================
  function panelMine(panel, rerender) {
    var mine = personal();
    var list = h('div', { class: 'groups' });
    function draw() {
      ui.clear(list);
      var filtered = mine.filter(function (m) { return m.category !== 'base' && matches(m, filters.qMine); });
      if (!mine.length) {
        list.appendChild(ui.empty('Tu biblioteca está vacía. Añade técnicas desde el catálogo.',
          ui.button('Ir al catálogo', { variant: 'primary', onClick: function () { rerender('catalogo'); } })));
        return;
      }
      if (!filtered.length) { list.appendChild(ui.empty('Ninguna técnica coincide con la búsqueda.')); return; }
      byCategory(filtered).forEach(function (g) {
        list.appendChild(h('section', { class: 'group' },
          h('h3', { class: 'group-title' }, (L.category[g.category] || g.category), h('span', { class: 'count num' }, String(g.items.length))),
          h('ul', { class: 'rows' }, g.items.map(function (m) {
            return h('li', { class: 'row tech-row' },
              moveChip(m),
              h('a', { class: 'row-main', href: '#/library/m/' + encodeURIComponent(m.id) },
                h('span', { class: 'row-title' }, m.name),
                h('span', { class: 'row-sub' }, [m.subcategory, L.level[m.level]].filter(Boolean).join(' · ') + (ui.isCustomMovement(m) ? ' · propio' : ''))),
              h('div', { class: 'row-actions' },
                ui.statusControl(m.status, function (s) {
                  ui.safe(function () { lib().setStatus(m.id, s); });
                  m.status = s;
                  ui.toast(m.name + ': ' + L.status[s].toLowerCase());
                }, { compact: true, label: 'Estado de ' + m.name }),
                ui.button('', {
                  icon: 'trash', variant: 'ghost', ariaLabel: 'Quitar ' + m.name + ' de mi biblioteca',
                  onClick: function () {
                    ui.confirm({ title: 'Quitar técnica', message: '«' + m.name + '» dejará de aparecer en tus sesiones. Puedes volver a añadirla desde el catálogo.', okLabel: 'Quitar', danger: true })
                      .then(function (ok) {
                        if (!ok) return;
                        ui.safe(function () { lib().remove(m.id); });
                        ui.toast('Técnica quitada');
                        rerender('tecnicas');
                      });
                  }
                })));
          }))));
      });
    }
    panel.appendChild(h('div', { class: 'panel-tools' },
      searchBox(filters.qMine, 'Buscar en mis técnicas', function (v) { filters.qMine = v; draw(); }),
      h('p', { class: 'muted small' }, ui.plural(mine.filter(function (m) { return m.category !== 'base'; }).length, 'técnica', 'técnicas'))));
    panel.appendChild(list);
    draw();
  }

  // ===========================================================================
  // Pestaña: Catálogo
  // ===========================================================================
  function panelCatalog(panel, rerender) {
    var all = catalog();
    var list = h('div', { class: 'groups' });
    function draw() {
      ui.clear(list);
      var filtered = all.filter(function (m) { return matches(m, filters.qCat); });
      if (!filtered.length) { list.appendChild(ui.empty('Ningún movimiento coincide con la búsqueda.')); return; }
      byCategory(filtered).forEach(function (g) {
        list.appendChild(h('section', { class: 'group' },
          h('h3', { class: 'group-title' }, (L.category[g.category] || g.category), h('span', { class: 'count num' }, String(g.items.length))),
          h('ul', { class: 'rows' }, g.items.map(function (m) {
            var st = statusOf(m.id);
            var actions;
            if (m.category === 'base') {
              actions = h('span', { class: 'muted small' }, 'Referencia');
            } else if (st) {
              actions = h('span', { class: 'in-lib' }, ui.icon('check'), ui.statusBadge(st));
            } else {
              var sel = ui.select(ui.STATUSES.map(function (s) { return { value: s, label: L.status[s] }; }), 'aprendido', null, { 'aria-label': 'Estado inicial de ' + m.name, class: 'select select-s' });
              actions = h('div', { class: 'add-group' }, sel,
                ui.button('Añadir', {
                  icon: 'plus', variant: 'primary', size: 's', ariaLabel: 'Añadir ' + m.name,
                  onClick: function () {
                    ui.safe(function () { lib().add(m.id, sel.value); });
                    ui.toast('«' + m.name + '» añadido como ' + L.status[sel.value].toLowerCase());
                    draw();
                  }
                }));
            }
            return h('li', { class: 'row cat-row' + (st ? ' is-in' : '') },
              moveChip(m),
              h('a', { class: 'row-main', href: '#/library/m/' + encodeURIComponent(m.id) },
                h('span', { class: 'row-title' }, m.name),
                h('span', { class: 'row-sub' }, [m.subcategory, L.level[m.level]].filter(Boolean).join(' · ') + (ui.isCustomMovement(m) ? ' · propio' : ''))),
              h('div', { class: 'row-actions' }, actions));
          }))));
      });
    }
    panel.appendChild(h('div', { class: 'panel-tools' },
      searchBox(filters.qCat, 'Buscar en el catálogo', function (v) { filters.qCat = v; draw(); }),
      h('p', { class: 'muted small' }, ui.plural(all.length, 'movimiento', 'movimientos'))));
    panel.appendChild(list);
    draw();
  }

  // ===========================================================================
  // Pestaña: Combinaciones
  // ===========================================================================
  function missingNames(seq) {
    var miss = [];
    (seq || []).forEach(function (id) { if (!statusOf(id) && miss.indexOf(id) < 0) miss.push(id); });
    return miss.map(ui.movementName);
  }

  function panelCombos(panel, rerender) {
    // --- Mis combinaciones
    var mine = ui.safe(function () { return lib().combos.personal(); }, []) || [];
    var mineList = h('ul', { class: 'rows combo-rows' });
    if (!mine.length) {
      mineList.appendChild(h('li', null, ui.empty('Aún no tienes combinaciones propias. Crea las secuencias que trabajas en clase con las técnicas de tu biblioteca.')));
    }
    mine.forEach(function (c) {
      var miss = missingNames(c.seq);
      mineList.appendChild(h('li', { class: 'row combo-row' },
        h('div', { class: 'combo-main' },
          h('button', { type: 'button', class: 'combo-tokens-btn', 'aria-label': 'Ver demostración de ' + (c.name || ui.comboText(c.seq)), onclick: function () { ui.demoDialog({ title: c.name || 'Combinación', seq: c.seq, caption: ui.tokens(c.seq, { size: 'm' }) }); } },
            ui.tokens(c.seq, { size: 'm' })),
          h('span', { class: 'row-title' }, c.name || ui.comboText(c.seq)),
          c.note ? h('p', { class: 'row-note' }, c.note) : null,
          miss.length ? h('p', { class: 'warn-text' }, ui.icon('warning'), 'No se usará: falta ' + miss.join(', ') + ' en tu biblioteca.') : null),
        h('div', { class: 'row-actions' },
          ui.statusControl(c.status || 'aprendido', function (s) { ui.safe(function () { lib().combos.updatePersonal(c.id, { status: s }); }); c.status = s; }, { compact: true, label: 'Estado de la combinación' }),
          ui.button('', { icon: 'edit', variant: 'ghost', ariaLabel: 'Editar combinación', onClick: function () { openComboBuilder(c, function () { rerender('combinaciones'); }); } }),
          ui.button('', {
            icon: 'trash', variant: 'ghost', ariaLabel: 'Eliminar combinación',
            onClick: function () {
              ui.confirm({ title: 'Eliminar combinación', message: '¿Eliminar «' + (c.name || ui.comboText(c.seq)) + '»?', okLabel: 'Eliminar', danger: true }).then(function (ok) {
                if (!ok) return;
                ui.safe(function () { lib().combos.removePersonal(c.id); });
                ui.toast('Combinación eliminada');
                rerender('combinaciones');
              });
            }
          }))));
    });
    panel.appendChild(ui.section('Mis combinaciones', mineList, {
      actions: ui.button('Nueva combinación', { icon: 'plus', variant: 'primary', size: 's', onClick: function () { openComboBuilder(null, function () { rerender('combinaciones'); }); } }),
      desc: 'Secuencias propias («hook adelantado y cross», «pivote tras la combinación»…) con su estado.'
    }));

    // --- Curadas
    var curated = ui.safe(function () { return lib().combos.curated(); }, null) || ((SB.data && SB.data.combinations) || []);
    var count = h('p', { class: 'muted small num' });
    var list = h('ul', { class: 'rows combo-rows' });
    function draw() {
      ui.clear(list);
      var shown = curated.filter(function (c) {
        if (filters.level !== 'all' && c.level !== filters.level) return false;
        if (filters.tag !== 'all' && (c.tags || []).indexOf(filters.tag) < 0) return false;
        if (filters.onlyAvailable && !isAvailable(c.seq)) return false;
        return true;
      });
      count.textContent = ui.plural(shown.length, 'combinación', 'combinaciones');
      if (!shown.length) { list.appendChild(h('li', null, ui.empty('Ninguna combinación con estos filtros.'))); return; }
      shown.forEach(function (c) {
        var avail = isAvailable(c.seq);
        var miss = avail ? [] : missingNames(c.seq);
        list.appendChild(h('li', { class: 'row combo-row' + (avail ? '' : ' is-unavailable') },
          h('div', { class: 'combo-main' },
            h('button', { type: 'button', class: 'combo-tokens-btn', 'aria-label': 'Ver demostración de ' + (c.name || ui.comboText(c.seq)), onclick: function () { ui.demoDialog({ title: c.name || 'Combinación', seq: c.seq, caption: ui.tokens(c.seq, { size: 'm' }) }); } },
              ui.tokens(c.seq, { size: 'm' })),
            h('span', { class: 'row-title' }, c.name || ''),
            h('span', { class: 'row-meta' }, ui.levelBadge(c.level), (c.tags || []).map(function (t) { return ui.badge(TAG_LABEL[t] || t, 'badge-tag'); })),
            c.note ? h('p', { class: 'row-note' }, c.note) : null,
            miss.length ? h('p', { class: 'warn-text' }, ui.icon('lock'), 'Falta en tu biblioteca: ' + miss.join(', ')) : null)));
      });
    }
    var tagSel = ui.select([{ value: 'all', label: 'Todas las etiquetas' }].concat(TAGS.map(function (t) { return { value: t, label: TAG_LABEL[t] || t }; })), filters.tag,
      function (v) { filters.tag = v; draw(); }, { 'aria-label': 'Filtrar por etiqueta' });
    var lvlSeg = ui.segmented({
      label: 'Filtrar por nivel', cls: 'seg-compact', value: filters.level,
      options: [{ value: 'all', label: 'Todos' }, { value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }],
      onChange: function (v) { filters.level = v; draw(); }
    });
    var availToggle = ui.toggle({ label: 'Solo disponibles', checked: filters.onlyAvailable, cls: 'switch-inline', onChange: function (v) { filters.onlyAvailable = v; draw(); } });
    panel.appendChild(ui.section('Combinaciones de la biblioteca', h('div', null,
      h('div', { class: 'filters' }, lvlSeg, tagSel, availToggle, count),
      list), { desc: 'Combinaciones revisadas. El motor solo usa las que tienen todas sus técnicas en tu biblioteca. Toca la notación para ver la demostración.' }));
    draw();
  }

  // ---------------------------------------------------------------------------
  // Constructor de combinaciones personales
  // ---------------------------------------------------------------------------
  function openComboBuilder(existing, onSaved) {
    var s = SB.app.settings();
    var state = {
      seq: existing ? existing.seq.slice() : [],
      name: existing ? (existing.name || '') : '',
      note: existing ? (existing.note || '') : '',
      status: existing ? (existing.status || 'aprendido') : 'aprendido',
      level: s.lastLevel === 'avanzado' ? 'avanzado' : 'basico'
    };
    var mine = personal().filter(function (m) { return m.category !== 'base'; });

    var seqBox = h('div', { class: 'builder-seq', 'aria-live': 'polite' });
    var valBox = h('div', { class: 'builder-val' });
    var saveBtn;

    function drawSeq() {
      ui.clear(seqBox);
      if (!state.seq.length) {
        seqBox.appendChild(h('p', { class: 'muted builder-empty' }, 'Toca técnicas de abajo para construir la secuencia.'));
      } else {
        var data = ui.tokenData(state.seq);
        data.forEach(function (t, i) {
          var sub = ui.subText(t);
          seqBox.appendChild(h('button', {
            type: 'button', class: 'seq-tok k-' + (t.kind || 'golpe'),
            'aria-label': 'Quitar ' + ui.movementName(state.seq[i]) + ' (posición ' + (i + 1) + ')',
            onclick: function () { state.seq.splice(i, 1); update(); }
          }, h('span', { class: 'seq-tok-l' }, t.label), sub ? h('span', { class: 'seq-tok-s' }, sub) : null, ui.icon('close', { cls: 'seq-x' })));
        });
      }
      validate();
    }
    function validate() {
      ui.clear(valBox);
      var ok = false;
      if (!state.seq.length) {
        valBox.appendChild(h('p', { class: 'muted small' }, 'La secuencia se valida en directo según el nivel elegido.'));
      } else if (!SB.grammar || !SB.grammar.validate) {
        valBox.appendChild(ui.callout('El validador no está disponible.', 'warning', 'warning'));
      } else {
        var r = ui.safe(function () { return SB.grammar.validate(state.seq, { level: state.level }); }, { ok: false, errors: ['No se pudo validar la secuencia.'] });
        ok = !!r.ok;
        if (ok) {
          valBox.appendChild(h('div', { class: 'callout callout-ok' }, ui.icon('check'),
            h('div', null, 'Secuencia coherente' + (r.complexity != null ? ' · complejidad ' + String(r.complexity).replace('.', ',') : '') + '.')));
        } else {
          valBox.appendChild(h('div', { class: 'callout callout-danger' }, ui.icon('warning'),
            h('div', null, h('strong', null, 'Revisa la secuencia:'),
              h('ul', { class: 'err-list' }, (r.errors && r.errors.length ? r.errors : ['La secuencia no es válida.']).map(function (e) { return h('li', null, e); })))));
        }
      }
      if (saveBtn) saveBtn.disabled = !ok;
    }
    function update() { drawSeq(); }

    var palette = h('div', { class: 'palette' });
    if (!mine.length) palette.appendChild(ui.empty('Tu biblioteca está vacía.'));
    byCategory(mine).forEach(function (g) {
      palette.appendChild(h('div', { class: 'palette-group' },
        h('p', { class: 'eyebrow' }, L.category[g.category] || g.category),
        h('div', { class: 'palette-items' }, g.items.map(function (m) {
          var t = ui.tokenData([m.id])[0] || { label: m.short || m.id };
          var sub = ui.subText(t);
          return h('button', {
            type: 'button', class: 'pal-btn k-' + (t.kind || ui.kindOf(m)), title: m.name, 'aria-label': 'Añadir ' + m.name,
            onclick: function () { if (state.seq.length >= 8) { ui.toast('Máximo 8 elementos'); return; } state.seq.push(m.id); update(); }
          }, h('span', { class: 'pal-l' }, t.label), sub ? h('span', { class: 'pal-s' }, sub) : null);
        }))));
    });

    var nameInput = h('input', { class: 'input', type: 'text', maxlength: 60, value: state.name, placeholder: 'Opcional: p. ej. «Gancho y cross de clase»' });
    var noteInput = h('textarea', { class: 'textarea', rows: 2, maxlength: 240, placeholder: 'Opcional: cuándo usarla, qué cuidar…' }, state.note);
    var levelSeg = ui.segmented({ label: 'Validar para nivel', cls: 'seg-compact', value: state.level,
      options: [{ value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }],
      onChange: function (v) { state.level = v; validate(); } });
    var statusSeg = ui.statusControl(state.status, function (v) { state.status = v; }, { label: 'Estado' });

    var m;
    saveBtn = ui.button(existing ? 'Guardar cambios' : 'Guardar combinación', {
      variant: 'primary', icon: 'check', disabled: true,
      onClick: function () {
        var data = { seq: state.seq.slice(), name: nameInput.value.trim() || ui.comboText(state.seq), status: state.status, note: noteInput.value.trim() };
        var ok = ui.safe(function () {
          if (existing) lib().combos.updatePersonal(existing.id, data);
          else lib().combos.addPersonal(data);
          return true;
        }, false);
        if (!ok) { ui.toast('No se pudo guardar la combinación.'); return; }
        m.close(true);
        ui.toast(existing ? 'Combinación actualizada' : 'Combinación guardada');
        if (onSaved) onSaved();
      }
    });

    m = modal();
    function modal() {
      return ui.modal({
        title: existing ? 'Editar combinación' : 'Nueva combinación', size: 'l',
        body: h('div', { class: 'builder' },
          h('div', { class: 'builder-top' },
            h('div', { class: 'builder-seq-wrap' },
              h('div', { class: 'builder-seq-head' },
                h('span', { class: 'field-label' }, 'Secuencia'),
                h('div', { class: 'builder-seq-actions' },
                  ui.button('Quitar último', { variant: 'ghost', size: 's', icon: 'back', onClick: function () { state.seq.pop(); update(); } }),
                  ui.button('Vaciar', { variant: 'ghost', size: 's', icon: 'trash', onClick: function () { state.seq = []; update(); } }))),
              seqBox),
            ui.field('Validar para nivel', levelSeg),
            valBox),
          h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Técnicas de tu biblioteca'), palette),
          ui.field('Nombre', nameInput),
          ui.field('Estado', statusSeg),
          ui.field('Nota', noteInput)),
        actions: [ui.button('Cancelar', { onClick: function () { m.close(null); } }), saveBtn]
      });
    }
    drawSeq();
  }

  // ===========================================================================
  // Pestaña: HIIT
  // ===========================================================================
  function panelHiit(panel) {
    var all = (SB.data && SB.data.hiit) || [];
    var prefs = ui.safe(function () { return SB.storage.get('hiitPrefs', null); }, null) || {};
    var disabled = Array.isArray(prefs.disabled) ? prefs.disabled.slice() : [];
    function save() {
      ui.safe(function () { SB.storage.set('hiitPrefs', Object.assign({}, prefs, { disabled: disabled })); });
    }
    if (!all.length) { panel.appendChild(ui.empty('No hay ejercicios HIIT cargados.')); return; }
    panel.appendChild(h('p', { class: 'section-desc' }, 'Entre rondas se alterna un ejercicio de fuerza y uno de cardio. Desactiva los que no puedas o no quieras hacer (lesiones, vecinos, espacio).'));
    ['fuerza', 'cardio'].forEach(function (cat) {
      var items = all.filter(function (x) { return x.category === cat; })
        .sort(function (a, b) { return (a.demand - b.demand) || String(a.name).localeCompare(b.name, 'es'); });
      var counter = h('span', { class: 'count num' });
      var warn = h('div');
      function refresh() {
        var active = items.filter(function (x) { return disabled.indexOf(x.id) < 0; }).length;
        counter.textContent = active + '/' + items.length;
        ui.clear(warn);
        if (active < 3) warn.appendChild(ui.callout('Mantén al menos 3 ejercicios de ' + L.hiitCat[cat].toLowerCase() + ' activos para que haya variedad.', 'warning', 'warning'));
      }
      var rows = [1, 2, 3].map(function (d) {
        var group = items.filter(function (x) { return Number(x.demand) === d; });
        if (!group.length) return null;
        return h('div', { class: 'hiit-demand' },
          h('p', { class: 'eyebrow' }, 'Exigencia ' + (L.demand[d] || d).toLowerCase()),
          h('ul', { class: 'rows' }, group.map(function (x) {
            var reqMissing = (x.requires || []).filter(function (id) { return !statusOf(id); });
            var meta = [x.pattern, x.impact ? 'impacto ' + x.impact : null, x.note].filter(Boolean).join(' · ');
            var tg = ui.toggle({
              label: x.name, desc: meta + (reqMissing.length ? ' · requiere ' + reqMissing.map(ui.movementName).join(', ') : ''),
              checked: disabled.indexOf(x.id) < 0, cls: 'hiit-toggle',
              onChange: function (on) {
                var i = disabled.indexOf(x.id);
                if (on && i >= 0) disabled.splice(i, 1);
                if (!on && i < 0) disabled.push(x.id);
                save(); refresh();
              }
            });
            var view = ui.has('visual.exercises') && SB.visual.exercises.has(x.id) ?
              ui.button('', { icon: 'play', variant: 'ghost', cls: 'hiit-view', ariaLabel: 'Ver ' + x.name,
                onClick: function () { ui.demoDialog({ title: x.name, exercise: x }); } }) : null;
            return h('li', { class: 'row hiit-row' + (reqMissing.length ? ' is-unavailable' : '') }, ui.demandDots(x.demand), tg, view);
          })));
      });
      panel.appendChild(h('section', { class: 'group hiit-group cat-' + cat },
        h('h3', { class: 'group-title' }, L.hiitCat[cat], counter), warn, rows));
      refresh();
    });
  }

  // ===========================================================================
  // Formulario de movimiento (§8.4) — también lo usa la ficha para editar
  // ===========================================================================
  function openMovementForm(opts) {
    opts = opts || {};
    var m0 = opts.movement || null;
    var isNew = !m0;
    var custom = isNew || ui.isCustomMovement(m0);
    var st = {
      name: m0 ? m0.name : '', short: m0 ? (m0.short || '') : '',
      category: m0 ? m0.category : 'golpe', side: m0 ? (m0.side || 'none') : 'lead', target: m0 && m0.target ? m0.target : 'cabeza',
      level: m0 ? (m0.level || 'basico') : 'basico', status: 'aprendido'
    };
    if (st.category === 'golpe' && st.side === 'none') st.side = 'lead';

    var name = h('input', { class: 'input', type: 'text', maxlength: 40, required: true, value: st.name, placeholder: 'p. ej. Gancho largo' });
    var short = h('input', { class: 'input input-short', type: 'text', maxlength: 8, required: true, value: st.short, placeholder: 'p. ej. GLARGO', autocapitalize: 'characters' });
    var desc = h('textarea', { class: 'textarea', rows: 2, maxlength: 300, placeholder: 'Una o dos frases.' }, m0 ? (m0.description || '') : '');
    var cues = h('textarea', { class: 'textarea', rows: 3, maxlength: 600, placeholder: 'Una indicación por línea' }, m0 && m0.cues ? m0.cues.join('\n') : '');
    var errors = h('textarea', { class: 'textarea', rows: 2, maxlength: 400, placeholder: 'Un error por línea' }, m0 && m0.errors ? m0.errors.join('\n') : '');

    var sideField, targetField;
    var sideSeg = ui.segmented({ label: 'Lado', value: st.side,
      options: [{ value: 'lead', label: 'Adelantado' }, { value: 'rear', label: 'Atrasado' }, { value: 'none', label: 'Ninguno', disabled: st.category === 'golpe' }],
      onChange: function (v) { st.side = v; } });
    var targetSeg = ui.segmented({ label: 'Objetivo', value: st.target,
      options: [{ value: 'cabeza', label: 'Cabeza' }, { value: 'cuerpo', label: 'Cuerpo' }],
      onChange: function (v) { st.target = v; } });
    function syncCat() {
      targetField.hidden = st.category !== 'golpe';
      var noneBtn = sideSeg.querySelectorAll('.seg-opt')[2];
      if (noneBtn) noneBtn.disabled = st.category === 'golpe';
      if (st.category === 'golpe' && st.side === 'none') { st.side = 'lead'; sideSeg.setValue('lead'); }
    }
    var catSeg = ui.segmented({ label: 'Categoría', value: st.category,
      options: [{ value: 'golpe', label: 'Golpe' }, { value: 'defensa', label: 'Defensa' }, { value: 'desplazamiento', label: 'Desplazamiento' }],
      onChange: function (v) { st.category = v; syncCat(); } });
    var levelSeg = ui.segmented({ label: 'Nivel', value: st.level,
      options: [{ value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }],
      onChange: function (v) { st.level = v; } });
    var statusSeg = ui.statusControl(st.status, function (v) { st.status = v; });

    sideField = ui.field('Lado', sideSeg, 'Esquivas: lado donde termina la cabeza.');
    targetField = ui.field('Objetivo', targetSeg);
    var errBox = h('div', { 'aria-live': 'polite' });

    var body = h('form', { class: 'form-grid', novalidate: true, onsubmit: function (e) { e.preventDefault(); submit(); } },
      ui.field('Nombre', name),
      ui.field('Texto en pantalla', short, 'Máximo 8 caracteres. Es lo que verás en grande durante la sesión.'),
      custom ? ui.field('Categoría', catSeg, isNew ? 'El motor deduce cómo encadenarlo según la categoría y el lado.' : null) : null,
      custom ? sideField : null,
      custom ? targetField : null,
      ui.field('Nivel', levelSeg),
      ui.field('Descripción', desc),
      ui.field('Indicaciones', cues),
      !isNew ? ui.field('Errores comunes', errors) : null,
      isNew ? ui.field('Estado', statusSeg) : null,
      errBox);
    if (custom) syncCat();

    function lines(t) { return t.value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean); }

    function submit() {
      ui.clear(errBox);
      var problems = [];
      if (!name.value.trim()) problems.push('Escribe un nombre.');
      if (!short.value.trim()) problems.push('Escribe el texto corto que verás en pantalla.');
      if (short.value.trim().length > 8) problems.push('El texto en pantalla admite como máximo 8 caracteres.');
      if (custom && st.category === 'golpe' && st.side === 'none') problems.push('Un golpe debe ser de la mano adelantada o de la atrasada.');
      if (problems.length) {
        errBox.appendChild(h('div', { class: 'callout callout-danger' }, ui.icon('warning'), h('ul', { class: 'err-list' }, problems.map(function (p) { return h('li', null, p); }))));
        return;
      }
      var common = {
        name: name.value.trim(), short: short.value.trim().toUpperCase(),
        description: desc.value.trim(), cues: lines(cues), level: st.level
      };
      var id = null;
      var ok = ui.safe(function () {
        if (isNew) {
          // CONTRATO: el borrador incluye además `level` (por defecto 'basico').
          var draft = Object.assign(common, { category: st.category, side: st.side, target: st.category === 'golpe' ? st.target : null, status: st.status });
          id = lib().addCustom(draft);
          if (id && !statusOf(id)) lib().add(id, st.status);
        } else if (custom) {
          id = m0.id;
          lib().updateCustom(id, Object.assign(common, { errors: lines(errors), category: st.category, side: st.side, target: st.category === 'golpe' ? st.target : null }));
        } else {
          id = m0.id;
          lib().editCatalog(id, Object.assign(common, { errors: lines(errors) }));
        }
        return true;
      }, false);
      if (!ok) { errBox.appendChild(ui.callout('No se pudo guardar el movimiento.', 'danger', 'warning')); return; }
      dlg.close(true);
      ui.toast(isNew ? 'Movimiento creado' : 'Cambios guardados');
      if (opts.onSaved) opts.onSaved(id);
    }

    var dlg = ui.modal({
      title: isNew ? 'Nuevo movimiento' : 'Editar movimiento', size: 'm',
      body: body,
      actions: [ui.button('Cancelar', { onClick: function () { dlg.close(null); } }), ui.button(isNew ? 'Crear movimiento' : 'Guardar', { variant: 'primary', icon: 'check', onClick: submit })]
    });
    setTimeout(function () { name.focus(); }, 40);
    return dlg;
  }

  // ===========================================================================
  // Pantalla
  // ===========================================================================
  SB.screens.library = {
    title: 'Biblioteca',
    openMovementForm: openMovementForm,
    openComboBuilder: openComboBuilder,
    render: function (root, ctx) {
      var current = TABS.some(function (t) { return t.id === ctx.query.tab; }) ? ctx.query.tab : 'tecnicas';
      var panel = h('div', { class: 'tab-panel', role: 'tabpanel', tabindex: '-1' });
      var tabBtns = [];

      function select(tabId, focus) {
        current = tabId;
        tabBtns.forEach(function (b) {
          var on = b._id === tabId;
          b.setAttribute('aria-selected', on ? 'true' : 'false');
          b.tabIndex = on ? 0 : -1;
          if (on) { panel.setAttribute('aria-labelledby', b.id); if (focus) b.focus(); }
        });
        try { history.replaceState(null, '', '#/library?tab=' + tabId); } catch (e) { /* file:// estricto */ }
        drawPanel();
      }
      function drawPanel() {
        ui.clear(panel);
        var rerender = function (t) { select(t || current, false); };
        if (current === 'tecnicas') panelMine(panel, rerender);
        else if (current === 'catalogo') panelCatalog(panel, rerender);
        else if (current === 'combinaciones') panelCombos(panel, rerender);
        else panelHiit(panel, rerender);
      }

      var tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': 'Secciones de la biblioteca' });
      TABS.forEach(function (t) {
        var b = h('button', { type: 'button', class: 'tab', role: 'tab', id: 'tab-' + t.id, onclick: function () { select(t.id, false); } }, t.label);
        b._id = t.id;
        tabBtns.push(b);
        tabs.appendChild(b);
      });
      tabs.addEventListener('keydown', function (e) {
        var dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!dir) return;
        e.preventDefault();
        var i = TABS.findIndex(function (t) { return t.id === current; });
        select(TABS[(i + dir + TABS.length) % TABS.length].id, true);
      });

      root.appendChild(h('div', { class: 'page library' },
        ui.screenHeader({
          title: 'Biblioteca', eyebrow: 'Tus técnicas',
          actions: ui.button('Nuevo movimiento', {
            icon: 'plus', variant: 'secondary',
            onClick: function () { openMovementForm({ onSaved: function (id) { if (id) SB.app.go('/library/m/' + encodeURIComponent(id)); else select('tecnicas'); } }); }
          })
        }),
        tabs, panel));
      select(current, false);
    }
  };
})(window.SB = window.SB || {});
