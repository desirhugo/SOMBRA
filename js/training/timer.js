/**
 * SOMBRA · js/training/timer.js
 * ---------------------------------------------------------------------------
 * Reloj sin deriva: no cuenta "ticks", calcula el tiempo transcurrido a partir
 * de marcas de tiempo (`now()`), así que no se desajusta aunque el navegador
 * retrase los fotogramas o la pestaña quede en segundo plano.
 *
 *   const t = new SB.Timer({ now: () => performance.now(), speed: 1 });
 *   t.start(); t.pause(); t.resume(); t.elapsed();  // segundos de sesión
 *
 * `speed` acelera el reloj (pruebas / parámetro ?speed=N). `now` es inyectable
 * (milisegundos) para pruebas deterministas.
 */
(function (SB) {
  'use strict';

  function defaultNow() {
    if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    return Date.now();
  }

  class Timer {
    /**
     * @param {{now?: () => number, speed?: number}} [opts]  now en milisegundos
     */
    constructor(opts) {
      const o = opts || {};
      this._now = typeof o.now === 'function' ? o.now : defaultNow;
      this.speed = Number(o.speed) > 0 ? Number(o.speed) : 1;
      this._acc = 0;          // segundos de sesión acumulados hasta la última marca
      this._mark = 0;         // marca de tiempo (ms) desde la que corre
      this._running = false;
      this._started = false;
    }

    /** ¿Está corriendo? */
    get running() { return this._running; }
    /** ¿Se ha iniciado alguna vez? */
    get started() { return this._started; }

    /** Inicia desde cero. */
    start() {
      this._acc = 0;
      this._mark = this._now();
      this._running = true;
      this._started = true;
    }

    /** Pausa (el tiempo deja de avanzar). */
    pause() {
      if (!this._running) return;
      this._acc = this.elapsed();
      this._running = false;
    }

    /** Reanuda tras una pausa. */
    resume() {
      if (this._running || !this._started) return;
      this._mark = this._now();
      this._running = true;
    }

    /** Segundos de sesión transcurridos (ya multiplicados por `speed`). */
    elapsed() {
      if (!this._running) return this._acc;
      return this._acc + Math.max(0, this._now() - this._mark) / 1000 * this.speed;
    }

    // CONTRATO: añadido. Salta a un instante (segundos de sesión) sin cambiar el estado de pausa.
    seek(sec) {
      this._acc = Math.max(0, Number(sec) || 0);
      this._mark = this._now();
      if (!this._started) this._started = true;
    }

    // CONTRATO: añadido. Cambia la velocidad sin saltos.
    setSpeed(speed) {
      const s = Number(speed) > 0 ? Number(speed) : 1;
      this._acc = this.elapsed();
      this._mark = this._now();
      this.speed = s;
    }

    // CONTRATO: añadido. Vuelve al estado inicial.
    reset() {
      this._acc = 0;
      this._running = false;
      this._started = false;
    }
  }

  SB.Timer = Timer;
})(window.SB = window.SB || {});
