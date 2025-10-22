// ===== Dica/Tarefa do Dia (drip) =====
(async function initDica(){
  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_tarefas'; // <— atualizado
  const MAX_DAYS = 60;
  const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
  const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

  async function load(url){
    try{ const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
    catch(_){ return null; }
  }
  const data = await load(window.DATA_DICAS);
  const $ = s => document.querySelector(s);
  const meta = $('#dica-meta'), texto = $('#dica-texto');
  const prev = $('#btnPrev'), next = $('#btnNext');
  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  let day = Drip.LS.get(VIEW_KEY, todayIdx);

  function render(){
    day = Math.max(1, Math.min(day, todayIdx));
    const item = data && data[day-1];
    if(item){
      const cat = item.categoria === 'treino' ? 'Treino' : 'Nutrição';
      meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
      texto.textContent = item.texto;
    }else{
      meta.textContent = `Dia ${day} de ${MAX_DAYS}`;
      texto.textContent = 'Dica indisponível.';
    }
    prev.disabled = (day<=1);
    next.disabled = (day>=todayIdx); // bloqueia futuro
    Drip.LS.set(VIEW_KEY, day);
  }
  prev.addEventListener('click', ()=>{ day--; render(); });
  next.addEventListener('click', ()=>{ day++; render(); });
  render();
})();

// ===== Tabs (calculadoras) =====
(function tabs(){
  const tabs = document.querySelectorAll('.tab');
  const panels = { karvonen: '#panel-karvonen', tmb: '#panel-tmb' };
  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      document.querySelector(panels[tb.dataset.tab]).classList.add('active');
    });
  });
})();

// ===== Karvonen =====
(function karvonen(){
  const idade = document.getElementById('k_idade');
  const fcr   = document.getElementById('k_fcr');
  const inten = document.getElementById('k_int');
  const out   = document.getElementById('k_out');

  function calc(){
    const a = +idade.value || 0;
    const r = +fcr.value || 0;
    const i = (+inten.value || 0)/100;
    if(a>0 && r>0 && i>0){
      const fcMax = 220 - a;
      const alvo  = Math.round(((fcMax - r) * i) + r);
      const a50   = Math.round(((fcMax - r) * 0.50) + r);
      const a65   = Math.round(((fcMax - r) * 0.65) + r);
      out.innerHTML = `FC alvo: <strong>${alvo} bpm</strong><br><span class="small muted">Faixa sugerida (Fundação): ${a50}–${a65} bpm</span>`;
    } else {
      out.textContent = 'Informe idade, FC de repouso e intensidade.';
    }
  }
  ['input','change'].forEach(ev=>{
    idade.addEventListener(ev, calc);
    fcr.addEventListener(ev, calc);
    inten.addEventListener(ev, calc);
  });
  calc();
})();

// ===== TMB =====
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
  ['input','change'].forEach(ev=>{
    peso.addEventListener(ev, calc);
    alt.addEventListener(ev, calc);
    ida.addEventListener(ev, calc);
    sex.addEventListener(ev, calc);
  });
  calc();
})();