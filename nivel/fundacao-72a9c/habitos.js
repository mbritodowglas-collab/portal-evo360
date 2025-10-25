// ===== Helpers =====
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const LS = {
  get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
  del:(k)=>localStorage.removeItem(k)
};
const iso = d => new Date(d).toISOString().slice(0,10);
const todayISO = () => iso(new Date());

// Keys por nível
const LEVEL = window.NIVEL || "fundacao-72a9c";
const K = {
  dayLog:   (date) => `hab_${LEVEL}_day_${date}`,      // marcações do dia (checkboxes)
  daySaved: (date) => `hab_${LEVEL}_saved_${date}`,    // flag bloqueio do dia
  daysDone:         `hab_${LEVEL}_days_complete`,      // contagem acumulada de dias completos
  goalCurrent:      `hab_${LEVEL}_goal_current`,       // meta ativa {name, target, startedISO, progressDays}
  goalArchive:      `hab_${LEVEL}_goal_archive`        // metas anteriores (array)
};

// ===== Tabs =====
(function tabs(){
  const map = { rastreador: '#panel-rastreador', recompensas:'#panel-recompensas', ferramentas:'#panel-ferramentas' };
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.panel').forEach(p=>p.classList.remove('active'));
      $(map[btn.dataset.tab]).classList.add('active');
    });
  });
})();

// ===== Rastreador: carregar estado do dia =====
const today = todayISO();
const savedToday = !!LS.get(K.daySaved(today), false);

function setDisabledAll(disabled){
  $$('#panel-rastreador input[type="checkbox"]').forEach(cb => cb.disabled = disabled);
  $('#btnSaveDay').disabled = disabled;
  $('#btnClearDay').disabled = disabled;
}
function loadDay(){
  const log = LS.get(K.dayLog(today), {});
  $$('#panel-rastreador input[type="checkbox"]').forEach(cb=>{
    const id = cb.dataset.habit;
    cb.checked = !!log[id];
  });
  if(savedToday){
    setDisabledAll(true);
    $('#saveInfo').style.display = 'flex';
  }else{
    setDisabledAll(false);
    $('#saveInfo').style.display = 'none';
  }
}
loadDay();

// Limpar marcações (sem salvar)
$('#btnClearDay').addEventListener('click', ()=>{
  if(savedToday) return;
  $$('#panel-rastreador input[type="checkbox"]').forEach(cb=> cb.checked = false);
  LS.set(K.dayLog(today), {}); // limpa rascunho do dia
});

// Auto-rascunho ao clicar
$$('#panel-rastreador input[type="checkbox"]').forEach(cb=>{
  cb.addEventListener('change', ()=>{
    if(savedToday) return;
    const log = LS.get(K.dayLog(today), {});
    log[cb.dataset.habit] = cb.checked;
    LS.set(K.dayLog(today), log);
  });
});

// Salvar dia
$('#btnSaveDay').addEventListener('click', ()=>{
  if(savedToday) return;

  const log = LS.get(K.dayLog(today), {});
  // Essenciais
  const essentials = ['agua','sono','movimento','alimentacao'];
  const allEssential = essentials.every(h => !!log[h]);

  // Persiste “dia salvo” (bloqueia)
  LS.set(K.daySaved(today), true);

  // Atualiza contagem de dias completos (se bateu essenciais)
  if(allEssential){
    const done = +LS.get(K.daysDone, 0) + 1;
    LS.set(K.daysDone, done);
    // Avança meta atual (se existir)
    const cur = LS.get(K.goalCurrent, null);
    if(cur){
      cur.progressDays = Math.min(cur.target, (cur.progressDays||0) + 1);
      LS.set(K.goalCurrent, cur);
    }
  }

  // UI
  setDisabledAll(true);
  $('#saveInfo').style.display = 'flex';

  // Atualiza painel de metas (progresso)
  renderGoal();
});

// ===== Recompensas =====
function renderGoalsArchive(){
  const list = $('#goalsList');
  const arc = LS.get(K.goalArchive, []);
  list.innerHTML = '';
  if(!arc.length){
    list.innerHTML = '<div class="muted">Nenhuma meta cadastrada ainda.</div>';
    return;
  }
  arc.forEach((g,i)=>{
    const pct = Math.round(Math.min(100, (g.progressDays/g.target)*100));
    const node = document.createElement('div');
    node.className = 'goal-card';
    node.innerHTML = `
      <div class="hdr">
        <div class="name">${g.name || 'Meta'}</div>
        <small>${g.startedISO || '—'}</small>
      </div>
      <div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div>
      <small>${g.progressDays||0}/${g.target} dias completos</small>
    `;
    list.appendChild(node);
  });
}

function renderGoal(){
  const cur = LS.get(K.goalCurrent, null);
  const wrap = $('#goalCurrentWrap');
  if(!cur){ wrap.style.display='none'; renderGoalsArchive(); return; }
  wrap.style.display = '';
  $('#goalCurrentName').textContent = cur.name || 'Meta';
  const pct = Math.round(Math.min(100, (cur.progressDays/cur.target)*100));
  $('#goalProgress').style.width = pct + '%';
  $('#goalProgressText').textContent = `Progresso: ${cur.progressDays}/${cur.target} dias completos`;
  renderGoalsArchive();
}
renderGoal();

