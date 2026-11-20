/**
 * SOMBRA · js/training/player.js
 * ---------------------------------------------------------------------------
 * Reproduce `session.timeline` sin tocar el DOM. La UI llama a update() en cada
 * fotograma (o tick) y reacciona a los eventos:
 *
 *   'segment'   fn(segment, state)   al entrar en un segmento (también tras skip/back)
 *   'combo'     fn(combo, state)     al cambiar la combinación dentro de un intervalo de boxeo
 *   'countdown' fn(n, state)         3, 2, 1 en los últimos 3 s de la preparación y de los
 *                                    descansos / transiciones que preceden a una ronda de boxeo
 *   'finish'    fn(state)            al llegar al final
 *   'pause'     fn(state) · 'resume' fn(state)
 *
 * activeSec = segundos de boxeo + HIIT realmente transcurridos (no cuenta lo saltado
 * con skip ni el tiempo en pausa; sí cuenta lo repetido tras back()).
 *
 * skip(): salta al inicio del siguiente segmento (desde el último: termina).
 * back(): si llevas más de 2 s en el segmento, vuelve a su inicio; si no, al anterior.
 */
(function (SB) {
  'use strict';

  const COUNTDOWN_FROM = 3;
  const BACK_THRESHOLD = 2;
  const ACTIVE_TYPES = { boxing: true, hiit: true };
  const PRE_ROUND_TYPES = { prepare: true, rest: true, transition: true };

  class Player {
    /**
     * @param {object} session  sesión de SB.session.generate (o con la misma forma)
     * @param {{now?: () => number, speed?: number}} [opts]
     */
    constructor(session, opts) {
      const o = opts || {};
      this.session = session;
      this.timeline = (session && session.timeline) || [];
      const last = this.timeline[this.timeline.length - 1];
      this.total = last ? last.start + last.duration : 0;
      this.timer = new SB.Timer({ now: o.now, speed: o.speed || 1 });
      this._listeners = Object.create(null);
      this._segIndex = -1;
      this._comboIndex = -1;
      this._countdown = null;
      this._started = false;
      this._finished = false;
      this._stopped = false;
      this._active = 0;
      this._lastT = 0;
    }

    /** Suscribe a un evento. Devuelve una función para anular la suscripción. */
    on(event, fn) {
      if (typeof fn !== 'function') return function () {};
      (this._listeners[event] = this._listeners[event] || []).push(fn);
      const self = this;
      return function () { self.off(event, fn); };
    }

    // CONTRATO: añadido. Anula una suscripción.
    off(event, fn) {
      const l = this._listeners[event];
      if (!l) return;
      const i = l.indexOf(fn);
      if (i !== -1) l.splice(i, 1);
    }

    _emit(event) {
      const args = Array.prototype.slice.call(arguments, 1);
      (this._listeners[event] || []).slice().forEach(function (fn) {
        try { fn.apply(null, args); } catch (e) { if (typeof console !== 'undefined') console.error('[SB.Player] Error en el evento ' + event, e); }
      });
    }

    /** Empieza desde el principio. */
    start() {
      this._started = true;
      this._finished = false;
      this._stopped = false;
      this._active = 0;
      this._lastT = 0;
      this._segIndex = -1;
      this._comboIndex = -1;
      this._countdown = null;
      this.timer.start();
      return this.update();
    }

    /** Pausa. */
    pause() {
      if (!this._started || this._finished || this._stopped || !this.timer.running) return;
      this._sync();
      this.timer.pause();
      this._emit('pause', this.getState());
    }

    /** Reanuda. */
    resume() {
      if (!this._started || this._finished || this._stopped || this.timer.running) return;
      this.timer.resume();
      this._emit('resume', this.getState());
      this.update();
    }

    /** Pausa o reanuda. */
    toggle() { if (this.timer.running) this.pause(); else this.resume(); }

    /** Salta al siguiente segmento (desde el último, termina la sesión). */
    skip() {
      if (!this._started || this._finished || this._stopped) return;
      const t = this._sync();
      const i = this._indexAt(t);
      this._seek(i >= this.timeline.length - 1 ? this.total : this.timeline[i + 1].start);
      return this.update();
    }

    /** Vuelve al inicio del segmento actual o al anterior. */
    back() {
      if (!this._started || this._stopped) return;
      const t = this._sync();
      if (this._finished) { this._finished = false; }
      const i = this._indexAt(t);
      const seg = this.timeline[i];
      if (!seg) return;
      const into = t - seg.start;
      const target = (into > BACK_THRESHOLD || i === 0) ? seg.start : this.timeline[i - 1].start;
      this._seek(target);
      return this.update();
    }

    /** Detiene la reproducción (salir). No emite 'finish'. */
    stop() {
      if (!this._started) return;
      this._sync();
      this.timer.pause();
      this._stopped = true;
    }

    _seek(t) {
      this.timer.seek(Math.max(0, Math.min(t, this.total)));
      this._lastT = this.timer.elapsed();
      this._segIndex = -1;     // fuerza el evento 'segment' al llegar
      this._comboIndex = -1;
      this._countdown = null;
    }

    /** Avanza el reloj interno y acumula el tiempo activo. Devuelve t (s). */
    _sync() {
      if (!this._started) return 0;
      const t = Math.min(this.timer.elapsed(), this.total);
      if (t > this._lastT) this._active += this._activeBetween(this._lastT, t);
      this._lastT = t;
      return t;
    }

    _activeBetween(a, b) {
      let s = 0;
      for (let i = 0; i < this.timeline.length; i++) {
        const seg = this.timeline[i];
        if (!ACTIVE_TYPES[seg.type]) continue;
        const lo = Math.max(a, seg.start);
        const hi = Math.min(b, seg.start + seg.duration);
        if (hi > lo) s += hi - lo;
      }
      return s;
    }

    _indexAt(t) {
      const tl = this.timeline;
      if (!tl.length) return -1;
      if (t >= this.total) return tl.length - 1;
      let lo = 0, hi = tl.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (tl[mid].start <= t) lo = mid; else hi = mid - 1;
      }
      return lo;
    }

    _comboIndexAt(seg, local) {
      const cs = (seg && seg.combos) || [];
      if (!cs.length) return -1;
      let idx = 0;
      for (let i = 0; i < cs.length; i++) if (cs[i].start <= local + 1e-9) idx = i;
      return idx;
    }

    _countdownAt(i, t) {
      const seg = this.timeline[i];
      const next = this.timeline[i + 1];
      if (!seg || !next || !PRE_ROUND_TYPES[seg.type] || next.type !== 'boxing') return null;
      const rem = seg.start + seg.duration - t;
      if (rem > COUNTDOWN_FROM || rem <= 0) return null;
      return Math.ceil(rem - 1e-9);
    }

    /** Siguiente combinación (en el mismo intervalo o en el próximo segmento de boxeo). */
    _nextCombo(i, ci) {
      const seg = this.timeline[i];
      if (seg && seg.type === 'boxing' && seg.combos && ci >= 0 && ci + 1 < seg.combos.length) return seg.combos[ci + 1];
      for (let k = i + 1; k < this.timeline.length; k++) {
        const s = this.timeline[k];
        if (s.type === 'boxing' && s.combos && s.combos.length) return s.combos[0];
      }
      return null;
    }

    /**
     * Avanza y emite los eventos pendientes. Llamar en cada fotograma.
     * @returns {object} getState()
     */
    update() {
      if (!this._started || this._stopped || !this.timeline.length) return this.getState();
      const t = this._sync();
      if (t >= this.total) {
        if (!this._finished) {
          this._finished = true;
          this._countdown = null;
          this.timer.pause();
          this._emit('finish', this.getState());
        }
        return this.getState();
      }
      const i = this._indexAt(t);
      const seg = this.timeline[i];
      if (i !== this._segIndex) {
        this._segIndex = i;
        this._comboIndex = -1;
        this._countdown = null;
        this._emit('segment', seg, this.getState());
      }
      if (seg.type === 'boxing') {
        const ci = this._comboIndexAt(seg, t - seg.start);
        if (ci !== this._comboIndex && ci >= 0) {
          this._comboIndex = ci;
          this._emit('combo', seg.combos[ci], this.getState());
        }
      }
      const cd = this._countdownAt(i, t);
      if (cd !== this._countdown) {
        this._countdown = cd;
        if (cd !== null) this._emit('countdown', cd, this.getState());
      }
      return this.getState();
    }

    /** Estado actual (§7). */
    getState() {
      const tl = this.timeline;
      const t = this._started ? this._sync() : 0;
      const i = tl.length ? Math.max(0, this._indexAt(t)) : -1;
      const seg = i >= 0 ? tl[i] : null;
      let combo = null, comboIndex = -1, comboRemaining = 0;
      if (seg && seg.type === 'boxing') {
        comboIndex = this._comboIndexAt(seg, t - seg.start);
        combo = comboIndex >= 0 ? seg.combos[comboIndex] : null;
        if (combo) comboRemaining = Math.max(0, seg.start + combo.start + combo.duration - t);
      }
      return {
        segIndex: i,
        segment: seg,
        segRemaining: seg ? Math.max(0, seg.start + seg.duration - t) : 0,
        segElapsed: seg ? Math.max(0, t - seg.start) : 0,
        totalElapsed: t,
        totalRemaining: Math.max(0, this.total - t),
        combo: combo,
        comboIndex: comboIndex,
        comboRemaining: comboRemaining,
        nextCombo: i >= 0 ? this._nextCombo(i, comboIndex) : null,
        countdown: i >= 0 ? this._countdownAt(i, t) : null,
        paused: this._started && !this.timer.running && !this._finished && !this._stopped,
        finished: this._finished,
        activeSec: this._active,
        // CONTRATO: añadidos.
        started: this._started,
        stopped: this._stopped,
        totalSec: this.total,
        nextSegment: i >= 0 ? tl[i + 1] || null : null,
        segmentsTotal: tl.length
      };
    }
  }

  SB.Player = Player;
})(window.SB = window.SB || {});
