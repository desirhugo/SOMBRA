/*
 * SOMBRA · js/visual/demo.js  [Animación]
 *
 * Panel compacto de demostración (pantalla de entrenamiento y ficha de movimiento).
 * Izquierda: animación (SB.visual.Figure) o vídeo propio del usuario (SB.mediaStore).
 * Derecha: nombre, lado y 1-2 indicaciones clave.
 *
 * API (ARCHITECTURE §8.5):
 *   var demo = SB.visual.demo.mount(container, { stance: 'diestro'|'zurdo', variant?: 'figure' });
 *     variant 'figure': solo la figura, ocupando todo el contenedor, con el paso en curso rotulado debajo
 *   demo.showMovement(id)   movimiento suelto (vídeo si existe; si no, animación; si no, tarjeta)
 *   demo.showCombo(seq)     combinación encadenada (resalta el movimiento en curso)
 *   demo.showExercise(ex)   ejercicio HIIT (objeto de data/hiit.js o id), animación de exercises.js
 *   demo.hide()             oculta el panel y detiene la animación / vídeo
 *   demo.destroy()          elimina el panel y libera recursos
 *
 * CONTRATO: extras compatibles: demo.setStance(s) y demo.el (elemento raíz del panel).
 * CONTRATO: el panel no revoca las URLs que devuelve SB.mediaStore.getURL (las gestiona mediaStore).
 * Estilos: un único <style id="sbdemo-style"> con clases prefijadas `sbdemo-`; colores §8.6 vía
 * variables CSS si existen (con valores de reserva).
 */
