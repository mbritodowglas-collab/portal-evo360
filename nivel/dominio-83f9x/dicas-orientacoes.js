// ============================
// EVO360 · Dicas e Orientações (robusto)
// Nível detectado por window.NIVEL; fonte por window.DATA_DICAS
// Aceita JSON como Array direto OU { dicas: [...] }.
// Tenta múltiplos caminhos de fallback (data/_data).
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// --------- NIVEL (apenas pra Karvonen) ----------
const NIVEL_CFG = (() => {
  const id = String(window.NIVEL || '').toLowerCase();
  if (id.includes('dominio'))   return { nome:'Domínio',   low:0.70, high:0.85, tableMin:60, tableMax:90 };
  if (id.includes('ascensao') || id.includes('ascensão'))
                               return { nome:'Ascensão',  low:0.60, high:0.75, tableMin:55, tableMax:85 };
  return                           { nome:'Fundação', low:0.50, high:0.65, tableMin:50, tableMax:80 };
})();

function cacheBust(url){
  if(!url) return url;
  const u = new URL(url, location.href);
  u.searchParams.set('cb', Date.now());
  return u.href;
}

async function fetchJson(url){
  if(!url) return null;
  try{
    const r = await fetch(cacheBust(url), { cache:'no-store' });
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(_){
    return null;
  }
}

async function tryMany(urls){
  for(const u of urls){
    const j = await fetchJson(u);
    if (j) return j;
  }
  return null;
}

// ---------- SHIM Drip (se faltar) ----------
(function ensureDrip(){
  if (typeof window.Drip !== 'undefined') return;
  const localISO = (d=new Date())=>{
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const parseISO=(s)=>new Date(`${s}T12:00:00`);
  const todayISO=()=>localISO(new Date());
  const daysBetween=(a,b)=>Math.floor((parseISO(b)-parseISO(a))/86400000);
  const LS={ get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},
             set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}} };
  window.Drip = {
    ensureStart(levelId, streamId){
      const KEY=`drip_start_${levelId}_${streamId}`;
      let s = LS.get(KEY,null);
      if(!s){ s = todayISO(); LS.set(KEY,s); }
      return s;
    },
    getTodayIndex(startISO, maxDays=60){
      const delta = daysBetween(startISO, todayISO());
      return Math.max(1, Math.min(maxDays, delta+1));
    }
  };
})();

