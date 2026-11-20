# Análisis por cámara, material y bloque de abdomen

Última actualización: 13-nov-2026.

## 1. Qué hace

Con **Ajustes → Análisis por cámara** activado, la app usa la cámara **solo durante las rondas de boxeo** (el HIIT y el abdomen no se analizan):

- **En directo:**
  - Cada ronda tiene un **tema**, que se anuncia por voz y en pantalla.
  - Si un error **se repite**, sale una **indicación corta**: «Sube la mano de atrás», «Barbilla abajo», «Gira la cadera en el golpe de atrás»…
  - Cuando el tema de la ronda va bien, sale un **refuerzo**, por ejemplo «¡Bien! Guardia arriba».
- **En cada descanso:** un resumen de la ronda anterior (golpes, velocidad aproximada, guardia, barbilla, lo mejor y lo que hay que mejorar).
- **Al terminar:** un informe con lo que haces bien y lo que debes mejorar, cada punto explicado y con un consejo, más los datos de la sesión y una tabla por ronda.

**Privacidad:**
- No se graba vídeo: no se usa `MediaRecorder` y ningún fotograma se guarda.
- Cada imagen se analiza en el dispositivo y se descarta; solo quedan contadores de la sesión en curso.
- Al terminar o salir se apaga la cámara, y el informe desaparece al salir de la pantalla final.
- No hay peticiones de red: el detector y el modelo están en `vendor/mediapipe`.

**Voz:**
- Solo se usan voces en español **instaladas en el dispositivo** (`localService`), porque las voces «en línea» enviarían el texto a un servidor.
- Si no hay ninguna voz local, las indicaciones solo salen en pantalla.
- La voz nunca nombra combinaciones.

**Sobre la regla «sin IA»:** el detector de postura (MediaPipe Pose, de Google, licencia Apache 2.0) es un modelo de aprendizaje automático. El usuario lo autorizó expresamente solo para esta función el 13-nov-2026.

## 2. Cómo funciona

| Archivo | Papel |
|---|---|
| `js/vision/pose.js` | Carga el detector la primera vez que hace falta y abre la cámara. Hace un bucle que procesa cada fotograma nuevo del vídeo (ver detalles debajo). |
| `js/vision/analyzer.js` | Módulo puro: pasa los 33 puntos (en la imagen y en metros) a medidas de guardia, barbilla, golpes y postura. |
| `js/vision/coach.js` | Módulo puro: elige el tema de cada ronda, decide las indicaciones en directo y redacta el resumen y el informe. |
| `js/audio/voice.js` | `speechSynthesis` con voces locales en español. |
| `js/ui/screens/train.js` | Une todo: ventana de la cámara, indicaciones, resumen en el descanso e informe final. |

**Detalles de `js/vision/pose.js`:**
- **Carga:** la primera vez que hace falta trae unos 25 MB de `vendor/mediapipe`.
- **Detector:** usa la GPU si va rápida y, si no, la CPU (lo decide con una prueba de velocidad).

**Con doble clic (`file://`):** el navegador no deja leer archivos con `fetch` ni cargar scripts con CORS. La solución:
- El WebAssembly y el modelo están en base64 dentro de archivos `.js`.
- El cargador de MediaPipe se inyecta con un `<script>` normal.
- El WebAssembly se compila en memoria y se entrega con el gancho de Emscripten `Module.instantiateWasm`.

Está probado en Chrome sin `--allow-file-access-from-files`. Con `iniciar.bat` (servidor local) funciona igual.

### Medidas (aproximadas, con una sola cámara de frente)

**Guardia:**
- Se mide la altura de cada muñeca entre el hombro (0) y la boca (1) en la imagen. La muñeca a la altura del mentón da ≈ 0,75.
- Mano atrasada: arriba con ≥ 0,6 y baja con < 0,45.
- Mano adelantada: arriba con ≥ 0,45 y baja con < 0,3.
- Solo cuenta con la mano quieta (no durante su golpe).

