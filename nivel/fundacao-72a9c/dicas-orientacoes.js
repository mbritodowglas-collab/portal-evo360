/* ========= Tarefas & Orientações – JS ÚNICO (robusto) =========
   - Drip de dicas com fallback se drip.js não existir
   - Abas de calculadoras
   - Karvonen com botão Calcular + Tabela 50–80% (passo 5%)
   - TMB (Mifflin–St Jeor)
*/

/* ---------- Fallback DRIP (não trava se drip.js faltar) ---------- */
(function ensureDrip(){
  if (window.Drip) return;
  const LS = {
    get:(k,def=null)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):def;}catch(_){return def;} },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
  };
  window.Drip = {
    LS,
    ensureStart(levelId, dripId){
      const key = `drip_start_${levelId}_${dripId}`;
      let v = LS.get(key, null);
      if(!v){
        v = new Date().toISOString().slice(0,10);
        LS.set(key, v);
      }
      return v;
    },
    getTodayIndex(startISO, maxDays){
      const d1 = new Date(startISO);
      const d2 = new Date();
      const diff = Math.floor((d2 - d1)/(1000*60*60*24)) + 1;
      return Math.max(1, Math.min(maxDays, diff));
    }
  };
})();

/* ================== DICA/ORIENTAÇÃO DO DIA (DRIP) ================== */
(async function initDica(){
  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_tarefas';
  const MAX_DAYS = 60;

  const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
  const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

  async function load(url){
    try{
      const r = await fetch(url, { cache:'no-store' });
      if(!r.ok) throw 0;
      return await r.json();
    }catch(_){ return null; }
  }

  const data = await load(window.DATA_DICAS); // ../../_data/dicas-fundacao.json
  const $ = s => document.querySelector(s);
  const meta  = $('#dica-meta');
  const texto = $('#dica-texto');
  const prev  = $('#btnPrev');
  const next  = $('#btnNext');

  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  let day = Drip.LS.get(VIEW_KEY, todayIdx);

  function render(){
    day = Math.max(1, Math.min(day, todayIdx));
    const item = data && data[day-1];
    if(item){
      const cat = item.categoria === 'treino' ? 'Treino' : 'Nutrição';
      meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
      texto.textContent = item.texto;
    } else {
      meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
      texto.textContent = 'Dica indisponível.';
    }
    prev.disabled = (day<=1);
    next.disabled = (day>=todayIdx);
    Drip.LS.set(VIEW_KEY, day);
  }

  prev?.addEventListener('click', ()=>{ day--; render(); });
  next?.addEventListener('click', ()=>{ day++; render(); });
  render();
})();

/* ================== ABAS (CALCULADORAS) ================== */
(function tabs(){
  const tabs = document.querySelectorAll('.tab');
  const panels = { karvonen:'#panel-karvonen', tmb:'#panel-tmb' };
  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      document.querySelector(panels[tb.dataset.tab])?.classList.add('active');
    });
  });
})();

/* ================== KARVONEN + TABELA 50–80% ================== */
(function karvonen(){
  const idade = document.getElementById('k_idade');
  const fcr   = document.getElementById('k_fcr');
  const inten = document.getElementById('k_int'); // fica como referência; não é mais obrigatório
  const out   = document.getElementById('k_out');

  // Garante botão Calcular (caso não exista no HTML)
  let calcBtn = document.getElementById('k_calc');
  if(!calcBtn){
    calcBtn = document.createElement('button');
    calcBtn.id = 'k_calc';
    calcBtn.className = 'btn';
    calcBtn.type = 'button';
    calcBtn.textContent = 'Calcular';
    // coloca o botão logo depois do campo de intensidade
    inten?.parentElement?.insertAdjacentElement('afterend', calcBtn);
  }

  function faixaKarvonen(a, r, frac){ // frac = 0.50..0.80
    const fcMax = 220 - a;
    return Math.round(((fcMax - r) * frac) + r);
  }

  function calc(){
    const a = +idade.value || 0;
    const r = +fcr.value || 0;
    if(a<=0 || r<=0){
      out.textContent = 'Informe idade e FC de repouso.';
      return;
    }

    // constrói a tabela 50–80% (passo 5%)
    const linhas = [];
    for(let p=50; p<=80; p+=5){
      const frac = p/100;
      const bpm  = faixaKarvonen(a, r, frac);
      linhas.push(`<div class="row gap" style="justify-content:space-between;">
        <span class="muted">${p}%</span>
        <strong>${bpm} bpm</strong>
      </div>`);
    }

    // se o usuário preencheu a “Intensidade (%)”, mostramos a FC alvo exata também
    let alvoHTML = '';
    const i = (+inten.value || 0)/100;
    if(i>0){
      const alvo = faixaKarvonen(a, r, i);
      alvoHTML = `<div style="margin-top:8px;">FC alvo na intensidade escolhida: <strong>${alvo} bpm</strong></div>`;
    }

    out.innerHTML = `
      <div class="small muted" style="margin-bottom:6px">Tabela de referência (Karvonen)</div>
      ${linhas.join('')}
      ${alvoHTML}
      <div class="small muted" style="margin-top:8px">Sugestão Fundação: 50–65% (cardio leve/moderado)</div>
    `;
  }

  // Clique no botão dispara
  calcBtn.addEventListener('click', calc);

  // Enter nos inputs também dispara
  [idade, fcr, inten].forEach(el=>{
    el?.addEventListener('keydown', e=>{ if(e.key==='Enter') calc(); });
  });
})();

/* ================== TMB (Mifflin–St Jeor) ================== */
(function tmb(){
  const peso = document.getElementById('t_peso');
  const alt  = document.getElementById('t_altura');
  const ida  = document.getElementById('t_idade');
  const sex  = document.getElementById('t_sexo');
  const out  = document.getElementById('t_out');

  function calc(){
    const p = +peso.value || 0;
    const h = +alt.value  || 0;
    const i = +ida.value  || 0;
    const s = sex.value || 'f';
    if(p>0 && h>0 && i>0){
      const base = (10*p) + (6.25*h) - (5*i) + (s==='f' ? -161 : 5);
      out.innerHTML = `Sua TMB estimada: <strong>${Math.round(base)} kcal/dia</strong><br><span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
    } else {
      out.textContent = 'Preencha peso, altura e idade.';
    }
  }

  // calcula automaticamente conforme o usuário digita
  ['input','change'].forEach(ev=>{
    peso?.addEventListener(ev, calc);
    alt ?.addEventListener(ev, calc);
    ida ?.addEventListener(ev, calc);
    sex ?.addEventListener(ev, calc);
  });
})();