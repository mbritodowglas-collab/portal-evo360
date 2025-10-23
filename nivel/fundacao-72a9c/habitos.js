// EVO360 · Fundação · Card 3 (Hábitos e Recompensas)
// Mantém o mesmo padrão dos demais cards

/* ===== Helpers ===== */
const $$ = (s) => document.querySelector(s);
const $on = (el, ev, fn) => el && el.addEventListener(ev, fn);
const LS = {
  get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v)),
  del:(k)=>localStorage.removeItem(k),
};
const todayISO = () => new Date().toISOString().slice(0,10);

/* ===== Tabs ===== */
(function tabs(){
  const tabs = document.querySelectorAll(".tab");
  const map = {
    rastreador:"#panel-rastreador",
    recompensas:"#panel-recompensas",
    ferramentas:"#panel-ferramentas",
  };
  tabs.forEach(tb=>{
    $on(tb,"click",()=>{
      tabs.forEach(x=>x.classList.remove("active"));
      tb.classList.add("active");
      document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
      $$(map[tb.dataset.tab]).classList.add("active");
    });
  });
})();

/* ===== Rastreador diário ===== */
(function habits(){
  const LEVEL_ID = window.NIVEL || "fundacao-72a9c";
  const DATE_KEY = `hab_today_${LEVEL_ID}`;     // data do último registro salvo
  const HAB_KEY  = `hab_checks_${LEVEL_ID}`;    // objeto { yyyy-mm-dd: {habitId:bool,...}, ... }
  const DONE_KEY = `hab_days_done_${LEVEL_ID}`; // inteiro: dias completos acumulados

  const HABITS = [
    { id:"water",   label:"Hidratação adequada" },
    { id:"sleep",   label:"Sono 7h+" },
    { id:"food",    label:"Alimentação base (sem ultraprocessados principais)" },
    { id:"move",    label:"Movimento 20+ minutos" },
    { id:"mind",    label:"Check-in mental (emocional)" },
  ];

  // monta lista
  const list = $$("#habit-list");
  list.innerHTML = "";
  HABITS.forEach(h=>{
    const row = document.createElement("div");
    row.className = "habit-item";
    row.innerHTML = `
      <label for="hab_${h.id}">
        <input type="checkbox" id="hab_${h.id}" data-habit="${h.id}">
        <span>${h.label}</span>
      </label>
      <span class="chip" id="chip_${h.id}">—</span>
    `;
    list.appendChild(row);
  });

  // estado de hoje
  const today = todayISO();
  $$("#hab-meta").textContent = `Hoje — ${today}`;

  const allData = LS.get(HAB_KEY, {}); // histórico
  const todayData = allData[today] || {};
  HABITS.forEach(h=>{
    const cb = $(`#hab_${h.id}`);
    cb.checked = !!todayData[h.id];
  });

  // contagem e barra
  function refreshCounts(){
    const total = HABITS.length;
    const done = HABITS.reduce((acc,h)=> acc + ($(`#hab_${h.id}`).checked?1:0), 0);
    $$("#hab-count").textContent = `${done}`;
    const pct = Math.round(done/total*100);
    $$("#hab-bar").style.width = pct+"%";
    // chips individuais
    HABITS.forEach(h=>{
      const chip = $(`#chip_${h.id}`);
      chip.textContent = $(`#hab_${h.id}`).checked ? "feito" : "pendente";
    });
    return {done,total,pct};
  }
  refreshCounts();

  // eventos de clique nos hábitos
  HABITS.forEach(h=>{
    $on($(`#hab_${h.id}`),"change", refreshCounts);
  });

  // salvar / limpar dia
  $on($$("#hab-save"),"click",()=>{
    const {done,total} = refreshCounts();
    const data = LS.get(HAB_KEY, {});
    data[today] = {};
    HABITS.forEach(h=>{ data[today][h.id] = $(`#hab_${h.id}`).checked; });
    LS.set(HAB_KEY, data);
    LS.set(DATE_KEY, today);

    // se completou todos, incrementa contador de dias completos (apenas 1x por dia)
    let fullDays = LS.get(DONE_KEY, 0);
    const wasFull = Object.values(todayData||{}).length === total && Object.values(todayData||{}).every(Boolean);
    const isFull  = done === total;
    // incrementa quando virou de “não completo” para “completo”, ou se ainda não havia salvo hoje
    if(!wasFull && isFull){ fullDays += 1; LS.set(DONE_KEY, fullDays); }
    $$("#hab-days-complete").textContent = fullDays;
  });

  $on($$("#hab-clear"),"click",()=>{
    HABITS.forEach(h=>{ $(`#hab_${h.id}`).checked = false; });
    refreshCounts();
    const data = LS.get(HAB_KEY, {});
    delete data[today];
    LS.set(HAB_KEY, data);
  });

  // carregar contagem de dias completos
  $$("#hab-days-complete").textContent = LS.get(DONE_KEY, 0);

  // helper de query
  function $(s){ return document.querySelector(s); }
})();

