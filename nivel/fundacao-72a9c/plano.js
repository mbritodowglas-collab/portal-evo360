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

// Escapar HTML básico
function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ---------- Gotejamento ----------
(async function dripPlano() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';

    const SEM_ID  = 'card2_tarefas_semanais';
    const MIC_ID  = 'card2_microtarefas';
    const SEM_MAX = 8;
    const MIC_MAX = 20;

    // Marca início
    const semStart = Drip.ensureStart(LEVEL_ID, SEM_ID);
    const micStart = Drip.ensureStart(LEVEL_ID, MIC_ID);

    // Índices (1-based)
    const semIdx = Math.max(1, Math.min(
      SEM_MAX,
      Math.floor((Drip.getTodayIndex(semStart, SEM_MAX * 7) - 1) / 7) + 1
    ));
    const micIdx = Math.max(1, Math.min(
      MIC_MAX,
      Math.floor((Drip.getTodayIndex(micStart, MIC_MAX * 3) - 1) / 3) + 1
    ));

    // === Ajuste: fallback de caminho para GitHub Pages (repo base) ===
    // Se o site está em /<repo>/..., precisamos prefixar os JSONs com /<repo>
    const repoBase = (() => {
      const parts = location.pathname.split('/').filter(Boolean);
      // ex.: /portal-evo360/nivel/fundacao/plano.html -> '/portal-evo360'
      return parts.length ? '/' + parts[0] : '';
    })();

    async function loadAny(urls) {
      for (const url of urls) {
        try {
          if (!url) continue;
          const r = await fetch(url, { cache: 'no-store' });
          if (r.ok) return await r.json();
        } catch {}
      }
      return null;
    }

    const semanais = await loadAny([
      // caminho que vem do HTML
      window.DATA_TAREFAS_SEMANAIS,
      // relativos usuais
      "../../_data/tarefas-semanais.json",
      // fallback com base do repositório (GitHub Pages)
      `${repoBase}/_data/tarefas-semanais.json`
    ]);

    const micros = await loadAny([
      window.DATA_MICRO_TAREFAS,
      "../../_data/microtarefas.json",
      "../../_data/micro-tarefas.json",
      `${repoBase}/_data/microtarefas.json`,
      `${repoBase}/_data/micro-tarefas.json`
    ]);

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
      if (!Array.isArray(semanais) || semanais.length === 0) {
        semMeta && (semMeta.textContent = 'Semana —');
        semTit  && (semTit.textContent  = 'Conteúdo indisponível');
        semTxt  && (semTxt.textContent  = '—');
        if (semPrev) semPrev.disabled = true;
        if (semNext) semNext.disabled = true;
        return;
      }
      const cap = semIdx;
      semDay = Math.max(1, Math.min(semDay, cap));
      const item = semanais[semDay - 1] || {};

      semMeta.textContent = `Semana ${semDay} de ${SEM_MAX}`;
      semTit.textContent  = item.titulo ? String(item.titulo) : '—';

      // Monta a partir de {conceito, orientacao, tarefas[]} (ou fallback "texto")
      let bloco = '';
      if (item.conceito) {
        bloco += `<strong>Conceito:</strong> ${esc(item.conceito)}`;
      }
      if (item.orientacao) {
        bloco += (bloco ? '<br><br>' : '') + `<strong>Orientação:</strong> ${esc(item.orientacao)}`;
      }
      if (Array.isArray(item.tarefas) && item.tarefas.length) {
        bloco += (bloco ? '<br><br>' : '') + `<strong>Tarefas da semana:</strong><br>` +
                 item.tarefas.map(t => `• ${esc(t)}`).join('<br>');
      }
      if (!bloco && item.texto) bloco = esc(item.texto);
      if (!bloco) bloco = '—';

      semTxt.innerHTML = bloco;

      if (semPrev) semPrev.disabled = (semDay <= 1);
      if (semNext) semNext.disabled = (semDay >= cap);
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
      if (!Array.isArray(micros) || micros.length === 0) {
        micMeta && (micMeta.textContent = 'Bloco —');
        micTit  && (micTit.textContent  = 'Conteúdo indisponível');
        micTxt  && (micTxt.textContent  = '—');
        if (micPrev) micPrev.disabled = true;
        if (micNext) micNext.disabled = true;
        return;
      }
      const cap = micIdx;
      micDay = Math.max(1, Math.min(micDay, cap));
      const item = micros[micDay - 1] || {};

      micMeta.textContent = `Bloco ${micDay} de ${MIC_MAX}`;
      micTit.textContent  = item.titulo ? String(item.titulo) : '—';
      micTxt.textContent  = item.texto  ? String(item.texto)  : '—';

      if (micPrev) micPrev.disabled = (micDay <= 1);
      if (micNext) micNext.disabled = (micDay >= cap);
      LS.set(MIC_VIEW_KEY, micDay);
    }

    micPrev?.addEventListener('click', ()=>{ micDay--; renderMic(); });
    micNext?.addEventListener('click', ()=>{ micDay++; renderMic(); });
    renderMic();
  } catch (e) {
    console.warn('dripPlano falhou:', e);
  }
})();