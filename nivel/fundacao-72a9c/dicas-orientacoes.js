// ===== Dica/Tarefa do Dia (drip) =====
(async function initDica(){
  const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
  const DRIP_ID  = 'card1_tarefas';
  const MAX_DAYS = 60;

  // helpers de storage e datas (fornecidos por drip.js)
  const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
  const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

  async function load(url){
    try{
      const r = await fetch(url, {cache:'no-store'});
      if(!r.ok) throw 0;
      return await r.json();
    }catch(_){ return null; }
  }

  const data = await load(window.DATA_DICAS);

  const $ = s => document.querySelector(s);
  const meta  = $('#dica-meta');
  const texto = $('#dica-texto');
  const prev  = $('#btnPrev');
  const next  = $('#btnNext');

  const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
  let day = Drip.LS.get(VIEW_KEY, todayIdx);

  function render(){
    // trava futuro; permite voltar
    day = Math.max(1, Math.min(day, todayIdx));

    const item = data && data[day-1];
    if(item){
      const cat = item.categoria === 'treino' ? 'Treino' : 'Nutrição';
      meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
      texto.textContent = item.texto;
    } else {
      meta.textContent = `Dia ${day} de ${MAX_DAYS}`;
      texto.textContent = 'Dica indisponível.';
    }

    prev.disabled = (day <= 1);
    next.disabled = (day >= todayIdx);
    Drip.LS.set(VIEW_KEY, day);
  }

  prev.addEventListener('click', ()=>{ day--; render(); });
  next.addEventListener('click', ()=>{ day++; render(); });
  render();
})();


// ===== Tabs (Calculadoras) =====
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


// ===== FC de Reserva (Karvonen) =====
// Agora: sem campo de intensidade. Calcula e lista as zonas 50–80% (de 5 em 5).
(function karvonen(){
  const idade = document.getElementById('k_idade');
  const fcr   = document.getElementById('k_fcr');   // FC de repouso
  const out   = document.getElementById('k_out');   // resumo alvo/máx/reserva
  const table = document.getElementById('k_table'); // tabela de zonas
  const btn   = document.getElementById('k_calcBtn');
  const clr   = document.getElementById('k_clearBtn');

  if(!idade || !fcr || !out || !table || !btn) return;

  function calcKarvonen(a, r, pct){
    // FCmax estimada = 220 - idade (método simples, suficiente aqui)
    const fcMax   = 220 - a;
    const reserva = fcMax - r;
    const alvo    = Math.round(reserva * (pct/100) + r);
    return { fcMax, reserva, alvo };
  }

  function renderTabela(a, r){
    const percentuais = [50,55,60,65,70,75,80];
    const { fcMax, reserva } = calcKarvonen(a, r, 50); // só para pegar fcMax/reserva

    // header/resumo
    out.innerHTML = `
      <strong>FC máx estimada:</strong> ${fcMax} bpm ·
      <strong>Reserva:</strong> ${reserva} bpm
    `;

    // tabela de zonas
    let rows = '';
    for(const p of percentuais){
      const { alvo } = calcKarvonen(a, r, p);
      rows += `
        <tr>
          <td>${p}%</td>
          <td><strong>${alvo} bpm</strong></td>
        </tr>
      `;
    }

    table.innerHTML = `
      <div class="small muted" style="margin-bottom:6px">
        Zonas sugeridas para o nível Fundação (faixa leve a moderada: 50%–65%).
      </div>
      <table style="width:100%;border-collapse:separate;border-spacing:0 6px">
        <thead>
          <tr>
            <th style="text-align:left;">Intensidade</th>
            <th style="text-align:left;">FC alvo (Karvonen)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function validar(){
    const a = +idade.value || 0;
    const r = +fcr.value    || 0;
    return (a>0 && r>0) ? {a,r} : null;
  }

  function calcular(){
    const v = validar();
    if(!v){
      out.textContent = 'Informe idade e FC de repouso.';
      table.innerHTML = '';
      return;
    }
    renderTabela(v.a, v.r);
  }

  function limpar(){
    idade.value = '';
    fcr.value   = '';
    out.textContent   = 'Informe os dados e clique em Calcular.';
    table.innerHTML   = '';
    idade.focus();
  }

  btn.addEventListener('