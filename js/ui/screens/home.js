/* SOMBRA · pantalla de inicio (#/) — racha, sugeridos, entrenamiento rápido y accesos. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  var LEVEL_INFO = {
    basico: 'Combinaciones de 1 a 5 acciones, más repetición y ritmo controlado.',
    avanzado: 'Hasta 8 acciones, defensas y desplazamientos encadenados, más variación.'
  };
  var suggestionSeed = null;

  function missingText(missing, level) {
    var names = (missing || []).map(function (c) { return (L.category[c] || c).toLowerCase(); });
    if (!names.length) return 'No disponible con tu biblioteca actual.';
    return 'Necesitas al menos una técnica de ' + names.join(' y ') + (level === 'basico' ? ' utilizable en básico (las avanzadas, dominadas).' : '.');
  }

  function launch(params) {
    var session = SB.app.generate(params);
    if (session) SB.app.go('/preview');
  }

  function streakCard() {
    var cur = ui.safe(function () { return SB.calendar.currentStreak(); }, 0) || 0;
    var trainedToday = ui.safe(function () { return SB.calendar.isMarked(ui.dayKey()); }, false);
    var msg = cur === 0 ? 'Entrena hoy para empezar una racha.' : (trainedToday ? 'Hoy ya has entrenado.' : 'Entrena hoy para mantenerla.');
    return h('a', { class: 'card streak-card', href: '#/calendar', 'aria-label': 'Racha actual: ' + ui.plural(cur, 'día', 'días') + '. Abrir calendario' },
      h('span', { class: 'streak-icon' + (cur > 0 ? ' on' : '') }, ui.icon('flame')),
      h('span', { class: 'streak-body' },
        h('span', { class: 'eyebrow' }, 'Racha actual'),
        h('span', { class: 'streak-num display num' }, String(cur), h('small', null, cur === 1 ? ' día' : ' días')),
        h('span', { class: 'streak-msg' }, msg)),
      h('span', { class: 'streak-go' }, ui.icon('calendar'), h('span', null, 'Calendario')));
  }

  function suggestionsSection() {
    if (suggestionSeed === null) suggestionSeed = ui.safe(function () { return SB.util.hashString(ui.dayKey()); }, 1) || 1;
    var list = h('div', { class: 'sugg-grid' });

    function fill() {
      ui.clear(list);
      var items = ui.safe(function () { return SB.suggestions.list({ count: 4, seed: suggestionSeed }); }, []) || [];
      if (!items.length) {
        list.appendChild(ui.empty('Las sugerencias aparecerán cuando tu biblioteca esté lista.'));
        return;
      }
      items.forEach(function (sg) {
        var g = ui.goal(sg.goalId);
        list.appendChild(h('button', {
          type: 'button', class: 'card card-btn sugg-card',
          'aria-label': (g ? g.name : sg.title) + ', ' + sg.durationMin + ' minutos, nivel ' + (L.level[sg.level] || sg.level) + '. Generar sesión',
          onclick: function () { launch({ durationMin: sg.durationMin, level: sg.level, goalId: sg.goalId }); }
        },
          h('span', { class: 'sugg-top' },
            h('span', { class: 'goal-ico' }, ui.icon(ui.goalIcon(g))),
            h('span', { class: 'sugg-meta num' }, sg.durationMin + ' min'),
            ui.levelBadge(sg.level)),
          h('span', { class: 'sugg-title' }, g ? g.name : (sg.title || sg.goalId)),
          (sg.reasons && sg.reasons.length) ? h('ul', { class: 'sugg-reasons' }, sg.reasons.slice(0, 3).map(function (r) { return h('li', null, r); })) : null,
          h('span', { class: 'sugg-go' }, 'Ver sesión', ui.icon('chevron-right'))));
      });
    }
    fill();

    return ui.section('Entrenamientos sugeridos', list, {
      cls: 'sec-sugg',
      actions: ui.button('Otras propuestas', {
        variant: 'ghost', icon: 'refresh', size: 's',
        onClick: function () { suggestionSeed = (suggestionSeed * 31 + 7) % 2147483647; fill(); }
      })
    });
  }

  function quickSection() {
    var s = SB.app.settings();
    var durations = [20, 30, 45];
    var state = {
      durationMin: durations.indexOf(Number(s.lastDuration)) >= 0 ? Number(s.lastDuration) : 30,
      level: s.lastLevel === 'avanzado' ? 'avanzado' : 'basico',
      goalId: s.lastGoal || 'completo'
    };

    function availFor(level) {
      var a = ui.safe(function () { return SB.session.availableGoals(level); }, null);
      return a || ui.goals().map(function (g) { return { goal: g, available: true, missing: [] }; });
    }

    var durSeg = ui.segmented({
      label: 'Duración', cls: 'seg-big', value: state.durationMin,
      options: durations.map(function (d) { return { value: d, label: d + ' min' }; }),
      onChange: function (v) { state.durationMin = v; }
    });

    var levelDesc = h('p', { class: 'field-hint level-desc' }, LEVEL_INFO[state.level]);
    var levelSeg = ui.segmented({
      label: 'Nivel', cls: 'seg-big', value: state.level,
      options: [{ value: 'basico', label: 'Básico' }, { value: 'avanzado', label: 'Avanzado' }],
      onChange: function (v) { state.level = v; levelDesc.textContent = LEVEL_INFO[v]; drawGoals(); }
    });

    var goalWrap = h('div', { class: 'goal-grid', role: 'radiogroup', 'aria-label': 'Objetivo' });
    var goalBtns = [];
    var go;
    var goalInfo = h('p', { class: 'field-hint goal-info', 'aria-live': 'polite' });
    function syncGoals() {
      goalBtns.forEach(function (b) {
        var on = b._id === state.goalId;
        b.setAttribute('aria-checked', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
      if (go) go.disabled = !state.goalId;
      var g = ui.goal(state.goalId);
      goalInfo.textContent = g ? (g.name + ': ' + (g.description || '')) : '';
    }
    function drawGoals() {
      // CONTRATO: availableGoals(level) del motor (en básico no cuentan los avanzados no dominados).
      var avail = availFor(state.level);
      var firstAvailable = avail.filter(function (a) { return a.available; })[0];
      if (!avail.some(function (a) { return a.goal.id === state.goalId && a.available; })) state.goalId = firstAvailable ? firstAvailable.goal.id : null;
      ui.clear(goalWrap);
      goalBtns = [];
      avail.forEach(function (a) {
        var g = a.goal;
        if (a.available) {
          var b = h('button', {
            type: 'button', class: 'goal-opt', role: 'radio', title: g.description || g.name,
            onclick: function () { state.goalId = g.id; syncGoals(); }
          },
            h('span', { class: 'goal-ico' }, ui.icon(ui.goalIcon(g))),
            h('span', { class: 'goal-name' }, g.short || g.name),
            g.description ? h('span', { class: 'goal-desc' }, g.description) : null);
          b._id = g.id;
          goalBtns.push(b);
          goalWrap.appendChild(b);
        } else {
          goalWrap.appendChild(h('div', { class: 'goal-opt is-disabled', 'aria-disabled': 'true' },
            h('span', { class: 'goal-ico' }, ui.icon('lock')),
            h('span', { class: 'goal-name' }, g.short || g.name),
            h('span', { class: 'goal-desc' }, missingText(a.missing, state.level)),
            h('a', { class: 'goal-link', href: '#/library?tab=catalogo' }, 'Añadir en la biblioteca')));
        }
      });
      syncGoals();
    }
    goalWrap.addEventListener('keydown', function (e) {
      var dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!dir || !goalBtns.length) return;
      e.preventDefault();
      var i = goalBtns.findIndex(function (b) { return b._id === state.goalId; });
      var n = goalBtns[(i + dir + goalBtns.length) % goalBtns.length];
      state.goalId = n._id; syncGoals(); n.focus();
    });

    go = ui.button('Generar sesión', {
      variant: 'primary', size: 'lg', block: true, icon: 'play',
      disabled: !state.goalId,
      onClick: function () {
        if (!state.goalId) { ui.toast('Añade técnicas a tu biblioteca para generar sesiones.'); return; }
        SB.app.saveSettings({ lastDuration: state.durationMin, lastLevel: state.level, lastGoal: state.goalId });
        launch({ durationMin: state.durationMin, level: state.level, goalId: state.goalId });
      }
    });
    drawGoals();

    return ui.section('Entrenamiento rápido', h('div', { class: 'card quick-card' },
      h('div', { class: 'quick-row' },
        ui.field('Duración', durSeg),
        h('div', { class: 'field' }, h('span', { class: 'field-label', id: 'lvl-lbl' }, 'Nivel'), levelSeg, levelDesc)),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, 'Objetivo'), goalWrap, goalInfo),
      go), { cls: 'sec-quick' });
  }

  function shortcuts() {
    var items = [
      { href: '#/custom', icon: 'sliders', title: 'Personalizado', desc: 'Duración, intervalos y focos a tu medida' },
      { href: '#/library', icon: 'library', title: 'Biblioteca', desc: 'Técnicas, combinaciones y HIIT' },
      { href: '#/calendar', icon: 'calendar', title: 'Calendario', desc: 'Días entrenados y rachas' },
      { href: '#/settings', icon: 'settings', title: 'Ajustes', desc: 'Guardia, sonido, descanso y datos' }
    ];
    return ui.section('Más opciones', h('div', { class: 'shortcut-grid' },
      items.map(function (it) {
        return h('a', { class: 'card card-btn shortcut', href: it.href },
          h('span', { class: 'shortcut-ico' }, ui.icon(it.icon)),
          h('span', { class: 'shortcut-text' }, h('span', { class: 'shortcut-title' }, it.title), h('span', { class: 'shortcut-desc' }, it.desc)),
          ui.icon('chevron-right', { cls: 'shortcut-chev' }));
      })), { cls: 'sec-shortcuts' });
  }

  SB.screens.home = {
    title: 'Inicio',
    render: function (root) {
      var page = h('div', { class: 'page home' },
        h('div', { class: 'home-head' },
          h('div', null,
            h('p', { class: 'eyebrow' }, 'Shadow boxing trainer'),
            h('h1', { class: 'h1' }, '¿Qué entrenamos hoy?')),
          streakCard()),
        h('div', { class: 'home-cols' },
          h('div', { class: 'home-main' }, suggestionsSection(), quickSection()),
          h('div', { class: 'home-side' }, shortcuts())));
      root.appendChild(page);
    }
  };
})(window.SB = window.SB || {});
