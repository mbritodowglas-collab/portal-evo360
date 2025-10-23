// EVO360 · Fundação · Card 2 (Tarefas e Neuro-Hábito)
// Mantém o mesmo padrão do Card 1: tabs + gotejamento + navegação retroativa

// ---------- Helpers ----------
const $$ = (sel) => document.querySelector(sel);
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const fmt = (n) => String(n).padStart(2, "0");

// dias decorridos (inteiro)
function daysBetweenISO(aISO, bISO) {
  const a = new Date(aISO + "T00:00:00");
  const b = new Date(bISO + "T00:00:00");
  return Math.floor((b - a) / 86400000);
}
function todayISO() { return new Date().toISOString().slice(0,10); }

// carrega JSON com tolerância
async function loadJSON(url) {
  if (!url) return null;
  try {
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw 0;
    return await r.json();
  } catch {
    return null;
  }
}

// ---------- Tabs ----------
(function tabs(){
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    semanais: "#panel-semanais",
    micro:    "#panel-micro",
    guia:     "#panel-guia",
  };
  tabs.forEach(tb => {
    $on(tb, "click", () => {
      tabs.forEach(x => x.classList.remove("active"));
      tb.classList.add("active");
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const sel = panels[tb.dataset.tab];
      if (sel) $$(sel).classList.add("active");
    });
  });
})();

// ---------- Drip engines ----------
(async function initCard2(){
  const LEVEL_ID = window.NIVEL || "fundacao-72a9c";

  // Streams distintos para semanais e microtarefas
  const STREAM_SEM = "card2_semanais";
  const STREAM_MIC = "card2_micro";

  // Inícios independentes (persistidos por localStorage)
  const startSem = Drip.ensureStart(LEVEL_ID, STREAM_SEM);
  const startMic = Drip.ensureStart(LEVEL_ID, STREAM_MIC);

  // Diferença de dias desde os inícios
  const diffDaysSem = daysBetweenISO(startSem, todayISO());
  const diffDaysMic = daysBetweenISO(startMic, todayISO());

  // Índice máximo liberado (1-based)
  // Semanais: 1 semana a cada 7 dias; limite 8 semanas (≈ 56 dias dentro dos 60)
  const MAX_WEEKS = 8;
  const weekIdxToday = Math.max(1, Math.min(MAX_WEEKS, Math.floor(diffDaysSem / 7) + 1));

  // Microtarefas: 1 bloco a cada 3 dias; até 20 blocos (60/3)
  const MAX_BLOCKS = 20;
  const blockIdxToday = Math.max(1, Math.min(MAX_BLOCKS, Math.floor(diffDaysMic / 3) + 1));

  // Estados de visualização (persistem seleção do usuário, sem liberar futuro)
  const VIEW_SEM_KEY = `drip_view_${LEVEL_ID}_${STREAM_SEM}`;
  const VIEW_MIC_KEY = `drip_view_${LEVEL_ID}_${STREAM_MIC}`;

  let weekView = Math.max(1, Math.min(Drip.LS.get(VIEW_SEM_KEY, weekIdxToday), weekIdxToday));
  let blockView = Math.max(1, Math.min(Drip.LS.get(VIEW_MIC_KEY, blockIdxToday), blockIdxToday));

  // Data
  const DATA_SEMANAIS_URL = window.DATA_TAREFAS_SEMANAIS;
  const DATA_MICRO_URL    = window.DATA_MICRO_TAREFAS;

  const semData = await loadJSON(DATA_SEMANAIS_URL); // [{titulo, texto}]
  const micData = await loadJSON(DATA_MICRO_URL);    // [{titulo, texto}]

  // ---------- Renderizadores ----------
  function renderSemanais(){
    // clamp
    weekView = Math.max(1, Math.min(weekView, weekIdxToday));

    const meta = $$("#sem-meta");
    const h3   = $$("#sem-titulo");
    const p    = $$("#sem-texto");

    const item = Array.isArray(semData) ? semData[weekView - 1] : null;
    meta.textContent = `Semana ${weekView} de ${MAX_WEEKS}`;

    if (item && (item.titulo || item.texto)) {
      h3.textContent = item.titulo || `Tarefa semanal ${fmt(weekView)}`;
      p.textContent  = item.texto  || "Conteúdo disponível.";
    } else {
      h3.textContent = `Tarefa semanal ${fmt(weekView)}`;
      p.textContent  = "Conteúdo indisponível no momento.";
    }

    // controles
    $$("#semPrev").disabled = (weekView <= 1);
    $$("#semNext").disabled = (weekView >= weekIdxToday);

    Drip.LS.set(VIEW_SEM_KEY, weekView);
  }

  function renderMicro(){
    blockView = Math.max(1, Math.min(blockView, blockIdxToday));

    const meta = $$("#mic-meta");
    const h3   = $$("#mic-titulo");
    const p    = $$("#mic-texto");

    const item = Array.isArray(micData) ? micData[blockView - 1] : null;
    meta.textContent = `Bloco ${blockView} de ${MAX_BLOCKS} (3 dias)`;

    if (item && (item.titulo || item.texto)) {
      h3.textContent = item.titulo || `Microtarefa ${fmt(blockView)}`;
      p.textContent  = item.texto  || "Conteúdo disponível.";
    } else {
      h3.textContent = `Microtarefa ${fmt(blockView)}`;
      p.textContent  = "Conteúdo indisponível no momento.";
    }

    $$("#micPrev").disabled = (blockView <= 1);
    $$("#micNext").disabled = (blockView >= blockIdxToday);

    Drip.LS.set(VIEW_MIC_KEY, blockView);
  }

  // ---------- Navegação ----------
  $on($$("#semPrev"), "click", () => { weekView--; renderSemanais(); });
  $on($$("#semNext"), "click", () => { weekView++; renderSemanais(); });

  $on($$("#micPrev"), "click", () => { blockView--; renderMicro(); });
  $on($$("#micNext"), "click", () => { blockView++; renderMicro(); });

  // Inicializa
  renderSemanais();
  renderMicro();
})();