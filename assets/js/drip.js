// ============================
// EVO360 · Fundação
// Módulo: Drip (gotejamento de conteúdo)
// ============================
//
// Objetivo
// - Marcar o "dia 1" na primeira visita de um stream (ex.: card1_dicas)
// - Calcular qual item está liberado hoje com base no calendário local do usuário
//
// Decisões
// - Virada diária: **à meia-noite LOCAL** do dispositivo
// - Armazenamento: apenas a data 'YYYY-MM-DD' (sem hora)
// - Compatível com chaves já salvas (não muda o formato)
//

const Drip = (() => {
  // ----- Util: datas em FUSO LOCAL -----
  // Converte Date -> 'YYYY-MM-DD' (local)
  const localISO = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Converte 'YYYY-MM-DD' -> Date no **meio-dia local** para evitar DST edge cases
  // (usar 12:00 reduz risco de cair em hora "inexistente" em mudanças de fuso/horário de verão)
  const parseISO = (s) => new Date(`${s}T12:00:00`);

  const todayISO = () => localISO(new Date());

  const daysBetween = (aISO, bISO) => {
    const A = parseISO(aISO);
    const B = parseISO(bISO);
    // 86_400_000 ms = 1 dia; floor garante inteiro não-negativo
    return Math.floor((B - A) / 86_400_000);
  };

  // ----- localStorage com fallback seguro -----
  const LS = {
    get: (k, def = null) => {
      try {
        const v = localStorage.getItem(k);
        return v ? JSON.parse(v) : def;
      } catch (_) { return def; }
    },
    set: (k, v) => {
      try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {}
    },
    del: (k) => {
      try { localStorage.removeItem(k); } catch (_) {}
    }
  };

  // ----- Marca o "dia 1" na primeira visita ao stream -----
  function ensureStart(levelId, streamId) {
    const KEY = `drip_start_${levelId}_${streamId}`;
    let start = LS.get(KEY, null);
    if (!start) {
      start = todayISO(); // data local de hoje
      LS.set(KEY, start);
    }
    return start; // 'YYYY-MM-DD'
  }

  // ----- Retorna o índice de hoje dentro do gotejamento (1..maxDays) -----
  function getTodayIndex(startISO, maxDays = 60) {
    // Ex.: se hoje == startISO => idx = 1
    const delta = daysBetween(startISO, todayISO());
    const idx = Math.min(maxDays, delta + 1);
    return Math.max(1, idx);
  }

  // ----- (Opcional) Resetar o drip de um stream -----
  // Útil para testes: recomeça o contador no próximo acesso a ensureStart
  function reset(levelId, streamId) {
    const KEY = `drip_start_${levelId}_${streamId}`;
    LS.del(KEY);
  }

  // API pública
  return { ensureStart, getTodayIndex, reset, LS };
})();