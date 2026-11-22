# SOMBRA · Shadow Boxing Trainer

Entrenador local de shadow boxing para boxeo olímpico amateur. Genera sesiones de 20, 30 o 45 minutos (o a medida) que combinan rondas de boxeo, ejercicios HIIT de fuerza y de cardio alternados y descansos. Usa una biblioteca personal de técnicas que tú controlas.

- Sin cuentas, sin suscripciones, sin IA, sin API de pago y sin Internet para entrenar.
- Todos los datos se guardan en tu navegador (localStorage e IndexedDB).
- No incluye calentamiento ni vuelta a la calma: está pensada para empezar después de tus 10 minutos de comba.

## Cómo abrirla

**Opción A: doble clic.** Abre `index.html` con Chrome, Edge o Firefox. Funciona sin servidor y sin conexión.

**Opción B: servidor local (recomendado si quieres instalarla como app).** Haz doble clic en `iniciar.bat`. Si tienes Python, arranca un servidor en `http://localhost:8642` y abre el navegador. Desde ahí puedes usar «Instalar aplicación» en Chrome o Edge. El service worker guarda una copia para usarla sin conexión.

Si prefieres lanzarlo a mano:

```bash
python -m http.server 8642
```

**Opción C: enlace web (para compartirla): <https://desirhugo.github.io/SOMBRA/>.** Es la misma app publicada en GitHub Pages, con https: funciona en cualquier ordenador o móvil con Chrome o Edge, sin instalar nada. Cada persona guarda sus datos en su propio navegador: nadie ve los de nadie. Para publicar tus cambios, haz doble clic en `publicar.bat` (GitHub tarda 1-2 minutos en publicarlo y hasta 10 en que le llegue a todo el mundo; si no ves el cambio, recarga la página).

> **Importante:** el navegador guarda los datos por separado según cómo abras la app. Lo que guardes con `file://` (doble clic) no aparece en `http://localhost:8642` y al revés. Elige una forma y úsala siempre, o pasa los datos con **Ajustes → Exportar copia / Importar copia**.

## Si la cámara no funciona

Pulsa **Probar cámara** en la vista previa («Antes de empezar») o en **Ajustes → Análisis por cámara**. Abre la cámara, carga el detector y te dice si te ve entero o, si falla, qué pasa y cómo arreglarlo, con un código entre paréntesis. No graba nada y se apaga sola al minuto.

- **Varias cámaras:** muchos portátiles tienen además cámaras virtuales (LG Glance/Mirametrix, OBS, NVIDIA Broadcast…). SOMBRA prueba primero las cámaras reales y, si una falla, no da imagen o la da negra, pasa a la siguiente. También puedes elegir la cámara en el desplegable que aparece tras la prueba.
- **Sin permiso** (`NotAllowedError`): pulsa el icono de la cámara o del candado junto a la dirección, elige «Permitir» y pulsa **Reintentar**.
- **Ocupada** (`NotReadableError` o `AbortError`): cierra Zoom, Teams, la app Cámara u otras pestañas que la usen.
- **Imagen negra:** quita la tapa o enciende la cámara con la tecla del portátil.
- Si falla en mitad de una sesión, el recuadro de la cámara muestra el mismo mensaje con **Reintentar** y **Seguir sin cámara**.

## Uso diario

