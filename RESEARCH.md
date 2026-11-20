# RESEARCH — SOMBRA · Shadow Boxing Trainer

Investigación de mercado, metodología y decisiones de diseño para una aplicación local de entrenamiento de shadow boxing (boxeo olímpico amateur).
Fecha de la investigación: 30 de octubre de 2026.

Convención de etiquetas en todo el documento:

- **[Fuente]**: información respaldada por una fuente identificada (con su nivel de lectura).
- **[Recomendación metodológica]**: criterio de entrenamiento razonado a partir de las fuentes o de la práctica habitual de los entrenadores, sin un estudio que lo fije de forma directa.
- **[Decisión de diseño]**: lo que adopta SOMBRA. Puede apoyarse en lo anterior, pero es una elección nuestra.
- **[Inferencia]**: deducción propia a partir de lo observado (por ejemplo, una cifra calculada a partir de una captura).

---

## 1. Alcance y limitaciones

- **No se instaló ninguna aplicación.** El análisis se basa en las **fichas públicas de Google Play** (versión en inglés, región EE. UU., consultadas el 30-oct-2026), en las **reseñas visibles** en esas fichas (2–3 por app) y en **15 capturas de pantalla** de 5 apps descargadas de Google Play. Las capturas son material promocional: pueden no coincidir con la versión actual de la interfaz.
- No se vieron vídeos demostrativos de las apps. Las valoraciones y descargas son las que mostraba la ficha ese día.
- No se pudo comprobar cómo estructuran internamente sus sesiones de 20/30/45 minutos ni a qué velocidad cambian las combinaciones: ninguna ficha lo publica. Donde se da una cifra a partir de una captura, va marcada como **[Inferencia]**.
- **Manual de entrenadores de AIBA:** se localizó una ficha del documento («AIBA Coach Manual», 276 páginas) pero el visor no cargó el PDF; no se ha usado.
- **Manual de USA Boxing (Grassroots Task Force, 2014):** solo se vio su índice en un resultado de búsqueda; no se ha usado.
- Fuentes científicas leídas **a texto completo**: reglamento de World Boxing (marzo 2026) y la carta de Herrera-Valenzuela, Valdés-Badilla y Franchini (2020). El resto se consultó **en resumen o por cita secundaria** (se indica en cada caso en la sección 4).
- No se han inventado referencias. Si una afirmación no tiene fuente localizada, se dice.

---

## 2. Aplicaciones analizadas

### 2.1 Tabla comparativa (según ficha de Google Play y capturas)

| App (id) | Valoración / descargas | Tipos de entrenamiento | Presentación de combinaciones | Niveles / progresión | HIIT / acondicionamiento | Personalización | Offline | Modelo |
|---|---|---|---|---|---|---|---|---|
| **The Shadow Boxing Workout App** (com.marcgg.boxing) | 4,8★ · 10K+ | Pad work (combos simples y libres), Freestyle, Repetitions (un combo toda la ronda), Punching bag, Defense, Footwork, Dodge, Body shots, Counter punching; programas por días | Voz + texto grande con números y palabras («1 - 2 - 3 & Slip Left»); en otras rondas, nombre + números bajo un vídeo («Jab - Cross - Lead hook - Rear uppercut (1-2-3-6)») | Programas por días (p. ej. «Day 1 – First punches», «Day 2 – Hooks»; «Hitting the Bag», Intermediate, 8 días); recomendaciones «basadas en tu perfil» | Calistenia entre rondas (flexiones, burpees, mountain climbers, sentadillas, abdominales); rondas «Strength & Cardio» con ejercicio + golpes | Crear entrenamientos y HIIT propios; temporizador con presets | No consta | Freemium (las reseñas piden más contenido gratuito) |
| **Heavy Bag Pro** (com.opentechiz.heavybagpro) | 4,9★ · 1M+ | Técnica, drills, HIIT, con compañero; boxeo, kickboxing, muay thai; calentamiento y vuelta a la calma | Texto con nombres completos («Jab, cross, pull back, cross, lead hook, cross») + figura 3D animada golpeando un saco + voz | «Good for all levels»; «Learning corner» | Acondicionamiento incluido en los entrenamientos | Entrenamientos propios con cualquier combo | No consta | Suscripción (gratis: 3 entrenamientos) |
| **Boxa: Shadow Boxing & Combos** (shadowboxing.app) | 4,3★ · 100K+ | Sets de combos y sesiones; boxeo, kickboxing, muay thai | Palabras grandes en pantalla horizontal («JAB», «left HOOK», «CROSS») alrededor de un temporizador digital + texto a voz | No se ve progresión; sets temáticos de 10 combos | No consta | Generador de combos («Generate new»), combos y movimientos propios, rondas configurables | No consta | Gratis o pago único |
| **Boxing Training: Learn to Box** (com.awaytix.boxing) | Sin valoración · 0+ (recién publicada) | Curso de 30 días con «cinturones», programas (defensa y contras, saco, primer sparring…) | Números grandes con nombre pequeño debajo («1 · 2 · slip left · 3» → jab, cross, left hook) + figura ilustrada animada debajo; voz por nombre o número | Curso por días («Day 13 · Rolls»), día de test cada 5 días; biblioteca con «learned: 10» | Acondicionamiento y comba en la biblioteca | Combos propios | No consta | Pase de pago único |
| **Boxing Combo Timer & Coach** (com.boxingtrainer.boxing_combo_trainer) | Sin valoración · 1K+ | Programas Pro: Technique Builder, Cardio Blitz, Speed & Timing, Defense Drills, Endurance… | Recuadro de texto con nombres («Jab - Cross - Hook L») bajo un temporizador circular + voz | Programas por objetivo | «Strength Focus», «Cardio Blitz» | Constructor de combos (19 golpes y defensas), rondas personalizadas | Sí («fully offline») | Pago único, 14 días de prueba |
| BOXR (uk.plsfixlabs.boxingclub) | 4,7★ · 100K+ | 100+ entrenamientos de combate y peso corporal | Voz + animaciones | Rankings y retos | HIIT, kettlebell, acondicionamiento | No consta | No consta | Pago |
| ShadowBox (com.etg.shadowboxingcoach) | Sin valoración · 5K+ | Shadow y saco; boxeo y muay thai | Voz | Planes por nivel; complejidad de combo configurable | No consta | Rondas, descansos y complejidad | Sí | No consta |
| Boxing Coach: Bag Training (com.karanbangia.boxingcoach) | Sin valoración · 50+ | Sesiones de coach, shadow y saco | Voz + llamada en pantalla; señales de movimiento y defensa entre combos | Basic/Medium/Advanced/Pro; ajuste «demasiado fácil / bien / demasiado difícil» | No consta | Rondas, ritmo de llamadas | Historial local | Premium de pago único |
| PRO BOXING (com.proboxing) | — | 500+ comandos: ataque, defensa, footwork, fintas, contras, estilos | Voz, combos barajados | No consta | Tabata, intervalos, recuperación activa | Rutinas propias | No consta | No consta |
| Fitivity (Shadowboxing / Learn to Box) | 3,2★–3,6★ · 50K+–100K+ | Programas semanales | Audio + vídeo HD | Semanas | Ejercicios complementarios | No consta | Parcial | Compras in-app |
| Train Like a Boxer (boxer.fighter.workout) | 3,9★ · 1M+ | Programas de 4 semanas de ejercicios (no combos) | Texto | Programas | Es el núcleo | No consta | No consta | Anuncios o pago |
| PunchLab, SparPad, COMBO (IA) | 4,6★ SparPad | Entrenos guiados por coach; cámara/sensor | Vídeo/voz | Seguimiento de rendimiento | Sí (PunchLab) | — | — | Suscripción |

