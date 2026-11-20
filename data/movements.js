/*
 * SOMBRA · data/movements.js
 * ---------------------------------------------------------------------------
 * Catálogo de movimientos (golpes, defensas, desplazamientos, fintas y ritmo)
 * de boxeo olímpico, en español. Esquema: docs/ARCHITECTURE.md §4.1.
 * La gramática (`flow`) copia exactamente la tabla de docs/ARCHITECTURE.md §5.
 *
 * Criterios técnicos (reglamento World Boxing): solo se golpea con la zona de
 * los nudillos del guante cerrado; sin golpes de revés, con el antebrazo, con
 * el interior del guante ni de pivote (golpe girando); nada por debajo del
 * cinturón; la agachada nunca baja la cabeza por debajo de la cintura del
 * rival; la defensa siempre va seguida de respuesta (no defensa pasiva).
 *
 * Convenciones:
 *  - `side`: 'lead' (adelantado) / 'rear' (atrasado) / 'none'. Nunca izq/der:
 *    la interfaz traduce según la guardia. Golpes y paradas: mano que actúa.
 *    Esquivas (media cintura / cintura completa): lado donde TERMINA la cabeza. Laterales: hacia
 *    dónde se desplaza el cuerpo.
 *  - `flow.mustBeFollowedBy` / `flow.within`: defensas 'golpe' en ≤2;
 *    fintas y pausa 'golpe' en 1. Si no hay exigencia: null / null.
 *  - `flow.position.end` es false en todas las defensas (regla 4: una
 *    combinación nunca termina en defensa).
 *  - `counters`: respuestas sugeridas tras defensas y fintas (§5).
 *  - `tags`: mismas etiquetas que las combinaciones (§4.2), orientativas.
 *
 * Añadir un movimiento: copia una entrada de la misma categoría, cambia el id
 * (snake_case, inglés), `anim` = id, y define `flow` con la tabla de §5 (o
 * las reglas de §8.4 para movimientos sin animación). Ejecuta las pruebas.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  SB.data.movements = [
    /* ------------------------------------------------------------------ BASE */
    {
      id: 'guard', code: 'GUARD', short: 'GUARDIA', name: 'Guardia',
      category: 'base', subcategory: 'guardia', level: 'basico', side: 'none', target: null, against: [],
      description: 'Posición de partida y de llegada de todas las acciones: perfil ligeramente oblicuo, base estable y manos protegiendo la cara. Es solo referencia; nunca aparece en una combinación.',
      cues: [
        'Pies algo más separados que los hombros, el adelantado apuntando al rival y el atrasado a unos 45°',
        'Rodillas flexionadas y peso repartido sobre la parte anterior de los pies, talón atrasado ligeramente elevado',
        'Guantes a la altura de los pómulos y codos cerrados protegiendo hígado y costado',
        'Mentón recogido, hombros relajados y mirada al pecho del rival',
        'Tras cada acción vuelve a esta posición antes de la siguiente'
      ],
      errors: [
        'Pies en la misma línea: sin base lateral se pierde el equilibrio al golpear',
        'Codos abiertos que dejan el cuerpo descubierto',
        'Mentón levantado o tensión excesiva en hombros'
      ],
      counters: [], anim: 'guard', tags: ['fundamental'],
      flow: {
        from: { N: 0, J: 0, LL: 0, RL: 0, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: false, middle: false, end: false },
        mustBeFollowedBy: null, within: null
      }
    },

    /* ---------------------------------------------------- GOLPES A LA CABEZA */
    {
      id: 'jab', code: '1', short: '1', name: 'Jab (recto adelantado)',
      category: 'golpe', subcategory: 'recto', level: 'basico', side: 'lead', target: 'cabeza', against: [],
      description: 'Recto rápido de la mano adelantada. Mide la distancia, ocupa la guardia del rival y prepara todos los demás golpes; es el golpe que más puntúa en boxeo olímpico por su frecuencia.',
      cues: [
        'Sale en línea recta desde la guardia, sin retrasar antes el codo ni el puño',
        'Gira el puño al final para impactar con los nudillos; el hombro adelantado sube y protege el mentón',
        'Pequeño empuje del pie atrasado; si hace falta, el pie adelantado acompaña con un paso corto',
        'Recoge por el mismo camino y a la misma velocidad que sale',
        'La mano atrasada se queda pegada a la cara'
      ],
      errors: [
        'Bajar la mano al recoger, dejando libre la línea para el directo rival',
        'Telegrafiar el golpe echando atrás el codo o el hombro',
        'Inclinar el tronco por delante de la rodilla adelantada'
      ],
      counters: [], anim: 'jab', tags: ['fundamental', 'velocidad', 'entrada'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 0, LOW: 0 }, to: 'J', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'cross', code: '2', short: '2', name: 'Directo (cross)',
      category: 'golpe', subcategory: 'recto', level: 'basico', side: 'rear', target: 'cabeza', against: [],
      description: 'Recto de la mano atrasada, el recto más potente. La fuerza nace en el pie atrasado y se transmite con el giro de cadera y hombros hasta el puño.',
      cues: [
        'Gira sobre la punta del pie atrasado, con el talón hacia fuera',
        'Cadera y hombro atrasado rotan juntos hacia el objetivo',
        'Brazo en línea recta y puño girado al final: impacto con los nudillos',
        'La mano adelantada vuelve a la cara mientras sale el directo',
        'Recupera la guardia sin quedarte cruzado ni con el peso delante'
      ],
      errors: [
        'Golpear solo con el brazo, sin rotar cadera ni pie',
        'Dejar caer la mano adelantada durante el golpe',
        'Pasar el peso por delante de la rodilla adelantada y perder el equilibrio'
      ],
      counters: [], anim: 'cross', tags: ['fundamental', 'potencia'],
      flow: {
        from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 1 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lead_hook', code: '3', short: '3', name: 'Gancho adelantado',
      category: 'golpe', subcategory: 'gancho', level: 'basico', side: 'lead', target: 'cabeza', against: [],
      description: 'Golpe curvo y corto de la mano adelantada a la cabeza, impulsado por el giro del tronco y el pivote del pie adelantado. Entra por fuera de la guardia del rival.',
      cues: [
        'Codo a la altura del puño y brazo flexionado en torno a 90°',
        'Pivota el pie adelantado y gira cadera y hombros como un solo bloque',
        'Trayectoria corta y horizontal; impacta con los nudillos, nunca con el interior del guante',
        'La mano atrasada protege el mentón durante todo el golpe',
        'Frena el giro en la línea del rival, sin pasarte'
      ],
      errors: [
        'Abrir el brazo y convertirlo en un golpe largo y lento',
        'Golpear con la palma o el interior del guante (falta en World Boxing)',
        'Bajar la mano atrasada al girar'
      ],
      counters: [], anim: 'lead_hook', tags: ['potencia', 'ofensiva'],
      flow: {
        from: { N: 1, J: 1, LL: 2, RL: 0, LOW: 1 }, to: 'RL', repeatWith: ['lead_hook_body'],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'rear_hook', code: '4', short: '4', name: 'Gancho atrasado',
      category: 'golpe', subcategory: 'gancho', level: 'avanzado', side: 'rear', target: 'cabeza', against: [],
      description: 'Gancho de la mano atrasada a la cabeza. Solo es eficaz con el tronco ya cargado hacia el lado atrasado (tras un gancho o un uppercut adelantado); desde guardia neutra su recorrido largo lo delata.',
      cues: [
        'Lánzalo después de cargar el lado atrasado (tras 3 o 5), no desde guardia neutra',
        'Pivota el pie atrasado y rota la cadera hacia delante',
        'Codo a la altura del puño y trayectoria corta, impactando con los nudillos',
        'Mano adelantada en la cara y mentón recogido',
        'Vuelve a guardia sin quedarte con el tronco cruzado'
      ],
      errors: [
        'Abrir el codo hacia atrás antes de golpear (golpe telegrafiado)',
        'Convertirlo en un golpe amplio que acaba con el antebrazo (falta)',
        'Quedar cruzado y sin base tras el impacto'
      ],
      counters: [], anim: 'rear_hook', tags: ['potencia'],
      flow: {
        from: { N: 0, J: 0, LL: 0, RL: 2, LOW: 1 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lead_upper', code: '5', short: '5', name: 'Uppercut adelantado',
      category: 'golpe', subcategory: 'uppercut', level: 'basico', side: 'lead', target: 'cabeza', against: [],
      description: 'Golpe ascendente y corto de la mano adelantada para la distancia corta. Entra por dentro de la guardia, sobre todo cuando el rival se cierra o se inclina hacia delante.',
      cues: [
        'Carga el peso sobre la pierna adelantada flexionando ligeramente la rodilla',
        'Sube con la pierna y el giro de cadera; el brazo solo transmite',
        'Codo cerca del cuerpo, palma hacia ti e impacto con los nudillos',
        'Golpe corto: el puño no sube por encima de tus ojos',
        'Mano atrasada pegada a la cara'
      ],
      errors: [
        'Bajar el puño antes de lanzarlo: telegrafía el golpe y abre la guardia',
        'Lanzarlo a media distancia, donde se queda corto',
        'Echar la cabeza atrás al golpear'
      ],
      counters: [], anim: 'lead_upper', tags: ['ofensiva'],
      flow: {
        from: { N: 1, J: 0, LL: 2, RL: 0, LOW: 2 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'rear_upper', code: '6', short: '6', name: 'Uppercut atrasado',
      category: 'golpe', subcategory: 'uppercut', level: 'basico', side: 'rear', target: 'cabeza', against: [],
      description: 'Uppercut de la mano atrasada. Muy eficaz tras el jab, contra un rival que baja la cabeza o al salir de una esquiva hacia el lado atrasado.',
      cues: [
        'Flexiona la rodilla atrasada y carga el peso en esa pierna',
        'Empuja con el pie atrasado y rota la cadera hacia delante y hacia arriba',
        'Codo pegado al costado y trayectoria corta y vertical',
        'Mano adelantada protegiendo la cara',
        'Vuelve a guardia sin quedarte expuesto en el centro'
      ],
      errors: [
        'Dejar caer la mano antes de lanzar',
        'Adelantar la cabeza por delante de la rodilla adelantada',
        'Golpe demasiado amplio que te desequilibra'
      ],
      counters: [], anim: 'rear_upper', tags: ['potencia'],
      flow: {
        from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 2 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },

    /* ---------------------------------------------------- GOLPES AL CUERPO */
    {
      id: 'jab_body', code: '1b', short: '1', name: 'Jab al cuerpo',
      category: 'golpe', subcategory: 'recto', level: 'basico', side: 'lead', target: 'cuerpo', against: [],
      description: 'Jab dirigido al plexo o al estómago bajando con las piernas. Cambia el nivel del ataque y hace bajar la guardia del rival para golpear después arriba.',
      cues: [
        'Baja flexionando las rodillas, no inclinando el tronco ni la cabeza',
        'Cabeza ligeramente fuera de la línea central y mano atrasada en la cara',
        'Puño recto al plexo o al estómago, siempre por encima del cinturón',
        'Recupera la altura de guardia nada más impactar'
      ],
      errors: [
        'Bajar solo el brazo, sin flexionar las piernas',
        'Agachar la cabeza por debajo de la cintura del rival (falta)',
        'Golpear por debajo del cinturón (falta)'
      ],
      counters: [], anim: 'jab_body', tags: ['niveles', 'fundamental'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 0, LOW: 2 }, to: 'J', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'cross_body', code: '2b', short: '2', name: 'Directo al cuerpo',
      category: 'golpe', subcategory: 'recto', level: 'basico', side: 'rear', target: 'cuerpo', against: [],
      description: 'Directo al plexo o al estómago con flexión de piernas y giro completo de cadera. Castiga al rival que sube la guardia y le quita aire en rondas largas.',
      cues: [
        'Baja con las piernas y, si hace falta, acorta con un paso pequeño',
        'Cabeza hacia el lado adelantado, fuera de la línea del rival',
        'Gira pie atrasado y cadera igual que en el directo a la cabeza',
        'Objetivo: plexo o estómago, por encima del cinturón',
        'Mano adelantada protegiendo la cabeza'
      ],
      errors: [
        'Inclinar el tronco en lugar de flexionar las piernas',
        'Dejar la cabeza en la línea central, expuesta al contragolpe',
        'Golpear por debajo del cinturón (falta)'
      ],
      counters: [], anim: 'cross_body', tags: ['niveles', 'potencia'],
      flow: {
        from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 2 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lead_hook_body', code: '3b', short: '3', name: 'Gancho adelantado al cuerpo',
      category: 'golpe', subcategory: 'gancho', level: 'basico', side: 'lead', target: 'cuerpo', against: [],
      description: 'Gancho corto de la mano adelantada al costado del rival (zona del hígado si boxeas en guardia diestra), con el codo bajo y las piernas flexionadas. Base del doble gancho cuerpo-cabeza.',
      cues: [
        'Baja flexionando las rodillas e inclina un poco el tronco hacia el lado adelantado',
        'Codo cerca del costado y trayectoria corta y horizontal',
        'Pivota el pie adelantado y gira la cadera',
        'Mano atrasada protegiendo la cara',
        'Sube después a la cabeza con el mismo brazo (3 cuerpo - 3 cabeza)'
      ],
      errors: [
        'Abrir el codo y lanzar un golpe largo',
        'Golpear con el antebrazo o el interior del guante (falta)',
        'Bajar la mano atrasada'
      ],
      counters: [], anim: 'lead_hook_body', tags: ['niveles', 'potencia'],
      flow: {
        from: { N: 1, J: 1, LL: 2, RL: 0, LOW: 2 }, to: 'RL', repeatWith: ['lead_hook'],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'rear_hook_body', code: '4b', short: '4', name: 'Gancho atrasado al cuerpo',
      category: 'golpe', subcategory: 'gancho', level: 'avanzado', side: 'rear', target: 'cuerpo', against: [],
      description: 'Gancho de la mano atrasada a las costillas flotantes del rival, lanzado con el lado atrasado ya cargado. Golpe de corta distancia que abre la guardia alta.',
      cues: [
        'Lánzalo tras cargar el lado atrasado (después de 3 o 5)',
        'Flexiona las rodillas para bajar el nivel; la cabeza no baja de la cintura del rival',
        'Codo bajo, trayectoria corta y giro de cadera hacia delante',
        'Mano adelantada protegiendo la cara'
      ],
      errors: [
        'Lanzarlo largo y abierto desde fuera de distancia',
        'Impactar con el antebrazo en lugar de con los nudillos (falta)',
        'Doblarse por la cintura y perder de vista al rival'
      ],
      counters: [], anim: 'rear_hook_body', tags: ['niveles', 'potencia'],
      flow: {
        from: { N: 0, J: 0, LL: 0, RL: 2, LOW: 2 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lead_upper_body', code: '5b', short: '5', name: 'Uppercut adelantado al cuerpo',
      category: 'golpe', subcategory: 'uppercut', level: 'avanzado', side: 'lead', target: 'cuerpo', against: [],
      description: 'Uppercut corto de la mano adelantada al plexo o al estómago, en la distancia corta, cuando el rival cierra la guardia alta.',
      cues: [
        'Flexiona las piernas para quedar a la altura del objetivo',
        'Codo pegado al cuerpo y golpe corto hacia arriba y adelante',
        'Sube con la pierna y la cadera, no con el hombro',
        'Mano atrasada en la cara'
      ],
      errors: [
        'Bajar el puño antes de lanzar',
        'Lanzarlo desde demasiado lejos',
        'Dirigirlo por debajo del cinturón (falta)'
      ],
      counters: [], anim: 'lead_upper_body', tags: ['niveles'],
      flow: {
        from: { N: 1, J: 0, LL: 2, RL: 0, LOW: 2 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'rear_upper_body', code: '6b', short: '6', name: 'Uppercut atrasado al cuerpo',
      category: 'golpe', subcategory: 'uppercut', level: 'avanzado', side: 'rear', target: 'cuerpo', against: [],
      description: 'Uppercut de la mano atrasada al estómago en el cuerpo a cuerpo o al salir de una esquiva por fuera. Hace bajar los codos del rival para atacar después la cabeza.',
      cues: [
        'Carga la pierna atrasada flexionando la rodilla',
        'Codo pegado al costado y trayectoria corta, hacia arriba y adelante',
        'Rota la cadera y empuja con el pie atrasado',
        'Mano adelantada protegiendo la cara'
      ],
      errors: [
        'Abrir el golpe y perder la protección del costado',
        'Golpear por debajo del cinturón (falta)',
        'Quedarse con la cabeza en la línea central tras golpear'
      ],
      counters: [], anim: 'rear_upper_body', tags: ['niveles', 'potencia'],
      flow: {
        from: { N: 1, J: 2, LL: 0, RL: 2, LOW: 2 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },

    /* ------------------------------------------------------------- DEFENSAS */
    {
      id: 'block_high', code: 'BLOCK_H', short: 'BLOQ', name: 'Bloqueo alto',
      category: 'defensa', subcategory: 'bloqueo', level: 'basico', side: 'none', target: null, against: ['curvos'],
      description: 'Bloqueo de los ganchos a la cabeza llevando el guante a la sien y cerrando el codo. Debe ir seguido de una respuesta inmediata.',
      cues: [
        'Lleva el guante a la sien del lado que recibe, como si te peinaras',
        'Codo alto y cerrado: el golpe lo absorben guante y antebrazo',
        'Flexiona un poco las rodillas y gira levemente hacia el golpe',
        'La otra mano sigue en guardia, lista para contraatacar'
      ],
      errors: [
        'Separar el guante de la cabeza (tu propio guante te golpea)',
        'Cerrar los ojos o girar la cara',
        'Quedarte cubriendo sin responder (defensa pasiva)'
      ],
      counters: ['lead_hook', 'cross', 'jab'], anim: 'block_high', tags: ['defensa', 'fundamental'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'block_body', code: 'BLOCK_B', short: 'CODO', name: 'Bloqueo con el codo',
      category: 'defensa', subcategory: 'bloqueo', level: 'basico', side: 'none', target: null, against: ['cuerpo'],
      description: 'Protección de los golpes al cuerpo bajando el codo hacia la cadera y girando un poco el tronco hacia el golpe, sin bajar el guante de la cara.',
      cues: [
        'Baja el codo hacia la cadera del lado que recibe, con el guante en la cara',
        'Gira ligeramente el tronco para recibir con codo y antebrazo',
        'Flexiona las rodillas para absorber el impacto',
        'Responde enseguida, sobre todo con el gancho del mismo lado'
      ],
      errors: [
        'Bajar la mano y dejar la cabeza descubierta',
        'Doblarse hacia delante',
        'No responder tras el bloqueo'
      ],
      counters: ['lead_hook_body', 'lead_hook', 'cross'], anim: 'block_body', tags: ['defensa', 'niveles'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'parry_jab', code: 'PARRY_1', short: 'PARADA', name: 'Parada del jab',
      category: 'defensa', subcategory: 'parada', level: 'basico', side: 'rear', target: null, against: ['rectos'],
      description: 'Desvío del jab rival con un toque corto y seco de la mano atrasada, hacia abajo y hacia dentro, cerca de tu cara. Deja al rival abierto para el contragolpe.',
      cues: [
        'Movimiento corto: desvías el puño unos centímetros, no sales a buscarlo',
        'Desvía hacia abajo y hacia dentro, cerca de tu cara',
        'El codo no se separa del cuerpo',
        'Contraataca con jab o directo mientras el rival recoge'
      ],
      errors: [
        'Estirar el brazo para ir a buscar el golpe',
        'Desviar demasiado y abrir tu propia guardia',
        'Reaccionar a cada finta y quedar descolocado'
      ],
      counters: ['jab', 'cross'], anim: 'parry_jab', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'parry_cross', code: 'PARRY_2', short: 'PARADA', name: 'Parada del directo',
      category: 'defensa', subcategory: 'parada', level: 'avanzado', side: 'lead', target: null, against: ['rectos'],
      description: 'Desvío del directo rival con la mano adelantada hacia tu lado atrasado, acompañado de un pequeño giro de hombros. El rival queda cruzado y expuesto.',
      cues: [
        'La mano adelantada desvía con un toque corto hacia tu lado atrasado',
        'Acompaña con un pequeño giro de hombros, sin abrir el codo',
        'Mano atrasada pegada a la cara',
        'Responde con directo o gancho mientras el rival está cruzado'
      ],
      errors: [
        'Bajar la mano adelantada después de parar',
        'Movimiento amplio que deja libre tu cabeza'
      ],
      counters: ['cross', 'lead_hook'], anim: 'parry_cross', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'slip_lead', code: 'SLIP_L', short: 'MEDIA CINTURA', name: 'Media cintura al lado adelantado',
      category: 'defensa', subcategory: 'esquiva lateral', level: 'basico', side: 'lead', target: null, against: ['rectos'],
      description: 'Esquiva lateral de media cintura que saca la cabeza de la línea hacia el lado adelantado (cabeza sobre la rodilla adelantada), normalmente ante el directo. Deja cargados el gancho y el uppercut adelantados.',
      cues: [
        'Gira levemente el tronco y flexiona la rodilla adelantada; la cabeza termina sobre ella',
        'Movimiento mínimo: lo justo para que el golpe pase rozando',
        'Guantes arriba y mirada al rival durante toda la esquiva',
        'Sales cargado: responde con gancho o uppercut adelantado'
      ],
      errors: [
        'Inclinar solo el cuello o la cintura sin usar las piernas',
        'Esquivar demasiado lejos y perder el equilibrio',
        'Bajar la guardia al esquivar'
      ],
      counters: ['lead_hook', 'lead_upper', 'lead_hook_body'], anim: 'slip_lead', tags: ['defensa', 'contra', 'fundamental'],
      flow: {
        from: { N: 2, J: 2, LL: 0, RL: 2, LOW: 0 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'slip_rear', code: 'SLIP_R', short: 'MEDIA CINTURA', name: 'Media cintura al lado atrasado',
      category: 'defensa', subcategory: 'esquiva lateral', level: 'basico', side: 'rear', target: null, against: ['rectos'],
      description: 'Esquiva que saca la cabeza de la línea hacia el lado atrasado (cabeza sobre la rodilla atrasada), normalmente por fuera del jab. Carga la mano atrasada para el contragolpe.',
      cues: [
        'Gira los hombros y flexiona la rodilla atrasada; la cabeza termina sobre ella',
        'Esquiva corta, por fuera del jab del rival',
        'Guantes en la cara y mirada al frente',
        'Sales con el directo cargado: suéltalo al instante'
      ],
      errors: [
        'Doblarse por la cintura en lugar de flexionar las piernas',
        'Esquivar sin responder (defensa pasiva)',
        'Abrir los codos al girar'
      ],
      counters: ['cross', 'rear_upper', 'cross_body'], anim: 'slip_rear', tags: ['defensa', 'contra', 'fundamental'],
      flow: {
        from: { N: 2, J: 2, LL: 2, RL: 0, LOW: 0 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'roll_lead', code: 'ROLL_L', short: 'CINTURA COMPLETA', name: 'Cintura completa al lado adelantado',
      category: 'defensa', subcategory: 'esquiva rotatoria', level: 'basico', side: 'lead', target: null, against: ['curvos'],
      description: 'Esquiva rotatoria bajo un golpe curvo: flexión de piernas trazando una U con la cabeza, de tu lado atrasado a tu lado adelantado. Terminas cargado para el gancho o el uppercut adelantados.',
      cues: [
        'Flexiona las rodillas y traza una U con la cabeza, de atrás hacia el lado adelantado',
        'Espalda recta y mirada al rival; la cabeza no baja de su cintura',
        'Guantes pegados a la cara durante todo el recorrido',
        'Sube ya golpeando: gancho o uppercut adelantado'
      ],
      errors: [
        'Doblar la cintura y mirar al suelo',
        'Bajar demasiado: por debajo de la cintura del rival es falta',
        'Rodar demasiado amplio o lento y llegar tarde a la respuesta'
      ],
      counters: ['lead_hook', 'lead_upper', 'lead_hook_body'], anim: 'roll_lead', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 1, J: 1, LL: 0, RL: 2, LOW: 0 }, to: 'LL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'roll_rear', code: 'ROLL_R', short: 'CINTURA COMPLETA', name: 'Cintura completa al lado atrasado',
      category: 'defensa', subcategory: 'esquiva rotatoria', level: 'basico', side: 'rear', target: null, against: ['curvos'],
      description: 'Esquiva rotatoria bajo un golpe curvo trazando una U con la cabeza, de tu lado adelantado a tu lado atrasado. Terminas con la mano atrasada cargada.',
      cues: [
        'Flexiona las rodillas y traza una U con la cabeza hacia el lado atrasado',
        'Espalda recta, mentón recogido y mirada al rival',
        'Guantes en la cara y codos cerrados',
        'Sube respondiendo con directo, uppercut o gancho atrasado'
      ],
      errors: [
        'Inclinarse hacia delante en lugar de bajar con las piernas',
        'Bajar la cabeza por debajo de la cintura del rival (falta)',
        'Quedarse abajo sin responder'
      ],
      counters: ['cross', 'rear_upper', 'rear_hook'], anim: 'roll_rear', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 1, J: 1, LL: 2, RL: 0, LOW: 0 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'pull_back', code: 'PULL', short: 'GOMA', name: 'Goma (esquiva atrás)',
      category: 'defensa', subcategory: 'esquiva atrás', level: 'basico', side: 'none', target: null, against: ['rectos'],
      description: 'Retrasas la cabeza y el peso sobre la pierna atrasada, sin mover los pies, para que el recto del rival se quede corto; el peso vuelve hacia delante con el directo.',
      cues: [
        'Lleva el peso a la pierna atrasada flexionando la rodilla, sin mover los pies',
        'La cabeza se retrasa lo justo, con el mentón recogido',
        'Mirada al rival y guantes en la cara',
        'Vuelve hacia delante con el directo: el peso atrasado lo carga'
      ],
      errors: [
        'Echar la cabeza atrás levantando el mentón',
        'Retroceder en línea recta demasiado tiempo (el doble jab te alcanza)',
        'Pasar el peso tan atrás que no puedes contraatacar'
      ],
      counters: ['cross'], anim: 'pull_back', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 0, LOW: 0 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'duck', code: 'DUCK', short: 'SENTADILLA', name: 'Sentadilla (agachada)',
      category: 'defensa', subcategory: 'sentadilla', level: 'basico', side: 'none', target: null, against: ['curvos', 'rectos'],
      description: 'Flexión de piernas para que el golpe pase por encima. En World Boxing es falta agacharse por debajo de la cintura del rival, así que la bajada es corta y se sale golpeando.',
      cues: [
        'Baja flexionando las rodillas, con la espalda recta',
        'La cabeza nunca por debajo de la cintura del rival',
        'Mirada al frente y guantes en la cara',
        'Sube golpeando: directo o gancho al cuerpo, o uppercut'
      ],
      errors: [
        'Doblarse por la cintura y mirar al suelo',
        'Agacharse demasiado (falta) o quedarse abajo',
        'Separar las manos de la cara al bajar'
      ],
      counters: ['cross_body', 'lead_hook_body', 'lead_upper', 'rear_upper', 'lead_hook'], anim: 'duck', tags: ['defensa', 'contra', 'niveles'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 0 }, to: 'LOW', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },
    {
      id: 'shoulder_roll', code: 'SHOULDER', short: 'HOMBRO', name: 'Defensa de hombro',
      category: 'defensa', subcategory: 'bloqueo', level: 'avanzado', side: 'none', target: null, against: ['rectos'],
      description: 'Giras el tronco hacia el lado atrasado y recibes el directo en el hombro adelantado elevado, con el mentón detrás. El giro deja cargado tu directo para responder.',
      cues: [
        'Sube el hombro adelantado y esconde el mentón detrás',
        'Gira el tronco hacia el lado atrasado llevando el peso a la pierna atrasada',
        'Guante atrasado en la cara, listo para responder',
        'Contraataca de inmediato con directo o uppercut atrasado'
      ],
      errors: [
        'Quedarse girado sin responder (defensa pasiva)',
        'Girar tanto que das la espalda al rival (falta)',
        'Usarla ante ganchos: deja la cabeza expuesta por el lado adelantado'
      ],
      counters: ['cross', 'rear_upper'], anim: 'shoulder_roll', tags: ['defensa', 'contra'],
      flow: {
        from: { N: 2, J: 1, LL: 2, RL: 0, LOW: 0 }, to: 'RL', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 2
      }
    },

    /* ------------------------------------------------------- DESPLAZAMIENTOS */
    {
      id: 'step_in', code: 'STEP_IN', short: 'PASO ↑', name: 'Paso adelante',
      category: 'desplazamiento', subcategory: 'paso', level: 'basico', side: 'none', target: null, against: [],
      description: 'Paso adelante en guardia para entrar en distancia de golpeo: primero el pie adelantado y después el atrasado, la misma distancia. Siempre va seguido de un ataque.',
      cues: [
        'Empuja con el pie atrasado y mueve primero el pie adelantado',
        'El pie atrasado recupera la misma distancia: la base no cambia',
        'Pasos cortos, sin saltar ni subir el centro de gravedad',
        'Guardia arriba al entrar y golpe al llegar'
      ],
      errors: [
        'Juntar o cruzar los pies',
        'Entrar con la cabeza por delante y sin las manos arriba',
        'Paso demasiado largo que te deja sin equilibrio'
      ],
      counters: [], anim: 'step_in', tags: ['entrada', 'desplazamiento', 'fundamental'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'step_back', code: 'STEP_BACK', short: 'PASO ↓', name: 'Paso atrás',
      category: 'desplazamiento', subcategory: 'paso', level: 'basico', side: 'none', target: null, against: [],
      description: 'Paso atrás en guardia para salir de la distancia del rival: primero el pie atrasado y después el adelantado. Salida básica tras atacar.',
      cues: [
        'Empuja con el pie adelantado y mueve primero el pie atrasado',
        'Recupera la base con el pie adelantado, sin arrastrarlo',
        'Manos arriba y mirada al rival durante la salida',
        'Sal justo después del último golpe, antes de que el rival responda'
      ],
      errors: [
        'Cruzar los pies o juntarlos',
        'Salir en línea recta con la guardia baja',
        'Quedarse dentro de distancia tras la combinación'
      ],
      counters: [], anim: 'step_back', tags: ['salida', 'desplazamiento', 'fundamental'],
      flow: {
        from: { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lateral_lead', code: 'LAT_L', short: 'LATERAL', name: 'Paso lateral al lado adelantado',
      category: 'desplazamiento', subcategory: 'lateral', level: 'basico', side: 'lead', target: null, against: [],
      description: 'Paso lateral hacia el lado adelantado: primero el pie adelantado y después el atrasado, sin cruzar los pies. Saca tu cabeza de la línea central; frente a un zurdo te aleja de su mano atrasada.',
      cues: [
        'Mueve primero el pie adelantado hacia su lado',
        'El pie atrasado acompaña la misma distancia, sin cruzar',
        'Mantén el tronco y la guardia orientados al rival',
        'Paso corto: buscas salir de su línea, no huir'
      ],
      errors: [
        'Cruzar los pies (te pueden desequilibrar)',
        'Moverte con la guardia baja',
        'Desplazarte sin volver a encarar al rival'
      ],
      counters: [], anim: 'lateral_lead', tags: ['desplazamiento', 'angulo', 'salida'],
      flow: {
        from: { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'lateral_rear', code: 'LAT_R', short: 'LATERAL', name: 'Paso lateral al lado atrasado',
      category: 'desplazamiento', subcategory: 'lateral', level: 'basico', side: 'rear', target: null, against: [],
      description: 'Paso lateral hacia el lado atrasado: primero el pie atrasado y después el adelantado, sin cruzar los pies. Frente a un rival de tu misma guardia te aleja de su mano atrasada.',
      cues: [
        'Mueve primero el pie atrasado hacia su lado',
        'El pie adelantado acompaña la misma distancia, sin cruzar',
        'Tronco y guardia orientados al rival',
        'Pasos cortos y rápidos sobre la parte anterior de los pies'
      ],
      errors: [
        'Cruzar los pies',
        'Pasos largos que te dejan sin base',
        'Desplazarte con la guardia baja hacia su gancho adelantado'
      ],
      counters: [], anim: 'lateral_rear', tags: ['desplazamiento', 'angulo'],
      flow: {
        from: { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'pivot', code: 'PIVOT', short: 'PIVOTE', name: 'Pivote',
      category: 'desplazamiento', subcategory: 'pivote', level: 'avanzado', side: 'none', target: null, against: [],
      description: 'Giro sobre la planta del pie adelantado moviendo el pie atrasado en arco hacia fuera, para salir de la línea del rival tras atacar y encararlo desde un ángulo nuevo.',
      cues: [
        'Gira sobre la planta del pie adelantado, no sobre el talón',
        'El pie atrasado describe un arco de 45° a 90°',
        'Guardia arriba y mirada al rival durante el giro',
        'Termina en guardia completa, encarando de nuevo al rival',
        'Para soltarte, encadena pivotes dando la vuelta completa a un punto fijo del suelo (el «compás»), en los dos sentidos'
      ],
      errors: [
        'Pivotar sobre el talón y perder el equilibrio',
        'Golpear mientras giras (golpe de pivote, prohibido)',
        'Girar demasiado y quedar de espaldas'
      ],
      counters: [], anim: 'pivot', tags: ['angulo', 'salida', 'desplazamiento'],
      flow: {
        from: { N: 1, J: 1, LL: 1, RL: 2, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: false, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'angle_step', code: 'ANGLE', short: 'ÁNGULO', name: 'Paso en ángulo',
      category: 'desplazamiento', subcategory: 'ángulo', level: 'avanzado', side: 'none', target: null, against: [],
      description: 'Paso diagonal, normalmente hacia delante y fuera del lado adelantado, seguido de una reorientación del cuerpo hacia el rival para atacar desde fuera de su línea de golpeo.',
      cues: [
        'Paso diagonal con el pie adelantado y el atrasado acompañando',
        'Reorienta pies y cadera hacia el rival al terminar el paso',
        'La cabeza sale de la línea central del rival',
        'Ataca enseguida desde el nuevo ángulo'
      ],
      errors: [
        'Moverse en diagonal pero seguir mirando a donde estaba el rival',
        'Cruzar los pies',
        'Paso demasiado largo que te deja fuera de distancia'
      ],
      counters: [], anim: 'angle_step', tags: ['angulo', 'desplazamiento', 'entrada'],
      flow: {
        from: { N: 1, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'distance_reset', code: 'RESET', short: 'AJUSTE', name: 'Ajuste de distancia',
      category: 'desplazamiento', subcategory: 'distancia', level: 'basico', side: 'none', target: null, against: [],
      description: 'Pequeño ajuste de pies, de unos centímetros hacia dentro o hacia fuera, para quedar a la distancia exacta del siguiente golpe.',
      cues: [
        'Movimiento mínimo de ambos pies, manteniendo la base',
        'Sobre la parte anterior de los pies, sin saltar',
        'Guardia arriba y mirada al rival',
        'Golpea en cuanto estés en distancia'
      ],
      errors: [
        'Hacer el ajuste demasiado grande y quedar fuera o dentro de más',
        'Rebotar sin propósito y perder la iniciativa'
      ],
      counters: [], anim: 'distance_reset', tags: ['desplazamiento', 'entrada'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: null, within: null
      }
    },

    /* ------------------------- DESPLAZAMIENTOS AÑADIDOS (1-nov-2026, RESEARCH §9) */
    {
      id: 'pendulum', code: 'PEND', short: 'PÉNDULO', name: 'Paso de péndulo',
      category: 'desplazamiento', subcategory: 'pendulo', level: 'basico', side: 'none', target: null, against: [],
      description: 'Vaivén rítmico adelante y atrás sin cambiar la separación de los pies: entras en distancia con un pequeño impulso, golpeas y sales con el mismo ritmo. Mantiene el cuerpo suelto y marca la distancia.',
      cues: [
        'Los dos pies se deslizan a la vez, a ras de suelo, sin cambiar la base',
        'Impulso corto desde los metatarsos; el peso va adelante al entrar y atrás al salir',
        'Golpea en el momento de entrar (sobre todo el jab) y sal en el siguiente tiempo',
        'Guardia arriba y mentón recogido durante todo el vaivén'
      ],
      errors: [
        'Saltar alto o rebotar sin propósito, perdiendo la base',
        'Entrar con la cabeza por delante de la rodilla adelantada',
        'Quedarte dentro de distancia tras golpear en vez de salir'
      ],
      counters: [], anim: 'pendulum', tags: ['desplazamiento', 'entrada', 'salida', 'ritmo'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'l_step', code: 'L_STEP', short: 'PASO L', name: 'Salida en L',
      category: 'desplazamiento', subcategory: 'salida', level: 'basico', side: 'rear', target: null, against: [],
      description: 'Salida en dos tiempos que dibuja una L: paso atrás y, sin pararte, paso lateral hacia el lado atrasado. Sales de la distancia y además de la línea del rival, en lugar de retroceder en línea recta.',
      cues: [
        'Primero el paso atrás (pie atrasado primero) y enlaza el lateral sin detenerte',
        'En el lateral mueve primero el pie atrasado; no cruces los pies',
        'Manos arriba y mirada al rival durante las dos partes',
        'Termina encarando al rival, listo para volver a atacar'
      ],
      errors: [
        'Hacer solo el paso atrás y quedarte en su línea',
        'Cruzar los pies en el lateral',
        'Darle la espalda o bajar la guardia al salir'
      ],
      counters: [], anim: 'l_step', tags: ['desplazamiento', 'salida', 'angulo'],
      flow: {
        from: { N: 2, J: 2, LL: 2, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: false, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'z_step', code: 'Z_STEP', short: 'PASO Z', name: 'Paso en Z',
      category: 'desplazamiento', subcategory: 'angulo', level: 'avanzado', side: 'lead', target: null, against: [],
      description: 'Paso lateral hacia el lado adelantado enlazado con un pivote que cambia la dirección: el recorrido dibuja una Z y sacas la cabeza de la línea del rival dos veces seguidas.',
      cues: [
        'Lateral corto: primero el pie adelantado, el atrasado acompaña sin cruzar',
        'Al apoyar, pivota sobre la planta del pie adelantado y barre el atrasado en arco',
        'Guardia arriba durante todo el recorrido; nunca golpees mientras giras',
        'Termina encarando al rival desde el nuevo ángulo'
      ],
      errors: [
        'Separar el lateral y el pivote con una pausa (pierde la sorpresa)',
        'Pivotar sobre el talón y perder el equilibrio',
        'Girar de más y quedar de espaldas o fuera de distancia'
      ],
      counters: [], anim: 'z_step', tags: ['desplazamiento', 'angulo', 'salida'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 2, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: false, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'damato_shift', code: 'SHIFT_DA', short: "D'AMATO", name: "Cambio de guardia D'Amato",
      category: 'desplazamiento', subcategory: 'cambio de guardia', level: 'avanzado', side: 'none', target: null, against: [],
      description: "Shift popularizado por la escuela de Cus D'Amato: el pie atrasado avanza en diagonal y pasa delante, el cuerpo gira con él y quedas en la guardia contraria y en ángulo. En SOMBRA cierra la combinación: al terminarla, vuelve a tu guardia antes de la siguiente.",
      cues: [
        'El pie atrasado avanza en diagonal y pasa por delante del adelantado',
        'Cadera y hombros giran con el paso: la mano que estaba atrás queda delante',
        'Guardia cerrada y mentón recogido durante el cambio',
        'Cuando acabes, recupera tu guardia habitual con un paso antes de seguir'
      ],
      errors: [
        'Cruzar los pies sin girar la cadera y quedar sin base',
        'Bajar las manos durante el cambio',
        'Quedarte en la guardia contraria sin querer al empezar la siguiente combinación'
      ],
      counters: [], anim: 'damato_shift', tags: ['desplazamiento', 'angulo', 'salida', 'potencia'],
      flow: {
        from: { N: 1, J: 1, LL: 1, RL: 2, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: false, middle: false, end: true },
        mustBeFollowedBy: null, within: null
      }
    },
    {
      id: 'loma_shift', code: 'SHIFT_LO', short: 'LOMA', name: 'Shift de Lomachenko',
      category: 'desplazamiento', subcategory: 'angulo', level: 'avanzado', side: 'rear', target: null, against: [],
      description: 'Desplazamiento en dos pasos que lleva su nombre por Vasyl Lomachenko: el pie atrasado da un paso adelante y hacia fuera, y el adelantado lo rodea para recuperar tu guardia. Terminas en diagonal, más cerca y fuera de la línea del rival, listo para atacar.',
      cues: [
        'Primer paso: el pie atrasado avanza en diagonal hacia su lado',
        'Segundo paso: el pie adelantado lo rodea y vuelves a tu guardia',
        'Reorienta pies y cadera hacia el rival al terminar',
        'Manos arriba; ataca enseguida desde el nuevo ángulo'
      ],
      errors: [
        'Hacer los dos pasos en línea recta, sin salir de su línea',
        'Terminar en la guardia contraria o con los pies juntos',
        'Mirar a donde estaba el rival en lugar de reorientarte'
      ],
      counters: [], anim: 'loma_shift', tags: ['desplazamiento', 'angulo', 'entrada'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 1, LOW: 1 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: true },
        mustBeFollowedBy: null, within: null
      }
    },

    /* --------------------------------------------------------------- FINTAS */
    {
      id: 'feint_jab', code: 'FEINT_1', short: 'FINTA', name: 'Finta de jab',
      category: 'finta', subcategory: 'finta', level: 'avanzado', side: 'none', target: null, against: [],
      description: 'Inicias el jab con el hombro y medio gesto de la mano adelantada, sin extender, para provocar una reacción del rival (subir la guardia, parar, contragolpear) y golpear el hueco que deja.',
      cues: [
        'Vende la finta con el hombro y un pequeño gesto de la mano o del pie',
        'Medio recorrido como máximo: la mano vuelve enseguida a la guardia',
        'Observa la reacción del rival',
        'Golpea de inmediato el hueco que se abre'
      ],
      errors: [
        'Finta demasiado lenta o amplia que nadie se cree',
        'No golpear después de la finta',
        'Bajar la guardia al fintar'
      ],
      counters: ['jab', 'cross', 'jab_body'], anim: 'feint_jab', tags: ['finta', 'ofensiva'],
      flow: {
        from: { N: 2, J: 1, LL: 1, RL: 0, LOW: 0 }, to: 'J', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 1
      }
    },
    {
      id: 'feint_level', code: 'FEINT_LVL', short: 'AMAGO', name: 'Amago al cuerpo',
      category: 'finta', subcategory: 'finta', level: 'avanzado', side: 'none', target: null, against: [],
      description: 'Bajas el nivel flexionando las rodillas como si fueras a golpear al cuerpo para que el rival baje los codos, y atacas arriba (o al revés).',
      cues: [
        'Baja con las piernas y la mirada, como en un golpe al cuerpo real',
        'Guardia arriba durante el amago',
        'Golpea arriba en cuanto el rival baje los codos',
        'Amago corto: medio tiempo, no más'
      ],
      errors: [
        'Inclinar el tronco en vez de flexionar las piernas',
        'Bajar tanto la cabeza que queda por debajo de la cintura del rival (falta)',
        'Amagar sin golpear después'
      ],
      counters: ['lead_hook', 'jab', 'cross'], anim: 'feint_level', tags: ['finta', 'niveles'],
      flow: {
        from: { N: 2, J: 2, LL: 1, RL: 1, LOW: 0 }, to: 'N', repeatWith: [],
        position: { start: true, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 1
      }
    },

    /* ---------------------------------------------------------------- RITMO */
    {
      id: 'rhythm_break', code: 'BREAK', short: 'PAUSA', name: 'Pausa (cambio de ritmo)',
      category: 'ritmo', subcategory: 'ritmo', level: 'avanzado', side: 'none', target: null, against: [],
      description: 'Medio tiempo de pausa dentro de la combinación para romper el ritmo del rival: golpeas cuando relaja la guardia o cuando reacciona al ritmo que esperaba.',
      cues: [
        'Pausa breve, de medio tiempo, sin salir de la guardia',
        'Mantén la tensión y el peso listos para golpear',
        'El golpe siguiente sale explosivo',
        'Observa la reacción del rival durante la pausa'
      ],
      errors: [
        'Pausa demasiado larga que se convierte en pasividad',
        'Bajar las manos durante la pausa'
      ],
      counters: [], anim: 'rhythm_break', tags: ['ritmo'],
      flow: {
        from: { N: 1, J: 1, LL: 1, RL: 1, LOW: 1 }, to: 'keep', repeatWith: [],
        position: { start: false, middle: true, end: false },
        mustBeFollowedBy: 'golpe', within: 1
      }
    }
  ];
})(window.SB = window.SB || {});