1. **Primera vez:** elige tu guardia (diestro o zurdo) y desde qué biblioteca empiezas: solo golpes 1-6, golpes con defensa básica o el catálogo completo. Luego ajusta cada técnica en **Biblioteca**.
2. **Inicio:** acepta un entrenamiento sugerido o elige duración (20/30/45), nivel (BÁSICO/AVANZADO) y objetivo, y pulsa **Generar sesión**.
3. **Vista previa:** revisa los bloques. Con **Regenerar** obtienes otra sesión distinta; con **Empezar** entrenas.
4. **Entrenamiento:** la combinación aparece en números grandes, que ocupan todo el espacio que deja la pantalla. Al lado (o encima, en un móvil en vertical) una figura animada la ejecuta y rotula el golpe en curso. En los descansos la figura enseña la primera combinación de la ronda siguiente; en la transición, el ejercicio HIIT que viene, y durante el HIIT, cómo se hace. Cada bloque es una ronda de 3 intervalos, una transición, un HIIT (fuerza o cardio) y un descanso; todos los ejercicios de abdomen van juntos al final de la sesión. Antes de cada ronda hay una cuenta atrás 3-2-1 y un pitido suave.
6. **Material (activado por defecto; se cambia en Ajustes → Material):** cada ronda lleva **un solo objeto** como mucho, y cada uno sale una vez por sesión desde la 2.ª ronda (si hay más objetos que rondas, los que no caben salen en la sesión siguiente).
   - Brazo atrasado fijo: papel en la mejilla **o** toalla bajo el codo, nunca los dos. Una sola ronda así por sesión, alternando: una sesión el papel y la siguiente la toalla. Solo lleva golpes de la mano adelantada, así que tiene foco de defensa o contraataque (esquivas y pasos entre los golpes), todo variación y ninguna combinación repetida.
   - Comba atada como cuerda de esquivas: todas las combinaciones llevan media cintura, cintura completa o sentadilla.
   - Pelota de tenis colgada, pelota bajo la barbilla, cinta en el suelo y goma en los tobillos.
   - Mancuernas de 1 kg: también solas, en las rondas que quedan libres, hasta el 30, 50 o 70 % de las rondas; la última va siempre sin peso.

   La vista previa («Antes de empezar») te dice cómo preparar cada objeto, y el entrenamiento qué usar en cada ronda y qué dejar antes del HIIT.
7. **Análisis por cámara (activado por defecto; interruptor en la vista previa y en Ajustes):** durante las rondas de boxeo (no en el HIIT), la app revisa:
   - la guardia, la barbilla y los golpes;
   - la recogida, la cadera y la velocidad aproximada.

   Cada ronda tiene un tema (técnica, velocidad, guardia…) y te resume cada ronda en el descanso.
   - **Comentarios:** como mucho uno por serie (intervalo) y con al menos 3 combinaciones de separación. La misma corrección («sube la mano») se dice una vez por ronda. También te dice cuándo lo haces bien: si corriges lo que se te dijo («¡Eso es! Ya no cargas el golpe»), si el tema de la ronda va bien o si los últimos golpes salen limpios.
   - **Voz:** por defecto, una voz masculina en español si el dispositivo la tiene (en Windows, Pablo), algo más lenta y grave. En **Ajustes → Análisis por cámara** puedes elegir otra y probarla.
   - **Al final**, qué haces bien y qué mejorar. En cada punto a mejorar verás **un clip de tu fallo a cámara lenta** (0,25×, 0,5× o 1×, en espejo como la cámara), con el esqueleto, la zona del fallo en rojo y una frase de lo que pasa en cada momento («Aquí cargas: la mano va hacia atrás antes de salir»), y **un vídeo de YouTube** para aprender a hacerlo bien.
   - **Privacidad:** todo se procesa en el dispositivo y la cámara se apaga al terminar. Los clips (unos 2-3 s de cada fallo) solo existen en la memoria de la pantalla final: no se suben a ningún sitio y se borran al salir. Se pueden desactivar en Ajustes.

   Colócate a 2-3 m, de frente y entero en la imagen. Detalles y fuentes en `docs/ANALISIS_VIDEO.md`.
5. **Calendario:** el día se marca solo al terminar la sesión o al salir con al menos 5 minutos de trabajo. Ahí ves tu racha actual y tu mejor racha.

### Atajos de teclado durante el entrenamiento

| Tecla | Acción |
|---|---|
| Espacio | Pausa / reanudar |
| → / ← | Siguiente / anterior segmento |
| D | Mostrar u ocultar la figura animada (se recuerda; también en Ajustes) |
| F | Pantalla completa |
| Esc | Salir (pide confirmación) |

