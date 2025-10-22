/* ======================================================================
   EVO360 · Fundação · Dicas e Orientações
   Arquivo: dicas-orientacoes.js
   ====================================================================== */

/* =========================
   1) Dica / orientação (drip)
   ========================= */
(async function initDica(){
  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_dicas_orientacoes';
  const MAX_DAYS = 60;

  // util local
  const $ = s => document.querySelector(s);
  async function loadJSON(url){
    try{ const r = await fetch(url, {cache:'no-store'}); if(!r.ok) throw 0; return await r.json(); }
    catch(_){ return null; }
  }

  // integra com drip.js (persistência por nível + card)
  const startISO = (window.Drip && Drip.ensureStart)
    ? Drip.ensureStart(LEVEL_ID, DRIP_ID)
    : new Date().toISOString().slice(0,10);

  const todayIdx = (window.Drip && Drip.getTodayIndex)
    ? Drip.getTodayIndex(startISO, MAX_DAYS)
    : 1;

  const data = await loadJSON(window.DATA_DICAS);
  const meta  = $('#dica-meta');
  const texto = $('#dica-texto');
  const prev  = $('#btnPrev');
  const next  = $('#btnNext');

  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  const LS = {
    get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
  };
  let day = LS.get(VIEW_KEY, todayIdx);

  function render(){
    day = Math.max(1, Math.min(day, todayIdx));     // não deixa avançar pro futuro
    const item = (data && data[day-1]) || null;

    if(item){
      const cat = item.categoria === 'treino' ? 'Treino' :
                  item.categoria === 'nutricao' ? 'Nutrição' : 'Dica';
      meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
      texto.textContent = item.texto;
    }else{
      meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
      texto.textContent = 'Dica indisponível.';
    }
    prev.disabled = (day <= 1);
    next.disabled = (day >= todayIdx);
    LS.set(VIEW_KEY, day);
  }

  prev?.addEventListener('click', ()=>{ day--; render(); });
  next?.addEventListener('click', ()=>{ day++; render(); });
  render();
})();

/* =========================
   2) Abas das calculadoras
   ========================= */
(function tabs(){
  const tabs = document.querySelectorAll('.tab');
  const panels = { karvonen: '#panel-karvonen', tmb: '#panel-tmb' };
  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      const sel = panels[tb.dataset.tab];
      if(sel) document.querySelector(sel).classList.add('active');
    });
  });
})();

/* ===============================================================
   3) FC de Reserva (Karvonen) — com botão "Calcular" e tabela 50–80
   Fórmula: alvo = ((FCmáx − FCrepouso) * intensidade) + FCrepouso
             FCmáx = 220 − idade
   =============================================================== */
(function karvonen(){
  const idade = document.getElementById('k_idade');
  const fcr   = document.getElementById('k_fcr');
  const inten = document.getElementById('k_int'); // valor livre, mas a tabela vai 50–80
  const out   = document.getElementById('k_out');

  // se o botão "Calcular" não existir no HTML, cria dinamicamente:
  let btn = document.getElementById('k_go');
  if(!btn){
    btn = document.createElement('button');
    btn.id = 'k_go';
    btn.className = 'btn';
    btn.type = 'button';
    btn.textContent = 'Calcular';
    // insere o botão logo após o campo de intensidade
    if(inten && inten.parentElement) inten.parentElement.appendChild(btn);
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function fmtBpm(n){ return `${Math.round(n)} bpm`; }

  function computeRow(fcMax, fcRest, pct){
    const i = pct / 100;
    const alvo = ((fcMax - fcRest) * i) + fcRest;
    return `<tr><td>${pct}%</td><td>${fmtBpm(alvo)}</td></tr>`;
  }

  function calcular(){
    const a = +idade.value || 0;
    const r = +fcr.value || 0;
    const i = clamp((+inten.value || 0), 30, 90); // só para calcular FC alvo único

    if(a <= 0 || r <= 0){
      out.textContent = 'Informe idade e FC de repouso para calcular.';
      return;
    }

    const fcMax = 220 - a;
    const alvo  = ((fcMax - r) * (i/100)) + r;

    // tabela 50–80% (passo 5%)
    const rows = [];
    for(let pct=50; pct<=80; pct+=5){
      rows.push(computeRow(fcMax, r, pct));
    }

    out.innerHTML = `
      <div style="margin-bottom:8px">
        FC máxima estimada: <strong>${Math.round(fcMax)} bpm</strong><br>
        FC alvo em <strong>${i}%</strong>: <strong>${fmtBpm(alvo)}</strong>
      </div>
      <div class="small muted" style="margin:6px 0 8px">Tabela de referência (método Karvonen):</div>
      <div style="overflow:auto">
        <table style="width:100%; border-collapse:collapse">
          <thead>
            <tr>
              <th style="text-align:left;border-bottom:1px solid var(--line);padding:6px 0">Intensidade</th>
              <th style="text-align:left;border-bottom:1px solid var(--line);padding:6px 0">FC alvo</th>
            </tr>
          </thead>
          <tbody>
            ${rows.join('')}
          </tbody>
        </table>
      </div>
      <div class="small muted" style="margin-top:8px">
        Sugestão Fundação: 50–65% (cardio leve/moderado).
      </div>
    `;
  }

  btn.addEventListener('click', calcular);
})();

/* =========================
   4) TMB (Mifflin–St Jeor)
   ========================= */
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
      out.innerHTML = `Sua TMB estimada: <strong>${Math.round(base)} kcal/dia</strong><br>
      <span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
    } else {
      out.textContent = 'Preencha peso, altura e idade.';
    }
  }

  ['input','change'].forEach(ev=>{
    peso?.addEventListener(ev, calc);
    alt?.addEventListener(ev, calc);
    ida?.addEventListener(ev, calc);
    sex?.addEventListener(ev, calc);
  });
  calc();
})();