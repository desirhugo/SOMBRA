/**
 * SOMBRA · tests/fixtures/hiit.js
 * ---------------------------------------------------------------------------
 * Ejercicios HIIT de prueba (esquema §4.3): 11 de fuerza y 11 de cardio con
 * patrones variados, impactos y algunos `requires`.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  function e(id, name, category, demand, pattern, impact, note, requires) {
    return { id: id, name: name, category: category, demand: demand, pattern: pattern, impact: impact, note: note || '', requires: requires || [] };
  }

  SB.data.hiit = [
    e('push_std', 'Flexiones', 'fuerza', 1, 'empuje', 'bajo'),
    e('push_diamond', 'Flexiones diamante', 'fuerza', 2, 'empuje', 'bajo'),
    e('pike_push', 'Flexiones pica', 'fuerza', 2, 'empuje', 'bajo'),
    e('squat', 'Sentadillas', 'fuerza', 1, 'piernas', 'bajo'),
    e('lunge_alt', 'Zancadas', 'fuerza', 2, 'piernas', 'bajo', 'alterna lados'),
    e('plank', 'Plancha', 'fuerza', 1, 'core', 'bajo'),
    e('plank_tap', 'Plancha con toques', 'fuerza', 2, 'core', 'bajo'),
    e('situp_punch', 'Abdominales con golpe', 'fuerza', 2, 'core', 'bajo', '', ['jab', 'cross']),
    e('burpee', 'Burpees', 'fuerza', 3, 'total', 'alto'),
    e('squat_jump', 'Sentadilla con salto', 'fuerza', 3, 'pliometria', 'alto'),
    e('lunge_jump', 'Zancada con salto', 'fuerza', 3, 'pliometria', 'alto'),
    e('jacks', 'Saltos de tijera', 'cardio', 1, 'saltos', 'alto'),
    e('rope', 'Comba imaginaria', 'cardio', 1, 'saltos', 'alto'),
    e('high_knees', 'Rodillas arriba', 'cardio', 2, 'agilidad', 'alto'),
    e('shuffle', 'Desplazamiento lateral', 'cardio', 1, 'agilidad', 'bajo'),
    e('skater', 'Saltos de patinador', 'cardio', 2, 'agilidad', 'alto'),
    e('butt_kicks', 'Talones al glúteo', 'cardio', 1, 'coordinacion', 'bajo'),
    e('cross_jacks', 'Tijeras cruzadas', 'cardio', 2, 'coordinacion', 'alto'),
    e('shadow_burst', 'Ráfaga de rectos', 'cardio', 2, 'especifico', 'bajo', '', ['jab', 'cross']),
    e('slip_drill', 'Esquivas rápidas', 'cardio', 2, 'especifico', 'bajo', '', ['slip_lead', 'slip_rear']),
    e('sprawl', 'Sprawls', 'cardio', 3, 'total', 'alto'),
    e('mountain', 'Escaladores', 'cardio', 2, 'total', 'bajo')
  ];
})(window.SB = window.SB || {});
