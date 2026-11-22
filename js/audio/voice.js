/**
 * SOMBRA · js/audio/voice.js
 * ---------------------------------------------------------------------------
 * Indicaciones por voz del análisis por cámara (Web Speech API, speechSynthesis).
 * Solo usa voces en español instaladas en el dispositivo (localService): las voces
 * «en línea» enviarían el texto a un servidor, así que se descartan. Sin voz local
 * en español, available() es false y las indicaciones solo se ven en pantalla.
 * Nunca nombra combinaciones: solo frases cortas de corrección o de ánimo.
 *
 * Voz (21-nov-2026, a petición del usuario: «más masculina o más suave»): por defecto, una
 * voz masculina si la hay (Pablo en Windows, Jorge o Diego en Apple…), un poco más lenta y
 * grave. En Ajustes se puede elegir cualquier voz local en español (setVoice) y probarla.
 */
(function (SB) {
  'use strict';

  let voice = null;
  let wanted = '';           // nombre elegido en Ajustes ('' = automática)
  let volume = 0.8;
  const RATE = 0.95;         // antes 1,1: más calmada
  const PITCH = 0.9;         // algo más grave

  /** Nombres de voces masculinas habituales en español (Windows, Apple, Android, Linux). */
  const MALE_RE = /\b(pablo|ra[uú]l|jorge|diego|juan|carlos|enrique|andr[eé]s|[aá]lvaro|alvaro|gerardo|jos[eé]|antonio|miguel|manuel|javier|sergio|tom[aá]s|federico|eddy|reed|rocko|grandpa|male|masculin|hombre)\b/i;

  function synth() { return typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null; }

  /** Voces locales en español. */
  function list() {
    const s = synth();
    if (!s) return [];
    return (s.getVoices() || []).filter(function (v) { return /^es(-|_|$)/i.test(v.lang || '') && v.localService; });
  }

  function isMale(v) { return MALE_RE.test((v && v.name) || ''); }

  /** Elige la voz: la de Ajustes si sigue instalada; si no, masculina de España, masculina, de España, la primera. */
  function choose(voices, name) {
    if (!voices.length) return null;
    if (name) { const v = voices.find(function (x) { return x.name === name; }); if (v) return v; }
    const es = function (v) { return /^es[-_]ES/i.test(v.lang || ''); };
    return voices.find(function (v) { return isMale(v) && es(v); }) ||
      voices.find(isMale) || voices.find(es) || voices[0];
  }

  function pick() { return choose(list(), wanted); }

  function init() {
    const s = synth();
    if (!s) return;
    voice = pick();
    if ('onvoiceschanged' in s) {
      s.addEventListener('voiceschanged', function () { voice = pick(); });
    }
  }

  SB.voice = {
    /** ¿Hay una voz local en español? */
    available: function () { if (!voice) voice = pick(); return !!voice; },
    setVolume: function (v) { volume = Math.max(0, Math.min(1, Number(v) || 0)); },
    /** Voz elegida en Ajustes ('' = automática). */
    setVoice: function (name) { wanted = String(name || ''); voice = pick(); },
    /** Voces que se pueden elegir: [{name, lang, male}]. */
    voices: function () { return list().map(function (v) { return { name: v.name, lang: v.lang, male: isMale(v) }; }); },
    /** Nombre de la voz que se usará. */
    current: function () { if (!voice) voice = pick(); return voice ? voice.name : ''; },
    /** Dice una frase; corta la anterior si aún se oía (lo último es lo que importa). */
    say: function (text) {
      const s = synth();
      if (!s || !text || !SB.voice.available()) return false;
      try {
        if (s.speaking || s.pending) s.cancel();
        const u = new SpeechSynthesisUtterance(String(text));
        u.voice = voice; u.lang = voice.lang; u.rate = RATE; u.pitch = PITCH; u.volume = volume;
        s.speak(u);
        return true;
      } catch (e) { return false; }
    },
    cancel: function () { const s = synth(); if (s) try { s.cancel(); } catch (e) { /* noop */ } },
    // Para las pruebas
    _choose: choose, _isMale: isMale
  };
  init();
})(window.SB = window.SB || {});