// Salvar meta (ativa e vai para topo)
$('#btnSaveGoal').addEventListener('click', ()=>{
  const name = $('#goal_name').value.trim();
  const target = Math.max(1, Math.min(60, +$('#goal_days').value || 0));
  if(!name || !target){ return; }

  // Se já havia meta atual, manda para o arquivo
  const prev = LS.get(K.goalCurrent, null);
  if(prev){
    const arc = LS.get(K.goalArchive, []);
    arc.unshift(prev);
    LS.set(K.goalArchive, arc);
  }

  const cur = {
    name, target,
    startedISO: todayISO(),
    progressDays: 0
  };
  LS.set(K.goalCurrent, cur);

  // Limpa inputs e atualiza UI
  $('#goal_name').value = '';
  $('#goal_days').value = '';
  renderGoal();
});

// Limpar meta atual (move para arquivo)
$('#btnClearGoal').addEventListener('click', ()=>{
  const cur = LS.get(K.goalCurrent, null);
  if(cur){
    const arc = LS.get(K.goalArchive, []);
    arc.unshift(cur);
    LS.set(K.goalArchive, arc);
    LS.del(K.goalCurrent);
    renderGoal();
  }
});

// ===== Ferramentas: água =====
(function waterTool(){
  const peso = $('#w_peso'), out = $('#w_out');
  function calc(){
    const p = +peso.value || 0;
    if(p>0){
      const low = Math.round(p*30), high = Math.round(p*35);
      out.innerHTML = `Meta sugerida: <strong>${low}–${high} ml/dia</strong> (30–35 ml/kg).`;
    }else{
      out.textContent = 'Informe seu peso para estimar a meta diária de água.';
    }
  }
  peso.addEventListener('input', calc);
  calc();
})();

/* ============================================================
   PROGRESSO 21 DIAS — render por hábito (sem alterar lógica atual)
   ============================================================ */

(function Progress21(){
  const NIVEL = window.NIVEL || 'fundacao-72a9c';
  const SAVE_BUTTON_ID = 'btnSalvarHabitos';   // id do botão “Salvar dia” que você já usa
  const LIST_SELECTOR  = '.habit-list input[type="checkbox"]'; // ajuste se seu seletor for outro
  const WRAP_ID        = 'habProgressWrap';    // container do quadro

  // util
  const iso = d => new Date(d).toISOString().slice(0,10);
  const today = new Date();
  const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate()+n); return x; };

  // chave de armazenamento diário deste complemento
  function dayKey(dateISO){ return `hab_day_${NIVEL}_${dateISO}`; }

  // coleta os hábitos (id e rótulo). Não muda sua estrutura: busca os checkboxes existentes.
  function collectHabits(){
    const inputs = Array.from(document.querySelectorAll(LIST_SELECTOR));
    return inputs.map((inp, idx) => {
      const id = inp.dataset.habitId || inp.id || inp.name || `h${idx+1}`;
      let label = '';
      // tenta pegar o texto do label associado
      if (inp.id) {
        const l = document.querySelector(`label[for="${inp.id}"]`);
        if (l) label = l.textContent.trim();
      }
      if (!label) {
        // fallback: tenta achar um label no ancestral
        const parentLabel = inp.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) label = id;
      return { id, label };
    });
  }

  // grava o que foi marcado hoje (lista de ids) - sem atrapalhar seu fluxo atual
  function saveTodaySnapshot(){
    const inputs = Array.from(document.querySelectorAll(LIST_SELECTOR));
    const checkedIds = inputs
      .filter(i => i.checked)
      .map((i, idx) => i.dataset.habitId || i.id || i.name || `h${idx+1}`);
    const k = dayKey(iso(today));
    localStorage.setItem(k, JSON.stringify(checkedIds));
  }

  // lê a lista de ids marcados de uma data específica (se existir)
  function readDaySnapshot(dateISO){
    try{
      const raw = localStorage.getItem(dayKey(dateISO));
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }

  // constrói 21 dias (do mais antigo ao mais recente)
  function build21Days(){
    const days = [];
    for (let i=20; i>=0; i--){
      const d = addDays(today, -i);
      days.push( iso(d) );
    }
    return days;
  }

  // render
  function renderProgress21(){
    const wrap = document.getElementById(WRAP_ID);
    if(!wrap) return;
    const habits = collectHabits();
    const days = build21Days();

    // limpa
    wrap.innerHTML = '';

    habits.forEach(h => {
      const block = document.createElement('div');
      block.className = 'streak-block';

      const title = document.createElement('div');
      title.className = 'streak-title';
      title.textContent = h.label;
      block.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'streak-grid';

      days.forEach(dayISO => {
        const dot = document.createElement('div');
        dot.className = 'dot na';
        const snap = readDaySnapshot(dayISO);

        if (snap && Array.isArray(snap)) {
          // houve “salvar dia” → se o hábito está em snap = verde; senão, vermelho
          dot.className = snap.includes(h.id) ? 'dot ok' : 'dot no';
        } else {
          // sem registro nesse dia
          dot.className = 'dot na';
        }

        dot.title = `${h.label} — ${dayISO}`;
        grid.appendChild(dot);
      });

      block.appendChild(grid);
      wrap.appendChild(block);
    });
  }

  // amarra no botão “Salvar dia” sem interferir no handler existente
  document.getElementById(SAVE_BUTTON_ID)?.addEventListener('click', () => {
    // cria o snapshot leve deste complemento
    saveTodaySnapshot();
    // re-render
    renderProgress21();

    // dica visual opcional (não quebra nada)
    try{
      const ok = document.createElement('div');
      ok.className = 'alert';
      ok.textContent = 'Dia salvo. O quadro de 21 dias foi atualizado.';
      ok.style.marginTop = '10px';
      const parent = document.getElementById(WRAP_ID)?.parentElement;
      if(parent){ parent.appendChild(ok); setTimeout(()=> ok.remove(), 2500); }
    }catch(_){}
  });

  // primeira renderização
  window.addEventListener('DOMContentLoaded', renderProgress21);
})();