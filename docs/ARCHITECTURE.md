# SOMBRA — Arquitectura y contrato entre módulos

Este documento es el **contrato común** del proyecto. Todos los módulos (datos, motor, interfaz, animaciones) deben respetar los nombres, formatos y APIs definidos aquí. Si un módulo necesita algo que no está aquí, lo añade de forma compatible y lo documenta en su propio archivo con un comentario `// CONTRATO:`.

Nombre de la app: **SOMBRA · Shadow Boxing Trainer** (identidad propia; no copiar marcas ni interfaces de otras apps).
Idioma de la interfaz: español. Identificadores de código: inglés.

---

## 1. Principios técnicos

- HTML + CSS + JavaScript **sin dependencias, sin build, sin red**.
- Debe funcionar **abriendo `index.html` con doble clic (file://)** y también desde un servidor local (`iniciar.bat` → `python -m http.server`).
  - Por eso **no se usan módulos ES ni `fetch()` de JSON**: todo son scripts clásicos que registran piezas en el espacio de nombres global `window.SB`.
  - Los datos (movimientos, combinaciones, HIIT, objetivos) son literales JSON envueltos en un `.js`: `SB.data.movements = [ ... ];`
- Patrón de cada archivo:
  ```js
  (function (SB) {
    'use strict';
    // ...
    SB.modulo = { ... };
  })(window.SB = window.SB || {});
  ```
- Persistencia: `localStorage` (datos pequeños) con prefijo `sb.`; IndexedDB solo para vídeos que el usuario adjunte.
- Los módulos de lógica (`js/core`, `js/library`, `js/engine`, `js/calendar`, `js/training`) **no tocan el DOM** y deben poder ejecutarse en Node (pruebas) con un `window` simulado y un `localStorage` simulado.
- Sin calentamiento ni vuelta a la calma. Sin voz que nombre combinaciones. Sin estadísticas deportivas (solo calendario y rachas).

## 2. Estructura de archivos y propietarios

```
shadow-boxing-app/
  index.html                  [UI]
  manifest.webmanifest        [UI]
  sw.js                       [UI]  (service worker: solo actúa si se sirve por http/localhost)
  iniciar.bat                 [UI]  (lanza servidor local con Python si existe; si no, abre index.html)
  README.md                   [Coordinador]
  RESEARCH.md                 [Investigación]
  docs/ARCHITECTURE.md        [Coordinador]
  css/base.css                [UI]  tokens, fuentes, reset
  css/app.css                 [UI]  pantallas y componentes
  css/training.css            [UI]  pantalla de entrenamiento
  assets/fonts/*.woff2 + OFL.txt   [UI]
  assets/icons/*.svg          [UI]
  data/movements.js           [Datos]
  data/combinations.js        [Datos]
  data/hiit.js                [Datos]
  data/goals.js               [Datos]  (objetivos + focos)
  js/core/util.js             [Motor]
  js/core/storage.js          [Motor]
  js/core/mediaStore.js       [UI]
  js/library/notation.js      [Motor]
  js/library/library.js       [Motor]
  js/engine/grammar.js        [Motor]
  js/engine/comboGenerator.js [Motor]
  js/engine/history.js        [Motor]
  js/engine/selector.js       [Motor]
  js/engine/hiitEngine.js     [Motor]
  js/engine/sessionGenerator.js [Motor]
  js/engine/suggestions.js    [Motor]
  js/calendar/calendar.js     [Motor]
  js/training/timer.js        [Motor]
  js/training/player.js       [Motor]
  js/audio/sounds.js          [UI]
  js/visual/figure.js         [Animación]
  js/visual/poses.js          [Animación]
  js/visual/exercises.js      [Animación]  (ejercicios HIIT; añadido el 12-nov-2026)
  js/audio/voice.js           [UI]         (voz local de las indicaciones; 13-nov-2026)
  js/vision/analyzer.js       [Visión]     (análisis puro de los puntos de la postura; 13-nov-2026)
  js/vision/coach.js          [Visión]     (temas, avisos, resumen e informe; 13-nov-2026)
  js/vision/pose.js           [Visión]     (cámara + MediaPipe; 13-nov-2026)
  vendor/mediapipe/           [Visión]     (MediaPipe Tasks Vision 1.1.1 + pose_landmarker_lite, Apache 2.0)
  tools/vendor-mediapipe.js   [Visión]     (regenera vendor/mediapipe)
  js/visual/demo.js           [Animación]
  js/ui/components.js         [UI]
  js/ui/router.js             [UI]
  js/ui/screens/*.js          [UI]
  js/app.js                   [UI]
  tests/run-node-tests.js     [Motor]
  tests/specs/*.test.js       [Motor]
  tests/index.html            [Motor]  (ejecuta las mismas pruebas en el navegador)
  tests/visual-preview.html   [Animación]
```

### Orden de carga en `index.html` (scripts clásicos, en este orden)

```
js/core/util.js
data/movements.js
data/combinations.js
data/hiit.js
data/goals.js
js/core/storage.js
js/core/mediaStore.js
js/library/notation.js
js/library/library.js
js/engine/grammar.js
js/engine/comboGenerator.js
js/engine/history.js
js/engine/selector.js
js/engine/hiitEngine.js
js/engine/sessionGenerator.js
js/engine/suggestions.js
js/calendar/calendar.js
js/training/timer.js
js/training/player.js
js/audio/sounds.js
js/audio/voice.js
js/visual/figure.js
js/visual/poses.js
js/visual/exercises.js
js/visual/demo.js
js/vision/analyzer.js
js/vision/coach.js
js/vision/pose.js     (vendor/mediapipe/* se inyecta bajo demanda, solo con el análisis por cámara)
js/ui/components.js
js/ui/router.js
js/ui/screens/*.js   (en el orden que decida UI)
js/app.js
```

---

## 3. Notación de golpes (fija, no cambiar)

| Código | id | Golpe |
|---|---|---|
| 1 | `jab` | Jab (recto de la mano adelantada) |
| 2 | `cross` | Directo / cross (recto de la mano atrasada) |
| 3 | `lead_hook` | Gancho (hook) de la mano adelantada |
| 4 | `rear_hook` | Gancho (hook) de la mano atrasada |
| 5 | `lead_upper` | Uppercut de la mano adelantada |
| 6 | `rear_upper` | Uppercut de la mano atrasada |

- Números impares = mano adelantada; pares = mano atrasada. La numeración **no cambia** para zurdos; lo que cambia es la mano.
- Golpe al cuerpo = mismo número con sufijo `b` en datos (`1b`…`6b`, ids `jab_body`, `cross_body`, `lead_hook_body`, `rear_hook_body`, `lead_upper_body`, `rear_upper_body`). En pantalla se muestra el número grande con una marca pequeña «CUERPO» (no «1b»).
- Lados: los datos usan `lead` (adelantado) / `rear` (atrasado). La interfaz traduce a IZQ/DER según la guardia: diestro (ortodoxo) → adelantado = izquierda; zurdo → adelantado = derecha.
- Las técnicas que no son golpes se muestran con una palabra corta y, si procede, el lado: `SLIP der`, `ROLL izq`, `PULL`, `DUCK`, `BLOQ`, `CODO`, `PARADA der`, `HOMBRO`, `PASO ↑`, `PASO ↓`, `LATERAL izq`, `PIVOTE`, `ÁNGULO`, `AJUSTE`, `FINTA`, `AMAGO`, `PAUSA`.

### Catálogo de ids (Datos los crea con todo el detalle; los demás módulos los usan tal cual)

| id | short | categoría | subcategoría | nivel recomendado |
|---|---|---|---|---|
| `guard` | GUARDIA | base | guardia | basico (solo referencia; nunca aparece en combinaciones) |
| `jab` | 1 | golpe | recto | basico |
| `cross` | 2 | golpe | recto | basico |
| `lead_hook` | 3 | golpe | gancho | basico |
| `rear_hook` | 4 | golpe | gancho | avanzado |
| `lead_upper` | 5 | golpe | uppercut | basico |
| `rear_upper` | 6 | golpe | uppercut | basico |
| `jab_body` | 1 (CUERPO) | golpe | recto | basico |
| `cross_body` | 2 (CUERPO) | golpe | recto | basico |
| `lead_hook_body` | 3 (CUERPO) | golpe | gancho | basico |
| `rear_hook_body` | 4 (CUERPO) | golpe | gancho | avanzado |
| `lead_upper_body` | 5 (CUERPO) | golpe | uppercut | avanzado |
| `rear_upper_body` | 6 (CUERPO) | golpe | uppercut | avanzado |
| `block_high` | BLOQ | defensa | bloqueo | basico (ante curvos a la cabeza) |
| `block_body` | CODO | defensa | bloqueo | basico (ante golpes al cuerpo) |
| `parry_jab` | PARADA | defensa | parada | basico (mano atrasada desvía el jab) |
| `parry_cross` | PARADA | defensa | parada | avanzado (mano adelantada desvía el directo) |
| `slip_lead` | SLIP | defensa | esquiva lateral | basico (la cabeza termina sobre la rodilla adelantada) |
| `slip_rear` | SLIP | defensa | esquiva lateral | basico (la cabeza termina sobre la rodilla atrasada) |
| `roll_lead` | ROLL | defensa | esquiva rotatoria | avanzado (pasa bajo un curvo y termina en el lado adelantado) |
| `roll_rear` | ROLL | defensa | esquiva rotatoria | avanzado (termina en el lado atrasado) |
| `pull_back` | PULL | defensa | esquiva atrás | avanzado |
| `duck` | DUCK | defensa | agachada | avanzado (flexión de piernas; nunca por debajo de la cintura del rival: falta en World Boxing) |
| `shoulder_roll` | HOMBRO | defensa | bloqueo | avanzado |
| `step_in` | PASO ↑ | desplazamiento | paso | basico |
| `step_back` | PASO ↓ | desplazamiento | paso | basico |
| `lateral_lead` | LATERAL | desplazamiento | lateral | basico (hacia el lado adelantado) |
| `lateral_rear` | LATERAL | desplazamiento | lateral | basico (hacia el lado atrasado) |
| `pivot` | PIVOTE | desplazamiento | pivote | avanzado (sobre el pie adelantado, hacia fuera) |
| `angle_step` | ÁNGULO | desplazamiento | ángulo | avanzado (paso diagonal + reorientación) |
| `distance_reset` | AJUSTE | desplazamiento | distancia | basico (pequeño ajuste dentro/fuera de distancia) |
| `pendulum` | PÉNDULO | desplazamiento | péndulo | basico (añadido 1-nov: vaivén adelante-atrás sin cambiar la base) |
| `l_step` | PASO L | desplazamiento | salida | basico (añadido 1-nov: paso atrás + lateral hacia el lado atrasado) |
| `z_step` | PASO Z | desplazamiento | ángulo | avanzado (añadido 1-nov: lateral hacia el lado adelantado + pivote) |
| `damato_shift` | D'AMATO | desplazamiento | cambio de guardia | avanzado (añadido 1-nov: el pie atrasado pasa delante; solo al final) |
| `loma_shift` | LOMA | desplazamiento | ángulo | avanzado (añadido 1-nov: pie atrasado en diagonal y el adelantado lo rodea; misma guardia) |
| `feint_jab` | FINTA | finta | finta | avanzado |
| `feint_level` | AMAGO | finta | finta | avanzado (amago al cuerpo / cambio de nivel) |
| `rhythm_break` | PAUSA | ritmo | ritmo | avanzado (romper el ritmo: medio tiempo antes del siguiente golpe) |

---

## 4. Esquemas de datos

### 4.1 Movimiento (`SB.data.movements[]`)

```js
{
  id: 'cross',
  code: '2',                 // golpes: '1'..'6', '1b'..'6b'; resto: = id en mayúsculas cortas (p. ej. 'SLIP_R')
  short: '2',                // texto grande en pantalla (número o palabra corta, ver tabla)
  name: 'Directo (cross)',
  category: 'golpe',         // 'golpe'|'defensa'|'desplazamiento'|'finta'|'ritmo'|'base'
  subcategory: 'recto',
  level: 'basico',           // 'basico'|'avanzado'
  side: 'rear',              // 'lead'|'rear'|'none'  (slips/rolls: lado donde TERMINA la cabeza)
  target: 'cabeza',          // golpes: 'cabeza'|'cuerpo'; resto: null
  against: [],               // defensas: ['rectos'|'curvos'|'cuerpo']
  description: '...',        // 1-2 frases
  cues: ['...'],             // 3-5 indicaciones técnicas
  errors: ['...'],           // 1-3 errores comunes
  counters: [],              // ids sugeridos a continuación (defensas, fintas)
  anim: 'cross',             // id de animación (= id del movimiento)
  tags: [],
  flow: {                    // reglas de la gramática (ver §5)
    from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 1 },
    to: 'LL',                // 'N'|'J'|'LL'|'RL'|'LOW'|'keep'
    repeatWith: [],          // ids tras los que puede ir aunque sea la misma mano (p. ej. 3 tras 3b)
    position: { start: true, middle: true, end: true },
    mustBeFollowedBy: null,  // 'golpe' para defensas, fintas y pausa
    within: 1                // nº máximo de elementos hasta ese golpe (defensas: 2; fintas y pausa: 1)
  }
}
```

### 4.2 Combinación (`SB.data.combinations[]`)

```js
{
  id: 'c_1_2_slipR_2',
  seq: ['jab', 'cross', 'slip_rear', 'cross'],
  name: 'Uno-dos, esquiva y directo',
  level: 'basico',           // nivel mínimo recomendado
  tags: ['defensa', 'contra'],
  note: 'Tras el 1-2 el rival contraataca con el jab: la esquiva al lado atrasado recarga la mano atrasada para el 2.'
}
```
Etiquetas permitidas: `fundamental`, `ofensiva`, `velocidad`, `potencia`, `defensa`, `contra`, `desplazamiento`, `angulo`, `niveles`, `finta`, `ritmo`, `entrada`, `salida`.
La **complejidad no se guarda**: la calcula `SB.grammar.complexity()`.

### 4.3 Ejercicio HIIT (`SB.data.hiit[]`)

```js
{
  id: 'push_diamond',
  name: 'Flexiones diamante',          // aparece en grande, en mayúsculas en pantalla
  category: 'fuerza',                  // 'fuerza'|'cardio'
  demand: 2,                           // 1 moderada, 2 alta, 3 muy alta
  pattern: 'empuje',                   // fuerza: 'empuje'|'piernas'|'core'|'total'|'pliometria'
                                       // cardio: 'saltos'|'agilidad'|'coordinacion'|'especifico'|'total'
  impact: 'bajo',                      // 'bajo'|'alto'
  note: '',                            // opcional, máx. 3 palabras: 'alterna lados'
  requires: []                         // ids de movimientos necesarios (p. ej. ráfaga de rectos → ['jab','cross'])
}
```

### 4.4 Objetivo (`SB.data.goals[]`) y foco (`SB.data.focuses[]`)

```js
// Objetivo de sesión
{
  id: 'defensa',                       // 'tecnica'|'velocidad'|'ofensiva'|'defensa'|'movilidad'|'resistencia'|'completo'
  name: 'Defensa y contraataque',
  short: 'Defensa',
  description: '...',
  icon: 'shield',                      // nombre de icono SVG de assets/icons
  repRatio: 0.45,                      // proporción de intervalos en modo REPETICIÓN
  focusWeights: { ataque: 1, velocidad: 0, defensa: 3, contra: 3, movilidad: 1, angulos: 0.5, niveles: 0.5, integracion: 0.5 },
  requires: { categories: ['defensa'] },   // objetivo disponible solo si la biblioteca personal tiene ≥1 movimiento de esas categorías
  timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },  // null = valor por defecto del nivel
  changeSpeed: 1.0,                    // multiplicador del tiempo de cada combinación en VARIACIÓN (<1 = cambios más rápidos)
  complexityShift: 0,                  // desplaza la complejidad objetivo (-1..+1)
  tempo: null                          // etiqueta forzada de ritmo: 'controlado'|'fluido'|'explosivo'|'continuo'|null
}

// Foco de un intervalo/ronda
{
  id: 'contra',                        // 'ataque'|'velocidad'|'defensa'|'contra'|'movilidad'|'angulos'|'niveles'|'integracion'|'salidas' (1-nov: toda combinación acaba en salida)
  name: 'Contraataque',
  tagsAny: ['contra'],                 // combinaciones válidas: tienen al menos una de estas etiquetas ([] = cualquiera)
  requiresCategory: ['defensa'],       // foco disponible solo si la biblioteca tiene esas categorías
  templates: ['D P{1,3}', 'P{1,2} D P{1,3}']   // plantillas para el generador (§6.2)
}
```

---

## 5. Gramática técnica (coherencia biomecánica)

Modelo de **estado del tronco** tras cada acción (guardia ortodoxa; para zurdos todo se refleja):

| Estado | Significado | Se llega tras |
|---|---|---|
| `N` | Guardia neutra | inicio, pasos adelante/atrás, laterales, ajuste de distancia, bloqueos, paradas, pivote, ángulo, amago |
| `J` | Tras un jab: mano atrasada lista | 1, 1b, finta de jab |
| `LL` | Lado adelantado cargado (tronco girado hacia el lado adelantado, peso delante) | 2, 4, 6 (y cuerpo), slip_lead, roll_lead |
| `RL` | Lado atrasado cargado (tronco girado hacia el lado atrasado) | 3, 5 (y cuerpo), slip_rear, roll_rear, pull_back, shoulder_roll |
| `LOW` | Posición baja | duck |

`flow.from[estado]` puntúa la transición: **0 = no válida, 1 = aceptable, 2 = natural**. `to: 'keep'` conserva el estado (solo la pausa de ritmo).

Tabla de referencia (Datos la copia en `flow` de cada movimiento):

| id | N | J | LL | RL | LOW | to | notas |
|---|---|---|---|---|---|---|---|
| jab | 2 | 2 | 1 | 0 | 0 | J | |
| jab_body | 2 | 2 | 1 | 0 | 2 | J | |
| cross | 1 | 2 | 0 | 2 | 1 | LL | |
| cross_body | 1 | 2 | 0 | 2 | 2 | LL | |
| lead_hook | 1 | 1 | 2 | 0 | 1 | RL | repeatWith: lead_hook_body |
| lead_hook_body | 1 | 1 | 2 | 0 | 2 | RL | repeatWith: lead_hook |
| rear_hook | 0 | 0 | 0 | 2 | 1 | LL | |
| rear_hook_body | 0 | 0 | 0 | 2 | 2 | LL | |
| lead_upper | 1 | 0 | 2 | 0 | 2 | RL | |
| lead_upper_body | 1 | 0 | 2 | 0 | 2 | RL | |
| rear_upper | 1 | 2 | 0 | 2 | 2 | LL | |
| rear_upper_body | 1 | 2 | 0 | 2 | 2 | LL | |
| slip_lead | 2 | 2 | 0 | 2 | 0 | LL | sigue golpe en ≤2; contras: 3, 5, 3b |
| slip_rear | 2 | 2 | 2 | 0 | 0 | RL | sigue golpe en ≤2; contras: 2, 6, 2b |
| roll_lead | 1 | 1 | 0 | 2 | 0 | LL | contras: 3, 5, 3b |
| roll_rear | 1 | 1 | 2 | 0 | 0 | RL | contras: 2, 6, 4 |
| pull_back | 2 | 2 | 1 | 0 | 0 | RL | contra: 2 |
| duck | 2 | 1 | 1 | 1 | 0 | LOW | contras: 2b, 3b, 5, 6, 3 |
| block_high | 2 | 1 | 1 | 1 | 0 | N | contras: 3, 2, 1 |
| block_body | 2 | 1 | 1 | 1 | 1 | N | contras: 3b, 3, 2 |
| parry_jab | 2 | 1 | 1 | 1 | 0 | N | contras: 1, 2 |
| parry_cross | 2 | 1 | 1 | 1 | 0 | N | contras: 2, 3 |
| shoulder_roll | 2 | 1 | 2 | 0 | 0 | RL | contras: 2, 6 |
| step_in | 2 | 1 | 1 | 1 | 1 | N | no puede ir al final |
| step_back | 2 | 2 | 2 | 2 | 1 | N | |
| lateral_lead | 2 | 2 | 2 | 2 | 1 | N | (cambio 30-oct: reinicia la guardia; permite «1-2, lateral, 2») |
| lateral_rear | 2 | 2 | 2 | 2 | 1 | N | |
| pivot | 1 | 1 | 1 | 2 | 0 | N | no puede ir al principio |
| angle_step | 1 | 2 | 2 | 2 | 1 | N | |
| distance_reset | 2 | 1 | 1 | 1 | 1 | N | no puede ir al final |
| pendulum | 2 | 2 | 1 | 1 | 1 | N | (1-nov) en cualquier posición |
| l_step | 2 | 2 | 2 | 2 | 1 | N | (1-nov) no puede ir al principio |
| z_step | 2 | 1 | 1 | 2 | 0 | N | (1-nov) no puede ir al principio |
| damato_shift | 1 | 1 | 1 | 2 | 1 | N | (1-nov) **solo al final**: cambia la guardia y la notación no la sigue; después se recupera la guardia propia |
| loma_shift | 2 | 2 | 1 | 1 | 1 | N | (1-nov) termina en la guardia propia |
| feint_jab | 2 | 1 | 1 | 0 | 0 | J | sigue golpe inmediato; no al final |
| feint_level | 2 | 2 | 1 | 1 | 0 | N | sigue golpe inmediato; no al final |
| rhythm_break | 1 | 1 | 1 | 1 | 1 | keep | ni al principio ni al final; sigue golpe inmediato |

Aclaraciones (30-oct, tras la entrega de datos):
- `requires.categories` (objetivo) y `requiresCategory` (foco) exigen **todas** las categorías listadas.
- El generador descarta las plantillas que usan categorías ausentes de la biblioteca personal (`D` defensa, `F` desplazamiento, `T` finta, `R` ritmo).
- Complejidad: los cambios de nivel se cuentan solo entre dos golpes contiguos; las transiciones por `repeatWith` cuentan como 1 en la media; el jab al cuerpo cuenta como jab en la regla de 3 jabs seguidos.
- Foco `niveles`: campo extra `requiresAnyMovement` (algún golpe al cuerpo en la biblioteca).

Reglas globales que aplica `SB.grammar.validate(seq, {level})`:
1. Todos los ids existen y ninguno es de categoría `base`.
2. Cada transición tiene puntuación ≥ 1 (el primer elemento se evalúa desde `N`), salvo que el anterior esté en `flow.repeatWith`.
3. Se respetan `flow.position` (inicio/medio/final).
4. Defensas: deben ir seguidas de un golpe en ≤2 elementos; una combinación **no puede terminar en defensa** (World Boxing sanciona la defensa completamente pasiva).
5. Fintas y pausa: seguidas inmediatamente de un golpe.
6. Máximo 3 jabs seguidos; máximo 2 defensas seguidas; máximo 2 desplazamientos seguidos; nunca dos `rhythm_break` contiguos.
7. Debe contener al menos un golpe.
8. Límites por nivel: **básico** 1–5 elementos, ≤4 golpes, ≤1 defensa, ≤1 desplazamiento; **avanzado** 1–8 elementos, ≤6 golpes, ≤2 defensas, ≤2 desplazamientos.

Complejidad (`SB.grammar.complexity(seq)`, de 1 a 5 en pasos de 0,5):
```
c = 1
c += (n >= 3 ? 0.5 : 0) + (n >= 5 ? 0.5 : 0) + (n >= 7 ? 0.5 : 0)        // n = nº de elementos
c += (categoríasDistintas - 1) * 0.75                                      // golpe/defensa/desplazamiento/finta/ritmo
c += 0.4 * cambiosDeNivel                                                  // golpe cabeza↔cuerpo consecutivos
c += min(1, 0.5 * nº de movimientos de nivel 'avanzado')
c += (puntuaciónMediaDeTransiciones < 1.75 ? 0.3 : 0)
complejidad = clamp(Math.round(c * 2) / 2, 1, 5)
```

---

## 6. Motor de entrenamiento

### 6.1 Parámetros por defecto

| Parámetro | Básico | Avanzado |
|---|---|---|
| Duración de intervalo de boxeo | 45 s | 55 s |
| Intervalos por ronda | 3 | 3 |
| Complejidad objetivo (inicio → final de la sesión) | 1,5 → 2,5 | 2,5 → 4 |
| Complejidad máxima | 3 | 5 |
| Proporción de REPETICIÓN (si el objetivo no la fija) | 0,6 | 0,35 |
| Probabilidad de combinación generada (no de biblioteca) | 0,25 | 0,40 |
| Tiempo por combinación en VARIACIÓN | `clamp(4 + 2,6·n, 8, 18)` s | `clamp(4 + 2,1·n, 7, 18)` s |

- HIIT según el ajuste «exigencia física» (independiente del nivel técnico): moderada 30 s, alta 40 s (por defecto), muy alta 45 s; más `goal.timing.hiitDelta`.
- Descanso: ajuste del usuario (por defecto 30 s) o `goal.timing.restSec`.
- Transición antes de cada HIIT: 5 s («Prepárate: FLEXIONES DIAMANTE»). Preparación al inicio de la sesión: 5 s. La cuenta atrás visual 3-2-1 ocupa los últimos 3 s de la preparación y de cada descanso antes de una ronda.
- Descanso largo: si la sesión tiene ≥10 bloques, el descanso del bloque central dura `restSec + 30`.
- El último bloque termina con el HIIT (sin descanso final). No hay calentamiento ni vuelta a la calma.
- Ritmo de cambio (ajuste): lenta ×1,25, normal ×1, rápida ×0,8 sobre el tiempo por combinación; también se multiplica por `goal.changeSpeed`.

### 6.2 Estructura de la sesión

`bloque = ronda de boxeo (intervalosPorRonda × intervalo) → transición 5 s → HIIT → descanso`

- Ajuste al tiempo pedido (20/30/45 o personalizado): se elige el nº de bloques `n` que más se acerca y luego se reparten ajustes de ±5 s en los intervalos (límites 30–75 s) hasta quedar a ≤30 s del objetivo. El tiempo total incluye preparación, boxeo, transiciones, HIIT y descansos.
- HIIT: **alternancia estricta** fuerza/cardio bloque a bloque. El primer bloque empieza por la categoría contraria a la que abrió la sesión anterior. Los ejercicios de abdomen (`pattern: 'core'`) no van entre rondas.
- **Bloque final de abdomen** (13-nov-2026):
  - Va tras el último HIIT: descanso y luego k × (transición 5 s → ejercicio de abdomen).
  - k depende de la duración: 1 si dura menos de 15 min, 2 hasta 25 min, 3 hasta 40 min y 4 a partir de ahí.
  - Sus segmentos llevan `finisher: true`, y los ejercicios, `finisherIndex/finisherTotal`. Está en `session.finisher = { rest, segments }`.
  - Cuenta en el ajuste al tiempo pedido. El descanso previo no lleva cuenta atrás, porque no precede a una ronda de boxeo.
- **Material por ronda** (`session.material[]`, `block.material`, `segment.material` = `{ dumbbells, ball, paper, elbow, rope, hangball, tape, ankles }`, todos booleanos, según los ajustes `equip*`; ver `materialPlan`):
  - **Ronda especial** (como mucho una, desde la 2.ª; ciclo [tipos…, libre] de ≥ 3 rondas, con el orden rotado por la semilla):
    - **Brazo atrasado fijo** (`paper` y/o `elbow`): `SB.selector.pick({ allow })` solo admite golpes `side: 'lead'`, sin parada atrasada ni cambio de guardia.
    - **Cuerda** (`rope`): `allow` exige una esquiva (`slip_*`, `roll_*`, `duck`), y el foco pasa a Defensa o Contraataque (si están entre los elegidos y no repiten foco con las rondas vecinas).
    - **Pelota colgada** (`hangball`): sin mancuernas.
    - Si la biblioteca no permite un tipo, ese tipo no sale y aparece una nota.
  - **Mancuernas:** round(share·n) rondas; sin peso la última (con ≥ 2) y las de pelota colgada. La transición siguiente lleva `dropDumbbells: true`.
  - **Ligero** (uno por ronda, en ciclo): `ball`, `tape` y `ankles`. Si solo hay uno, va en rondas alternas. Tras una ronda con goma, la transición lleva `removeAnkles: true`.
  - **HIIT:** `SB.hiit.plan(n, { ensureOne })` garantiza un ejercicio de defensa (`slip_drill`, `roll_drill`, `duck_drill`, `pull_drill`), sustituyendo uno de su categoría sin romper la regla de patrones. Con `equipRope`, el segmento HIIT de `slip_drill`, `roll_drill` o `duck_drill` lleva `material: { rope: true, … }`.
- Progresión dentro de la sesión (no es calentamiento): las primeras rondas tienen más REPETICIÓN y menor complejidad; las últimas, más VARIACIÓN y complejidad algo mayor (dentro del nivel).
- Cada ronda tiene un foco (de `goal.focusWeights`, solo focos disponibles, sin repetir el mismo foco en rondas consecutivas si hay alternativa). En básico cada ronda tiene ≥1 intervalo de REPETICIÓN; en avanzado ≥1 de VARIACIÓN.
- Si una ronda tiene REPETICIÓN seguida de VARIACIÓN, la combinación repetida aparece una vez dentro de la variación (transferencia).
- Modos de intervalo:
  - `repeticion` (Sistema 1): una combinación todo el intervalo.
  - `variacion` (Sistema 2): combinaciones distintas que cambian cada `tiempo por combinación`; se rellenan hasta completar el intervalo (la última se alarga).
- Plantillas del generador (`focus.templates`): `P` golpe, `D` defensa, `F` desplazamiento, `T` finta, `R` pausa de ritmo; `P{a,b}` = entre a y b golpes. Ejemplos: `P{2,4}`, `F P{1,3}`, `P{2,3} F`, `D P{1,3}`, `P{1,3} D P{1,3}`, `P{1,3} F P{1,2}`, `T P{1,3}`, `P{1,2} R P{1,2}`, `P{1,2} D D P{1,2}`.

### 6.3 Biblioteca personal y estados

- Estados: `aprendido`, `practica` (EN PRÁCTICA), `dominado`.
- **Nunca** se usa un movimiento que no esté en la biblioteca personal. Una combinación (de biblioteca o generada) solo es elegible si todos sus movimientos lo están.
- Tope de complejidad según el estado de cada movimiento de la combinación: aprendido 2,5; práctica 4; dominado 5 (se aplica el menor).
- En nivel básico, un movimiento de nivel `avanzado` solo se usa si está `dominado`.
- Peso en la selección: práctica ×2,5; aprendido ×1,8 en REPETICIÓN y ×1 en VARIACIÓN; dominado ×1 (×1,2 en VARIACIÓN avanzada).
- Combinaciones personales del usuario: mismos estados; práctica ×3.
- Introducción progresiva: los movimientos añadidos hace ≤21 días en estado aprendido o práctica son candidatos; cada sesión destaca como máximo 2 (los menos expuestos) con peso ×2. Su primera aparición en la sesión se marca `isNew` (la UI ofrece la demostración automáticamente).
- Movimiento «poco habitual»: no aparece en las 5 últimas sesiones registradas y se ha usado <3 veces → también `isNew`.

### 6.4 Variedad y memoria

- Historial local: últimas 200 sesiones. Solo se registran sesiones **entrenadas** (terminadas o con ≥5 min de trabajo activo), no las vistas previas.
- Recencia de una combinación: `r = Σ_{k=0..9} usos_en_sesión_k · 0,7^k` (k = 0 la más reciente); peso × `1 / (1 + 1,5·r)`.
- Dentro de la sesión: una combinación ya usada pesa ×0,05; las de REPETICIÓN no se repiten como REPETICIÓN.
- Huella de sesión = conjunto de firmas de combinaciones + `h:` ids HIIT. Si la similitud de Jaccard con alguna de las 10 últimas supera 0,45, se regenera con otra semilla (hasta 6 intentos) y se elige la menos parecida.
- Equilibrio: cada movimiento tiene una exposición acumulada (con decaimiento por antigüedad); los poco expuestos reciben `× (1 + 0,6·déficit)`.
- HIIT: sin repetir ejercicio en la sesión salvo que el grupo se agote; dos ejercicios consecutivos de la misma categoría no comparten `pattern`; los usados en las 3 últimas sesiones pesan ×0,2; no dos de impacto alto seguidos de la misma categoría.
- Objetivos: las sugerencias priorizan los objetivos que hace más tiempo que no se entrenan.
- Biblioteca pequeña: si no hay suficientes candidatos coherentes, se permiten repeticiones antes que secuencias incoherentes, y la sesión lleva una nota («Biblioteca pequeña: se prioriza la coherencia técnica»).

---

## 7. APIs de los módulos

```js
// js/core/util.js
SB.util = {
  rng(seed) -> { next() /*[0,1)*/, int(a, b), pick(arr), weighted(items, weightFn), shuffle(arr) },  // determinista (mulberry32)
  hashString(str) -> uint32,
  uid(prefix) -> string,
  clamp(v, a, b), fmtTime(sec) -> 'm:ss', dayKey(date = new Date()) -> 'YYYY-MM-DD' (hora local),
  deepClone(obj)
};

// js/core/storage.js  (localStorage, prefijo 'sb.', JSON; tolera localStorage ausente → memoria)
SB.storage = { get(key, fallback), set(key, value), remove(key), exportAll() -> object, importAll(object), resetAll(), SCHEMA_VERSION };
// Claves: 'library', 'history', 'calendar', 'settings', 'hiitPrefs', 'customPresets', 'onboarded', 'schema'

// js/core/mediaStore.js  (IndexedDB 'sombra-media'; vídeos que el usuario adjunta a un movimiento)
SB.mediaStore = { put(movementId, blob) -> Promise, getURL(movementId) -> Promise<string|null>, remove(movementId) -> Promise, list() -> Promise<string[]> };

// js/library/notation.js
SB.notation = {
  tokens(seq, { stance: 'diestro'|'zurdo' }) -> [{ id, label, sub, icon, kind, body }],
       // kind: 'golpe'|'defensa'|'desplazamiento'|'finta'|'ritmo'; label grande ('2', 'SLIP'); sub pequeño ('CUERPO', 'der', 'izq')
  text(seq, opts) -> '1 - 2 · SLIP der · 2',
  signature(seq) -> 'jab>cross>slip_rear>cross'
};

// js/library/library.js
SB.library = {
  catalog() -> movement[],              // catálogo + personalizados (con ediciones del usuario aplicadas)
  get(id) -> movement|null,
  personal() -> [{ ...movement, status, addedAt }],
  statusOf(id) -> 'aprendido'|'practica'|'dominado'|null,
  add(id, status = 'aprendido'), setStatus(id, status), remove(id),
  addCustom(draft) -> id, updateCustom(id, patch), deleteCustom(id),   // draft desde formulario (ver §8.4)
  editCatalog(id, patch),               // el usuario puede editar textos/nivel de un movimiento del catálogo
  applyPreset(presetId),                // 'golpes' | 'golpes_defensa' | 'completo'
  isAvailable(seq) -> boolean,
  combos: {
    curated() -> combination[],
    personal() -> [{ id, seq, name, status, note, addedAt }],
    addPersonal({ seq, name, status, note }) -> id, updatePersonal(id, patch), removePersonal(id)
  }
};

// js/engine/grammar.js
SB.grammar = {
  STATES: ['N','J','LL','RL','LOW'],
  validate(seq, { level }) -> { ok, errors: [string], score /*media transiciones*/, complexity },
  complexity(seq) -> number,
  nextState(state, movement) -> state,
  transitionScore(prevId|null, state, movement) -> 0|1|2
};

// js/engine/comboGenerator.js
SB.comboGen = { generate({ level, focusId, rng, targetComplexity, maxComplexity, avoid: Set<signature>, weightOf(movementId) }) -> { seq, tags, complexity, source: 'generated' } | null };

// js/engine/history.js
SB.history = {
  all(), recent(n), record(sessionRecord), clear(),
  comboRecency(signature) -> number, hiitRecency(id) -> number,
  movementExposure() -> { [id]: number }, lastGoalDate(goalId) -> ISO|null,
  similarity(fingerprintArray) -> number,
  lastHiitStart() -> 'fuerza'|'cardio'|null
};

// js/engine/hiitEngine.js
SB.hiit = { pool({ demand, library }) -> exercise[], plan(nBlocks, { demand, rng, startCategory }) -> exercise[] };

// js/engine/sessionGenerator.js
SB.session = {
  generate({ durationMin, level, goalId, seed?, custom? }) -> session,
  // custom: { intervalSec, intervalsPerRound, restSec, hiitSec, repRatio, focusMovementIds: [], focuses: [] }
  availableGoals() -> [{ goal, available: bool, missing: [categorías] }],
  toRecord(session, { completedSec, activeSec, completed }) -> sessionRecord
};

// js/engine/suggestions.js
SB.suggestions = { list({ count = 4, seed }) -> [{ goalId, durationMin, level, title, reasons: [string] }] };

// js/calendar/calendar.js
SB.calendar = {
  mark(dayKey = hoy), toggle(dayKey), isMarked(dayKey), days() -> [dayKey],
  monthGrid(year, monthIndex0) -> semanas[[{ key, day, inMonth, marked, isToday }]],   // semana empieza en lunes
  currentStreak(todayKey?) -> number,   // días consecutivos terminando hoy (o ayer si hoy aún no hay marca)
  bestStreak() -> number
};

// js/training/timer.js — reloj sin deriva basado en marcas de tiempo
SB.Timer = class { constructor({ now = () => performance.now(), speed = 1 }); start(); pause(); resume(); elapsed() /*s*/; running };

// js/training/player.js — reproduce session.timeline; sin DOM
SB.Player = class {
  constructor(session, { now, speed = 1 });
  start(); pause(); resume(); toggle(); skip(); back(); stop();
  update();                // la UI lo llama en cada frame/tick; emite eventos
  getState() -> { segIndex, segment, segRemaining, segElapsed, totalElapsed, totalRemaining,
                 combo, comboIndex, comboRemaining, nextCombo, countdown /*3|2|1|null*/, paused, finished, activeSec };
  on(event, fn);           // 'segment', 'combo', 'countdown', 'finish', 'pause', 'resume'
};
```

### 7.1 Objeto sesión

```js
{
  id, seed, createdAt, title, goalId, level, durationMin, totalSec,
  notes: [string],
  featuredNew: [movementId],
  blocks: [{ index, intervals: [segmentoBoxeo], hiit: segmentoHiit, rest: segmentoDescanso|null }],  // para la vista previa
  timeline: [segmento]       // lista plana que reproduce SB.Player
}
segmento = {
  type: 'prepare'|'boxing'|'transition'|'hiit'|'rest',
  start, duration,           // segundos desde el inicio de la sesión
  // boxing:
  round, roundsTotal, interval, intervalsTotal, mode: 'repeticion'|'variacion', focusId, focusName,
  tempo: 'controlado'|'fluido'|'explosivo'|'continuo',
  combos: [{ seq, signature, start /*relativo al segmento*/, duration, source: 'curated'|'generated'|'personal', refId, name, isNew, newIds: [] }],
  // hiit:
  category: 'fuerza'|'cardio', exercise: { id, name, demand, pattern, note },
  // prepare/transition/rest:
  label, next: { type, title, detail }   // qué viene después (para mostrarlo)
}
```

### 7.2 Registro de historial

```js
{ id, date /*ISO*/, dayKey, goalId, level, durationMin, plannedSec, completedSec, activeSec, completed,
  combos: [signature], movements: { [id]: n }, hiit: [id], hiitStart, focuses: [id], fingerprint: [string] }
```

### 7.3 Calendario

Se marca el día al terminar una sesión o al salir de ella con ≥5 min de trabajo activo (boxeo + HIIT). El usuario puede marcar/desmarcar un día a mano desde el calendario (con confirmación).

---

## 8. Interfaz

### 8.1 Rutas (hash, funcionan en file://)

`#/` inicio · `#/onboarding` primera vez · `#/preview` vista previa de la sesión generada · `#/train` entrenamiento · `#/library` biblioteca (pestañas: Mis técnicas, Catálogo, Combinaciones, HIIT) · `#/library/m/<id>` ficha de movimiento · `#/custom` personalizado · `#/calendar` · `#/settings`.

`SB.app = { state: { session }, go(route), toast(msg) }` (definido en `js/app.js`).

### 8.2 Ajustes (`sb.settings`)

```js
{ stance: 'diestro', sound: true, volume: 0.7, countdownTicks: true, showNext: true, autoDemo: true, showFigure: true,
  hiitDemand: 'alta', restSec: 30, changePace: 'normal', theme: 'oscuro', keepAwake: true,
  lastLevel: 'basico', lastDuration: 30, lastGoal: 'completo',
  // 13-nov-2026
  equipBall: true, equipPaper: true, equipDumbbells: true, dumbbellShare: 0.7,      // 0.3 | 0.5 | 0.7
  equipRope: true, equipTape: true, equipAnkles: true, equipHangBall: true, equipElbow: true,
  cameraAnalysis: true, voiceCues: true, cameraPreview: true }
// migr20261115: migración de una sola vez (app.js) que activa el material y la cámara a quien ya
// usaba la app y añade a su biblioteca las esquivas que falten (SB.library.ensureMovements).
```

### 8.3 Pantalla de entrenamiento

- Ocupa toda la ventana, sin scroll, legible a 2–3 m. Color de fondo por fase: boxeo (acento rojo-coral), HIIT fuerza (violeta), HIIT cardio (verde), descanso/transición (azul).
- Boxeo: arriba nombre de sesión + nivel y barra de progreso segmentada; etiqueta «RONDA 3/8 · INTERVALO 2/3 · VARIACIÓN · Defensa»; **combinación en el centro, enorme** (golpes en blanco, defensas en turquesa, desplazamientos en ámbar, fintas/ritmo en rosa); temporizador grande; «SIGUIENTE: …» (si el ajuste lo permite).
- HIIT: «HIIT · FUERZA», nombre del ejercicio grande, nota y temporizador, con la figura que hace el ejercicio (ver la figura animada).
- Descanso: «DESCANSO», temporizador y lo que viene (foco de la ronda y primera combinación).
- Cuenta atrás 3-2-1 a pantalla completa antes de cada ronda. Pitido suave (onda senoidal con envolvente) al empezar cada ronda; tono distinto y suave al cambiar a HIIT y al terminar.
- Figura animada (ajuste `showFigure`, activo por defecto; cambio del 31-oct a petición del usuario): en boxeo anima la combinación en curso y en descansos/preparación la primera combinación de la ronda siguiente, con el nombre del paso en curso debajo. En pantallas horizontales ocupa una columna a la izquierda (desde la etiqueta hasta los controles) para no restar altura a la combinación; en vertical, una franja encima. En la transición enseña el ejercicio HIIT que viene y en el HIIT el ejercicio en curso (cambio del 12-nov a petición del usuario); en el HIIT la columna es más ancha en horizontal y la franja más alta en vertical, porque muchos ejercicios son en el suelo. Botón/tecla `D` la muestra u oculta y lo guarda en `showFigure`. Con la figura oculta, `autoDemo` la abre solo durante el intervalo en que aparece una técnica nueva o poco habitual (`isNew`). Vídeo propio del movimiento si existe.
- Tamaño de la combinación: búsqueda binaria del mayor tamaño que cabe (tope 0,55 × alto de ventana), con salto de línea entre fichas si así cabe más grande. Si ninguna ficha lleva marca (CUERPO, izq/der…) no se reserva la fila de la marca.
- Teclado: Espacio pausa/reanuda · → salta segmento · ← vuelve · D figura animada · F pantalla completa · Esc salir (con confirmación).
- Mantener la pantalla encendida (Wake Lock) si el navegador lo permite.
- Parámetro de prueba `?speed=N` acelera el reloj.
- **Material:**
  - Indicadores en la etiqueta de la ronda (y en el HIIT con la cuerda) e instrucciones en el descanso.
  - En la transición al HIIT: «Deja las mancuernas», «Quítate la goma de los tobillos» y «Ve a la cuerda».
  - La vista previa tiene la tarjeta «Antes de empezar», con el interruptor de la cámara y `SB.ui.materialSetup()` (cómo preparar cada objeto de la sesión).
- **Análisis por cámara** (`cameraAnalysis`; ver `docs/ANALISIS_VIDEO.md`):
  - **Ventana de la cámara:** pequeña, abajo a la derecha (arriba a la izquierda en el móvil), con el esqueleto. Con `cameraPreview: false` queda invisible.
  - **Indicaciones:** salen bajo la etiqueta y por voz (`voiceCues`).
  - **Resumen de la ronda:** en la fila de «SIGUIENTE» durante el descanso.
  - **Informe:** en la pantalla final, con scroll.
  - **Cuándo se detecta:** solo en boxeo, preparación y descanso (estos dos, para colocarse), nunca en HIIT ni en pausa. Solo se analiza durante el boxeo.

### 8.4 Movimiento personalizado (formulario)

Campos: nombre, texto corto en pantalla (≤8 caracteres), categoría (golpe/defensa/desplazamiento), lado (adelantado/atrasado/ninguno), objetivo (cabeza/cuerpo, si es golpe), descripción, indicaciones, estado. El motor deduce `flow`:
- golpe lado adelantado → `from {N:1,J:1,LL:2,RL:0,LOW:1}`, `to 'RL'`; lado atrasado → `from {N:1,J:2,LL:0,RL:2,LOW:1}`, `to 'LL'`.
- defensa → `from {N:2,J:1,LL:1,RL:1,LOW:0}`, `to 'N'`, `mustBeFollowedBy 'golpe'`, `within 2`.
- desplazamiento → `from {N:2,J:2,LL:2,RL:2,LOW:1}`, `to 'N'`.
Las secuencias aprendidas en clase («hook adelantado seguido de cross», «pivote después de una combinación») se añaden como **combinación personal** con el constructor de combinaciones (fichas de los movimientos de la biblioteca), con su estado.

### 8.5 Animaciones

- `SB.visual.Figure`: figura original 3D simple (proyección 3/4) dibujada en `<canvas>`; guante adelantado en color de acento, guante atrasado claro; se refleja para zurdos.
  `new SB.visual.Figure(canvas, { stance })` · `playMovement(id)` · `playSequence(ids, { loop })` · `stop()` · `setStance(s)` · `destroy()`.
- `SB.visual.poses.has(animId)` indica si existe animación. Movimientos personalizados sin animación: tarjeta con nombre, lado y las indicaciones.
- `SB.visual.exercises` (`js/visual/exercises.js`): `has(id)`, `list()`, `clip(id)`. Una animación en bucle por cada ejercicio de `data/hiit.js` (59). La figura es la misma; para tumbarse, apoyar las manos y girar el cuerpo, las poses usan campos opcionales de `figure.js` (`pitch`, `roll`, `lha/rha`, `lk/rk`, inclinación del pie y `rc`). Los clips llevan `frame: 'auto'`: la figura se encuadra sola con todo el recorrido del ejercicio. Las ráfagas, esquivas, rolls y pasos de boxeo encadenan las animaciones de las técnicas (`poses.sequence(ids, { pause })`). `Figure` añade `playExercise(id)` y `loadExercise(id)`.
- `SB.visual.demo.mount(container, { stance, variant? }) -> { showMovement(id), showCombo(seq), showExercise(ejercicio), hide(), destroy() }`: si el usuario adjuntó un vídeo al movimiento (`SB.mediaStore.getURL`), reproduce el vídeo en bucle y sin sonido; si no, la animación. `variant: 'figure'` (pantalla de entrenamiento): solo la figura, ocupando todo el contenedor, con el paso en curso rotulado debajo. `showExercise` se usa en el entrenamiento, en *Biblioteca → HIIT* (botón ▶ de cada ejercicio) y en la vista previa de la sesión (botón con el nombre del ejercicio).

### 8.5 bis Análisis por cámara (13-nov-2026)

- **`SB.vision.pose`:**
  - `supported()`
  - `load(onStatus)`: devuelve un `Promise<PoseLandmarker>`, una sola vez por página. Usa la GPU o la CPU, según cuál sea más rápida.
  - `openCamera(video)` y `closeCamera(video, stream)`.
  - `Tracker(video, landmarker, onFrame)`, con `active`, `start()` y `stop()`.
  - `drawSkeleton(canvas, lm)`.
- **`SB.vision.Analyzer({ stance })`:**
  - `startRound({ round, material, durationSec })`
  - `setCombo(seq)`
  - `push({ t, lm, wl, w, h })`: devuelve los golpes terminados.
  - `recentSummary(sec, now)`
  - `endRound()`: devuelve las estadísticas.
  - `SB.vision.analyzerUtil` (`CFG`, `expectedFor`, `median`…).
- **`SB.vision.Coach({ analyzer, say, show })`:**
  - `chooseTheme`
  - `startRound({ round, material }, now)`
  - `update(now)`: devuelve el aviso dado, si lo hay.
  - `endRound(stats)`: devuelve el resumen de la ronda.
  - `report()`: devuelve `{ rounds, good, improve, compare, notes }`.
  - `SB.vision.coachUtil` (`metricsOf`, `scoresOf`, `feedbackOf`…).
- **`SB.voice`:** `available()`, `say(text)`, `cancel()` y `setVolume(v)`. Solo usa voces locales en español.

### 8.6 Identidad visual

- Tema oscuro por defecto (claro opcional). Fondo `#0B0D10`, superficie `#14181D`, superficie 2 `#1B2027`, línea `#262C35`, texto `#F3F5F7`, texto secundario `#8B95A3`.
- Acento boxeo `#FF5A36`; fuerza `#A78BFA`; cardio `#34D399`; descanso `#38BDF8`; defensa `#5EEAD4`; desplazamiento `#FBBF24`; finta/ritmo `#F472B6`.
- Tipografías locales (OFL): **Barlow Condensed** 600/700/800 para números y títulos; **Barlow** 400/500/600 para texto.
- Números con `font-variant-numeric: tabular-nums`. Sin elementos decorativos que distraigan.
