/**
 * SOMBRA · js/calendar/calendar.js
 * ---------------------------------------------------------------------------
 * Calendario de días entrenados y rachas (§7, §7.3). Sin estadísticas deportivas.
 *
 * Persistencia: SB.storage('calendar') = { days: ['YYYY-MM-DD', ...] } (ordenado, sin duplicados).
 *  - La UI marca el día al terminar una sesión o al salir con ≥ 5 min de trabajo activo;
 *    el usuario puede marcar / desmarcar a mano (la confirmación es cosa de la UI).
 *  - Semanas de lunes a domingo.
 *  - Racha actual: días consecutivos que terminan hoy, o ayer si hoy aún no hay marca.
 */
(function (SB) {
  'use strict';

  const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

  function load() {
    const c = SB.storage.get('calendar', null);
    const days = c && Array.isArray(c.days) ? c.days : (Array.isArray(c) ? c : []);
    return days.filter(function (k) { return KEY_RE.test(k); });
  }

  function save(days) {
    const uniq = Array.from(new Set(days)).sort();
    SB.storage.set('calendar', { days: uniq });
    return uniq;
  }

  function norm(key) {
    if (key == null) return SB.util.dayKey();
    return SB.util.dayKey(key);
  }

  /** Marca un día (hoy por defecto). Devuelve la dayKey marcada. */
  function mark(dayKey) {
    const k = norm(dayKey);
    const days = load();
    if (days.indexOf(k) === -1) { days.push(k); save(days); }
    return k;
  }

  // CONTRATO: añadido. Desmarca un día.
  function unmark(dayKey) {
    const k = norm(dayKey);
    const days = load();
    const i = days.indexOf(k);
    if (i !== -1) { days.splice(i, 1); save(days); }
    return k;
  }

  /** Alterna la marca de un día. Devuelve el nuevo estado (true = marcado). */
  function toggle(dayKey) {
    const k = norm(dayKey);
    if (isMarked(k)) { unmark(k); return false; }
    mark(k);
    return true;
  }

  /** ¿Está marcado el día? */
  function isMarked(dayKey) { return load().indexOf(norm(dayKey)) !== -1; }

  /** Días marcados, ordenados. */
  function days() { return load().slice().sort(); }

  /**
   * Cuadrícula del mes con semanas de lunes a domingo.
   * CONTRATO: tercer parámetro opcional `todayKey` (pruebas).
   * @returns {{key, day, inMonth, marked, isToday}[][]}
   */
  function monthGrid(year, monthIndex0, todayKey) {
    const today = todayKey ? norm(todayKey) : SB.util.dayKey();
    const marked = new Set(load());
    const first = new Date(year, monthIndex0, 1, 12);
    const offset = (first.getDay() + 6) % 7; // lunes = 0
    const start = new Date(year, monthIndex0, 1 - offset, 12);
    const lastDay = new Date(year, monthIndex0 + 1, 0, 12);
    const weeks = [];
    const cur = new Date(start.getTime());
    while (true) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const key = SB.util.dayKey(cur);
        week.push({
          key: key,
          day: cur.getDate(),
          inMonth: cur.getMonth() === first.getMonth() && cur.getFullYear() === first.getFullYear(),
          marked: marked.has(key),
          isToday: key === today
        });
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(week);
      if (cur > lastDay) break;
    }
    return weeks;
  }

  /** Racha actual (termina hoy, o ayer si hoy no está marcado). */
  function currentStreak(todayKey) {
    const today = norm(todayKey);
    const set = new Set(load());
    let k = set.has(today) ? today : SB.util.addDays(today, -1);
    let n = 0;
    while (set.has(k)) { n++; k = SB.util.addDays(k, -1); }
    return n;
  }

  /** Mejor racha histórica. */
  function bestStreak() {
    const list = days();
    let best = 0, run = 0, prev = null;
    list.forEach(function (k) {
      run = prev && SB.util.daysBetween(prev, k) === 1 ? run + 1 : 1;
      best = Math.max(best, run);
      prev = k;
    });
    return best;
  }

  SB.calendar = {
    mark: mark,
    toggle: toggle,
    isMarked: isMarked,
    days: days,
    monthGrid: monthGrid,
    currentStreak: currentStreak,
    bestStreak: bestStreak,
    // CONTRATO: añadidos.
    unmark: unmark
  };
})(window.SB = window.SB || {});
