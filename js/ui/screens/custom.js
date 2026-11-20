/* SOMBRA · entrenamiento personalizado (#/custom) — parámetros libres, plantillas y generación. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  var HIIT_BY_DEMAND = { moderada: 30, alta: 40, muy_alta: 45, 'muy alta': 45, muyalta: 45 };

  function defaults(level) {
    var s = SB.app.settings();
    var lv = level || (s.lastLevel === 'avanzado' ? 'avanzado' : 'basico');
    return {
      durationMin: 30, level: lv, goalId: s.lastGoal || 'completo',
      intervalSec: lv === 'avanzado' ? 55 : 45, intervalsPerRound: 3, restSec: Number(s.restSec) || 30,
      hiitSec: HIIT_BY_DEMAND[s.hiitDemand] || 40, repRatio: lv === 'avanzado' ? 0.35 : 0.6,
      focuses: null, focusMovementIds: []
    };
  }

  function presets() { return ui.safe(function () { return SB.storage.get('customPresets', []); }, []) || []; }
  function savePresets(list) { ui.safe(function () { SB.storage.set('customPresets', list); }); }

  var draft = null; // conserva el formulario mientras la app esté abierta

  SB.screens.custom = {
    title: 'Personalizado',
    render: function (root) {
      var st = draft || defaults();
      draft = st;

      var mine = ui.safe(function () { return SB.library.personal(); }, []) || [];
      var cats = {};
      mine.forEach(function (m) { cats[m.category] = true; });
      var availGoals = [];
      function refreshGoals() {
        availGoals = ui.safe(function () { return SB.session.availableGoals(st.level); }, null) ||
          ui.goals().map(function (g) { return { goal: g, available: true, missing: [] }; });
        if (!availGoals.some(function (a) { return a.goal.id === st.goalId && a.available; })) {
          var fa = availGoals.filter(function (a) { return a.available; })[0];
          st.goalId = fa ? fa.goal.id : null;
        }
      }
      var focusList = ui.focuses().map(function (f) {
        var req = f.requiresCategory || [];
        var ok = !req.length || req.every(function (c) { return cats[c]; });
        return { focus: f, available: ok, missing: req.filter(function (c) { return !cats[c]; }) };
      });
      if (!st.focuses) st.focuses = focusList.filter(function (x) { return x.available; }).map(function (x) { return x.focus.id; });

      var form = h('div', { class: 'custom-form' });
      function draw() {
        ui.clear(form);
        refreshGoals();

        // Plantillas
        var list = presets();
        var presetRow = list.length ? h('div', { class: 'chip-row presets' }, list.map(function (p) {
          return h('span', { class: 'preset-chip' },
            h('button', { type: 'button', class: 'preset-apply', onclick: function () {
              draft = Object.assign(defaults(), p.params || {});
              st = draft; draw(); ui.toast('Plantilla «' + p.name + '» cargada');
            } }, ui.icon('sliders'), h('span', null, p.name)),
            h('button', { type: 'button', class: 'preset-del', 'aria-label': 'Eliminar plantilla ' + p.name, onclick: function () {
              ui.confirm({ title: 'Eliminar plantilla', message: '¿Eliminar «' + p.name + '»?', okLabel: 'Eliminar', danger: true }).then(function (ok) {
                if (!ok) return;
                savePresets(presets().filter(function (x) { return x.id !== p.id; }));
                draw();
              });
            } }, ui.icon('close')));
        })) : h('p', { class: 'muted small' }, 'Guarda tus configuraciones favoritas para lanzarlas en un toque.');

        var levelSeg = ui.segmented({ label: 'Nivel', cls: 'seg-big', value: st.level,
          options: [{ value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }],
          onChange: function (v) {
            var d0 = defaults(st.level), d1 = defaults(v);
            if (st.intervalSec === d0.intervalSec) st.intervalSec = d1.intervalSec;
            if (Math.abs(st.repRatio - d0.repRatio) < 0.001) st.repRatio = d1.repRatio;
            st.level = v;
            draw();
            var again = form.querySelector('.seg-big [aria-checked="true"]');
            if (again) again.focus();
          } });
        var goalSel = ui.select(availGoals.map(function (a) {
          return { value: a.goal.id, label: a.goal.name + (a.available ? '' : ' (no disponible)'), disabled: !a.available };
        }), st.goalId, function (v) { st.goalId = v; });
        var unavailable = availGoals.filter(function (a) { return !a.available; });

        var durSl = ui.slider({ label: 'Duración total', min: 10, max: 75, step: 1, value: st.durationMin, format: function (v) { return v + ' min'; }, onInput: function (v) { st.durationMin = v; } });
        var intSl = ui.slider({ label: 'Duración de cada intervalo', min: 30, max: 75, step: 5, value: st.intervalSec, format: function (v) { return v + ' s'; }, onInput: function (v) { st.intervalSec = v; } });
        var ipr = ui.slider({ label: 'Intervalos por ronda', min: 1, max: 6, step: 1, value: st.intervalsPerRound, format: function (v) { return String(v); }, onInput: function (v) { st.intervalsPerRound = v; } });
        var restSl = ui.slider({ label: 'Descanso entre bloques', min: 10, max: 120, step: 5, value: st.restSec, format: function (v) { return v + ' s'; }, onInput: function (v) { st.restSec = v; } });
        var hiitSl = ui.slider({ label: 'Duración del HIIT', min: 20, max: 60, step: 5, value: st.hiitSec, format: function (v) { return v + ' s'; }, onInput: function (v) { st.hiitSec = v; } });
        var repSl = ui.slider({ label: 'Repetición / variación', min: 0, max: 100, step: 5, value: Math.round(st.repRatio * 100),
          format: function (v) { return v + '% repetición · ' + (100 - v) + '% variación'; },
          hint: 'Repetición: una combinación todo el intervalo. Variación: combinaciones que cambian.',
          onInput: function (v) { st.repRatio = v / 100; } });

        // Focos permitidos
        var focusBox = h('div', { class: 'check-grid' }, focusList.map(function (x) {
          var id = 'fc-' + x.focus.id;
          var cb = h('input', { type: 'checkbox', id: id, checked: x.available && st.focuses.indexOf(x.focus.id) >= 0, disabled: !x.available });
          cb.addEventListener('change', function () {
            var i = st.focuses.indexOf(x.focus.id);
            if (cb.checked && i < 0) st.focuses.push(x.focus.id);
            if (!cb.checked && i >= 0) st.focuses.splice(i, 1);
          });
          return h('label', { class: 'check' + (x.available ? '' : ' is-disabled'), for: id }, cb,
            h('span', { class: 'check-box', 'aria-hidden': 'true' }, ui.icon('check')),
            h('span', { class: 'check-text' }, x.focus.name,
              !x.available ? h('small', null, 'Falta: ' + x.missing.map(function (c) { return (L.category[c] || c).toLowerCase(); }).join(', ')) : null));
        }));

        // Técnicas a priorizar
        var pri = h('div', { class: 'chip-row priority' });
        mine.filter(function (m) { return m.category !== 'base'; }).forEach(function (m) {
          var on = st.focusMovementIds.indexOf(m.id) >= 0;
          var t = ui.tokenData([m.id])[0] || { label: m.short };
          var b = h('button', { type: 'button', class: 'pri-chip k-' + ui.kindOf(m), 'aria-pressed': on ? 'true' : 'false', title: m.name,
            onclick: function () {
              var i = st.focusMovementIds.indexOf(m.id);
              if (i >= 0) st.focusMovementIds.splice(i, 1); else st.focusMovementIds.push(m.id);
              b.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
            } }, h('span', { class: 'pri-l' }, t.label + (ui.subText(t) ? ' ' + ui.subText(t) : '')), h('span', { class: 'pri-n' }, m.name));
          pri.appendChild(b);
        });
        if (!pri.childNodes.length) pri.appendChild(h('p', { class: 'muted small' }, 'Tu biblioteca está vacía.'));

        form.appendChild(ui.section('Plantillas', presetRow));
        form.appendChild(h('div', { class: 'custom-cols' },
          h('div', { class: 'card custom-card' },
            h('h2', { class: 'h3' }, 'Sesión'),
            durSl,
            ui.field('Nivel', levelSeg),
            ui.field('Objetivo', goalSel, unavailable.length ? 'Los objetivos no disponibles necesitan más técnicas en tu biblioteca.' : null)),
          h('div', { class: 'card custom-card' },
            h('h2', { class: 'h3' }, 'Estructura'),
            intSl, ipr, restSl, hiitSl, repSl)));
        form.appendChild(ui.section('Focos permitidos', focusBox, { desc: 'Cada ronda trabaja uno de estos focos. Si no marcas ninguno, se usan todos los disponibles.' }));
        form.appendChild(ui.section('Técnicas a priorizar', pri, { desc: 'Aparecerán con más frecuencia (solo de tu biblioteca).' }));
      }
      draw();

      function params() {
        var focuses = st.focuses.filter(function (id) { return focusList.some(function (x) { return x.focus.id === id && x.available; }); });
        return {
          durationMin: st.durationMin, level: st.level, goalId: st.goalId,
          custom: {
            intervalSec: st.intervalSec, intervalsPerRound: st.intervalsPerRound, restSec: st.restSec,
            hiitSec: st.hiitSec, repRatio: st.repRatio,
            focusMovementIds: st.focusMovementIds.slice(),
            focuses: focuses.length ? focuses : []
          }
        };
      }

      function saveTemplate() {
        ui.prompt({ title: 'Guardar plantilla', label: 'Nombre de la plantilla', placeholder: 'p. ej. Defensa 40 min', okLabel: 'Guardar' }).then(function (name) {
          if (!name) return;
          var list = presets();
          var id = ui.safe(function () { return SB.util.uid('tpl'); }, null) || ('tpl_' + Date.now().toString(36));
          list.push({ id: id, name: name, createdAt: new Date().toISOString(), params: JSON.parse(JSON.stringify(st)) });
          savePresets(list);
          ui.toast('Plantilla guardada');
          draw();
        });
      }

      function launch() {
        if (!st.goalId) { ui.toast('Añade técnicas a tu biblioteca para generar sesiones.'); return; }
        if (SB.app.generate(params())) SB.app.go('/preview');
      }

      root.appendChild(h('div', { class: 'page custom' },
        ui.screenHeader({ title: 'Personalizado', back: '#/', eyebrow: 'Entrenamiento a medida' }),
        form,
        h('div', { class: 'action-bar' },
          ui.button('Guardar', { icon: 'download', variant: 'secondary', size: 'lg', ariaLabel: 'Guardar como plantilla', title: 'Guardar como plantilla', onClick: saveTemplate }),
          ui.button('Generar sesión', { icon: 'play', variant: 'primary', size: 'lg', onClick: launch }))));
    }
  };
})(window.SB = window.SB || {});
