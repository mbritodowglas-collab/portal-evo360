// ============================
// EVO360 · Fundação
// Página: Dicas e Orientações (robusto, v24 + patches diagnósticos)
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---- DRIP shim ----
(function ensureDrip(){
  if (typeof window.Drip !== 'undefined') return;
  const localISO = (d=new Date())=>{
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const parseISO = (s)=> new Date(`${s}T12:00:00`);
  const todayISO = ()=> localISO(new Date());
  const daysBetween = (a,b)=> Math.floor((parseISO(b)-parseISO(a))/86400000);
  const LS = {
    get:(k,d=null)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
    set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ } },
  };
  window.Drip = {
    ensureStart(levelId, streamId){
      const KEY = `drip_start_${levelId}_${streamId}`;
      let start = LS.get(KEY, null);
      if (!(/^\d{4}-\d{2}-\d{2}$/.test(start||''))) {
        start = todayISO(); LS.set(KEY, start);
      }
      return start;
    },
    getTodayIndex(startISO, maxDays=60){
      if (!(/^\d{4}-\d{2}-\d{2}$/.test(startISO||''))) startISO = todayISO();
      const idx = daysBetween(startISO, todayISO()) + 1;
      return Math.max(1, Math.min(maxDays, idx));
    }
  };
})();

function cacheBust(url){
  try { const u = new URL(url, location.href); u.searchParams.set('cb', Date.now()); return u.href; }
  catch { return url; }
}

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_dicas_orientacoes';
    const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
    const dataPath = cacheBust(window.DATA_DICAS || '../../data/fundacao.json');
    const r = await fetch(dataPath, { cache: 'no-store' });
    const raw = r.ok ? await r.json() : null;
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    const meta=$('#dica-meta'), texto=$('#dica-texto'), prev=$('#btnPrev'), next=$('#btnNext');
    if (!data || !data.length){ meta&&(meta.textContent='Dia —'); texto&&(texto.textContent='Dica indisponível.'); return; }

    const MAX_DAYS=Math.min(60,data.length), todayIdx=Drip.getTodayIndex(startISO,MAX_DAYS);
    console.info('[Fundação/Drip]',{LEVEL_ID,DRIP_ID,startISO,todayIdx,len:data.length});

    const VIEW_KEY=`drip_view_${LEVEL_ID}_${DRIP_ID}`;
    const LS={get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))};
    let day=LS.get(VIEW_KEY,todayIdx);

    function render(){
      const cap=Math.min(Math.max(1,todayIdx),data.length);
      day=Math.max(1,Math.min(day,cap));
      const item=data[day-1];
      if(item){
        const rotulo=item.categoria==='treino'?'Treino':item.categoria==='nutricao'?'Nutrição':item.categoria==='mentalidade'?'Mentalidade':'Dica';
        meta&&(meta.textContent=`Dia ${day} de ${MAX_DAYS} — ${rotulo}${item.titulo?` · ${item.titulo}`:''}`);
        const blocoHTML=(item.conceito||item.orientacao)
          ? `<div class="dica-bloco">
              ${item.conceito?`<div class="dica-label" style="font-weight:700;color:var(--ink-1)">Conceito</div><p>${item.conceito}</p>`:''}
              ${item.orientacao?`<div class="dica-label" style="font-weight:700;color:var(--ink-1)">Orientação</div><p>${item.orientacao}</p>`:''}
             </div>`
          : `<p>${item.texto||''}</p>`;
        if(texto){texto.innerHTML=blocoHTML;texto.style.whiteSpace='normal';texto.style.lineHeight='1.6';}
      } else { meta&&(meta.textContent=`Dia ${day} de ${MAX_DAYS}`); texto&&(texto.textContent='Dica indisponível.'); }
      prev&&(prev.disabled=day<=1); next&&(next.disabled=day>=cap); LS.set(VIEW_KEY,day);
    }

    prev?.addEventListener('click',()=>{day--;render();});
    next?.addEventListener('click',()=>{day++;render();});
    render();
  } catch(e){ console.warn('[Fundação/Drip] init falhou:',e); }
})();

// ---------- Abas (Calculadoras) ----------
(function tabs(){
  const tabs=$$('.tab'), panels=$$('.panel');
  if(!tabs.length||!panels.length)return;
  function activate(tabEl){
    tabs.forEach(x=>x.classList.remove('active')); panels.forEach(p=>p.classList.remove('active'));
    tabEl.classList.add('active');
    const key=tabEl.dataset.tab, panel=key?document.querySelector('#panel-'+key):null;
    (panel||panels[0])?.classList.add('active');
  }
  tabs.forEach(tb=>tb.addEventListener('click',()=>activate(tb)));
  activate(tabs.find(t=>t.classList.contains('active'))||tabs[0]);
})();

// ---------- Calculadora · Karvonen ----------
(function karvonen(){
  try{
    const idade=$('#k_idade'), fCR=$('#k_fcr'), out=$('#k_out'), table=$('#k_table'), btn=$('#k_calcBtn'), clr=$('#k_clearBtn');
    console.info('[Karvonen] init',{idade:!!idade,fcr:!!fCR,out:!!out,table:!!table,btn:!!btn,clr:!!clr});
    if(!idade||!fCR||!out||!table||!btn||!clr){ console.warn('[Karvonen] campo(s) ausente(s), módulo não iniciou.'); return; }

    const karv=(fcMax,fcRep,frac)=>Math.round(((fcMax-fcRep)*frac)+fcRep);
    const tabela=(fcMax,fcRep)=>{const linhas=[];for(let pct=50;pct<=80;pct+=5){const alvo=karv(fcMax,fcRep,pct/100);
      linhas.push(`<div class="row" style="justify-content:space-between"><span>${pct}% da FC de reserva</span><strong>${alvo} bpm</strong></div>`);}return linhas.join('');};

    function calcular(){
      const a=+idade.value||0, r=+fCR.value||0;
      if(a<=0||r<=0){ out.textContent='Informe idade e FC de repouso.'; table.innerHTML=''; return; }
      const fcMax=220-a, alvo50=karv(fcMax,r,0.50), alvo65=karv(fcMax,r,0.65);
      out.innerHTML=`FC máx. estimada: <strong>${fcMax} bpm</strong><br><span class="small muted">Faixa sugerida: ${alvo50}–${alvo65} bpm</span>`;
      table.innerHTML=tabela(fcMax,r);
    }

    function limpar(){ idade.value=''; fCR.value=''; out.textContent='Informe idade e FC de repouso e clique em Calcular.'; table.innerHTML=''; }
    btn.addEventListener('click',calcular);
    clr.addEventListener('click',limpar);
    [idade,fCR