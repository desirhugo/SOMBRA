/* SOMBRA · service worker — solo se registra si la app se sirve por http(s) (ver js/app.js).
   Estrategia: red primero y caché de respaldo (así los cambios locales se ven al instante y
   la app sigue funcionando sin conexión). Sube CACHE_VERSION al cambiar la lista de archivos. */
'use strict';

var CACHE_VERSION = 'sombra-v10';
var APP_FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/app.css',
  'css/training.css',
  'assets/fonts/barlow-condensed-latin-600-normal.woff2',
  'assets/fonts/barlow-condensed-latin-700-normal.woff2',
  'assets/fonts/barlow-condensed-latin-800-normal.woff2',
  'assets/fonts/barlow-latin-400-normal.woff2',
  'assets/fonts/barlow-latin-500-normal.woff2',
  'assets/fonts/barlow-latin-600-normal.woff2',
  'assets/icons/app.svg',
  'assets/icons/app-maskable.svg',
  'js/core/util.js',
  'data/movements.js',
  'data/combinations.js',
  'data/hiit.js',
  'data/goals.js',
  'data/videos.js',
  'js/core/storage.js',
  'js/core/mediaStore.js',
  'js/library/notation.js',
  'js/library/library.js',
  'js/engine/grammar.js',
  'js/engine/comboGenerator.js',
  'js/engine/history.js',
  'js/engine/selector.js',
  'js/engine/hiitEngine.js',
  'js/engine/sessionGenerator.js',
  'js/engine/suggestions.js',
  'js/calendar/calendar.js',
  'js/training/timer.js',
  'js/training/player.js',
  'js/audio/sounds.js',
  'js/audio/voice.js',
  'js/vision/analyzer.js',
  'js/vision/coach.js',
  'js/vision/pose.js',
  'js/vision/clips.js',
  'js/visual/figure.js',
  'js/visual/poses.js',
  'js/visual/exercises.js',
  'js/visual/demo.js',
  'js/ui/components.js',
  'js/ui/router.js',
  'js/ui/screens/onboarding.js',
  'js/ui/screens/home.js',
  'js/ui/screens/preview.js',
  'js/ui/screens/train.js',
  'js/ui/screens/library.js',
  'js/ui/screens/movement.js',
  'js/ui/screens/custom.js',
  'js/ui/screens/calendar.js',
  'js/ui/screens/settings.js',
  'js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      // Archivo a archivo: si alguno falta, el resto se guarda igualmente
      return Promise.all(APP_FILES.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' })).catch(function () { /* se ignora */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k.indexOf('sombra-') === 0 && k !== CACHE_VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // MediaPipe (≈ 25 MB, solo con el análisis por cámara): se lee de la carpeta local, sin copiarlo a la caché.
  if (url.pathname.indexOf('/vendor/') !== -1) return;

  event.respondWith(
    // no-cache: revalida con el servidor (304 si no ha cambiado) para no servir archivos viejos
    fetch(req, { cache: 'no-cache' }).then(function (res) {
      if (res && res.ok && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        if (hit) return hit;
        if (req.mode === 'navigate') return caches.match('index.html');
        return new Response('', { status: 504, statusText: 'Sin conexión' });
      });
    })
  );
});
