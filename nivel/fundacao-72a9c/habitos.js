/* ====== Card 3 — Hábitos e Recompensas ====== */
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const LS = {
  get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
  del:(k)=>localStorage.removeItem(k),
};

const NIVEL = window.NIVEL || 'fundacao-72a9c';
const KEY_LOG_PREFIX   = `habitos_log_${NIVEL}_`;          // por data: habitos_log_<nivel>_YYYY-MM-DD -> {checked:[..], complete:true}
const KEY_DONE_COUNT   = `habitos_daysComplete_${NIVEL}`;   // número total de dias completos
const KEY_LAST_SAVED   = `habitos_lastSaved_${NIVEL}`;      // última data salva (YYYY-MM-DD)
const KEY_GOALS        = `recomp_goals_${NIVEL}`;           // array de metas [{id,nome,alvo,createdAt,achievedAt?}]
const todayISO = () => new Date().toISOString().slice(0,10);

/* ---------- abas ---------- */
(function tabs(){
  const map = { trk:'#panel-trk', rc:'#panel-rc', tools:'#panel-tools' };
  $$('.tab').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const t = btn.dataset.tab;
      $$('.tab').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      document.querySelector(map[t])?.classList.add('active');
    });
  });
})();

/* ---------- RASTREADOR: salvar dia, bloquear até amanhã ---------- */
function updateTrackerUI(){
  const last = LS.get(KEY_LAST_SAVED, null);
  const isTodaySaved = last === todayISO();
  const status = $('#trk_status');

  // travar/destravar
  $$('.hb').forEach(hb => { hb.disabled = isTodaySaved; });
  if($('#trk_save'))  $('#trk_save').disabled  = isTodaySaved;
  if($('#trk_clear')) $('#trk_clear').disabled = isTodaySaved;

  if(isTodaySaved){
    status.innerHTML = '✅ Dia salvo. As marcações de hoje estão bloqueadas. Volte amanhã.';
  } else {
    status.textContent = '—';
  }
}

function computeDayComplete(){
  const boxes = $$('.hb');
  return boxes.length > 0 && boxes.every(hb => hb.checked);
}

function saveDay(){
  const date = todayISO();
  const checked = $$('.hb').filter(hb=>hb.checked).map(hb=>hb.value);
  const complete = computeDayComplete();

  // salva log do dia
  LS.set(KEY_LOG_PREFIX + date, { checked, complete });

  // se for completo e ainda não foi salvo hoje, incrementa contador
  const last = LS.get(KEY_LAST_SAVED, null);
  if(last !== date){
    if(complete){
      const done = (LS.get(KEY_DONE_COUNT, 0) || 0) + 1;
      LS.set(KEY_DONE_COUNT, done);
      renderGoals(); // atualiza progressos
    }
    LS.set(KEY_LAST_SAVED, date);
  }

  updateTrackerUI();
}

function clearMarks(){
  // se já salvou hoje, não permite limpar
  if(LS.get(KEY_LAST_SAVED,null) === todayISO()){
    $('#trk_status').textContent = 'O dia já foi salvo; não é possível limpar as marcações de hoje.';
    return;
  }
  $$('.hb').forEach(hb => hb.checked = false);
  $('#trk_status').textContent = 'Marcações limpas (não salvas).';
}

$('#trk_save')?.addEventListener('click', saveDay);
$('#trk_clear')?.addEventListener('click', clearMarks);
updateTrackerUI();

/* ---------- METAS (recompensas): salvar e listar ---------- */
function renderGoals(){
  const list = $('#rc_lista');
  const goals = LS.get(KEY_GOALS, []) || [];
  const done  = LS.get(KEY_DONE_COUNT, 0) || 0;
  if($('#rc_done')) $('#rc_done').textContent = String(done);

  if(goals.length === 0){
    list.innerHTML = '<div class="calc-out">Nenhuma meta cadastrada ainda.</div>';
    return;
  }

  list.innerHTML = goals.map(g=>{
    // marca como alcançada se atingiu e ainda não marcado
    if(done >= g.alvo && !g.achievedAt){
      g.achievedAt = todayISO();
    }
    const pct = Math.max(0, Math.min(100, Math.round(done / g.alvo * 100)));
    const status = g.achievedAt
      ? `<span class="small muted">Alcançada em ${g.achievedAt}</span>`
      : `<span class="small muted">${done}/${g.alvo} dias completos</span>`;

    return `
      <div class="item" data-id="${g.id}">
        <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;width:100%">
          <div style="display:flex;flex-direction:column;gap:4px;flex:1">
            <strong>${g.nome}</strong>
            <div class="progress"><span style="width:${pct}%"></span></div>
            ${status}
          </div>
          <button class="btn ghost" data-del="${g.id}">Excluir</button>
        </div>
      </div>`;
  }).join('');

  // salvar possíveis alterações (achievedAt)
  LS.set(KEY_GOALS, goals);

  // handlers de exclusão
  list.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.getAttribute('data-del');
      const arr = (LS.get(KEY_GOALS, [])||[]).filter(g=> String(g.id) !== String(id));
      LS.set(KEY_GOALS, arr);
      renderGoals();
    });
  });
}

function saveGoal(){
  const nome = ($('#rc_nome')?.value||'').trim();
  const alvo = Math.max(1, Math.min(60, parseInt($('#rc_alvo')?.value||'0',10)));
  if(!nome){ alert('Descreva a recompensa.'); return; }
  if(!alvo){ alert('Informe o número de dias completos para merecer.'); return; }

  const goals = LS.get(KEY_GOALS, []) || [];
  goals.push({
    id: Date.now(),
    nome, alvo,
    createdAt: todayISO()
  });
  LS.set(KEY_GOALS, goals);

  if($('#rc_nome')) $('#rc_nome').value = '';
  if($('#rc_alvo')) $('#rc_alvo').value = '20';
  renderGoals();
}

$('#rc_save')?.addEventListener('click', saveGoal);
renderGoals();