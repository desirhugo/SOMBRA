/* SOMBRA · pantalla de bienvenida (#/onboarding) — guardia, punto de partida de la biblioteca y estados. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h;

  var PRESETS = [
    { id: 'golpes', title: 'Solo golpes (1-6)', desc: 'Los seis golpes a la cabeza, con paso adelante y atrás.' },
    { id: 'golpes_defensa', title: 'Golpes + defensa básica', desc: 'Golpes, golpes al cuerpo básicos, defensas y desplazamientos básicos.' },
    { id: 'completo', title: 'Catálogo completo', desc: 'Todo el catálogo: lo básico como dominado y lo avanzado en práctica.' }
  ];
  function presetDesc(p) {
    var lp = (SB.library && SB.library.PRESETS) || [];
    for (var i = 0; i < lp.length; i++) if (lp[i].id === p.id && lp[i].description) return lp[i].description;
    return p.desc;
  }

  SB.screens.onboarding = {
    title: 'Bienvenida',
    immersive: true,
    render: function (root) {
      var s = SB.app.settings();
      var choice = { stance: s.stance || 'diestro', preset: 'golpes_defensa' };

      var stanceSeg = ui.segmented({
        label: 'Guardia', cls: 'seg-cards', value: choice.stance,
        options: [
          { value: 'diestro', label: 'Diestro', desc: 'Guardia ortodoxa · izquierda adelante' },
          { value: 'zurdo', label: 'Zurdo', desc: 'Guardia zurda · derecha adelante' }
        ],
        onChange: function (v) { choice.stance = v; }
      });

      var presetSeg = ui.segmented({
        label: 'Punto de partida', cls: 'seg-cards seg-cards-3', value: choice.preset,
        options: PRESETS.map(function (p) { return { value: p.id, label: p.title, desc: presetDesc(p) }; }),
        onChange: function (v) { choice.preset = v; }
      });

      function finish() {
        SB.app.saveSettings({ stance: choice.stance });
        ui.safe(function () { if (SB.library && SB.library.applyPreset) SB.library.applyPreset(choice.preset); });
        ui.safe(function () { if (SB.storage) SB.storage.set('onboarded', true); });
        SB.app.go('/');
        ui.toast('Biblioteca preparada. ¡A entrenar!');
      }

      var page = h('div', { class: 'page page-narrow onboarding' },
        h('div', { class: 'onb-hero' },
          h('img', { class: 'onb-logo', src: 'assets/icons/app.svg', alt: '', width: 64, height: 64 }),
          h('h1', { class: 'onb-title display' }, 'SOMBRA'),
          h('p', { class: 'onb-sub' }, 'Shadow boxing con combinaciones coherentes, rondas con foco y HIIT entre rondas. Todo en tu dispositivo.')),

        h('section', { class: 'onb-step', 'aria-labelledby': 'onb-1' },
          h('p', { class: 'eyebrow' }, 'Paso 1'),
          h('h2', { class: 'h2', id: 'onb-1' }, 'Tu guardia'),
          h('p', { class: 'section-desc' }, 'Los números de los golpes no cambian; cambia qué mano es la adelantada (impares) y la atrasada (pares).'),
          stanceSeg),

        h('section', { class: 'onb-step', 'aria-labelledby': 'onb-2' },
          h('p', { class: 'eyebrow' }, 'Paso 2'),
          h('h2', { class: 'h2', id: 'onb-2' }, 'Punto de partida'),
          h('p', { class: 'section-desc' }, 'Solo entrenarás técnicas que estén en tu biblioteca. Podrás añadir o quitar cuando quieras.'),
          presetSeg),

        h('section', { class: 'onb-step', 'aria-labelledby': 'onb-3' },
          h('p', { class: 'eyebrow' }, 'Paso 3'),
          h('h2', { class: 'h2', id: 'onb-3' }, 'Estados de cada técnica'),
          h('div', { class: 'states-explain' },
            h('p', null, ui.statusBadge('aprendido'), ' ', ui.statusBadge('practica'), ' ', ui.statusBadge('dominado')),
            h('p', null, 'APRENDIDO: la conoces y sale en combinaciones sencillas. EN PRÁCTICA: la estás puliendo y aparece más a menudo.'),
            h('p', null, 'DOMINADO: la tienes automatizada y puede entrar en las combinaciones más complejas.'))),

        h('div', { class: 'onb-cta' },
          ui.button('Empezar', { variant: 'primary', size: 'lg', block: true, icon: 'play', onClick: finish })));

      root.appendChild(page);
    }
  };
})(window.SB = window.SB || {});
