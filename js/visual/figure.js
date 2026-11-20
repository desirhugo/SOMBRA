/*
 * SOMBRA · js/visual/figure.js  [Animación]
 *
 * Figura 3D sencilla (rig de segmentos) proyectada en 3/4 y dibujada en <canvas>.
 * Original del proyecto: no reproduce ninguna figura, app ni vídeo existente.
 *
 * API pública (ARCHITECTURE §8.5):
 *   var fig = new SB.visual.Figure(canvas, { stance: 'diestro'|'zurdo', speed?: 1, colors?: {...} });
 *   fig.playMovement(id [, { loop: true }])            -> boolean (false si no hay animación: queda en guardia)
 *   fig.playSequence(ids [, { loop: true, onStep }])   -> boolean
 *   fig.stop()          detiene la animación y deja la figura en guardia
 *   fig.setStance(s)    'diestro' (ortodoxo, por defecto) | 'zurdo' (espejo horizontal)
 *   fig.destroy()       libera observadores y el bucle de animación
 *
 * CONTRATO: extras compatibles (no exigidos por §8.5):
 *   - opción `onStep(index, id)` en playSequence: se llama cuando empieza cada movimiento de la secuencia.
 *   - SB.visual.rig = { solve(pose), neckBase(pose), RIG } para que poses.js (y pruebas) usen la misma cinemática.
 *
 * ── Sistema de coordenadas (metros) ─────────────────────────────────────────────
 *   Guardia ORTODOXA. Origen en el suelo, entre los pies.
 *   +z = hacia el rival · +y = arriba · +x = lado ATRASADO (derecha del boxeador diestro).
 *   Ángulos de giro (yaw, grados): 0 = pecho mirando al rival; positivo = el pecho gira hacia el
 *   lado atrasado (más de perfil). Guardia ≈ 40°. Un directo lleva el yaw hacia 0 o negativo.
 *   El zurdo se obtiene reflejando el dibujo en horizontal (el modelo es siempre ortodoxo).
 *
 * ── Pose (todos los campos son numéricos o arrays numéricos: se interpolan) ─────
 *   rx, rz, ry   raíz: desplazamiento en el suelo y giro (grados) alrededor del pie adelantado
 *   hx, hy, hz   centro de la cadera (hy = altura → flexión de piernas)
 *   hyaw, syaw   giro de cadera y de hombros
 *   lean, bend   inclinación lateral (+ hacia el lado atrasado) y frontal (+ hacia el rival) del tronco
 *   lsh, rsh     elevación de hombro izquierdo/derecho (m), p. ej. shoulder roll
 *   hd           desplazamiento extra de la cabeza [x,y,z]
 *   lh, rh       objetivo del guante adelantado/atrasado, relativo a la base del cuello (ejes de la raíz)
 *   le, re       vector polo de los codos (hacia dónde apunta el codo)
 *   lf, rf       pies: [x, z, yawPunta(grados), talónLevantado 0..1, alturaDelPie(m)] (x,z = metatarso)
 *   a            opacidad (0..1), para reinicios suaves de los desplazamientos
 *   Codos y rodillas se resuelven con IK de dos huesos + vector polo (longitudes constantes).
 *
 *   Campos opcionales para los ejercicios HIIT (js/visual/exercises.js); sin ellos nada cambia:
 *   pitch        inclinación del tronco en grados desde la vertical hacia +z (90 = tumbado boca abajo
 *                con la cabeza hacia +z, -90 = boca arriba con la cabeza hacia -z, >90 = cabeza más baja
 *                que la cadera). Sustituye a la fórmula de `bend`, que se suma a `pitch`.
 *   roll         giro (grados) de hombros y caderas alrededor de la columna (plancha lateral)
 *   lha, rha     objetivo ABSOLUTO del guante (coordenadas locales); manda sobre lh/rh (manos apoyadas)
 *   lk, rk       vector polo de las rodillas (si no, se deriva del pie)
 *   lf[5], rf[5] inclinación del pie en grados (+ punta arriba, - punta abajo)
 *   rc           [x, z] centro del giro `ry` de la raíz (por defecto, el pie adelantado de guardia)
 *
 * ── Cámara y capas explicativas ─────────────────────────────────────────────────
 *   Cámara 3/4 (azimut 30°, elevación 22°): el rival queda a la derecha de la pantalla (diestro);
 *   un paso adelante avanza sobre la línea de ataque y un lateral se separa en diagonal.
 *   Capas (las define poses.js en el clip): estela del guante que golpea (recta / arco / subida),
 *   anillo de impacto, flecha turquesa del golpe rival (defensas), guante fantasma (fintas),
 *   huellas + línea de ataque en el suelo (desplazamientos) y marca de pausa (ritmo).
 *   Tono por miembro completo (el alejado más oscuro); paleta adaptada si :root[data-theme="light"].
 */
