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

  // === chaves usadas pelo rastreador e pela UI oficial de metas ===
  const K = {
    dayLog:      (date) => `hab_${LEVEL}_day_${date}`,     // { agua:true, ... }
    daySaved:    (date) => `hab_${LEVEL}_saved_${date}`,    // true/false
    goalCurrent:        `hab_${LEVEL}_goal_current`,        // {name,target,startedISO,progressDays,essentials?}
    goalArchive:        `hab_${LEVEL}_goal_archive`         // array de metas anteriores
  };

  // util: ISO local (yyyy-mm-dd)
  const iso = (d=new Date())=>{
    const x = new Date(d);
    const y = x.getFullYear(), m = String(x.getMonth()+1).padStart(2,'0'), dd = String(x.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };

  // ---- Helpers para essenciais do formulário (se existir o checkbox de essenciais) ----
  function getSelectedEssentials(){
    const vals = $$('.goal-essential:checked').map(i=>i.value);
    // fallback: se não houver checkboxes, exige pelo menos “agua”
    return vals.length ? vals : ['agua'];
  }

  // ---- Render de segurança (caso a UI oficial não esteja exposta em window) ----
  function escapeHTML(s){ return (s||'').replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  function fallbackRenderGoals(){
    const box = $('#goalsList');
    if(!box) return;

    const cur = LS.get(K.goalCurrent, null);
    const arc = LS.get(K.goalArchive, []);
    box.innerHTML = '';

    if(!cur && !arc.length){
      box.innerHTML = '<div class="muted">Nenhuma meta cadastrada ainda.</div>';
      return;
    }

    // card da meta ATIVA
    if(cur){
      const pctCur = Math.round(Math.min(100, ( (cur.progressDays||0) / (cur.target||1) ) * 100));
      const nodeCur = document.createElement('div');
      nodeCur.className = 'goal-card';
      nodeCur.innerHTML = `
        <div class="hdr">
          <div class="name">${escapeHTML(cur.name || 'Meta ativa')}</div>
          <small>${cur.startedISO || '—'}</small>
        </div>
        <div class="progress" style="margin-top:6px"><i style="width:${pctCur}%"></i></div>
        <small>${cur.progressDays||0}/${cur.target} dias completos · <span class="muted">Meta ativa</span></small>
      `;
      box.appendChild(nodeCur);
    }

    // cards do ARQUIVO
    arc.forEach((g,i)=>{
      const pct = Math.round(Math.min(100, ((g.progressDays||0)/(g.target||1))*100));
      const node = document.createElement('div');
      node.className = 'goal-card';
      node.innerHTML = `
        <div class="hdr">
          <div class="name">${escapeHTML(g.name || 'Meta')}</div>
          <small>${g.startedISO || '—'}</small>
        </div>
        <div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div>
        <small>${g.progressDays||0}/${g.target} dias completos</small>
        <div class="row-actions" style="margin-top:8px">
          <button class="btn ghost" data-del="${i}">Excluir</button>
        </div>
      `;
      box.appendChild(node);
    });
  }

  // disponibiliza um hook global opcional (se a UI oficial não expuser nada)
  window.__renderGoalsFallback = fallbackRenderGoals;

  // ---- Salvar meta (agora sincroniza com a UI oficial) ----
  $('#btnSaveGoal')?.addEventListener('click', ()=>{
    const name = $('#goal_name')?.value.trim();
    const target = Math.max(1, Math.min(60, +($('#goal_days')?.value || 0)));
    if(!name || !target) return;

    const essentials = getSelectedEssentials();

    // se já havia meta atual, joga para o ARQUIVO
    const prev = LS.get(K.goalCurrent, null);
    if(prev){
      const arc = LS.get(K.goalArchive, []);
      arc.unshift(prev);
      LS.set(K.goalArchive, arc);
    }

    // define a NOVA meta ATIVA, zerada
    const cur = {
      name,
      target,
      startedISO: iso(new Date()),
      progressDays: 0,
      essentials
    };
    LS.set(K.goalCurrent, cur);

    // limpa campos
    if($('#goal_name')) $('#goal_name').value = '';
    if($('#goal_days')) $('#goal_days').value = '';
    // (se houver checkboxes de essenciais, restaura padrão sugerido)
    $$('.goal-essential').forEach(cb => {
      cb.checked = ['agua','sono','movimento','alimentacao'].includes(cb.value);
    });

    // re-render imediato:
    // 1) tenta usar os renderizadores oficiais, se existirem
    if (typeof window.renderGoal === 'function')      window.renderGoal();
    else if (typeof window.renderGoalsArchive === 'function') window.renderGoalsArchive();
    else                                              fallbackRenderGoals();
  });

  // ---- Excluir meta arquivada via lista (compatível com o fallback) ----
  document.getElementById('goalsList')?.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-del]');
    if(!btn) return;
    const idx = +btn.dataset.del;
    const arc = LS.get(K.goalArchive, []);
    if(Number.isInteger(idx) && idx>=0 && idx<arc.length){
      arc.splice(idx,1);
      LS.set(K.goalArchive, arc);
      if (typeof window.renderGoalsArchive === 'function') window.renderGoalsArchive();
      else fallbackRenderGoals();
    }
  });

  // ---- Atualiza metas após “Salvar dia” (pra refletir progresso) ----
  document.getElementById('btnSaveDay')?.addEventListener('click', ()=>{
    // dá tempo do script do rastreador persistir e atualizar progressDays
    setTimeout(()=>{
      if (typeof window.renderGoal === 'function') window.renderGoal();
      else if (typeof window.renderGoalsArchive === 'function') window.renderGoalsArchive();
      else fallbackRenderGoals();
    }, 0);
  });

  // ---- Força os rótulos das abas (se algum cache/JS antigo sobrescrever) ----
  document.addEventListener('DOMContentLoaded', () => {
    const tabHab = document.querySelector('.tabs .tab[data-tab="rastreador"]');
    const tabRec = document.querySelector('.tabs .tab[data-tab="recompensas"]');
    const tabFer = document.querySelector('.tabs .tab[data-tab="ferramentas"]');
    if (tabHab) tabHab.textContent = 'Hábitos';
    if (tabRec) tabRec.textContent = 'Recompensas';
    if (tabFer) tabFer.textContent = 'Ferramentas';

    // primeira renderização “de segurança” (caso os oficiais não rodem)
    if (typeof window.renderGoalsArchive !== 'function' && typeof window.renderGoal !== 'function'){
      fallbackRenderGoals();
    }
  });
})();
</script>