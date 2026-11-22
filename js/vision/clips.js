/**
 * SOMBRA · js/vision/clips.js
 * ---------------------------------------------------------------------------
 * Clips de los fallos (21-nov-2026, a petición del usuario): unos segundos de vídeo de cada
 * error detectado para verlos a cámara lenta en el resumen final, con el esqueleto encima, la
 * zona del fallo marcada y una frase que dice qué pasa en cada momento.
 *
 * Privacidad: todo vive en la memoria de esta pantalla. No se sube nada, no se guarda en el
 * dispositivo y se borra al salir del resumen (Recorder.dispose y player.dispose).
 *
 *  - Recorder.capture(video, frame): durante las rondas de boxeo guarda los últimos
 *    BUFFER_SEC segundos en pequeño (ImageBitmap de W px de ancho) con los puntos del cuerpo.
 *  - Recorder.mark(id, info): el entrenador ha visto un error (info = {t0, t1, at, peak, end,
 *    side}); cuando pasa t1, esos fotogramas se copian a JPEG. Un clip por error, MAX_CLIPS.
 *  - player(clip): reproductor con 0,25× / 0,5× / 1×, en espejo como la cámara.
 */
(function (SB) {
  'use strict';

  const W = 320;            // ancho del clip (px)
  const BUFFER_SEC = 3.6;   // segundos que se guardan hacia atrás
  const MAX_CLIPS = 10;
  const MAX_FPS = 30;
  const JPEG_Q = 0.72;
  const MIN_FRAMES = 10;

  const ARM = { l: [11, 13, 15], r: [12, 14, 16] };
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [7, 0], [0, 8]];

  /**
   * Qué se marca en cada error. focus: 'arm' (el brazo que golpea y el recorrido de la muñeca),
   * 'guard' (las dos muñecas y la línea de la cara), 'head', 'hips', 'body', 'elbows', 'feet'.
   * phases(info): frases por tramos de tiempo; text: una frase para todo el clip.
   */
  const INFO = {
    windup: { focus: 'arm', phases: function (i) { return [{ a: i.at - 0.4, b: i.at, text: 'Aquí cargas: la mano va hacia atrás antes de salir' }, { a: i.at, b: i.end, text: 'Y entonces sale el golpe: se ve venir' }]; } },
    other_hand: { focus: 'guard', phases: function (i) { return [{ a: i.at, b: i.end, text: 'Mientras golpeas, la otra mano se separa de la cara' }]; } },
    low_return: { focus: 'arm', phases: function (i) { return [{ a: i.at, b: i.peak, text: 'El golpe sale…' }, { a: i.peak, b: i.end, text: '…y la mano vuelve por abajo' }]; } },
    slow_return: { focus: 'arm', phases: function (i) { return [{ a: i.at, b: i.peak, text: 'La ida, rápida…' }, { a: i.peak, b: i.end, text: '…y la vuelta, mucho más lenta' }]; } },
    arm_only: { focus: 'hips', phases: function (i) { return [{ a: i.at, b: i.end, text: 'Golpe de la mano atrasada sin girar cadera ni hombros' }]; } },
    short: { focus: 'arm', phases: function (i) { return [{ a: i.at, b: i.peak + 0.15, text: 'El brazo no llega a estirarse' }]; } },
    lean: { focus: 'body', phases: function (i) { return [{ a: i.at, b: i.end, text: 'Al golpear, el tronco se va hacia delante' }]; } },
    rear_low: { focus: 'guard', text: 'La mano de atrás está por debajo de la cara' },
    lead_low: { focus: 'guard', text: 'La mano de delante está por debajo de la cara' },
    chin_up: { focus: 'head', text: 'La barbilla está levantada' },
    floor: { focus: 'head', text: 'Miras al suelo, no al frente' },
    flare: { focus: 'elbows', text: 'Los codos se separan del cuerpo' },
    narrow: { focus: 'feet', text: 'Los pies están muy juntos' },
    wide: { focus: 'feet', text: 'Los pies están muy separados' }
  };

  function supported() {
    return typeof createImageBitmap === 'function' && typeof document !== 'undefined';
  }

  function copyLm(lm) {
    if (!lm) return null;
    const out = new Array(lm.length);
    for (let i = 0; i < lm.length; i++) { const p = lm[i]; out[i] = p ? { x: p.x, y: p.y, v: p.visibility == null ? 1 : p.visibility } : null; }
    return out;
  }

  function toBlob(canvas) {
    return new Promise(function (resolve) {
      try { canvas.toBlob(function (b) { resolve(b); }, 'image/jpeg', JPEG_Q); } catch (e) { resolve(null); }
    });
  }

  // ------------------------------------------------------------------ grabador
  function Recorder() {
    this.ring = [];       // {t, lm, bmp, users, gone}
    this.pending = [];    // {id, info}
    this.clips = {};      // id → {id, info, w, h, frames: [{t, lm, blob}], ready}
    this.count = 0;
    this.disposed = false;
    this.w = 0; this.h = 0;
    this.lastT = -1;
    this.canvas = null;
    this.queue = Promise.resolve();
  }

  function release(e) {
    e.gone = true;
    if (!e.users && e.bmp) { try { e.bmp.close(); } catch (err) { /* noop */ } e.bmp = null; }
  }

  /** Guarda el fotograma actual de la cámara (llamar en cada fotograma analizado de boxeo). */
  Recorder.prototype.capture = function (video, f) {
    if (this.disposed || !supported() || !video || !video.videoWidth || !f) return;
    if (f.t - this.lastT < 1 / MAX_FPS - 0.004) return;
    this.lastT = f.t;
    if (!this.w) { this.w = W; this.h = Math.round(W * video.videoHeight / video.videoWidth) || 240; }
    const e = { t: f.t, lm: copyLm(f.lm), bmp: null, users: 0, gone: false };
    this.ring.push(e);
    const self = this;
    try {
      createImageBitmap(video, { resizeWidth: this.w, resizeHeight: this.h, resizeQuality: 'low' }).then(function (b) {
        if (self.disposed || e.gone) { try { b.close(); } catch (err) { /* noop */ } return; }
        e.bmp = b;
      }).catch(function () { /* fotograma perdido */ });
    } catch (err) { /* sin captura */ }
    while (this.ring.length && this.ring[0].t < f.t - BUFFER_SEC) release(this.ring.shift());
    this._flush(f.t);
  };

  /** El entrenador ha visto un error: se guarda su clip (uno por error). */
  Recorder.prototype.mark = function (id, info) {
    if (this.disposed || !INFO[id] || this.clips[id] || this.count >= MAX_CLIPS || !info) return false;
    if (this.pending.some(function (p) { return p.id === id; })) return false;
    this.pending.push({ id: id, info: info });
    return true;
  };

  Recorder.prototype._flush = function (now) {
    const self = this;
    this.pending = this.pending.filter(function (p) {
      if (now < p.info.t1 + 0.2) return true;
      const frames = self.ring.filter(function (e) { return e.t >= p.info.t0 && e.t <= p.info.t1 && e.bmp; });
      if (frames.length < MIN_FRAMES || self.count >= MAX_CLIPS) return false;
      const clip = { id: p.id, info: p.info, w: self.w, h: self.h, frames: [], ready: false };
      self.clips[p.id] = clip;
      self.count++;
      frames.forEach(function (e) { e.users++; });
      self.queue = self.queue.then(function () { return self._encode(clip, frames); });
      return false;
    });
  };

  Recorder.prototype._encode = function (clip, frames) {
    const self = this;
    if (!this.canvas) { this.canvas = document.createElement('canvas'); this.canvas.width = this.w; this.canvas.height = this.h; }
    const cv = this.canvas, ctx = cv.getContext('2d');
    let chain = Promise.resolve();
    frames.forEach(function (e) {
      chain = chain.then(function () {
        if (self.disposed || !e.bmp) return null;
        ctx.drawImage(e.bmp, 0, 0, cv.width, cv.height);
        return toBlob(cv).then(function (b) { if (b && !self.disposed) clip.frames.push({ t: e.t, lm: e.lm, blob: b }); });
      }).then(function () {
        e.users--;
        if (e.gone) release(e);
      });
    });
    return chain.then(function () { clip.ready = !self.disposed && clip.frames.length >= MIN_FRAMES; });
  };

  /** Espera a que acaben de copiarse los clips pendientes (al terminar la sesión). */
  Recorder.prototype.finish = function () {
    this._flush(Infinity);
    return this.queue;
  };

  /** Clip listo de un error (o null). */
  Recorder.prototype.get = function (id) { const c = this.clips[id]; return c && c.ready ? c : null; };
  Recorder.prototype.ids = function () { const self = this; return Object.keys(this.clips).filter(function (k) { return self.clips[k].ready; }); };

  /** Borra todo: fotogramas en memoria y clips. */
  Recorder.prototype.dispose = function () {
    this.disposed = true;
    this.ring.forEach(function (e) { e.users = 0; release(e); });
    this.ring = [];
    this.pending = [];
    this.clips = {};
    this.count = 0;
    this.canvas = null;
  };

  // --------------------------------------------------------------- reproductor
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function visible(p) { return p && p.v >= 0.4; }

  /** Frase del momento t del clip. */
  function labelAt(clip, t) {
    const meta = INFO[clip.id] || {};
    if (meta.phases) {
      const ph = meta.phases(clip.info);
      for (let i = 0; i < ph.length; i++) if (t >= ph[i].a && t <= ph[i].b) return ph[i].text;
      return '';
    }
    return meta.text || '';
  }

  /** Dibuja un fotograma con el esqueleto y la zona del fallo. */
  function drawFrame(ctx, clip, k, bmp) {
    const Wc = ctx.canvas.width, Hc = ctx.canvas.height;
    const fr = clip.frames[k];
    ctx.clearRect(0, 0, Wc, Hc);
    if (bmp) ctx.drawImage(bmp, 0, 0, Wc, Hc);
    const lm = fr.lm;
    if (!lm) return;
    const P = function (i) { return [lm[i].x * Wc, lm[i].y * Hc]; };
    const lw = Math.max(2, Wc / 170);
    ctx.lineCap = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    BONES.forEach(function (b) {
      if (!visible(lm[b[0]]) || !visible(lm[b[1]])) return;
      const a = P(b[0]), c = P(b[1]);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    });
    const RED = '#FF3B30';
    const meta = INFO[clip.id] || {};
    const side = clip.info.side === 'r' ? 'r' : 'l';
    const dot = function (i, r) { if (!visible(lm[i])) return; const p = P(i); ctx.beginPath(); ctx.arc(p[0], p[1], r || lw * 2.6, 0, Math.PI * 2); ctx.fill(); };
    const seg = function (a, b) { if (!visible(lm[a]) || !visible(lm[b])) return; const p = P(a), q = P(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
    ctx.fillStyle = RED; ctx.strokeStyle = RED; ctx.lineWidth = lw * 1.8;
    if (meta.focus === 'arm') {
      const A = ARM[side];
      seg(A[0], A[1]); seg(A[1], A[2]); dot(A[2]);
      // Recorrido de la muñeca en los últimos ~0,5 s
      ctx.lineWidth = lw * 1.2; ctx.setLineDash([lw * 2, lw * 2]);
      ctx.beginPath();
      let started = false;
      for (let j = Math.max(0, k - 15); j <= k; j++) {
        const q = clip.frames[j].lm && clip.frames[j].lm[A[2]];
        if (!visible(q)) continue;
        if (!started) { ctx.moveTo(q.x * Wc, q.y * Hc); started = true; } else ctx.lineTo(q.x * Wc, q.y * Hc);
      }
      ctx.stroke(); ctx.setLineDash([]);
    } else if (meta.focus === 'guard') {
      // Línea a la altura de la cara: las manos deberían estar ahí
      if (visible(lm[0])) {
        const y = P(0)[1];
        ctx.lineWidth = lw; ctx.setLineDash([lw * 3, lw * 2]); ctx.strokeStyle = 'rgba(52,199,89,0.95)';
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(Wc, y); ctx.stroke(); ctx.setLineDash([]);
      }
      dot(15); dot(16);
    } else if (meta.focus === 'head') {
      dot(0, lw * 3.2); seg(7, 0); seg(0, 8);
    } else if (meta.focus === 'hips') {
      seg(11, 12); seg(23, 24); dot(23); dot(24);
    } else if (meta.focus === 'body') {
      seg(11, 23); seg(12, 24); dot(0);
    } else if (meta.focus === 'elbows') {
      dot(13); dot(14); seg(11, 13); seg(12, 14);
    } else if (meta.focus === 'feet') {
      dot(27); dot(28); seg(27, 28);
    }
  }

  /**
   * Reproductor de un clip. Devuelve {el, dispose}.
   * @param {object} clip  Recorder.get(id)
   */
  function player(clip) {
    const root = el('div', 'clip');
    const stage = el('div', 'clip-stage');
    const canvas = el('canvas', 'clip-canvas');
    canvas.width = clip.w; canvas.height = clip.h;
    canvas.setAttribute('aria-hidden', 'true');
    const label = el('div', 'clip-label');
    label.setAttribute('aria-live', 'polite');
    stage.appendChild(canvas); stage.appendChild(label);
    const bar = el('div', 'clip-bar');
    const play = el('button', 'clip-play', 'Ver a cámara lenta');
    play.type = 'button';
    const speeds = el('div', 'clip-speeds');
    speeds.setAttribute('role', 'group');
    speeds.setAttribute('aria-label', 'Velocidad');
    let speed = 0.25;
    [0.25, 0.5, 1].forEach(function (s) {
      const b = el('button', 'clip-speed' + (s === speed ? ' is-on' : ''), String(s).replace('.', ',') + '×');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(s === speed));
      b.onclick = function () {
        speed = s;
        Array.prototype.forEach.call(speeds.children, function (x) { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      };
      speeds.appendChild(b);
    });
    bar.appendChild(play); bar.appendChild(speeds);
    root.appendChild(stage); root.appendChild(bar);

    const ctx = canvas.getContext('2d');
    const t0 = clip.frames[0].t, tN = clip.frames[clip.frames.length - 1].t;
    let bmps = null, loading = null, raf = 0, playing = false, ct = t0, last = 0, hold = 0, dead = false;

    function decode() {
      if (loading) return loading;
      loading = Promise.all(clip.frames.map(function (f) { return createImageBitmap(f.blob).catch(function () { return null; }); }))
        .then(function (list) { if (dead) { list.forEach(function (b) { if (b) b.close(); }); return; } bmps = list; });
      return loading;
    }
    function frameAt(t) {
      let k = 0;
      while (k + 1 < clip.frames.length && clip.frames[k + 1].t <= t) k++;
      return k;
    }
    function show(t) {
      const k = frameAt(t);
      drawFrame(ctx, clip, k, bmps && bmps[k]);
      label.textContent = labelAt(clip, t);
      label.hidden = !label.textContent;
    }
    function loop(ts) {
      if (!playing || dead) return;
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0;
      last = ts;
      if (hold > 0) { hold -= dt; if (hold <= 0) ct = t0; }
      else {
        ct += dt * speed;
        if (ct >= tN) { ct = tN; hold = 1; } // pausa de 1 s al final y vuelve a empezar
      }
      show(ct);
      raf = requestAnimationFrame(loop);
    }
    function start() {
      decode().then(function () {
        if (dead) return;
        playing = true; last = 0;
        play.textContent = 'Pausa';
        raf = requestAnimationFrame(loop);
      });
    }
    function stop() {
      playing = false;
      cancelAnimationFrame(raf);
      play.textContent = 'Ver a cámara lenta';
    }
    play.onclick = function () { if (playing) stop(); else start(); };
    // Primer fotograma como portada
    decode().then(function () { if (!dead && !playing) show(t0); });

    return {
      el: root,
      dispose: function () {
        dead = true; playing = false;
        cancelAnimationFrame(raf);
        if (bmps) bmps.forEach(function (b) { if (b) try { b.close(); } catch (e) { /* noop */ } });
        bmps = null;
      }
    };
  }

  SB.vision = SB.vision || {};
  SB.vision.clips = { Recorder: Recorder, player: player, supported: supported, INFO: INFO, labelAt: labelAt };
})(window.SB = window.SB || {});