(function (SB) {
  'use strict';

  SB.visual = SB.visual || {};

  var DEG = Math.PI / 180;

  // ───────────────────────── utilidades vectoriales ─────────────────────────
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function madd(a, b, s) { return [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a); return l > 1e-9 ? mul(a, 1 / l) : [0, 0, 0]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  }
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  var Y = [0, 1, 0];

  // ───────────────────────── proporciones del rig ─────────────────────────
  var RIG = {
    thigh: 0.45, shin: 0.44,          // muslo, tibia
    upper: 0.29, fore: 0.27,          // brazo, antebrazo (hasta el centro del guante)
    spine: 0.50,                      // centro de cadera → base del cuello
    neck: 0.16,                       // base del cuello → centro de la cabeza
    shoulder: 0.17, shoulderDrop: 0.035, hip: 0.095,
    footBack: 0.15, toe: 0.06, ankle: 0.075,
    headR: 0.105, gloveR: 0.074,
    // grosores (m)
    wThigh: 0.135, wShin: 0.105, wFoot: 0.07, wUpper: 0.098, wFore: 0.086, wNeck: 0.08, wTorso: 0.09,
    PIVOT: [-0.12, 0, 0.25]           // metatarso del pie adelantado en guardia (centro de giro de la raíz)
  };

  // Cámara 3/4: azimut desde +x hacia +z (la figura mira hacia la cámara, el rival queda a la derecha
  // de la pantalla en guardia ortodoxa), algo elevada.
  var CAM = {
    F: 7.0,
    target: [0, 0.86, 0],
    // caja visible en el espacio de cámara (m): centro y tamaño
    view: { cx: 0.08, cy: -0.04, w: 2.05, h: 1.98 }
  };
  /** Orienta la cámara: azimut (grados desde +x hacia +z) y elevación (grados). */
  function setCamera(azDeg, elDeg) {
    var az = azDeg * DEG, el = elDeg * DEG;
    var B = [Math.cos(az), 0, Math.sin(az)];           // horizontal hacia la cámara
    CAM.az = azDeg; CAM.el = elDeg;
    CAM.R = [-Math.sin(az), 0, Math.cos(az)];          // derecha de la pantalla
    CAM.U = sub(mul(Y, Math.cos(el)), mul(B, Math.sin(el)));
    CAM.D = add(mul(B, Math.cos(el)), mul(Y, Math.sin(el)));  // hacia la cámara (profundidad)
  }
  setCamera(30, 22);

  // ───────────────────────── colores ─────────────────────────
  var DEFAULT_COLORS = {
    near: [160, 172, 188],     // miembros cercanos
    far: [84, 96, 114],        // miembros alejados (más oscuro)
    head: [176, 187, 201],
    lead: '#FF5A36',           // guante adelantado (acento §8.6)
    rear: '#ECEFF3',           // guante atrasado (claro)
    outline: 'rgba(6,8,12,0.58)',
    threat: '#5EEAD4',         // flecha del golpe que llega (color de defensa §8.6)
    halo: 'rgba(0,0,0,0.38)',
    shadow: [139, 149, 163],
    mark: '#8B95A3'
  };

  // Ajustes para tema claro (:root[data-theme="light"], ver css/base.css): solo lo que pierde contraste.
  var LIGHT_COLORS = {
    near: [138, 150, 168],
    far: [74, 86, 104],
    head: [150, 162, 178],
    threat: '#0D8C80',
    halo: 'rgba(255,255,255,0.75)',
    shadow: [70, 80, 96],
    mark: '#4F5966'
  };

  function isLightTheme() {
    try {
      var r = document.documentElement;
      return r.getAttribute('data-theme') === 'light';
    } catch (e) { return false; }
  }

  function rgb(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a == null ? 1 : a) + ')';
  }
  function mixc(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  // ───────────────────────── cinemática ─────────────────────────
  function spineDir(p) {
    if (p.pitch == null) return norm([Math.tan((p.lean || 0) * DEG), 1, Math.tan((p.bend || 0) * DEG)]);
    var L = (p.lean || 0) * DEG, A = (p.pitch + (p.bend || 0)) * DEG;
    return [Math.sin(L), Math.cos(L) * Math.cos(A), Math.cos(L) * Math.sin(A)];
  }
  /** Gira v alrededor del eje unitario k (Rodrigues). */
  function rotAxis(v, k, deg) {
    var a = deg * DEG, c = Math.cos(a), s = Math.sin(a);
    return add(add(mul(v, c), mul(cross(k, v), s)), mul(k, dot(k, v) * (1 - c)));
  }
  function neckBase(p) { return madd([p.hx, p.hy, p.hz], spineDir(p), RIG.spine); }

  /** IK de dos huesos: raíz a, objetivo b, longitudes l1/l2, polo (dirección hacia la que dobla). */
  function ik(a, b, l1, l2, pole) {
    var d = sub(b, a);
    var dist = len(d);
    var n = dist > 1e-6 ? mul(d, 1 / dist) : [0, -1, 0];
    var dc = clamp(dist, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995);
    var cosA = clamp((l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc), -1, 1);
    var sinA = Math.sqrt(1 - cosA * cosA);
    var p = madd(pole, n, -dot(pole, n));
    if (len(p) < 1e-6) p = Math.abs(n[1]) < 0.9 ? cross(n, Y) : cross(n, [1, 0, 0]);
    p = norm(p);
    return {
      mid: add(add(a, mul(n, l1 * cosA)), mul(p, l1 * sinA)),
      end: add(a, mul(n, dc)),
      reach: dist
    };
  }

  function solveFoot(f, side) {
    var yaw = f[2] * DEG, lift = clamp(f[3] || 0, 0, 1), h = f[4] || 0;
    var t = [Math.sin(yaw), 0, Math.cos(yaw)];
    var ball = [f[0], h, f[1]];
    var b = lift * 0.75;
    var right = [t[2], 0, -t[0]];
    if (f[5]) {
      // pie inclinado (ejercicios): punta y empeine giran alrededor del eje lateral del pie
      var tau = f[5] * DEG, ct = Math.cos(tau), st = Math.sin(tau);
      var tt = [t[0] * ct, st, t[2] * ct], up = [-t[0] * st, ct, -t[2] * st];
      var heel2 = add(madd(ball, tt, -RIG.footBack * Math.cos(b)), mul(up, RIG.footBack * Math.sin(b)));
      return {
        ball: ball, heel: heel2, toe: madd(ball, tt, RIG.toe),
        ankle: madd(madd(heel2, up, RIG.ankle), tt, 0.035),
        pole: norm(add(add(tt, mul(up, 0.1)), mul(right, 0.28 * side))), dir: tt
      };
    }
    var heel = [ball[0] - t[0] * RIG.footBack * Math.cos(b), h + RIG.footBack * Math.sin(b), ball[2] - t[2] * RIG.footBack * Math.cos(b)];
    var toe = madd(ball, t, RIG.toe);
    var ankle = madd(madd(heel, Y, RIG.ankle), t, 0.035);
    var pole = norm(add(add(t, mul(Y, 0.1)), mul(right, 0.28 * side)));
    return { ball: ball, heel: heel, toe: toe, ankle: ankle, pole: pole, dir: t };
  }

  /** Resuelve todas las articulaciones de una pose (coordenadas locales, antes de la raíz). */
  function solve(p) {
    var pc = [p.hx, p.hy, p.hz];
    var sp = spineDir(p);
    var neck = madd(pc, sp, RIG.spine);
    var hya = p.hyaw * DEG, sya = p.syaw * DEG;
    var hr = [Math.cos(hya), 0, -Math.sin(hya)];
    var sr0 = [Math.cos(sya), 0, -Math.sin(sya)];
    var sr = norm(madd(sr0, sp, -dot(sr0, sp)));
    if (p.roll) {
      sr = rotAxis(sr, sp, p.roll);
      hr = rotAxis(norm(madd(hr, sp, -dot(hr, sp))), sp, p.roll);
    }
    var fwd = norm(cross(sr, sp));
    var lS = madd(madd(neck, sr, -RIG.shoulder), sp, -RIG.shoulderDrop + (p.lsh || 0));
    var rS = madd(madd(neck, sr, RIG.shoulder), sp, -RIG.shoulderDrop + (p.rsh || 0));
    var lH = madd(madd(pc, hr, -RIG.hip), Y, -0.03);
    var rH = madd(madd(pc, hr, RIG.hip), Y, -0.03);
    // en guardia la cabeza mira al rival aunque el tronco gire; en los ejercicios, hacia el pecho
    var pitched = p.pitch != null;
    var face = pitched ? norm(add(mul(fwd, 0.85), mul(sp, 0.15))) : norm([fwd[0] * 0.45, 0, fwd[2] * 0.45 + 0.55]);
    var head = add(madd(madd(neck, sp, RIG.neck), face, 0.018), p.hd || [0, 0, 0]);
    var la = ik(lS, p.lha || add(neck, p.lh), RIG.upper, RIG.fore, p.le);
    var ra = ik(rS, p.rha || add(neck, p.rh), RIG.upper, RIG.fore, p.re);
    var lf = solveFoot(p.lf, -1), rf = solveFoot(p.rf, 1);
    var ll = ik(lH, lf.ankle, RIG.thigh, RIG.shin, p.lk || lf.pole);
    var rl = ik(rH, rf.ankle, RIG.thigh, RIG.shin, p.rk || rf.pole);
    return {
      pelvis: pc, neck: neck, head: head, face: face, spine: sp, fwd: fwd, up: pitched ? sp : Y,
      lS: lS, rS: rS, lH: lH, rH: rH,
      lE: la.mid, lG: la.end, rE: ra.mid, rG: ra.end,
      lK: ll.mid, rK: rl.mid,
      lA: lf.ankle, rA: rf.ankle, lHeel: lf.heel, rHeel: rf.heel, lToe: lf.toe, rToe: rf.toe,
      lBall: lf.ball, rBall: rf.ball
    };
  }

  /** Transformación de la raíz: giro `ry` alrededor del pie adelantado de guardia + traslación. */
  function rootFn(r) {
    var a = (r.ry || 0) * DEG, c = Math.cos(a), s = Math.sin(a);
    var P = r.rc ? [r.rc[0], 0, r.rc[1]] : RIG.PIVOT, rx = r.rx || 0, rz = r.rz || 0;
    return function (q) {
      var x = q[0] - P[0], z = q[2] - P[2];
      return [P[0] + x * c + z * s + rx, q[1], P[2] - x * s + z * c + rz];
    };
  }

  // ───────────────────────── interpolación ─────────────────────────
  var EASE = {
    lin: function (t) { return t; },
    in: function (t) { return t * t; },
    out: function (t) { var u = 1 - t; return 1 - u * u * u; },
    snap: function (t) { var u = 1 - t; return 1 - u * u * u * u; },
    io: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    sio: function (t) { return t * t * (3 - 2 * t); }
  };

  function bez(a, c, b, e) { var u = 1 - e; return u * u * a + 2 * u * e * c + e * e * b; }

  function lerpPose(a, b, e, via) {
    var out = {};
    for (var k in b) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) continue;
      var bv = b[k], av = a[k], cv = via ? via[k] : null;
      if (typeof bv === 'number') {
        if (typeof av !== 'number') av = bv;
        out[k] = (cv != null) ? bez(av, cv, bv, e) : av + (bv - av) * e;
      } else if (Array.isArray(bv)) {
        var arr = new Array(bv.length);
        for (var j = 0; j < bv.length; j++) {
          var x0 = (av && typeof av[j] === 'number') ? av[j] : bv[j];
          arr[j] = (cv && typeof cv[j] === 'number') ? bez(x0, cv[j], bv[j], e) : x0 + (bv[j] - x0) * e;
        }
        out[k] = arr;
      } else {
        out[k] = bv;
      }
    }
    return out;
  }

  /** Pose de un clip (array de keyframes {t, p, ease, via}) en el instante t (ms). */
  function evaluate(keys, t) {
    if (!keys || !keys.length) return null;
    if (t <= keys[0].t) return keys[0].p;
    for (var i = 1; i < keys.length; i++) {
      var b = keys[i];
      if (t <= b.t) {
        var a = keys[i - 1];
        var span = b.t - a.t;
        if (span <= 0) return b.p;
        var u = (t - a.t) / span;
        var fn = EASE[b.ease] || EASE.io;
        return lerpPose(a.p, b.p, fn(u), b.via);
      }
    }
    return keys[keys.length - 1].p;
  }

  // ───────────────────────── reduced motion ─────────────────────────
  function prefersReducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) { return false; }
  }

  var raf = (typeof window !== 'undefined' && window.requestAnimationFrame) ?
    function (f) { return window.requestAnimationFrame(f); } : function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
  var caf = (typeof window !== 'undefined' && window.cancelAnimationFrame) ?
    function (id) { window.cancelAnimationFrame(id); } : function (id) { clearTimeout(id); };
  function now() { return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now(); }

  // ───────────────────────── Figure ─────────────────────────
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{stance?: 'diestro'|'zurdo', speed?: number, colors?: object, reducedMotion?: boolean}} opts
   */
  function Figure(canvas, opts) {
    if (!(this instanceof Figure)) return new Figure(canvas, opts);
    opts = opts || {};
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stance = opts.stance === 'zurdo' ? 'zurdo' : 'diestro';
    this._userColors = opts.colors || null;
    this.colors = this._palette();
    this.reduced = opts.reducedMotion != null ? !!opts.reducedMotion : prefersReducedMotion();
    this.baseSpeed = opts.speed > 0 ? opts.speed : 1;
    this._clip = null;
    this._loop = true;
    this._loopMax = Infinity;
    this._loops = 0;
    this._start = 0;
    this._raf = null;
    this._playing = false;
    this._visible = true;
    this._destroyed = false;
    this._lastT = 0;
    this._step = -1;
    this._onStep = null;
    this._w = 0; this._h = 0; this._dpr = 1;
    this._tick = this._tick.bind(this);

    var self = this;
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(function () { self._resize(); });
      this._ro.observe(canvas);
    } else {
      this._onWinResize = function () { self._resize(); };
      window.addEventListener('resize', this._onWinResize);
    }
    if (typeof IntersectionObserver !== 'undefined') {
      this._io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) self._visible = entries[i].isIntersecting;
        if (self._visible && self._playing && !self._raf) self._schedule();
      });
      this._io.observe(canvas);
    }
    this._resize();
  }

  /** Paleta efectiva: base + tema claro (si procede) + colores pasados en opts.colors. */
  Figure.prototype._palette = function () {
    var c = {}, k, light = isLightTheme();
    for (k in DEFAULT_COLORS) c[k] = DEFAULT_COLORS[k];
    if (light) for (k in LIGHT_COLORS) c[k] = LIGHT_COLORS[k];
    if (this._userColors) for (k in this._userColors) c[k] = this._userColors[k];
    c._light = light;
    return c;
  };

  Figure.prototype._resize = function () {
    if (this._destroyed) return;
    var c = this.canvas;
    var w = c.clientWidth || 0, h = c.clientHeight || 0;
    if (!w || !h) {
      // canvas oculto o fuera del DOM: si nunca tuvo tamaño CSS, usa sus atributos
      if (!c.isConnected) return;
      if (!this._w) { w = c.width || 300; h = c.height || 150; } else return;
    }
    var dpr = Math.max(1, Math.min(3, (window.devicePixelRatio || 1)));
    var W = Math.round(w * dpr), H = Math.round(h * dpr);
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    this._w = w; this._h = h; this._dpr = dpr;
    this._applyView(this._viewFor(this._clip));
    if (this._playing && !this._raf) this._schedule();
    this._renderAt(this._lastT);
  };

  /** Encuadre: caja visible en el espacio de cámara → escala y centro en píxeles CSS. */
  Figure.prototype._applyView = function (v) {
    this._view = v;
    if (!this._w) return;
    this._s = Math.min(this._w / v.w, this._h / v.h);
    this._cx = this._w / 2 - v.cx * this._s;
    this._cy = this._h / 2 + v.cy * this._s;
  };

  /** Punto en el espacio de cámara (antes de escalar): [x, y]. */
  function camPt(w) {
    var q = sub(w, CAM.target);
    var k = CAM.F / (CAM.F - dot(q, CAM.D));
    return [dot(q, CAM.R) * k, dot(q, CAM.U) * k];
  }

  /**
   * Encuadre del clip. Los de boxeo usan la cámara fija (CAM.view). Los ejercicios (`frame: 'auto'`)
   * se encuadran solos: caja que contiene la figura y su sombra durante todo el clip (se calcula una vez).
   */
  Figure.prototype._viewFor = function (clip) {
    if (!clip || clip.frame !== 'auto') return CAM.view;
    if (clip._view) return clip._view;
    var x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    function ext(c, m) {
      if (c[0] - m < x0) x0 = c[0] - m; if (c[0] + m > x1) x1 = c[0] + m;
      if (c[1] - m < y0) y0 = c[1] - m; if (c[1] + m > y1) y1 = c[1] + m;
    }
    var N = 40, names = ['neck', 'pelvis', 'lG', 'rG', 'lE', 'rE', 'lK', 'rK', 'lToe', 'rToe', 'lHeel', 'rHeel', 'lS', 'rS'];
    for (var i = 0; i <= N; i++) {
      var p = evaluate(clip, (clip.duration || 0) * i / N);
      if (!p) continue;
      var J = solve(p), X = rootFn(p);
      ext(camPt(X(J.head)), RIG.headR * 1.25);
      for (var j = 0; j < names.length; j++) ext(camPt(X(J[names[j]])), 0.07);
      ext(camPt(X([J.pelvis[0], 0, J.pelvis[2]])), 0.12);
    }
    var w = Math.max(1.05, (x1 - x0) * 1.08), h = Math.max(1.05, (y1 - y0) * 1.08);
    clip._view = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: w, h: h };
    return clip._view;
  };

  Figure.prototype._project = function (w) {
    var q = sub(w, CAM.target);
    var sx = dot(q, CAM.R), sy = dot(q, CAM.U), dz = dot(q, CAM.D);
    var k = CAM.F / (CAM.F - dz);
    return { x: this._cx + sx * k * this._s, y: this._cy - sy * k * this._s, z: dz, k: k };
  };

  /** Reproduce un movimiento suelto en bucle. Devuelve false si no hay animación (queda en guardia). */
  Figure.prototype.playMovement = function (id, opts) {
    var P = SB.visual.poses;
    if (!P || !P.has(id)) { this.stop(); return false; }
    this._play(P.clip(id), opts);
    return true;
  };

  /** Reproduce una combinación encadenada. Ids sin animación se omiten. */
  Figure.prototype.playSequence = function (ids, opts) {
    var P = SB.visual.poses;
    if (!P || !ids || !ids.length) { this.stop(); return false; }
    var clip = P.sequence(ids);
    if (!clip || !clip.length || !clip.steps || !clip.steps.length) { this.stop(); return false; }
    this._play(clip, opts);
    return true;
  };

  /**
   * CONTRATO: extra. Reproduce un ejercicio HIIT (SB.visual.exercises) en bucle y encuadrado.
   * Devuelve false si no hay animación (queda en guardia).
   */
  Figure.prototype.playExercise = function (id, opts) {
    var E = SB.visual.exercises;
    if (!E || !E.has(id)) { this.stop(); return false; }
    var c = E.clip(id);
    if (!c) { this.stop(); return false; }
    opts = opts || {};
    this._play(c, { loop: opts.loop, speed: (opts.speed > 0 ? opts.speed : 1) * (c.speed || 1), onStep: opts.onStep });
    return true;
  };

  /** CONTRATO: extra. Carga un ejercicio sin reproducirlo (para seek). */
  Figure.prototype.loadExercise = function (id) {
    var E = SB.visual.exercises;
    if (!E || !E.has(id) || !E.clip(id)) return false;
    this._clip = E.clip(id);
    this._playing = false;
    if (this._raf) { caf(this._raf); this._raf = null; }
    return true;
  };

  Figure.prototype._play = function (clip, opts) {
    opts = opts || {};
    if (this._destroyed) return;
    this._clip = clip;
    this._loop = opts.loop !== false;
    // reduced motion: más lento y como mucho 3 repeticiones
    this._loopMax = this.reduced ? 3 : Infinity;
    this._speed = this.baseSpeed * (this.reduced ? 0.6 : 1) * (opts.speed > 0 ? opts.speed : 1);
    this._loops = 0;
    this._step = -1;
    this._onStep = typeof opts.onStep === 'function' ? opts.onStep : null;
    this._start = now();
    this._lastT = 0;
    this._playing = true;
    if (this._raf) { caf(this._raf); this._raf = null; }
    this._schedule();
  };

  Figure.prototype._schedule = function () {
    if (this._destroyed || this._raf) return;
    this._raf = raf(this._tick);
  };

  Figure.prototype._tick = function (ts) {
    this._raf = null;
    if (this._destroyed || !this._playing || !this._clip) return;
    // canvas fuera del DOM: se para el bucle (el ResizeObserver lo reanuda si vuelve)
    if (!this.canvas.isConnected) return;
    var clip = this._clip, dur = clip.duration || 1;
    var t = (now() - this._start) * this._speed;
    var finished = false;
    if (t >= dur) {
      var n = Math.floor(t / dur);
      if (this._loop && this._loops + n < this._loopMax) {
        this._loops += n;
        t = t - n * dur;
        this._start = now() - t / this._speed;
        this._step = -1;
      } else {
        t = dur;
        finished = true;
      }
    }
    this._lastT = t;
    this._notifyStep(t);
    if (this._visible) this._renderAt(t);
    if (finished) { this._playing = false; return; }
    if (this._visible) this._schedule();
  };

  Figure.prototype._notifyStep = function (t) {
    var steps = this._clip && this._clip.steps;
    if (!steps || !this._onStep) return;
    var idx = -1;
    for (var i = 0; i < steps.length; i++) if (t >= steps[i].t) idx = i;
    if (idx !== this._step) {
      this._step = idx;
      try { this._onStep(idx >= 0 ? steps[idx].index : -1, idx >= 0 ? steps[idx].id : null); } catch (e) { /* ignore */ }
    }
  };

  /** Detiene la animación y deja la figura en guardia. */
  Figure.prototype.stop = function () {
    this._playing = false;
    if (this._raf) { caf(this._raf); this._raf = null; }
    this._clip = null;
    this._lastT = 0;
    this._renderAt(0);
  };

  /**
   * CONTRATO: extra. Congela la animación cargada en el instante `ms` (o en `'peak'`, la pose clave)
   * sin bucle. Útil para miniaturas y para revisar poses. Sin clip cargado no hace nada.
   */
  Figure.prototype.seek = function (ms) {
    if (!this._clip) return;
    var t = ms === 'peak' ? (this._clip.peak || 0) : Math.max(0, Math.min(this._clip.duration || 0, +ms || 0));
    this._playing = false;
    if (this._raf) { caf(this._raf); this._raf = null; }
    this._lastT = t;
    this._renderAt(t);
  };

  /** CONTRATO: extra. Carga un clip sin reproducirlo (para seek). */
  Figure.prototype.load = function (id) {
    var P = SB.visual.poses;
    if (!P || !P.has(id)) return false;
    this._clip = P.clip(id);
    this._playing = false;
    if (this._raf) { caf(this._raf); this._raf = null; }
    return true;
  };

  Figure.prototype.setStance = function (s) {
    this.stance = s === 'zurdo' ? 'zurdo' : 'diestro';
    this._renderAt(this._lastT);
  };

  Figure.prototype.destroy = function () {
    this._destroyed = true;
    this._playing = false;
    if (this._raf) { caf(this._raf); this._raf = null; }
    if (this._ro) { this._ro.disconnect(); this._ro = null; }
    if (this._io) { this._io.disconnect(); this._io = null; }
    if (this._onWinResize) { window.removeEventListener('resize', this._onWinResize); this._onWinResize = null; }
    this._clip = null;
    this._onStep = null;
  };

  Figure.prototype._renderAt = function (t) {
    if (this._destroyed || !this._w) return;
    var v = this._viewFor(this._clip);
    if (v !== this._view) this._applyView(v);
    var P = SB.visual.poses;
    var pose = null;
    if (this._clip) pose = evaluate(this._clip, t);
    if (!pose && P && P.guardPose) pose = P.guardPose();
    this._draw(pose, this._clip, t);
  };

  // ───────────────────────── dibujo ─────────────────────────
  Figure.prototype._draw = function (pose, clip, t) {
    if (this.colors._light !== isLightTheme()) this.colors = this._palette();
    var ctx = this.ctx, C = this.colors, s = this._s;
    var dpr = this._dpr, w = this._w, h = this._h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!pose) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.stance === 'zurdo') { ctx.translate(w, 0); ctx.scale(-1, 1); }

    var self = this;
    var J = solve(pose);
    var X = rootFn(pose);
    function pr(q) { return self._project(X(q)); }

    var alpha = pose.a == null ? 1 : clamp(pose.a, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // ── suelo: sombra elíptica y huellas de la posición inicial
    var g, rx, ry, rot = 0;
    if (pose.pitch != null) {
      // ejercicios: sombra alargada entre la cabeza y los pies, siempre en el suelo (se ve el salto)
      var fa = this._project(X([J.head[0], 0, J.head[2]]));
      var fb = this._project(X([(J.lA[0] + J.rA[0]) / 2, 0, (J.lA[2] + J.rA[2]) / 2]));
      g = { x: (fa.x + fb.x) / 2, y: (fa.y + fb.y) / 2, k: (fa.k + fb.k) / 2 };
      rx = Math.hypot(fb.x - fa.x, fb.y - fa.y) / 2 + 0.3 * s * g.k;
      ry = 0.12 * s * g.k;
      rot = Math.atan2(fb.y - fa.y, fb.x - fa.x);
    } else {
      g = this._project(X([(J.lBall[0] + J.rBall[0] + J.pelvis[0] * 2) / 4, 0, (J.lBall[2] + J.rBall[2] + J.pelvis[2] * 2) / 4]));
      rx = 0.5 * s * g.k; ry = rx * 0.26;
    }
    var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    grad.addColorStop(0, rgb(C.shadow, C._light ? 0.3 : 0.2));
    grad.addColorStop(1, rgb(C.shadow, 0));
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(rot);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (clip && clip.footprints) this._drawFootprints(clip.footprints, t);
    if (clip && clip.spots) this._drawSpots(clip.spots);

    // ── primitivas ordenadas por profundidad
    var P = {};
    var names = ['pelvis', 'neck', 'head', 'lS', 'rS', 'lH', 'rH', 'lE', 'lG', 'rE', 'rG', 'lK', 'rK', 'lA', 'rA', 'lHeel', 'rHeel', 'lToe', 'rToe'];
    for (var i = 0; i < names.length; i++) P[names[i]] = pr(J[names[i]]);
    var zc = (P.pelvis.z + P.neck.z) / 2;
    var prims = [];
    // el tono (cercano/alejado) se calcula por miembro completo para que muslo y tibia no desentonen
    function seg(a, b, wm, bias, sz) {
      prims.push({ t: 'seg', a: a, b: b, w: wm, z: (a.z + b.z) / 2 + (bias || 0), sz: sz });
    }
    var zl = (P.lH.z + P.lK.z + P.lA.z) / 3, zr = (P.rH.z + P.rK.z + P.rA.z) / 3;
    var zal = (P.lS.z + P.lE.z) / 2, zar = (P.rS.z + P.rE.z) / 2;
    seg(P.lH, P.lK, RIG.wThigh, 0, zl); seg(P.lK, P.lA, RIG.wShin, 0, zl); seg(P.lHeel, P.lToe, RIG.wFoot, -0.02, zl);
    seg(P.rH, P.rK, RIG.wThigh, 0, zr); seg(P.rK, P.rA, RIG.wShin, 0, zr); seg(P.rHeel, P.rToe, RIG.wFoot, -0.02, zr);
    // tronco: caderas, cintura algo más estrecha y hombros
    var sTop = madd(J.neck, J.spine, -RIG.shoulderDrop);
    function waist(hip, sh) {
      var m = add(mul(J.pelvis, 0.55), mul(sTop, 0.45));
      var e = add(mul(hip, 0.55), mul(sh, 0.45));
      return pr(add(m, mul(sub(e, m), 0.84)));
    }
    var lW = waist(J.lH, J.lS), rW = waist(J.rH, J.rS);
    prims.push({ t: 'torso', pts: [P.lH, P.rH, rW, P.rS, P.lS, lW], z: (P.lH.z + P.rH.z + P.rS.z + P.lS.z) / 4 });
    seg(P.neck, P.head, RIG.wNeck, -0.05);
    seg(P.lS, P.lE, RIG.wUpper, 0, zal); seg(P.lE, P.lG, RIG.wFore, 0.01, zal);
    seg(P.rS, P.rE, RIG.wUpper, 0, zar); seg(P.rE, P.rG, RIG.wFore, 0.01, zar);
    prims.push({ t: 'glove', c: P.lG, lead: true, z: P.lG.z + 0.03 });
    prims.push({ t: 'glove', c: P.rG, lead: false, z: P.rG.z + 0.03 });
    var jaw = pr(madd(madd(J.head, J.face, 0.035), J.up, -0.045));
    prims.push({ t: 'head', c: P.head, jaw: jaw, z: P.head.z });
    prims.sort(function (a, b) { return a.z - b.z; });

    var ol = Math.max(1, s * 0.012);
    for (i = 0; i < prims.length; i++) {
      var q = prims[i];
      var shade = clamp(((q.sz != null ? q.sz : q.z) - zc) / 0.3, -1, 1);
      var col = rgb(mixc(C.far, C.near, (shade + 1) / 2));
      if (q.t === 'seg') {
        var k = (q.a.k + q.b.k) / 2;
        var lw = Math.max(1.5, q.w * s * k);
        ctx.strokeStyle = C.outline;
        ctx.lineWidth = lw + ol * 2;
        ctx.beginPath(); ctx.moveTo(q.a.x, q.a.y); ctx.lineTo(q.b.x, q.b.y); ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(q.a.x, q.a.y); ctx.lineTo(q.b.x, q.b.y); ctx.stroke();
      } else if (q.t === 'torso') {
        var tw = Math.max(2, RIG.wTorso * s * q.pts[0].k);
        ctx.beginPath();
        ctx.moveTo(q.pts[0].x, q.pts[0].y);
        for (var j = 1; j < q.pts.length; j++) ctx.lineTo(q.pts[j].x, q.pts[j].y);
        ctx.closePath();
        ctx.strokeStyle = C.outline; ctx.lineWidth = tw + ol * 2; ctx.stroke();
        ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = tw;
        ctx.fill(); ctx.stroke();
      } else if (q.t === 'glove') {
        var gr = Math.max(2.5, RIG.gloveR * s * q.c.k);
        ctx.beginPath(); ctx.arc(q.c.x, q.c.y, gr, 0, Math.PI * 2);
        ctx.fillStyle = q.lead ? C.lead : C.rear; ctx.fill();
        ctx.lineWidth = ol * 1.2; ctx.strokeStyle = C.outline; ctx.stroke();
        if (shade < 0) { // guante alejado: algo más oscuro
          ctx.fillStyle = 'rgba(0,0,0,' + (0.22 * -shade).toFixed(3) + ')';
          ctx.fill();
        }
      } else if (q.t === 'head') {
        var hr = Math.max(3, RIG.headR * s * q.c.k);
        var hcol = rgb(C.head);
        ctx.fillStyle = hcol; ctx.strokeStyle = C.outline; ctx.lineWidth = ol * 2;
        ctx.beginPath(); ctx.arc(q.c.x, q.c.y, hr, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(q.jaw.x, q.jaw.y, hr * 0.66, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(q.c.x, q.c.y, hr, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(q.jaw.x, q.jaw.y, hr * 0.66, 0, Math.PI * 2); ctx.fill();
      }
    }

    // ── capas explicativas
    if (clip) {
      this._drawOverlays(clip, t, pose, J, P);
    }
    ctx.globalAlpha = 1;
  };

  Figure.prototype._drawFootprints = function (fp, t) {
    var ctx = this.ctx, s = this._s;
    if (t < (fp.t0 || 0) || t > (fp.t1 || Infinity)) return;
    var X = rootFn(fp.root || {});
    ctx.save();
    // línea de ataque en el suelo (hacia el rival): distingue pasos adelante/atrás de laterales
    var la = this._project(X([0.0, 0, -0.55])), lb = this._project(X([0.0, 0, 1.05]));
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgb(this.colors.shadow, 0.55);
    ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
    var ang0 = Math.atan2(lb.y - la.y, lb.x - la.x), hs0 = Math.max(4, s * 0.05);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(lb.x + Math.cos(ang0) * hs0, lb.y + Math.sin(ang0) * hs0);
    ctx.lineTo(lb.x + Math.cos(ang0 + 2.4) * hs0, lb.y + Math.sin(ang0 + 2.4) * hs0);
    ctx.lineTo(lb.x + Math.cos(ang0 - 2.4) * hs0, lb.y + Math.sin(ang0 - 2.4) * hs0);
    ctx.closePath();
    ctx.fillStyle = rgb(this.colors.shadow, 0.55);
    ctx.fill();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = rgb(this.colors.shadow, 0.7);
    for (var i = 0; i < fp.feet.length; i++) {
      var f = fp.feet[i];
      var yaw = f[2] * DEG, dir = [Math.sin(yaw), 0, Math.cos(yaw)];
      var a = this._project(X([f[0] + dir[0] * 0.05, 0, f[1] + dir[2] * 0.05]));
      var b = this._project(X([f[0] - dir[0] * 0.17, 0, f[1] - dir[2] * 0.17]));
      var cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      var ang = Math.atan2(b.y - a.y, b.x - a.x);
      var L = Math.max(4, Math.hypot(b.x - a.x, b.y - a.y) / 2 + 2);
      ctx.beginPath();
      ctx.ellipse(cx, cy, L, Math.max(2, 0.045 * s), ang, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  /** Marcas en el suelo de los ejercicios (puntos de apoyo o esquinas): círculos discontinuos. */
  Figure.prototype._drawSpots = function (sp) {
    var ctx = this.ctx, s = this._s, X = rootFn(sp.root || {});
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = rgb(this.colors.shadow, 0.75);
    for (var i = 0; i < sp.pts.length; i++) {
      var c = this._project(X([sp.pts[i][0], 0, sp.pts[i][1]]));
      var r = (sp.r || 0.1) * s * c.k;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, r, Math.max(2, r * 0.36), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  };

  function sampleQuad(a, c, b, n) {
    var out = [];
    for (var i = 0; i <= n; i++) {
      var e = i / n, u = 1 - e;
      out.push([u * u * a[0] + 2 * u * e * c[0] + e * e * b[0], u * u * a[1] + 2 * u * e * c[1] + e * e * b[1], u * u * a[2] + 2 * u * e * c[2] + e * e * b[2]]);
    }
    return out;
  }
  function samplePoly(pts, n) {
    var out = [], segs = pts.length - 1, per = Math.max(2, Math.round(n / segs));
    for (var s = 0; s < segs; s++) {
      for (var i = 0; i < per; i++) {
        var e = i / per, a = pts[s], b = pts[s + 1];
        out.push([a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e, a[2] + (b[2] - a[2]) * e]);
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  }

  Figure.prototype._drawOverlays = function (clip, t, pose, J, P) {
    var ctx = this.ctx, C = this.colors, s = this._s, self = this, i;
    var baseAlpha = ctx.globalAlpha;

    // fantasmas (finta: dónde llegaría el golpe)
    if (clip.ghosts) {
      for (i = 0; i < clip.ghosts.length; i++) {
        var gh = clip.ghosts[i];
        if (t < gh.t0 || t > gh.t1) continue;
        var ga = Math.min(1, (t - gh.t0) / 120, (gh.t1 - t) / 160);
        var gp = this._project(rootFn(gh.root || {})(gh.at));
        var gr = RIG.gloveR * s * gp.k;
        ctx.save();
        ctx.globalAlpha = baseAlpha * 0.85 * clamp(ga, 0, 1);
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = Math.max(1.5, s * 0.016);
        ctx.strokeStyle = gh.hand === 'r' ? C.mark : C.lead;
        ctx.beginPath(); ctx.arc(gp.x, gp.y, gr, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // flechas del golpe que llega (defensas)
    if (clip.arrows) {
      for (i = 0; i < clip.arrows.length; i++) {
        var ar = clip.arrows[i];
        if (t < ar.t0 || t > ar.t3) continue;
        var prog = clamp((t - ar.t0) / Math.max(1, ar.t1 - ar.t0), 0, 1);
        prog = prog * (0.6 + 0.4 * prog); // ligera aceleración
        var fade = t > ar.t2 ? 1 - (t - ar.t2) / Math.max(1, ar.t3 - ar.t2) : 1;
        var pts3 = ar.curve ? sampleQuad(ar.pts[0], ar.pts[1], ar.pts[2], 24) : samplePoly(ar.pts, 24);
        var X = rootFn(ar.root || {});
        var pts = pts3.map(function (q) { return self._project(X(q)); });
        var total = 0, d = [0];
        for (var j = 1; j < pts.length; j++) { total += Math.hypot(pts[j].x - pts[j - 1].x, pts[j].y - pts[j - 1].y); d.push(total); }
        var target = total * prog;
        var path = [pts[0]], tip = pts[0], prev = pts[0];
        for (j = 1; j < pts.length; j++) {
          if (d[j] <= target) { path.push(pts[j]); prev = pts[j - 1]; tip = pts[j]; }
          else {
            var f = (target - d[j - 1]) / Math.max(1e-6, d[j] - d[j - 1]);
            tip = { x: pts[j - 1].x + (pts[j].x - pts[j - 1].x) * f, y: pts[j - 1].y + (pts[j].y - pts[j - 1].y) * f };
            prev = pts[j - 1];
            path.push(tip);
            break;
          }
        }
        if (path.length < 2) continue;
        var lw = Math.max(2, s * 0.026);
        ctx.save();
        ctx.globalAlpha = baseAlpha * clamp(fade, 0, 1);
        ctx.lineCap = 'round';
        // halo para fondos claros y oscuros
        ctx.strokeStyle = C.halo; ctx.lineWidth = lw + 3;
        ctx.setLineDash([]);
        strokePath(ctx, path);
        ctx.strokeStyle = C.threat; ctx.lineWidth = lw;
        ctx.setLineDash([lw * 2.2, lw * 1.5]);
        strokePath(ctx, path);
        ctx.setLineDash([]);
        // punta
        var ang = Math.atan2(tip.y - prev.y, tip.x - prev.x);
        var hs = lw * 3.4;
        ctx.beginPath();
        ctx.moveTo(tip.x + Math.cos(ang) * hs * 0.55, tip.y + Math.sin(ang) * hs * 0.55);
        ctx.lineTo(tip.x + Math.cos(ang + 2.5) * hs, tip.y + Math.sin(ang + 2.5) * hs);
        ctx.lineTo(tip.x + Math.cos(ang - 2.5) * hs, tip.y + Math.sin(ang - 2.5) * hs);
        ctx.closePath();
        ctx.fillStyle = C.threat; ctx.strokeStyle = C.halo; ctx.lineWidth = 1.5;
        ctx.stroke(); ctx.fill();
        ctx.restore();
      }
    }

    // estela del guante que golpea: recta, arco (gancho) o subida (uppercut)
    if (clip.fx) {
      for (i = 0; i < clip.fx.length; i++) {
        var tr = clip.fx[i];
        if (tr.t0 == null || t < tr.t0 || t > tr.t + 360) continue;
        var tEnd = Math.min(t, tr.t);
        var tfade = t > tr.t ? 1 - (t - tr.t) / 360 : 1;
        if (tEnd - tr.t0 < 8) continue;
        var N = 18, tp = [];
        for (var q = 0; q <= N; q++) {
          var tt = tr.t0 + (tEnd - tr.t0) * q / N;
          var ps = evaluate(clip, tt);
          var js = solve(ps);
          tp.push(this._project(rootFn(ps)(tr.hand === 'r' ? js.rG : js.lG)));
        }
        // termina antes del guante para no taparlo
        var gpx = tr.hand === 'r' ? P.rG : P.lG;
        var cut = RIG.gloveR * s * gpx.k * 0.9;
        var trailCol = tr.hand === 'r' ? (C._light ? [79, 89, 102] : [236, 239, 243]) : [255, 90, 54];
        ctx.save();
        ctx.lineCap = 'round';
        for (q = 1; q < tp.length; q++) {
          var a0 = tp[q - 1], a1 = tp[q];
          if (Math.hypot(a1.x - gpx.x, a1.y - gpx.y) < cut) break;
          if (q < 3) continue; // sin estela junto a la cara
          var f = q / N;
          ctx.globalAlpha = baseAlpha * tfade * (0.18 + 0.6 * f);
          ctx.strokeStyle = rgb(trailCol);
          ctx.lineWidth = Math.max(1.5, RIG.gloveR * s * a1.k * (0.4 + 1.1 * f));
          ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(a1.x, a1.y); ctx.stroke();
        }
        ctx.restore();
      }
    }

    // impacto: anillo breve alrededor del guante
    if (clip.fx) {
      for (i = 0; i < clip.fx.length; i++) {
        var fx = clip.fx[i];
        var dt = t - fx.t;
        if (dt < 0 || dt > 240) continue;
        var e = dt / 240;
        var c = fx.hand === 'r' ? P.rG : P.lG;
        var rr = RIG.gloveR * s * c.k * (1.25 + 1.3 * e);
        ctx.save();
        ctx.globalAlpha = baseAlpha * (1 - e) * 0.9;
        ctx.lineWidth = Math.max(1.5, s * 0.018);
        ctx.strokeStyle = C.halo;
        ctx.beginPath(); ctx.arc(c.x, c.y, rr + 1, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = fx.hand === 'r' ? C.rear : C.lead;
        ctx.beginPath(); ctx.arc(c.x, c.y, rr, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }
    }

    // marcas (pausa de ritmo)
    if (clip.marks) {
      for (i = 0; i < clip.marks.length; i++) {
        var m = clip.marks[i];
        if (t < m.t0 || t > m.t1) continue;
        var ma = Math.min(1, (t - m.t0) / 120, (m.t1 - t) / 120);
        if (m.type === 'pause') {
          var hp = P.head;
          var bh = Math.max(6, s * 0.11), bw = Math.max(2, s * 0.03), gap = Math.max(3, s * 0.035);
          var hr0 = RIG.headR * s * hp.k;
          var bx = hp.x - hr0 * 2.4, by = hp.y - hr0 * 1.4; // junto a la cabeza (no se corta arriba)
          ctx.save();
          ctx.globalAlpha = baseAlpha * clamp(ma, 0, 1);
          ctx.fillStyle = C.mark;
          ctx.fillRect(bx - gap / 2 - bw, by - bh / 2, bw, bh);
          ctx.fillRect(bx + gap / 2, by - bh / 2, bw, bh);
          ctx.restore();
        }
      }
    }
  };

  function strokePath(ctx, path) {
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (var i = 1; i < path.length; i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  }

  SB.visual.Figure = Figure;
  SB.visual.rig = {
    RIG: RIG,
    CAM: CAM,
    setCamera: setCamera,
    solve: solve,
    solveFoot: solveFoot,
    neckBase: neckBase,
    spineDir: spineDir,
    evaluate: evaluate,
    lerpPose: lerpPose,
    EASE: EASE,
    rootFn: rootFn
  };
})(window.SB = window.SB || {});
