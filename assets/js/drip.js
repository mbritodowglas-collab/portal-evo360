<script>
// ============================
// EVO360 · Fundação
// Módulo: Drip (gotejamento de conteúdo)
// ============================
//
// - Marca o "dia 1" na primeira visita de um stream
// - Calcula item liberado com base na data LOCAL do usuário
// - Virada diária: 00:00 local
// - Armazena 'YYYY-MM-DD' (sem hora) no localStorage
//

const Drip = (() => {
  // ---------- Utils: datas em FUSO LOCAL ----------
  // Date -> 'YYYY-MM-DD' (local)
  const localISO = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // 'YYYY-MM-DD' -> Date em 12:00 local (evita edge cases de DST)
  const parseISO = (s) => new Date(`${s}T12:00:00`);

  const todayISO = () => localISO(new Date());

  // diferença inteira de dias entre duas datas ISO locais
  const daysBetween = (aISO, bISO) => {
    const A = parseISO(aISO);
    const B = parseISO(bISO);
    return Math.floor((B - A) / 86_400_000); // 86.400.000 ms
  };

  // valida string 'YYYY-MM-DD'
  const isISO = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

  // ---------- localStorage seguro ----------
  const LS = {
    get: (k, def = null) => {
      try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }
      catch (_) { return def; }
    },
    set: (k, v) => {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    },
    del: (k) => {
      try { localStorage.removeItem(k); } catch (_) {}
    }
  };

  // ---------- Inicia (marca) o drip ----------
  function ensureStart(levelId, streamId) {
    const KEY = `drip_start_${levelId}_${streamId}`;
    let start = LS.get(KEY, null);
    if (!isISO(start)) {
      start = todayISO(); // dia local de hoje
      LS.set(KEY, start);
    }
    return start; // 'YYYY-MM-DD'
  }

  // ---------- Índice liberado hoje ----------
  // Retorna 1..maxDays (clamp)
  function getTodayIndex(startISO, maxDays = 60) {
    if (!isISO(startISO)) startISO = todayISO();
    const delta = daysBetween(startISO, todayISO());
    const idx = Math.min(maxDays, delta + 1);
    return Math.max(1, idx);
  }

  // ---------- Reset (útil para testes) ----------
  function reset(levelId, streamId) {
    const KEY = `drip_start_${levelId}_${streamId}`;
    LS.del(KEY);
  }

  // ---------- Helpers de debug (opcional) ----------
  function getTodayISO() { return todayISO(); }
  function diffFrom(startISO) { return daysBetween(startISO, todayISO()); }

  // API pública
  return { ensureStart, getTodayIndex, reset, LS, getTodayISO, diffFrom };
})();
</script>