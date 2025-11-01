<script>
// ============================
// EVO360 · Drip (gotejamento de conteúdo)
// - Marca o "dia 1" na primeira visita de um stream
// - Usa data LOCAL (vira à meia-noite local)
// - Armazena 'YYYY-MM-DD' no localStorage
// - Resiliente a falta de permissões do LS (falha silenciosa)
// ============================
(function(global){
  const localISO = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  };
  const parseISO = (s) => new Date(`${s}T12:00:00`); // evita DST edge
  const todayISO = () => localISO(new Date());
  const daysBetween = (aISO,bISO) => Math.floor((parseISO(bISO) - parseISO(aISO))/86400000);
  const isISO = (s) => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

  const LS = {
    get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
    set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ } },
    del:(k)=>{ try{ localStorage.removeItem(k); }catch(_){ } }
  };

  function ensureStart(levelId, streamId){
    const KEY = `drip_start_${levelId}_${streamId}`;
    let start = LS.get(KEY, null);
    if(!isISO(start)){
      start = todayISO();
      LS.set(KEY, start);
    }
    return start;
  }

  // Retorna 1..maxDays
  function getTodayIndex(startISO, maxDays=60){
    if(!isISO(startISO)) startISO = todayISO();
    const delta = daysBetween(startISO, todayISO());
    return Math.max(1, Math.min(maxDays, delta + 1));
  }

  function reset(levelId, streamId){
    const KEY = `drip_start_${levelId}_${streamId}`;
    LS.del(KEY);
  }

  global.Drip = { ensureStart, getTodayIndex, reset, LS, todayISO, localISO };
})(window);
</script>