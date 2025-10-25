<script>
(function(){
  const LEVEL = window.NIVEL || "fundacao-72a9c";
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const LS = {
    get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
    set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
    del:(k)=>localStorage.removeItem(k)
  };

  const K = {
    dayLog:   (date) => `hab_${LEVEL}_day_${date}`,
    daySaved: (date) => `hab_${LEVEL}_saved_${date}`,
  };

  const GOALS_KEY = `hab_${LEVEL}_goals_list`;

  const iso = (d=new Date())=>{
    const x = new Date(d);
    const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,'0'), dd = String(x.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };
  const addDays = (dateISO, n)=>{ const d=new Date(dateISO+'T00:00:00'); d.setDate(d.getDate()+n); return iso(d); };

  function readGoals(){ return LS.get(GOALS_KEY, []); }
  function saveGoals(arr){ LS.set(GOALS_KEY, arr); }

  function getSelectedEssentials(){
    const vals = $$('.goal-essential:checked').map(i=>i.value);
    return vals.length ? vals : ['agua'];
  }

  function computeProgress(goal){
    if(!goal || !goal.startedISO) return {done:0, resetAt:null};

    let done = 0;
    let resetAt = null;
    let streakZeros = 0;

    const today = iso(new Date());
    for(let d = goal.startedISO; d <= today; d = addDays(d, 1)){
      const saved = !!LS.get(K.daySaved(d), false);
      if(!saved){ continue; }

      const log = LS.get(K.dayLog(d), {});
      const ok = (goal.essentials||[]).every(id => !!log[id]);

      if(ok){
        if(resetAt) { /* continua após reset */ }
        done += 1;
        streakZeros = 0;
      }else{
        streakZeros += 1;
        if(streakZeros >= 3){
          resetAt = d;
          done = 0;
          streakZeros = 3;
        }
      }
    }
    return {done, resetAt};
  }

  function renderGoals(){
    const box = $('#goalsList');
    if(!box) return;

    const arr = readGoals();
    if(!arr.length){
      box.innerHTML = '<div class="muted">Nenhuma meta cadastrada ainda.</div>';
      return;
    }

    box.innerHTML = '';
    arr.forEach((g, idx)=>{
      const {done} = computeProgress(g);
      const pct = Math.max(0, Math.min(100, Math.round((done/(g.target||1))*100)));

      const card = document.createElement('div');
      card.className = 'goal-card';
      card.innerHTML = `
        <div class="hdr">
          <div class="name">${escapeHTML(g.name || 'Meta')}</div>
          <small>${g.startedISO || '—'}</small>
        </div>
        <div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div>
        <small>${done}/${g.target} dias completos</small>
        <div class="row-actions" style="margin-top:8px">
          <button class="btn ghost" data-del="${idx}">Excluir</button>
        </div>
      `;
      box.appendChild(card);
    });
  }

  function escapeHTML(s){ return (s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  // Formulário
  $('#btnSaveGoal')?.addEventListener('click', ()=>{
    const name = $('#goal_name')?.value.trim();
    const target = Math.max(1, Math.min(60, +($('#goal_days')?.value || 0)));
    const essentials = getSelectedEssentials();
    if(!name || !target) return;

    const arr = readGoals();
    arr.unshift({
      id: Date.now().toString(36),
      name,
      target,
      essentials,
      startedISO: iso(new Date())
    });
    saveGoals(arr);

    if($('#goal_name')) $('#goal_name').value = '';
    if($('#goal_days')) $('#goal_days').value = '';
    $$('.goal-essential').forEach(cb => { cb.checked = ['agua','sono','movimento','alimentacao'].includes(cb.value); });

    renderGoals();
  });

  $('#btnClearGoal')?.addEventListener('click', ()=>{
    if($('#goal_name')) $('#goal_name').value = '';
    if($('#goal_days')) $('#goal_days').value = '';
  });

  // Excluir meta
  $('#goalsList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-del]');
    if(!btn) return;
    const idx = +btn.dataset.del;
    const arr = readGoals();
    if(Number.isInteger(idx) && idx>=0 && idx<arr.length){
      arr.splice(idx,1);
      saveGoals(arr);
      renderGoals();
    }
  });

  // Atualiza metas após salvar dia
  document.getElementById('btnSaveDay')?.addEventListener('click', ()=>{
    setTimeout(renderGoals, 0);
  });

  document.addEventListener('DOMContentLoaded', renderGoals);
})();

// força rótulos das abas (se algum cache/JS antigo sobrescrever)
document.addEventListener('DOMContentLoaded', () => {
  const tabHab = document.querySelector('.tabs .tab[data-tab="rastreador"]');
  const tabRec = document.querySelector('.tabs .tab[data-tab="recompensas"]');
  const tabFer = document.querySelector('.tabs .tab[data-tab="ferramentas"]');
  if (tabHab) tabHab.textContent = 'Hábitos';
  if (tabRec) tabRec.textContent = 'Recompensas';
  if (tabFer) tabFer.textContent = 'Ferramentas';
});
</script>