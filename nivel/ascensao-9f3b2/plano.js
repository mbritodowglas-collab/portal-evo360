<script>
// ============================================
// EVO360 · Ascensão · Tarefas e Microtarefas (gotejamento)
// - Carrega window.DATA_TAREFAS (pode ser o mesmo ascensao.json)
// - Campos esperados no JSON: { "tarefas":[...], "microtarefas":[...] }
// - Cada bloco só ativa se encontrar os elementos/ids no HTML
// ============================================
(() => {
  const $  = (s,r=document)=>r.querySelector(s);

  const D = (window.Drip && typeof window.Drip.ensureStart==='function')
    ? window.Drip
    : (()=>{ // fallback mínimo
        const localISO=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const parseISO = s=>new Date(`${s}T12:00:00`);
        const daysBetween=(a,b)=>Math.floor((parseISO(b)-parseISO(a))/86400000);
        const LS={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
        function ensureStart(level,stream){ const k=`drip_start_${level}_${stream}`; let s=LS.get(k,null); if(!s){ s=localISO(); LS.set(k,s); } return s; }
        function getTodayIndex(startISO,max=60){ const t=localISO(); const d=daysBetween(startISO||t,t); return Math.max(1, Math.min(max, d+1)); }
        return { ensureStart, getTodayIndex };
      })();

  const LEVEL_ID = window.NIVEL || 'ascensao-fallback';
  const JSON_PATH = (() => {
    const base = window.DATA_TAREFAS || window.DATA_DICAS || '../../data/ascensao.json';
    return `${base}${base.includes('?') ? '&' : '?'}cb=${Date.now()}`;
  })();

  async function fetchJSON(url){
    try{
      const r = await fetch(url, { cache:'no-store' });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }catch(err){
      console.warn('[Tarefas] Falha ao carregar JSON:', err);
      return null;
    }
  }

  function mountStream({streamId, items, sel, maxCap=60}){
    const metaEl = $(sel.meta);
    const textEl = $(sel.text);
    const prevEl = $(sel.prev);
    const nextEl = $(sel.next);
    if(!metaEl || !textEl || !prevEl || !nextEl || !Array.isArray(items) || !items.length){
      // Silencioso: nada feito (HTML ou dados ausentes)
      return;
    }

    const startISO = D.ensureStart(LEVEL_ID, streamId);
    const MAX = Math.min(maxCap, items.length);
    const todayIdx = D.getTodayIndex(startISO, MAX);

    const VIEW_KEY = `drip_view_${LEVEL_ID}_${streamId}`;
    const LS = { get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}}, set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}} };

    let day = LS.get(VIEW_KEY, todayIdx);

    function clamp(){ const cap=Math.max(1,todayIdx); day=Math.max(1, Math.min(day,cap)); return cap; }

    function render(){
      const cap = clamp();
      const it = items[day-1] || {};
      // aceita strings simples ou objetos { titulo/texto }
      const titulo = it.titulo || it.title || `Dia ${day}`;
      const corpo  = it.texto  || it.text  || it.body || String(it || '');

      metaEl.textContent = `Dia ${day} de ${MAX} — ${titulo}`;
      textEl.innerHTML   = `<p style="margin:0; white-space:pre-wrap">${corpo}</p>`;

      prevEl.disabled = day <= 1;
      nextEl.disabled = day >= cap;
      LS.set(VIEW_KEY, day);
    }

    prevEl.addEventListener('click', ()=>{ day--; render(); });
    nextEl.addEventListener('click', ()=>{ day++; render(); });

    render();
  }

  (async function init(){
    const raw = await fetchJSON(JSON_PATH) || {};
    // aceita tanto raiz direta (arrays) quanto objeto com campos
    const tarefas      = Array.isArray(raw.tarefas)      ? raw.tarefas      : [];
    const microtarefas = Array.isArray(raw.microtarefas) ? raw.microtarefas : [];

    // Monta Tarefas (se HTML existir)
    mountStream({
      streamId: 'card2_tarefas',
      items: tarefas,
      sel: {
        meta: '#tarefa-meta',
        text: '#tarefa-texto',
        prev: '#tarefaPrev',
        next: '#tarefaNext'
      }
    });

    // Monta Microtarefas (se HTML existir)
    mountStream({
      streamId: 'card3_microtarefas',
      items: microtarefas,
      sel: {
        meta: '#micro-meta',
        text: '#micro-texto',
        prev: '#microPrev',
        next: '#microNext'
      }
    });
  })();
})();
</script>