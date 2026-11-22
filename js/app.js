/* SOMBRA · js/app.js — arranque de la interfaz.
   SB.app = { state: { session }, go(route), toast(msg) } (§8.1)
   CONTRATO: se añaden settings(), saveSettings(patch), DEFAULT_SETTINGS, generate(params), applySettings(), speed(). */
(function (SB) {
  'use strict';

  var ui = SB.ui;
  // Una sola fuente de verdad: los de js/core/storage.js (esta copia es solo por si faltara).
  var DEFAULT_SETTINGS = (SB.storage && SB.storage.DEFAULT_SETTINGS) || {
    stance: 'diestro', sound: true, volume: 0.7, countdownTicks: true, showNext: true, autoDemo: true, showFigure: true,
    hiitDemand: 'alta', restSec: 30, changePace: 'normal', theme: 'oscuro', keepAwake: true,
    lastLevel: 'basico', lastDuration: 30, lastGoal: 'completo',
    equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7,
    equipRope: true, equipTape: true, equipAnkles: true, equipHangBall: true, equipElbow: true,
    cameraAnalysis: true, voiceCues: true, cameraPreview: true,
    // Cámara elegida en Ajustes ('' = automática) y la última que funcionó (se prueba primero).
    cameraId: '', cameraLastId: '',
    // Voz elegida ('' = automática: masculina si la hay) y clips de los fallos para el resumen (21-nov-2026).
    voiceName: '', cameraClips: true
  };
  var SESSION_KEY = 'sombra.currentSession'; // sessionStorage (no es dato persistente del usuario)

  var memSettings = null;

  function storageGet(key, fallback) {
    return ui.safe(function () { return SB.storage ? SB.storage.get(key, fallback) : fallback; }, fallback);
  }
  function storageSet(key, value) {
    return ui.safe(function () { if (SB.storage) SB.storage.set(key, value); return true; }, false);
  }

  function settings() {
    var s = storageGet('settings', null) || memSettings || {};
    return Object.assign({}, DEFAULT_SETTINGS, s);
  }
  function saveSettings(patch) {
    var next = Object.assign(settings(), patch || {});
    memSettings = next;
    storageSet('settings', next);
    applySettings(next);
    return next;
  }
  function applySettings(s) {
    s = s || settings();
    document.documentElement.setAttribute('data-theme', s.theme === 'claro' ? 'light' : 'dark');
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.theme === 'claro' ? '#F4F5F7' : '#0B0D10');
    if (SB.sounds) {
      SB.sounds.setEnabled(!!s.sound);
      SB.sounds.setVolume(s.volume);
    }
  }

  // ---------------------------------------------------------------------------
  // Sesión actual
  // ---------------------------------------------------------------------------
  function setSession(session, params) {
    SB.app.state.session = session;
    SB.app.state.params = params || null;
    try {
      if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ session: session, params: params || null }));
      else sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* sessionStorage no disponible o lleno */ }
  }
  function restoreSession() {
    if (SB.app.state.session) return SB.app.state.session;
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var o = JSON.parse(raw);
        SB.app.state.session = o.session || null;
        SB.app.state.params = o.params || null;
      }
    } catch (e) { /* noop */ }
    return SB.app.state.session;
  }

  /** Genera una sesión con el motor y la deja en SB.app.state. Devuelve la sesión o null. */
  function generate(params) {
    params = Object.assign({}, params);
    if (params.seed == null) params.seed = Math.floor(Math.random() * 2147483647);
    if (!SB.session || !SB.session.generate) {
      toast('El generador de sesiones no está disponible.');
      return null;
    }
    var session = null;
    try {
      session = SB.session.generate({
        durationMin: params.durationMin, level: params.level, goalId: params.goalId,
        seed: params.seed, custom: params.custom || undefined
      });
    } catch (e) {
      console.error('[SOMBRA] generate', e);
      toast('No se pudo generar la sesión. ' + (e && e.message ? e.message : ''));
      return null;
    }
    if (!session || !session.timeline || !session.timeline.length) {
      toast('No se pudo generar la sesión con tu biblioteca actual.');
      return null;
    }
    setSession(session, params);
    return session;
  }

  /** ?speed=N en la URL (antes o después del hash). */
  function speed() {
    var m = /[?&]speed=([\d.]+)/.exec(location.search) || /[?&]speed=([\d.]+)/.exec(location.hash);
    var v = m ? parseFloat(m[1]) : 1;
    return (v > 0 && v <= 200) ? v : 1;
  }

  function go(route) { SB.router.go(route); }
  function toast(msg, opts) { ui.toast(msg, opts); }

  function onboarded() { return !!storageGet('onboarded', false); }

  // ---------------------------------------------------------------------------
  // Carcasa: barra superior + navegación inferior (móvil)
  // ---------------------------------------------------------------------------
  var NAV = [
    { route: '#/', name: 'home', label: 'Inicio', icon: 'home' },
    { route: '#/library', name: 'library', label: 'Biblioteca', icon: 'library', also: ['movement'] },
    { route: '#/calendar', name: 'calendar', label: 'Calendario', icon: 'calendar' },
    { route: '#/settings', name: 'settings', label: 'Ajustes', icon: 'settings' }
  ];

  function buildShell() {
    var h = ui.h;
    var appbar = document.getElementById('appbar');
    var tabbar = document.getElementById('tabbar');
    if (appbar) {
      ui.clear(appbar);
      appbar.appendChild(h('div', { class: 'appbar-inner' },
        h('a', { class: 'brand', href: '#/', 'aria-label': 'SOMBRA, ir al inicio' },
          h('img', { class: 'brand-mark', src: 'assets/icons/app.svg', alt: '', width: 28, height: 28 }),
          h('span', { class: 'brand-name' }, 'SOMBRA')),
        h('nav', { class: 'appnav', 'aria-label': 'Principal' },
          NAV.map(function (n) {
            return h('a', { class: 'appnav-link', href: n.route, 'data-nav': n.name }, ui.icon(n.icon), h('span', null, n.label));
          }))));
    }
    if (tabbar) {
      ui.clear(tabbar);
      tabbar.setAttribute('aria-label', 'Navegación');
      NAV.forEach(function (n) {
        tabbar.appendChild(h('a', { class: 'tab-link', href: n.route, 'data-nav': n.name }, ui.icon(n.icon), h('span', null, n.label)));
      });
    }
  }

  function updateNav(ctx) {
    var name = ctx ? ctx.name : '';
    NAV.forEach(function (n) {
      var active = n.name === name || (n.also && n.also.indexOf(name) >= 0) || (n.name === 'home' && (name === 'preview' || name === 'custom'));
      document.querySelectorAll('[data-nav="' + n.name + '"]').forEach(function (a) {
        if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // PWA: manifest y service worker solo por http(s) (en file:// darían errores)
  // ---------------------------------------------------------------------------
  function setupPwa() {
    var p = location.protocol;
    if (p !== 'http:' && p !== 'https:') return;
    if (!document.querySelector('link[rel="manifest"]')) {
      var l = document.createElement('link');
      l.rel = 'manifest'; l.href = 'manifest.webmanifest';
      document.head.appendChild(l);
    }
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function (e) { console.warn('[SOMBRA] SW', e); });
      });
    }
  }

  function setupAudioUnlock() {
    var done = false;
    function unlock() {
      if (done) return; done = true;
      if (SB.sounds) SB.sounds.unlock();
      ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.removeEventListener(ev, unlock, true); });
    }
    ['pointerdown', 'keydown', 'touchend'].forEach(function (ev) { window.addEventListener(ev, unlock, true); });
  }

  function missingModules() {
    var need = ['util', 'storage', 'library', 'notation', 'grammar', 'session', 'suggestions', 'calendar', 'history', 'Player'];
    return need.filter(function (k) { return !SB[k]; });
  }

  /**
   * Cambios de una sola vez para quien ya usaba la app (15-nov-2026):
   *  - activa todo el material y el análisis por cámara (venían apagados y no se encontraban);
   *  - añade a la biblioteca la media cintura, la cintura completa, la goma y la sentadilla que falten.
   */
  var MIGRATION_KEY = 'migr20261115';
  function migrate() {
    var s = settings();
    if (s[MIGRATION_KEY]) return;
    var patch = {
      equipBall: true, equipPaper: true, equipDumbbells: true, equipRope: true, equipTape: true,
      equipAnkles: true, equipHangBall: true, equipElbow: true, cameraAnalysis: true
    };
    patch[MIGRATION_KEY] = true;
    if (onboarded() && SB.library && SB.library.ensureMovements) {
      ui.safe(function () { SB.library.ensureMovements(['slip_lead', 'slip_rear', 'roll_lead', 'roll_rear', 'pull_back', 'duck'], 'practica'); });
    }
    saveSettings(patch);
  }

  function init() {
    ui.safe(migrate);
    applySettings();
    buildShell();
    setupPwa();
    setupAudioUnlock();

    var missing = missingModules();
    if (missing.length) console.warn('[SOMBRA] Módulos no cargados: ' + missing.join(', '));

    SB.router.guard(function (ctx) {
      if (!onboarded() && ctx.name !== 'onboarding') return '/onboarding';
      return null;
    });
    SB.router.onChange(updateNav);

    // Atajo de accesibilidad: saltar al contenido sin tocar el hash
    var skip = document.getElementById('skip');
    if (skip) skip.addEventListener('click', function (e) {
      e.preventDefault();
      var v = document.getElementById('view');
      if (v) v.focus();
    });

    SB.router.start(document.getElementById('view'));
  }

  SB.app = {
    state: { session: null, params: null },
    DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    go: go,
    toast: toast,
    settings: settings,
    saveSettings: saveSettings,
    applySettings: applySettings,
    generate: generate,
    setSession: setSession,
    restoreSession: restoreSession,
    speed: speed,
    onboarded: onboarded
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.SB = window.SB || {});
