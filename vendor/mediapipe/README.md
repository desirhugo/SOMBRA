# MediaPipe (detección de postura) — copia local

Solo se carga si activas **Ajustes → Análisis por cámara**. Funciona sin conexión y la imagen de la cámara no sale del dispositivo.

| Archivo | Origen | Notas |
|---|---|---|
| `vision_bundle.js` | npm `@mediapipe/tasks-vision@1.1.1` (vía cdn.jsdelivr.net) | Copia sin cambios. Define la variable global `Vision`. |
| `vision_wasm_internal.js` | ídem, carpeta `wasm/` | Copia sin cambios (cargador del WebAssembly). |
| `vision_wasm_internal.wasm.js` | ídem, `wasm/vision_wasm_internal.wasm` | El binario en base64 dentro de un `.js` (`window.SB_MP_WASM_B64`). |
| `pose_landmarker_lite.task.js` | `storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task` | Modelo BlazePose «lite» en base64 (`window.SB_MP_POSE_B64`). |
| `LICENSE` | github.com/google-ai-edge/mediapipe | Apache License 2.0. |

**Por qué base64:** abriendo `index.html` con doble clic (`file://`) el navegador no permite leer binarios con `fetch`, pero sí cargar `<script>`. `js/vision/pose.js` decodifica las dos cadenas en memoria y pasa el WebAssembly a MediaPipe mediante `Module.wasmBinary`.

**Regenerar** (por ejemplo, con otra versión): descarga los cuatro originales en una carpeta y ejecuta

```
node tools/vendor-mediapipe.js <carpeta>
```

Licencia: MediaPipe y sus modelos se distribuyen bajo Apache License 2.0 (ver `LICENSE`). Copyright The MediaPipe Authors.
