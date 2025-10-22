const Drip = (() => {
  const iso = d => new Date(d).toISOString().slice(0,10);
  const todayISO = () => iso(new Date());
  const daysBetween = (a,b) => Math.floor((new Date(b)-new Date(a))/86400000);
  const LS = {
    get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
  };
  function ensureStart(levelId, streamId){
    const KEY = `drip_start_${levelId}_${streamId}`;
    let start = LS.get(KEY, null);
    if(!start){ start = todayISO(); LS.set(KEY, start); }
    return start;
  }
  function getTodayIndex(startISO, maxDays=60){
    const idx = Math.min(maxDays, daysBetween(startISO, todayISO())+1);
    return Math.max(1, idx);
  }
  return { ensureStart, getTodayIndex, LS };
})();