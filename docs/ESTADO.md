# Estado del proyecto SOMBRA

Este archivo permite **reanudar** el trabajo desde una sesión nueva sin el historial de la conversación. Actualízalo cada vez que termine una fase.

ESTADO GLOBAL: COMPLETADO

Última actualización: 20-nov-2026 (+01:00) — la cámara prueba cada cámara (las virtuales al final), «Probar cámara» y errores con solución; repositorio git y publicar.bat para compartirla por GitHub Pages (ver sección propia)

## Encargo original (resumen)

App local de shadow boxing en HTML, CSS y JS que funciona sin conexión, sin IA, sin API de pago y sin cuentas. Incluye:

- Sesiones de 20, 30 y 45 minutos, en nivel BÁSICO o AVANZADO, sin calentamiento ni vuelta a la calma.
- Siete objetivos: técnica básica, velocidad y coordinación, combinaciones ofensivas, defensa y contraataque, desplazamientos y movilidad, resistencia y boxeo completo. Más una sesión personalizada.
- Motor que genera combinaciones coherentes (biblioteca investigada más generador) y evita repeticiones con memoria local.
- Biblioteca personal con estados APRENDIDO, EN PRÁCTICA y DOMINADO. Nunca se usan movimientos no autorizados.
- HIIT obligatorio con alternancia estricta entre fuerza y cardio.
- Pantalla de entrenamiento con números grandes, sin voz, pitido suave y cuenta atrás 3-2-1.
- Demostraciones animadas originales.
- Calendario con racha actual y mejor racha, sin estadísticas.
- Entregables: `RESEARCH.md` y `README.md`.
- Pruebas de la FASE 10 (14 puntos) y, al final, una **revisión exhaustiva de funcionalidad** pedida expresamente por el usuario.

Contrato técnico: `docs/ARCHITECTURE.md`. Léelo antes de tocar código.

## Reparto por agentes (lanzados el 30-oct 17:45)

| Pieza | Archivos | Estado |
|---|---|---|
| Investigación | `RESEARCH.md` | HECHO (30-oct 18:00) |
| Datos | `data/movements.js`, `data/combinations.js`, `data/hiit.js`, `data/goals.js` | HECHO (30-oct 18:15): 34 movimientos, 147 combinaciones (55 básico / 92 avanzado), 31 HIIT fuerza + 26 cardio; laterales cambiados a `to: 'N'` |
| Motor | `js/core/util.js`, `js/core/storage.js`, `js/library/*`, `js/engine/*`, `js/calendar/*`, `js/training/*`, `tests/*` (salvo visual-preview) | HECHO (31-oct 01:00): 52/52 pruebas con fixtures y con datos reales; Jaccard medio 0,24 básico / 0,10 avanzado |
| Interfaz | `index.html`, `css/*`, `assets/*`, `js/ui/*`, `js/app.js`, `js/audio/sounds.js`, `js/core/mediaStore.js`, `manifest.webmanifest`, `sw.js`, `iniciar.bat` | HECHO (31-oct 01:10): recorrido completo verificado en navegador por el agente |
| Animaciones | `js/visual/*`, `tests/visual-preview.html` | HECHO (31-oct 01:15): 34 ids animados y revisados |
| Coordinación | `docs/*`, `README.md` (borrador hecho), integración y revisión final | HECHO (31-oct 02:50). Correcciones de la revisión: novedad (`fromPreset`, «poco habitual» con ≥5 sesiones), combinación personal EN PRÁCTICA más frecuente, diálogos que se cierran al navegar, margen y ajuste de la combinación grande, duración de tarjetas, favicon en páginas de prueba, caché `sombra-v3` |

Si una sesión nueva encuentra una pieza sin terminar (archivo ausente, vacío o con errores), la completa ella misma siguiendo `docs/ARCHITECTURE.md`.

## Pendiente (en orden)

1. Comprobar que existen todos los archivos de la tabla y que `node tests/run-node-tests.js` pasa.
2. Integración: cargar la app servida (`python -m http.server 8642` en esta carpeta, o la configuración `sombra` de `.claude/launch.json`) y abriéndola por `file://`. Sin errores en consola.
3. Corregir las combinaciones curadas que no cumplan la gramática y las desviaciones del contrato.
4. **Revisión exhaustiva de funcionalidad** con la lista de abajo. Corregir todo lo que falle y repetir la prueba.
5. Actualizar `README.md` con lo que se haya cambiado y poner aquí ESTADO GLOBAL: COMPLETADO.

