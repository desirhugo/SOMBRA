/**
 * SOMBRA · js/engine/suggestions.js
 * ---------------------------------------------------------------------------
 * Sugerencias de sesión para la pantalla de inicio (§6.4):
 *  - Solo objetivos disponibles con la biblioteca personal.
 *  - Prioriza los objetivos que hace más tiempo que no se entrenan
 *    (los nunca entrenados primero); desempate estable por día (semilla).
 *  - Nivel: el último usado (ajustes); duración: la habitual y variantes 20/30/45.
 *  - Cada sugerencia explica sus motivos en español.
 */
(function (SB) {
  'use strict';

  const DURATIONS = [20, 30, 45];

  function practiceCount(goal) {
    const cats = (goal.requires && Array.isArray(goal.requires.categories)) ? goal.requires.categories : [];
    return SB.library.personal().filter(function (m) {
      return m.status === 'practica' && (!cats.length || cats.indexOf(m.category) !== -1);
    }).length;
  }

  /**
   * @param {{count?: number, seed?: number|string, now?: Date}} [opts]
   * @returns {{goalId, durationMin, level, title, reasons: string[]}[]}
   */
  function list(opts) {
    const o = opts || {};
    const count = o.count != null ? Math.max(0, o.count) : 4;
    const settings = SB.storage.getSettings();
    const level = settings.lastLevel === 'avanzado' ? 'avanzado' : 'basico';
    const habitual = Number(settings.lastDuration) || 30;
    const now = o.now ? new Date(o.now).getTime() : Date.now();
    const rng = SB.util.rng(o.seed != null ? o.seed : SB.util.dayKey(new Date(now)));
    const goals = SB.session.availableGoals(level).filter(function (x) { return x.available; }).map(function (x) { return x.goal; });
    const ranked = goals.map(function (g) {
      const last = SB.history.lastGoalDate(g.id);
      const t = last ? Date.parse(last) : NaN;
      return { g: g, days: isFinite(t) ? (now - t) / 86400000 : Infinity, tie: rng.next() };
    }).sort(function (a, b) {
      if (a.days !== b.days) return b.days - a.days;
      return a.tie - b.tie;
    });
    const alt = DURATIONS.filter(function (d) { return d !== habitual; });
    return ranked.slice(0, count).map(function (x, i) {
      const durationMin = i === 0 || !alt.length ? habitual : alt[(i - 1) % alt.length];
      const reasons = [];
      if (x.days === Infinity) reasons.push('Aún no has entrenado este objetivo');
      else if (x.days < 1) reasons.push('Lo entrenaste hoy');
      else if (x.days < 2) reasons.push('Lo entrenaste ayer');
      else reasons.push('Hace ' + Math.floor(x.days) + ' días que no lo entrenas');
      const pc = practiceCount(x.g);
      if (pc > 0) reasons.push(pc === 1 ? 'Tienes 1 técnica en práctica' : 'Tienes ' + pc + ' técnicas en práctica');
      if (durationMin === habitual) reasons.push('Tu duración habitual');
      if (settings.lastGoal === x.g.id) reasons.push('Tu último objetivo elegido');
      return {
        goalId: x.g.id,
        durationMin: durationMin,
        level: level,
        title: (x.g.name || x.g.short || x.g.id) + ' · ' + durationMin + ' min',
        reasons: reasons
      };
    });
  }

  SB.suggestions = { list: list };
})(window.SB = window.SB || {});
