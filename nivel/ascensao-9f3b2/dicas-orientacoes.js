<script>
// ============================
// EVO360 · Ascensão · Dicas e Orientações
// Requisitos de HTML (ids):
//   #dica-meta, #dica-texto, #btnPrev, #btnNext
// Requisitos globais (já existem no teu HTML):
//   window.NIVEL = "ascensao-..."
//   window.DATA_DICAS = "../../data/ascensao.json"
// ============================
(() => {
  const $  = (s, r=document) => r.querySelector(s);

  // --- Mini-fallback caso Drip não esteja carregado (não trava a página) ---
  const D = (window.Drip && typeof window.Drip.ensureStart==='function')
    ? window.Drip
    : (() => {
        const localISO = (d=new Date())=>{
          const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0');
          return `${y}-${m}-${day}`;
        };
        const parseISO = s => new Date(`${s}T12:00:00`);
        const todayISO = () => localISO(new Date());
        const daysBetween = (a,b)=>Math.floor((parseISO(b)-parseISO(a))/86400000);
        const LS={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
        function ensureStart(level,stream){
          const KEY=`drip_start_${level}_${stream}`;
          let start=LS.get(KEY,null);
          if(!start){ start=todayISO(); LS.set(KEY,start); }
          return start;
        }
        function getTodayIndex(startISO,max=60){
          const t=todayISO();
          const delta=daysBetween(startISO||t,t);
          return Math.max(1, Math.min(max, delta+1));
        }
        return { ensureStart, getTodayIndex };
      })();

  const LEVEL_ID = window.NIVEL || 'ascensao-fallback';
  const STREAM_ID = 'card1_dicas_orientacoes';
  const JSON_PATH = (() => {
    const base = window.DATA_DICAS || '../../data/ascensao.json';
    return `${base}${base.includes('?') ? '&' : '?'}cb=${Date.now()}`; // cache-bust
  })();

  const meta  = $('#dica-meta');
  const texto = $('#dica-texto');
  const prev  = $('#btnPrev');
  const next  = $('#btnNext');

  async function fetchJSON(url){
    try{
      const r = await fetch(url, { cache:'no-store' });
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    }catch(err){
      console.warn('[Dicas] Falha ao carregar JSON:', err);
      return null;
    }
  }

  function renderItem(item, day, max){
    if(!meta || !texto) return;
    const rotulo = item?.categoria==='treino' ? 'Treino'
                 : item?.categoria==='nutricao' ? 'Nutrição'
                 : item?.categoria==='mentalidade' ? 'Mentalidade'
                 : 'Dica';
    meta.textContent = `Dia ${day} de ${max} — ${rotulo}${item?.titulo ? ` · ${item.titulo}` : ''}`;

    if(item?.conceito || item?.orientacao){
      texto.innerHTML = `
        <div class="dica-bloco">
          ${item.conceito ? `<div class="dica-label">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
          ${item.orientacao ? `<div class="dica-label">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
        </div>`;
    }else{
      texto.innerHTML = `<p style="margin:0">${item?.texto || '—'}</p>`;
    }
  }

  (async function init(){
    // ponto de partida do gotejamento
    const startISO = D.ensureStart(LEVEL_ID, STREAM_ID);

    // carrega dados
    const raw = await fetchJSON(JSON_PATH);
    const dicas = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);
    if(!dicas.length){
      meta && (meta.textContent = 'Dia —');
      texto && (texto.textContent = 'Dica indisponível.');
      prev && (prev.disabled = true);
      next && (next.disabled = true);
      return;
    }

    const MAX = Math.min(60, dicas.length);
    const todayIdx = D.getTodayIndex(startISO, MAX);

    // estado visual (salvo no LS para lembrar onde usuário parou)
    const VIEW_KEY = `drip_view_${LEVEL_ID}_${STREAM_ID}`;
    const LS = { get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}}, set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}} };

    let day = LS.get(VIEW_KEY, todayIdx);
    function clampToCap(){
      const cap = Math.max(1, todayIdx);
      day = Math.max(1, Math.min(day, cap));
      return cap;
    }

    function update(){
      const cap = clampToCap();
      const item = dicas[day-1] || null;
      renderItem(item, day, MAX);
      prev && (prev.disabled = day <= 1);
      next && (next.disabled = day >= cap);
      LS.set(VIEW_KEY, day);
    }

    prev && prev.addEventListener('click', ()=>{ day--; update(); });
    next && next.addEventListener('click', ()=>{ day++; update(); });

    update();
  })();
})();
</script>