(function (SB) {
  'use strict';

  SB.visual = SB.visual || {};

  var STYLE_ID = 'sbdemo-style';
  var CSS = [
    '.sbdemo{display:flex;align-items:center;gap:12px;box-sizing:border-box;max-width:100%;',
    'padding:8px 14px 8px 8px;border-radius:14px;',
    'background:var(--surface-2,var(--surface,#1B2027));color:var(--text,#F3F5F7);',
    'border:1px solid var(--line,#262C35);',
    'font-family:var(--font-text,"Barlow",system-ui,-apple-system,"Segoe UI",sans-serif)}',
    '.sbdemo[hidden]{display:none!important}',
    '.sbdemo *{box-sizing:border-box}',
    '.sbdemo-stage{position:relative;flex:0 0 auto;width:clamp(120px,42%,260px);aspect-ratio:6/5;',
    'border-radius:10px;overflow:hidden;background:var(--sbdemo-stage,transparent)}',
    '.sbdemo-canvas,.sbdemo-video{position:absolute;left:0;top:0;width:100%;height:100%;display:block}',
    '.sbdemo-video{object-fit:cover;background:#000}',
    '.sbdemo-canvas[hidden],.sbdemo-video[hidden],.sbdemo-card[hidden]{display:none}',
    '.sbdemo-card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;',
    'border:1px dashed var(--line,#262C35);border-radius:10px;text-align:center;padding:8px}',
    '.sbdemo-card-short{font-family:var(--font-display,"Barlow Condensed",system-ui,sans-serif);font-weight:800;',
    'font-size:clamp(26px,6vw,46px);line-height:1;letter-spacing:.02em;color:var(--accent,#FF5A36);',
    'max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.sbdemo-card-note{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-2,#8B95A3)}',
    '.sbdemo-info{flex:1 1 auto;min-width:0}',
    '.sbdemo-kicker{font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--text-2,#8B95A3)}',
    '.sbdemo-name{font-family:var(--font-display,"Barlow Condensed",system-ui,sans-serif);font-weight:700;',
    'font-size:clamp(18px,2.6vw,28px);line-height:1.05;text-transform:uppercase;margin:2px 0 3px;',
    'overflow-wrap:anywhere}',
    '.sbdemo-meta{font-size:13px;font-weight:600;color:var(--accent,#FF5A36)}',
    '.sbdemo-meta:empty,.sbdemo-name:empty{display:none}',
    '.sbdemo-cues{margin:6px 0 0;padding:0 0 0 1.1em;font-size:14px;line-height:1.35}',
    '.sbdemo-cues:empty{display:none}',
    '.sbdemo-cues li+li{margin-top:2px}',
    '.sbdemo-tokens{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}',
    '.sbdemo-tokens:empty{display:none}',
    '.sbdemo-tok{font-family:var(--font-display,"Barlow Condensed",system-ui,sans-serif);font-weight:700;font-size:clamp(18px,2.4vw,24px);',
    'line-height:1.2;padding:2px 8px;border-radius:8px;background:var(--line,#262C35);opacity:.6;',
    'transition:opacity .15s,background-color .15s,color .15s;font-variant-numeric:tabular-nums}',
    '.sbdemo-tok small{font-size:10px;font-weight:600;margin-left:3px;letter-spacing:.06em}',
    '.sbdemo-tok[data-kind="defensa"]{color:var(--defense,#5EEAD4)}',
    '.sbdemo-tok[data-kind="desplazamiento"]{color:var(--footwork,#FBBF24)}',
    '.sbdemo-tok[data-kind="finta"],.sbdemo-tok[data-kind="ritmo"]{color:var(--feint,#F472B6)}',
    '.sbdemo-tok.is-on{opacity:1;background:var(--accent,#FF5A36);color:var(--accent-ink,#0B0D10)}',
    '@media (max-width:420px){.sbdemo-cues li:nth-child(n+2){display:none}.sbdemo-name{font-size:18px}}',
    // variante «figure»: solo la figura, grande, con el nombre del paso en curso debajo
    '.sbdemo.sbdemo-figure{flex-direction:column;align-items:stretch;gap:2px;width:100%;height:100%;padding:0;',
    'background:transparent;border:0;border-radius:0}',
    '.sbdemo-figure .sbdemo-stage{flex:1 1 auto;width:100%;min-height:0;aspect-ratio:auto;border-radius:0}',
    '.sbdemo-figure .sbdemo-video{object-fit:contain;background:transparent}',
    '.sbdemo-figure .sbdemo-info{flex:none;text-align:center}',
    '.sbdemo-figure .sbdemo-kicker,.sbdemo-figure .sbdemo-cues,.sbdemo-figure .sbdemo-tokens{display:none}',
    '.sbdemo-figure .sbdemo-name,.sbdemo-figure .sbdemo-meta{font-family:var(--font-display,"Barlow Condensed",system-ui,sans-serif);',
    'font-weight:700;font-size:clamp(14px,2.4vh,24px);line-height:1.15;margin:0;letter-spacing:.04em;text-transform:uppercase;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.sbdemo-figure .sbdemo-name{color:var(--text-2,#8B95A3)}',
    // ejercicios HIIT en el panel normal (diálogos): figura más ancha, que muchos son en el suelo
    '.sbdemo.sbdemo-ex:not(.sbdemo-figure) .sbdemo-stage{width:clamp(160px,62%,400px)}'
  ].join('');

  function injectStyle(doc) {
    if (!doc || doc.getElementById(STYLE_ID)) return;
    var s = doc.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function el(doc, tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /** Datos del movimiento: biblioteca (con ediciones del usuario) o catálogo base. */
  function getMovement(id) {
    try {
      if (SB.library && typeof SB.library.get === 'function') {
        var m = SB.library.get(id);
        if (m) return m;
      }
    } catch (e) { /* biblioteca no disponible */ }
    var list = (SB.data && SB.data.movements) || [];
    for (var i = 0; i < list.length; i++) if (list[i] && list[i].id === id) return list[i];
    return null;
  }

  function animIdOf(id) {
    var m = getMovement(id);
    return (m && m.anim) || id;
  }

  var KIND_BY_CAT = { golpe: 'golpe', defensa: 'defensa', desplazamiento: 'desplazamiento', finta: 'finta', ritmo: 'ritmo' };

  /** Texto del lado según la guardia: diestro → adelantado = izquierda; zurdo → adelantado = derecha. */
  function sideText(m, stance) {
    if (!m || (m.side !== 'lead' && m.side !== 'rear')) return '';
    var leadLeft = stance !== 'zurdo';
    var left = (m.side === 'lead') === leadLeft;
    var hand = left ? 'izquierda' : 'derecha';
    if (m.category === 'golpe') {
      return 'Mano ' + (m.side === 'lead' ? 'adelantada' : 'atrasada') + ' · ' + hand +
        (m.target === 'cuerpo' ? ' · al cuerpo' : (m.target === 'cabeza' ? ' · a la cabeza' : ''));
    }
    return 'Lado ' + (m.side === 'lead' ? 'adelantado' : 'atrasado') + ' · ' + hand;
  }

  function tokensFor(seq, stance) {
    var out = null;
    try {
      if (SB.notation && typeof SB.notation.tokens === 'function') out = SB.notation.tokens(seq, { stance: stance });
    } catch (e) { out = null; }
    if (out && out.length === seq.length) return out;
    // reserva sin SB.notation: número/palabra corta + «CUERPO» o lado (izq/der según la guardia)
    return seq.map(function (id) {
      var m = getMovement(id);
      var sub = '';
      if (m && m.target === 'cuerpo') sub = 'CUERPO';
      else if (m && m.category !== 'golpe' && (m.side === 'lead' || m.side === 'rear')) {
        sub = ((m.side === 'lead') === (stance !== 'zurdo')) ? 'izq' : 'der';
      }
      return {
        id: id,
        label: (m && (m.short || m.code)) || id,
        sub: sub,
        kind: (m && KIND_BY_CAT[m.category]) || 'golpe'
      };
    });
  }

  function mount(container, opts) {
    opts = opts || {};
    var doc = (container && container.ownerDocument) || document;
    injectStyle(doc);

    var stance = opts.stance === 'zurdo' ? 'zurdo' : 'diestro';
    var figureOnly = opts.variant === 'figure';
    var root = el(doc, 'div', figureOnly ? 'sbdemo sbdemo-figure' : 'sbdemo');
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Demostración de la técnica');
    var stage = el(doc, 'div', 'sbdemo-stage');
    var canvas = el(doc, 'canvas', 'sbdemo-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var video = el(doc, 'video', 'sbdemo-video');
    video.muted = true; video.loop = true; video.autoplay = true; video.playsInline = true;
    video.setAttribute('muted', ''); video.setAttribute('loop', ''); video.setAttribute('playsinline', ''); video.setAttribute('autoplay', '');
    video.hidden = true;
    var card = el(doc, 'div', 'sbdemo-card');
    var cardShort = el(doc, 'div', 'sbdemo-card-short');
    var cardNote = el(doc, 'div', 'sbdemo-card-note', 'Sin animación');
    card.appendChild(cardShort); card.appendChild(cardNote);
    card.hidden = true;
    stage.appendChild(canvas); stage.appendChild(video); stage.appendChild(card);

    var info = el(doc, 'div', 'sbdemo-info');
    var kicker = el(doc, 'div', 'sbdemo-kicker');
    var name = el(doc, 'div', 'sbdemo-name');
    var meta = el(doc, 'div', 'sbdemo-meta');
    var cues = el(doc, 'ul', 'sbdemo-cues');
    var tokens = el(doc, 'div', 'sbdemo-tokens');
    info.appendChild(kicker); info.appendChild(name); info.appendChild(meta); info.appendChild(cues); info.appendChild(tokens);
    root.appendChild(stage); root.appendChild(info);
    root.hidden = true;
    container.appendChild(root);

    var figure = SB.visual.Figure ? new SB.visual.Figure(canvas, { stance: stance }) : null;
    var token = 0;
    var current = null; // { type: 'movement'|'combo', id|seq }
    var destroyed = false;

    function setStage(mode) {
      canvas.hidden = mode !== 'anim';
      video.hidden = mode !== 'video';
      card.hidden = mode !== 'card';
      if (mode !== 'video') {
        try { video.pause(); } catch (e) { /* ignore */ }
        video.removeAttribute('src');
        try { video.load(); } catch (e2) { /* ignore */ }
      }
      if (mode !== 'anim' && figure) figure.stop();
    }

    function fillCues(list, max) {
      cues.textContent = '';
      (list || []).slice(0, max).forEach(function (c) {
        if (c) cues.appendChild(el(doc, 'li', null, String(c)));
      });
    }

    function renderTokens(seq) {
      tokens.textContent = '';
      var list = tokensFor(seq, stance);
      list.forEach(function (tk, i) {
        var b = el(doc, 'span', 'sbdemo-tok', tk.label);
        b.setAttribute('data-kind', tk.kind || 'golpe');
        b.setAttribute('data-index', String(i));
        if (tk.sub) b.appendChild(el(doc, 'small', null, tk.sub));
        tokens.appendChild(b);
      });
    }

    function highlight(index) {
      var all = tokens.children;
      for (var i = 0; i < all.length; i++) all[i].classList.toggle('is-on', i === index);
    }

    function showMovement(id) {
      if (destroyed) return;
      var my = ++token;
      current = { type: 'movement', id: id };
      root.hidden = false;
      root.classList.remove('sbdemo-ex');
      var m = getMovement(id);
      var anim = (m && m.anim) || id;
      kicker.textContent = m && m.category ? m.category : 'Técnica';
      name.textContent = (m && m.name) || id;
      meta.textContent = sideText(m, stance);
      tokens.textContent = '';
      var hasAnim = !!(SB.visual.poses && SB.visual.poses.has(anim));
      if (hasAnim && figure) {
        fillCues(m && m.cues, 2);
        setStage('anim');
        figure.playMovement(anim);
      } else {
        // movimiento sin animación (personalizado): tarjeta con nombre, lado e indicaciones
        fillCues(m && m.cues, 3);
        cardShort.textContent = (m && (m.short || m.code)) || id;
        cardNote.textContent = 'Sin animación';
        setStage('card');
      }
      // vídeo propio del usuario: tiene prioridad si existe
      if (SB.mediaStore && typeof SB.mediaStore.getURL === 'function') {
        var p;
        try { p = SB.mediaStore.getURL(id); } catch (e) { p = null; }
        if (p && typeof p.then === 'function') {
          p.then(function (url) {
            if (destroyed || my !== token || !url) return;
            setStage('video');
            video.src = url;
            var pl = video.play();
            if (pl && typeof pl.catch === 'function') pl.catch(function () { /* autoplay bloqueado: queda el primer fotograma */ });
          }, function () { /* sin vídeo */ });
        }
      }
    }

    function showCombo(seq) {
      if (destroyed) return;
      ++token;
      seq = (seq || []).slice();
      current = { type: 'combo', seq: seq };
      root.hidden = false;
      root.classList.remove('sbdemo-ex');
      kicker.textContent = 'Combinación';
      var text = null;
      try {
        if (SB.notation && typeof SB.notation.text === 'function') text = SB.notation.text(seq, { stance: stance });
      } catch (e) { text = null; }
      var names = seq.map(function (id) { var m = getMovement(id); return (m && m.name) || id; });
      // nombre completo solo si es corto; si no, las fichas (con el paso en curso resaltado) bastan.
      // En la variante «figure» no hay fichas: siempre se rotula el paso en curso.
      var stepNames = figureOnly || names.length > 2;
      name.textContent = stepNames ? '' : names.join(' + ');
      meta.textContent = '';
      cues.textContent = '';
      renderTokens(seq);
      var anims = seq.map(animIdOf);
      var ok = false;
      if (figure && SB.visual.poses) {
        setStage('anim');
        ok = figure.playSequence(anims, {
          loop: true,
          onStep: function (index) {
            highlight(index);
            if (stepNames) meta.textContent = index >= 0 ? names[index] : '';
          }
        });
      }
      if (!ok) {
        cardShort.textContent = (text || seq.join(' ')).slice(0, 18);
        cardNote.textContent = 'Sin animación';
        setStage('card');
      }
    }

    /** CONTRATO: extra. Ejercicio HIIT (objeto de data/hiit.js o su id) con su animación en bucle. */
    function showExercise(ex) {
      if (destroyed) return;
      if (typeof ex === 'string') {
        var all = (SB.data && SB.data.hiit) || [], id = ex;
        ex = null;
        for (var i = 0; i < all.length; i++) if (all[i].id === id) ex = all[i];
        if (!ex) ex = { id: id, name: id };
      }
      if (!ex) return;
      if (!ex.category) {
        // los ejercicios de una sesión guardada pueden venir sin categoría: se completa con el catálogo
        var cat = ((SB.data && SB.data.hiit) || []).filter(function (x) { return x.id === ex.id; })[0];
        if (cat) ex = { id: ex.id, name: ex.name || cat.name, note: ex.note != null ? ex.note : cat.note, category: cat.category };
      }
      ++token;
      current = { type: 'exercise', id: ex.id };
      root.hidden = false;
      root.classList.add('sbdemo-ex');
      kicker.textContent = 'HIIT' + (ex.category ? ' · ' + (ex.category === 'cardio' ? 'Cardio' : 'Fuerza') : '');
      // en la variante «figure» el nombre ya se ve en grande en la pantalla de entrenamiento
      name.textContent = figureOnly ? '' : (ex.name || ex.id);
      meta.textContent = figureOnly ? '' : (ex.note || '');
      cues.textContent = '';
      tokens.textContent = '';
      var ok = false;
      if (figure && figure.playExercise) {
        setStage('anim');
        ok = figure.playExercise(ex.id);
      }
      if (!ok) {
        cardShort.textContent = String(ex.name || ex.id).slice(0, 18);
        cardNote.textContent = 'Sin animación';
        setStage('card');
      }
    }

    function hide() {
      ++token;
      root.hidden = true;
      if (figure) figure.stop();
      try { video.pause(); } catch (e) { /* ignore */ }
    }

    function setStance(s) {
      stance = s === 'zurdo' ? 'zurdo' : 'diestro';
      if (figure) figure.setStance(stance);
      if (current && !root.hidden) {
        if (current.type === 'movement') meta.textContent = sideText(getMovement(current.id), stance);
        else if (current.type === 'combo') renderTokens(current.seq);
      }
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      ++token;
      if (figure) { figure.destroy(); figure = null; }
      try { video.pause(); } catch (e) { /* ignore */ }
      video.removeAttribute('src');
      if (root.parentNode) root.parentNode.removeChild(root);
    }

    return {
      el: root,
      showMovement: showMovement,
      showCombo: showCombo,
      showExercise: showExercise,
      hide: hide,
      destroy: destroy,
      setStance: setStance
    };
  }

  SB.visual.demo = { mount: mount };
})(window.SB = window.SB || {});
