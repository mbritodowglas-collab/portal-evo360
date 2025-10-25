<script>
/* ============================================================
   PROGRESSO 21 DIAS — render por hábito (ajuste de IDs/seletores)
   ============================================================ */
(function Progress21(){
  const NIVEL = window.NIVEL || 'fundacao-72a9c';
  const SAVE_BUTTON_ID = 'btnSaveDay';                        // ← botão correto
  const LIST_SELECTOR  = '#panel-rastreador input[type="checkbox"][data-habit]'; // ← checkboxes do painel
  const WRAP_ID        = 'streakList';                        // ← container que já existe no HTML

  // util
  const iso = d => new Date(d).toISOString().slice(0,10);
  const today = new Date();
  const addDays = (dt, n) => { const x = new Date(dt); x.setDate(x.getDate()+n); return x; };

  // chave de armazenamento diário deste complemento
  function dayKey(dateISO){ return `hab_day_${NIVEL}_${dateISO}`; }

  // coleta os hábitos (id e rótulo) a partir dos checkboxes existentes
  function collectHabits(){
    const inputs = Array.from(document.querySelectorAll(LIST_SELECTOR));
    return inputs.map((inp, idx) => {
      const id = inp.dataset.habit || inp.id || inp.name || `h${idx+1}`;
      let label = '';

      if (inp.id) {
        const l = document.querySelector(`label[for="${inp.id}"]`);
        if (l) label = l.textContent.trim();
      }
      if (!label) {
        const parentLabel = inp.closest('label');
        if (parentLabel) label = parentLabel.textContent.trim();
      }
      if (!label) label = id;
      return { id, label };
    });
  }

  // grava snapshot de hoje (ids marcados)
  function saveTodaySnapshot(){
    const inputs = Array.from(document.querySelectorAll(LIST_SELECTOR));
    const checkedIds = inputs
      .filter(i => i.checked)
      .map((i, idx) => i.dataset.habit || i.id || i.name || `h${idx+1}`);
    const k = dayKey(iso(today));
    localStorage.setItem(k, JSON.stringify(checkedIds));
  }

  // lê snapshot de uma data
  function readDaySnapshot(dateISO){
    try{
      const raw = localStorage.getItem(dayKey(dateISO));
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  }

  // últimos 21 dias (do mais antigo ao mais recente)
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

    wrap.innerHTML = '';

    habits.forEach(h => {
      const row = document.createElement('div');
      row.className = 'streak-row';

      const label = document.createElement('div');
      label.className = 'streak-label';
      label.textContent = h.label;
      row.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'streak-grid';

      days.forEach(dayISO => {
        const dot = document.createElement('div');
        const snap = readDaySnapshot(dayISO);

        if (snap && Array.isArray(snap)) {
          dot.className = snap.includes(h.id) ? 'dot ok' : 'dot no';
        } else {
          dot.className = 'dot'; // cinza (sem registro)
        }

        dot.title = `${h.label} — ${dayISO}`;
        grid.appendChild(dot);
      });

      row.appendChild(grid);
      wrap.appendChild(row);
    });
  }

  // amarra no botão Salvar dia (sem interferir no handler existente)
  document.getElementById(SAVE_BUTTON_ID)?.addEventListener('click', () => {
    saveTodaySnapshot();
    renderProgress21();

    // feedback visual (opcional)
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
</script>