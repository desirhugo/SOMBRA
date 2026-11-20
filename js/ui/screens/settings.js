/* SOMBRA · ajustes (#/settings) — §8.2 + copia de seguridad, borrado y avisos de almacenamiento. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h;

  SB.screens.settings = {
    title: 'Ajustes',
    render: function (root) {
      var s = SB.app.settings();
      function set(patch) { s = SB.app.saveSettings(patch); }

      // --- Entrenamiento
      var stanceSeg = ui.segmented({ label: 'Guardia', value: s.stance,
        options: [{ value: 'diestro', label: 'Diestro', desc: 'Izquierda adelante' }, { value: 'zurdo', label: 'Zurdo', desc: 'Derecha adelante' }],
        cls: 'seg-cards', onChange: function (v) { set({ stance: v }); } });
      var demandSeg = ui.segmented({ label: 'Exigencia física del HIIT', value: s.hiitDemand,
        options: [
          { value: 'moderada', label: 'Moderada', desc: '30 s' },
          { value: 'alta', label: 'Alta', desc: '40 s' },
          { value: 'muy_alta', label: 'Muy alta', desc: '45 s' }],
        onChange: function (v) { set({ hiitDemand: v }); } });
      var paceSeg = ui.segmented({ label: 'Ritmo de cambio de combinaciones', value: s.changePace,
        options: [{ value: 'lenta', label: 'Lento' }, { value: 'normal', label: 'Normal' }, { value: 'rapida', label: 'Rápido' }],
        onChange: function (v) { set({ changePace: v }); } });
      var restSl = ui.slider({ label: 'Descanso entre bloques', min: 10, max: 120, step: 5, value: Number(s.restSec) || 30,
        format: function (v) { return v + ' s'; }, onChange: function (v) { set({ restSec: v }); } });

      // --- Pantalla y sonido
      var volSl = ui.slider({ label: 'Volumen', min: 0, max: 100, step: 5, value: Math.round((Number(s.volume) || 0) * 100),
        format: function (v) { return v + '%'; },
        onInput: function (v) { if (SB.sounds) SB.sounds.setVolume(v / 100); },
        onChange: function (v) { set({ volume: v / 100 }); if (SB.sounds) SB.sounds.startBeep(); } });
      var themeSeg = ui.segmented({ label: 'Tema', value: s.theme,
        options: [{ value: 'oscuro', label: 'Oscuro', icon: 'moon' }, { value: 'claro', label: 'Claro', icon: 'sun' }],
        onChange: function (v) { set({ theme: v }); } });

      var trainingCard = h('div', { class: 'card settings-card' },
        h('h2', { class: 'h3' }, 'Entrenamiento'),
        ui.field('Guardia', stanceSeg, 'Cambia qué mano es la adelantada; los números de los golpes no cambian.'),
        ui.field('Exigencia física del HIIT', demandSeg, 'Independiente del nivel técnico.'),
        restSl,
        ui.field('Ritmo de cambio de combinaciones', paceSeg, 'En los intervalos de variación.'),
        ui.toggle({ label: 'Figura animada', desc: 'Muestra la combinación en movimiento junto a los números, en las rondas y los descansos, y cómo se hace cada ejercicio del HIIT. También con la tecla D.', checked: s.showFigure, onChange: function (v) { set({ showFigure: v }); } }),
        ui.toggle({ label: 'Demostración automática', desc: 'Con la figura oculta, la abre cuando aparece una técnica nueva o poco habitual.', checked: s.autoDemo, onChange: function (v) { set({ autoDemo: v }); } }),
        ui.toggle({ label: 'Mostrar «SIGUIENTE»', desc: 'Enseña la próxima combinación durante el boxeo.', checked: s.showNext, onChange: function (v) { set({ showNext: v }); } }));

      // --- Material
      var shareSeg = ui.segmented({ label: 'Rondas con mancuernas', value: String(s.dumbbellShare || 0.7),
        options: [{ value: '0.3', label: '30 %' }, { value: '0.5', label: '50 %' }, { value: '0.7', label: '70 %' }],
        onChange: function (v) { set({ dumbbellShare: Number(v) }); } });
      var shareField = ui.field('Rondas con mancuernas', shareSeg,
        'La última ronda va siempre sin peso. Los entrenadores recomiendan poco peso (0,5-2 kg), golpes controlados y no bloquear el codo; la sombra con peso sirve para la técnica y la resistencia del hombro, no para pegar más fuerte.');
      shareField.hidden = !s.equipDumbbells;
      var materialCard = h('div', { class: 'card settings-card' },
        h('h2', { class: 'h3' }, 'Material'),
        h('p', { class: 'muted small' }, 'Cada objeto sale en algunas rondas, no en todas. La vista previa te dice qué preparar y el entrenamiento, qué usar en cada ronda.'),
        ui.toggle({ label: 'Mancuernas de 1 kg', desc: 'Sombra con peso en parte de las rondas de boxeo. Antes del HIIT te avisa de que las dejes.', checked: s.equipDumbbells, onChange: function (v) { set({ equipDumbbells: v }); shareField.hidden = !v; } }),
        shareField,
        ui.toggle({ label: 'Comba como cuerda de esquivas', desc: 'La comba no se puede saltar en casa, pero atada a la altura del pecho entre dos puntos sirve para esquivar: pasas por debajo con la cintura completa o la sentadilla y haces la media cintura a su lado. En esas rondas todas las combinaciones llevan una esquiva, y la media cintura, la cintura completa y la sentadilla continuas del HIIT se hacen con ella.', checked: s.equipRope, onChange: function (v) { set({ equipRope: v }); } }),
        ui.toggle({ label: 'Pelota de tenis colgada', desc: 'Colgada de un hilo a la altura de la cara: la golpeas, la esquivas y giras a su alrededor (puntería, distancia y ritmo). Esas rondas van sin mancuernas.', checked: s.equipHangBall, onChange: function (v) { set({ equipHangBall: v }); } }),
        ui.toggle({ label: 'Papel entre el guante y la mejilla', desc: 'En la mejilla de la mano atrasada: esa mano no se separa de la cara, así que esas rondas solo llevan golpes de la mano adelantada, defensas y desplazamientos.', checked: s.equipPaper, onChange: function (v) { set({ equipPaper: v }); } }),
        ui.toggle({ label: 'Toalla o guante bajo el codo', desc: 'Bajo el codo de la mano atrasada, apretado contra el costado: protege las costillas y evita abrir el codo. Va en las mismas rondas que el papel.', checked: s.equipElbow, onChange: function (v) { set({ equipElbow: v }); } }),
        ui.toggle({ label: 'Pelota pequeña bajo la barbilla', desc: 'Si la pelota se cae, has levantado la barbilla. Al alternar rondas con y sin ella, el análisis por cámara compara cómo la llevas.', checked: s.equipBall, onChange: function (v) { set({ equipBall: v }); } }),
        ui.toggle({ label: 'Cinta en el suelo', desc: 'Una línea y una cruz con cinta de pintor: al avanzar y retroceder, la punta del pie delantero y el talón trasero junto a la línea; en la cruz, pivotas 90° sin perder la guardia.', checked: s.equipTape, onChange: function (v) { set({ equipTape: v }); } }),
        ui.toggle({ label: 'Goma en los tobillos', desc: 'Una goma circular ligera que queda justa con los pies a la anchura de los hombros: si se tensa, has abierto demasiado. Antes del HIIT te avisa de que te la quites.', checked: s.equipAnkles, onChange: function (v) { set({ equipAnkles: v }); } }));

      // --- Análisis por cámara
      var camTester = ui.cameraTester && ui.has('vision.pose') ? ui.cameraTester() : null;
      var camCard = h('div', { class: 'card settings-card' },
        h('h2', { class: 'h3' }, 'Análisis por cámara'),
        ui.toggle({ label: 'Analizar mis rondas de boxeo', desc: 'Usa la cámara durante las rondas de boxeo (el HIIT no) para revisar guardia, barbilla, golpes, cadera y velocidad, darte indicaciones en directo y un informe al terminar. Todo se procesa en este dispositivo: no se graba vídeo, no se guarda nada y la cámara se apaga al salir.', checked: s.cameraAnalysis, onChange: function (v) { set({ cameraAnalysis: v }); } }),
        ui.toggle({ label: 'Indicaciones por voz', desc: 'Frases cortas como «sube la mano» o «gira la cadera». Solo con las voces instaladas en el dispositivo; si no hay ninguna en español, se muestran en pantalla.', checked: s.voiceCues, onChange: function (v) { set({ voiceCues: v }); } }),
        ui.toggle({ label: 'Ver la cámara durante la sesión', desc: 'Una ventana pequeña con tu imagen y los puntos detectados, para colocarte bien.', checked: s.cameraPreview, onChange: function (v) { set({ cameraPreview: v }); } }),
        h('p', { class: 'muted small' }, 'Colócate a unos 2-3 m del dispositivo, con la cámara a la altura del pecho y de frente, de forma que se te vea de la cabeza a los pies y con buena luz. Las medidas son aproximadas: una sola cámara no ve la profundidad con precisión.'),
        camTester);

      var displayCard = h('div', { class: 'card settings-card' },
        h('h2', { class: 'h3' }, 'Sonido y pantalla'),
        ui.toggle({ label: 'Sonido', desc: 'Pitidos suaves al empezar cada ronda, al pasar al HIIT y al terminar.', checked: s.sound, onChange: function (v) { set({ sound: v }); if (v && SB.sounds) SB.sounds.startBeep(); } }),
        volSl,
        ui.toggle({ label: 'Tic en la cuenta atrás', desc: 'Sonido muy suave en el 3-2-1.', checked: s.countdownTicks, onChange: function (v) { set({ countdownTicks: v }); if (v && SB.sounds) SB.sounds.tick(); } }),
        ui.toggle({ label: 'Mantener la pantalla encendida', desc: 'Durante la sesión, si el navegador lo permite.', checked: s.keepAwake, onChange: function (v) { set({ keepAwake: v }); } }),
        ui.field('Tema', themeSeg),
        h('div', { class: 'btn-row' }, ui.button('Probar sonidos', { icon: 'volume', variant: 'secondary', size: 's', onClick: function () {
          if (!SB.sounds) return;
          SB.sounds.unlock();
          SB.sounds.startBeep();
          setTimeout(function () { SB.sounds.hiitBeep(); }, 900);
          setTimeout(function () { SB.sounds.finish(); }, 1900);
        } })));

      // --- Datos
      var fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'sr-only', id: 'imp-file' });
      fileInput.addEventListener('change', function () {
        var f = fileInput.files && fileInput.files[0];
        fileInput.value = '';
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var data;
          try { data = JSON.parse(String(reader.result)); } catch (e) { ui.toast('El archivo no es una copia válida de SOMBRA.'); return; }
          ui.confirm({ title: 'Importar copia', message: 'Los datos de esta copia sustituirán a los actuales (biblioteca, historial, calendario y ajustes). Los vídeos no se incluyen.', okLabel: 'Importar', danger: true }).then(function (ok) {
            if (!ok) return;
            var res = ui.safe(function () { SB.storage.importAll(data); return true; }, false);
            if (!res) { ui.toast('No se pudo importar la copia.'); return; }
            SB.app.applySettings();
            ui.toast('Copia importada');
            setTimeout(function () { location.hash = '#/'; location.reload(); }, 400);
          });
        };
        reader.onerror = function () { ui.toast('No se pudo leer el archivo.'); };
        reader.readAsText(f);
      });

      function exportData() {
        var data = ui.safe(function () { return SB.storage.exportAll(); }, null);
        if (!data) { ui.toast('No se pudo exportar.'); return; }
        ui.downloadFile('sombra-copia-' + ui.dayKey() + '.json', JSON.stringify(data, null, 2));
        ui.toast('Copia descargada');
      }
      function clearHistory() {
        ui.confirm({ title: 'Borrar historial', message: 'Se borrará el registro de sesiones que usa el motor para variar los entrenamientos. El calendario y tu biblioteca no cambian.', okLabel: 'Borrar historial', danger: true }).then(function (ok) {
          if (!ok) return;
          ui.safe(function () { SB.history.clear(); });
          ui.toast('Historial borrado');
        });
      }
      function resetAll() {
        ui.confirm({ title: 'Reiniciar todo', message: 'Se borrarán tu biblioteca, combinaciones propias, historial, calendario, plantillas, ajustes y vídeos de este navegador.', okLabel: 'Continuar', danger: true, focusCancel: true }).then(function (ok) {
          if (!ok) return;
          return ui.confirm({ title: '¿Seguro del todo?', message: 'Esta acción no se puede deshacer. Si quieres conservar algo, exporta antes una copia.', okLabel: 'Sí, borrar todo', danger: true, focusCancel: true }).then(function (ok2) {
            if (!ok2) return;
            ui.safe(function () { SB.storage.resetAll(); });
            try { sessionStorage.clear(); } catch (e) { /* noop */ }
            var done = function () { location.hash = '#/onboarding'; location.reload(); };
            if (SB.mediaStore && SB.mediaStore.clear) SB.mediaStore.clear().then(done, done); else done();
          });
        });
      }

      var proto = location.protocol === 'file:' ? 'archivo (file://)' : location.origin;
      var dataCard = h('div', { class: 'card settings-card' },
        h('h2', { class: 'h3' }, 'Tus datos'),
        ui.callout(h('div', null,
          h('p', null, 'Todo se guarda solo en este navegador y en este dispositivo: no hay cuentas ni servidores.'),
          h('p', null, 'Ojo: abrir la app con doble clic (file://) y desde http://localhost guarda los datos por separado. Ahora estás usando: ', h('strong', null, proto), '. Usa siempre la misma forma o pasa tus datos con una copia.')), 'info', 'info'),
        h('div', { class: 'btn-row' },
          ui.button('Exportar copia', { icon: 'download', variant: 'secondary', onClick: exportData }),
          h('label', { class: 'btn btn-secondary', for: 'imp-file', role: 'button', tabindex: '0', onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } } }, ui.icon('upload'), h('span', null, 'Importar copia')),
          fileInput),
        h('div', { class: 'danger-zone' },
          h('p', { class: 'eyebrow' }, 'Zona de borrado'),
          h('div', { class: 'btn-row' },
            ui.button('Borrar historial', { icon: 'trash', variant: 'danger', onClick: clearHistory }),
            ui.button('Reiniciar todo', { icon: 'warning', variant: 'danger', onClick: resetAll }))));

      root.appendChild(h('div', { class: 'page settings' },
        ui.screenHeader({ title: 'Ajustes', eyebrow: 'Preferencias' }),
        h('div', { class: 'settings-grid' }, trainingCard, materialCard, camCard, displayCard, dataCard),
        h('p', { class: 'muted small about' }, 'SOMBRA · Shadow Boxing Trainer. Funciona sin conexión. Tipografías Barlow y Barlow Condensed (SIL Open Font License).')));
      return function cleanup() { if (camTester) ui.safe(camTester.dispose); };
    }
  };
})(window.SB = window.SB || {});
