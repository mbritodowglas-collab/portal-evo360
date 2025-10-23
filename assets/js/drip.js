const Drip = (() => {
  // --- Util: trabalhar sempre em UTC para não sofrer com fuso/horário de verão
  const parseISO = (s) => new Date(`${s}T00:00:00Z`);                // ISO -> Date (UTC midnight)
  const isoUTC = (date) => new Date(date.getTime()                    // Date -> 'YYYY-MM-DD' em UTC
    - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  const todayISO = () => isoUTC(new Date());                          // 'YYYY-MM-DD' de hoje (UTC)
  const daysBetween = (a, b) => Math.floor(                           // diferença inteira em dias
    (parseISO(b) - parseISO(a)) / 86400000
  );

  // localStorage com fallback
  const LS = {
    get: (k, def = null) => {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : def;
      } catch (_) { return def; }
    },
    set: (k, v) => {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    }
  };

  // Marca o "dia 1" do drip no primeiro acesso
  function ensureStart(levelId, streamId) {
    const KEY = `drip_start_${levelId}_${streamId}`;
    let start = LS.get(KEY, null);
    if (!start) { start = todayISO(); LS.set(KEY, start); }
    return start; // 'YYYY-MM-DD'
  }

  // Índice do dia corrido, 1..maxDays (padrão 60)
  function getTodayIndex(startISO, maxDays = 60) {
    const idx = Math.min(maxDays, daysBetween(startISO, todayISO()) + 1);
    return Math.max(1, idx);
  }

  // API pública (inalterada)
  return { ensureStart, getTodayIndex, LS };
})();