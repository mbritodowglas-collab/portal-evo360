// ================== Utils ==================
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
const setText = (sel, txt) => { const n = $(sel); if(n) n.textContent = txt; };
const setWidth = (sel, pct) => { const n = $(sel); if(n) n.style.width = pct; };

const LS = {
  get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
  set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)) }catch(_){} }
};

const todayISO = ()=> new Date().toISOString().slice(0,10);
const daysBetween=(a,b)=> Math.floor((new Date(b)-new Date(a))/(1000*60*60*24));

// ================== Dados básicos do nível ==================
// Fallback do nível para Ascensão + opcional total de dias via window.NIVEL_DIAS (padrão 60)
const NIVEL = window.NIVEL || 'ascensao-9F3B1';
const TOTAL_DAYS = Number(window.NIVEL_DIAS) > 0 ? Number(window.NIVEL_DIAS) : 60;

const START_KEY = `startDate_${NIVEL}`;
if(!LS.get(START_KEY)) LS.set(START_KEY, todayISO());
const startISO = LS.get(START_KEY);
const diaJornada = Math.min(TOTAL_DAYS, daysBetween(startISO, todayISO())+1);

// KPIs (fallbacks seguros)
const workouts = LS.get(`workouts_${NIVEL}_history`, []) || [];
const neuroDone = +LS.get(`neuro_${NIVEL}_done`, 0) || 0;
const weeklyHabitsDone = +LS.get(`weeklyhabits_${NIVEL}`, 0) || 0;
const weightStart = LS.get(`weight_${NIVEL}_start`, null);
const weightNow   = LS.get(`weight_${NIVEL}_now`, null);

// ================== Elegibilidade ==================
function calcElegibility(){
  const windowDays = TOTAL_DAYS;
  const totalDays = Math.min(windowDays, daysBetween(startISO, todayISO())+1);

  // presença por dia (unique)
  const uniqueWorkouts = [...new Set(workouts)];
  const present = uniqueWorkouts.filter(d => daysBetween(startISO, d) < totalDays).length;
  const consist = totalDays ? Math.round((present/totalDays)*100) : 0;
  const consOK = consist >= 80;

  // Peso (faixa -2 a -3.5 kg)
  let delta = null, weightOK = false;
  if(typeof weightStart === 'number' && typeof weightNow === 'number'){
    delta = +(weightNow - weightStart).toFixed(1);
    weightOK = delta <= -2 && delta >= -3.5;
  }

  // Hábitos/semanais
  const habitsTarget = 8;
  const habitsOK = weeklyHabitsDone >= habitsTarget;

  // UI
  setText('[data-target="cons-text"]', consist ? `${consist}%` : '—');
  setText('[data-target="weight-text"]', delta===null ? '—' : `${delta} kg`);
  setText('[data-target="habits-text"]', `${weeklyHabitsDone}/${habitsTarget}`);

  $('#elig-cons')?.classList.toggle('ok', consOK);
  $('#elig-weight')?.classList.toggle('ok', weightOK);
  $('#elig-habits')?.classList.toggle('ok', habitsOK);

  // ✅ Correção de precedência no score
  const score = (
    (consOK ? 1 : 0) +
    (weightOK ? 1 : 0) +
    (habitsOK ? 1 : 0)
  ) / 3;

  setWidth('#elig-bar', Math.round(score*100)+'%');
  const btnAsc = $('#btnAsc'); if(btnAsc) btnAsc.disabled = score < .999;

  setText('#kpi-dias',  `${diaJornada} de ${TOTAL_DAYS}`);
  setText('#kpi-tr',    `${present}`);
  setText('#kpi-ex',    'Ativo a cada 3 dias');
  setText('#kpi-neuro', `${neuroDone}`);
  setText('#kpi-cons',  consist ? `${consist}%` : '—');

  setWidth('#level-bar', Math.round((diaJornada/TOTAL_DAYS)*100)+'%');
}
calcElegibility();

// ================== Marcar neuro-hábito ==================
$('#btnNeuroDone')?.addEventListener('click', ()=>{
  const key = `neuro_${NIVEL}_streak`;
  const streak = +LS.get(key, 0) || 0;
  const today = todayISO();
  const lastKey = `neuro_${NIVEL}_last`;
  const last = LS.get(lastKey, null);

  if(last === today) return; // já marcou hoje
  LS.set(lastKey, today);

  const next = Math.min(3, streak+1);
  LS.set(key, next);
  setWidth('#neuro-bar', (next/3*100)+'%');
  setText('#neuro-meta', `${next} de 3 dias concluídos`);

  if(next === 3){
    LS.set(`weeklyhabits_${NIVEL}`, (weeklyHabitsDone||0)+1);
    LS.set(`neuro_${NIVEL}_done`, (neuroDone||0)+1);
    LS.set(key, 0);
  }
  calcElegibility();
});

// ================== Dicas (treino / nutri / neuro) ==================
async function safeLoad(url){
  if(!url) return null;
  try{
    const r = await fetch(url, {cache:'no-store'});
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json();
  }catch(_){ return null }
}

(async ()=>{
  const train = await safeLoad(window.DATA_TIPS_TREINO);
  const nutri = await safeLoad(window.DATA_TIPS_NUTRI);
  const neuro = await safeLoad(window.DATA_NEURO);

  if(train?.[diaJornada-1]?.texto){
    setText('#tip-train-text', train[diaJornada-1].texto);
  }else setText('#tip-train-text','Dica indisponível no momento.');

  if(nutri?.[diaJornada-1]?.texto){
    setText('#tip-nutri-text', nutri[diaJornada-1].texto);
  }else setText('#tip-nutri-text','Dica indisponível no momento.');

  if(Array.isArray(neuro)){
    const idx = Math.max(0, Math.ceil(diaJornada/3)-1);
    const item = neuro[idx];
    if(item){
      setText('#neuro-title', item.titulo || 'Exercício de Neuro-hábito');
      setText('#neuro-text',  item.objetivo || 'Prática ativa por 3 dias.');
    }
  }

  const streak = +LS.get(`neuro_${NIVEL}_streak`, 0) || 0;
  setWidth('#neuro-bar', (streak/3*100)+'%');
  setText('#neuro-meta', `${streak} de 3 dias concluídos`);
})();

// ================== Sidebar mobile ==================
const sb         = document.querySelector('.sidebar');
const sbToggle   = document.getElementById('sbToggle');
const sbBackdrop = document.getElementById('sbBackdrop');

function openSB(){
  sb?.classList.add('open');
  sbBackdrop?.classList.add('show');
  sbToggle?.setAttribute('aria-expanded','true');
  document.body.style.overflow = 'hidden';
}
function closeSB(){
  sb?.classList.remove('open');
  sbBackdrop?.classList.remove('show');
  sbToggle?.setAttribute('aria-expanded','false');
  document.body.style.overflow = '';
}
sbToggle?.addEventListener('click', ()=> sb?.classList.contains('open') ? closeSB() : openSB());
sbBackdrop?.addEventListener('click', closeSB);
window.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeSB(); });
$$('.sb-nav a').forEach(a=> a.addEventListener('click', closeSB));