/**
 * SOMBRA · js/vision/pose.js
 * ---------------------------------------------------------------------------
 * Cámara + MediaPipe Pose Landmarker (vendor/mediapipe), 100 % local.
 *
 *  - load(): carga bajo demanda los scripts de vendor/mediapipe (≈ 25 MB) y crea el
 *    detector en modo VIDEO (GPU; si falla, CPU). El WebAssembly y el modelo vienen en
 *    base64 dentro de .js para que funcione también con file:// (doble clic): se
 *    decodifican en memoria y el binario se entrega a MediaPipe con `Module.wasmBinary`.
 *  - openCamera(video, {deviceId, lastId}) / closeCamera(): getUserMedia sin audio. Si la
 *    cámara falla, no da imagen o la da negra, prueba las demás (las virtuales al final).
 *    closeCamera() detiene las pistas (se apaga la luz de la cámara).
 *  - describeError(e): mensaje y solución para el usuario, con el código del error.
 *  - Tracker: bucle con requestAnimationFrame que procesa cada fotograma nuevo del vídeo
 *    solo mientras `active` es true y llama a onFrame({t, lm, wl, w, h}).
 *
 * Privacidad: no se usa MediaRecorder ni se guarda ningún fotograma; nada sale del
 * dispositivo (no hay peticiones de red: todo se carga de la carpeta de la app).
 */