## Lista de revisión exhaustiva (verificada el 31-oct-2026)

Método: pruebas automáticas (`node tests/run-node-tests.js`: 52/52 con fixtures y con datos reales), Chrome sin interfaz controlado por DevTools Protocol (scripts en el scratchpad de la sesión: clics reales, teclado, capturas en 375/768/1024/1440/1920 px) y navegador integrado.

- [x] 1. Abre en local: por `file://` sin errores ni peticiones de red, y por `http://localhost:8642`.
- [x] 2. Sin conexión: 0 peticiones externas. Con el servidor parado, la app recarga entera desde el service worker (49 archivos en `sombra-v3`) y genera sesiones.
- [x] 3. 20/30/45 min en básico y avanzado, iniciados desde la interfaz: totales 1200/1800/2700 s exactos.
- [x] 4. Temporizadores: la pausa congela el segmento y el total; → salta y ← vuelve o reinicia; a ×40 una sesión de 30 min dura 47 s reales.
- [x] 5. Descansos y transiciones dentro del total; la línea de tiempo es contigua; el último bloque acaba en HIIT.
- [x] 6. HIIT alterna fuerza/cardio en todas las sesiones, sin repetir ejercicio.
- [x] 7. Sonidos: se crean osciladores en inicio, cambio, HIIT, cuenta y final; 0 con el sonido desactivado o volumen 0. No se ha podido comprobar de oído (sesión sin altavoz).
- [x] 8. Movimiento personalizado («Gancho largo», formulario) y combinación personal (constructor con validación en vivo; guardar deshabilitado si termina en defensa).
- [x] 9. Persisten tras recargar y tras cerrar el navegador (perfil de Chrome en `file://`).
- [x] 10. Niveles: en básico 0 movimientos avanzados no dominados; complejidad máxima 3 en básico y 4–5 en avanzado.
- [x] 11. Coherencia: las 147 curadas y todas las generadas pasan la gramática.
- [x] 12. Variedad: Jaccard medio 0,24 en básico y 0,10 en avanzado entre 10 sesiones; ninguna se repite.
- [x] 13. Calendario: marcado al terminar; no se marca con <5 min; marcar y desmarcar a mano con confirmación; racha actual (también «hoy sin marcar, ayer sí»), mejor racha, meses anterior y siguiente, días futuros bloqueados.
- [x] 14. Recargar no borra datos; exportar → reiniciar → importar restaura biblioteca, combinaciones y calendario.
- [x] 15. Onboarding, sugerencias que cambian, objetivos bloqueados con su motivo y enlace, personalizado de 15 min (900 s) y plantilla guardada.
- [x] 16. Vista previa y Regenerar (nueva sesión). Una combinación EN PRÁCTICA sale en 9 de cada 10 sesiones (14 apariciones frente a 5 si está dominada). Lo nuevo activa la demostración.
- [x] 17. Las 34 técnicas tienen animación; la demostración se abre con D y anima la combinación paso a paso; en modo zurdo se intercambian izq/der. El vídeo propio solo se probó con un blob sintético (agente de interfaz).
- [x] 18. Atajos Espacio, ←, →, D y Esc (con confirmación). F llama a pantalla completa (requiere gesto real del usuario). La API Wake Lock está presente y se solicita.
- [x] 19. Sin desbordamiento horizontal a 375 px en ninguna pantalla. La combinación se ajusta con margen en todas las resoluciones. Temas claro y oscuro.
- [x] 20. Biblioteca mínima (1 y 2): sesión válida con nota, solo jab y cross. Biblioteca sin golpes: aviso claro.

## Cambios posteriores (31-oct-2026, a petición del usuario)

Problema: en el ejercicio no salía ninguna imagen y los números se veían pequeños.

- Figura animada siempre visible en boxeo, preparación y descansos (ajuste `showFigure`, activo por defecto; tecla D y Ajustes). En horizontal ocupa una columna a la izquierda; en vertical, una franja encima. Rotula el paso en curso. Oculta en el HIIT y la transición.
- Combinación más grande: sin fila de marca cuando ninguna ficha la lleva, tope 0,42 → 0,55 del alto, separadores y márgenes más estrechos, temporizador de boxeo algo menor (14 → 11,5 vh).
- Verificado con Chrome sin interfaz en 1536×730, 1366×657, 1920×1080, 1440×900, 1024×768, 768×1024, 390×750, 812×375 y 620×820: sin desbordamiento, figura animando (cambia el paso rotulado), oculta en HIIT y transición, visible en descanso con la combinación siguiente. Ejemplo en 1536×730: «3·2» a 355 px y «2·1 CUERPO·6 CUERPO» a 320 px. Ocultar la figura no cambia el tamaño de combinaciones cortas (limita la altura). D y el ajuste se guardan. La ficha de movimiento conserva la demo normal. Carga por `file://` sin errores ni peticiones de red. `node tests/run-node-tests.js`: 52/52. Caché `sombra-v4`.

