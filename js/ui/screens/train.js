/* SOMBRA · pantalla de entrenamiento (#/train) — §8.3.
   Bucle: requestAnimationFrame + setInterval de respaldo → player.update() → render por diferencias. */
(function (SB) {
  'use strict';
  var ui = SB.ui, h = ui.h, L = ui.labels;

  var MIN_RECORD_SEC = 300;

  function phaseOf(seg) {
    if (!seg) return 'rest';
    if (seg.type === 'boxing') return 'boxing';
    if (seg.type === 'hiit') return seg.category === 'cardio' ? 'cardio' : 'fuerza';
    return 'rest';
  }

  /** Ajusta el tamaño de letra de `el` para que quepa en `box` (búsqueda binaria). */
  function fit(el, box, maxPx, minPx) {
    if (!el || !box || !el.isConnected) return;
    // Área útil = caja sin su relleno (el margen lateral lo pone .tr-fit en CSS).
    var cs = window.getComputedStyle(box);
    var W = box.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    var H = box.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0);
    if (W <= 0 || H <= 0) return;
    var lo = minPx || 14;
    var hi = Math.max(lo, Math.min(maxPx || 9999, H));
    function ok() { return el.scrollWidth <= W + 1 && el.offsetHeight <= H + 1; }
    el.style.fontSize = hi + 'px';
    if (ok()) return;
    for (var i = 0; i < 11; i++) {
      var mid = (lo + hi) / 2;
      el.style.fontSize = mid + 'px';
      if (ok()) lo = mid; else hi = mid;
    }
    el.style.fontSize = Math.floor(lo) + 'px';
  }

  function bigTokens(seq, st) {
    var data = ui.tokenData(seq, st);
    // Sin ninguna marca (CUERPO, izq/der…) no se reserva su fila: los números pueden crecer más.
    var anySub = data.some(function (t) { return !!ui.subText(t); });
    var wrap = h('div', { class: 'tr-combo' + (anySub ? '' : ' no-sub'), role: 'img', 'aria-label': ui.comboText(seq, st) });
    data.forEach(function (t, i) {
      if (i > 0) wrap.appendChild(h('span', { class: 'big-sep', 'aria-hidden': 'true' }));
      var sub = ui.subText(t);
      wrap.appendChild(h('span', { class: 'big-tok k-' + (t.kind || 'golpe') + (t.body ? ' is-body' : '') + (String(t.label).length > 2 ? ' is-word' : ''), 'aria-hidden': 'true' },
        h('span', { class: 'big-label' }, t.label),
        h('span', { class: 'big-sub' + (sub ? '' : ' is-empty') }, sub || '·')));
    });
    return wrap;
  }

  SB.screens.train = {
    title: 'Entrenamiento',
    immersive: true,
    render: function (root) {
      var session = SB.app.restoreSession();
      if (!session) { SB.router.replace('/'); return; }
      if (!SB.Player) {
        root.appendChild(h('div', { class: 'page page-narrow' },
          ui.callout('El reproductor de sesiones no está disponible.', 'danger', 'warning'),
          ui.button('Volver', { href: '#/preview', variant: 'secondary' })));
        return;
      }

      var settings = SB.app.settings();
      var stance = settings.stance;
      var speed = SB.app.speed();
      var timeline = session.timeline || [];
      var totalSec = session.totalSec || timeline.reduce(function (a, s) { return a + (s.duration || 0); }, 0) || 1;

      var player;
      try { player = new SB.Player(session, { speed: speed }); }
      catch (e) {
        console.error('[SOMBRA] Player', e);
        root.appendChild(h('div', { class: 'page page-narrow' }, ui.callout('No se pudo iniciar la sesión.', 'danger', 'warning'), ui.button('Volver', { href: '#/preview' })));
        return;
      }

      // ------------------------------------------------------------------ DOM
      var el = {};
      el.root = h('div', { class: 'train', 'data-phase': 'rest' });

      el.title = h('div', { class: 'tr-title' },
        h('span', { class: 'tr-name' }, session.title || 'Sesión'),
        h('span', { class: 'tr-level' }, (L.level[session.level] || session.level || '').toUpperCase()),
        speed !== 1 ? h('span', { class: 'tr-speed' }, '×' + speed) : null);
      el.totalLeft = h('span', { class: 'tr-total num', 'aria-label': 'Tiempo restante de la sesión' }, '');
      el.btnDemo = ui.button('', { icon: 'demo', variant: 'ghost', ariaLabel: 'Figura animada (D)', cls: 'tr-btn', onClick: function () { toggleDemo(); } });
      el.btnDemo.setAttribute('aria-pressed', 'false');
      el.btnFs = ui.button('', { icon: 'fullscreen', variant: 'ghost', ariaLabel: 'Pantalla completa (F)', cls: 'tr-btn', onClick: function () { toggleFullscreen(); } });
      el.btnExit = ui.button('', { icon: 'exit', variant: 'ghost', ariaLabel: 'Salir (Esc)', cls: 'tr-btn', onClick: function () { confirmExit(); } });
      if (!fsSupported()) el.btnFs.hidden = true;

      el.top = h('div', { class: 'tr-top' }, el.title, h('div', { class: 'tr-top-actions' }, el.totalLeft, el.btnDemo, el.btnFs, el.btnExit));

      // Barra de progreso segmentada por tipo
      function progLayer(cls) {
        var layer = h('div', { class: 'tr-prog-layer ' + cls });
        timeline.forEach(function (s) {
          layer.appendChild(h('span', { class: 'tr-prog-seg p-' + phaseOf(s), style: { flexGrow: String(s.duration || 1) } }));
        });
        return layer;
      }
      el.progFill = progLayer('tr-prog-fill');
      el.progress = h('div', { class: 'tr-progress', role: 'progressbar', 'aria-label': 'Progreso de la sesión', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' },
        progLayer('tr-prog-base'), el.progFill);

      el.label = h('div', { class: 'tr-label' });
      el.mat = h('div', { class: 'tr-mat' });
      el.pausedBadge = h('span', { class: 'tr-paused', 'aria-hidden': 'true' }, 'EN PAUSA');
      el.labelRow = h('div', { class: 'tr-label-row' }, el.label, el.mat, el.pausedBadge);

      el.demoHost = h('div', { class: 'tr-demo-host' });
      el.demo = h('div', { class: 'tr-demo', hidden: true },
        el.demoHost,
        ui.button('', { icon: 'close', variant: 'ghost', ariaLabel: 'Ocultar figura (D)', cls: 'tr-demo-close', onClick: function () { if (figurePref) toggleDemo(); else closeDemo(); } }));

      el.stage = h('div', { class: 'tr-stage', 'aria-live': 'off' });
      el.timer = h('div', { class: 'tr-timer num', role: 'timer', 'aria-live': 'off' }, '0:00');
      el.next = h('div', { class: 'tr-next' });

      el.btnPrev = ui.button('', { icon: 'prev', variant: 'ghost', ariaLabel: 'Segmento anterior (←)', cls: 'tr-ctrl', onClick: function () { player.back(); tick(); } });
      el.btnPlay = h('button', { type: 'button', class: 'tr-ctrl tr-play', 'aria-label': 'Pausa (Espacio)', onclick: function () { player.toggle(); tick(); } }, ui.icon('pause'));
      el.btnNext = ui.button('', { icon: 'next', variant: 'ghost', ariaLabel: 'Siguiente segmento (→)', cls: 'tr-ctrl', onClick: function () { player.skip(); tick(); } });
      el.controls = h('div', { class: 'tr-controls' }, el.btnPrev, el.btnPlay, el.btnNext);

      el.countdown = h('div', { class: 'tr-countdown', hidden: true, 'aria-live': 'assertive' }, h('span', { class: 'tr-cd-num num' }, ''));
      el.sr = h('div', { class: 'sr-only', 'aria-live': 'polite' });

      // Análisis por cámara (solo si está activado en Ajustes)
      var camWanted = !!settings.cameraAnalysis && ui.has('vision.pose') && ui.has('vision.Analyzer') && ui.has('vision.Coach');
      if (camWanted) {
        el.camVideo = h('video', { class: 'tr-cam-video', 'aria-hidden': 'true' });
        el.camVideo.muted = true; el.camVideo.playsInline = true; el.camVideo.setAttribute('playsinline', '');
        el.camCanvas = h('canvas', { class: 'tr-cam-canvas', 'aria-hidden': 'true' });
        el.camStatus = h('div', { class: 'tr-cam-status' }, 'Cámara…');
        el.cam = h('div', { class: 'tr-cam' + (settings.cameraPreview === false ? ' is-mini' : ''), role: 'img', 'aria-label': 'Tu imagen en la cámara' },
          el.camVideo, el.camCanvas, el.camStatus);
        el.cue = h('div', { class: 'tr-cue', hidden: true, 'aria-live': 'polite' });
      }

      el.root.appendChild(el.top);
      el.root.appendChild(el.progress);
      el.root.appendChild(el.labelRow);
      el.root.appendChild(el.demo);
      el.root.appendChild(el.stage);
      el.root.appendChild(el.timer);
      el.root.appendChild(el.next);
      el.root.appendChild(el.controls);
      el.root.appendChild(el.countdown);
      el.root.appendChild(el.sr);
      if (el.cam) { el.root.appendChild(el.cam); el.root.appendChild(el.cue); }
      root.appendChild(el.root);

      // ---------------------------------------------------------------- estado
      var last = { segIndex: -2, comboKey: null, timer: '', countdown: null, paused: null, total: '', phaseType: null, pct: -1 };
      var alive = true, finishedShown = false, recorded = false, exiting = false;
      var rafId = 0, ivId = 0;
      var currentFit = null;
      var demo = null, demoOpen = false, demoAuto = false, demoTarget = null;
      var figurePref = settings.showFigure !== false;
      var wakeLock = null;
      var cam = null, camState = null;

      // ------------------------------------------------------------ helpers
      function segAt(i) { return timeline[i] || null; }
      function findNext(fromIdx, type) {
        for (var i = fromIdx + 1; i < timeline.length; i++) if (!type || timeline[i].type === type) return timeline[i];
        return null;
      }
      function roundTag(seg) { return 'RONDA ' + seg.round + '/' + seg.roundsTotal; }
      /** «HIIT · FUERZA» o, en el bloque final, «ABDOMEN · 2/3». */
      function hiitTag(hs) {
        if (!hs) return 'HIIT';
        if (hs.finisher) return 'ABDOMEN' + (hs.finisherTotal ? ' · ' + hs.finisherIndex + '/' + hs.finisherTotal : '');
        return 'HIIT · ' + (L.hiitCat[hs.category] || hs.category || '').toUpperCase();
      }

      function setFit(target, box, max) {
        currentFit = target ? { el: target, box: box, max: max } : null;
        refit();
      }
      function refit() {
        if (!currentFit) return;
        var vh = window.innerHeight || 800;
        fit(currentFit.el, currentFit.box, Math.min(currentFit.max * vh, currentFit.box.clientHeight), 14);
        hideEdgeSeps(currentFit.el);
      }
      /** Oculta los puntos separadores que caen en un salto de línea. */
      function hideEdgeSeps(combo) {
        if (!combo || !combo.classList.contains('tr-combo')) return;
        var seps = combo.querySelectorAll('.big-sep');
        for (var i = 0; i < seps.length; i++) {
          var p = seps[i].previousElementSibling, n = seps[i].nextElementSibling;
          var brk = p && n && Math.abs(n.offsetTop - p.offsetTop) > 2;
          seps[i].style.visibility = brk ? 'hidden' : '';
        }
      }

      function upcomingInfo(idx) {
        // Lo que viene tras un descanso/preparación: foco de la ronda y primera combinación
        var nxt = segAt(idx + 1);
        var wrap = h('div', { class: 'tr-upcoming' });
        if (!nxt) {
          wrap.appendChild(h('p', { class: 'tr-up-title' }, 'Fin de la sesión'));
          return wrap;
        }
        wrap.appendChild(h('p', { class: 'eyebrow tr-up-eyebrow' }, 'A continuación'));
        if (nxt.type === 'boxing') {
          wrap.appendChild(h('p', { class: 'tr-up-title' }, roundTag(nxt) + ' · ' + (nxt.focusName || ui.focusName(nxt.focusId))));
          var c = nxt.combos && nxt.combos[0];
          if (c && c.seq) wrap.appendChild(h('div', { class: 'tr-up-combo' }, ui.tokens(c.seq, { stance: stance, size: 'xl' })));
          var items = ui.materialItems(nxt.material, stance);
          if (items.length) {
            wrap.appendChild(h('ul', { class: 'tr-up-mat' }, items.map(function (it) {
              return h('li', { class: 'mat-' + it.key }, it.long);
            })));
          }
        } else if (nxt.type === 'hiit' || nxt.type === 'transition') {
          var hs = nxt.type === 'hiit' ? nxt : findNext(idx + 1, 'hiit');
          wrap.appendChild(h('p', { class: 'tr-up-title' }, hiitTag(hs) + (hs && hs.exercise ? ' · ' + hs.exercise.name : '')));
        } else {
          var cur = segAt(idx);
          if (cur && cur.next && cur.next.title) wrap.appendChild(h('p', { class: 'tr-up-title' }, cur.next.title + (cur.next.detail ? ' · ' + cur.next.detail : '')));
        }
        return wrap;
      }

      // --------------------------------------------------------- fases
      function buildPhase(st) {
        var seg = st.segment;
        var idx = st.segIndex;
        var phase = phaseOf(seg);
        el.root.setAttribute('data-phase', phase);
        el.root.setAttribute('data-type', seg.type);
        ui.clear(el.stage);
        ui.clear(el.next);
        el.next.classList.remove('has-rsum');
        ui.clear(el.mat);
        currentFit = null;
        el.next.hidden = true;

        if (seg.type === 'boxing') {
          el.label.textContent = roundTag(seg) + ' · INTERVALO ' + seg.interval + '/' + seg.intervalsTotal + ' · ' +
            (L.mode[seg.mode] || seg.mode || '').toUpperCase() + ' · ' + (seg.focusName || ui.focusName(seg.focusId));
          var chips = ui.materialChips(seg.material, stance);
          if (chips) el.mat.appendChild(chips);
          el.comboBox = h('div', { class: 'tr-fit' });
          el.change = h('div', { class: 'tr-change', 'aria-hidden': 'true' }, h('i'));
          el.change.hidden = !(seg.mode === 'variacion' && seg.combos && seg.combos.length > 1);
          el.stage.appendChild(el.comboBox);
          el.stage.appendChild(el.change);
          el.next.hidden = !settings.showNext;
          el.sr.textContent = el.label.textContent;
        } else if (seg.type === 'hiit') {
          el.label.textContent = '';
          var ex = seg.exercise || {};
          var nameBox = h('div', { class: 'tr-fit tr-fit-text' });
          var name = h('div', { class: 'tr-hiit-name' }, (ex.name || 'HIIT').toUpperCase());
          nameBox.appendChild(name);
          el.stage.appendChild(h('div', { class: 'tr-hiit-tag' }, hiitTag(seg)));
          el.stage.appendChild(nameBox);
          if (ex.note) el.stage.appendChild(h('div', { class: 'tr-hiit-note' }, ex.note));
          var hChips = ui.materialChips(seg.material, stance);
          if (hChips) el.mat.appendChild(hChips);
          setFit(name, nameBox, 0.24);
          el.sr.textContent = 'HIIT: ' + (ex.name || '');
        } else if (seg.type === 'transition') {
          var hs = findNext(idx, 'hiit');
          var hx = hs && hs.exercise ? hs.exercise : null;
          el.label.textContent = '';
          el.stage.appendChild(h('div', { class: 'tr-big-word' }, 'PREPÁRATE'));
          var tBox = h('div', { class: 'tr-fit tr-fit-text tr-fit-secondary' });
          var tName = h('div', { class: 'tr-hiit-name' }, hx ? hx.name.toUpperCase() : (seg.label || ''));
          tBox.appendChild(tName);
          el.stage.appendChild(tBox);
          if (hs) el.stage.appendChild(h('div', { class: 'tr-hiit-tag tr-tag-' + hs.category }, hiitTag(hs) + (hx && hx.note ? ' · ' + hx.note : '')));
          var drops = [];
          if (seg.dropDumbbells) drops.push('Deja las mancuernas');
          if (seg.removeAnkles) drops.push('Quítate la goma de los tobillos');
          if (hs && hs.material && hs.material.rope) drops.push('Ve a la cuerda');
          drops.forEach(function (d) { el.stage.appendChild(h('div', { class: 'tr-drop' }, d)); });
          setFit(tName, tBox, 0.14);
          el.sr.textContent = 'Prepárate: ' + (hx ? hx.name : '') + (drops.length ? '. ' + drops.join('. ') + '.' : '');
        } else {
          // prepare | rest
          var isPrep = seg.type === 'prepare';
          el.label.textContent = (!isPrep && seg.long) ? 'DESCANSO LARGO' : '';
          el.stage.appendChild(h('div', { class: 'tr-big-word' }, isPrep ? 'PREPÁRATE' : 'DESCANSO'));
          el.stage.appendChild(upcomingInfo(idx));
          if (!isPrep && cam && cam.lastSummary) {
            el.next.appendChild(roundSummaryView(cam.lastSummary));
            el.next.classList.add('has-rsum');
            el.next.hidden = false;
          }
          el.sr.textContent = isPrep ? 'Prepárate' : 'Descanso';
        }
        last.comboKey = null;
      }

      function renderCombo(st) {
        var c = st.combo;
        ui.clear(el.comboBox);
        if (!c || !c.seq) { setFit(null); return; }
        var big = bigTokens(c.seq, stance);
        el.comboBox.appendChild(big);
        setFit(big, el.comboBox, 0.55);
        // SIGUIENTE
        if (settings.showNext) {
          ui.clear(el.next);
          el.next.appendChild(h('span', { class: 'tr-next-label' }, 'SIGUIENTE'));
          var segc = st.segment && st.segment.combos;
          var inSeg = segc && st.comboIndex >= 0 && st.comboIndex + 1 < segc.length ? segc[st.comboIndex + 1] : null;
          if (inSeg && inSeg.seq) {
            el.next.appendChild(ui.tokens(inSeg.seq, { stance: stance, size: 'l' }));
          } else {
            var n = segAt(st.segIndex + 1);
            var txt = 'Fin de la sesión';
            if (n) {
              if (n.type === 'boxing') {
                var c0 = n.combos && n.combos[0];
                if (c0) { el.next.appendChild(ui.tokens(c0.seq, { stance: stance, size: 'l' })); txt = null; }
                else txt = 'Intervalo ' + n.interval + '/' + n.intervalsTotal;
              } else if (n.type === 'transition' || n.type === 'hiit') {
                var hs = n.type === 'hiit' ? n : findNext(st.segIndex + 1, 'hiit');
                txt = 'HIIT' + (hs && hs.exercise ? ' · ' + hs.exercise.name : '');
              } else if (n.type === 'rest') txt = 'Descanso';
            }
            if (txt) el.next.appendChild(h('span', { class: 'tr-next-text' }, txt));
          }
        }
        el.sr.textContent = ui.comboText(c.seq, stance);
        if (cam && cam.round != null) ui.safe(function () { cam.analyzer.setCombo(c.seq); cam.coach.onCombo(); });
        maybeAutoDemo(c);
        if (demoOpen && !demoAuto) showDemoFor(st);
      }

      // --------------------------------------------------------- figura / demo
      function ensureDemo() {
        if (demo) return demo;
        if (!ui.has('visual.demo.mount')) return null;
        demo = ui.safe(function () { return SB.visual.demo.mount(el.demoHost, { stance: stance, variant: 'figure' }); }, null);
        return demo;
      }
      function syncDemoBtn() { el.btnDemo.setAttribute('aria-pressed', String(figurePref || demoOpen)); }
      function openDemo(auto, quiet) {
        if (!ensureDemo()) { if (!quiet) ui.toast('La demostración no está disponible.'); return false; }
        demoOpen = true; demoAuto = !!auto;
        el.demo.hidden = false;
        el.root.classList.add('demo-open');
        syncDemoBtn();
        requestAnimationFrame(refit);
        return true;
      }
      function closeDemo() {
        demoOpen = false; demoAuto = false; demoTarget = null;
        el.demo.hidden = true;
        el.root.classList.remove('demo-open');
        syncDemoBtn();
        if (demo) ui.safe(function () { demo.hide(); });
        requestAnimationFrame(refit);
      }
      /**
       * La figura acompaña a todo: boxeo, descansos y preparación (con la combinación que viene),
       * transición (el ejercicio HIIT que viene) y HIIT (el ejercicio en curso).
       */
      function figurePhase(seg) {
        return !!seg && (seg.type === 'boxing' || seg.type === 'rest' || seg.type === 'prepare' || seg.type === 'hiit' || seg.type === 'transition');
      }
      function syncFigure(st) {
        if (figurePref && figurePhase(st.segment)) {
          if (!demoOpen || demoAuto) {
            demoTarget = null;
            if (!openDemo(false, true)) return;
          }
          showDemoFor(st);
        } else if (demoOpen && !demoAuto) closeDemo();
      }
      function showDemoFor(st) {
        if (!demo) return;
        var seg = st.segment, seq = null;
        if (seg && (seg.type === 'hiit' || seg.type === 'transition')) {
          var hs = seg.type === 'hiit' ? seg : findNext(st.segIndex, 'hiit');
          var ex = hs && hs.exercise;
          if (ex && demo.showExercise) {
            if (demoTarget === 'hiit:' + ex.id) return;
            demoTarget = 'hiit:' + ex.id;
            ui.safe(function () { demo.showExercise(ex); });
            return;
          }
        }
        if (seg && seg.type === 'boxing' && st.combo) seq = st.combo.seq;
        else {
          var nb = findNext(st.segIndex, 'boxing');
          if (seg && seg.type !== 'hiit' && nb && nb.combos && nb.combos[0]) seq = nb.combos[0].seq;
          else if (st.combo) seq = st.combo.seq;
        }
        if (!seq) return;
        var key = seq.join('>');
        if (key === demoTarget) return;
        demoTarget = key;
        ui.safe(function () { if (seq.length > 1) demo.showCombo(seq); else demo.showMovement(seq[0]); });
      }
      /** D / botón: muestra u oculta la figura y lo recuerda para las próximas sesiones. */
      function toggleDemo() {
        figurePref = !(figurePref || demoOpen);
        ui.safe(function () { SB.app.saveSettings({ showFigure: figurePref }); });
        if (!figurePref) { closeDemo(); return; }
        var st = player.getState();
        if (!figurePhase(st.segment)) { syncDemoBtn(); ui.toast('La figura aparecerá en la próxima ronda.'); return; }
        if (!ensureDemo()) { figurePref = false; syncDemoBtn(); ui.toast('La demostración no está disponible.'); return; }
        syncFigure(st);
      }
      function maybeAutoDemo(c) {
        if (!settings.autoDemo || !c || !c.isNew) return;
        if (demoOpen && !demoAuto) return;
        if (!openDemo(true)) return;
        var ids = (c.newIds && c.newIds.length) ? c.newIds : null;
        var key = ids ? 'new:' + ids.join(',') : c.seq.join('>');
        if (key === demoTarget) return;
        demoTarget = key;
        ui.safe(function () {
          if (ids && ids.length === 1) demo.showMovement(ids[0]);
          else demo.showCombo(c.seq);
        });
      }

      // ----------------------------------------------------- fullscreen
      function fsSupported() {
        var d = document.documentElement;
        return !!(d.requestFullscreen || d.webkitRequestFullscreen);
      }
      function fsElement() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
      function toggleFullscreen() {
        var d = document.documentElement;
        try {
          if (fsElement()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
          else {
            var p = (d.requestFullscreen || d.webkitRequestFullscreen).call(d);
            if (p && p.catch) p.catch(function () { /* el navegador lo rechazó */ });
          }
        } catch (e) { /* noop */ }
      }
      function onFsChange() {
        var on = !!fsElement();
        ui.clear(el.btnFs).appendChild(ui.icon(on ? 'fullscreen-exit' : 'fullscreen'));
        el.btnFs.setAttribute('aria-label', on ? 'Salir de pantalla completa (F)' : 'Pantalla completa (F)');
        requestAnimationFrame(refit);
      }

      // ----------------------------------------------------- wake lock
      function requestWake() {
        if (!settings.keepAwake || !navigator.wakeLock || !alive || finishedShown) return;
        if (document.visibilityState !== 'visible') return;
        navigator.wakeLock.request('screen').then(function (wl) { wakeLock = wl; }).catch(function () { /* no permitido */ });
      }
      function releaseWake() {
        if (wakeLock) { try { wakeLock.release(); } catch (e) { /* noop */ } wakeLock = null; }
      }
      function onVisibility() { if (document.visibilityState === 'visible') { requestWake(); tick(); } }

      // ----------------------------------------------------- registro
      function record(completed) {
        if (recorded) return true;
        var st = player.getState();
        var active = Math.round(st.activeSec || 0);
        if (!completed && active < MIN_RECORD_SEC) return false;
        recorded = true;
        ui.safe(function () {
          var rec = SB.session.toRecord(session, { completedSec: Math.round(st.totalElapsed || 0), activeSec: active, completed: !!completed });
          SB.history.record(rec);
        });
        ui.safe(function () { SB.calendar.mark(); });
        return true;
      }

      // ------------------------------------------------- análisis por cámara
      // Solo se analizan las rondas de boxeo. Cada fotograma se procesa y se descarta, salvo los
      // pocos segundos de cada fallo que guarda SB.vision.clips (si cameraClips) para verlos a
      // cámara lenta en el resumen: solo en memoria, se borran al salir de la pantalla. Al terminar
      // o salir se apaga la cámara.
      var cueTimer = 0;
      function setCamStatus(msg) { if (el.camStatus) { el.camStatus.textContent = msg || ''; el.camStatus.hidden = !msg; } }
      function showCue(text, kind) {
        if (!el.cue || !text) return;
        el.cue.textContent = text;
        el.cue.className = 'tr-cue cue-' + (kind || 'fault');
        el.cue.hidden = false;
        clearTimeout(cueTimer);
        cueTimer = setTimeout(function () { if (el.cue) el.cue.hidden = true; }, kind === 'theme' ? 6000 : 3500);
      }
      /** Error de cámara: qué pasa, cómo arreglarlo, el código y los botones Reintentar / Seguir sin cámara. */
      function showCamError(e) {
        if (!el.camStatus) return;
        var d = SB.vision.pose.describeError(e);
        ui.clear(el.camStatus);
        el.camStatus.hidden = false;
        el.camStatus.appendChild(h('strong', { class: 'tr-cam-err' }, d.msg));
        el.camStatus.appendChild(h('span', { class: 'tr-cam-fix' }, d.fix + ' (' + d.code + ')'));
        el.camStatus.appendChild(h('span', { class: 'tr-cam-actions' },
          h('button', { type: 'button', class: 'tr-cam-btn', onclick: function () { if (el.cam) el.cam.classList.remove('is-error'); startCamera(); } }, 'Reintentar'),
          h('button', { type: 'button', class: 'tr-cam-btn is-ghost', onclick: function () { if (el.cam) el.cam.hidden = true; } }, 'Seguir sin cámara')));
        if (el.cam) { el.cam.classList.add('is-error'); el.cam.hidden = false; }
      }
      function startCamera() {
        if (!camWanted) return;
        if (cam && cam.stream) return;
        cam = { analyzer: new SB.vision.Analyzer({ stance: stance }), round: null, summaries: [], lastSummary: null, stream: null, tracker: null, failed: false, serieSeg: -1,
          clips: settings.cameraClips !== false && ui.has('vision.clips.Recorder') && SB.vision.clips.supported() ? new SB.vision.clips.Recorder() : null };
        if (!SB.vision.pose.supported()) { cam.failed = true; showCamError({ name: 'UnsupportedError' }); return; }
        cam.coach = new SB.vision.Coach({
          analyzer: cam.analyzer,
          say: function (t) { if (settings.voiceCues !== false && SB.voice) SB.voice.say(t); },
          show: showCue,
          onFault: function (id, w) { if (cam && cam.clips) ui.safe(function () { cam.clips.mark(id, w); }); }
        });
        if (SB.voice) { SB.voice.setVoice(settings.voiceName || ''); SB.voice.setVolume(settings.sound === false ? 0 : (Number(settings.volume) || 0.7)); }
        setCamStatus('Abriendo la cámara…');
        var mine = cam;
        SB.vision.pose.openCamera(el.camVideo, { deviceId: settings.cameraId || '', lastId: settings.cameraLastId || '' }).then(function (r) {
          if (!alive || cam !== mine) { SB.vision.pose.closeCamera(el.camVideo, r.stream); return null; }
          cam.stream = r.stream;
          // Se recuerda la cámara que ha funcionado para probarla primero la próxima vez.
          if (r.deviceId && r.deviceId !== settings.cameraLastId) ui.safe(function () { settings = SB.app.saveSettings({ cameraLastId: r.deviceId }); });
          if (r.black) showCue('La cámara da imagen negra: ¿tiene la tapa puesta?', 'fault');
          return SB.vision.pose.load(setCamStatus).then(function (lm) {
            if (!alive || cam !== mine) return;
            cam.tracker = new SB.vision.pose.Tracker(el.camVideo, lm, onCamFrame);
            cam.tracker.start();
            setCamStatus('');
            syncCam(camState || player.getState());
          });
        }).catch(function (e) {
          console.warn('[SOMBRA] cámara', e);
          if (cam !== mine) return;
          cam.failed = true;
          stopCamera(true);
          showCamError(e);
        });
      }
      function stopCamera(keepPanel) {
        if (!cam) return;
        if (cam.tracker) cam.tracker.stop();
        SB.vision.pose.closeCamera(el.camVideo, cam.stream);
        cam.stream = null;
        if (SB.voice) SB.voice.cancel();
        clearTimeout(cueTimer);
        if (!keepPanel && el.cam) el.cam.hidden = true;
      }
      /** Fotograma analizado: dibuja el esqueleto y, en las rondas de boxeo, analiza. */
      function onCamFrame(f) {
        if (!cam || !alive) return;
        if (settings.cameraPreview !== false && el.camCanvas) {
          if (el.camCanvas.width !== f.w) { el.camCanvas.width = f.w; el.camCanvas.height = f.h; }
          SB.vision.pose.drawSkeleton(el.camCanvas, f.lm);
        }
        var st = camState, seg = st && st.segment;
        if (seg && seg.type === 'boxing' && !st.paused && cam.round != null) {
          cam.analyzer.push(f);
          if (cam.clips) cam.clips.capture(el.camVideo, f);
          cam.coach.update(f.t);
        } else if (seg && (seg.type === 'prepare' || seg.type === 'rest')) {
          setCamStatus(SB.vision.pose.framingText(f.lm));
        }
      }
      function startCamRound(seg) {
        cam.round = seg.round;
        var dur = 0;
        timeline.forEach(function (s) { if (s.type === 'boxing' && s.round === seg.round) dur += s.duration; });
        cam.analyzer.startRound({ round: seg.round, material: seg.material || null, durationSec: dur / (speed || 1) });
        var info = cam.coach.startRound({ round: seg.round, material: seg.material || {} }, performance.now() / 1000);
        if (cam.analyzer.cur) cam.analyzer.cur.theme = info.theme;
        var c = seg.combos && seg.combos[0];
        cam.analyzer.setCombo(c ? c.seq : []);
      }
      function endCamRound() {
        var stats = cam.analyzer.endRound();
        var sum = stats ? cam.coach.endRound(stats) : null;
        if (sum) { cam.summaries.push(sum); cam.lastSummary = sum; }
        cam.round = null;
      }
      /** Al cambiar de segmento o de pausa: rondas del análisis y cuándo detectar. */
      function syncCam(st) {
        if (!cam || cam.failed) return;
        var seg = st && st.segment;
        if (cam.round != null && (!seg || seg.type !== 'boxing' || seg.round !== cam.round)) endCamRound();
        if (seg && seg.type === 'boxing' && cam.round == null) startCamRound(seg);
        // Cada intervalo de boxeo es una serie: cupo de un comentario por serie.
        if (seg && seg.type === 'boxing' && cam.round != null && st.segIndex !== cam.serieSeg) {
          cam.serieSeg = st.segIndex;
          cam.coach.startSerie(performance.now() / 1000);
        }
        if (cam.tracker) cam.tracker.active = !!seg && !st.paused && (seg.type === 'boxing' || seg.type === 'prepare' || seg.type === 'rest');
        if (seg && seg.type !== 'prepare' && seg.type !== 'rest') setCamStatus('');
      }
      function roundSummaryView(sum) {
        if (!sum) return null;
        return h('div', { class: 'tr-rsum' },
          h('p', { class: 'eyebrow' }, 'Ronda ' + sum.round + (sum.themeName ? ' · ' + sum.themeName : '')),
          sum.lowData ? h('p', { class: 'tr-rsum-line muted' }, 'Pocos datos: la cámara casi no te vio.') :
            h('p', { class: 'tr-rsum-line' }, sum.facts.join(' · ')),
          sum.good ? h('p', { class: 'tr-rsum-line rsum-good' }, ui.icon('check'), ' ', sum.good) : null,
          sum.fix ? h('p', { class: 'tr-rsum-line rsum-fix' }, ui.icon('target'), ' ', sum.fix) : null);
      }
      /** Enlace al vídeo de YouTube recomendado (y al de español, si lo hay). */
      function videoLink(key) {
        var v = key && SB.data && SB.data.videos ? SB.data.videos[key] : null;
        if (!v) return null;
        var a = function (x) {
          return h('a', { href: 'https://www.youtube.com/watch?v=' + x.id, target: '_blank', rel: 'noopener noreferrer' }, x.title);
        };
        return h('p', { class: 'rep-video' }, ui.icon('play'), ' Mírate este vídeo: ', a(v), ' (' + v.channel + ', en ' + v.lang + ')',
          v.alt ? h('span', { class: 'rep-video-alt' }, ' · En español: ', a(v.alt), ' (' + v.alt.channel + ')') : null);
      }
      /** Hueco para el clip de un punto a mejorar (se rellena cuando el clip está listo). */
      function clipSlot(it) {
        if (!it.clips || !it.clips.length || !cam || !cam.clips) return null;
        var slot = h('div', { class: 'rep-clip', hidden: true });
        slot._clipIds = it.clips;
        return slot;
      }
      function reportView(rep) {
        if (!rep) return null;
        var list = function (items, withTip) {
          return h('ul', { class: 'rep-list' }, items.map(function (it) {
            return h('li', null, h('strong', null, it.title + '. '), it.text, withTip && it.tip ? h('span', { class: 'rep-tip' }, it.tip) : null,
              withTip ? clipSlot(it) : null, withTip ? videoLink(it.video) : null);
          }));
        };
        var withClips = !!(cam && cam.clips);
        return h('section', { class: 'tr-report', 'aria-label': 'Análisis de las rondas de boxeo' },
          h('h2', { class: 'h3' }, 'Análisis de tus rondas de boxeo'),
          h('p', { class: 'muted small' }, withClips
            ? 'Los clips de tus fallos solo están en esta pantalla: no se suben a ningún sitio y se borran al salir. Los vídeos de YouTube se abren en otra pestaña.'
            : 'No se ha grabado ni guardado nada: este informe desaparece al salir de esta pantalla.'),
          rep.good.length ? h('div', { class: 'rep-block rep-good' }, h('h3', null, 'Lo que haces bien'), list(rep.good, false)) : null,
          rep.improve.length ? h('div', { class: 'rep-block rep-bad' }, h('h3', null, 'Lo que debes mejorar'), list(rep.improve, true)) : null,
          rep.compare.length ? h('div', { class: 'rep-block' }, h('h3', null, 'Datos de la sesión'), h('ul', { class: 'rep-list' }, rep.compare.map(function (c) { return h('li', null, c); }))) : null,
          rep.rounds.length ? h('div', { class: 'rep-table-wrap' }, h('table', { class: 'rep-table' },
            h('thead', null, h('tr', null, ['Ronda', 'Tema', 'Material', 'Golpes', 'Velocidad', 'Guardia', 'Barbilla abajo'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
            h('tbody', null, rep.rounds.map(function (r) {
              return h('tr', null, h('td', null, String(r.round)), h('td', null, r.theme), h('td', null, r.material || '—'), h('td', { class: 'num' }, String(r.punches)),
                h('td', { class: 'num' }, r.speed), h('td', { class: 'num' }, r.guard), h('td', { class: 'num' }, r.chin));
            })))) : null,
          rep.notes.map(function (n) { return h('p', { class: 'muted small' }, n); }));
      }

      // ----------------------------------------------------- fin
      function showFinal(completed) {
        if (finishedShown) return;
        finishedShown = true;
        stopLoop();
        releaseWake();
        closeDemo();
        var rep = null;
        if (cam) {
          ui.safe(function () { if (cam.round != null) endCamRound(); rep = cam.coach.report(); });
          stopCamera();
        }
        if (completed && SB.sounds) SB.sounds.finish();
        var streak = ui.safe(function () { return SB.calendar.currentStreak(); }, 0) || 0;
        ui.clear(el.root);
        el.root.setAttribute('data-phase', 'done');
        el.root.classList.add('is-final');
        var home = ui.button('Volver al inicio', { variant: 'primary', size: 'lg', icon: 'home', onClick: function () { SB.app.go('/'); } });
        el.root.appendChild(h('div', { class: 'tr-final', role: 'status' },
          h('span', { class: 'tr-final-ico' }, ui.icon('check')),
          h('h1', { class: 'tr-final-title display' }, completed ? 'Sesión completada' : 'Sesión guardada'),
          h('p', { class: 'tr-final-sub' }, completed ? 'Buen trabajo. Hoy queda marcado en tu calendario.' : 'Has superado los 5 minutos de trabajo: hoy queda marcado en tu calendario.'),
          h('a', { class: 'tr-final-streak', href: '#/calendar' },
            ui.icon('flame'),
            h('span', { class: 'display num' }, String(streak)),
            h('span', null, streak === 1 ? 'día de racha' : 'días de racha')),
          home,
          reportView(rep)));
        if (rep) el.root.classList.add('has-report');
        if (rep && cam && cam.clips) fillClips(cam.clips);
        if (fsElement()) ui.safe(function () { (document.exitFullscreen || document.webkitExitFullscreen).call(document); });
        setTimeout(function () { home.focus(); }, 50);
      }

      /** Pone en cada punto a mejorar el clip de su fallo (el primero disponible, sin repetir). */
      var clipPlayers = [];
      function fillClips(rec) {
        rec.finish().then(function () {
          if (!alive) return;
          var used = {};
          Array.prototype.forEach.call(el.root.querySelectorAll('.rep-clip'), function (slot) {
            var id = (slot._clipIds || []).find(function (k) { return !used[k] && rec.get(k); });
            if (!id) return;
            used[id] = true;
            var pl = SB.vision.clips.player(rec.get(id));
            clipPlayers.push(pl);
            slot.appendChild(h('p', { class: 'rep-clip-title' }, 'Así lo estás haciendo (en espejo, como en la cámara):'));
            slot.appendChild(pl.el);
            slot.hidden = false;
          });
        }).catch(function (e) { console.warn('[SOMBRA] clips', e); });
      }
      function disposeClips() {
        clipPlayers.forEach(function (pl) { ui.safe(pl.dispose); });
        clipPlayers = [];
        if (cam && cam.clips) { ui.safe(function () { cam.clips.dispose(); }); cam.clips = null; }
      }

      function confirmExit() {
        if (exiting || finishedShown) return;
        exiting = true;
        var st = player.getState();
        var wasPaused = !!st.paused;
        if (!wasPaused) player.pause();
        tick();
        var willRecord = (st.activeSec || 0) >= MIN_RECORD_SEC;
        ui.confirm({
          title: '¿Salir del entrenamiento?',
          message: willRecord
            ? 'Llevas ' + Math.floor(st.activeSec / 60) + ' min de trabajo: la sesión se guardará en tu calendario.'
            : 'Aún no llevas 5 minutos de trabajo activo: esta sesión no se registrará.',
          okLabel: 'Salir', cancelLabel: 'Seguir entrenando', focusCancel: true
        }).then(function (ok) {
          exiting = false;
          if (!alive) return;
          if (!ok) { if (!wasPaused) player.resume(); tick(); return; }
          if (record(false)) showFinal(false);
          else SB.app.go('/');
        });
      }

      // ----------------------------------------------------- render
      function render(st) {
        if (!alive || finishedShown) return;
        if (st.finished) {
          record(true);
          showFinal(true);
          return;
        }
        var seg = st.segment;
        if (!seg) return;

        camState = st;
        if (st.segIndex !== last.segIndex) {
          var prevType = last.phaseType;
          var first = last.segIndex === -2;
          if (cam) ui.safe(function () { syncCam(st); });
          buildPhase(st);
          last.segIndex = st.segIndex;
          last.phaseType = seg.type;
          if (!first && SB.sounds) {
            if (seg.type === 'boxing') SB.sounds.startBeep();
            else if (seg.type === 'hiit') SB.sounds.hiitBeep();
            else if ((seg.type === 'rest' || seg.type === 'transition') && (prevType === 'boxing' || prevType === 'hiit')) SB.sounds.endBeep();
          }
          // Las demos automáticas se cierran al terminar el intervalo; la figura sigue según la fase
          if (demoOpen && demoAuto) closeDemo();
          syncFigure(st);
        }

        if (seg.type === 'boxing') {
          var key = st.comboIndex + '|' + (st.combo ? (st.combo.signature || (st.combo.seq || []).join('>')) : '');
          if (key !== last.comboKey) { last.comboKey = key; renderCombo(st); }
          if (!el.change.hidden && st.combo && st.combo.duration) {
            var frac = Math.max(0, Math.min(1, (st.comboRemaining || 0) / st.combo.duration));
            el.change.firstChild.style.transform = 'scaleX(' + frac.toFixed(3) + ')';
          }
        }

        var t = ui.fmtTime(Math.ceil(Math.max(0, st.segRemaining || 0) - 0.001));
        if (t !== last.timer) { el.timer.textContent = t; last.timer = t; }

        var tl = '−' + ui.fmtTime(Math.ceil(Math.max(0, st.totalRemaining || 0)));
        if (tl !== last.total) { el.totalLeft.textContent = tl; last.total = tl; }

        var pct = Math.max(0, Math.min(100, (st.totalElapsed || 0) / totalSec * 100));
        if (Math.abs(pct - last.pct) > 0.05) {
          el.progFill.style.clipPath = 'inset(0 ' + (100 - pct).toFixed(2) + '% 0 0)';
          el.progFill.style.webkitClipPath = el.progFill.style.clipPath;
          el.progress.setAttribute('aria-valuenow', String(Math.round(pct)));
          last.pct = pct;
        }

        var cd = st.countdown || null;
        if (cd !== last.countdown) {
          if (cd) {
            el.countdown.hidden = false;
            var num = el.countdown.firstChild;
            num.textContent = String(cd);
            num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
            if (settings.countdownTicks && SB.sounds && last.countdown !== undefined) SB.sounds.tick();
          } else {
            el.countdown.hidden = true;
          }
          last.countdown = cd;
        }

        var paused = !!st.paused;
        if (paused !== last.paused) {
          el.root.classList.toggle('is-paused', paused);
          ui.clear(el.btnPlay).appendChild(ui.icon(paused ? 'play' : 'pause'));
          el.btnPlay.setAttribute('aria-label', paused ? 'Reanudar (Espacio)' : 'Pausa (Espacio)');
          last.paused = paused;
          if (paused) releaseWake(); else requestWake();
          if (cam) ui.safe(function () { syncCam(st); });
        }
      }

      function tick() {
        if (!alive || finishedShown) return;
        try { player.update(); } catch (e) { console.error('[SOMBRA] update', e); }
        var st;
        try { st = player.getState(); } catch (e) { console.error('[SOMBRA] getState', e); return; }
        render(st);
      }
      function frame() {
        if (!alive || finishedShown) return;
        tick();
        rafId = requestAnimationFrame(frame);
      }
      function stopLoop() {
        if (rafId) cancelAnimationFrame(rafId);
        if (ivId) clearInterval(ivId);
        rafId = 0; ivId = 0;
      }

      // ----------------------------------------------------- teclado
      function isTyping(t) { return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
      function onKey(e) {
        if (!alive || finishedShown) return;
        if (document.querySelector('dialog[open]')) return;
        if (isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
        var k = e.key;
        if (k === ' ' || k === 'Spacebar') { e.preventDefault(); if (!e.repeat) { player.toggle(); tick(); } }
        else if (k === 'ArrowRight') { e.preventDefault(); player.skip(); tick(); }
        else if (k === 'ArrowLeft') { e.preventDefault(); player.back(); tick(); }
        else if (k === 'd' || k === 'D') { e.preventDefault(); toggleDemo(); }
        else if (k === 'f' || k === 'F') { e.preventDefault(); toggleFullscreen(); }
        else if (k === 'Escape') { e.preventDefault(); confirmExit(); }
      }
      function onKeyUp(e) {
        // Evita que Espacio "pulse" además el botón enfocado
        if ((e.key === ' ' || e.key === 'Spacebar') && !isTyping(e.target) && !document.querySelector('dialog[open]')) e.preventDefault();
      }
      function onPageHide() { if (!finishedShown) record(false); }

      // ----------------------------------------------------- arranque
      var ro = null;
      if (window.ResizeObserver) { ro = new ResizeObserver(function () { refit(); }); ro.observe(el.stage); }
      window.addEventListener('resize', refit);
      document.addEventListener('keydown', onKey);
      document.addEventListener('keyup', onKeyUp);
      document.addEventListener('visibilitychange', onVisibility);
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);
      window.addEventListener('pagehide', onPageHide);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (alive) refit(); });

      if (SB.sounds) SB.sounds.unlock();
      syncDemoBtn();
      ui.safe(startCamera);
      try { player.start(); } catch (e) { console.error('[SOMBRA] start', e); }
      requestWake();
      tick();
      rafId = requestAnimationFrame(frame);
      ivId = setInterval(tick, 250);

      return function cleanup() {
        if (!finishedShown) record(false);
        alive = false;
        stopLoop();
        releaseWake();
        ui.safe(function () { stopCamera(); });
        disposeClips();
        cam = null;
        if (ro) ro.disconnect();
        window.removeEventListener('resize', refit);
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('keyup', onKeyUp);
        document.removeEventListener('visibilitychange', onVisibility);
        document.removeEventListener('fullscreenchange', onFsChange);
        document.removeEventListener('webkitfullscreenchange', onFsChange);
        window.removeEventListener('pagehide', onPageHide);
        ui.safe(function () { player.stop(); });
        if (demo) ui.safe(function () { demo.destroy(); });
        demo = null;
        if (fsElement()) ui.safe(function () { (document.exitFullscreen || document.webkitExitFullscreen).call(document); });
      };
    }
  };
})(window.SB = window.SB || {});