### 2.2 Lo que muestran las capturas

**Pantalla principal**
- *Shadow Boxing Workout App*: cabecera «Home» con accesos rápidos («Create workout», «Bookmarks», «Profile»), carrusel «Recommended for you» con tarjetas fotográficas y duración («Learn basic defenses · 21 min»), lista «Workouts (98)» con duración (20 min, 24 min) y barra inferior Home / Progress / Timer / Techniques / More.
- *Heavy Bag Pro*: menú vertical con «Choose your style» (Boxing / Kick boxing / Muay Thai), Favorites, Custom, Round Timer y Learning Corner.
- *Boxa*: dos pestañas, «Sets» y «Sessions»; tarjetas de sets («Starter Set · 10 combos») y botón único «Start boxing». El selector de combos agrupa sets temáticos de 10: Classic, Speed, Power Shots, Inside Fighting, Body Work, Slip Counters, Footwork…, con «Generate new» y «Create blank».
- *Learn to Box (Awaytix)*: biblioteca «Moves» (110 movimientos, «learned: 10») con buscador y tarjetas por categoría: Stance & Footwork (11), Punches (17), Combinations (18), Defence (14).
- *Boxing Combo Timer*: panel «My Stats» (sesiones, rondas, combos, esta semana), listas de combos, «Start workout» y ajustes actuales: **ronda 3:00, descanso 1:00, 12 rondas**.

**Durante el entrenamiento**
- Todas colocan un **temporizador grande** (circular en tres de ellas) y un indicador de ronda («Round 2 / 8», «ROUND 2 OF 4», «ROUND 1 / 12»). Dos muestran además una barra segmentada de rondas y el tiempo total restante («17:12 left»).
- La combinación se presenta de cuatro formas distintas:
  1. Números + palabras en texto grande, sin imagen (Shadow Boxing Workout App: «1 - 2 - 3 & Slip Left»).
  2. Nombres completos en un párrafo pequeño encima de una animación 3D (Heavy Bag Pro).
  3. Palabras sueltas grandes repartidas por la pantalla (Boxa).
  4. Números muy grandes con el nombre en pequeño debajo y las técnicas no numéricas en otro color (Awaytix: «1 · 2 · slip left · 3»), con la figura animada debajo.
