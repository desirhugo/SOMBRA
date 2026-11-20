/**
 * SOMBRA · js/audio/voice.js
 * ---------------------------------------------------------------------------
 * Indicaciones por voz del análisis por cámara (Web Speech API, speechSynthesis).
 * Solo usa voces en español instaladas en el dispositivo (localService): las voces
 * «en línea» enviarían el texto a un servidor, así que se descartan. Sin voz local
 * en español, available() es false y las indicaciones solo se ven en pantalla.
 * Nunca nombra combinaciones: solo frases cortas de corrección.
 */
(function (SB) {
  'use strict';

  let voice = null;
  let volume = 0.8;

  function synth() { return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null; }

  function pick() {
    const s = synth();
    if (!s) return null;
    const list = (s.getVoices() || []).filter(function (v) { return /^es(-|_|$)/i.test(v.lang || '') && v.localService; });
    if (!list.length) return null;
    return list.find(function (v) { return /^es-ES/i.test(v.lang); }) || list[0];
  }

  function init() {
    const s = synth();
    if (!s) return;
    voice = pick();
    if (!voice && 'onvoiceschanged' in s) {
      s.addEventListener('voiceschanged', function () { if (!voice) voice = pick(); });
    }
  }

  SB.voice = {
    /** ¿Hay una voz local en español? */
    available: function () { if (!voice) voice = pick(); return !!voice; },
    setVolume: function (v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); },
    /** Dice una frase; corta la anterior si aún se oía (lo último es lo que importa). */
    say: function (text) {
      const s = synth();
      if (!s || !text || !SB.voice.available()) return false;
      try {
        if (s.speaking || s.pending) s.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.voice = voice; u.lang = voice.lang; u.rate = 1.1; u.pitch = 1; u.volume = volume;
        s.speak(u);
        return true;
      } catch (e) { return false; }
    },
    cancel: function () { const s = synth(); if (s) try { s.cancel(); } catch (e) { /* noop */ } }
  };
  init();
})(window.SB = window.SB || {});
