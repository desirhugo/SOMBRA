/* SOMBRA · calendario (#/calendar) — mes en cuadrícula, rachas, marcar/desmarcar con confirmación. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h;

  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var DOW = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  var DOW_FULL = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  var view = null; // { y, m } conservado entre visitas

  function fallbackGrid(y, m) {
    var first = new Date(y, m, 1);
    var offset = (first.getDay() + 6) % 7;
    var start = new Date(y, m, 1 - offset);
    var today = ui.dayKey();
    var weeks = [];
    for (var w = 0; w < 6; w++) {
      var week = [];
      for (var d = 0; d < 7; d++) {
        var dt = new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d);
        var key = ui.dayKey(dt);
        week.push({ key: key, day: dt.getDate(), inMonth: dt.getMonth() === m, marked: false, isToday: key === today });
      }
      if (w >= 4 && !week.some(function (c) { return c.inMonth; })) break;
      weeks.push(week);
    }
    return weeks;
  }

  function longDate(key) {
    var p = key.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return DOW_FULL[(d.getDay() + 6) % 7] + ' ' + p[2] + ' de ' + MONTHS[p[1] - 1] + ' de ' + p[0];
  }

  SB.screens.calendar = {
    title: 'Calendario',
    render: function (root) {
      var now = new Date();
      if (!view) view = { y: now.getFullYear(), m: now.getMonth() };
      var todayKey = ui.dayKey();

      var stats = h('div', { class: 'cal-stats' });
      var title = h('h2', { class: 'cal-title display', 'aria-live': 'polite' });
      var grid = h('div', { class: 'cal-grid', role: 'grid', 'aria-labelledby': 'cal-title' });
      title.id = 'cal-title';

      function drawStats() {
        var cur = ui.safe(function () { return SB.calendar.currentStreak(); }, 0) || 0;
        var best = ui.safe(function () { return SB.calendar.bestStreak(); }, 0) || 0;
        var monthCount = ui.safe(function () {
          var pref = view.y + '-' + String(view.m + 1).padStart(2, '0') + '-';
          return SB.calendar.days().filter(function (k) { return k.indexOf(pref) === 0; }).length;
        }, 0) || 0;
        ui.clear(stats);
        stats.appendChild(h('div', { class: 'card cal-stat is-accent' },
          ui.icon('flame'), h('span', { class: 'cal-stat-n display num' }, String(cur)), h('span', { class: 'cal-stat-l' }, 'Racha actual')));
        stats.appendChild(h('div', { class: 'card cal-stat' },
          ui.icon('star'), h('span', { class: 'cal-stat-n display num' }, String(best)), h('span', { class: 'cal-stat-l' }, 'Mejor racha')));
        stats.appendChild(h('div', { class: 'card cal-stat' },
          ui.icon('calendar'), h('span', { class: 'cal-stat-n display num' }, String(monthCount)), h('span', { class: 'cal-stat-l' }, 'Días este mes')));
      }

      function toggleDay(cell) {
        var marked = ui.safe(function () { return SB.calendar.isMarked(cell.key); }, cell.marked);
        ui.confirm({
          title: marked ? 'Desmarcar día' : 'Marcar día',
          message: (marked ? '¿Quitar la marca de entrenamiento del ' : '¿Marcar como entrenado el ') + longDate(cell.key) + '?',
          okLabel: marked ? 'Desmarcar' : 'Marcar', danger: marked
        }).then(function (ok) {
          if (!ok) return;
          ui.safe(function () { SB.calendar.toggle(cell.key); });
          drawGrid(cell.key);
          drawStats();
        });
      }

      function drawGrid(focusKey) {
        title.textContent = MONTHS[view.m].charAt(0).toUpperCase() + MONTHS[view.m].slice(1) + ' ' + view.y;
        var weeks = ui.safe(function () { return SB.calendar.monthGrid(view.y, view.m); }, null) || fallbackGrid(view.y, view.m);
        ui.clear(grid);
        grid.appendChild(h('div', { class: 'cal-row cal-head', role: 'row' }, DOW.map(function (d, i) {
          return h('span', { class: 'cal-dow', role: 'columnheader', 'aria-label': DOW_FULL[i] }, d);
        })));
        var focusEl = null;
        weeks.forEach(function (week) {
          var row = h('div', { class: 'cal-row', role: 'row' });
          week.forEach(function (c) {
            var future = c.key > todayKey;
            var cls = 'cal-day' + (c.inMonth ? '' : ' is-out') + (c.marked ? ' is-marked' : '') + (c.isToday ? ' is-today' : '') + (future ? ' is-future' : '');
            var label = longDate(c.key) + (c.marked ? ', entrenado' : '') + (c.isToday ? ', hoy' : '');
            var b = h('button', {
              type: 'button', class: cls, role: 'gridcell', 'aria-label': label, 'aria-pressed': c.marked ? 'true' : 'false',
              disabled: future, title: future ? 'Día futuro' : null,
              onclick: function () { toggleDay(c); }
            }, h('span', { class: 'cal-num num' }, String(c.day)), c.marked ? ui.icon('check', { cls: 'cal-check' }) : null);
            if (focusKey && c.key === focusKey) focusEl = b;
            row.appendChild(b);
          });
          grid.appendChild(row);
        });
        if (focusEl) focusEl.focus();
      }

      function shift(delta) {
        var d = new Date(view.y, view.m + delta, 1);
        view = { y: d.getFullYear(), m: d.getMonth() };
        drawGrid(); drawStats();
      }

      var todayBtn = ui.button('Hoy', { variant: 'ghost', size: 's', onClick: function () { view = { y: now.getFullYear(), m: now.getMonth() }; drawGrid(); drawStats(); } });

      root.appendChild(h('div', { class: 'page page-narrow calendar' },
        ui.screenHeader({ title: 'Calendario', eyebrow: 'Constancia' }),
        stats,
        h('div', { class: 'card cal-card' },
          h('div', { class: 'cal-nav' },
            ui.button('', { icon: 'chevron-left', variant: 'ghost', ariaLabel: 'Mes anterior', onClick: function () { shift(-1); } }),
            title,
            h('div', { class: 'cal-nav-right' }, todayBtn,
              ui.button('', { icon: 'chevron-right', variant: 'ghost', ariaLabel: 'Mes siguiente', onClick: function () { shift(1); } }))),
          grid,
          h('p', { class: 'muted small cal-help' }, 'Los días se marcan solos al terminar una sesión o al salir con al menos 5 minutos de trabajo. Toca un día para marcarlo o desmarcarlo a mano.'))));
      drawGrid();
      drawStats();
    }
  };
})(window.SB = window.SB || {});
