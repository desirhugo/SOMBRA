/* SOMBRA · vista previa de la sesión (#/preview) — bloques, regenerar y empezar. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  function comboButton(c, st) {
    var label = ui.comboText(c.seq, st);
    return h('button', {
      type: 'button', class: 'combo-chip' + (c.isNew ? ' is-new' : ''),
      title: (c.name ? c.name + ' · ' : '') + 'Ver demostración',
      'aria-label': 'Ver demostración: ' + label + (c.isNew ? ' (técnica nueva)' : ''),
      onclick: function () { ui.demoDialog({ title: c.name || 'Combinación', seq: c.seq, caption: ui.tokens(c.seq, { size: 'm' }) }); }
    }, ui.tokens(c.seq), c.isNew ? h('span', { class: 'new-dot', 'aria-hidden': 'true' }, 'NUEVA') : null);
  }

  function intervalRow(seg, st) {
    // Agrupa combinaciones repetidas contiguas para no saturar la lista
    var combos = seg.combos || [];
    var seen = {};
    var list = [];
    combos.forEach(function (c) {
      var sig = c.signature || (c.seq || []).join('>');
      if (seg.mode === 'repeticion' && seen[sig]) return;
      seen[sig] = true;
      list.push(c);
    });
    return h('li', { class: 'pv-interval mode-' + seg.mode },
      h('div', { class: 'pv-int-head' },
        h('span', { class: 'pv-int-n num' }, 'Intervalo ' + seg.interval + '/' + seg.intervalsTotal),
        h('span', { class: 'pv-mode' }, (L.mode[seg.mode] || seg.mode)),
        h('span', { class: 'pv-dur num' }, ui.fmtDuration(seg.duration)),
        seg.tempo ? h('span', { class: 'pv-tempo' }, L.tempo[seg.tempo] || seg.tempo) : null),
      h('div', { class: 'pv-combos' }, list.map(function (c) { return comboButton(c, st); })));
  }

  /** Botón de demostración (o texto) de un ejercicio HIIT. */
  function hiitName(ex) {
    if (ex && ui.has('visual.exercises') && SB.visual.exercises.has(ex.id)) {
      return h('button', { type: 'button', class: 'pv-hiit-name pv-hiit-btn', title: 'Ver demostración', 'aria-label': 'Ver demostración: ' + ex.name,
        onclick: function () { ui.demoDialog({ title: ex.name, exercise: ex }); } }, ui.icon('play'), ex.name);
    }
    return h('span', { class: 'pv-hiit-name' }, ex ? ex.name : '');
  }

  /** Bloque final de abdomen. */
  function finisherCard(fin) {
    var segs = (fin && fin.segments) || [];
    if (!segs.length) return null;
    return h('li', { class: 'card pv-block pv-finisher' },
      h('div', { class: 'pv-block-head' },
        h('span', { class: 'pv-round display' }, 'Abdomen'),
        h('span', { class: 'pv-focus' }, 'Al final de la sesión')),
      fin.rest ? h('div', { class: 'pv-rest' },
        h('span', { class: 'pv-rest-tag' }, 'Descanso'),
        h('span', { class: 'pv-dur num' }, ui.fmtDuration(fin.rest.duration))) : null,
      segs.map(function (sg) {
        return h('div', { class: 'pv-hiit cat-core' },
          h('span', { class: 'pv-hiit-tag' }, 'Abdomen ' + sg.finisherIndex + '/' + sg.finisherTotal),
          hiitName(sg.exercise),
          sg.exercise ? ui.demandDots(sg.exercise.demand) : null,
          h('span', { class: 'pv-dur num' }, ui.fmtDuration(sg.duration)));
      }));
  }

  function blockCard(b, st) {
    var ints = b.intervals || [];
    var first = ints[0] || {};
    var hiit = b.hiit;
    var rest = b.rest;
    return h('li', { class: 'card pv-block' },
      h('div', { class: 'pv-block-head' },
        h('span', { class: 'pv-round display' }, 'Ronda ' + (first.round || (b.index + 1)) + (first.roundsTotal ? '/' + first.roundsTotal : '')),
        h('span', { class: 'pv-focus' }, first.focusName || ui.focusName(first.focusId)),
        ui.materialChips(b.material, st, 'pv-mat')),
      h('ol', { class: 'pv-intervals' }, ints.map(function (s) { return intervalRow(s, st); })),
      hiit ? h('div', { class: 'pv-hiit cat-' + hiit.category },
        h('span', { class: 'pv-hiit-tag' }, 'HIIT · ' + (L.hiitCat[hiit.category] || hiit.category)),
        hiitName(hiit.exercise),
        ui.materialChips(hiit.material, st, 'pv-mat'),
        hiit.exercise ? ui.demandDots(hiit.exercise.demand) : null,
        h('span', { class: 'pv-dur num' }, ui.fmtDuration(hiit.duration))) : null,
      rest ? h('div', { class: 'pv-rest' },
        h('span', { class: 'pv-rest-tag' }, 'Descanso'),
        h('span', { class: 'pv-dur num' }, ui.fmtDuration(rest.duration))) : null);
  }

  /** Antes de empezar: interruptor del análisis por cámara y cómo preparar el material de la sesión. */
  function beforeStart(session, st, onDispose) {
    var s = SB.app.settings();
    var hint = h('p', { class: 'muted small pv-cam-hint' });
    var tester = ui.cameraTester && ui.has('vision.pose') ? ui.cameraTester() : null;
    if (tester && onDispose) onDispose(tester.dispose);
    function paint(on) {
      hint.textContent = on
        ? 'Coloca el dispositivo delante de ti, a unos 2-3 m y a la altura del pecho, que se te vea de la cabeza a los pies. El navegador te pedirá permiso para usar la cámara. Solo se analizan las rondas de boxeo. Si tienes activados los clips de los fallos, se guardan unos segundos de cada uno para verlos al final a cámara lenta; se borran al salir del resumen y nunca salen de tu dispositivo.'
        : 'Apagado. Actívalo para que la app revise tu guardia, tu barbilla, tus golpes y tu cadera, y te corrija en directo.';
      if (tester) { tester.hidden = !on; if (!on) tester.dispose(); }
    }
    paint(!!s.cameraAnalysis);
    var cam = ui.toggle({ label: 'Analizar mis rondas con la cámara', checked: !!s.cameraAnalysis, cls: 'pv-cam-toggle',
      onChange: function (v) { SB.app.saveSettings({ cameraAnalysis: v }); paint(v); } });
    var mats = (session.material || []).concat((session.timeline || []).filter(function (x) { return x.type === 'hiit' && x.material; }).map(function (x) { return x.material; }));
    var setup = ui.materialSetup ? ui.materialSetup(mats, st) : [];
    return h('section', { class: 'card pv-before', 'aria-label': 'Antes de empezar' },
      h('h2', { class: 'h3' }, 'Antes de empezar'),
      cam, hint, tester,
      setup.length ? h('div', { class: 'pv-setup' },
        h('p', { class: 'eyebrow' }, 'Prepara el material'),
        h('ul', { class: 'pv-setup-list' }, setup.map(function (x) {
          return h('li', { class: 'mat-' + x.key }, h('span', { class: 'mat-chip mat-' + x.key }, x.short), h('span', { class: 'pv-setup-text' }, x.text));
        }))) : null,
      h('p', { class: 'muted small' }, h('a', { href: '#/settings' }, 'Cambiar el material en Ajustes'), ' (después, pulsa Regenerar).'));
  }

  SB.screens.preview = {
    title: 'Vista previa',
    render: function (root) {
      var session = SB.app.restoreSession();
      if (!session) {
        root.appendChild(h('div', { class: 'page page-narrow' },
          ui.screenHeader({ title: 'Vista previa', back: '#/' }),
          ui.empty('No hay ninguna sesión generada.', ui.button('Volver al inicio', { href: '#/', variant: 'primary' }))));
        return;
      }
      var st = SB.app.settings().stance;
      var params = SB.app.state.params || { durationMin: session.durationMin, level: session.level, goalId: session.goalId };
      var g = ui.goal(session.goalId);

      var featured = (session.featuredNew || []).map(function (id) {
        return h('a', { class: 'chip-link', href: '#/library/m/' + encodeURIComponent(id) }, ui.movementName(id));
      });

      function regenerate() {
        var p = Object.assign({}, params, { seed: Math.floor(Math.random() * 2147483647) });
        if (SB.app.generate(p)) { SB.router.refresh(); ui.toast('Nueva sesión generada'); }
      }

      var blocks = session.blocks || [];
      var disposers = [];
      var page = h('div', { class: 'page preview' },
        ui.screenHeader({
          title: session.title || 'Sesión', back: '#/', eyebrow: 'Vista previa'
        }),
        h('div', { class: 'pv-summary' },
          h('div', { class: 'pv-stat' }, h('span', { class: 'pv-stat-n display num' }, ui.fmtTime(session.totalSec || 0)), h('span', { class: 'pv-stat-l' }, 'duración real')),
          h('div', { class: 'pv-stat' }, h('span', { class: 'pv-stat-n display num' }, String(blocks.length)), h('span', { class: 'pv-stat-l' }, blocks.length === 1 ? 'ronda' : 'rondas')),
          h('div', { class: 'pv-stat' }, h('span', { class: 'pv-stat-n display' }, L.level[session.level] || session.level), h('span', { class: 'pv-stat-l' }, 'nivel')),
          g ? h('div', { class: 'pv-stat' }, h('span', { class: 'pv-stat-n display' }, g.short || g.name), h('span', { class: 'pv-stat-l' }, 'objetivo')) : null),
        (session.notes && session.notes.length) ? h('div', { class: 'pv-notes' }, session.notes.map(function (n) { return ui.callout(n, 'info'); })) : null,
        featured.length ? h('p', { class: 'pv-featured' }, h('span', { class: 'eyebrow' }, 'Técnicas destacadas'), ' ', featured) : null,
        beforeStart(session, st, function (fn) { disposers.push(fn); }),
        h('ol', { class: 'pv-blocks' }, blocks.map(function (b) { return blockCard(b, st); }), finisherCard(session.finisher)),
        h('div', { class: 'action-bar' },
          ui.button('Regenerar', { icon: 'refresh', variant: 'secondary', size: 'lg', onClick: regenerate }),
          ui.button('Empezar', { icon: 'play', variant: 'primary', size: 'lg', onClick: function () { SB.app.go('/train'); } })));
      root.appendChild(page);
      // Al salir (o al empezar), la prueba de cámara se apaga.
      return function cleanup() { disposers.forEach(function (fn) { ui.safe(fn); }); };
    }
  };
})(window.SB = window.SB || {});