## Técnicas de dos reels de Instagram (1-nov-2026, a petición del usuario)

Análisis completo en `RESEARCH.md` §9.

- Movimientos nuevos (39 en total): `pendulum` PÉNDULO (básico), `l_step` PASO L (básico), `z_step` PASO Z, `damato_shift` D'AMATO (solo al final: cambia la guardia) y `loma_shift` LOMA (avanzados). Todos con animación original en `js/visual/poses.js` y filas en ARCHITECTURE §3 y §5.
- Foco nuevo `salidas` en `data/goals.js` (9 focos, con peso en los 7 objetivos). Indicación del «compás» añadida al pivote.
- 15 combinaciones curadas nuevas (162 en total: 61 básico / 101 avanzado).
- Verificado:
  - `node tests/run-node-tests.js`: 52/52, todas las curadas pasan la gramática.
  - Biblioteca sin las técnicas nuevas: 0 apariciones en 8 sesiones. Tras añadir PÉNDULO y PASO L: 55 y 84 apariciones.
  - Catálogo completo en avanzado: aparecen las 5. D'AMATO siempre en último lugar y 0 combinaciones inválidas.
  - Foco «Salidas»: aparece en las sesiones y en el entrenamiento personalizado.
  - Interfaz: botón «Añadir» de las 5 en el Catálogo. La ficha y el entrenamiento muestran la figura («LOMA der · 3 cuerpo · 2 cuerpo»). `visual-preview`: 39/39 ids con animación. Sin errores en consola por `file://`.
- Caché `sombra-v5`.

## Animaciones de los ejercicios HIIT (12-nov-2026, a petición del usuario)

Petición: imágenes también para el HIIT y los ejercicios de fuerza.

- `js/visual/exercises.js` (nuevo): 57 animaciones en bucle, una por ejercicio de `data/hiit.js` (31 de fuerza y 26 de cardio), con la misma figura. Las ráfagas, esquivas, rolls y pasos de boxeo encadenan las animaciones de las técnicas.
- `figure.js`: campos opcionales de pose para tumbarse y apoyarse (`pitch`, `roll`, manos absolutas `lha/rha`, polos de rodilla, inclinación del pie, centro de giro `rc`), encuadre automático por clip (`frame: 'auto'`), marcas en el suelo (`spots`), `playExercise`/`loadExercise`. Sin esos campos, las técnicas se dibujan igual que antes.
- La sombra del suelo no se veía (el degradado se definía fuera de su sitio). Ahora se ve, suave, también en las técnicas.
- `poses.sequence(ids, { pause })`: pausa final configurable (ráfagas).
- Interfaz: la figura acompaña también la transición (ejercicio que viene) y el HIIT; en HIIT la columna es más ancha en horizontal y la franja más alta en vertical. Botón ▶ en cada fila de *Biblioteca → HIIT* y botón con el nombre del ejercicio en la vista previa (diálogo con la animación). Texto del ajuste «Figura animada» actualizado.
- Pruebas: `tests/specs/08-visual.test.js` (cada técnica y cada ejercicio con animación válida y bucle sin saltos). Las pruebas cargan también los módulos visuales (sin dibujar).
- Verificado:
  - `node tests/run-node-tests.js`: 54/54 con fixtures y con datos reales. `tests/index.html` por `file://`: 54/54.
  - Hojas de fotogramas de los 57 ejercicios revisadas a ojo; ajustados el ángulo de cámara de cada uno y las posturas que se entendían mal (rodillas altas, patinador, superman, hollow hold, saltos agrupados, pistol).
  - Entrenamiento por `file://` en 1536×730 y 390×750: la figura aparece en la transición y en el HIIT (plancha dinámica), sin desbordamiento. La figura de boxeo sigue igual (con sombra).
  - Vista previa: botones del HIIT y diálogo con la animación. Biblioteca → HIIT: 57 botones ▶, diálogo en tema claro y oscuro, sin desbordamiento a 375 px.
  - `visual-preview`: 39/39 técnicas y 57/57 ejercicios con animación. Sin errores en consola.