**Barbilla:** se mide la altura de la nariz respecto a las orejas, dividida por la distancia entre orejas.
- < 0: barbilla levantada.
- ≥ 0,12: recogida.
- ≥ 0,7: mirando al suelo.

**Golpes:** un golpe empieza cuando la muñeca se separa de su posición de guardia (relativa al hombro, en 3D) más de 0,25 veces la longitud del brazo y a más de 1,2 m/s. Cuenta si llega a 0,33 brazos y a 1,6 m/s. De cada golpe se mide:
- **Mano.**
- **Tipo**, por la dirección del desplazamiento y el ángulo del codo:
  - **Uppercut:** sube, con el codo a menos de 135°.
  - **Gancho:** va hacia dentro, con el codo a menos de 140°.
  - **Recto:** el resto.
- **Al cuerpo:** si la muñeca acaba por debajo del hombro.
- **Velocidad máxima de la muñeca.**
- **Ida y vuelta.**
- **Otra mano baja:** la que no golpea baja de 0,4 de guardia.
- **Golpe cargado:** la mano va más de 6 cm hacia atrás o más de 8 cm hacia abajo en los 0,35 s previos.
- **Recogida lenta:** la vuelta dura más de 0,45 s y más de 1,8 veces la ida.
- **Vuelta por abajo:** más de 10 cm por debajo del punto de salida.
- **Recto corto:** el codo no pasa de 140°.
- **Inclinación:** el tronco va más de 30° hacia delante.
- **Solo brazo:** en los golpes de la mano atrasada, la cadera gira menos de 8° y los hombros menos de 15°, medidos desde la guardia 0,3 s antes.

**Postura:**
- Codos abiertos: por fuera del hombro más de 0,35 veces la anchura de hombros.
- Rodillas bloqueadas: a más de 172°.
- Si se ven los pies: base estrecha (< 1), base muy ancha (> 2,8) o «cuadrado» (los pies casi a la misma profundidad).

**Comparación con la combinación en pantalla:**
- Orden de las manos (cíclico, porque la combinación se repite).
- Forma de cada golpe pedido.

Estos umbrales son **orientativos**: salen de la técnica descrita por entrenadores (§4), no de un estudio que los valide con esta cámara. Están todos en `CFG` (`js/vision/analyzer.js`).

### Tema de cada ronda (`coach.js`)

1. **Ronda 1:** técnica.
2. **Primera ronda sin mancuernas a partir de la 2.ª:** velocidad.
3. **Después:** el aspecto con peor puntuación hasta ese momento (guardia, barbilla, cadera, recogida o técnica), sin repetir el de la ronda anterior si hay otro casi igual de flojo.

**Según el material de la ronda:**
- **Con mancuernas:** nunca velocidad.
- **Con papel o toalla:** nunca cadera, porque no hay golpes de la mano atrasada.
- **Con pelota:** nunca barbilla, porque ya la sujeta la pelota.
- **Avisos ligados al material** (salen aunque no sean del tema de la ronda):
  - Con toalla: «Aprieta la toalla con el codo» si abres los codos.
  - Con cinta o goma: «Separa los pies» o «Junta un poco los pies» si la base es muy estrecha o muy abierta.
- **Anuncio de la ronda:** añade una frase del material más importante (cuerda, pelota colgada, mancuernas, toalla, goma o cinta).

**Avisos:**
- **Cuándo saltan:** cuando el error se repite (≥ 2 de los últimos golpes, o más del 40-50 % del tiempo en los últimos 4 s).
- **Separación:** al menos 6 s entre avisos, 4 s si son de guardia o colocación, y 18 s antes de repetir el mismo.
- **Qué avisos salen:** los de guardia y colocación siempre; el resto, solo si son del tema de la ronda.

## 3. Material y bloque de abdomen

**Abdomen al final:**
- Los ejercicios de abdomen (`pattern: 'core'`) ya no salen entre rondas.
- Entre rondas sigue la alternancia de fuerza y cardio.
- Tras el último HIIT hay un descanso y después de 1 a 4 ejercicios de abdomen (según la duración), cada uno con su transición de 5 s. Ese tiempo cuenta dentro de la duración pedida.