// ---------- DICA DO DIA ----------
(async function dicaDrip(){
  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_dicas_orientacoes';

  const meta  = $('#dica-meta');
  const texto = $('#dica-texto');
  const prev  = $('#btnPrev');
  const next  = $('#btnNext');

  // estilo defensivo (garante quebra mesmo em erro)
  if (texto){
    Object.assign(texto.style, {
      whiteSpace:'normal', overflowWrap:'anywhere', wordBreak:'break-word', lineHeight:'1.6', marginTop:'6px'
    });
  }

  // monta lista de tentativas (prioriza o caminho explícito)
  const explicit = window.DATA_DICAS && String(window.DATA_DICAS);
  const baseDir  = (explicit && explicit.includes('dominio'))
    ? explicit.replace(/dominio\.json.*/,'')
    : '../../data/';
  const fallbacks = [
    explicit,
    `${baseDir}dominio.json`,                // data padrão do Domínio
    `${baseDir}fundacao.json`,               // (fallback genérico se trocar nível sem data)
    '../../_data/dominio.json',              // _data (jekyll)
    '../../_data/fundacao.json'
  ].filter(Boolean);

  // start do drip
  const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);

  // carrega dados
  const raw  = await tryMany(fallbacks);
  const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

  if (!data || !data.length){
    meta  && (meta.textContent  = 'Dia —');
    texto && (texto.textContent = 'Dica indisponível (sem dados).');
    // também desabilita navegação
    prev  && (prev.disabled = true);
    next  && (next.disabled = true);
    return;
  }

  const MAX_DAYS = Math.min(60, data.length);
  const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  const LS = {
    get:(k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
  };

  let day = LS.get(VIEW_KEY, todayIdx);

  function render(){
    const cap = Math.max(1, todayIdx); // bloqueia futuro
    day = Math.max(1, Math.min(day, cap));

    const item = data[day-1];
    if (item){
      const rotulo = item.categoria === 'treino' ? 'Treino'
                  : item.categoria === 'nutricao' ? 'Nutrição'
                  : item.categoria === 'mentalidade' ? 'Mentalidade' : 'Dica';

      meta  && (meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${rotulo}${item.titulo ? ` · ${item.titulo}` : ''}`);

      const blocoHTML = (item.conceito || item.orientacao)
        ? `
          <div class="dica-bloco">
            ${item.conceito ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
            ${item.orientacao ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
          </div>`
        : `<p style="margin:0">${item.texto || ''}</p>`;

      texto && (texto.innerHTML = blocoHTML);
    } else {
      meta  && (meta.textContent  = `Dia ${day} de ${MAX_DAYS}`);
      texto && (texto.textContent = 'Dica indisponível.');
    }

    prev && (prev.disabled = day <= 1);
    next && (next.disabled = day >= cap);
    LS.set(VIEW_KEY, day);
  }

  prev?.addEventListener('click', ()=>{ day--; render(); });
  next?.addEventListener('click', ()=>{ day++; render(); });
  render();
})();

// ---------- Abas ----------
(function tabs(){
  const tabs = $$('.tab');
  const panels = $$('.panel');
  if (!tabs.length || !panels.length) return;

  function activate(tabEl){
    tabs.forEach(x=>x.classList.remove('active'));
    panels.forEach(p=>p.classList.remove('active'));
    tabEl.classList.add('active');

    const k = tabEl.dataset.tab;
    const target = k ? document.querySelector(`#panel-${k}`) : null;
    (target || panels[0])?.classList.add('active');
  }

  tabs.forEach(tb=>tb.addEventListener('click', ()=>activate(tb)));
  activate(tabs.find(t=>t.classList.contains('active')) || tabs[0]);
})();

// ---------- Karvonen ----------
(function karvonen(){
  const idade = $('#k_idade'), fcr = $('#k_fcr'), out = $('#k_out'), table = $('#k_table');
  const btn   = $('#k_calcBtn'), clr = $('#k_clearBtn');
  if(!idade || !fcr || !out || !table || !btn || !clr) return;

  const trg = (fcMax, fcRep, frac) => Math.round(((fcMax - fcRep)*frac) + fcRep);

  function tabela(fcMax, fcRep){
    const linhas=[];
    for(let pct = NIVEL_CFG.tableMin; pct<=NIVEL_CFG.tableMax; pct+=5){
      const alvo = trg(fcMax, fcRep, pct/100);
      linhas.push(`<div class="row" style="justify-content:space-between"><span>${pct}% da FC de reserva</span><strong>${alvo} bpm</strong></div>`);
    }
    return linhas.join('');
  }

  function calcular(){
    const a=+idade.value||0, r=+fcr.value||0;
    if(a<=0 || r<=0){ out.textContent='Informe idade e FC de repouso.'; table.innerHTML=''; return; }
    const fcMax = 220 - a;
    const low   = trg(fcMax, r, NIVEL_CFG.low);
    const high  = trg(fcMax, r, NIVEL_CFG.high);
    out.innerHTML = `FC máx. estimada: <strong>${fcMax} bpm</strong><br><span class="small muted">Faixa sugerida (${NIVEL_CFG.nome}): ${low}–${high} bpm</span>`;
    table.innerHTML = tabela(fcMax, r);
  }

  function limpar(){
    idade.value=''; fcr.value=''; out.textContent='Informe idade e FC de repouso e clique em Calcular.'; table.innerHTML='';
  }

  btn.addEventListener('click', calcular);
  clr.addEventListener('click', limpar);
  [idade, fcr].forEach(el=>el.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); calcular(); } }));
})();

// ---------- TMB ----------
(function tmb(){
  const peso=$('#t_peso'), alt=$('#t_altura'), ida=$('#t_idade'), sex=$('#t_sexo'), out=$('#t_out');
  if(!peso || !alt || !ida || !sex || !out) return;

  function calc(){
    const p=+peso.value||0, h=+alt.value||0, i=+ida.value||0, s=(sex.value||'f').toLowerCase();
    if(p>0 && h>0 && i>0){
      const base = Math.round((10*p)+(6.25*h)-(5*i)+(s==='f'?-161:5));
      out.innerHTML = `Sua TMB estimada: <strong>${base} kcal/dia</strong><br><span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
    } else {
      out.textContent = 'Preencha peso, altura e idade.';
    }
  }

  ['input','change'].forEach(ev=>{
    peso.addEventListener(ev, calc); alt.addEventListener(ev, calc); ida.addEventListener(ev, calc); sex.addEventListener(ev, calc);
  });
  calc();
})();