### Notación

`1` jab · `2` directo · `3` gancho adelantado · `4` gancho atrasado · `5` uppercut adelantado · `6` uppercut atrasado. La marca **CUERPO** bajo el número indica un golpe al cuerpo. Las técnicas que no son golpes se ven en color:

- **Turquesa:** defensas (`MEDIA CINTURA`, `CINTURA COMPLETA`, `GOMA`, `SENTADILLA`, `BLOQ`, `CODO`, `PARADA`, `HOMBRO`).
- **Ámbar:** desplazamientos (`PASO ↑`, `PASO ↓`, `LATERAL`, `PIVOTE`, `ÁNGULO`, `AJUSTE`, `PÉNDULO`, `PASO L`, `PASO Z`, `D'AMATO`, `LOMA`).
- **Rosa:** fintas y ritmo (`FINTA`, `AMAGO`, `PAUSA`).

`izq` y `der` se calculan según tu guardia.

## Biblioteca personal

Cada técnica o combinación tiene uno de estos tres estados:

| Estado | Efecto en el motor |
|---|---|
| APRENDIDO | Consolidación: aparece sobre todo en intervalos de repetición y en combinaciones sencillas (complejidad ≤ 2,5). |
| EN PRÁCTICA | Prioridad: aparece unas 2,5 veces más y en combinaciones de complejidad media (≤ 4). |
| DOMINADO | Libre combinación: puede formar parte de cualquier combinación, incluidas las más complejas del nivel avanzado. |

- El motor **nunca** usa una técnica que no esté en tu biblioteca.
- Para añadir lo que aprendes en clase:
  - Si es una **técnica nueva**: *Biblioteca → Nuevo movimiento*.
  - Si es una **secuencia** («hook adelantado seguido de cross», «pivote después de una combinación»): *Biblioteca → Combinaciones → Nueva combinación*. El constructor comprueba la coherencia técnica mientras la montas.
- Puedes adjuntar un vídeo propio a cualquier técnica desde su ficha. Se guarda solo en tu navegador.

## Estructura del proyecto

```
index.html              punto de entrada
css/                    estilos (tokens, pantallas, entrenamiento)
assets/                 fuentes locales (OFL) e iconos
data/                   bibliotecas editables: movimientos, combinaciones, HIIT, objetivos
js/core/                utilidades, almacenamiento local, vídeos (IndexedDB)
js/library/             notación y biblioteca personal
js/engine/              gramática técnica, generador de combinaciones, selector, HIIT, sesiones, historial, sugerencias
js/calendar/            calendario y rachas
js/training/            temporizador sin deriva y reproductor de sesión
js/audio/               sonidos sintetizados (Web Audio, sin archivos) y voz local de las indicaciones
js/vision/              análisis por cámara: cámara + detector, análisis de la técnica y entrenador
vendor/mediapipe/       detector de postura MediaPipe (Apache 2.0), solo para el análisis por cámara
js/visual/              figura animada original, técnicas, ejercicios HIIT y demostraciones
js/ui/                  router y pantallas
tests/                  pruebas automáticas (Node y navegador) y vista de animaciones
docs/ARCHITECTURE.md    contrato de módulos, esquemas y reglas del motor
docs/ANALISIS_VIDEO.md  análisis por cámara, material, abdomen al final e investigación con fuentes
RESEARCH.md             investigación y justificación metodológica
```

## Añadir contenido sin tocar el motor

- **Movimiento nuevo:** añade un objeto a `data/movements.js` con el esquema de `docs/ARCHITECTURE.md` §4.1. Su campo `flow` le dice a la gramática qué puede ir antes y después (estados del tronco N, J, LL, RL y LOW). También puedes crearlo desde la app.
- **Combinación nueva:** añade un objeto a `data/combinations.js`. Las pruebas validan que respete la gramática.
- **Ejercicio HIIT:** añade un objeto a `data/hiit.js`.
- **Objetivo o foco:** `data/goals.js`.