- Caché `sombra-v6`.

## Abdomen al final, material, defensas en español y análisis por cámara (13-nov-2026, a petición del usuario)

Detalle técnico, umbrales e investigación con fuentes: [ANALISIS_VIDEO.md](ANALISIS_VIDEO.md).

**Decisiones del usuario (13-nov):**
- **Análisis por cámara:** se permite usar MediaPipe (detector de postura de Google, local y gratuito) aunque sea IA. Es una excepción a la regla «sin IA», solo para esta función.
- **HIIT:** fuerza y cardio siguen entre rondas; todo el abdomen va al final.
- **Mancuernas:** un 70 % de las rondas con mancuernas.
- **Comba:** no se usa la comba real.
- **Nombres de las defensas:** media cintura = esquiva lateral, cintura completa = rotación bajo el golpe, sentadilla = agachada, goma = esquiva atrás. Se cambian en las combinaciones y también se añaden al HIIT.

**Qué se ha hecho:**
- **Abdomen al final:** `hiitEngine.plan` ya no usa `pattern: 'core'` entre rondas. `planCore(k)` y el generador añaden el bloque final: descanso y luego 1-4 ejercicios de abdomen, cada uno con su transición. Ese tiempo cuenta en la duración pedida. Se ve en la vista previa («Abdomen») y en el entrenamiento («ABDOMEN · 1/3»).
- **Material (Ajustes → Material):**
  - Pelota bajo la barbilla en las rondas impares.
  - Papel entre el guante y la mejilla de la mano atrasada en 1 de cada 3 rondas. En esas rondas solo hay golpes de la mano adelantada (`selector.pick` con `allow`).
  - Mancuernas de 1 kg en el 30/50/70 % de las rondas; la última va siempre sin peso.
  - Indicadores por ronda en la vista previa y el entrenamiento, instrucciones en el descanso y aviso «Deja las mancuernas» antes del HIIT.
- **Nombres:**
  - SLIP, ROLL, DUCK y PULL pasan a MEDIA CINTURA, CINTURA COMPLETA, SENTADILLA y GOMA, también en las notas de las combinaciones.
  - HIIT: «Media cintura continua», «Cintura completa continua» y dos nuevos, «Sentadilla defensiva» y «Goma continua» (59 ejercicios, todos con animación).
- **Análisis por cámara** (Ajustes → Análisis por cámara; desactivado por defecto):
  - Módulos: `js/vision/pose.js`, `analyzer.js`, `coach.js` y `js/audio/voice.js`. MediaPipe está en `vendor/mediapipe` (unos 25 MB, Apache 2.0) y se carga solo cuando hace falta.
  - Funcionamiento: tema por ronda, indicaciones en directo (voz local o pantalla), resumen en cada descanso e informe final (bien / mejorar / datos / tabla por ronda).
  - Privacidad: no se graba ni se guarda nada y la cámara se apaga al terminar.
- **Service worker:** no copia `vendor/` en la caché. Caché `sombra-v7`.

**Verificado:**
- `node tests/run-node-tests.js`: 61/61 con fixtures y con datos reales. `tests/index.html` por `file://`: 61/61.
  - Nuevas: `09-vision`, con un cuerpo sintético que lanza golpes limpios o con errores, más el plan de material.
  - Ajustadas: `04` y `06` por el bloque de abdomen. En `05` se pasa de 10 a 14 sesiones, porque al quedar menos tiempo de boxeo la muestra se quedaba corta.
- **Chrome sin `--allow-file-access-from-files`, con cámara simulada:**
  - MediaPipe carga por `file://`.
  - El detector va en la CPU a unos 24 ms por imagen; la GPU por software de este entorno era más lenta y se descarta sola.
  - Sesión completa a ×12 en 1366×768 y 390×760:
    - Indicadores de material y aviso de dejar las mancuernas.
    - Temas por ronda sin repetir y aviso «No te veo entero».
    - Resumen en el descanso, bloque de abdomen e informe final.
    - Al terminar, las pistas de la cámara quedan en «ended».
    - Sin desbordamiento y sin errores en consola.
- **Nombres largos** («CINTURA COMPLETA») en grande: caben en el móvil (390 px) y en horizontal.
- **`visual-preview`:** 39/39 técnicas y 59/59 ejercicios.

## Defensas en el circuito, objetos nuevos y cámara visible (15-nov-2026, a petición del usuario)

