#!/usr/bin/env node
/**
 * SOMBRA · tests/run-node-tests.js
 * ---------------------------------------------------------------------------
 * Ejecuta las pruebas del motor en Node, sin dependencias:
 *
 *   node tests/run-node-tests.js                 fixtures + datos reales (si existen los 4 archivos)
 *   node tests/run-node-tests.js --data=fixtures solo fixtures
 *   node tests/run-node-tests.js --data=real     solo datos reales
 *   node tests/run-node-tests.js --filter=texto  solo pruebas cuyo nombre contenga «texto»
 *
 * Cada instancia de la app se carga en un contexto `vm` propio con `window` =
 * contexto y un `localStorage` simulado. `env.reload()` crea otro contexto que
 * comparte el mismo localStorage (equivale a recargar la página).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_FILES = ['movements.js', 'combinations.js', 'hiit.js', 'goals.js'];
const MODULES = [
  'js/core/storage.js',
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
  // animaciones (sin dibujar): comprobación de clips de técnicas y de ejercicios HIIT
  'js/visual/figure.js',
  'js/visual/poses.js',
  'js/visual/exercises.js',
  // análisis por cámara (sin cámara ni MediaPipe: cuerpo sintético)
  'js/vision/analyzer.js',
  'js/vision/coach.js',
  // cámara: solo las funciones puras (orden de cámaras y mensajes de error)
  'js/vision/pose.js',
  // clips (sin canvas: solo las frases de cada momento) y voz (elección de la voz)
  'js/vision/clips.js',
  'js/audio/voice.js',
  // vídeos de YouTube recomendados en el informe
  'data/videos.js'
];

/** localStorage simulado (misma interfaz que el del navegador). */
class MockStorage {
  constructor() { this._m = new Map(); }
  getItem(k) { return this._m.has(String(k)) ? this._m.get(String(k)) : null; }
  setItem(k, v) { this._m.set(String(k), String(v)); }
  removeItem(k) { this._m.delete(String(k)); }
  key(i) { return Array.from(this._m.keys())[i] || null; }
  clear() { this._m.clear(); }
  get length() { return this._m.size; }
}

const codeCache = new Map();
function read(abs) {
  if (!codeCache.has(abs)) codeCache.set(abs, fs.readFileSync(abs, 'utf8'));
  return codeCache.get(abs);
}

/** Carga una instancia completa de la app en un contexto nuevo. */
function loadApp(dataDir, storage) {
  const ctx = { console: console };
  ctx.window = ctx;
  ctx.localStorage = storage;
  vm.createContext(ctx);
  const files = [path.join(ROOT, 'js/core/util.js')]
    .concat(DATA_FILES.map((f) => path.join(dataDir, f)))
    .concat(MODULES.map((f) => path.join(ROOT, f)));
  for (const abs of files) vm.runInContext(read(abs), ctx, { filename: abs });
  return ctx.SB;
}

function makeEnv(name, dataDir) {
  const storage = new MockStorage();
  const env = {
    dataName: name,
    isNode: true,
    SB: loadApp(dataDir, storage),
    /** Borra todos los datos guardados y devuelve la instancia actual. */
    fresh() { env.SB.storage.resetAll(); return env.SB; },
    /** Nueva instancia que comparte el almacenamiento (recarga). */
    reload() { return loadApp(dataDir, storage); },
    /** Almacén bruto (para simular datos antiguos). */
    rawStorage() { return storage; }
  };
  return env;
}

function parseArgs() {
  const out = { data: 'all', filter: '' };
  process.argv.slice(2).forEach((a) => {
    const m = /^--(\w+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
  });
  return out;
}

async function main() {
  const args = parseArgs();
  // Arnés y especificaciones en el contexto principal (registran en globalThis.SBT).
  vm.runInThisContext(read(path.join(__dirname, 'harness.js')), { filename: 'harness.js' });
  const specDir = path.join(__dirname, 'specs');
  fs.readdirSync(specDir).filter((f) => f.endsWith('.test.js')).sort().forEach((f) => {
    const abs = path.join(specDir, f);
    vm.runInThisContext(read(abs), { filename: abs });
  });

  const datasets = [];
  if (args.data === 'all' || args.data === 'fixtures') datasets.push({ name: 'fixtures', dir: path.join(__dirname, 'fixtures') });
  const realDir = path.join(ROOT, 'data');
  const realOk = DATA_FILES.every((f) => fs.existsSync(path.join(realDir, f)));
  if (args.data === 'all' || args.data === 'real') {
    if (realOk) datasets.push({ name: 'datos reales', dir: realDir });
    else console.log('Aviso: faltan archivos en data/; solo se usan fixtures.');
  }

  let totalFailed = 0;
  const summary = [];
  for (const ds of datasets) {
    console.log('\n=== Pruebas con ' + ds.name + ' ===');
    let env;
    try { env = makeEnv(ds.name, ds.dir); } catch (e) {
      console.log('✗ No se pudo cargar la app con ' + ds.name + ': ' + (e.stack || e));
      totalFailed++;
      summary.push(ds.name + ': error de carga');
      continue;
    }
    let lastSuite = null;
    const res = await globalThis.SBT.run(env, {
      filter: args.filter,
      onResult(r) {
        if (r.suite !== lastSuite) { console.log('\n# ' + r.suite); lastSuite = r.suite; }
        console.log((r.ok ? '  ✓ ' : '  ✗ ') + r.name + (r.ms > 500 ? '  (' + r.ms + ' ms)' : ''));
        r.info.forEach((l) => console.log('      · ' + l));
        if (!r.ok) console.log('      ' + String(r.error).split('\n').slice(0, 6).join('\n      '));
      }
    });
    totalFailed += res.failed;
    summary.push(ds.name + ': ' + res.passed + ' pasadas, ' + res.failed + ' falladas');
  }
  console.log('\n=== Resumen ===');
  summary.forEach((l) => console.log('  ' + l));
  process.exitCode = totalFailed ? 1 : 0;
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
