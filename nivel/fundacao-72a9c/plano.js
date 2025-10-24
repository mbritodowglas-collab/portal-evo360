// ============================
// EVO360 · Fundação
// Página: Tarefas e Neuro-Hábito
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Tabs ----------
(function tabs() {
  const tabs = $$('.tab');
  tabs.forEach(tb => {
    tb.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      tb.classList.add('active');
      $$('.panel').forEach(p => p.classList.remove('active'));
      $('#panel-' + tb.dataset.tab)?.classList.add('active');
    });
  });
})();

// ---------- Gotejamento ----------
(async function dripPlano() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';

    const SEM_ID = 'card2_tarefas_semanais';
    const MIC_ID = 'card2_microtarefas';
    const SEM_MAX = 8;
    const MIC_MAX = 20;

    // garante data inicial
    const semStart = Drip.ensureStart(LEVEL_ID, SEM_ID);
    const micStart = Drip.ensureStart(LEVEL_ID, MIC_ID);

    // calcula índices (semanais = 7 dias; micro = 3 dias)
    const semIdx = Math.min(
      SEM_MAX,
      Math.floor(Drip.getTodayIndex(semStart, SEM_MAX * 7) / 7)
    ) || 1;

    const micIdx = Math.min(
      MIC_MAX,
      Math.floor(Drip.getTodayIndex(micStart, MIC_MAX * 3) / 3)
    ) || 1;

    async function load(url) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw 0;
        return await r.json();
      } catch {
        return null;
      }
    }

    const semanais = await load(window.DATA_TAREFAS_SEMANAIS);
    const micros = await load(window.DATA_MICRO_TAREFAS);

    // ---------- Semanais ----------
    const semMeta = $('#sem-meta');
    const semTit  = $('#sem-titulo');
    const semTxt  = $('#sem-texto');
    const semPrev = $('#semPrev');
    const semNext = $('#semNext');
    const SEM_VIEW_KEY = `drip_view_${LEVEL_ID}_${SEM_ID}`;
    const LS = {
      get:(k,d=null)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(_){return d}},
      set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))
    };

    let semDay = LS.get(SEM_VIEW_KEY, semIdx);

    function renderSem() {
      const cap = semIdx;
      semDay = Math.max(1, Math.min(semDay, cap));
      const item = semanais && semanais[semDay - 1];
      if (item) {
        semMeta.textContent = `Semana ${semDay} de ${SEM_MAX}`;
        semTit.textContent  = item.titulo || '—';
        semTxt.textContent  = item.texto || '';
      } else {
        semMeta.textContent = `Semana ${semDay} de ${SEM_MAX}`;
        semTit.textContent  = 'Conteúdo indisponível';
        semTxt.textContent  = '—';
      }
      semPrev.disabled = (semDay <= 1);
      semNext.disabled = (semDay >= cap);
      LS.set(SEM_VIEW_KEY, semDay);
    }

    semPrev?.addEventListener('click', ()=>{ semDay--; renderSem(); });
    semNext?.addEventListener('click', ()=>{ semDay++; renderSem(); });
    renderSem();

    // ---------- Microtarefas ----------
    const micMeta = $('#mic-meta');
    const micTit  = $('#mic-titulo');
    const micTxt  = $('#mic-texto');
    const micPrev = $('#micPrev');
    const micNext = $('#micNext');
    const MIC_VIEW_KEY = `drip_view_${LEVEL_ID}_${MIC_ID}`;

    let micDay = LS.get(MIC_VIEW_KEY, micIdx);

    function renderMic() {
      const cap = micIdx;
      micDay = Math.max(1, Math.min(micDay, cap));
      const item = micros && micros[micDay - 1];
      if (item) {
        micMeta.textContent = `Bloco ${micDay} de ${MIC_MAX}`;
        micTit.textContent  = item.titulo || '—';
        micTxt.textContent  = item.texto || '';
      } else {
        micMeta.textContent = `Bloco ${micDay} de ${MIC_MAX}`;
        micTit.textContent  = 'Conteúdo indisponível';
        micTxt.textContent  = '—';
      }
      micPrev.disabled = (micDay <= 1);
      micNext.disabled = (micDay >= cap);
      LS.set(MIC_VIEW_KEY, micDay);
    }

    micPrev?.addEventListener('click', ()=>{ micDay--; renderMic(); });
    micNext?.addEventListener('click', ()=>{ micDay++; renderMic(); });
    renderMic();
  } catch (e) {
    console.warn('dripPlano falhou:', e);
  }
})();