(function (SB) {
  'use strict';

  const BASE = 'vendor/mediapipe/';
  let loading = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
      document.head.appendChild(s);
    });
  }

  function b64ToBytes(b64) {
    const bin = atob(b64);
    const n = bin.length;
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  /** ms por detección a partir del cual se prueba la CPU. */
  const SLOW_MS = 70;
  let benchTs = 0;
  /** Tiempo medio (ms) de detección sobre una imagen vacía, sin contar el calentamiento. */
  function bench(lm) {
    const c = document.createElement('canvas');
    c.width = 320; c.height = 240;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#556'; ctx.fillRect(0, 0, 320, 240);
    let total = 0;
    for (let i = 0; i < 4; i++) {
      benchTs = Math.max(benchTs + 1, performance.now());
      const t0 = performance.now();
      try { lm.detectForVideo(c, benchTs); } catch (e) { return 9999; }
      if (i >= 2) total += performance.now() - t0;
    }
    return Math.round(total / 2);
  }

  function supported() {
    return typeof window !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) &&
      typeof WebAssembly === 'object' && typeof atob === 'function';
  }

  /**
   * Carga MediaPipe y crea el detector (una sola vez por página).
   * @param {(msg: string) => void} [onStatus]
   * @returns {Promise<object>} PoseLandmarker
   */
  function load(onStatus) {
    if (loading) return loading;
    const say = typeof onStatus === 'function' ? onStatus : function () {};
    loading = (async function () {
      say('Cargando el detector de postura…');
      if (!window.Vision) await loadScript(BASE + 'vision_bundle.js');
      if (!window.SB_MP_WASM_B64) await loadScript(BASE + 'vision_wasm_internal.wasm.js');
      if (!window.SB_MP_POSE_B64) await loadScript(BASE + 'pose_landmarker_lite.task.js');
      if (!window.Vision || !window.Vision.PoseLandmarker) throw new Error('MediaPipe no está disponible');
      const wasm = b64ToBytes(window.SB_MP_WASM_B64);
      const model = b64ToBytes(window.SB_MP_POSE_B64);
      window.SB_MP_WASM_B64 = null;
      window.SB_MP_POSE_B64 = null;
      // El cargador se inyecta aquí con un <script> normal: MediaPipe lo pediría con CORS, y con
      // file:// el navegador lo bloquea. Con wasmLoaderPath vacío, MediaPipe usa self.ModuleFactory.
      // El WebAssembly se compila aquí (desde memoria) y se entrega con el gancho de Emscripten
      // `instantiateWasm`: así MediaPipe no intenta leer el .wasm con fetch.
      const fileset = { wasmLoaderPath: '', wasmBinaryPath: BASE + 'vision_wasm_internal.wasm' };
      const compiled = await WebAssembly.compile(wasm);
      let instErr = null;
      const prepare = async function () {
        if (!window.ModuleFactory) await loadScript(BASE + 'vision_wasm_internal.js?' + Date.now());
        instErr = null;
        window.Module = {
          instantiateWasm: function (imports, ok) {
            WebAssembly.instantiate(compiled, imports).then(function (inst) { ok(inst); }, function (e) { instErr = e; });
            return {};
          }
        };
      };
      const create = function (delegate) {
        return Promise.race([
          window.Vision.PoseLandmarker.createFromOptions(fileset, options(delegate)),
          new Promise(function (_, reject) {
            const t0 = Date.now();
            const iv = setInterval(function () {
              if (instErr || Date.now() - t0 > 45000) { clearInterval(iv); reject(instErr || new Error('El detector tarda demasiado en arrancar')); }
            }, 250);
          })
        ]);
      };
      const options = function (delegate) {
        return {
          baseOptions: { modelAssetBuffer: model, delegate: delegate },
          runningMode: 'VIDEO', numPoses: 1,
          minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5
        };
      };
      say('Preparando el análisis…');
      let lm = null, delegate = 'GPU';
      try {
        await prepare();
        lm = await create('GPU');
      } catch (e) {
        console.warn('[SOMBRA] Detector con GPU no disponible; se usa la CPU.', e);
        delegate = 'CPU';
        await prepare();
        lm = await create('CPU');
      }
      lm._sbDelegate = delegate;
      lm._sbMs = bench(lm);
      // Con una GPU lenta (o sin aceleración) la CPU suele ir mejor: se prueba y se queda la más rápida.
      if (delegate === 'GPU' && lm._sbMs > SLOW_MS) {
        try {
          await prepare();
          const cpu = await create('CPU');
          cpu._sbDelegate = 'CPU';
          cpu._sbMs = bench(cpu);
          if (cpu._sbMs < lm._sbMs) { try { lm.close(); } catch (e) { /* noop */ } lm = cpu; }
          else { try { cpu.close(); } catch (e) { /* noop */ } }
        } catch (e) { console.warn('[SOMBRA] Detector con CPU no disponible', e); }
      }
      return lm;
    })().catch(function (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      err.sbStage = 'detector';
      throw err;
    });
    loading.catch(function () { loading = null; });
    return loading;
  }

  // ------------------------------------------------------------------ cámaras
  // Muchos portátiles tienen, además de la webcam, cámaras virtuales (LG Glance/Mirametrix, OBS,
  // NVIDIA Broadcast…). Si el navegador elige una de esas por defecto, la cámara «no funciona»:
  // da error o imagen negra. Por eso se prueban las cámaras de una en una, las reales primero.
  const VIRTUAL_RE = /virtual|mirametrix|\bobs\b|snap ?camera|manycam|xsplit|droidcam|iriun|epoccam|broadcast|\bndi\b|mmhmm|e2esoft|splitcam|youcam|camtwist/i;
  /** Errores con los que no tiene sentido probar otra cámara (permiso o navegador). */
  const STOP_ERRORS = { NotAllowedError: 1, PermissionDeniedError: 1, SecurityError: 1, TypeError: 1 };

  function camError(name, message) {
    const e = new Error(message || name);
    e.name = name;
    return e;
  }

  /** Cámaras disponibles: [{deviceId, label, virtual}]. Sin permiso, el navegador no da los nombres. */
  function listCameras() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return Promise.resolve([]);
    return navigator.mediaDevices.enumerateDevices().then(function (all) {
      return all.filter(function (d) { return d.kind === 'videoinput'; }).map(function (d, i) {
        return { deviceId: d.deviceId || '', label: d.label || ('Cámara ' + (i + 1)), named: !!d.label, virtual: VIRTUAL_RE.test(d.label || '') };
      });
    }, function () { return []; });
  }

  /**
   * Orden en que se prueban las cámaras: la elegida en Ajustes, la última que funcionó, las reales
   * y, al final, las virtuales. Se quitan las que ya se han probado y las que no tienen id.
   */
  function orderCameras(list, prefer, skip) {
    const seen = {};
    (skip || []).forEach(function (id) { seen[id] = 1; });
    const rank = function (c) { return prefer.indexOf(c.deviceId) !== -1 ? prefer.indexOf(c.deviceId) - 10 : (c.virtual ? 1 : 0); };
    return list.filter(function (c) { return c.deviceId && !seen[c.deviceId]; })
      .map(function (c, i) { return { c: c, r: rank(c), i: i }; })
      .sort(function (a, b) { return a.r - b.r || a.i - b.i; })
      .map(function (x) { return x.c; });
  }

  function constraintsFor(deviceId) {
    const v = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
    if (deviceId) v.deviceId = { exact: deviceId }; else v.facingMode = 'user';
    return { audio: false, video: v };
  }

  function attach(video, stream) {
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.srcObject = stream;
    const p = video.play();
    return p && p.then ? p.catch(function () { /* se comprueba con los fotogramas */ }) : Promise.resolve();
  }

  /** Brillo medio (0-255) del fotograma actual, en pequeño. */
  function brightness(video) {
    try {
      const c = document.createElement('canvas');
      c.width = 32; c.height = 24;
      const ctx = c.getContext('2d');
      ctx.drawImage(video, 0, 0, 32, 24);
      const d = ctx.getImageData(0, 0, 32, 24).data;
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      return s / (d.length / 4);
    } catch (e) { return 128; }
  }

  /** Espera a que lleguen fotogramas: {frames, black}. */
  function waitFrames(video, timeoutMs) {
    return new Promise(function (resolve) {
      const t0 = Date.now();
      let firstT = -1, firstAt = 0;
      const iv = setInterval(function () {
        const ready = video.readyState >= 2 && video.videoWidth > 0;
        if (ready && firstT < 0) { firstT = video.currentTime; firstAt = Date.now(); }
        // Con imagen: un fotograma nuevo o ~0,6 s con imagen. Se mira el brillo dos veces por si tarda en encenderse.
        if (ready && (video.currentTime !== firstT || Date.now() - firstAt > 600)) {
          const b1 = brightness(video);
          if (b1 > 6) { clearInterval(iv); resolve({ frames: true, black: false }); return; }
          if (Date.now() - firstAt > 1800) { clearInterval(iv); resolve({ frames: true, black: true }); return; }
        }
        if (Date.now() - t0 > timeoutMs) { clearInterval(iv); resolve({ frames: ready, black: ready }); }
      }, 120);
    });
  }

  function stopStream(stream) {
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ya cerrada */ }
  }

  /**
   * Abre una cámara en el <video> indicado (sin audio), probando otra si la primera falla, no da
   * imagen o la da negra. opts: {deviceId (elegida en Ajustes), lastId (última que funcionó),
   * timeoutMs}. Devuelve {stream, deviceId, label, virtual, black, tried}. Si ninguna funciona,
   * rechaza con el error más útil (con e.tried = cámaras probadas).
   */
  function openCamera(video, opts) {
    opts = opts || {};
    const timeoutMs = opts.timeoutMs || 5000;
    const tried = [];
    const errors = [];
    /** Mejor resultado «regular» (virtual o negra) por si no aparece nada mejor. */
    let fallback = null;
    const score = function (x) { return (x.black ? 2 : 0) + (x.virtual ? 1 : 0); };
    function keepFallback(r) {
      if (!fallback || score(r) < score(fallback)) { if (fallback) stopStream(fallback.stream); fallback = r; }
      else stopStream(r.stream);
      video.srcObject = null;
    }

    function attempt(deviceId) {
      return navigator.mediaDevices.getUserMedia(constraintsFor(deviceId)).then(function (stream) {
        const track = stream.getVideoTracks()[0];
        const st = track && track.getSettings ? track.getSettings() : {};
        const id = st.deviceId || deviceId || '';
        const label = (track && track.label) || '';
        tried.push(id || 'default');
        return attach(video, stream).then(function () { return waitFrames(video, timeoutMs); }).then(function (r) {
          const res = { stream: stream, deviceId: id, label: label, virtual: VIRTUAL_RE.test(label), black: r.black, tried: tried };
          if (!r.frames) { stopStream(stream); video.srcObject = null; errors.push(camError('NoFramesError', 'La cámara no da imagen')); return null; }
          return res;
        });
      }, function (e) {
        tried.push(deviceId || 'default');
        errors.push(e);
        if (STOP_ERRORS[e && e.name]) throw e;
        return null;
      });
    }

    /** Prueba en orden; se queda con la primera que da imagen no negra (o con la negra, si no hay otra). */
    function tryList(ids) {
      if (!ids.length) return Promise.resolve(null);
      return attempt(ids[0]).then(function (r) {
        if (r && !r.black && !(r.virtual && ids.length > 1)) return r;
        if (r) keepFallback(r); // negra o virtual: se guarda por si no hay nada mejor
        return tryList(ids.slice(1));
      });
    }

    if (!supported()) return Promise.reject(camError('UnsupportedError', 'El navegador no permite usar la cámara'));
    const first = opts.deviceId ? [opts.deviceId] : (opts.lastId ? [opts.lastId] : []);
    return tryList(first).then(function (r) {
      if (r) return r;
      // La que elija el navegador (pide permiso la primera vez).
      return attempt(null).then(function (d) {
        if (d && !d.black && !d.virtual) return d;
        if (d) keepFallback(d);
        // Con permiso ya concedido se ven todas: se prueban las demás.
        return listCameras().then(function (list) {
          const prefer = [opts.deviceId, opts.lastId].filter(Boolean);
          return tryList(orderCameras(list, prefer, tried).map(function (c) { return c.deviceId; }));
        });
      });
    }).then(function (r) {
      if (r) { if (fallback && fallback !== r) stopStream(fallback.stream); return r; }
      if (fallback) { const f = fallback; return attach(video, f.stream).then(function () { return f; }); }
      // Ninguna: el error más informativo (permiso > ocupada > sin imagen > no encontrada).
      const order = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError', 'NotReadableError', 'TrackStartError', 'AbortError', 'NoFramesError', 'OverconstrainedError', 'NotFoundError', 'DevicesNotFoundError'];
      errors.sort(function (a, b) {
        const ia = order.indexOf(a && a.name), ib = order.indexOf(b && b.name);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const e = errors[0] || camError('NotFoundError', 'No hay cámaras');
      e.tried = tried;
      throw e;
    });
  }

  /**
   * Texto para el usuario a partir de un error de cámara o del detector: {msg, fix, code}.
   * El código va entre paréntesis para poder buscarlo o contarlo.
   */
  function describeError(e) {
    const n = (e && e.name) || 'Error';
    const m = String((e && e.message) || '');
    const out = function (msg, fix) { return { msg: msg, fix: fix, code: n }; };
    if (e && e.sbStage === 'detector') return out('No se pudo cargar el detector de postura.', 'Recarga la página. Si vuelve a pasar, prueba en Chrome o Edge: el resto de la sesión funciona igual sin análisis.');
    if (n === 'NotAllowedError' || n === 'PermissionDeniedError') {
      if (/system/i.test(m)) return out('Windows no deja al navegador usar la cámara.', 'Configuración de Windows › Privacidad y seguridad › Cámara: activa «Acceso a la cámara» y el permiso de tu navegador. Después pulsa Reintentar.');
      return out('El navegador no tiene permiso para usar la cámara en esta página.', 'Pulsa el icono de la cámara o del candado junto a la dirección, elige «Permitir» y pulsa Reintentar. Si no aparece, búscalo en los ajustes de permisos del navegador.');
    }
    if (n === 'SecurityError') return out('El navegador bloquea la cámara en esta dirección.', 'Abre SOMBRA con iniciar.bat (http://localhost:8642) o desde su enlace https.');
    if (n === 'UnsupportedError' || n === 'TypeError') return out('Este navegador no permite usar la cámara aquí.', 'Prueba en Chrome o Edge, abriendo SOMBRA con iniciar.bat o desde su enlace https.');
    if (n === 'NotReadableError' || n === 'TrackStartError' || n === 'AbortError') return out('La cámara no arranca: puede que otra aplicación la esté usando.', 'Cierra Zoom, Teams, la app Cámara y otras pestañas que usen la cámara, y pulsa Reintentar. Si tienes varias cámaras, elige otra en Ajustes › Análisis por cámara.');
    if (n === 'NoFramesError') return out('La cámara se abre, pero no da imagen.', 'Comprueba que no tenga la tapa puesta ni esté apagada con una tecla del portátil. Si tienes varias cámaras, elige otra en Ajustes › Análisis por cámara.');
    if (n === 'NotFoundError' || n === 'DevicesNotFoundError' || n === 'OverconstrainedError') return out('No se encuentra ninguna cámara.', 'Comprueba que esté conectada y activada (algunos portátiles la apagan con una tecla o una tapa).');
    return out('No se pudo iniciar la cámara.', 'Pulsa Reintentar. Si vuelve a pasar, prueba en Chrome o Edge.');
  }

  function closeCamera(video, stream) {
    try { if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* ya cerrada */ }
    if (video) { try { video.pause(); } catch (e) { /* noop */ } video.srcObject = null; }
  }

  /**
   * Bucle de detección.
   * @param {HTMLVideoElement} video
   * @param {object} landmarker
   * @param {(frame) => void} onFrame
   */
  function Tracker(video, landmarker, onFrame) {
    this.video = video;
    this.lm = landmarker;
    this.onFrame = onFrame;
    this.active = false;
    this.running = false;
    this.lastVideoTime = -1;
    this.lastTs = 0;
    this.errors = 0;
    this.fps = 0;
    this._raf = 0;
    this._count = 0;
    this._fpsT = 0;
  }
  Tracker.prototype.start = function () {
    if (this.running) return;
    this.running = true;
    const self = this;
    const loop = function () {
      if (!self.running) return;
      self._tick();
      self._raf = requestAnimationFrame(loop);
    };
    this._raf = requestAnimationFrame(loop);
  };
  Tracker.prototype.stop = function () {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  };
  Tracker.prototype._tick = function () {
    const v = this.video;
    if (!this.active || !v || v.readyState < 2 || !v.videoWidth) return;
    if (v.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = v.currentTime;
    let ts = performance.now();
    if (ts <= this.lastTs) ts = this.lastTs + 1;
    this.lastTs = ts;
    let res = null;
    try { res = this.lm.detectForVideo(v, ts); } catch (e) { this.errors++; if (this.errors < 3) console.warn('[SOMBRA] detectForVideo', e); return; }
    this._count++;
    if (ts - this._fpsT > 1000) { this.fps = Math.round(this._count * 1000 / (ts - this._fpsT || 1)); this._count = 0; this._fpsT = ts; }
    const lm = res && res.landmarks && res.landmarks[0];
    const wl = res && res.worldLandmarks && res.worldLandmarks[0];
    try { this.onFrame({ t: ts / 1000, lm: lm || null, wl: wl || null, w: v.videoWidth, h: v.videoHeight }); }
    catch (e) { this.errors++; if (this.errors < 3) console.error('[SOMBRA] análisis', e); }
  };

  /** Si se te ve entero (para colocarse): texto corto a partir de los puntos. */
  function framingText(lm) {
    const seen = function (i) { return lm && lm[i] && (lm[i].visibility == null || lm[i].visibility > 0.5); };
    if (!lm) return 'No te veo';
    if (!(seen(0) && seen(11) && seen(12) && seen(23) && seen(24))) return 'No se te ve el tronco';
    if (!(seen(27) && seen(28))) return 'Aléjate: no se te ven los pies';
    return 'Te veo entero';
  }

  /** Conexiones para dibujar el esqueleto (índices BlazePose). */
  const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16], [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28], [27, 31], [28, 32], [7, 0], [0, 8], [9, 10]];

  /** Dibuja los puntos en un canvas del tamaño del vídeo. */
  function drawSkeleton(canvas, lm, color) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (!lm) return;
    ctx.lineWidth = Math.max(2, W / 160);
    ctx.strokeStyle = color || '#FF5A36';
    ctx.fillStyle = '#FFFFFF';
    BONES.forEach(function (b) {
      const a = lm[b[0]], c = lm[b[1]];
      if (!a || !c || (a.visibility != null && a.visibility < 0.4) || (c.visibility != null && c.visibility < 0.4)) return;
      ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(c.x * W, c.y * H); ctx.stroke();
    });
    [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28].forEach(function (i) {
      const p = lm[i];
      if (!p || (p.visibility != null && p.visibility < 0.4)) return;
      ctx.beginPath(); ctx.arc(p.x * W, p.y * H, ctx.lineWidth * 1.2, 0, Math.PI * 2); ctx.fill();
    });
  }

  SB.vision = SB.vision || {};
  SB.vision.pose = {
    supported: supported, load: load, openCamera: openCamera, closeCamera: closeCamera,
    listCameras: listCameras, orderCameras: orderCameras, describeError: describeError, isVirtual: function (label) { return VIRTUAL_RE.test(label || ''); },
    Tracker: Tracker, drawSkeleton: drawSkeleton, framingText: framingText
  };
})(window.SB = window.SB || {});
