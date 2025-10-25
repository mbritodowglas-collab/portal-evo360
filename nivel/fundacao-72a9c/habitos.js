<script>
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

  // Atualiza painel de metas (progresso) — função agora só mantém lista em “Minhas metas”
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
      <div class="row-actions" style="margin-top:8px">
        <button class="btn ghost" data-del="${i}">Excluir</button>
      </div>
    `;
    list.appendChild(node);
  });
}

// ⚠️ Agora esta função apenas oculta o bloco do formulário e mantém a lista
function renderGoal(){
  const wrap = $('#goalCurrentWrap');
  if (wrap) wrap.style.display = 'none'; // some com “Alvo/Progresso” do formulário
  renderGoalsArchive();
}
renderGoal();

// Salvar meta (ativa -> vai para arquivo, e formulário fica limpo)
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

  const cur = { name, target, startedISO: todayISO(), progressDays: 0 };
  LS.set(K.goalCurrent, cur);

  // Limpa inputs e atualiza apenas “Minhas metas”
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

// Exclusão somente na lista de metas (delegado; não interfere nas tabs)
document.getElementById('goalsList')?.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-del]');
  if(!btn) return;
  const idx = +btn.dataset.del;
  const arc = LS.get(K.goalArchive, []);
  if (Number.isInteger(idx) && idx >= 0 && idx < arc.length) {
    arc.splice(idx, 1);
    LS.set(K.goalArchive, arc);
    renderGoalsArchive();
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
</script>