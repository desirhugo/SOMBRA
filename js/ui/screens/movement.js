/* SOMBRA · ficha de movimiento (#/library/m/<id>) — demo, textos, estado, vídeo propio. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  function sideText(m, stance) {
    if (!m.side || m.side === 'none') return null;
    var leadIsLeft = stance !== 'zurdo';
    var left = (m.side === 'lead') === leadIsLeft;
    return L.side[m.side] + ' (' + (left ? 'izquierda' : 'derecha') + ' en guardia ' + (stance === 'zurdo' ? 'zurda' : 'diestra') + ')';
  }

  SB.screens.movement = {
    title: function (ctx) { var m = ui.movement(ctx.params.id); return m ? m.name : 'Movimiento'; },
    render: function (root, ctx) {
      var id = ctx.params.id;
      var m = ui.movement(id);
      if (!m) {
        root.appendChild(h('div', { class: 'page page-narrow' },
          ui.screenHeader({ title: 'Movimiento', back: '#/library' }),
          ui.empty('Este movimiento no existe o se ha eliminado.', ui.button('Ir a la biblioteca', { href: '#/library', variant: 'primary' }))));
        return;
      }
      var stance = SB.app.settings().stance;
      var custom = ui.isCustomMovement(m);
      var status = ui.safe(function () { return SB.library.statusOf(id); }, null);
      var demo = null;
      var alive = true;

      // --- Demostración
      var demoHost = h('div', { class: 'mv-demo-host' });
      function mountDemo() {
        if (demo) { ui.safe(function () { demo.destroy(); }); demo = null; }
        ui.clear(demoHost);
        if (ui.has('visual.demo.mount')) {
          demo = ui.safe(function () { return SB.visual.demo.mount(demoHost, { stance: stance }); }, null);
          if (demo) ui.safe(function () { demo.showMovement(id); });
        }
        if (!demo) demoHost.appendChild(h('div', { class: 'demo-fallback' },
          h('span', { class: 'move-chip-xl' }, ui.tokens([id], { size: 'xl' })),
          h('p', { class: 'muted' }, 'Demostración no disponible.')));
      }

      // --- Vídeo propio
      var videoBox = h('div', { class: 'mv-video' });
      function drawVideo() {
        ui.clear(videoBox);
        if (!SB.mediaStore) return;
        Promise.all([SB.mediaStore.available ? SB.mediaStore.available() : Promise.resolve(true), SB.mediaStore.getURL(id)]).then(function (r) {
          if (!alive) return;
          var available = r[0], url = r[1];
          ui.clear(videoBox);
          if (!available) {
            videoBox.appendChild(h('p', { class: 'muted small' }, 'Este navegador no permite guardar vídeos.'));
            return;
          }
          var input = h('input', { type: 'file', accept: 'video/*', class: 'sr-only', id: 'mv-file' });
          input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            if (!f) return;
            if (f.size > 200 * 1024 * 1024) { ui.toast('El vídeo es demasiado grande (máx. 200 MB).'); return; }
            SB.mediaStore.put(id, f).then(function (res) {
              if (!res) { ui.toast('No se pudo guardar el vídeo.'); return; }
              ui.toast('Vídeo guardado en este navegador');
              mountDemo(); drawVideo();
            });
          });
          videoBox.appendChild(input);
          if (url) {
            videoBox.appendChild(h('p', { class: 'small' }, ui.icon('video'), ' Tienes un vídeo propio para este movimiento; la demostración lo usa en lugar de la animación.'));
            videoBox.appendChild(h('div', { class: 'btn-row' },
              h('label', { class: 'btn btn-secondary', for: 'mv-file', tabindex: '0', role: 'button', onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, ui.icon('upload'), h('span', null, 'Cambiar vídeo')),
              ui.button('Quitar vídeo', { icon: 'trash', variant: 'danger', onClick: function () {
                ui.confirm({ title: 'Quitar vídeo', message: 'Se borrará el vídeo de este navegador y volverá la animación.', okLabel: 'Quitar', danger: true }).then(function (ok) {
                  if (!ok) return;
                  SB.mediaStore.remove(id).then(function () { ui.toast('Vídeo quitado'); mountDemo(); drawVideo(); });
                });
              } })));
          } else {
            videoBox.appendChild(h('p', { class: 'muted small' }, 'Adjunta un vídeo corto (por ejemplo, de tu entrenador). Se guarda solo en este navegador y se reproduce en bucle y sin sonido.'));
            videoBox.appendChild(h('label', { class: 'btn btn-secondary', for: 'mv-file', tabindex: '0', role: 'button', onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } } }, ui.icon('upload'), h('span', null, 'Adjuntar vídeo')));
          }
        });
      }

      // --- Estado
      var statusBox = h('div', { class: 'mv-status' });
      function drawStatus() {
        ui.clear(statusBox);
        if (m.category === 'base') { statusBox.appendChild(h('p', { class: 'muted small' }, 'Posición de referencia: no aparece en combinaciones.')); return; }
        if (status) {
          statusBox.appendChild(ui.statusControl(status, function (s) {
            ui.safe(function () { SB.library.setStatus(id, s); });
            status = s;
            ui.toast('Estado: ' + L.status[s].toLowerCase());
          }, { label: 'Estado de ' + m.name }));
          statusBox.appendChild(ui.button('Quitar de mi biblioteca', { variant: 'ghost', icon: 'minus', size: 's', onClick: function () {
            ui.confirm({ title: 'Quitar técnica', message: '«' + m.name + '» dejará de aparecer en tus sesiones.', okLabel: 'Quitar', danger: true }).then(function (ok) {
              if (!ok) return;
              ui.safe(function () { SB.library.remove(id); });
              status = null; drawStatus(); ui.toast('Técnica quitada');
            });
          } }));
        } else {
          var pick = 'aprendido';
          statusBox.appendChild(h('p', { class: 'muted small' }, 'No está en tu biblioteca: no aparecerá en tus sesiones.'));
          statusBox.appendChild(ui.statusControl(pick, function (s) { pick = s; }, { label: 'Estado inicial' }));
          statusBox.appendChild(ui.button('Añadir a mi biblioteca', { variant: 'primary', icon: 'plus', onClick: function () {
            ui.safe(function () { SB.library.add(id, pick); });
            status = ui.safe(function () { return SB.library.statusOf(id); }, pick) || pick;
            drawStatus(); ui.toast('Añadido a tu biblioteca');
          } }));
        }
      }

      function listBlock(title, items, cls) {
        if (!items || !items.length) return null;
        return ui.section(title, h('ul', { class: 'bullets ' + (cls || '') }, items.map(function (t) { return h('li', null, t); })));
      }

      var counters = (m.counters || []).filter(function (cid) { return ui.movement(cid); });
      var sideTxt = sideText(m, stance);

      var page = h('div', { class: 'page movement' },
        ui.screenHeader({
          title: m.name, back: '#/library', backLabel: 'Volver a la biblioteca',
          eyebrow: (L.category[m.category] || m.category) + (m.subcategory ? ' · ' + m.subcategory : '') + (custom ? ' · propio' : ''),
          actions: ui.button('Editar', { icon: 'edit', variant: 'secondary', onClick: function () {
            SB.screens.library.openMovementForm({ movement: m, onSaved: function () { SB.router.refresh(); } });
          } })
        }),
        h('div', { class: 'mv-layout' },
          h('div', { class: 'mv-left' },
            h('div', { class: 'card mv-demo' }, demoHost),
            h('div', { class: 'card mv-video-card' }, h('h2', { class: 'h3' }, 'Vídeo propio'), videoBox)),
          h('div', { class: 'mv-right' },
            h('div', { class: 'mv-facts' },
              h('span', { class: 'mv-notation' }, ui.tokens([id], { size: 'l' })),
              ui.levelBadge(m.level || 'basico'),
              sideTxt ? ui.badge(sideTxt, 'badge-soft') : null,
              m.target ? ui.badge(L.target[m.target] || m.target, 'badge-soft') : null,
              (m.against && m.against.length) ? ui.badge('Ante ' + m.against.join(', '), 'badge-soft') : null),
            m.description ? h('p', { class: 'mv-desc' }, m.description) : null,
            ui.section('Estado', statusBox),
            listBlock('Indicaciones', m.cues),
            listBlock('Errores comunes', m.errors, 'bullets-warn'),
            counters.length ? ui.section('Para encadenar después', h('div', { class: 'chip-row' }, counters.map(function (cid) {
              return h('a', { class: 'chip-link', href: '#/library/m/' + encodeURIComponent(cid) }, ui.tokens([cid]), ' ', ui.movementName(cid));
            }))) : null,
            custom ? h('div', { class: 'danger-zone' },
              ui.button('Eliminar movimiento', { icon: 'trash', variant: 'danger', onClick: function () {
                ui.confirm({ title: 'Eliminar movimiento', message: 'Se eliminará «' + m.name + '», su vídeo y las combinaciones propias que lo usan dejarán de ser válidas.', okLabel: 'Eliminar', danger: true }).then(function (ok) {
                  if (!ok) return;
                  ui.safe(function () { SB.library.deleteCustom(id); });
                  if (SB.mediaStore) SB.mediaStore.remove(id);
                  ui.toast('Movimiento eliminado');
                  SB.app.go('/library');
                });
              } })) : null)));

      root.appendChild(page);
      mountDemo();
      drawVideo();
      drawStatus();

      return function () {
        alive = false;
        if (demo) ui.safe(function () { demo.destroy(); });
      };
    }
  };
})(window.SB = window.SB || {});