**Qué faltaba (causa):**
- Cintura completa, goma y sentadilla eran técnicas avanzadas y el ajuste «Golpes y defensa» solo traía la media cintura: en nivel básico no salían ni en las combinaciones ni en el HIIT.
- El material y la cámara venían apagados, así que no se encontraban.

**Decisiones del usuario:**
- La comba se usa atada como cuerda de esquivas.
- Objetos nuevos: cinta en el suelo, goma en los tobillos, pelota de tenis colgada y toalla (o guante) bajo el codo.
- Sobre la cámara: «No sé activarla».

**Cambios:**
- **Defensas:**
  - Las cuatro pasan a nivel básico, con 12 combinaciones cortas.
  - Se añaden al ajuste «Golpes y defensa» y, mediante una migración de una sola vez, a la biblioteca de quien ya usaba la app.
  - Los nombres de las combinaciones, en español: «Goma y directo», «Sentadilla y doble gancho», «Media cintura y dos-tres-dos»…
- **HIIT:** cada sesión lleva al menos un ejercicio de defensa.
- **Material:** todo activado por defecto, con el reparto por rondas descrito en `docs/ANALISIS_VIDEO.md` §3.
- **Avisos al pasar al HIIT:** «Quítate la goma de los tobillos» y «Ve a la cuerda».
- **Vista previa:** tarjeta «Antes de empezar», con el interruptor de la cámara y cómo preparar cada objeto.
- **Cámara:** activada por defecto. El entrenador da avisos de la toalla (codos) y de la cinta o la goma (anchura de los pies), y el informe compara con y sin cada objeto.

**Verificación:**
- **Pruebas:** 64/64 en Node, con datos de prueba y reales, y 64/64 en `tests/index.html`. Hay pruebas nuevas del material completo, de las defensas en básico, del HIIT con defensa y de `ensureMovements`.
- **Variedad con todo el material activado:** Jaccard media de 0,21 en básico y 0,17 en avanzado (límite: 0,3).
- **Chrome con `file://` estricto y cámara falsa:**
  - Un usuario «antiguo» (todo apagado, sin esas defensas) abre la app y la migración lo activa todo.
  - Vista previa con «Antes de empezar»; el interruptor de la cámara funciona.
  - Rondas con cuerda, pelota colgada, papel y toalla, goma y cinta, y los avisos de la transición.
  - Informe final; la cámara queda en «ended».
  - Sin desbordamiento a 1366×768 ni a 390×760.
- **Sin probar:** con una persona real delante de la cámara.

## Cámara que no arranca y versión web para compartir (20-nov-2026, a petición del usuario)

- **Diagnóstico en el equipo del usuario.**
  - Windows permite la cámara a todas las apps.
  - Navegador predeterminado: DuckDuckGo. Windows no registra que haya abierto la cámara desde el 15-sep-2026, así que el fallo es anterior a capturar imagen.
  - Hay dos cámaras: «LG Camera» y «Mirametrix Virtual Camera» (LG Glance), y LG Glance tiene la cámara bloqueada.
  - El usuario no dijo qué mensaje exacto ve y prefirió no encender la cámara para probarla, así que la causa no está confirmada.
- **`js/vision/pose.js`:**
  - `openCamera(video, {deviceId, lastId})` prueba en orden la cámara elegida, la última que funcionó, la que elige el navegador y las demás, con las reales antes que las virtuales.
  - Descarta la que falla, la que no da fotogramas en 5 s y la que da imagen negra (brillo medio menor que 6); si no hay otra mejor, se queda con la negra y lo avisa.
  - Funciones nuevas:
    - `describeError(e)`: mensaje, solución y código;
    - `listCameras`, `orderCameras` e `isVirtual`;
    - `framingText`.
  - Los errores del detector llevan `sbStage = 'detector'`.
- **Interfaz.**
  - `ui.cameraTester()` aparece en «Antes de empezar» y en Ajustes: prueba de cámara y detector, desplegable de cámaras y apagado solo al minuto.
  - En el entrenamiento, el error aparece con su solución, «Reintentar» y «Seguir sin cámara».
  - Ajustes nuevos: `cameraId` y `cameraLastId`. Caché `sombra-v9`.
- **Pruebas.**
  - 67/67 en Node (3 nuevas: orden de cámaras, errores y encuadre).
  - Chrome con `file://` estricto y dispositivos simulados, a 1366×768 y 390×760:
    - la virtual por defecto falla → se usa la real;
    - la de por defecto da imagen negra → se usa la real;
    - permiso denegado → mensaje y solución; tras permitirla, «Reintentar» arranca la cámara;
    - cámara normal → funciona;
    - al salir de la pantalla, las pistas quedan en «ended».
  - **Sin probar:** con la cámara real del usuario y con DuckDuckGo.
