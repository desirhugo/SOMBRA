/* SOMBRA · js/ui/router.js — enrutador por hash (funciona en file://).
   Rutas (§8.1): #/ · #/onboarding · #/preview · #/train · #/library · #/library/m/<id> · #/custom · #/calendar · #/settings
   Cada pantalla se registra en SB.screens[name] = { title, immersive?, render(root, ctx) -> cleanup? }.
   CONTRATO: añade SB.router (no definido en §7). */
(function (SB) {
  'use strict';

  var ROUTES = [
    { name: 'home', re: /^\/?$/ },
    { name: 'onboarding', re: /^\/onboarding\/?$/ },
    { name: 'preview', re: /^\/preview\/?$/ },
    { name: 'train', re: /^\/train\/?$/ },
    { name: 'library', re: /^\/library\/?$/ },
    { name: 'movement', re: /^\/library\/m\/([^/]+)\/?$/, keys: ['id'] },
    { name: 'custom', re: /^\/custom\/?$/ },
    { name: 'calendar', re: /^\/calendar\/?$/ },
    { name: 'settings', re: /^\/settings\/?$/ }
  ];

  var root = null;
  var cleanup = null;
  var current = null;
  var guards = [];
  var listeners = [];
  var started = false;

  function parse(hash) {
    var raw = (hash || '').replace(/^#/, '');
    var qi = raw.indexOf('?');
    var path = qi >= 0 ? raw.slice(0, qi) : raw;
    var qs = qi >= 0 ? raw.slice(qi + 1) : '';
    var query = {};
    qs.split('&').forEach(function (pair) {
      if (!pair) return;
      var eq = pair.indexOf('=');
      var k = decodeURIComponent(eq >= 0 ? pair.slice(0, eq) : pair);
      var v = eq >= 0 ? decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' ')) : '';
      query[k] = v;
    });
    if (!path) path = '/';
    if (path.charAt(0) !== '/') path = '/' + path;
    for (var i = 0; i < ROUTES.length; i++) {
      var m = ROUTES[i].re.exec(path);
      if (m) {
        var params = {};
        (ROUTES[i].keys || []).forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
        return { name: ROUTES[i].name, path: path, params: params, query: query, hash: '#' + raw };
      }
    }
    return { name: 'home', path: '/', params: {}, query: query, hash: '#/', unknown: true };
  }

  function normalize(route) {
    if (!route) return '#/';
    if (route.charAt(0) === '#') return route;
    if (route.charAt(0) !== '/') route = '/' + route;
    return '#' + route;
  }

  function render() {
    if (!root) return;
    var ctx = parse(location.hash);
    for (var g = 0; g < guards.length; g++) {
      var redirect = guards[g](ctx);
      if (redirect && normalize(redirect) !== normalize(ctx.hash.slice(1) || '/')) {
        location.replace(normalize(redirect));
        return;
      }
    }
    var screen = SB.screens && SB.screens[ctx.name];
    if (!screen) {
      if (ctx.name !== 'home' && SB.screens && SB.screens.home) { location.replace('#/'); return; }
      root.textContent = 'Pantalla no disponible.';
      return;
    }
    if (typeof cleanup === 'function') { try { cleanup(); } catch (e) { console.error('[SOMBRA] cleanup', e); } }
    cleanup = null;
    // Un diálogo abierto pertenece a la pantalla anterior: se cierra como si se cancelara.
    Array.prototype.slice.call(document.querySelectorAll('dialog.modal')).forEach(function (d) {
      try { d.dispatchEvent(new Event('cancel', { cancelable: true })); } catch (e) { /* noop */ }
      if (d.parentNode) d.parentNode.removeChild(d);
    });
    var prev = current;
    current = ctx;
    while (root.firstChild) root.removeChild(root.firstChild);
    document.body.classList.toggle('immersive', !!screen.immersive);
    document.body.setAttribute('data-screen', ctx.name);
    try {
      cleanup = screen.render(root, ctx) || null;
    } catch (e) {
      console.error('[SOMBRA] render ' + ctx.name, e);
      root.appendChild(errorView(e));
    }
    document.title = (screen.title ? (typeof screen.title === 'function' ? screen.title(ctx) : screen.title) + ' · ' : '') + 'SOMBRA';
    listeners.forEach(function (fn) { try { fn(ctx, prev); } catch (e) { /* noop */ } });
    if (prev && prev.name !== ctx.name) {
      window.scrollTo(0, 0);
      // Mueve el foco al contenido para lectores de pantalla
      if (!screen.immersive) { try { root.focus({ preventScroll: true }); } catch (e) { /* noop */ } }
    }
  }

  function errorView(e) {
    var d = document.createElement('div');
    d.className = 'page';
    var p = document.createElement('p');
    p.className = 'callout callout-danger';
    p.textContent = 'Algo ha fallado al mostrar esta pantalla. ' + (e && e.message ? '(' + e.message + ')' : '');
    var a = document.createElement('a');
    a.href = '#/'; a.className = 'btn btn-secondary'; a.textContent = 'Volver al inicio';
    d.appendChild(p); d.appendChild(a);
    return d;
  }

  SB.router = {
    start: function (el) {
      root = el;
      if (started) return render();
      started = true;
      window.addEventListener('hashchange', render);
      render();
    },
    go: function (route) {
      var h = normalize(route);
      if (h === location.hash || (h === '#/' && (location.hash === '' || location.hash === '#'))) render();
      else location.hash = h;
    },
    replace: function (route) { location.replace(normalize(route)); },
    refresh: function () { render(); },
    guard: function (fn) { guards.push(fn); },
    onChange: function (fn) { listeners.push(fn); },
    parse: parse,
    get current() { return current; }
  };
})(window.SB = window.SB || {});