- En las rondas de acondicionamiento de la Shadow Boxing Workout App aparece un vídeo a pantalla completa con el nombre del ejercicio («Squats + punches»), una línea de instrucción y un temporizador de 0:27.
- Las animaciones técnicas de Awaytix permiten cámara lenta (¼×, ½×), fotograma a fotograma, trayectoria del golpe y espejo para zurdos; Boxing Combo Timer muestra una figura 3D con «Key points» del golpe («Punch #3 · Lead Hand»).
- **Descansos:** ninguna captura muestra la pantalla de descanso; no se puede describir.
- **Progresión:** visible solo como programas por días (Shadow Boxing Workout App, Awaytix) y contador de movimientos aprendidos (Awaytix).

**[Inferencia]** de la captura «Round 2 / 8 · 1:17 en la ronda · 17:12 restantes»: las 6 rondas restantes ocupan unos 15:55, es decir, unos 2:40 por ronda incluido el descanso. En otra sesión de la misma app («Round 1 / 6 · 16:47 left») salen unos 2:48 por ronda. Son rondas de 2–3 minutos con descanso corto, coherentes con el formato de competición.

**[Inferencia]** Dos capturas muestran combinaciones con esquiva que encajan con la gramática que adoptamos (§7.1): «1 · 2 · slip left · 3» y «1 - 2 - 3 & slip left». Para un diestro, el slip a la izquierda es el «slip al lado adelantado», que carga el gancho adelantado (3). No es una fuente de autoridad, pero confirma que es una secuencia habitual.

### 2.3 Quejas y peticiones recurrentes en las reseñas visibles

| Problema | App y reseña |
|---|---|
| Pocas combinaciones y repertorio pobre: sin golpes al cuerpo, sin combos de 4+ golpes, sin defensa | BOXR |
| Opción «trabajar defensa» sin defensa real; piden bob & weave, bloqueos, slips y fintas | BOXR |
| La voz motivacional y la música tapan la instrucción | BOXR |
| Falta botón de pausa durante el ejercicio; faltan vídeos o explicaciones | Train Like a Boxer |
| Falta vídeo demostrativo | Boxa |
| Sesiones por defecto de más de 15 min; piden opciones de 7–10 min | Shadow Boxing Workout App |
| Todo es compra in-app / muro de pago | Fitivity, SparPad |
| Fallo visual al editar un combo | Boxa |

En positivo, las reseñas valoran: tutoriales ordenados para aprender la numeración (Shadow Boxing Workout App), poder crear sesiones propias con sets y descansos (Boxa) y la variedad (las fichas de Heavy Bag Pro y ShadowBox la usan como argumento comercial: «Every round is different»).

**Conclusión de mercado:** la variedad y la defensa real son los puntos débiles más citados. La voz aparece en casi todas las apps como canal principal, aunque una parte de los usuarios entrena con música y pide no tener que mirar la pantalla. Esta app se va a usar delante de un monitor, a distancia, y el usuario conoce la numeración, así que el canal visual con números grandes es el adecuado.

---

## 3. Estructuras de entrenamiento identificadas

| Elemento | Lo observado |
|---|---|
| Duración de ronda | 3:00 por defecto en Boxing Combo Timer; unos 2:40–2:50 por ronda con descanso **[Inferencia]** en la Shadow Boxing Workout App; rondas configurables en todas. |
| Descanso | 1:00 por defecto en Boxing Combo Timer; configurable en las demás. |
| Nº de rondas | 4 (Awaytix, un día de curso), 6–8 (Shadow Boxing Workout App), 12 (Boxing Combo Timer), hasta 16 (Heavy Bag Pro). |
| Duración de sesión | Las sesiones que se ven en las capturas duran 20–24 min; hay un «20 minutes HIIT» (ficha) y un HIIT de saco de 17 min con 6 min de calentamiento aparte. |
| Integración del HIIT | Calistenia **entre rondas** de boxeo (Shadow Boxing Workout App) o rondas propias de acondicionamiento con ejercicio + golpes; Heavy Bag Pro incluye calentamiento, vuelta a la calma y acondicionamiento; PRO BOXING ofrece «recuperación activa». |
| Modos de combinación | **Repetición** (un combo toda la ronda: «Repetitions») frente a **llamadas variables** («Pad work», combos barajados, «every round is different»), más Freestyle con sugerencias. |
| Organización por objetivo | Técnica, velocidad, potencia, defensa, contras, cuerpo, footwork, resistencia y simulación de combate (Boxa, Boxing Combo Timer, Shadow Boxing Workout App). |
| Progresión | Por días o semanas (cursos), por nivel elegido (Basic → Pro) o por feedback de dificultad. Ninguna ficha describe una progresión ligada a qué técnicas domina el usuario. |
| Velocidad de cambio de combos | No publicada. Solo se ve un temporizador de 0:15 junto a una combinación (no se sabe si cuenta la combinación o el segmento). |

---

## 4. Fuentes técnicas consultadas

| Fuente | Qué se extrajo | Nivel de lectura |
|---|---|---|
| **World Boxing — Competition Rules, in force March 2026 (v5.0)**. <https://worldboxing.org/wp-content/uploads/2026/10/World-Boxing-Competition-Rules-March-2026-v5.0.pdf> | Art. 1.1.5: el combate tiene 3 asaltos y 2 descansos. Art. 1.1.6: asaltos de **3 min** en Elite y U19 y de **2 min** en U17. Art. 1.1.7: descanso de **1 min** en todas las competiciones. Art. 7.2: criterios de puntuación por orden (nº de golpes puntuables, superioridad técnica y táctica, competitividad). Art. 7.2.2: golpe puntuable = limpio, con el peso del cuerpo u hombro, con la superficie de los nudillos, sin infracción. Arts. 7.2.2.3–7.2.2.4: zona válida = frente y laterales de cabeza y tronco por encima del cinturón. Art. 7.2.3.1: la superioridad técnica incluye **combinar ataque y defensa**, controlar la posición con **movimiento lateral**, **romper el ritmo** del rival y evitar golpes con **bloqueo, esquiva lateral (slip), esquiva rotatoria (weaving), parada o desplazamiento**. Faltas: art. 8.5.10, golpe con pivote o de revés; art. 8.5.29, agacharse por debajo del cinturón del rival; art. 8.5.30, **defensa completamente pasiva** (doble cobertura, caer, huir, dar la espalda). | Texto completo (PDF descargado y buscado) |
| **Franchini E. et al. (2020).** High-intensity interval training prescription for combat-sport athletes. *Int J Sports Physiol Perform* 15(6):767–776. doi:10.1123/ijspp.2020-0289 | Propone prescribir HIIT en deportes de combate con cuatro tipos de protocolo: intervalos cortos, intervalos largos, sprints repetidos y sprint interval training, construidos con acciones específicas del deporte. Individualiza con pruebas específicas y parámetros de *time-motion* (acciones de alta y baja intensidad, relación esfuerzo-pausa). | Resumen y registros de catálogo |
| **Franchini E., Cormack S., Takito M. Y. (2019).** Revisión sistemática del HIIT en deportes de combate olímpicos. *J Strength Cond Res.* | El beneficio más constante del HIIT fue la mejora de la condición anaeróbica (potencia y capacidad). Por lo general no cambió la masa ni la grasa corporal. | Resumen; también citado en Herrera-Valenzuela 2020 |
| **Herrera-Valenzuela T., Valdés-Badilla P., Franchini E. (2020).** High-intensity interval training recommendations for combat sports athletes during the COVID-19 pandemic. *Rev Artes Marciales Asiát* 15(1):1–3. doi:10.18002/rama.v15i1.6230 | Tabla 1 (boxeo, protocolo original de Kamandulis et al., 2018): saco, **3 rondas con 1 min entre rondas, cada una de 14 × 3 s de golpeo con 10 s de pausa, 3 veces por semana**. Recomiendan hacerlo en sombra, saco o manoplas. Los protocolos HIIT deben **complementarse con ejercicios de fuerza con el propio peso corporal**, «similares a los ejercicios técnicos» y con la relación esfuerzo-pausa del deporte. | Texto completo |
| **Registro de estudio en la base de datos IAT de la Universidad de Leipzig** (entrenamiento de sprints repetidos de golpeo en boxeadores amateurs experimentados). | 4 semanas, 18 boxeadores (experimental y control). Golpeo a máxima intensidad, 3 sesiones por semana, unos 2 min de golpeo máximo por sesión. Mejoraron la potencia aeróbica del tren superior y las capacidades de golpeo. **[Inferencia]** 14 × 3 s × 3 rondas ≈ 2 min, lo que coincide con el protocolo que Herrera-Valenzuela atribuyen a Kamandulis et al. (2018); el registro consultado no mostraba los autores. | Resumen del registro |
| **Chaabène H. et al. (2015).** Amateur boxing: physical and physiological attributes. *Sports Med* 45(3):337–352. doi:10.1007/s40279-014-0274-7 | Revisión de referencia sobre el perfil físico-fisiológico del boxeo amateur. **No se consultó su contenido**; solo se verificó la cita. | Solo cita |
| **Davis P., Wittekind A., Beneke R. (2013).** Amateur boxing: activity profile of winners and losers. *Int J Sports Physiol Perform* 8(1):84–91. doi:10.1123/ijspp.8.1.84 | Perfil de actividad de boxeo amateur novel (3 × 2 min, análisis de vídeo). Según una revisión posterior, **los ganadores mostraron mayor frecuencia de golpeo y más desplazamientos** que los perdedores. | Resumen y cita secundaria |
| **The effect of fatiguing lower-body exercise on punch forces in highly-trained boxers.** *Eur J Sport Sci.* PubMed 33858296 | 28 boxeadores amateurs muy entrenados. Tras un ejercicio fatigante de tren inferior (remo intenso) bajaron la fuerza y la tasa de desarrollo de fuerza del golpe, **más en directos y ganchos que en el jab**. Los autores piden estudiar la fatiga del propio combate. | Resumen |
| **Fusing Accelerometry with Videography to Monitor the Effect of Fatigue on Punching Performance in Elite Boxers.** PMC7601017 | Como contexto, recoge que la producción prolongada de golpes en entrenamiento o competición reduce la velocidad de golpeo. | Resumen |
| **Shea J. B., Morgan R. L. (1979).** Contextual interference effects on the acquisition, retention, and transfer of a motor skill. *J Exp Psychol: Human Learning and Memory* 5(2):179–187 | La práctica **en bloque** (baja interferencia) rinde más durante la adquisición; la práctica **aleatoria** (alta interferencia) produjo mejor retención y transferencia, sobre todo en la tarea de transferencia más compleja. | Resumen y cita secundaria |
| **Czyż S. H. et al. (2024).** Metaanálisis sobre el efecto de interferencia contextual. *Frontiers in Psychology.* | Efecto medio sobre la transferencia a favor de la práctica aleatoria (SMD = 0,55). El mismo resumen recoge críticas de otros autores que encuentran efectos pequeños o no significativos. **Es un efecto debatido.** | Resumen de búsqueda |
| **Buchheit M., Laursen P. B. (2013).** High-intensity interval training, solutions to the programming puzzle. Part I. *Sports Med* 43:313–338 (Part II: 43:927–954, doi:10.1007/s40279-013-0066-5) | Define el HIIT como esfuerzos de duración corta a larga a intensidad elevada intercalados con recuperaciones, y lo programa manipulando variables (intensidad y duración del esfuerzo, de la recuperación, nº de repeticiones). | Resumen secundario |
| **Numeración de golpes 1–6** (divulgativo): FightCamp, «The punch number system 1-6 explained» <https://blog.joinfightcamp.com/training/the-punch-number-system-1-6-explained/>; Evolve MMA, «Understanding the boxing punch number system» <https://evolve-mma.com/blog/boxing-fundamentals-understanding-the-boxing-punch-number-system/> | 1 jab, 2 cross, 3 gancho adelantado, 4 gancho atrasado, 5 uppercut adelantado, 6 uppercut atrasado. Impares = mano adelantada; pares = atrasada. Se usa una «b» para el cuerpo (1b). La numeración no cambia para zurdos (cambia la mano). Hay variaciones entre gimnasios. | Resumen de búsqueda |
| **Guías divulgativas de shadow boxing** (varias webs de calidad baja o media) | Consenso: tratar las rondas por temas (footwork, defensa, combinaciones), moverse siempre, que la defensa sea lo más olvidado del shadow boxing y que la defensa prepare el contraataque. **No se usan como respaldo principal.** | Resumen de búsqueda |

No se localizó ninguna fuente que fije **cada cuántos segundos debe cambiar una combinación** en el shadow boxing, ni una duración óptima de intervalo específica para el shadow boxing técnico. Esos parámetros se presentan como recomendación o decisión de diseño.

---

## 5. Metodología recomendada

### 5.1 Duración de los intervalos de shadow boxing

- **[Fuente]** Los asaltos de competición duran 3 min en Elite y U19 y 2 min en U17, con 1 min de descanso (World Boxing, arts. 1.1.6–1.1.7).
- **[Fuente]** Los protocolos de HIIT específico de boxeo usan esfuerzos máximos muy cortos (14 × 3 s / 10 s por ronda; Herrera-Valenzuela et al., 2020, sobre Kamandulis et al., 2018). Franchini et al. (2020) distinguen protocolos de intervalos cortos, largos, sprints repetidos y sprint interval.
- **[Recomendación metodológica]** El shadow boxing técnico no es un esfuerzo máximo: busca calidad y repetición. Dividir la ronda en intervalos de 30–60 s con una tarea concreta (una combinación repetida o una serie de combinaciones) mantiene la atención en el gesto y permite cambiar de foco sin parar, mientras la ronda completa se queda en 2–3 min, cerca del formato de competición.
- **[Decisión de diseño]** Intervalo de **45 s en básico y 55 s en avanzado**, **3 intervalos por ronda** (rondas de 2:15 y 2:45). El ajuste fino al tiempo total mueve cada intervalo ±5 s (entre 30 y 75 s).

### 5.2 Descansos

- **[Fuente]** Descanso reglamentario de 1 min entre asaltos.
- **[Recomendación metodológica]** En un circuito que alterna boxeo y HIIT, el «descanso» entre rondas puede ser parcialmente activo, siempre que la siguiente ronda técnica empiece con una recuperación real.
- **[Decisión de diseño]** **Transición de 5 s → HIIT (30/40/45 s) → descanso de 30 s** (configurable; 20 s en el objetivo Resistencia). Con exigencia alta pasan 75 s entre dos rondas de boxeo, del mismo orden que el minuto reglamentario. Las sesiones con 10 o más bloques tienen un descanso largo (+30 s) en el bloque central. La última ronda termina con el HIIT, sin descanso final.

### 5.3 Frecuencia de cambio de combinaciones

- **[Fuente]** No se encontró ninguna.
- **[Recomendación metodológica]** El tiempo de cada combinación debe crecer con su número de acciones, de modo que dé para repetirla limpia unas 3–4 veces con recolocación de guardia y movimiento entre repeticiones. Un tiempo fijo hace que los combos largos queden a medias y los cortos aburran.
- **[Decisión de diseño]** Tiempo por combinación en VARIACIÓN: básico `clamp(4 + 2,6·n, 8, 18)` s; avanzado `clamp(4 + 2,1·n, 7, 18)` s (n = nº de acciones), multiplicado por el ritmo elegido (lento ×1,25, normal ×1, rápido ×0,8) y por el objetivo (Velocidad cambia más rápido).

| Acciones (n) | Básico | Avanzado |
|---|---|---|
| 2 (1-2) | 9,2 s | 8,2 s |
| 3 (1-2-3) | 11,8 s | 10,3 s |
| 4 (1-2, slip, 2) | 14,4 s | 12,4 s |
| 6 (1-2-3, roll, 3-2) | 18 s (límite) | 16,6 s |

### 5.4 Progresión de la dificultad

- **[Fuente]** La práctica en bloque favorece el rendimiento durante la adquisición y la práctica variable o aleatoria favorece la retención y la transferencia (Shea & Morgan, 1979; metaanálisis 2024 con SMD 0,55 en transferencia). El efecto es debatido.
- **[Recomendación metodológica]** Una técnica recién aprendida se consolida primero con repetición en contextos sencillos. Cuando ya se ejecuta bien, se mezcla con otras en orden aleatorio y en secuencias más largas. «Avanzado» significa más complejidad técnica y coordinativa (combinar ataque, defensa y desplazamiento, cambios de nivel, ángulo y ritmo), no más golpes ni más fatiga. Así lo pide el usuario, y coincide con los criterios de superioridad técnica de World Boxing (art. 7.2.3.1).
- **[Decisión de diseño]**
  - **Sistema 1, REPETICIÓN:** una combinación todo el intervalo. **Sistema 2, VARIACIÓN:** combinaciones distintas que van cambiando. Si una ronda tiene repetición seguida de variación, la combinación repetida reaparece dentro de la variación (transferencia).
  - Dentro de la sesión, las primeras rondas tienen más repetición y menos complejidad, y las últimas más variación y algo más de complejidad, siempre dentro del nivel. No es un calentamiento: el usuario ya llega calentado de 10 min de comba.
  - Biblioteca personal con estados: **APRENDIDO** (consolidación: combinaciones sencillas, de complejidad ≤ 2,5, y peso extra en repetición), **EN PRÁCTICA** (aparece 2,5 veces más y en combinaciones de hasta complejidad 4) y **DOMINADO** (cualquier complejidad; base de las sesiones avanzadas).
  - Introducción progresiva: como máximo 2 movimientos nuevos destacados por sesión, con demostración automática la primera vez que aparecen.

### 5.5 Alternancia entre técnica, coordinación, fuerza y resistencia

- **[Fuente]** El HIIT debe complementarse con fuerza con el propio peso corporal (Herrera-Valenzuela et al., 2020). El beneficio más constante del HIIT en combate es la condición anaeróbica (Franchini et al., 2019).
- **[Recomendación metodológica]** Repartir la carga a lo largo de la sesión. Si toda la fuerza va al principio o todo el cardio al final, el segundo bloque se hace siempre con la misma fatiga.
- **[Decisión de diseño]** Cada bloque lleva **un HIIT, en alternancia estricta fuerza → cardio → fuerza…**, empezando por la categoría contraria a la de la sesión anterior. Los focos técnicos de las rondas rotan según el objetivo de la sesión.

### 5.6 Ejercicios HIIT adecuados para boxeadores

- **[Fuente]** Ejercicios de peso corporal «similares a los técnicos» (Herrera-Valenzuela et al., 2020). La fatiga del tren inferior reduce la fuerza del golpe, sobre todo en directos y ganchos (PubMed 33858296), lo que indica la importancia de las piernas en la producción del golpe.
- **[Recomendación metodológica]** En fuerza: empuje (flexiones y sus variantes, incluidas las pliométricas), piernas (sentadillas y zancadas, también con salto), core con componente de rotación y anti-extensión (planchas dinámicas, mountain climbers) y ejercicios globales (burpees). En cardio y coordinación: saltos, skipping, desplazamientos rápidos en guardia y agilidad. Para una persona en buena forma hacen falta variantes exigentes (palmada, archer, zancada explosiva…).
- **[Decisión de diseño]** Biblioteca HIIT con exigencia 1–3 y patrón de movimiento. La **exigencia física es un ajuste independiente del nivel técnico** (moderada 30 s, alta 40 s, muy alta 45 s), para que «avanzado» no se convierta en «más cansado». Sin repetir ejercicio en la sesión, sin repetir patrón en dos bloques seguidos de la misma categoría y sin encadenar dos de alto impacto. Los ejercicios usados en las 3 últimas sesiones pesan menos. En pantalla aparecen solo el nombre y el temporizador.

### 5.7 Combinaciones y su aplicación técnica

- **[Fuente]** Numeración 1–6 (fuentes divulgativas), con la «b» para el cuerpo. Golpe puntuable: nudillos, peso del cuerpo detrás, zona válida en cabeza y tronco por encima del cinturón (World Boxing 7.2.2). El golpe de revés o con pivote es falta (8.5.10).
- **[Recomendación metodológica]** Las combinaciones encadenan rotaciones alternas del tronco: cada golpe de potencia deja cargado el lado contrario (2 → 3 → 2). Las combinaciones mezclan niveles (cabeza y cuerpo) y casi siempre se cierran con defensa o salida.
- **[Decisión de diseño]** Biblioteca curada de combinaciones con su aplicación explicada, más un **generador que respeta una gramática técnica** (§7.1). Nunca se generan secuencias aleatorias sin sentido: toda combinación, curada o generada, pasa el mismo validador.

### 5.8 Desplazamientos y defensa dentro del shadow boxing

- **[Fuente]** World Boxing valora combinar ataque y defensa, el movimiento lateral, romper el ritmo y evitar golpes con bloqueo, slip, esquiva rotatoria, parada y desplazamiento (7.2.3.1). Sanciona la defensa completamente pasiva (8.5.30) y agacharse por debajo del cinturón del rival (8.5.29). Según una cita secundaria, en boxeo amateur los ganadores se desplazan más que los perdedores (Davis et al., 2013).
- **[Recomendación metodológica]** La defensa es lo más olvidado del shadow boxing y debe conducir al contraataque. Los pies participan en todo momento: entrada, salida, ángulo y reajuste de distancia.
- **[Decisión de diseño]** Focos específicos de defensa, contraataque, movilidad, ángulos y niveles. Toda defensa va seguida de un golpe en un máximo de 2 elementos y ninguna combinación termina en defensa. La agachada se hace con flexión de piernas y el tronco erguido. Fintas, amagos y pausas de ritmo solo en avanzado.

### 5.9 Por qué el HIIT va después de la ronda y el descanso antes de la siguiente

- **[Fuente]** La fatiga reduce la fuerza y la velocidad del golpe (PubMed 33858296; PMC7601017).
- **[Inferencia]** Si la ronda técnica empezara justo después del HIIT, la técnica se practicaría con la fatiga del ejercicio. Con el orden **ronda → HIIT → descanso → siguiente ronda**, cada ronda empieza tras recuperar, y el HIIT aprovecha la activación de la ronda.
- **[Decisión de diseño]** Ese es el orden fijo del bloque. La cuenta atrás visual 3-2-1 ocupa los últimos 3 s del descanso.

---

## 6. Propuesta de estructura de nuestras sesiones

Parámetros (ARCHITECTURE.md §6): sin calentamiento ni vuelta a la calma; preparación inicial de 5 s; **bloque = 3 × intervalo + transición 5 s + HIIT + descanso**; el último bloque sin descanso; HIIT en alternancia estricta fuerza/cardio; descanso de 30 s; descanso largo (+30 s) en el bloque central si hay 10 o más bloques.

### 6.1 Cálculo para exigencia «alta» (HIIT 40 s)

- **Básico:** bloque = 3·45 + 5 + 40 + 30 = **210 s**; último bloque = 180 s → T(n) = 5 + 210·(n−1) + 180 = **210·n − 25**.
- **Avanzado:** bloque = 3·55 + 5 + 40 + 30 = **240 s**; último bloque = 210 s → T(n) = **240·n − 25**.

| Sesión | Nivel | Bloques (rondas) | Total bruto | Ajuste del motor (±5 s por intervalo, hasta ≤30 s del objetivo) |
|---|---|---|---|---|
| 20 min | Básico | 6 | 1235 s = 20:35 | Recorta → ≈ 20:00–20:30 |
| 30 min | Básico | 9 | 1865 s = 31:05 | Recorta → ≈ 30:00–30:30 |
| 45 min | Básico | 13 (+ descanso largo) | 2735 s = 45:35 | Recorta → ≈ 45:00–45:30 |
| 20 min | Avanzado | 5 | 1175 s = 19:35 | Ya está a ≤30 s (puede alargar unos intervalos) |
| 30 min | Avanzado | 8 | 1895 s = 31:35 | Recorta → ≈ 30:00–30:30 |
| 45 min | Avanzado | 11 (+ descanso largo) | 2645 s = 44:05 | Alarga → ≈ 44:30–45:00 |

Composición aproximada de una sesión de 30 min:

| | Boxeo | HIIT | Descansos | Transiciones y preparación |
|---|---|---|---|---|
| Básico (9 bloques) | ≈ 64 % | ≈ 20 % | ≈ 13 % | ≈ 3 % |
| Avanzado (8 bloques) | ≈ 68 % | ≈ 18 % | ≈ 12 % | ≈ 2–3 % |

### 6.2 Ejemplo de bloque (avanzado, objetivo Defensa y contraataque)

| Segmento | Duración | Contenido |
|---|---|---|
| Ronda 3 · Intervalo 1 · REPETICIÓN | 55 s | `1 - 2 · SLIP der · 2` (diestro) |
| Ronda 3 · Intervalo 2 · VARIACIÓN | 55 s | `1 - 2 · SLIP der · 2` → `3 · ROLL izq · 3 - 2` → `PARADA · 1 - 2` → … (cada una 10–17 s) |
| Ronda 3 · Intervalo 3 · VARIACIÓN | 55 s | combinaciones de defensa y contraataque con salida lateral |
| Transición | 5 s | «Prepárate: FLEXIONES ARCHER» |
| HIIT · FUERZA | 40 s | FLEXIONES ARCHER |
| Descanso | 30 s | Lo que viene + cuenta atrás 3-2-1 |

### 6.3 Objetivos de sesión (sugeridos en la pantalla principal)

Técnica básica · Velocidad y coordinación · Combinaciones ofensivas · Defensa y contraataque · Desplazamientos y movilidad · Resistencia · Boxeo completo. Cada objetivo fija la proporción de repetición y variación, los pesos de los focos de ronda, el ritmo de cambio y, en algunos casos, los tiempos. Un objetivo solo se ofrece si la biblioteca personal tiene las técnicas que necesita: Defensa exige al menos una defensa y Movilidad al menos un desplazamiento. Las sugerencias priorizan los objetivos que hace más tiempo que no se entrenan.

---

## 7. Justificación de las decisiones adoptadas

### 7.1 Gramática técnica (coherencia biomecánica)

- **[Decisión de diseño]** Cada acción deja el tronco en un estado: neutro (`N`), tras jab (`J`), **lado adelantado cargado** (`LL`, tras 2, 4, 6, slip o roll hacia el lado adelantado), **lado atrasado cargado** (`RL`, tras 3, 5, slip o roll hacia el lado atrasado, pull back, bloqueo de hombro) o bajo (`LOW`, tras la agachada). Cada transición puntúa 0 (no válida), 1 (aceptable) o 2 (natural).
- **[Recomendación metodológica]** Fundamento: el directo (2) termina con el tronco girado hacia el lado adelantado y el peso delante, que es justo la posición de partida del gancho adelantado (3). El gancho termina girado hacia el lado atrasado, de donde sale el directo. De ahí las combinaciones clásicas 1-2-3-2.
  - El **slip al lado adelantado** reproduce la rotación de un directo (la cabeza termina sobre la rodilla adelantada) y deja cargado el 3 o el 5.
  - El **slip al lado atrasado** reproduce la rotación de un gancho (la cabeza termina sobre la rodilla atrasada) y deja **cargado el 2**. Por eso «1-2, slip al lado atrasado, 2» es natural y «1-2, slip al lado adelantado» no lo es: el tronco ya estaba girado hacia ese lado.
  - Los *rolls* siguen la misma lógica con cambio de nivel. El pull back carga la mano atrasada (contragolpe de directo).
- La misma mano no golpea dos veces seguidas salvo excepciones técnicas habituales: doble jab, y gancho al cuerpo seguido de gancho a la cabeza (o al revés).
- Los desplazamientos laterales conservan el estado del tronco, lo que hace natural el ejemplo del usuario «1-2-3, desplazamiento lateral y 2». El pivote es natural después del 3.

### 7.2 Restricciones derivadas del reglamento

- **Toda defensa va seguida de un golpe** y ninguna combinación termina en defensa, porque World Boxing sanciona la defensa completamente pasiva (art. 8.5.30) y valora combinar ataque y defensa (7.2.3.1).
- **Agachada (duck) con las piernas, nunca por debajo del cinturón del rival** (art. 8.5.29).
- **Sin golpes de revés ni con giro** (pivot blow, backfist): son falta (art. 8.5.10). El catálogo solo contiene golpes con la superficie de los nudillos, a cabeza y tronco por encima del cinturón (7.2.2).
- Los golpes al cuerpo forman parte de la zona puntuable (7.2.2.3). Su ausencia era una queja recurrente en las reseñas (BOXR).

### 7.3 Interfaz

- **Números sin voz**: lo pide el usuario, que ya conoce la numeración, y evita la queja de la voz tapada por la música. Las técnicas no numéricas usan palabras cortas en otro color (defensa, desplazamiento, finta), un recurso que también aparece en Awaytix. La diferencia aquí es que el número ocupa el elemento central y se lee a distancia.
- **Animación propia** (figura 3D simple dibujada en canvas) y opción de adjuntar un **vídeo propio** por movimiento (por ejemplo, grabado en clase), guardado localmente. Así se responde a la falta de vídeo que señalan las reseñas sin depender de internet ni de material con derechos.
- **Pausa y saltar** siempre visibles, con atajos de teclado (queja de Train Like a Boxer).

### 7.4 Variedad

- **[Decisión de diseño]** Memoria local de las sesiones realizadas.
  - Penalización por recencia de cada combinación, con decaimiento de 0,7 por sesión.
  - Huella de sesión con similitud de Jaccard: por encima de 0,45 con alguna de las 10 últimas sesiones, se regenera.
  - Equilibrio de exposición por movimiento, rotación de objetivos y variedad HIIT por patrón.
  - Si la biblioteca es pequeña, se prioriza la coherencia sobre la novedad y se avisa.

---

## 8. Diferenciación frente a las apps analizadas

| SOMBRA | Situación observada en las apps analizadas |
|---|---|
| **Biblioteca personal con estados** (aprendido / en práctica / dominado) que condiciona qué aparece, con qué frecuencia y en qué complejidad; nunca usa técnicas no autorizadas | Las apps ofrecen niveles generales, cursos por días o un contador de «aprendidos», pero ninguna ficha describe una selección ligada al dominio de cada técnica |
| **Anti-repetición con memoria** (recencia por combinación, huella de sesión, rotación de objetivos y de HIIT) | Generadores aleatorios o listas fijas de 10 combos por set; la falta de combos es una queja visible |
| **Gramática técnica** que valida combinaciones curadas y generadas (rotación del tronco, defensa seguida de contragolpe, reglas de World Boxing) | No consta en ninguna ficha |
| **Números grandes sin voz**, legibles a distancia, con la técnica no numérica codificada por color | La voz es el canal principal en casi todas |
| **HIIT obligatorio y alternado** fuerza/cardio en cada bloque, con exigencia independiente del nivel técnico | Calistenia opcional entre rondas o rondas de acondicionamiento separadas |
| **Sin calentamiento ni vuelta a la calma** (el usuario hace 10 min de comba antes) | Varias apps los incluyen dentro de la sesión |
| **Calendario de constancia sin estadísticas** (solo días entrenados, racha actual y mejor racha) | Estadísticas de sesiones, golpes, calorías y rankings |
| **100 % local**: sin cuentas, sin suscripción, sin red al entrenar | Suscripciones, pases o compras in-app en la mayoría |

No se ha copiado ninguna interfaz, texto, marca ni recurso de las apps analizadas. La identidad visual, los textos, las combinaciones explicadas y las animaciones de SOMBRA son originales.

## 9. Aportaciones de dos vídeos aportados por el usuario (1-nov-2026)

### 9.1 Fuentes

Dos reels públicos de Instagram que el usuario pidió revisar. Se vieron fotograma a fotograma en el navegador, sin descargar el vídeo ni guardar imágenes:

- `instagram.com/reel/DePJeQEso44` · cuenta **dtbxing** (8-oct): «4 shadowboxing drills…», cuatro ejercicios de 3 minutos.
- `instagram.com/reel/Db-0VvuoH3g` · cuenta **evan_laroudie** (13-ago): «Top 5 foot work drills», cinco patrones de pies con flechas sobre el suelo. Lo ejecuta en guardia zurda.

Son consejos de entrenadores en redes sociales, no fuentes federativas ni estudios. Se usan como **ideas de ejercicio**, contrastadas con la gramática técnica y el reglamento ya aplicados (§4, §7). Los nombres «D'Amato shift» y «Lomachenko shift» son los que usa el vídeo. Su origen histórico no se ha verificado.

### 9.2 Qué aparece y qué aporta

| Ejercicio del vídeo | Qué se ve | ¿Nuevo en SOMBRA? | Decisión |
|---|---|---|---|
| Pivoting around a stance | Girar alrededor de un punto fijo del suelo, encarándolo siempre, con pivotes y pasos | En parte: el pivote ya existía | Indicación nueva en el pivote: pivotes en serie alrededor de un punto («compás»), en los dos sentidos |
| Pendulum with gloves on | Vaivén adelante-atrás sin cambiar la base, entrando con el jab | **Sí** | Movimiento nuevo `pendulum` (PÉNDULO, básico) |
| Keeping chin down | Rectos con el mentón recogido tras el hombro | No: ya está en las indicaciones de guardia y jab | Sin cambios |
| Escape routes | Tras cada combinación, salir de la línea (lateral, ángulo, pivote) | **Sí, como forma de trabajo** | Foco de ronda nuevo **Salidas**: toda combinación termina con un desplazamiento de salida |
| D'Amato shift | El pie atrasado avanza en diagonal y pasa delante; el cuerpo gira a la guardia contraria | **Sí** | Movimiento nuevo `damato_shift` (D'AMATO, avanzado), solo al final de la combinación |
| L-Step | Paso atrás y paso lateral, en L | Sí como patrón (antes eran 2 fichas y en básico solo cabe 1 desplazamiento) | Movimiento nuevo `l_step` (PASO L, básico), hacia el lado atrasado |
| Compass | Pivotes sobre el pie adelantado en ambos sentidos | No: es el pivote | Cubierto por la nueva indicación del pivote |
| Z-Step | Lateral y, sin pausa, pivote que cambia la dirección | Sí como patrón | Movimiento nuevo `z_step` (PASO Z, avanzado) |
| Lomachenko shift | El pie atrasado avanza en diagonal hacia su lado y el adelantado lo rodea: misma guardia, en ángulo | **Sí** | Movimiento nuevo `loma_shift` (LOMA, avanzado) |

