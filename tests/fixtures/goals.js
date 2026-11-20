/**
 * SOMBRA · tests/fixtures/goals.js
 * ---------------------------------------------------------------------------
 * Objetivos y focos de prueba (esquema §4.4). Incluye un timing por nivel y un
 * requiresAnyMovement para cubrir las extensiones del contrato de data/goals.js.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  function goal(id, name, repRatio, focusWeights, cats, timing, changeSpeed, shift, tempo) {
    return {
      id: id, name: name, short: name.split(' ')[0], description: 'Objetivo de prueba ' + name + '.', icon: 'star',
      repRatio: repRatio, focusWeights: focusWeights, requires: { categories: cats },
      timing: Object.assign({ intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 }, timing || {}),
      changeSpeed: changeSpeed, complexityShift: shift, tempo: tempo
    };
  }

  const all = function (w) { return { ataque: w, velocidad: w, defensa: w, contra: w, movilidad: w, angulos: w, niveles: w, integracion: w }; };

  SB.data.goals = [
    goal('tecnica', 'Técnica básica', 0.7, { ataque: 3, velocidad: 0.5, defensa: 1, contra: 1, movilidad: 1, angulos: 0.5, niveles: 1, integracion: 0.5 }, [], null, 1.1, -0.5, 'controlado'),
    goal('velocidad', 'Velocidad', 0.5, { ataque: 1, velocidad: 3, defensa: 0, contra: 1, movilidad: 1, angulos: 0, niveles: 0.5, integracion: 0.5 }, [], { intervalSec: { basico: 35, avanzado: 40 }, intervalsPerRound: 4 }, 0.8, -0.5, 'explosivo'),
    goal('ofensiva', 'Combinaciones ofensivas', null, { ataque: 3, velocidad: 1, defensa: 0, contra: 0.5, movilidad: 1, angulos: 1, niveles: 2, integracion: 1 }, [], null, 1, 0.5, null),
    goal('defensa', 'Defensa y contraataque', 0.45, { ataque: 1, velocidad: 0, defensa: 3, contra: 3, movilidad: 1, angulos: 0.5, niveles: 0.5, integracion: 0.5 }, ['defensa'], null, 1, 0, null),
    goal('movilidad', 'Desplazamientos', null, { ataque: 0.5, velocidad: 0.5, defensa: 0.5, contra: 0.5, movilidad: 3, angulos: 3, niveles: 0, integracion: 1 }, ['desplazamiento'], null, 1, 0, 'fluido'),
    goal('resistencia', 'Resistencia', 0.3, all(1), [], { restSec: 20, hiitDelta: 5 }, 0.9, -0.5, 'continuo'),
    goal('completo', 'Boxeo completo', null, all(1), [], null, 1, 0, null)
  ];

  SB.data.focuses = [
    { id: 'ataque', name: 'Ataque', tagsAny: ['ofensiva', 'potencia', 'fundamental'], requiresCategory: [], templates: ['P{2,4}', 'P{2,3}', 'T P{1,3}'] },
    { id: 'velocidad', name: 'Velocidad', tagsAny: ['velocidad', 'ritmo'], requiresCategory: [], templates: ['P{2,3}', 'P{3,4}', 'P{1,2} R P{1,2}'] },
    { id: 'defensa', name: 'Defensa', tagsAny: ['defensa'], requiresCategory: ['defensa'], templates: ['D P{1,2}', 'P{1,3} D P{1,2}', 'P{1,2} D D P{1,2}'] },
    { id: 'contra', name: 'Contraataque', tagsAny: ['contra'], requiresCategory: ['defensa'], templates: ['D P{1,3}', 'P{1,2} D P{1,3}'] },
    { id: 'movilidad', name: 'Desplazamientos', tagsAny: ['desplazamiento', 'entrada', 'salida'], requiresCategory: ['desplazamiento'], templates: ['F P{1,3}', 'P{2,3} F', 'P{1,3} F P{1,2}'] },
    { id: 'angulos', name: 'Ángulos', tagsAny: ['angulo'], requiresCategory: ['desplazamiento'], templates: ['P{1,3} F P{1,2}', 'P{2,3} F'] },
    { id: 'niveles', name: 'Cabeza y cuerpo', tagsAny: ['niveles'], requiresCategory: [], requiresAnyMovement: ['jab_body', 'cross_body', 'lead_hook_body'], templates: ['P{2,3}', 'P{2,4}'] },
    { id: 'integracion', name: 'Integración', tagsAny: [], requiresCategory: [], templates: ['P{2,4}', 'P{1,3} D P{1,3}', 'P{1,3} F P{1,2}', 'T P{1,3}', 'P{1,2} R P{1,2}'] }
  ];
})(window.SB = window.SB || {});
