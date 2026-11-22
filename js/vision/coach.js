/**
 * SOMBRA · js/vision/coach.js
 * ---------------------------------------------------------------------------
 * Entrenador a partir de SB.vision.Analyzer (módulo puro, sin DOM):
 *
 *  - Tema de cada ronda: 1.ª técnica; la primera ronda sin mancuernas a partir de la 2.ª,
 *    velocidad; después, el aspecto que peor salió hasta ahora (guardia, barbilla, cadera,
 *    recogida o técnica), sin repetir el de la ronda anterior si hay alternativa. Con
 *    mancuernas nunca «velocidad» (se trabaja técnica y control); con papel no «cadera»
 *    (no hay golpes de la mano atrasada); con pelota no «barbilla» (ya la sujeta la pelota).
 *  - Indicaciones en directo (21-nov-2026, a petición del usuario: «todo el rato levanta la
 *    mano… me desconcentra»): como mucho UN comentario por serie (intervalo) y al menos 3
 *    combinaciones (o 25 s) desde el anterior. La misma corrección, una vez por ronda. Solo
 *    avisa de un error que se repite (no de un fotograma suelto); las de guardia y colocación
 *    pueden salir siempre y el resto solo si son del tema de la ronda.
 *  - Felicitaciones con el mismo cupo: si corriges lo que se te dijo («¡Eso es! Ya no cargas el
 *    golpe»), si el tema de la ronda va bien o si los últimos golpes salen limpios.
 *  - onFault(id, {t0, t1, hand, side}): cada error detectado (dicho o no), una vez por ronda,
 *    con la ventana de tiempo en la que se ve; sirve para guardar el clip del fallo.
 *  - Resumen de cada ronda (para el descanso) e informe final: qué haces bien y qué
 *    mejorar, con explicación y consejo. No se guarda nada.
 */