### 9.3 Decisiones de diseño

- **Cambio de guardia (D'Amato).** La notación numérica depende de la guardia: tras el cambio, «3» sería el gancho de la otra mano y las marcas izq/der dejarían de ser correctas. Por eso el D'AMATO solo puede cerrar una combinación, y su ficha indica volver a la guardia propia antes de la siguiente. La animación muestra el cambio y la vuelta. El uso clásico (cambiar y soltar el golpe con la nueva mano adelantada) no se genera, para no romper la notación.
- **Lado de las salidas.** PASO L y LOMA salen hacia el lado atrasado; PASO Z, hacia el adelantado. Coincide con el sentido que muestra el vídeo, trasladado a guardia diestra. La interfaz traduce izq/der según la guardia, como en el resto.
- **Niveles.** PÉNDULO y PASO L son básicos (patrón sencillo, útiles desde el principio). PASO Z, D'AMATO y LOMA son avanzados porque encadenan pivotes o cruces de pies.
- **Usuarios existentes.** Las técnicas nuevas no se añaden solas a la biblioteca de nadie: el motor nunca usa técnicas no autorizadas. Se añaden desde *Biblioteca → Catálogo* y, durante 21 días, cuentan como «nuevas» (§6.3). Quien empiece con «Catálogo completo» las recibe con el resto.
- **Contenido añadido.** 5 movimientos con su animación original, 15 combinaciones curadas (6 básicas y 9 avanzadas) y el foco «Salidas», con peso en los 7 objetivos (2,5 en Desplazamientos y movilidad).
