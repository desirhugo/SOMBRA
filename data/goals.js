/*
 * SOMBRA · data/goals.js
 * ---------------------------------------------------------------------------
 * Objetivos de sesión (SB.data.goals) y focos de ronda (SB.data.focuses).
 * Esquema: docs/ARCHITECTURE.md §4.4; uso en el motor: §6.
 *
 * Objetivo:
 *  - repRatio: proporción de intervalos en REPETICIÓN (null = valor del nivel, §6.1).
 *  - focusWeights: peso de cada uno de los 9 focos (0 = nunca).
 *  - requires.categories: el objetivo solo está disponible si la biblioteca
 *    personal tiene ≥1 movimiento de esas categorías ([] = siempre).
 *  - timing: null = valor por defecto del nivel. hiitDelta suma segundos al HIIT.
 *  - changeSpeed: multiplica el tiempo por combinación en VARIACIÓN (<1 = más rápido).
 *  - complexityShift: desplaza la complejidad objetivo (-1..+1).
 *  - tempo: etiqueta de ritmo forzada o null.
 *
 * // CONTRATO: `timing.intervalSec` admite, además de número o null, un objeto
 * //   por nivel { basico: n, avanzado: n } (p. ej. velocidad: intervalos más
 * //   cortos según el nivel). El motor debe resolverlo con
 * //   (typeof v === 'object' && v) ? v[level] : v.
 *
 * Foco:
 *  - tagsAny: una combinación de biblioteca es válida si tiene alguna de estas
 *    etiquetas ([] = cualquiera).
 *  - requiresCategory: el foco solo está disponible si la biblioteca tiene
 *    movimientos de esas categorías.
 *  - templates: plantillas del generador (§6.2). La PRIMERA plantilla de cada
 *    foco solo usa categorías incluidas en requiresCategory (siempre es
 *    realizable si el foco está disponible); las demás pueden usar D/F/T/R y
 *    el generador debe descartarlas si la biblioteca no tiene esa categoría.
 *
 * // CONTRATO: campo opcional `requiresAnyMovement: [ids]` en un foco: además
 * //   de requiresCategory, el foco solo está disponible si la biblioteca
 * //   personal contiene AL MENOS UNO de esos movimientos (se usa en `niveles`,
 * //   que necesita algún golpe al cuerpo). Si falta o es [], no se aplica.
 *
 * Añadir un objetivo: id único, los 9 focos en focusWeights y todos los campos.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  SB.data.goals = [
    {
      id: 'tecnica',
      name: 'Técnica básica',
      short: 'Técnica',
      description: 'Repetición controlada de golpes y combinaciones cortas para fijar la ejecución correcta: guardia, giro de cadera y vuelta a la guardia en cada golpe.',
      icon: 'target',
      repRatio: 0.75,
      focusWeights: { ataque: 3, velocidad: 0.5, defensa: 1.5, contra: 1, movilidad: 1.5, angulos: 0.5, niveles: 1, integracion: 0.5, salidas: 0.5 },
      requires: { categories: [] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
      changeSpeed: 1.15,
      complexityShift: -0.5,
      tempo: 'controlado'
    },
    {
      id: 'velocidad',
      name: 'Velocidad y coordinación',
      short: 'Velocidad',
      description: 'Intervalos cortos e intensos con combinaciones breves lanzadas a máxima velocidad y cambios rápidos, sin perder la técnica ni la guardia.',
      icon: 'bolt',
      repRatio: 0.5,
      focusWeights: { ataque: 1.5, velocidad: 3, defensa: 0.5, contra: 1, movilidad: 1, angulos: 0.5, niveles: 0.5, integracion: 0.5, salidas: 0.5 },
      requires: { categories: [] },
      timing: { intervalSec: { basico: 35, avanzado: 40 }, intervalsPerRound: 4, restSec: null, hiitDelta: 0 },
      changeSpeed: 0.8,
      complexityShift: -0.5,
      tempo: 'explosivo'
    },
    {
      id: 'ofensiva',
      name: 'Combinaciones ofensivas',
      short: 'Ofensiva',
      description: 'Combinaciones de ataque cada vez más largas: rectos, ganchos, uppercuts y cambios de nivel, con entradas y salidas de distancia.',
      icon: 'fist',
      repRatio: null,
      focusWeights: { ataque: 3, velocidad: 1.5, defensa: 0.5, contra: 0.5, movilidad: 1, angulos: 1, niveles: 2, integracion: 1, salidas: 1 },
      requires: { categories: [] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
      changeSpeed: 1.0,
      complexityShift: 0.5,
      tempo: null
    },
    {
      id: 'defensa',
      name: 'Defensa y contraataque',
      short: 'Defensa',
      description: 'Esquivas, bloqueos y paradas siempre seguidas de respuesta: defender y contraatacar en la misma acción, como exige el boxeo olímpico.',
      icon: 'shield',
      repRatio: 0.45,
      focusWeights: { ataque: 1, velocidad: 0, defensa: 3, contra: 3, movilidad: 1, angulos: 0.5, niveles: 0.5, integracion: 0.5, salidas: 1.5 },
      requires: { categories: ['defensa'] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
      changeSpeed: 1.0,
      complexityShift: 0,
      tempo: null
    },
    {
      id: 'movilidad',
      name: 'Desplazamientos y movilidad',
      short: 'Movilidad',
      description: 'Trabajo de pies integrado en las combinaciones: entrar y salir de distancia, pasos laterales, pivotes y ángulos para atacar fuera de la línea del rival.',
      icon: 'footsteps',
      repRatio: null,
      focusWeights: { ataque: 0.5, velocidad: 0.5, defensa: 0.5, contra: 0.5, movilidad: 3, angulos: 3, niveles: 0, integracion: 1, salidas: 2.5 },
      requires: { categories: ['desplazamiento'] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
      changeSpeed: 1.0,
      complexityShift: 0,
      tempo: 'fluido'
    },
    {
      id: 'resistencia',
      name: 'Resistencia',
      short: 'Resistencia',
      description: 'Trabajo continuo con descansos cortos y HIIT más largo: combinaciones manejables con volumen alto para sostener el ritmo de trabajo toda la sesión.',
      icon: 'heart',
      repRatio: 0.3,
      focusWeights: { ataque: 2, velocidad: 1.5, defensa: 1, contra: 1, movilidad: 1.5, angulos: 0.5, niveles: 1, integracion: 1.5, salidas: 1 },
      requires: { categories: [] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: 20, hiitDelta: 5 },
      changeSpeed: 0.9,
      complexityShift: -0.5,
      tempo: 'continuo'
    },
    {
      id: 'completo',
      name: 'Boxeo completo',
      short: 'Completo',
      description: 'Sesión equilibrada que combina ataque, defensa, contraataque, desplazamientos y cambios de nivel, integrándolos en las mismas combinaciones.',
      icon: 'gloves',
      repRatio: null,
      focusWeights: { ataque: 2, velocidad: 1, defensa: 1.5, contra: 1.5, movilidad: 1, angulos: 1, niveles: 1, integracion: 2, salidas: 1.5 },
      requires: { categories: [] },
      timing: { intervalSec: null, intervalsPerRound: null, restSec: null, hiitDelta: 0 },
      changeSpeed: 1.0,
      complexityShift: 0,
      tempo: null
    }
  ];

  SB.data.focuses = [
    {
      id: 'ataque',
      name: 'Ataque',
      tagsAny: ['ofensiva', 'potencia', 'fundamental', 'finta'],
      requiresCategory: [],
      templates: ['P{2,4}', 'P{2,3}', 'P{3,5}', 'T P{1,3}']
    },
    {
      id: 'velocidad',
      name: 'Velocidad',
      tagsAny: ['velocidad', 'ritmo'],
      requiresCategory: [],
      templates: ['P{2,3}', 'P{1,2}', 'P{3,4}', 'P{1,2} R P{1,2}']
    },
    {
      id: 'defensa',
      name: 'Defensa',
      tagsAny: ['defensa'],
      requiresCategory: ['defensa'],
      templates: ['D P{1,2}', 'P{1,3} D P{1,2}', 'P{1,2} D D P{1,2}', 'D P{1,2} F']
    },
    {
      id: 'contra',
      name: 'Contraataque',
      tagsAny: ['contra'],
      requiresCategory: ['defensa'],
      templates: ['D P{1,3}', 'P{1,2} D P{1,3}', 'D D P{1,3}', 'T P{1,2} D P{1,2}']
    },
    {
      id: 'movilidad',
      name: 'Desplazamientos',
      tagsAny: ['desplazamiento', 'entrada', 'salida'],
      requiresCategory: ['desplazamiento'],
      templates: ['F P{1,3}', 'P{2,3} F', 'F P{2,3} F', 'P{1,3} F P{1,2}']
    },
    {
      id: 'angulos',
      name: 'Ángulos',
      tagsAny: ['angulo'],
      requiresCategory: ['desplazamiento'],
      templates: ['P{1,3} F P{1,2}', 'P{2,3} F', 'F P{2,3}', 'P{2,3} F P{1,3}']
    },
    {
      id: 'niveles',
      name: 'Cabeza y cuerpo',
      tagsAny: ['niveles'],
      requiresCategory: [],
      requiresAnyMovement: ['jab_body', 'cross_body', 'lead_hook_body', 'rear_hook_body', 'lead_upper_body', 'rear_upper_body'],
      templates: ['P{2,3}', 'P{2,4}', 'P{3,5}', 'T P{1,3}']
    },
    {
      id: 'integracion',
      name: 'Integración',
      tagsAny: [],
      requiresCategory: [],
      templates: ['P{2,4}', 'P{1,3} D P{1,3}', 'P{1,3} F P{1,2}', 'D P{1,3} F', 'T P{1,3} F', 'P{1,2} R P{1,2}', 'F P{1,2} D P{1,2}']
    },
    {
      // Añadido el 1-nov-2026 (RESEARCH §9): toda combinación termina con una salida, nunca quieto delante del rival.
      id: 'salidas',
      name: 'Salidas',
      tagsAny: ['salida'],
      requiresCategory: ['desplazamiento'],
      templates: ['P{2,3} F', 'P{2,4} F', 'P{1,2} D P{1,2} F', 'T P{1,3} F']
    }
  ];
})(window.SB = window.SB || {});