- **Compartir:**
  - Repositorio git en esta carpeta (rama `main`). Se excluye `.claude/`. Se añaden `.nojekyll` para GitHub Pages y `publicar.bat` para subir los cambios.
  - Publicada el 20-nov-2026 en <https://desirhugo.github.io/SOMBRA/> (repositorio público `desirhugo/SOMBRA`, GitHub Pages desde `main`, carpeta raíz). La primera subida no incluía las 8 combinaciones de @shadowbox.combos; se subieron justo después, a petición del usuario.
  - Los commits van firmados como «SOMBRA <sombra@localhost>», no con los datos del usuario.

## Combinaciones de @shadowbox.combos (20-nov-2026, a petición del usuario)

- **Análisis** de los 12 reels que se ven sin iniciar sesión (animaciones 3D que promocionan una app de boxeo).
  - Usa la numeración estándar 1–6 y enseña cada combinación primero lenta y luego a velocidad real.
  - Los comentarios señalan errores: un vídeo en espejo, un 6 que debería ser 5 al cuerpo, una sentadilla que era cintura completa y versiones lentas distintas de las rápidas.
- **8 combinaciones nuevas en `data/combinations.js`**, adaptadas a la gramática (sin «post», como mucho 6 golpes y la media cintura al lado que encadena):
  - Básico:
    - `c_2_5_2_3`;
    - `c_1_1_2_3`;
    - `c_1_2_duck_2`;
    - `c_1_slipL_3b_3` («Destroyer»).
  - Avanzado:
    - `c_slipR_6_3_4_5`;
    - `c_1_2_duck_2_3_slipL_3_4`;
    - `c_1_1_6_3_6_5b`;
    - `c_1_2_duck_2_pull_2_3`.
  - Total: 170 combinaciones (77 de básico y 93 de avanzado).
- **No caben** sin cambiar la gramática:
  - 6-3-3-2 y 1-2-3-3-2-2-3-2: la gramática no deja dos ganchos adelantados seguidos a la cabeza ni dos directos seguidos.
  - La de 10 acciones.
  - La de 7 golpes con «post».
  - El nivel 2 del reel por niveles, que acaba en defensa.
- **Pruebas:**
  - 67/67 en Node.
  - En 40 sesiones de 30 min por nivel, las 4 básicas salen en básico (5 a 76 veces) y las 4 avanzadas en avanzado (7 a 33 veces).
  - `c_1_slipL_3b_3` sale tanto como las demás de cuerpo y cabeza (`c_duck_3b_3`, `c_3b_3`).

## Limitaciones conocidas

- La cámara no mide las esquivas, si se pasa bien bajo la cuerda ni si se toca la pelota colgada: en esas rondas solo valen la guardia, la barbilla y los golpes.

- Sonido y Wake Lock comprobados por código e instrumentación, no de oído ni en pantalla real.
- Los ganchos son las animaciones menos evidentes a tamaño pequeño; se apoyan en la estela del guante.
- Ejercicios HIIT: la figura es esquemática (guantes incluidos). En algunos ejercicios hay detalles que no se ven bien desde ningún ángulo: la palmada de las flexiones con palmada, el giro de los giros rusos hacia el lado alejado o la comba (no se dibuja la cuerda). El nombre y la nota del ejercicio siguen en pantalla.
- `file://` y `http://localhost` guardan datos por separado (lo explican el README y Ajustes).
- **Análisis por cámara:**
  - **No probado con una persona real:** solo con cámara simulada y con un cuerpo sintético.
  - **Medidas aproximadas:** con una sola cámara de frente, la profundidad (extensión de los rectos, velocidad, giro de cadera) es aproximada.
  - **Lo que no se mide:** hacia dónde miran los ojos (solo la posición de la cabeza), el pivote del pie, el reparto del peso y el movimiento de cabeza.
  - **Umbrales:** son orientativos y se pueden ajustar en `CFG`.
  - **Voz:** solo funciona si hay una voz en español instalada en el dispositivo.
- **Mancuernas:** el 70 % de rondas con peso está por encima de lo que suelen recomendar los entrenadores (1-2 rondas cortas, o hasta 3-5). Se mitiga con la última ronda sin peso, sin tema de velocidad en esas rondas y con el aviso de no bloquear el codo.