/* ===== Recompensas ===== */
(function rewards(){
  const LEVEL_ID = window.NIVEL || "fundacao-72a9c";
  const NAME_KEY = `rec_name_${LEVEL_ID}`;
  const GOAL_KEY = `rec_goal_${LEVEL_ID}`;

  const nameInp = $$("#rec_nome");
  const goalInp = $$("#rec_meta");
  const outName = $$("#rec_nome_out");
  const outTxt  = $$("#rec_prog_txt");
  const bar     = $$("#rec_bar");

  function load(){
    const n = LS.get(NAME_KEY, "");
    const g = Math.max(1, Math.min(60, +(LS.get(GOAL_KEY, 12)||12)));
    nameInp.value = n;
    goalInp.value = g;
    outName.textContent = n || "—";
    renderProgress();
  }

  function renderProgress(){
    const g = Math.max(1, Math.min(60, +goalInp.value || 12));
    const done = +(LS.get(`hab_days_done_${LEVEL_ID}`, 0) || 0);
    const pct = Math.max(0, Math.min(100, Math.round(done/g*100)));
    bar.style.width = pct + "%";
    outTxt.textContent = `${done}/${g} dias completos`;
  }

  $on($$("#rec_salvar"),"click",()=>{
    const n = (nameInp.value||"").trim();
    const g = Math.max(1, Math.min(60, +goalInp.value || 12));
    LS.set(NAME_KEY, n);
    LS.set(GOAL_KEY, g);
    outName.textContent = n || "—";
    renderProgress();
    // micro celebração visual (pulse)
    bar.animate([{transform:"scaleX(1)"},{transform:"scaleX(1.02)"},{transform:"scaleX(1)"}],{duration:300});
  });

  // quando os “dias completos” mudarem (ex.: após salvar no rastreador), recalcule ao voltar p/ aba
  document.addEventListener("visibilitychange", ()=>{ if(!document.hidden) renderProgress(); });

  load();
})();

/* ===== Ferramentas: água ===== */
(function water(){
  const LEVEL_ID = window.NIVEL || "fundacao-72a9c";
  const KG_KEY = `agua_peso_${LEVEL_ID}`;
  const ML_KEY = `agua_ml_${LEVEL_ID}_${todayISO()}`; // diário

  const peso = $$("#agua_peso");
  const out  = $$("#agua_out");
  const mlEl = $$("#agua_ml");
  const copEl= $$("#agua_copos");
  const bar  = $$("#agua_bar");

  function metaMl(){
    const kg = +peso.value || 0;
    return Math.max(0, Math.round(kg * 35)); // ml
  }
  function renderMeta(){
    const m = metaMl();
    if(m>0){
      out.innerHTML = `Meta diária estimada: <strong>${m} ml</strong> (${(m/1000).toFixed(2)} L)`;
    }else{
      out.textContent = "Informe seu peso para ver a meta diária.";
    }
    renderBar();
  }
  function getMl(){
    return +LS.get(ML_KEY, 0) || 0;
  }
  function setMl(v){
    const ml = Math.max(0, v|0);
    LS.set(ML_KEY, ml);
    mlEl.textContent = `${ml} ml`;
    copEl.textContent = Math.floor(ml/250);
    renderBar();
  }
  function renderBar(){
    const m = metaMl();
    const v = getMl();
    const pct = m>0 ? Math.min(100, Math.round(v/m*100)) : 0;
    bar.style.width = pct+"%";
  }

  // init
  peso.value = LS.get(KG_KEY, "");
  renderMeta();
  setMl(getMl());

  // events
  $on(peso, "input", ()=>{
    LS.set(KG_KEY, peso.value || "");
    renderMeta();
  });
  $on($$("#agua_add"), "click", ()=> setMl(getMl() + 250));
  $on($$("#agua_reset"), "click", ()=> setMl(0));
})();