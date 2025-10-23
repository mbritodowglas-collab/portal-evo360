/* tarefas-orientacoes.js (v16) */

/* -------------------------------------------
   Utilidades básicas
------------------------------------------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* -------------------------------------------
   Dica/Tarefa do dia (Drip) – com proteção
------------------------------------------- */
(function initDripSafely() {
  try {
    if (!window.Drip) throw new Error('Drip indisponível');
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_tarefas';
    const MAX_DAYS = 60;

    const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
    const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

    async function loadJSON(url){
      try{
        const r = await fetch(url, { cache: 'no-store' });
        if(!r.ok) throw 0;
        return await r.json();
      }catch(_){ return null; }
    }

    (async () => {
      const data = await loadJSON(window.DATA_DICAS);
      const meta  = $('#dica-meta');
      const texto = $('#dica-texto');
      const prev  = $('#btnPrev');
      const next  = $('#btnNext');

      const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
      let day = (Drip.LS && Drip.LS.get) ? Drip.LS.get(VIEW_KEY, todayIdx) : todayIdx;

      function render(){
        day = Math.max(1, Math.min(day, todayIdx));
        const item = data && data[day-1];
        if(item){
          const cat = item.categoria === 'treino' ? 'Treino' : 'Nutrição';
          meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${cat}`;
          texto.textContent = item.texto || '—';
        } else {
          meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
          texto.textContent = 'Dica indisponível.';
        }
        prev.disabled = (day <= 1);
        next.disabled = (day >= todayIdx);
        Drip.LS?.set?.(VIEW_KEY, day);
      }

      prev?.addEventListener('click', ()=>{ day--; render(); });
      next?.addEventListener('click', ()=>{ day++; render(); });
      render();
    })();
  } catch (err) {
    // Se o Drip falhar, não quebra o restante da página
    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    if (meta)  meta.textContent  = 'Dia —';
    if (texto) texto.textContent = 'Dica indisponível no momento.';
  }
})();

/* -------------------------------------------
   Tabs simples (Calculadoras)
------------------------------------------- */
(function initTabs(){
  const tabs = $$('.tab');
  const panels = {
    karvonen: '#panel-karvonen',
    tmb:      '#panel-tmb'
  };
  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');
      $$('.panel').forEach(p=>p.classList.remove('active'));
      const sel = panels[tb.dataset.tab];
      if (sel) $(sel)?.classList.add('active');
    });
  });
})();

/* -------------------------------------------
   Calculadora Karvonen (com tabela 50–80%)
------------------------------------------- */
function calcKarvonenTable(age, fcr){
  const a = +age;
  const r = +fcr;
  if(!(a>0 && r>0)) return null;
  const fcMax = 220 - a;
  const result = {
    fcMax,
    alvo50_65: [ // faixa sugerida ao nível
      Math.round(((fcMax - r) * 0.50) + r),
      Math.round(((fcMax - r) * 0.65) + r)
    ],
    linhas: []
  };
  for(let pct = 50; pct <= 80; pct += 5){
    const frac = pct / 100;
    const alvo = Math.round(((fcMax - r) * frac) + r);
    result.linhas.push({ pct, bpm: alvo });
  }
  return result;
}

function renderKarvonen(){
  const idade = $('#k_idade');
  const fcr   = $('#k_fcr');
  const out   = $('#k_out');
  const tbl   = $('#k_table');

  const data = calcKarvonenTable(idade?.value, fcr?.value);

  if(!data){
    if(out) out.textContent = 'Informe idade e FC de repouso e clique em Calcular.';
    if(tbl) tbl.innerHTML   = '';
    return;
  }

  // resumo
  if(out){
    out.innerHTML =
      `FC máx. estimada: <strong>${data.fcMax} bpm</strong><br>` +
      `<span class="small muted">Faixa sugerida (Fundação): ${data.alvo50_65[0]}–${data.alvo50_65[1]} bpm (50–65%).</span>`;
  }

  // tabela 50–80%
  if(tbl){
    const rows = data.linhas
      .map(l => `<tr><td>${l.pct}%</td><td><strong>${l.bpm} bpm</strong></td></tr>`)
      .join('');
    tbl.innerHTML =
      `<div class="small muted" style="margin-bottom:6px">Zonas por FC de Reserva</div>
       <table class="table-compact" style="width:100%">
         <thead><tr><th style="text-align:left">Intensidade</th><th style="text-align:left">Alvo</th></tr></thead>
         <tbody>${rows}</tbody>
       </table>`;
  }
}

/* -------------------------------------------
   Calculadora TMB (Mifflin-St Jeor)
------------------------------------------- */
function renderTMB(){
  const peso = $('#t_peso');
  const alt  = $('#t_altura');
  const ida  = $('#t_idade');
  const sex  = $('#t_sexo');
  const out  = $('#t_out');

  const p = +peso?.value || 0;
  const h = +alt?.value  || 0;
  const i = +ida?.value  || 0;
  const s = sex?.value   || 'f';

  if(!(p>0 && h>0 && i>0)){
    if(out) out.textContent = 'Preencha peso, altura e idade.';
    return;
  }
  const base = (10*p) + (6.25*h) - (5*i) + (s==='f' ? -161 : 5);
  if(out){
    out.innerHTML = `Sua TMB estimada: <strong>${Math.round(base)} kcal/dia</strong><br>` +
                    `<span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
  }
}

/* -------------------------------------------
   Bind dos botões/inputs ao carregar DOM
------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Karvonen
  $('#k_calcBtn')?.addEventListener('click', renderKarvonen);
  $('#k_clearBtn')?.addEventListener('click', () => {
    $('#k_idade').value = '';
    $('#k_fcr').value   = '';
    $('#k_out').textContent = 'Informe os dados e clique em Calcular.';
    $('#k_table').innerHTML = '';
    $('#k_idade').focus();
  });

  // (Opcional) permitir Enter nos campos disparar cálculo
  ['k_idade','k_fcr'].forEach(id => {
    $(`#${id}`)?.addEventListener('keydown', e=>{
      if(e.key === 'Enter'){ e.preventDefault(); renderKarvonen(); }
    });
  });

  // TMB
  ['t_peso','t_altura','t_idade','t_sexo'].forEach(id => {
    $(`#${id}`)?.addEventListener('input', renderTMB);
    $(`#${id}`)?.addEventListener('change', renderTMB);
  });
});