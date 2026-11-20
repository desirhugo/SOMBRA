/* SOMBRA · js/audio/sounds.js — sonidos sintetizados con Web Audio (sin archivos).
   Tonos senoidales con envolvente suave; nada estridente. Sin voz. */
(function (SB) {
  'use strict';

  var ctx = null;
  var master = null;
  var enabled = true;
  var volume = 0.7;

  function ensure() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      // Compresor suave para que los acordes no saturen y el volumen sea uniforme
      var comp = ctx.createDynamicsCompressor ? ctx.createDynamicsCompressor() : null;
      master = ctx.createGain();
      master.gain.value = gainFor(volume);
      if (comp) { master.connect(comp); comp.connect(ctx.destination); }
      else master.connect(ctx.destination);
    } catch (e) { ctx = null; master = null; }
    return ctx;
  }

  function gainFor(v) { v = Math.max(0, Math.min(1, Number(v) || 0)); return v * v * 0.9 + (v > 0 ? 0.02 : 0); }

  function resume() {
    if (ctx && ctx.state === 'suspended' && ctx.resume) { try { ctx.resume(); } catch (e) { /* noop */ } }
  }

  /** Nota con ataque corto y caída exponencial. */
  function note(freq, at, dur, o) {
    o = o || {};
    var t0 = ctx.currentTime + 0.01 + (at || 0);
    var peak = o.gain == null ? 0.4 : o.gain;
    var attack = o.attack || 0.015;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.glide) osc.frequency.exponentialRampToValueAtTime(o.glide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    // Armónico suave (octava, muy bajo) para dar cuerpo sin aspereza
    if (o.harmonic) {
      var o2 = ctx.createOscillator(), g2 = ctx.createGain();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(freq * 2, t0);
      g2.gain.setValueAtTime(0.0001, t0);
      g2.gain.exponentialRampToValueAtTime(peak * o.harmonic, t0 + attack);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 0.7);
      o2.connect(g2); g2.connect(master);
      o2.start(t0); o2.stop(t0 + dur + 0.05);
    }
  }

  function play(fn) {
    if (!enabled || volume <= 0) return;
    if (!ensure()) return;
    resume();
    try { fn(); } catch (e) { /* audio no disponible: se ignora */ }
  }

  SB.sounds = {
    /** Llamar en el primer gesto del usuario (requisito de los navegadores). */
    unlock: function () {
      var c = ensure();
      if (!c) return;
      resume();
      try {
        var b = c.createBuffer(1, 1, 22050);
        var s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) { /* noop */ }
    },

    /** Inicio de ronda / intervalo: dos notas ascendentes (660 → 880 Hz). */
    startBeep: function () {
      play(function () {
        note(659.25, 0, 0.18, { gain: 0.42, harmonic: 0.08 });
        note(880, 0.19, 0.34, { gain: 0.42, harmonic: 0.08 });
      });
    },

    /** Fin de un periodo de trabajo (paso a transición o descanso): dos notas descendentes. */
    endBeep: function () {
      play(function () {
        note(783.99, 0, 0.18, { gain: 0.34 });
        note(587.33, 0.19, 0.4, { gain: 0.34 });
      });
    },

    /** Paso a HIIT: tríada corta y redonda, timbre distinto (triangular suave). */
    hiitBeep: function () {
      play(function () {
        note(523.25, 0, 0.16, { type: 'triangle', gain: 0.3 });
        note(659.25, 0.13, 0.16, { type: 'triangle', gain: 0.3 });
        note(783.99, 0.26, 0.36, { type: 'triangle', gain: 0.32 });
      });
    },

    /** Tic muy suave para la cuenta atrás 3-2-1. */
    tick: function () {
      play(function () { note(1046.5, 0, 0.08, { gain: 0.12, attack: 0.004 }); });
    },

    /** Final de sesión: arpegio ascendente con nota final larga. */
    finish: function () {
      play(function () {
        note(523.25, 0, 0.22, { gain: 0.32, harmonic: 0.06 });
        note(659.25, 0.16, 0.22, { gain: 0.32, harmonic: 0.06 });
        note(783.99, 0.32, 0.24, { gain: 0.32, harmonic: 0.06 });
        note(1046.5, 0.5, 1.1, { gain: 0.3, harmonic: 0.05 });
      });
    },

    setVolume: function (v) {
      volume = Math.max(0, Math.min(1, Number(v)));
      if (isNaN(volume)) volume = 0.7;
      if (master && ctx) {
        try { master.gain.setTargetAtTime(gainFor(volume), ctx.currentTime, 0.02); }
        catch (e) { master.gain.value = gainFor(volume); }
      }
    },

    setEnabled: function (b) { enabled = !!b; }
  };
})(window.SB = window.SB || {});