**Material (Ajustes → Material; desde el 15-nov-2026 todo viene activado):**
- **Mancuernas de 1 kg:**
  - Van en el 30, 50 o 70 % de las rondas (por defecto, 70 %).
  - Sin peso: la última ronda y las de pelota colgada.
  - Antes del HIIT sale «Deja las mancuernas».
- **Rondas especiales** (como mucho una por ronda, a partir de la 2.ª; con un tipo, rondas 2, 5, 8…; con dos, cada uno 1 de cada 3; con los tres, 1 de cada 4):
  - **Brazo atrasado fijo:** papel entre el guante y la mejilla y toalla (o guante) bajo el codo, los dos de la mano atrasada. Solo hay golpes de la mano adelantada, defensas que no usan la mano atrasada y desplazamientos, sin cambios de guardia.
  - **Cuerda de esquivas:** la comba no se puede saltar en casa, pero atada tensa a la altura del pecho entre dos puntos sirve para esquivar. Todas las combinaciones de esa ronda llevan media cintura, cintura completa o sentadilla, y el foco es Defensa o Contraataque.
  - **Pelota de tenis colgada:** de un hilo, a la altura de la cara; se golpea, se esquiva y se gira a su alrededor. Va sin mancuernas.
- **Material ligero** (uno por ronda, en ciclo):
  - **Pelota pequeña bajo la barbilla.** Si es el único activado, va en las rondas impares, para comparar con y sin pelota.
  - **Cinta en el suelo:** una línea y una cruz. En la línea, la punta del pie delantero y el talón trasero junto a ella; en la cruz, pivotar 90°.
  - **Goma en los tobillos:** una goma circular ligera, justa con los pies a la anchura de los hombros. Antes del HIIT sale «Quítate la goma de los tobillos».
- **Comba imaginaria:** se mantiene en el HIIT.
- **Vista previa → «Antes de empezar»:** interruptor del análisis por cámara y cómo preparar cada objeto que usa la sesión.

**Defensas en el circuito (15-nov-2026):**
- Cintura completa, goma y sentadilla pasan a nivel básico (antes eran avanzadas y solo salían dominadas), igual que 12 combinaciones cortas con ellas.
- El ajuste inicial «Golpes y defensa» ya las incluye, y quien usaba la app las recibe en su biblioteca, en práctica, al abrirla.
- Cada sesión lleva al menos un ejercicio de defensa en el HIIT (media cintura, cintura completa, sentadilla o goma continuas). Con la cuerda puesta, los tres primeros se hacen con ella y la transición avisa: «Ve a la cuerda».

**Nombres en español:**
- SLIP → MEDIA CINTURA
- ROLL → CINTURA COMPLETA
- DUCK → SENTADILLA
- PULL → GOMA

**Ejercicios HIIT renombrados o nuevos:**
- «Media cintura continua»
- «Cintura completa continua»
- «Sentadilla defensiva» (nuevo)
- «Goma continua» (nuevo)

## 4. Investigación (13-nov-2026)

### Sombra con mancuernas

- **Peso:** Boxing Science recomienda mancuernas de 0,5-2 kg.
- **Para qué sirve:** frenar el golpe para cuidar la técnica.
- **Para qué no sirve:** **no** para ganar pegada.
- **Riesgos:** con más peso cambia la técnica y se cargan más los músculos de la parte delantera del hombro.
- **Volumen:** las fuentes no coinciden. Hay desde 1-2 rondas de 3 min en el calentamiento hasta 3-5 rondas para la resistencia. Lo que sí coinciden es en rondas cortas, de técnica y con poco peso.
- **Codo:** varias fuentes advierten de no bloquear ni hiperextender el codo con peso.
- **Evidencia:** no hay un estudio que mida la sombra con mancuernas. Un trabajo de 2025 recuerda que la evidencia sobre ejercicios de golpeo con mancuernas es limitada.
- **Qué hace la app:**
  - El 70 % que pidió el usuario está por encima de lo que suelen recomendar los entrenadores.
  - Para compensarlo, en esas rondas el tema nunca es la velocidad.
  - La última ronda va siempre sin peso.
  - Se recuerda no bloquear el codo.
  - El informe compara la velocidad con y sin peso.