## Contenido incluido

- **39 técnicas:** los 6 golpes a la cabeza y al cuerpo, bloqueos, paradas, media cintura, cintura completa, goma, sentadilla, hombro, pasos, laterales, pivote, ángulo, ajuste de distancia, péndulo, salida en L, paso en Z, cambio D'Amato, shift de Lomachenko, fintas y cambio de ritmo. Cada una con indicaciones, errores comunes y animación propia.
- **170 combinaciones investigadas:** 77 de nivel básico y 93 de avanzado, cada una con su aplicación técnica. Ocho de ellas, del 20-nov-2026, están adaptadas de la cuenta de Instagram @shadowbox.combos. A ellas se suma el generador automático, que respeta la gramática técnica.
- **59 ejercicios HIIT:** 31 de fuerza y 28 de cardio (con «Sentadilla defensiva» y «Goma continua», del 13-nov-2026), en tres niveles de exigencia. La exigencia se elige en Ajustes y es independiente del nivel técnico. Todos tienen animación (añadida el 12-nov-2026): se ve durante el HIIT, en *Biblioteca → HIIT* (botón ▶) y en la vista previa (botón con el nombre del ejercicio).
- **7 objetivos y 9 focos de ronda.** El foco «Salidas» obliga a terminar cada combinación saliendo de la línea del rival.
- **Añadido el 1-nov-2026:** las técnicas y el foco que aportaron dos vídeos de ejercicios de pies (análisis en `RESEARCH.md` §9). Si ya usabas la app, añádelas desde *Biblioteca → Catálogo*: el motor solo usa lo que está en tu biblioteca. El D'AMATO cambia la guardia, así que solo aparece al final de una combinación; después, vuelve a tu guardia.

## Pruebas

```bash
node tests/run-node-tests.js
```

Son 72 pruebas que se ejecutan con datos de prueba y con los datos reales. Comprueban, entre otras cosas:

- la duración de las sesiones;
- la alternancia entre fuerza y cardio;
- la coherencia técnica de todas las combinaciones;
- los límites por nivel y por estado;
- la variedad entre sesiones;
- la persistencia de los datos;
- el reproductor y el calendario;
- que cada técnica y cada ejercicio HIIT tenga animación válida;
- el abdomen al final y el material por ronda (un objeto por ronda, papel y toalla alternos, ronda de mano adelantada sin repetir combinaciones);
- el análisis por cámara, con un cuerpo sintético que lanza golpes limpios o con errores;
- el orden en que se prueban las cámaras (las virtuales al final) y los mensajes de error de la cámara;
- el ritmo de los comentarios (uno por serie, sin repetir) y las felicitaciones;
- la elección de la voz, las frases de los clips y que cada punto a mejorar tenga su vídeo.

`tests/index.html` ejecuta las mismas pruebas en el navegador y `tests/visual-preview.html` muestra todas las animaciones, también las de los ejercicios HIIT.

La revisión funcional completa (20 puntos, del 31 de octubre de 2026) está en `docs/ESTADO.md`.

## Limitaciones conocidas

- El análisis por cámara no se ha probado con una persona real, solo con una cámara simulada y un cuerpo sintético. Sus medidas son aproximadas: una sola cámara no ve bien la profundidad, y no sabe hacia dónde miran los ojos, solo la posición de la cabeza.

- El sonido y el mantener la pantalla encendida (Wake Lock) se han comprobado por código, no de oído ni en un monitor real. Si no oyes el pitido, revisa el volumen en Ajustes y pulsa cualquier botón antes de empezar: los navegadores no reproducen audio hasta el primer clic.
- La pantalla completa (tecla F) solo funciona tras una pulsación real tuya, no de forma automática.
- Los ganchos son las animaciones menos evidentes a tamaño pequeño. Se apoyan en la estela del guante.
