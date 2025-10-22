/* ==========================================================
   EVO360 · Fundação · Dicas e Orientações
   Arquivo: (use o mesmo nome referenciado no seu HTML)
   Dependências: drip.js (para o gotejamento)
   ========================================================== */

/* Utilitários pequenos */
const $$ = sel => document.querySelector(sel);

/* ============================
   Dica do Dia (Drip/Start Local)
   ============================ */
(async function initDica(){
  if (!window.Drip) {
    console.warn('drip.js não carregado — o drip ficará inativo.');
    return;
  }

  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_dicas_orientacoes'; // id lógico do drip deste card
  const MAX_DAYS = 60;

  // Inicia (ou recupera) a data de início deste drip
  const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
  const todayIdx = Math.max(1, Math.min(MAX_DAYS, Drip.getTodayIndex(startISO, MAX_DAYS)));

  // loader de JSON
  async function load(url){
    try{
      const r = await fetch(url, { cache: 'no-store' });
      if(!r.ok) throw 0;
      return await r.json();
    }catch(_){ return null; }
  }

  // arquivo JSON configurado no HTML: window.DATA_DICAS
  const data = await load(window.DATA_DICAS);

  // elementos
  const meta  = $$('#dica-meta');
  const texto = $$('#dica-texto');
  const prev  = $$('#btnPrev');
  const next  = $$('#btnNext');

  // estado de visualização (lembra o último dia visto)
  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  let day = Drip.LS.get(VIEW_KEY, todayIdx);

  function render(){
    // trava para não avançar além do dia liberado
    day = Math.max(1, Math.min(day, todayIdx));

    const item = data && data[day-1];
    if(item){
      const cat = item.categoria === 'treino' ? 'Treino' : 'Nutrição';
      if (meta)  meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
      if (texto) texto.textContent = item.texto || 'Dica indisponível.';
    } else {
      if (meta)  meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
      if (texto) texto.textContent = 'Dica indisponível.';
    }

    if (prev) prev.disabled = (day <= 1);
    if (next) next.disabled = (day >= todayIdx); // não deixa ir para o futuro

    Drip.LS.set(VIEW_KEY, day);
  }

  if (prev) prev.addEventListener('click', ()=>{ day--; render(); });
  if (next) next.addEventListener('click', ()=>{ day++; render(); });

  render();
})();

/* ============================
   Abas (Calculadoras)
   ============================ */
(function tabs(){
  const tabs = document.querySelectorAll('.tab');
  if (!tabs.length) return;

  const panels = {
    karvonen: '#panel-karvonen',
    tmb:      '#panel-tmb'
  };

  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');

      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      const sel = panels[tb.dataset.tab];
      if (sel) document.querySelector(sel)?.classList.add('active');
    });
  });
})();

/* ============================
   Karvonen · Tabela 50–90%
   ============================ */
(function karvonen(){
  const idade = document.getElementById('k_idade');
  const fcr   = document.getElementById('k_fcr');
  const inten = document.getElementById('k_int'); // usado para destacar 1 linha
  const out   = document.getElementById('k_out');

  if (!idade || !fcr || !out) return;

  function alvoKarvonen(fcMax, fcr, i){ // i = 0.50 ... 0.90
    return Math.round(((fcMax - fcr) * i) + fcr);
  }

  function calc(){
    const a = +idade.value || 0;
    const r = +fcr.value    || 0;
    const selI = Math.min(0.90, Math.max(0.30, (+inten?.value || 60)/100)); // intensidade “selecionada” p/ destaque

    if (a > 0 && r > 0){
      const fcMax = 220 - a; // estimativa clássica suficiente para Fundação
      const alvoSel = alvoKarvonen(fcMax, r, selI);

      // faixa recomendada para Fundação
      const faixa50 = alvoKarvonen(fcMax, r, 0.50);
      const faixa65 = alvoKarvonen(fcMax, r, 0.65);

      // monta tabela 50%..90% (passo 5%)
      let rows = '';
      for (let p = 50; p <= 90; p += 5){
        const i   = p / 100;
        const val = alvoKarvonen(fcMax, r, i);
        const highlight = Math.abs(i - selI) < 0.001
          ? ' style="font-weight:700;background:#10151b;border-left:3px solid #CBE5FF;"'
          : '';
        rows += `<tr${highlight}><td>${p}%</td><td>${val} bpm</td></tr>`;
      }

      out.innerHTML = `
        <div style="margin-bottom:10px">
          FC máx. estimada: <strong>${fcMax} bpm</strong><br>
          FC alvo (intensidade selecionada): <strong>${alvoSel} bpm</strong><br>
          <span class="small muted">Faixa sugerida (Fundação): ${faixa50}–${faixa65} bpm</span>
        </div>

        <div class="small muted" style="margin:8px 0">
          Tabela de referência (Karvonen · FC de Reserva)
        </div>

        <table style="width:100%;border-collapse:separate;border-spacing:0;overflow:hidden;border:1px solid var(--line);border-radius:12px">
          <thead>
            <tr style="background:#0f1318">
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)">Intensidade</th>
              <th style="text-align:left;padding:8px 10px;border-bottom:1px solid var(--line)">FC alvo</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        <div class="small muted" style="margin-top:8px">
          Dica: ajuste “Intensidade (%)” para destacar a linha correspondente.
        </div>
      `;
    } else {
      out.textContent = 'Informe idade e FC de repouso para gerar a tabela.';
    }
  }

  ['input','change'].forEach(ev=>{
    idade.addEventListener(ev, calc);
    fcr.addEventListener(ev, calc);
    inten?.addEventListener(ev, calc);
  });

  calc();
})();

/* ============================
   TMB (Mifflin–St Jeor)
   ============================ */
(function tmb(){
  const peso = document.getElementById('t_peso');
  const alt  = document.getElementById('t_altura');
  const ida  = document.getElementById('t_idade');
  const sex  = document.getElementById('t_sexo');
  const out  = document.getElementById('t_out');

  if (!peso || !alt || !ida || !sex || !out) return;

  function calc(){
    const p = +peso.value || 0;
    const h = +alt.value  || 0;
    const i = +ida.value  || 0;
    const s = sex.value || 'f';

    if (p>0 && h>0 && i>0){
      const base = (10*p) + (6.25*h) - (5*i) + (s==='f' ? -161 : 5);
      out.innerHTML =
        `Sua TMB estimada: <strong>${Math.round(base)} kcal/dia</strong><br>` +
        `<span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
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