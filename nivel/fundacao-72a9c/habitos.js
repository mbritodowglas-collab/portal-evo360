<script>
/* ============================================================
   EVO360 · Fundação · Hábitos e Recompensas  —  JS Único
   Mantém layout atual. Sem contador no formulário de meta.
   ============================================================ */

/* ---------- Utils / Storage ---------- */
(() => {
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const LEVEL = (window.NIVEL || 'fundacao-72a9c');
  const NS = `evo:${LEVEL}:`;                     // namespace pro localStorage
  const K = {
    day:   d => `${NS}day:${d}`,                  // rascunho/snapshot de hábitos do dia {habitId:bool}
    saved: d => `${NS}saved:${d}`,                // flag de dia salvo/bloqueado
    dmap:      `${NS}dayCompleteMap`,            // { 'YYYY-MM-DD': 0|1 }
    goals:     `${NS}goals`                      // [ {id, name, target, progress, createdISO} ]
  };
  const LS = {
    get(k, d=null){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v){ localStorage.setItem(k, JSON.stringify(v)); },
    del(k){ localStorage.removeItem(k); }
  };
  const toLocalISO = (v=new Date())=>{
    const d = (v instanceof Date) ? v : new Date(v);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const todayISO = () => toLocalISO(new Date());
  const addDays = (iso, n) => {
    const d = new Date(`${iso}T00:00:00`);
    d.setDate(d.getDate()+n);
    return toLocalISO(d);
  };

  /* ---------- Abas ---------- */
  (function tabs(){
    const map = { rastreador:'#panel-rastreador', recompensas:'#panel-recompensas', ferramentas:'#panel-ferramentas' };
    $$('.tab').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        $$('.tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        $$('.panel').forEach(p=>p.classList.remove('active'));
        const sel = map[btn.dataset.tab];
        if(sel) $(sel)?.classList.add('active');
      });
    });
  })();

  /* ---------- Modelo de hábitos (ids fixos iguais ao HTML) ---------- */
  const HABITS = [
    { id:'forca',        label:'Treino de força / Musculação' },
    { id:'agua',         label:'Ingestão adequada de água' },
    { id:'sono',         label:'Higiene do sono' },
    { id:'movimento',    label:'Movimento do dia' },
    { id:'alimentacao',  label:'Alimentação consciente' },
    { id:'mobilidade',   label:'Mobilidade/Postura' },
    { id:'sol',          label:'Ar livre / Sol' }
  ];
  const ESSENTIALS = ['agua','sono','movimento','alimentacao'];

  /* ============================================================
     Rastreador diário
     ============================================================ */
  (function tracker(){
    const D = todayISO();
    const saved = !!LS.get(K.saved(D), false);

    function setDisabledAll(dis){
      $$('#panel-rastreador input[type="checkbox"]').forEach(cb => cb.disabled = dis);
      const s = $('#btnSaveDay'), c = $('#btnClearDay');
      if(s) s.disabled = dis;
      if(c) c.disabled = dis;
    }

    function loadDay(){
      const snapshot = LS.get(K.day(D), {});
      $$('#panel-rastreador input[type="checkbox"]').forEach(cb=>{
        const id = cb.dataset.habit;
        cb.checked = !!snapshot[id];
      });
      if(saved){
        setDisabledAll(true);
        $('#saveInfo')?.style && ($('#saveInfo').style.display='flex');
      }else{
        setDisabledAll(false);
        $('#saveInfo')?.style && ($('#saveInfo').style.display='none');
      }
    }
    loadDay();

    // rascunho on-change
    $$('#panel-rastreador input[type="checkbox"]').forEach(cb=>{
      cb.addEventListener('change', ()=>{
        if(LS.get(K.saved(D), false)) return;
        const snap = LS.get(K.day(D), {});
        snap[cb.dataset.habit] = cb.checked;
        LS.set(K.day(D), snap);
      });
    });

    // limpar rascunho
    $('#btnClearDay')?.addEventListener('click', ()=>{
      if(LS.get(K.saved(D), false)) return;
      $$('#panel-rastreador input[type="checkbox"]').forEach(cb=> cb.checked=false);
      LS.set(K.day(D), {});
    });

    // salvar dia
    $('#btnSaveDay')?.addEventListener('click', ()=>{
      if(LS.get(K.saved(D), false)) return;

      // snapshot final do dia
      const snap = {};
      $$('#panel-rastreador input[type="checkbox"]').forEach(cb=>{
        snap[cb.dataset.habit] = !!cb.checked;
      });
      LS.set(K.day(D), snap);
      LS.set(K.saved(D), true);

      // completa?
      const complete = ESSENTIALS.every(id => !!snap[id]);

      // dayCompleteMap
      const dmap = LS.get(K.dmap, {});
      dmap[D] = complete ? 1 : 0;
      LS.set(K.dmap, dmap);

      // regra de 3 ausências seguidas → zera meta ativa
      const d0 = D, d_1 = addDays(D,-1), d_2 = addDays(D,-2);
      if ((dmap[d_2]===0) && (dmap[d_1]===0) && (dmap[d0]===0)) {
        const arr = LS.get(K.goals, []);
        if (arr.length) { arr[0].progress = 0; LS.set(K.goals, arr); }
      }

      // se dia completo → avança somente a meta ativa (primeira da lista)
      if (complete) {
        const arr = LS.get(K.goals, []);
        if (arr.length) {
          const g = arr[0];
          g.progress = Math.min(g.target, (g.progress||0) + 1);
          arr[0] = g;
          LS.set(K.goals, arr);
        }
      }

      // UI
      setDisabledAll(true);
      $('#saveInfo')?.style && ($('#saveInfo').style.display='flex');

      // re-render dependentes
      Progress.renderDots();
      Goals.renderList();
    });
  })();

  /* ============================================================
     Progresso (últimos 20 dias por hábito)
     ============================================================ */
  const Progress = (() => {
    function renderDots(){
      const wrap = $('#streakList'); if(!wrap) return;
      wrap.innerHTML = '';
      // construir 20 dias
      const days = [];
      for (let i=19;i>=0;i--) days.push(addDays(todayISO(), -i));

      HABITS.forEach(h=>{
        const row   = document.createElement('div'); row.className='streak-row';
        const label = document.createElement('div'); label.className='streak-label'; label.textContent = h.label;
        const grid  = document.createElement('div'); grid.className='streak-grid';

        days.forEach(d=>{
          const snap = LS.get(K.day(d), null);
          const el = document.createElement('i');
          if (snap && snap.hasOwnProperty(h.id)) {
            el.className = 'dot' + (snap[h.id] ? ' ok' : ' no');
          } else {
            el.className = 'dot';
          }
          grid.appendChild(el);
        });

        row.appendChild(label);
        row.appendChild(grid);
        wrap.appendChild(row);
      });
    }
    return { renderDots };
  })();
  // primeira renderização
  document.addEventListener('DOMContentLoaded', Progress.renderDots);

  /* ============================================================
     Recompensas (Minhas metas)
     - sem contador no formulário
     - lista com excluir sempre disponível
     - a meta mais recente é a ATIVA
     ============================================================ */
  const Goals = (() => {
    const listEl = () => $('#goalsList');
    const esc = s => (s||'').replace(/[&<>"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

    function read(){ return LS.get(K.goals, []); }
    function write(arr){ LS.set(K.goals, arr); }

    function renderEmpty(){
      const el = listEl(); if(!el) return;
      el.innerHTML = '<div class="muted">Nenhuma meta cadastrada ainda.</div>';
    }

    function renderList(){
      const el = listEl(); if(!el) return;
      const arr = read();
      if (!arr.length) { renderEmpty(); return; }

      el.innerHTML = arr.map((g, idx)=>{
        const pct = Math.round(Math.min(100, (g.progress||0) / (g.target||1) * 100));
        return `
          <div class="goal-card" data-id="${g.id}">
            <div class="hdr">
              <div class="name">${esc(g.name)}${idx===0 ? ' <span class="small muted">(ativa)</span>' : ''}</div>
              <div class="small muted">${g.createdISO || ''}</div>
            </div>
            <div class="progress" style="margin-top:6px"><i style="width:${pct}%"></i></div>
            <small class="muted">${g.progress||0}/${g.target} dias completos</small>
            <div class="row-actions" style="margin-top:8px">
              <button class="btn ghost" data-del="${g.id}">Excluir</button>
            </div>
          </div>
        `;
      }).join('');
    }

    // criar meta
    $('#btnSaveGoal')?.addEventListener('click', ()=>{
      const name  = ($('#goal_name')?.value || '').trim();
      const days  = Math.max(1, Math.min(60, parseInt($('#goal_days')?.value||'0',10) || 0));
      if(!name || !days) return;
      const arr = read();
      arr.unshift({ id: Date.now().toString(36), name, target: days, progress: 0, createdISO: todayISO() });
      write(arr);
      if($('#goal_name')) $('#goal_name').value='';
      if($('#goal_days')) $('#goal_days').value='';
      renderList();
    });

    // limpar formulário (não altera metas)
    $('#btnClearGoal')?.addEventListener('click', ()=>{
      if($('#goal_name')) $('#goal_name').value='';
      if($('#goal_days')) $('#goal_days').value='';
    });

    // excluir (sempre permitido)
    listEl()?.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-del]'); if(!btn) return;
      const id = btn.dataset.del;
      const arr = read().filter(g => g.id !== id);
      write(arr);
      renderList();
    });

    // primeira render
    document.addEventListener('DOMContentLoaded', renderList);

    return { renderList };
  })();

  /* ============================================================
     Ferramentas — Calculadora de Água (isolada)
     ============================================================ */
  (function waterTool(){
    const peso = $('#w_peso'), out = $('#w_out');
    if(!peso || !out) return;
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

})();
</script>