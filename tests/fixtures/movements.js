/**
 * SOMBRA · tests/fixtures/movements.js
 * ---------------------------------------------------------------------------
 * Catálogo de prueba (independiente de data/movements.js) con el esquema exacto
 * de docs/ARCHITECTURE.md §4.1 y los `flow` de la tabla de §5. Los textos son
 * mínimos: aquí solo importa la estructura y la gramática.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  // id, code, short, name, category, subcategory, level, side, target, against,
  // from [N,J,LL,RL,LOW], to, repeatWith, position [start,middle,end], follow ('golpe' o null), within, counters
  const T = [
    ['guard', 'GUARD', 'GUARDIA', 'Guardia', 'base', 'guardia', 'basico', 'none', null, [], [0, 0, 0, 0, 0], 'N', [], [false, false, false], null, null, []],
    ['jab', '1', '1', 'Jab', 'golpe', 'recto', 'basico', 'lead', 'cabeza', [], [2, 2, 1, 0, 0], 'J', [], [true, true, true], null, null, []],
    ['cross', '2', '2', 'Directo', 'golpe', 'recto', 'basico', 'rear', 'cabeza', [], [1, 2, 0, 2, 1], 'LL', [], [true, true, true], null, null, []],
    ['lead_hook', '3', '3', 'Gancho adelantado', 'golpe', 'gancho', 'basico', 'lead', 'cabeza', [], [1, 1, 2, 0, 1], 'RL', ['lead_hook_body'], [true, true, true], null, null, []],
    ['rear_hook', '4', '4', 'Gancho atrasado', 'golpe', 'gancho', 'avanzado', 'rear', 'cabeza', [], [0, 0, 0, 2, 1], 'LL', [], [true, true, true], null, null, []],
    ['lead_upper', '5', '5', 'Uppercut adelantado', 'golpe', 'uppercut', 'basico', 'lead', 'cabeza', [], [1, 0, 2, 0, 2], 'RL', [], [true, true, true], null, null, []],
    ['rear_upper', '6', '6', 'Uppercut atrasado', 'golpe', 'uppercut', 'basico', 'rear', 'cabeza', [], [1, 2, 0, 2, 2], 'LL', [], [true, true, true], null, null, []],
    ['jab_body', '1b', '1 (CUERPO)', 'Jab al cuerpo', 'golpe', 'recto', 'basico', 'lead', 'cuerpo', [], [2, 2, 1, 0, 2], 'J', [], [true, true, true], null, null, []],
    ['cross_body', '2b', '2 (CUERPO)', 'Directo al cuerpo', 'golpe', 'recto', 'basico', 'rear', 'cuerpo', [], [1, 2, 0, 2, 2], 'LL', [], [true, true, true], null, null, []],
    ['lead_hook_body', '3b', '3 (CUERPO)', 'Gancho adelantado al cuerpo', 'golpe', 'gancho', 'basico', 'lead', 'cuerpo', [], [1, 1, 2, 0, 2], 'RL', ['lead_hook'], [true, true, true], null, null, []],
    ['rear_hook_body', '4b', '4 (CUERPO)', 'Gancho atrasado al cuerpo', 'golpe', 'gancho', 'avanzado', 'rear', 'cuerpo', [], [0, 0, 0, 2, 2], 'LL', [], [true, true, true], null, null, []],
    ['lead_upper_body', '5b', '5 (CUERPO)', 'Uppercut adelantado al cuerpo', 'golpe', 'uppercut', 'avanzado', 'lead', 'cuerpo', [], [1, 0, 2, 0, 2], 'RL', [], [true, true, true], null, null, []],
    ['rear_upper_body', '6b', '6 (CUERPO)', 'Uppercut atrasado al cuerpo', 'golpe', 'uppercut', 'avanzado', 'rear', 'cuerpo', [], [1, 2, 0, 2, 2], 'LL', [], [true, true, true], null, null, []],
    ['block_high', 'BLOCK_H', 'BLOQ', 'Bloqueo alto', 'defensa', 'bloqueo', 'basico', 'none', null, ['curvos'], [2, 1, 1, 1, 0], 'N', [], [true, true, false], 'golpe', 2, ['lead_hook', 'cross', 'jab']],
    ['block_body', 'BLOCK_B', 'CODO', 'Bloqueo con el codo', 'defensa', 'bloqueo', 'basico', 'none', null, ['cuerpo'], [2, 1, 1, 1, 1], 'N', [], [true, true, false], 'golpe', 2, ['lead_hook_body', 'lead_hook', 'cross']],
    ['parry_jab', 'PARRY_1', 'PARADA', 'Parada del jab', 'defensa', 'parada', 'basico', 'rear', null, ['rectos'], [2, 1, 1, 1, 0], 'N', [], [true, true, false], 'golpe', 2, ['jab', 'cross']],
    ['parry_cross', 'PARRY_2', 'PARADA', 'Parada del directo', 'defensa', 'parada', 'avanzado', 'lead', null, ['rectos'], [2, 1, 1, 1, 0], 'N', [], [true, true, false], 'golpe', 2, ['cross', 'lead_hook']],
    ['slip_lead', 'SLIP_L', 'SLIP', 'Esquiva lateral adelantada', 'defensa', 'esquiva lateral', 'basico', 'lead', null, ['rectos'], [2, 2, 0, 2, 0], 'LL', [], [true, true, false], 'golpe', 2, ['lead_hook', 'lead_upper', 'lead_hook_body']],
    ['slip_rear', 'SLIP_R', 'SLIP', 'Esquiva lateral atrasada', 'defensa', 'esquiva lateral', 'basico', 'rear', null, ['rectos'], [2, 2, 2, 0, 0], 'RL', [], [true, true, false], 'golpe', 2, ['cross', 'rear_upper', 'cross_body']],
    ['roll_lead', 'ROLL_L', 'ROLL', 'Rotación al lado adelantado', 'defensa', 'esquiva rotatoria', 'avanzado', 'lead', null, ['curvos'], [1, 1, 0, 2, 0], 'LL', [], [true, true, false], 'golpe', 2, ['lead_hook', 'lead_upper', 'lead_hook_body']],
    ['roll_rear', 'ROLL_R', 'ROLL', 'Rotación al lado atrasado', 'defensa', 'esquiva rotatoria', 'avanzado', 'rear', null, ['curvos'], [1, 1, 2, 0, 0], 'RL', [], [true, true, false], 'golpe', 2, ['cross', 'rear_upper', 'rear_hook']],
    ['pull_back', 'PULL', 'PULL', 'Esquiva atrás', 'defensa', 'esquiva atras', 'avanzado', 'none', null, ['rectos'], [2, 2, 1, 0, 0], 'RL', [], [true, true, false], 'golpe', 2, ['cross']],
    ['duck', 'DUCK', 'DUCK', 'Agachada', 'defensa', 'agachada', 'avanzado', 'none', null, ['curvos'], [2, 1, 1, 1, 0], 'LOW', [], [true, true, false], 'golpe', 2, ['cross_body', 'lead_hook_body', 'lead_upper', 'rear_upper', 'lead_hook']],
    ['shoulder_roll', 'SHOULDER', 'HOMBRO', 'Bloqueo con el hombro', 'defensa', 'bloqueo', 'avanzado', 'lead', null, ['rectos'], [2, 1, 2, 0, 0], 'RL', [], [true, true, false], 'golpe', 2, ['cross', 'rear_upper']],
    ['step_in', 'STEP_IN', 'PASO ↑', 'Paso adelante', 'desplazamiento', 'paso', 'basico', 'none', null, [], [2, 1, 1, 1, 1], 'N', [], [true, true, false], null, null, []],
    ['step_back', 'STEP_OUT', 'PASO ↓', 'Paso atrás', 'desplazamiento', 'paso', 'basico', 'none', null, [], [2, 2, 2, 2, 1], 'N', [], [true, true, true], null, null, []],
    ['lateral_lead', 'LAT_L', 'LATERAL', 'Lateral al lado adelantado', 'desplazamiento', 'lateral', 'basico', 'lead', null, [], [2, 2, 2, 2, 1], 'N', [], [true, true, true], null, null, []],
    ['lateral_rear', 'LAT_R', 'LATERAL', 'Lateral al lado atrasado', 'desplazamiento', 'lateral', 'basico', 'rear', null, [], [2, 2, 2, 2, 1], 'N', [], [true, true, true], null, null, []],
    ['pivot', 'PIVOT', 'PIVOTE', 'Pivote', 'desplazamiento', 'pivote', 'avanzado', 'none', null, [], [1, 1, 1, 2, 0], 'N', [], [false, true, true], null, null, []],
    ['angle_step', 'ANGLE', 'ÁNGULO', 'Paso en ángulo', 'desplazamiento', 'ángulo', 'avanzado', 'none', null, [], [1, 2, 2, 2, 1], 'N', [], [true, true, true], null, null, []],
    ['distance_reset', 'RESET', 'AJUSTE', 'Ajuste de distancia', 'desplazamiento', 'distancia', 'basico', 'none', null, [], [2, 1, 1, 1, 1], 'N', [], [true, true, false], null, null, []],
    ['feint_jab', 'FEINT', 'FINTA', 'Finta de jab', 'finta', 'finta', 'avanzado', 'lead', null, [], [2, 1, 1, 0, 0], 'J', [], [true, true, false], 'golpe', 1, ['cross', 'lead_hook']],
    ['feint_level', 'LEVEL', 'AMAGO', 'Amago al cuerpo', 'finta', 'finta', 'avanzado', 'none', null, [], [2, 2, 1, 1, 0], 'N', [], [true, true, false], 'golpe', 1, ['jab', 'lead_hook']],
    ['rhythm_break', 'PAUSE', 'PAUSA', 'Cambio de ritmo', 'ritmo', 'ritmo', 'avanzado', 'none', null, [], [1, 1, 1, 1, 1], 'keep', [], [false, true, false], 'golpe', 1, []]
  ];

  SB.data.movements = T.map(function (r) {
    return {
      id: r[0], code: r[1], short: r[2], name: r[3], category: r[4], subcategory: r[5], level: r[6],
      side: r[7], target: r[8], against: r[9],
      description: 'Descripción de prueba de ' + r[3] + '.',
      cues: ['Indicación 1', 'Indicación 2', 'Indicación 3'],
      errors: ['Error común'],
      counters: r[16],
      anim: r[0],
      tags: [],
      flow: {
        from: { N: r[10][0], J: r[10][1], LL: r[10][2], RL: r[10][3], LOW: r[10][4] },
        to: r[11],
        repeatWith: r[12],
        position: { start: r[13][0], middle: r[13][1], end: r[13][2] },
        mustBeFollowedBy: r[14],
        within: r[15]
      }
    };
  });
})(window.SB = window.SB || {});
