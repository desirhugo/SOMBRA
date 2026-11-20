/**
 * SOMBRA · tests/fixtures/combinations.js
 * ---------------------------------------------------------------------------
 * Combinaciones curadas de prueba (esquema §4.2). Todas cumplen la gramática.
 */
(function (SB) {
  'use strict';
  SB.data = SB.data || {};

  function c(id, seq, name, level, tags) {
    return { id: id, seq: seq, name: name, level: level, tags: tags, note: 'Nota de prueba de ' + name + '.' };
  }

  SB.data.combinations = [
    // Básico: golpes
    c('c_1', ['jab'], 'Jab', 'basico', ['fundamental']),
    c('c_1_1', ['jab', 'jab'], 'Doble jab', 'basico', ['fundamental', 'velocidad']),
    c('c_1_2', ['jab', 'cross'], 'Uno-dos', 'basico', ['fundamental', 'ofensiva']),
    c('c_1_1_2', ['jab', 'jab', 'cross'], 'Uno-uno-dos', 'basico', ['fundamental', 'velocidad']),
    c('c_1_2_1', ['jab', 'cross', 'jab'], 'Uno-dos-uno', 'basico', ['velocidad', 'ofensiva']),
    c('c_1_2_3', ['jab', 'cross', 'lead_hook'], 'Uno-dos-tres', 'basico', ['ofensiva', 'potencia']),
    c('c_1_2_3_2', ['jab', 'cross', 'lead_hook', 'cross'], 'Uno-dos-tres-dos', 'basico', ['ofensiva']),
    c('c_2_3_2', ['cross', 'lead_hook', 'cross'], 'Dos-tres-dos', 'basico', ['potencia']),
    c('c_1_6_3_2', ['jab', 'rear_upper', 'lead_hook', 'cross'], 'Jab, uppercut, gancho, directo', 'basico', ['ofensiva', 'potencia']),
    c('c_1_2_5_2', ['jab', 'cross', 'lead_upper', 'cross'], 'Uno-dos-cinco-dos', 'basico', ['ofensiva']),
    c('c_3_2', ['lead_hook', 'cross'], 'Tres-dos', 'basico', ['potencia']),
    c('c_5_2', ['lead_upper', 'cross'], 'Cinco-dos', 'basico', ['potencia']),
    c('c_6_3_2', ['rear_upper', 'lead_hook', 'cross'], 'Seis-tres-dos', 'basico', ['potencia']),
    c('c_2_3_6_3', ['cross', 'lead_hook', 'rear_upper', 'lead_hook'], 'Dos-tres-seis-tres', 'basico', ['potencia', 'ofensiva']),
    c('c_5_6_3', ['lead_upper', 'rear_upper', 'lead_hook'], 'Cinco-seis-tres', 'basico', ['potencia']),
    // Básico: niveles
    c('c_1b_2', ['jab_body', 'cross'], 'Jab al cuerpo y directo', 'basico', ['niveles']),
    c('c_1_2b_3', ['jab', 'cross_body', 'lead_hook'], 'Uno, dos al cuerpo, tres', 'basico', ['niveles', 'ofensiva']),
    c('c_1_2_3b_3', ['jab', 'cross', 'lead_hook_body', 'lead_hook'], 'Doble gancho abajo-arriba', 'basico', ['niveles', 'ofensiva']),
    c('c_2b_3_2', ['cross_body', 'lead_hook', 'cross'], 'Dos al cuerpo, tres, dos', 'basico', ['niveles']),
    c('c_1_1b_2', ['jab', 'jab_body', 'cross'], 'Jab arriba, jab abajo, directo', 'basico', ['niveles', 'velocidad']),
    // Básico: defensa y contra
    c('c_1_2_slipR_2', ['jab', 'cross', 'slip_rear', 'cross'], 'Uno-dos, esquiva y directo', 'basico', ['defensa', 'contra']),
    c('c_slipL_3_2', ['slip_lead', 'lead_hook', 'cross'], 'Esquiva y tres-dos', 'basico', ['defensa', 'contra']),
    c('c_slipR_2_3', ['slip_rear', 'cross', 'lead_hook'], 'Esquiva y dos-tres', 'basico', ['defensa', 'contra']),
    c('c_blockH_3_2', ['block_high', 'lead_hook', 'cross'], 'Bloqueo y tres-dos', 'basico', ['defensa', 'contra']),
    c('c_parry1_1_2', ['parry_jab', 'jab', 'cross'], 'Parada y uno-dos', 'basico', ['defensa', 'contra']),
    c('c_blockB_3b_3', ['block_body', 'lead_hook_body', 'lead_hook'], 'Codo y doble gancho', 'basico', ['defensa', 'contra', 'niveles']),
    c('c_1_slipL_3', ['jab', 'slip_lead', 'lead_hook'], 'Jab, esquiva y gancho', 'basico', ['defensa', 'contra']),
    // Básico: desplazamientos
    c('c_in_1_2', ['step_in', 'jab', 'cross'], 'Entrada con uno-dos', 'basico', ['desplazamiento', 'entrada']),
    c('c_1_2_out', ['jab', 'cross', 'step_back'], 'Uno-dos y salida', 'basico', ['desplazamiento', 'salida']),
    c('c_1_2_latL', ['jab', 'cross', 'lateral_lead'], 'Uno-dos y lateral', 'basico', ['angulo', 'salida']),
    c('c_latR_1_2', ['lateral_rear', 'jab', 'cross'], 'Lateral y uno-dos', 'basico', ['angulo', 'entrada', 'desplazamiento']),
    c('c_reset_1_1_2', ['distance_reset', 'jab', 'jab', 'cross'], 'Ajuste y uno-uno-dos', 'basico', ['entrada', 'desplazamiento']),
    c('c_1_2_3_latR', ['jab', 'cross', 'lead_hook', 'lateral_rear'], 'Uno-dos-tres y lateral', 'basico', ['angulo', 'salida']),
    // Avanzado
    c('c_1_2_rollR_2_3', ['jab', 'cross', 'roll_rear', 'cross', 'lead_hook'], 'Uno-dos, rotación, dos-tres', 'avanzado', ['defensa', 'contra']),
    c('c_3_rollL_3_2', ['lead_hook', 'roll_lead', 'lead_hook', 'cross'], 'Tres, rotación, tres-dos', 'avanzado', ['defensa', 'contra']),
    c('c_1_pull_2', ['jab', 'pull_back', 'cross'], 'Jab, esquiva atrás, directo', 'avanzado', ['defensa', 'contra']),
    c('c_duck_2b_3_2', ['duck', 'cross_body', 'lead_hook', 'cross'], 'Agachada, dos abajo, tres-dos', 'avanzado', ['defensa', 'contra', 'niveles']),
    c('c_finta_2_3_2', ['feint_jab', 'cross', 'lead_hook', 'cross'], 'Finta y dos-tres-dos', 'avanzado', ['finta', 'ofensiva']),
    c('c_amago_1_2', ['feint_level', 'jab', 'cross'], 'Amago y uno-dos', 'avanzado', ['finta', 'niveles']),
    c('c_1_pausa_2_3', ['jab', 'rhythm_break', 'cross', 'lead_hook'], 'Jab, pausa, dos-tres', 'avanzado', ['ritmo']),
    c('c_1_2_pivot', ['jab', 'cross', 'pivot'], 'Uno-dos y pivote', 'avanzado', ['angulo', 'salida']),
    c('c_1_2_3_pivot_2', ['jab', 'cross', 'lead_hook', 'pivot', 'cross'], 'Uno-dos-tres, pivote, dos', 'avanzado', ['angulo']),
    c('c_angle_3_2', ['angle_step', 'lead_hook', 'cross'], 'Ángulo y tres-dos', 'avanzado', ['angulo', 'entrada']),
    c('c_3_4_3', ['lead_hook', 'rear_hook', 'lead_hook'], 'Tres-cuatro-tres', 'avanzado', ['potencia']),
    c('c_1_2_3_4_3b_2', ['jab', 'cross', 'lead_hook', 'rear_hook', 'lead_hook_body', 'cross'], 'Cadena larga con cambio de nivel', 'avanzado', ['ofensiva', 'niveles']),
    c('c_shoulder_2_3', ['shoulder_roll', 'cross', 'lead_hook'], 'Hombro y dos-tres', 'avanzado', ['defensa', 'contra']),
    c('c_parry2_2_3', ['parry_cross', 'cross', 'lead_hook'], 'Parada del directo y dos-tres', 'avanzado', ['defensa', 'contra']),
    c('c_1_2_slipR_slipL_3_2', ['jab', 'cross', 'slip_rear', 'slip_lead', 'lead_hook', 'cross'], 'Uno-dos, doble esquiva, tres-dos', 'avanzado', ['defensa', 'contra']),
    c('c_in_1_2_3_out', ['step_in', 'jab', 'cross', 'lead_hook', 'step_back'], 'Entrada, uno-dos-tres y salida', 'avanzado', ['entrada', 'salida', 'desplazamiento']),
    c('c_1_1_2_3_2', ['jab', 'jab', 'cross', 'lead_hook', 'cross'], 'Cinco golpes', 'avanzado', ['velocidad', 'ofensiva'])
  ];
})(window.SB = window.SB || {});