**Fuentes:**
- [Boxing Science: shadow boxing with weights](https://boxingscience.co.uk/shadow-boxing-with-weights/)
- [Expert Boxing](https://expertboxing.com/will-shadowboxing-with-weights-make-you-punch-faster-or-stronger)
- [FightCamp](https://blog.joinfightcamp.com/training/flo-masters-3-reasons-to-shadowbox-with-hand-weights/)
- [CUNY Home Fitness](https://pressbooks.cuny.edu/homefitness/chapter/shadowboxing-for-cardio/)
- [Frontiers in Physiology 2025](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1607933/pdf)

### Pelota bajo la barbilla y papel en la mejilla

- **Pelota:** es una ayuda táctil (si cae, has levantado la cabeza). Solo hay opinión de entrenadores, no estudios.
- **Papel:** no hay fuentes de este ejercicio con papel. Sí del equivalente con una moneda: se coloca entre el guante dominante (el atrasado) y la mandíbula, se golpea con la otra mano y la moneda no debe caer. El de papel funciona igual.

**Fuentes:**
- [Evolve MMA: tennis ball drills](https://evolve-mma.com/blog/16-tennis-ball-drills-to-sharpen-your-boxing-skills-and-reflexes/)
- [Muay Thai Guy: keeping your chin tucked](https://muay-thai-guy.com/blog/muay-thai-heavy-bag-drill-keeping-your-chin-tucked)
- [Evolve MMA: keep your hands up](https://evolve-mma.com/blog/10-tips-and-drills-to-keep-your-hands-up-and-maintain-great-defense-in-boxing/)

### Objetos para la postura, los pies y la cabeza (15-nov-2026)

Todos son ejercicios de entrenadores, no de estudios: no he encontrado ensayos que los comparen.

- **Cuerda de esquivas:** una cuerda o goma tensa de al menos 3 m, a la altura del pecho. Se avanza por debajo esquivando y se contraataca.
- **Línea y cruz de cinta:** con la línea se mantiene la guardia de piernas al avanzar y retroceder; con la cruz, se pivota 90° sin perderla.
- **Cuerda elástica atada a los pies:** mantener la base al moverte en todas direcciones.
- **Guante bajo el codo:** mantener el codo cerrado. La toalla es una adaptación nuestra: en boxeo solo he encontrado la versión con un guante; con toalla se usa en golf y béisbol.
- **Pelota de tenis colgada:** golpear, esquivar y pivotar a su alrededor (precisión y ritmo).

**Fuentes:**
- [Deniz Ates: props for boxing technique](https://orchid-nonagon-9x9b.squarespace.com/blog/props-for-boxing-technique)
- [Evolve MMA: slip cord drills](https://evolve-mma.com/blog/3-boxing-slip-cord-drills-you-should-try)
- [FightCamp: slip rope drill](https://blog.joinfightcamp.com/training/boxing-movement-and-footwork-training-slip-rope-drill/)

### Técnica y errores frecuentes (base de los avisos)

- **Bajar la guardia:** es el error más citado, sobre todo con cansancio y al lanzar el gancho.
- **Golpear solo con el brazo:** en el directo, el fallo más común es girar poco. La cadera y el hombro giran con el pivote del pie atrasado.
- **Recogida:** el puño vuelve por el mismo camino por el que salió. Los principiantes lo devuelven más bajo.
- **Barbilla y codos:** la barbilla va recogida detrás del hombro adelantado y los codos cerrados («codos dentro = manos arriba»).
- **Gancho:**
  - El codo va a unos 90°, a la altura del puño. Es una referencia de enseñanza, no una regla.
  - No se carga echando la mano hacia atrás o abajo, porque eso telegrafía el golpe.
- **Postura:**
  - Base de más o menos el ancho de los hombros.
  - Rodillas algo flexionadas.
  - No estar «cuadrado».
  - No inclinarse por delante de la rodilla adelantada.

**Fuentes:**
- [Expert Boxing: top 5 beginner mistakes](https://expertboxing.com/top-5-beginner-boxing-mistakes)
- [Evolve MMA: hooks](https://evolve-mma.com/blog/5-common-mistakes-to-avoid-when-throwing-hooks-in-boxing/)
- [FightCamp: jab & cross](https://blog.joinfightcamp.com/training/how-to-throw-boxing-jab-cross-punches/)
- [CUNY: stance and guard](https://pressbooks.cuny.edu/homefitness/chapter/basic-boxing-stance-and-guard/)
- [Expert Boxing: the perfect stance](https://expertboxing.com/the-perfect-boxing-stance)
- [Evolve MMA: the cross](https://evolve-mma.com/blog/mastering-the-cross-small-adjustments-that-make-a-huge-impact/)
- [FightCamp: hooks](https://blog.joinfightcamp.com/training/how-to-throw-a-boxing-lead-hook-rear-hook/)

### Velocidad de los golpes

En el estudio de Stanley et al. (2018), con 15 boxeadores aficionados golpeando un saco a máxima intensidad:
- **El más rápido:** el gancho adelantado, con 11,95 ± 1,84 m/s de velocidad máxima del puño.
- **El de menor tiempo de llegada:** el jab.

Otros trabajos dan unos 7-10 m/s para el directo, según el método. Son valores de puño contra saco; la app mide la **muñeca** en sombra con una cámara. Por eso la velocidad sirve para comparar tus rondas entre sí, no con estos estudios.

**Fuentes:**
- [Stanley et al. 2018 (manuscrito aceptado)](https://core.ac.uk/download/189160975.pdf)
- [Frontiers 2025](https://www.frontiersin.org/journals/physiology/articles/10.3389/fphys.2025.1607933/pdf)

### Detección de golpes con la postura

- Existe un trabajo que reconoce rectos con MediaPipe BlazePose (Khasanshin, 2022).
- Otros clasifican golpes con esqueletos 2D (BoxingVI, 2025).
- **Límite:** un trabajo de 2024 (FACTS) advierte que la postura sola puede quedarse corta para clasificar golpes con precisión.
- No se encontró ningún estudio revisado sobre análisis de la guardia con MediaPipe.

**Fuentes:**
- [Khasanshin 2022](https://sciencesport.ru/sites/default/files/media/articles/files/2022-07/05_Khasanshin_43-48.pdf)
- [BoxingVI](https://arxiv.org/pdf/2511.16524v1)
- [FACTS](https://arxiv.org/html/2412.16454v1)

## 5. Limitaciones

- **Esquivas, cuerda y pelota colgada:** la cámara no mide si pasas bien bajo la cuerda ni si tocas la pelota. En esas rondas solo valen la guardia, la barbilla y los golpes.

- **No se ha probado con una persona real.** Con una cámara simulada sí está comprobado: carga sin conexión con doble clic, detecta a unos 40 fotogramas/s y apaga la cámara al terminar. La lógica del análisis se ha comprobado con un cuerpo sintético (`tests/specs/09-vision.test.js`).
- **Una sola cámara de frente ve mal la profundidad.** Los rectos van hacia la cámara, así que su extensión, la velocidad y el giro de cadera son aproximados.
- **Dónde miras:** no se puede saber hacia dónde miran los ojos, solo la posición de la cabeza (barbilla arriba o abajo, mirada al suelo).
- **Gancho y uppercut** se distinguen peor que el recto.
- **Detección:** con guantes o mancuernas la mano se detecta algo peor. Funciona mejor con buena luz y el cuerpo entero en la imagen.
- **Lo que no se mide:** el pivote del pie atrasado, el reparto del peso y el movimiento de cabeza tras combinar.
