/**
 * SOMBRA · tools/vendor-mediapipe.js
 * ---------------------------------------------------------------------------
 * Prepara vendor/mediapipe/ a partir de los archivos originales de MediaPipe:
 *
 *   node tools/vendor-mediapipe.js <carpeta-con-los-originales>
 *
 * La carpeta debe contener (descargados de las fuentes oficiales):
 *   vision_bundle.js            npm @mediapipe/tasks-vision@1.1.1 (jsDelivr)
 *   vision_wasm_internal.js     ídem, carpeta wasm/
 *   vision_wasm_internal.wasm   ídem, carpeta wasm/
 *   pose_landmarker_lite.task   storage.googleapis.com/mediapipe-models/pose_landmarker/
 *                               pose_landmarker_lite/float16/latest/
 *
 * Por qué se convierten: con la app abierta con doble clic (file://) el navegador no deja
 * leer archivos binarios con fetch, pero sí cargar <script>. El .wasm y el modelo se
 * guardan como texto base64 dentro de un .js que define una variable global; js/vision/pose.js
 * los decodifica en memoria. Los dos .js de MediaPipe se copian tal cual.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) { console.error('Uso: node tools/vendor-mediapipe.js <carpeta-con-los-originales>'); process.exit(1); }
const out = path.join(__dirname, '..', 'vendor', 'mediapipe');
fs.mkdirSync(out, { recursive: true });

function b64js(file, globalName, outName) {
  const buf = fs.readFileSync(path.join(src, file));
  const body = '/* Generado por tools/vendor-mediapipe.js a partir de ' + file + ' (' + buf.length + ' bytes). No editar. */\n' +
    'window.' + globalName + '="' + buf.toString('base64') + '";\n';
  fs.writeFileSync(path.join(out, outName), body);
  console.log(outName, (body.length / 1048576).toFixed(1) + ' MB');
}

['vision_bundle.js', 'vision_wasm_internal.js'].forEach(function (f) {
  fs.copyFileSync(path.join(src, f), path.join(out, f));
  console.log(f, 'copiado');
});
b64js('vision_wasm_internal.wasm', 'SB_MP_WASM_B64', 'vision_wasm_internal.wasm.js');
b64js('pose_landmarker_lite.task', 'SB_MP_POSE_B64', 'pose_landmarker_lite.task.js');
