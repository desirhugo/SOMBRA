/*
 * SOMBRA · data/hiit.js
 * ---------------------------------------------------------------------------
 * Ejercicios HIIT sin material que se intercalan entre rondas de boxeo.
 * Esquema: docs/ARCHITECTURE.md §4.3.
 *
 *  - category: 'fuerza' | 'cardio' (el motor alterna estrictamente bloque a bloque).
 *  - demand: 1 moderada, 2 alta, 3 muy alta.
 *  - pattern: fuerza 'empuje'|'piernas'|'core'|'total'|'pliometria';
 *             cardio 'saltos'|'agilidad'|'coordinacion'|'especifico'|'total'.
 *    Dos ejercicios consecutivos de la misma categoría no comparten pattern.
 *  - impact: 'alto' si hay fase de vuelo o aterrizajes repetidos; si no, 'bajo'.
 *  - note: opcional, máximo 3 palabras (se muestra bajo el nombre).
 *  - requires: ids de data/movements.js que el usuario debe tener en su
 *    biblioteca para que el ejercicio sea elegible (ráfagas de golpes, esquivas).
 *
 * Nombres cortos: se ven en grande y en mayúsculas a 2-3 m de distancia.
 * Añadir un ejercicio: id único en snake_case (inglés), nombre corto en
 * español y valores válidos de los campos anteriores.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  SB.data.hiit = [
    /* ============================ FUERZA ============================ */

    /* --- Empuje --- */
    { id: 'push_std', name: 'Flexiones', category: 'fuerza', demand: 1, pattern: 'empuje', impact: 'bajo', note: '', requires: [] },
    { id: 'push_wide', name: 'Flexiones abiertas', category: 'fuerza', demand: 1, pattern: 'empuje', impact: 'bajo', note: 'manos muy abiertas', requires: [] },
    { id: 'push_diamond', name: 'Flexiones diamante', category: 'fuerza', demand: 2, pattern: 'empuje', impact: 'bajo', note: 'codos pegados', requires: [] },
    { id: 'push_t', name: 'Flexiones en T', category: 'fuerza', demand: 2, pattern: 'empuje', impact: 'bajo', note: 'alterna lados', requires: [] },
    { id: 'push_pike', name: 'Flexiones pica', category: 'fuerza', demand: 2, pattern: 'empuje', impact: 'bajo', note: 'cadera alta', requires: [] },
    { id: 'push_tap', name: 'Flexiones con toque', category: 'fuerza', demand: 2, pattern: 'empuje', impact: 'bajo', note: 'toca cada hombro', requires: [] },
    { id: 'push_archer', name: 'Flexiones archer', category: 'fuerza', demand: 3, pattern: 'empuje', impact: 'bajo', note: 'alterna lados', requires: [] },

    /* --- Piernas --- */
    { id: 'squat', name: 'Sentadillas', category: 'fuerza', demand: 1, pattern: 'piernas', impact: 'bajo', note: '', requires: [] },
    { id: 'squat_hold', name: 'Sentadilla isométrica', category: 'fuerza', demand: 1, pattern: 'piernas', impact: 'bajo', note: 'muslos paralelos', requires: [] },
    { id: 'lunge', name: 'Zancadas', category: 'fuerza', demand: 1, pattern: 'piernas', impact: 'bajo', note: 'alterna piernas', requires: [] },
    { id: 'lunge_lateral', name: 'Zancadas laterales', category: 'fuerza', demand: 1, pattern: 'piernas', impact: 'bajo', note: 'alterna lados', requires: [] },
    { id: 'glute_bridge', name: 'Puente de glúteo', category: 'fuerza', demand: 1, pattern: 'piernas', impact: 'bajo', note: 'aprieta arriba', requires: [] },
    { id: 'squat_pause', name: 'Sentadilla con pausa', category: 'fuerza', demand: 2, pattern: 'piernas', impact: 'bajo', note: 'pausa abajo', requires: [] },
    { id: 'pistol_alt', name: 'Pistol alterna', category: 'fuerza', demand: 3, pattern: 'piernas', impact: 'bajo', note: 'alterna piernas', requires: [] },

    /* --- Pliometría --- */
    { id: 'squat_jump', name: 'Sentadillas con salto', category: 'fuerza', demand: 2, pattern: 'pliometria', impact: 'alto', note: 'aterriza suave', requires: [] },
    { id: 'push_explosive', name: 'Flexiones explosivas', category: 'fuerza', demand: 2, pattern: 'pliometria', impact: 'alto', note: 'manos despegan', requires: [] },
    { id: 'push_clap', name: 'Flexiones con palmada', category: 'fuerza', demand: 3, pattern: 'pliometria', impact: 'alto', note: '', requires: [] },
    { id: 'lunge_jump', name: 'Zancadas explosivas', category: 'fuerza', demand: 3, pattern: 'pliometria', impact: 'alto', note: 'cambia en salto', requires: [] },
    { id: 'tuck_jump', name: 'Saltos agrupados', category: 'fuerza', demand: 3, pattern: 'pliometria', impact: 'alto', note: 'rodillas al pecho', requires: [] },

    /* --- Core --- */
    { id: 'plank_tap', name: 'Plancha con toques', category: 'fuerza', demand: 1, pattern: 'core', impact: 'bajo', note: 'toca cada hombro', requires: [] },
    { id: 'russian_twist', name: 'Giros rusos', category: 'fuerza', demand: 1, pattern: 'core', impact: 'bajo', note: 'pies elevados', requires: [] },
    { id: 'superman_alt', name: 'Superman alterno', category: 'fuerza', demand: 1, pattern: 'core', impact: 'bajo', note: 'brazo y pierna', requires: [] },
    { id: 'dead_bug', name: 'Dead bug', category: 'fuerza', demand: 1, pattern: 'core', impact: 'bajo', note: 'lumbar pegada', requires: [] },
    { id: 'plank_walkup', name: 'Plancha dinámica', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: 'codos a manos', requires: [] },
    { id: 'side_plank_rot', name: 'Plancha lateral con giro', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: 'alterna lados', requires: [] },
    { id: 'mountain_climber', name: 'Mountain climbers', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: '', requires: [] },
    { id: 'mountain_cross', name: 'Mountain climbers cruzados', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: 'rodilla al codo', requires: [] },
    { id: 'hollow_hold', name: 'Hollow hold', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: 'lumbar pegada', requires: [] },
    { id: 'v_up', name: 'Abdominales en V', category: 'fuerza', demand: 2, pattern: 'core', impact: 'bajo', note: '', requires: [] },

    /* --- Total --- */
    { id: 'bear_crawl', name: 'Gateo de oso', category: 'fuerza', demand: 2, pattern: 'total', impact: 'bajo', note: 'rodillas bajas', requires: [] },
    { id: 'burpee_push', name: 'Burpee con flexión', category: 'fuerza', demand: 3, pattern: 'total', impact: 'alto', note: '', requires: [] },

    /* ============================ CARDIO ============================ */

    /* --- Saltos --- */
    { id: 'jumping_jack', name: 'Jumping jacks', category: 'cardio', demand: 1, pattern: 'saltos', impact: 'alto', note: '', requires: [] },
    { id: 'jump_rope', name: 'Comba imaginaria', category: 'cardio', demand: 1, pattern: 'saltos', impact: 'alto', note: 'saltos cortos', requires: [] },
    { id: 'lateral_jump', name: 'Saltos laterales', category: 'cardio', demand: 2, pattern: 'saltos', impact: 'alto', note: 'pies juntos', requires: [] },
    { id: 'fb_jump', name: 'Saltos adelante-atrás', category: 'cardio', demand: 2, pattern: 'saltos', impact: 'alto', note: 'pies juntos', requires: [] },
    { id: 'jump_180', name: 'Saltos con giro 180°', category: 'cardio', demand: 2, pattern: 'saltos', impact: 'alto', note: 'alterna sentido', requires: [] },
    { id: 'star_jump', name: 'Saltos en estrella', category: 'cardio', demand: 3, pattern: 'saltos', impact: 'alto', note: '', requires: [] },

    /* --- Coordinación --- */
    { id: 'skipping', name: 'Skipping', category: 'cardio', demand: 1, pattern: 'coordinacion', impact: 'alto', note: '', requires: [] },
    { id: 'butt_kick', name: 'Talones al glúteo', category: 'cardio', demand: 1, pattern: 'coordinacion', impact: 'alto', note: '', requires: [] },
    { id: 'cross_jack', name: 'Jacks cruzados', category: 'cardio', demand: 1, pattern: 'coordinacion', impact: 'alto', note: 'cruza brazos', requires: [] },

    /* --- Agilidad --- */
    { id: 'bounce_multi', name: 'Rebote multidirección', category: 'cardio', demand: 1, pattern: 'agilidad', impact: 'bajo', note: 'cambia de dirección', requires: [] },
    { id: 'quick_feet', name: 'Pies rápidos', category: 'cardio', demand: 2, pattern: 'agilidad', impact: 'bajo', note: 'apoyos cortos', requires: [] },
    { id: 'agility_square', name: 'Cuadrado de agilidad', category: 'cardio', demand: 2, pattern: 'agilidad', impact: 'bajo', note: 'cuatro esquinas', requires: [] },
    { id: 'skater', name: 'Patinador', category: 'cardio', demand: 2, pattern: 'agilidad', impact: 'alto', note: 'salto lateral', requires: [] },

    /* --- Total --- */
    { id: 'high_knees', name: 'Rodillas al pecho', category: 'cardio', demand: 2, pattern: 'total', impact: 'alto', note: 'skipping alto', requires: [] },
    { id: 'burpee', name: 'Burpees', category: 'cardio', demand: 3, pattern: 'total', impact: 'alto', note: '', requires: [] },
    { id: 'burpee_lateral', name: 'Burpee con salto lateral', category: 'cardio', demand: 3, pattern: 'total', impact: 'alto', note: '', requires: [] },
    { id: 'sprint_place', name: 'Sprint en el sitio', category: 'cardio', demand: 3, pattern: 'total', impact: 'alto', note: 'máxima velocidad', requires: [] },

    /* --- Específico de boxeo --- */
    { id: 'shuffle_fb', name: 'Pasos adelante-atrás', category: 'cardio', demand: 1, pattern: 'especifico', impact: 'bajo', note: 'en guardia', requires: [] },
    { id: 'shuffle_lateral', name: 'Pasos laterales', category: 'cardio', demand: 1, pattern: 'especifico', impact: 'bajo', note: 'en guardia', requires: [] },
    { id: 'slip_drill', name: 'Media cintura continua', category: 'cardio', demand: 1, pattern: 'especifico', impact: 'bajo', note: 'flexiona piernas', requires: ['slip_lead', 'slip_rear'] },
    { id: 'burst_straight', name: 'Ráfaga de rectos', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'bajo', note: 'máxima velocidad', requires: ['jab', 'cross'] },
    { id: 'burst_upper', name: 'Ráfaga de uppercuts', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'bajo', note: 'golpes cortos', requires: ['lead_upper', 'rear_upper'] },
    { id: 'burst_hook', name: 'Ráfaga de ganchos', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'bajo', note: 'golpes cortos', requires: ['lead_hook', 'rear_hook'] },
    { id: 'burst_body', name: 'Ráfaga al cuerpo', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'bajo', note: 'piernas flexionadas', requires: ['jab_body', 'cross_body'] },
    { id: 'roll_drill', name: 'Cintura completa continua', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'bajo', note: 'baja con piernas', requires: ['roll_lead', 'roll_rear'] },
    { id: 'duck_drill', name: 'Sentadilla defensiva', category: 'cardio', demand: 1, pattern: 'especifico', impact: 'bajo', note: 'mirada al frente', requires: ['duck'] },
    { id: 'pull_drill', name: 'Goma continua', category: 'cardio', demand: 1, pattern: 'especifico', impact: 'bajo', note: 'peso atrás, vuelve', requires: ['pull_back'] },
    { id: 'skip_straight', name: 'Skipping con rectos', category: 'cardio', demand: 2, pattern: 'especifico', impact: 'alto', note: '', requires: ['jab', 'cross'] }
  ];
})(window.SB = window.SB || {});