(function (SB) {
  'use strict';

  const THEMES = {
    tecnica: { name: 'Técnica', intro: 'fíjate solo en la técnica: golpes limpios y vuelta a la guardia' },
    velocidad: { name: 'Velocidad', intro: 'suelta rápido y recoge más rápido todavía' },
    guardia: { name: 'Guardia alta', intro: 'las dos manos pegadas a la cara entre golpe y golpe' },
    barbilla: { name: 'Barbilla abajo', intro: 'barbilla recogida y mirada al frente' },
    cadera: { name: 'Cadera', intro: 'gira cadera y hombro en cada golpe de la mano de atrás' },
    recogida: { name: 'Recogida', intro: 'recoge por el mismo camino, rápido y sin bajar la mano' }
  };
  const ADAPTIVE = ['guardia', 'barbilla', 'cadera', 'recogida', 'tecnica'];

  const MIN_COMBOS = 3;      // combinaciones entre dos comentarios…
  const MIN_GAP = 25;        // …o, si no cambian (series de repetición), segundos
  const SERIE_SETTLE = 5;    // s de cada serie antes del primer comentario
  const PRAISE_SETTLE = 8;   // s de cada serie antes de felicitar

  /** Errores que se ven en un golpe concreto (marca del evento del analizador). */
  const PUNCH_FLAG = { other_hand: 'otherLow', windup: 'windup', low_return: 'lowReturn', slow_return: 'slowReturn',
    arm_only: 'armOnly', short: 'shortStraight', lean: 'lean' };

  /** Felicitación cuando desaparece un error que se te dijo. */
  const FIXED = {
    rear_low: '¡Eso es! La mano de atrás ya no baja', lead_low: '¡Eso es! La mano de delante, arriba',
    other_hand: '¡Bien! La otra mano se queda en la cara', chin_up: '¡Bien! Barbilla abajo', floor: '¡Bien! Mirada al frente',
    windup: '¡Eso es! Ya no cargas el golpe', low_return: '¡Bien! Ya recoges por el mismo camino', slow_return: '¡Bien! Recoges más rápido',
    arm_only: '¡Eso es! Ahora giras la cadera', short: '¡Bien! Rectos estirados', lean: '¡Bien! El peso, centrado',
    flare: '¡Bien! Codos cerrados', narrow: '¡Bien! Buena base', wide: '¡Bien! Buena base', faster: '¡Eso es, más rápido!',
    volume: '¡Bien! Sigue soltando'
  };
  const CLEAN_TEXT = '¡Bien hecho! Golpes limpios';
  /** Correcciones de la misma familia: se dice una de ellas por ronda («sube la mano» una vez). */
  const FAMILY = { rear_low: 'manos', lead_low: 'manos', other_hand: 'manos', chin_up: 'cabeza', floor: 'cabeza',
    low_return: 'recogida', slow_return: 'recogida', narrow: 'pies', wide: 'pies' };
  function familyOf(id) { return FAMILY[id] || id; }

  function median(a) { return SB.vision.analyzerUtil.median(a); }
  function pct(x) { return Math.round((x || 0) * 100) + ' %'; }
  function ms(v) { return (Math.round(v * 10) / 10).toFixed(1).replace('.', ',') + ' m/s'; }
  function frac(a, b) { return b ? a / b : 0; }
  function count(list, key) { let n = 0; for (let i = 0; i < list.length; i++) if (list[i][key]) n++; return n; }

  // ------------------------------------------------------------- métricas
  /** Métricas de una ronda (estadísticas del analizador). */
  function metricsOf(r) {
    if (!r) return null;
    const P = r.punches;
    const n = P.length;
    const rear = P.filter(function (p) { return p.hand === 'rear' && (p.type === 'straight' || p.type === 'hook'); });
    const straights = P.filter(function (p) { return p.type === 'straight'; });
    const dur = r.startT != null && r.endT != null ? Math.max(1, r.endT - r.startT) : 1;
    const thirdsSpeed = [0, 1, 2].map(function (k) { return median(P.filter(function (p) { return p.third === k; }).map(function (p) { return p.speed; })); });
    const gT = r.guardThirds.map(function (g) { return g.n >= 20 ? g.good / g.n : null; });
    const gIdle = r.guardThirds.reduce(function (a, g) { return a + g.n; }, 0);
    const gGood = r.guardThirds.reduce(function (a, g) { return a + g.good; }, 0);
    return {
      round: r.round, theme: r.theme, material: r.material || {},
      visible: frac(r.visible, r.frames), frames: r.frames,
      punches: n, ppm: n / (dur / 60),
      speed: median(P.map(function (p) { return p.speed; })),
      speedLead: median(P.filter(function (p) { return p.hand === 'lead'; }).map(function (p) { return p.speed; })),
      speedRear: median(P.filter(function (p) { return p.hand === 'rear'; }).map(function (p) { return p.speed; })),
      speedThirds: thirdsSpeed,
      guard: gIdle >= 30 ? gGood / gIdle : null,
      guardLead: r.guard.lead.n >= 30 ? r.guard.lead.good / r.guard.lead.n : null,
      guardRear: r.guard.rear.n >= 30 ? r.guard.rear.good / r.guard.rear.n : null,
      guardThirds: gT,
      chinUp: r.chin.n >= 30 ? r.chin.up / r.chin.n : null,
      chinFloor: r.chin.n >= 30 ? r.chin.floor / r.chin.n : null,
      otherLow: n >= 4 ? count(P, 'otherLow') / n : null,
      windup: n >= 4 ? count(P, 'windup') / n : null,
      slowReturn: n >= 4 ? count(P, 'slowReturn') / n : null,
      lowReturn: n >= 4 ? count(P, 'lowReturn') / n : null,
      shortStraight: straights.length >= 4 ? count(straights, 'shortStraight') / straights.length : null,
      leanPunch: n >= 4 ? count(P, 'lean') / n : null,
      armOnly: rear.length >= 4 ? count(rear, 'armOnly') / rear.length : null,
      rearPunches: rear.length,
      flare: r.flare.n >= 30 ? r.flare.bad / r.flare.n : null,
      knees: r.knees.n >= 30 ? r.knees.locked / r.knees.n : null,
      feet: frac(r.feetFrames, r.frames),
      narrow: r.stance.n >= 30 ? r.stance.narrow / r.stance.n : null,
      wide: r.stance.n >= 30 ? r.stance.wide / r.stance.n : null,
      squared: r.stance.n >= 30 ? r.stance.squared / r.stance.n : null,
      handOrder: (r.match.matched + r.match.wrongHand) >= 4 ? r.match.matched / (r.match.matched + r.match.wrongHand) : null,
      typeOk: r.match.typeChecked >= 4 ? r.match.typeOk / r.match.typeChecked : null,
      byType: r.match.byType
    };
  }

  /** Puntuación 0-1 (más alto, mejor) de cada aspecto; null si no hay datos. */
  function scoresOf(m) {
    if (!m) return {};
    const avg = function (arr) { const v = arr.filter(function (x) { return x != null; }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; };
    return {
      guardia: m.guard == null ? null : 0.7 * m.guard + 0.3 * (1 - (m.otherLow || 0)),
      barbilla: m.chinUp == null ? null : 1 - m.chinUp - 0.5 * (m.chinFloor || 0),
      cadera: m.armOnly == null ? null : 1 - m.armOnly,
      recogida: avg([m.slowReturn == null ? null : 1 - m.slowReturn, m.lowReturn == null ? null : 1 - m.lowReturn]),
      tecnica: avg([m.windup == null ? null : 1 - m.windup, m.shortStraight == null ? null : 1 - m.shortStraight,
        m.leanPunch == null ? null : 1 - m.leanPunch, m.typeOk])
    };
  }

  // --------------------------------------------------------------- avisos
  function lastPunches(an, n, sec, now) {
    const lim = now - sec;
    return an.events.filter(function (e) { return e.tEnd >= lim; }).slice(-n);
  }

  /**
   * Avisos en directo. test(ctx) → true si toca avisar. ctx = {sum, an, now, coach, material}.
   * themes: temas en los que se dice (critical: siempre).
   */
  const CUES = [
    { id: 'visible', critical: true, text: 'No te veo entero: aléjate un poco y ponte de frente',
      test: function (c) { return c.sum.frames > 40 && c.sum.visible < 0.5; } },
    { id: 'other_hand', critical: true, themes: ['guardia', 'tecnica'], text: 'Al golpear, la otra mano se queda en la cara',
      test: function (c) { const p = lastPunches(c.an, 5, 12, c.now); return p.length >= 3 && count(p, 'otherLow') >= 2; } },
    { id: 'rear_low', critical: true, text: function (c) { return c.material.paper ? 'Mano de atrás pegada a la cara: que no caiga el papel' : 'Sube la mano de atrás'; },
      test: function (c) { return c.sum.rearLow > 0.4; } },
    { id: 'lead_low', critical: true, text: 'Sube la mano de delante',
      test: function (c) { return c.sum.leadLow > 0.5; } },
    { id: 'chin_up', themes: ['barbilla', 'guardia', 'tecnica'], text: function (c) { return c.material.ball ? 'Barbilla abajo: sujeta la pelota' : 'Barbilla abajo'; },
      test: function (c) { return c.sum.chinUp > 0.5; } },
    { id: 'floor', themes: ['barbilla', 'tecnica'], text: 'Mira al frente, no al suelo',
      test: function (c) { return c.sum.chinFloor > 0.6; } },
    { id: 'windup', themes: ['tecnica', 'velocidad'], text: 'No cargues el golpe: sale directo desde la guardia',
      test: function (c) { const p = lastPunches(c.an, 6, 15, c.now); return p.length >= 3 && count(p, 'windup') >= 2; } },
    { id: 'low_return', themes: ['recogida', 'tecnica', 'guardia'], text: 'Recoge por el mismo camino, no por abajo',
      test: function (c) { const p = lastPunches(c.an, 6, 15, c.now); return p.length >= 3 && count(p, 'lowReturn') >= 2; } },
    { id: 'slow_return', themes: ['recogida', 'velocidad'], text: 'Recoge más rápido',
      test: function (c) { const p = lastPunches(c.an, 6, 15, c.now); return p.length >= 4 && count(p, 'slowReturn') >= 3; } },
    { id: 'arm_only', themes: ['cadera', 'tecnica'], text: 'Gira la cadera en el golpe de atrás',
      test: function (c) {
        const p = lastPunches(c.an, 12, 20, c.now).filter(function (e) { return e.hand === 'rear' && (e.type === 'straight' || e.type === 'hook'); }).slice(-4);
        return p.length >= 3 && count(p, 'armOnly') >= 2;
      } },
    { id: 'short', themes: ['tecnica'], text: 'Estira el brazo en los rectos',
      test: function (c) {
        if (c.material.dumbbells) return false;
        const p = lastPunches(c.an, 12, 20, c.now).filter(function (e) { return e.type === 'straight'; }).slice(-6);
        return p.length >= 4 && count(p, 'shortStraight') >= 3;
      } },
    { id: 'lean', themes: ['tecnica', 'guardia'], text: 'No te inclines hacia delante: el peso, centrado',
      test: function (c) { if (c.sum.defensive) return false; const p = lastPunches(c.an, 6, 15, c.now); return c.sum.lean > 0.5 || (p.length >= 4 && count(p, 'lean') >= 3); } },
    { id: 'flare', themes: ['guardia'], withMaterial: ['elbow'], text: function (c) { return c.material.elbow ? 'Aprieta la toalla con el codo' : 'Codos cerrados, pegados al cuerpo'; },
      test: function (c) { return c.sum.flare > 0.5; } },
    { id: 'narrow', themes: ['tecnica'], withMaterial: ['tape', 'ankles'], text: function (c) { return c.material.tape ? 'Separa los pies: punta y talón junto a la línea' : 'Separa los pies: el ancho de los hombros'; },
      test: function (c) { return c.sum.feet > 0.5 && c.sum.narrow > 0.6; } },
    { id: 'wide', themes: ['tecnica'], withMaterial: ['tape', 'ankles'], text: function (c) { return c.material.ankles ? 'Junta un poco los pies: que no se tense la goma' : 'Junta un poco los pies'; },
      test: function (c) { return c.sum.feet > 0.5 && c.sum.wide > 0.6; } },
    { id: 'faster', themes: ['velocidad'], text: '¡Más rápido!',
      test: function (c) { const b = c.coach.baseSpeed(); return b > 0 && c.sum.punches.length >= 4 && c.sum.speed < b * 0.9; } },
    { id: 'volume', themes: ['velocidad', 'tecnica', 'guardia', 'barbilla', 'cadera', 'recogida'], text: 'No pares: sigue soltando la combinación',
      test: function (c) { return !c.sum.defensive && c.roundElapsed > 12 && c.sum.visible > 0.8 && c.sum.punches10 < 2; } }
  ];

  const POSITIVES = {
    guardia: { text: '¡Bien! Guardia arriba', test: function (c) { return c.sum.guardGood > 0.85; } },
    barbilla: { text: 'Barbilla perfecta, sigue así', test: function (c) { return c.sum.chinUp < 0.1 && c.sum.chinGood > 0.6; } },
    velocidad: { text: '¡Eso es, rápido!', test: function (c) { const b = c.coach.baseSpeed(); return b > 0 && c.sum.punches.length >= 4 && c.sum.speed > b * 1.05; } },
    cadera: { text: '¡Buena cadera!', test: function (c) {
      const p = lastPunches(c.an, 12, 20, c.now).filter(function (e) { return e.hand === 'rear' && (e.type === 'straight' || e.type === 'hook'); }).slice(-4);
      return p.length >= 3 && count(p, 'armOnly') === 0;
    } },
    recogida: { text: 'Bien, recoges rápido', test: function (c) { const p = lastPunches(c.an, 6, 15, c.now); return p.length >= 4 && count(p, 'slowReturn') + count(p, 'lowReturn') === 0; } },
    tecnica: { text: 'Técnica limpia, sigue así', test: function (c) {
      const p = lastPunches(c.an, 6, 15, c.now);
      return p.length >= 4 && p.every(function (e) { return !e.windup && !e.lowReturn && !e.otherLow && !e.armOnly && !e.shortStraight; });
    } }
  };

  // --------------------------------------------------------------- Coach
  /**
   * @param {{analyzer, say?: (text) => void, show?: (text, kind) => void,
   *          onFault?: (id: string, info: {t0, t1, hand, side}) => void}} opts
   */
  function Coach(opts) {
    const o = opts || {};
    this.an = o.analyzer;
    this.say = typeof o.say === 'function' ? o.say : function () {};
    this.show = typeof o.show === 'function' ? o.show : function () {};
    this.onFault = typeof o.onFault === 'function' ? o.onFault : null;
    this.theme = null;
    this.material = {};
    this.prevTheme = null;
    this.velocityDone = false;
    this.lastEval = -1e9;
    this.roundStart = null;
    this.serieStart = null;     // inicio de la serie en curso (null: la ronda entera es una serie)
    this.serieSpoken = false;   // ¿ya hubo comentario en esta serie?
    this.lastSpoken = -1e9;     // último comentario (s)
    this.combosSince = 1e9;     // combinaciones desde el último comentario
    this.saidInRound = {};      // correcciones dichas en la ronda
    this.toCheck = null;        // última corrección dicha: se felicita si desaparece
    this.faultSeen = {};        // errores enviados a onFault en la ronda
    this.metrics = [];          // métricas de las rondas cerradas
  }

  /** Velocidad de referencia: mediana de las rondas sin mancuernas ya hechas (o de esta ronda). */
  Coach.prototype.baseSpeed = function () {
    const prev = this.metrics.filter(function (m) { return !m.material.dumbbells && m.punches >= 6; }).map(function (m) { return m.speed; });
    if (prev.length) return median(prev);
    const cur = this.an && this.an.cur ? this.an.cur.punches : [];
    return cur.length >= 6 ? median(cur.map(function (p) { return p.speed; })) : 0;
  };

  /** Tema de la ronda. */
  Coach.prototype.chooseTheme = function (round, material) {
    const m = material || {};
    if (round <= 1) return 'tecnica';
    if (!this.velocityDone && !m.dumbbells) return 'velocidad';
    // Aspecto con peor puntuación (media de las rondas hechas)
    const acc = {};
    this.metrics.forEach(function (mm) {
      const s = scoresOf(mm);
      Object.keys(s).forEach(function (k) { if (s[k] != null) (acc[k] = acc[k] || []).push(s[k]); });
    });
    const self = this;
    let cands = ADAPTIVE.filter(function (k) {
      if ((m.paper || m.elbow) && k === 'cadera') return false;
      if (m.ball && k === 'barbilla') return false;
      return true;
    });
    const score = function (k) { const a = acc[k]; return a && a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0.75; };
    cands.sort(function (a, b) { return score(a) - score(b); });
    // No repetir el tema de la ronda anterior (self.theme) si hay otro casi igual de flojo.
    if (cands.length > 1 && cands[0] === self.theme && score(cands[1]) - score(cands[0]) < 0.1) cands = cands.slice(1);
    return cands[0] || 'tecnica';
  };

  /**
   * Empieza una ronda: elige el tema y lo anuncia.
   * @returns {{theme: string, name: string, text: string}}
   */
  Coach.prototype.startRound = function (info, now) {
    const i = info || {};
    this.material = i.material || {};
    const theme = this.chooseTheme(i.round || 1, this.material);
    if (theme === 'velocidad') this.velocityDone = true;
    this.prevTheme = this.theme;
    this.theme = theme;
    this.roundStart = now != null ? now : null;
    this.serieStart = null;
    this.serieSpoken = false;
    this.saidInRound = {};
    this.faultSeen = {};
    this.toCheck = null;
    const T = THEMES[theme];
    // Una sola frase de material (la más importante), para no alargar el anuncio.
    const mt = this.material;
    let extra = '';
    if (mt.rope) extra = ' Con la cuerda: baja con las piernas y las manos en la cara.';
    else if (mt.hangball) extra = ' Pelota colgada: tócala, esquívala y gira a su alrededor.';
    else if (mt.dumbbells) extra = ' Con mancuernas: controla el golpe y no bloquees el codo.';
    else if (mt.elbow) extra = ' Toalla bajo el codo: que no se caiga.';
    else if (mt.ankles) extra = ' Goma en los tobillos: los pies, a la anchura de los hombros.';
    else if (mt.tape) extra = ' Pies junto a la línea del suelo.';
    const text = 'Ronda ' + (i.round || 1) + ': ' + T.name.toLowerCase() + '. ' + T.intro.charAt(0).toUpperCase() + T.intro.slice(1) + '.' + extra;
    // El anuncio del tema no gasta el cupo de la serie, pero cuenta para la separación.
    if (now != null) this.lastSpoken = now;
    this.combosSince = 0;
    this.say(text);
    this.show(T.name.toUpperCase() + ' · ' + T.intro, 'theme');
    return { theme: theme, name: T.name, text: text };
  };

  /** Empieza una serie (intervalo) de la ronda: vuelve a haber cupo para un comentario. */
  Coach.prototype.startSerie = function (now) {
    this.serieStart = now;
    this.serieSpoken = false;
  };

  /** Se ha mostrado una combinación nueva. */
  Coach.prototype.onCombo = function () {
    if (this.combosSince < 1e9) this.combosSince++;
  };

  /** ¿Hay cupo para un comentario ahora? */
  Coach.prototype.canSpeak = function (now, settle) {
    if (this.serieSpoken) return false;
    const from = this.serieStart != null ? this.serieStart : this.roundStart;
    if (from != null && now - from < settle) return false;
    return this.combosSince >= MIN_COMBOS || now - this.lastSpoken >= MIN_GAP;
  };

  Coach.prototype._speak = function (now, id, text, kind) {
    this.serieSpoken = true;
    this.lastSpoken = now;
    this.combosSince = 0;
    this.say(text);
    this.show(text, kind);
    return { id: id, text: text, kind: kind };
  };

  /** Ventana de tiempo en la que se ve el error (el golpe concreto o los últimos segundos). */
  function faultWindow(c, q) {
    const flag = PUNCH_FLAG[q.id];
    if (flag) {
      const p = lastPunches(c.an, 12, 20, c.now).filter(function (e) { return e[flag]; });
      const ev = p[p.length - 1];
      if (ev) {
        const end = ev.tEnd != null ? ev.tEnd : ev.t0 + 0.4;
        return { t0: ev.t0 - 0.8, t1: end + 0.5, at: ev.t0, peak: ev.t0 + (ev.outT || 0.15), end: end, hand: ev.hand, side: ev.side || null };
      }
    }
    return { t0: c.now - 2, t1: c.now + 0.5, at: null, peak: null, end: null, hand: null, side: null };
  }

  /** ¿Hay datos para decir que algo va bien? (te ve y, si es de golpes, has golpeado) */
  function enoughData(c, id) {
    if (!(c.sum.visible > 0.8)) return false;
    if (PUNCH_FLAG[id] || id === 'faster' || id === 'volume') return lastPunches(c.an, 6, 15, c.now).length >= 3;
    return true;
  }

  /**
   * Revisa la situación (llamar en cada fotograma de boxeo; evalúa cada 0,5 s).
   * @returns {object|null} el comentario dicho
   */
  Coach.prototype.update = function (now) {
    if (!this.an || now - this.lastEval < 0.5) return null;
    this.lastEval = now;
    if (this.roundStart == null) this.roundStart = now;
    const elapsed = now - this.roundStart;
    if (elapsed < 4) return null; // deja colocarse
    const c = { sum: this.an.recentSummary(4, now), an: this.an, now: now, coach: this, material: this.material, roundElapsed: elapsed };
    const theme = this.theme;
    const mat = this.material || {};
    const hits = [];
    for (let i = 0; i < CUES.length; i++) {
      const q = CUES[i];
      let hit = false;
      try { hit = q.test(c); } catch (e) { hit = false; }
      if (!hit) continue;
      // Para el clip del fallo: cada error una vez por ronda, aunque no se diga.
      if (this.onFault && q.id !== 'visible' && q.id !== 'volume' && q.id !== 'faster' && !this.faultSeen[q.id]) {
        this.faultSeen[q.id] = true;
        const w = faultWindow(c, q);
        const self = this;
        try { self.onFault(q.id, w); } catch (e) { /* noop */ }
      }
      const inTheme = q.critical || (q.themes && q.themes.indexOf(theme) !== -1) ||
        (q.withMaterial && q.withMaterial.some(function (k) { return !!mat[k]; }));
      if (inTheme) hits.push(q);
    }
    if (!this.canSpeak(now, SERIE_SETTLE)) return null;

    // Corrección: la primera (por prioridad) que no se haya dicho ya en esta ronda.
    const self = this;
    const fresh = hits.filter(function (q) { return !self.saidInRound[familyOf(q.id)]; });
    if (fresh.length) {
      const q = fresh[0];
      const text = typeof q.text === 'function' ? q.text(c) : q.text;
      this.saidInRound[familyOf(q.id)] = true;
      if (FIXED[q.id]) this.toCheck = { id: q.id, t: now, q: q };
      return this._speak(now, q.id, text, 'fault');
    }
    if (hits.length) return null; // los errores que siguen ya se dijeron: mejor callar que repetir

    // Felicitación (mismo cupo, con algo más de serie para tener datos).
    if (!this.canSpeak(now, PRAISE_SETTLE)) return null;
    // 1) Has corregido lo último que se te dijo
    const chk = this.toCheck;
    if (chk && now - chk.t >= 6 && enoughData(c, chk.id)) {
      this.toCheck = null;
      return this._speak(now, 'fixed_' + chk.id, FIXED[chk.id], 'good');
    }
    // 2) El tema de la ronda va bien
    const pos = POSITIVES[theme];
    let ok = false;
    if (pos && elapsed > 12) { try { ok = pos.test(c); } catch (e) { ok = false; } }
    if (ok) return this._speak(now, 'positive', pos.text, 'good');
    // 3) Los últimos golpes, limpios
    const p = lastPunches(this.an, 5, 12, now);
    if (c.sum.visible > 0.8 && p.length >= 4 && p.every(function (e) { return !e.windup && !e.lowReturn && !e.otherLow && !e.armOnly && !e.shortStraight && !e.lean && !e.slowReturn; })) {
      return this._speak(now, 'clean', CLEAN_TEXT, 'good');
    }
    return null;
  };

  /** Cierra la ronda y devuelve su resumen para el descanso. */
  Coach.prototype.endRound = function (stats) {
    const m = metricsOf(stats);
    if (!m) return null;
    m.theme = this.theme;
    this.metrics.push(m);
    return roundSummary(m);
  };

  function roundSummary(m) {
    const T = THEMES[m.theme] || { name: '' };
    const facts = [];
    if (m.punches) facts.push(m.punches + ' golpes');
    if (m.speed) facts.push('≈ ' + ms(m.speed));
    if (m.guard != null) facts.push('guardia ' + pct(m.guard));
    if (m.chinUp != null) facts.push('barbilla arriba ' + pct(m.chinUp));
    const fb = feedbackOf([m]);
    return {
      round: m.round, theme: m.theme, themeName: T.name,
      facts: facts,
      good: fb.good[0] ? fb.good[0].title : null,
      fix: fb.improve[0] ? fb.improve[0].title : null,
      lowData: m.visible < 0.5 || m.frames < 60
    };
  }

  // ------------------------------------------------------------- informe
  function wavg(list, key, weightKey) {
    let s = 0, w = 0;
    list.forEach(function (m) { if (m[key] != null) { const k = weightKey ? (m[weightKey] || 0) : 1; s += m[key] * k; w += k; } });
    return w ? s / w : null;
  }

  /**
   * Qué haces bien y qué mejorar, a partir de las métricas de una o varias rondas.
   * Cada punto: {area, title, text, tip}. Ordenados por gravedad.
   */
  function feedbackOf(list) {
    const good = [], improve = [];
    const ms_ = list.filter(function (m) { return m && m.frames > 0; });
    if (!ms_.length) return { good: good, improve: improve };
    const guard = wavg(ms_, 'guard', 'frames');
    const otherLow = wavg(ms_, 'otherLow', 'punches');
    const chinUp = wavg(ms_, 'chinUp', 'frames');
    const floor = wavg(ms_, 'chinFloor', 'frames');
    const windup = wavg(ms_, 'windup', 'punches');
    const slow = wavg(ms_, 'slowReturn', 'punches');
    const low = wavg(ms_, 'lowReturn', 'punches');
    const shortS = wavg(ms_, 'shortStraight', 'punches');
    const lean = wavg(ms_, 'leanPunch', 'punches');
    const arm = wavg(ms_, 'armOnly', 'rearPunches');
    const flare = wavg(ms_, 'flare', 'frames');
    const knees = wavg(ms_, 'knees', 'frames');
    const narrow = wavg(ms_, 'narrow', 'frames');
    const wide = wavg(ms_, 'wide', 'frames');
    const squared = wavg(ms_, 'squared', 'frames');
    const typeOk = wavg(ms_, 'typeOk', 'punches');
    const order = wavg(ms_, 'handOrder', 'punches');
    const add = function (arr, sev, area, title, text, tip) { arr.push({ sev: sev, area: area, title: title, text: text, tip: tip || '' }); };

    // Guardia
    if (guard != null) {
      if (guard >= 0.8) add(good, guard, 'guardia', 'Guardia alta', 'Entre golpe y golpe tuviste las dos manos arriba el ' + pct(guard) + ' del tiempo.');
      else if (guard < 0.65) add(improve, 1 - guard, 'guardia', 'Bajas la guardia', 'Las dos manos estuvieron arriba solo el ' + pct(guard) + ' del tiempo entre golpes.',
        'Guantes a la altura de los pómulos y codos cerrados al volver de cada golpe. Bajar las manos es el error más repetido, sobre todo con cansancio.');
    }
    if (otherLow != null) {
      if (otherLow > 0.25) add(improve, otherLow + 0.2, 'guardia', 'La otra mano baja al golpear', 'En el ' + pct(otherLow) + ' de los golpes, la mano que no golpeaba se separó de la cara (por ejemplo, la de atrás en el 1 o en el 1-3).',
        'La mano que no golpea se queda pegada a la mejilla. El papel entre el guante y la mejilla sirve justo para esto.');
      else if (otherLow < 0.1) add(good, 1 - otherLow, 'guardia', 'La mano libre protege', 'Al golpear, la otra mano se quedó en la cara en casi todos los golpes.');
    }
    // Cansancio: guardia por tercios
    const first = wavg(ms_.map(function (m) { return { g: m.guardThirds[0], f: m.frames }; }), 'g', 'f');
    const last = wavg(ms_.map(function (m) { return { g: m.guardThirds[2], f: m.frames }; }), 'g', 'f');
    if (first != null && last != null && first - last > 0.15) {
      add(improve, first - last, 'guardia', 'La guardia cae al final de las rondas', 'Del ' + pct(first) + ' al principio de la ronda al ' + pct(last) + ' al final.',
        'Con cansancio las manos bajan: en el último minuto, menos golpes y más guardia, o rondas un poco más cortas.');
    }
    // Barbilla
    if (chinUp != null) {
      if (chinUp > 0.3) add(improve, chinUp, 'barbilla', 'Levantas la barbilla', 'La barbilla estuvo levantada el ' + pct(chinUp) + ' del tiempo.',
        'Barbilla recogida, detrás del hombro adelantado, mirando al frente. La pelota bajo la barbilla te avisa si la levantas.');
      else if (chinUp < 0.1) add(good, 1 - chinUp, 'barbilla', 'Barbilla recogida', 'Casi nunca levantaste la barbilla.');
    }
    if (floor != null && floor > 0.3) add(improve, floor * 0.8, 'barbilla', 'Miras al suelo', 'El ' + pct(floor) + ' del tiempo tenías la cabeza muy agachada.',
      'Barbilla abajo no es mirar al suelo: los ojos, al frente, a la altura del rival.');
    // Recogida
    if (low != null && low > 0.25) add(improve, low, 'recogida', 'Recoges por abajo', 'En el ' + pct(low) + ' de los golpes la mano volvió más baja de lo que salió.',
      'El puño vuelve por el mismo camino por el que salió, directo a la cara. Volver bajo deja hueco para el contragolpe.');
    if (slow != null && slow > 0.3) add(improve, slow, 'recogida', 'Recoges despacio', 'En el ' + pct(slow) + ' de los golpes la vuelta fue mucho más lenta que la ida.',
      'Recoge a la misma velocidad a la que sueltas: el golpe termina cuando la mano está otra vez en la guardia.');
    if (low != null && slow != null && low < 0.1 && slow < 0.15) add(good, 1 - (low + slow) / 2, 'recogida', 'Buena recogida', 'Las manos vuelven rápido y por el mismo camino.');
    // Técnica
    if (windup != null) {
      if (windup > 0.25) add(improve, windup, 'tecnica', 'Cargas el golpe antes de soltarlo', 'En el ' + pct(windup) + ' de los golpes la mano fue hacia atrás o hacia abajo justo antes de salir.',
        'Así se ve venir. El golpe sale directo desde la guardia; en el gancho, el codo no se echa atrás.');
      else if (windup < 0.1) add(good, 1 - windup, 'tecnica', 'Golpes sin avisar', 'Los golpes salen directos desde la guardia, sin cargarlos.');
    }
    if (shortS != null && shortS > 0.35) add(improve, shortS * 0.8, 'tecnica', 'Rectos cortos', 'En el ' + pct(shortS) + ' de los rectos el brazo no llegó a estirarse.',
      'En los rectos, estira el brazo casi entero y gira el puño al final, sin bloquear el codo de golpe (con mancuernas, aún menos).');
    if (lean != null && lean > 0.3) add(improve, lean * 0.8, 'tecnica', 'Te inclinas al golpear', 'En el ' + pct(lean) + ' de los golpes el tronco fue demasiado hacia delante.',
      'La cabeza no pasa por delante de la rodilla adelantada: el peso, centrado, para no perder el equilibrio.');
    if (typeOk != null) {
      if (typeOk < 0.6) {
        const conf = [];
        ms_.forEach(function (m) {
          Object.keys(m.byType || {}).forEach(function (k) {
            const b = m.byType[k];
            Object.keys(b.as).forEach(function (as) { conf.push([k, as, b.as[as]]); });
          });
        });
        conf.sort(function (a, b) { return b[2] - a[2]; });
        const NAMES = { straight: 'rectos', hook: 'ganchos', upper: 'uppercuts' };
        const c = conf[0];
        add(improve, (1 - typeOk) * 0.7, 'tecnica', 'Golpes que no se parecen a los pedidos',
          'Solo el ' + pct(typeOk) + ' de los golpes tuvo la forma esperada' + (c ? ' (sobre todo, ' + NAMES[c[0]] + ' que salieron como ' + NAMES[c[1]] + ')' : '') + '.',
          'Gancho: codo a la altura del puño y en ángulo de unos 90°. Uppercut: de abajo arriba con las piernas. Recto: en línea recta.');
      } else if (typeOk > 0.8) add(good, typeOk, 'tecnica', 'Cada golpe con su forma', 'Los rectos, ganchos y uppercuts tuvieron la forma esperada.');
    }
    if (order != null && order < 0.6) add(improve, (1 - order) * 0.5, 'tecnica', 'Orden de manos distinto', 'Solo el ' + pct(order) + ' de los golpes siguió el orden de manos de la combinación.',
      'Antes de acelerar, haz la combinación despacio y con el orden exacto.');
    // Cadera
    if (arm != null) {
      if (arm > 0.4) add(improve, arm, 'cadera', 'Golpeas solo con el brazo', 'En el ' + pct(arm) + ' de los golpes de la mano atrasada casi no giraron la cadera ni los hombros.',
        'En el directo y el gancho de atrás, el pie atrasado pivota y la cadera y el hombro giran con el golpe: de ahí sale la fuerza.');
      else if (arm < 0.15) add(good, 1 - arm, 'cadera', 'Giras la cadera', 'Los golpes de la mano atrasada llevan el giro de cadera y hombros.');
    }
    // Base
    if (flare != null && flare > 0.35) add(improve, flare * 0.6, 'guardia', 'Codos abiertos', 'El ' + pct(flare) + ' del tiempo los codos estaban separados del cuerpo.',
      'Codos cerrados protegen las costillas y ayudan a mantener las manos arriba.');
    if (knees != null && knees > 0.5) add(improve, knees * 0.5, 'base', 'Rodillas rectas', 'El ' + pct(knees) + ' del tiempo tenías las rodillas bloqueadas.',
      'Rodillas un poco flexionadas: con las piernas rectas eres más lento y pierdes el equilibrio con facilidad.');
    if (squared != null && squared > 0.6) add(improve, squared * 0.5, 'base', 'Estás de frente («cuadrado»)', 'Casi siempre tenías los pies en línea, sin uno adelantado.',
      'Un pie adelantado y el cuerpo algo de perfil: ofreces menos blanco y los rectos salen mejor.');
    if (narrow != null && narrow > 0.5) add(improve, narrow * 0.4, 'base', 'Base estrecha', 'Los pies estaban muy juntos la mayor parte del tiempo.', 'Separa los pies más o menos el ancho de los hombros.');
    if (wide != null && wide > 0.5) add(improve, wide * 0.4, 'base', 'Base muy abierta', 'Los pies estaban muy separados la mayor parte del tiempo.', 'Con la base muy abierta te cuesta moverte: acércalos un poco.');

    good.sort(function (a, b) { return b.sev - a.sev; });
    improve.sort(function (a, b) { return b.sev - a.sev; });
    improve.forEach(function (x) {
      const l = REPORT_LINKS[x.title] || {};
      x.clips = (l.clips || []).slice();   // errores cuyo clip ilustra este punto (en orden de preferencia)
      x.video = l.video || null;           // clave de SB.data.videos
    });
    return { good: good, improve: improve };
  }

  /** Clip y vídeo de YouTube de cada punto a mejorar del informe. */
  const REPORT_LINKS = {
    'Bajas la guardia': { clips: ['rear_low', 'lead_low', 'other_hand'], video: 'guardia' },
    'La otra mano baja al golpear': { clips: ['other_hand', 'rear_low', 'lead_low'], video: 'guardia' },
    'La guardia cae al final de las rondas': { clips: ['rear_low', 'lead_low'], video: 'guardia' },
    'Levantas la barbilla': { clips: ['chin_up'], video: 'barbilla' },
    'Miras al suelo': { clips: ['floor'], video: 'barbilla' },
    'Recoges por abajo': { clips: ['low_return'], video: 'recogida' },
    'Recoges despacio': { clips: ['slow_return'], video: 'recogida' },
    'Cargas el golpe antes de soltarlo': { clips: ['windup'], video: 'cargar' },
    'Rectos cortos': { clips: ['short'], video: 'rectos' },
    'Te inclinas al golpear': { clips: ['lean'], video: 'equilibrio' },
    'Golpes que no se parecen a los pedidos': { clips: [], video: 'tecnica' },
    'Golpeas solo con el brazo': { clips: ['arm_only'], video: 'cadera' },
    'Codos abiertos': { clips: ['flare'], video: 'codos' },
    'Rodillas rectas': { clips: [], video: 'base' },
    'Estás de frente («cuadrado»)': { clips: [], video: 'base' },
    'Base estrecha': { clips: ['narrow'], video: 'base' },
    'Base muy abierta': { clips: ['wide'], video: 'base' }
  };

  /**
   * Informe final de la sesión.
   * @returns {{rounds, good, improve, compare: string[], notes: string[]}|null}
   */
  Coach.prototype.report = function () {
    const ms_ = this.metrics.filter(function (m) { return m.frames > 0; });
    if (!ms_.length) return null;
    const fb = feedbackOf(ms_);
    const compare = [];
    const notes = [];
    // Velocidad
    const free = ms_.filter(function (m) { return !m.material.dumbbells && m.speed; });
    const heavy = ms_.filter(function (m) { return m.material.dumbbells && m.speed; });
    const allP = ms_.reduce(function (a, m) { return a + m.punches; }, 0);
    const totalMin = ms_.reduce(function (a, m) { return a + (m.punches && m.ppm ? m.punches / m.ppm : 0); }, 0);
    if (allP) compare.push('Golpes: ' + allP + (totalMin > 0 ? ' (≈ ' + Math.round(allP / totalMin) + ' por minuto de ronda)' : '') + '.');
    if (free.length) {
      const sp = median(free.map(function (m) { return m.speed; }));
      const lead = median(free.map(function (m) { return m.speedLead; }).filter(Boolean));
      const rear = median(free.map(function (m) { return m.speedRear; }).filter(Boolean));
      compare.push('Velocidad de la mano (aprox., sin mancuernas): ' + ms(sp) + (lead && rear ? ' · adelantada ' + ms(lead) + ' · atrasada ' + ms(rear) : '') + '.');
      const t0 = median(free.map(function (m) { return m.speedThirds[0]; }).filter(Boolean));
      const t2 = median(free.map(function (m) { return m.speedThirds[2]; }).filter(Boolean));
      if (t0 && t2 && t2 < t0 * 0.9) compare.push('Al final de las rondas tus golpes son un ' + Math.round((1 - t2 / t0) * 100) + ' % más lentos que al principio (cansancio).');
    }
    if (free.length && heavy.length) {
      const a = median(free.map(function (m) { return m.speed; })), b = median(heavy.map(function (m) { return m.speed; }));
      if (a && b) compare.push('Con mancuernas: ' + ms(b) + ' frente a ' + ms(a) + ' sin ellas (' + Math.round((1 - b / a) * 100) + ' % más lento: normal con peso).');
    }
    // Pelota: barbilla con y sin
    const withBall = ms_.filter(function (m) { return m.material.ball && m.chinUp != null; });
    const noBall = ms_.filter(function (m) { return !m.material.ball && m.chinUp != null; });
    if (withBall.length && noBall.length) {
      const a = median(withBall.map(function (m) { return m.chinUp; })), b = median(noBall.map(function (m) { return m.chinUp; }));
      compare.push('Barbilla levantada: ' + pct(a) + ' del tiempo con pelota y ' + pct(b) + ' sin ella.' + (b > a + 0.1 ? ' Sin la pelota todavía se te escapa.' : ''));
    }
    const withPaper = ms_.filter(function (m) { return m.material.paper && m.guardRear != null; });
    if (withPaper.length) compare.push('Rondas con papel: la mano de atrás estuvo en la cara el ' + pct(median(withPaper.map(function (m) { return m.guardRear; }))) + ' del tiempo.');
    // Toalla: codos cerrados con y sin ella
    const withTowel = ms_.filter(function (m) { return m.material.elbow && m.flare != null; });
    const noTowel = ms_.filter(function (m) { return !m.material.elbow && m.flare != null; });
    if (withTowel.length && noTowel.length) {
      const a = median(withTowel.map(function (m) { return m.flare; })), b = median(noTowel.map(function (m) { return m.flare; }));
      compare.push('Codos abiertos: ' + pct(a) + ' del tiempo con la toalla y ' + pct(b) + ' sin ella.' + (b > a + 0.1 ? ' Sin la toalla todavía los abres.' : ''));
    }
    // Cinta y goma: base correcta con y sin ellas
    const baseOk = function (m) { return (m.narrow != null && m.wide != null) ? 1 - m.narrow - m.wide : null; };
    const withFeet = ms_.filter(function (m) { return (m.material.tape || m.material.ankles) && baseOk(m) != null; });
    const noFeet = ms_.filter(function (m) { return !m.material.tape && !m.material.ankles && baseOk(m) != null; });
    if (withFeet.length && noFeet.length) {
      compare.push('Pies a buena distancia: ' + pct(median(withFeet.map(baseOk))) + ' del tiempo con la cinta o la goma y ' + pct(median(noFeet.map(baseOk))) + ' sin ellas.');
    }
    // Cuerda: guardia mientras esquivas
    const withRope = ms_.filter(function (m) { return m.material.rope && m.guard != null; });
    if (withRope.length) compare.push('Rondas con la cuerda: guardia arriba el ' + pct(median(withRope.map(function (m) { return m.guard; }))) + ' del tiempo (las esquivas no se miden, solo la guardia).');
    const vis = median(ms_.map(function (m) { return m.visible; }));
    if (vis < 0.7) notes.push('La cámara no te vio entero buena parte del tiempo (' + pct(vis) + ' de los fotogramas útiles): el análisis es menos fiable.');
    notes.push('Medidas aproximadas con una sola cámara. La velocidad es la de la muñeca, sirve para comparar tus rondas entre sí, no con otras personas.');
    return {
      rounds: ms_.map(function (m) {
        const items = SB.ui && SB.ui.materialItems ? SB.ui.materialItems(m.material) : [];
        return {
          round: m.round, theme: (THEMES[m.theme] || {}).name || '', material: items.map(function (x) { return x.short; }).join(', '),
          punches: m.punches, speed: m.speed ? ms(m.speed) : '—', guard: m.guard != null ? pct(m.guard) : '—', chin: m.chinUp != null ? pct(1 - m.chinUp) : '—'
        };
      }),
      good: fb.good.slice(0, 5), improve: fb.improve.slice(0, 6), compare: compare, notes: notes
    };
  };

  SB.vision = SB.vision || {};
  SB.vision.Coach = Coach;
  SB.vision.coachUtil = { THEMES: THEMES, CUES: CUES, metricsOf: metricsOf, scoresOf: scoresOf, feedbackOf: feedbackOf, roundSummary: roundSummary };
})(window.SB = window.SB || {});
