// util
const $ = sel => document.querySelector(sel);
const LS = {
  get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
  set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
};
const todayISO = ()=> new Date().toISOString().slice(0,10);
const daysBetween=(a,b)=> Math.floor((new Date(b)-new Date(a))/(1000*60*60*24));

// --------- DADOS BÁSICOS DO NÍVEL ---------
const START_KEY = `startDate_${NIVEL}`;
if(!LS.get(START_KEY)) LS.set(START_KEY, todayISO());
const startISO = LS.get(START_KEY);
const diaJornada = Math.min(60, daysBetween(startISO, todayISO())+1);

// KPIs básicos (você pode alimentar por outras telas)
const workouts = LS.get(`workouts_${NIVEL}_history`, []);     // array de datas ISO com treino concluído
const neuroDone = LS.get(`neuro_${NIVEL}_done`, 0);           // número de exercícios 3/3 concluídos
const weeklyHabitsDone = LS.get(`weeklyhabits_${NIVEL}`, 0);  // exercícios semanais concluídos (8 metas)
const weightStart = LS.get(`weight_${NIVEL}_start`, null);    // número (kg)
const weightNow   = LS.get(`weight_${NIVEL}_now`, null);      // número (kg)

// --------- ELEGIBILIDADE (3 CRITÉRIOS) ---------
function calcElegibility(){
  // Consistência 60 dias: presença >= 80%
  const windowDays = 60;
  const cutoff = new Date(new Date(startISO).getTime() + (windowDays-1)*86400000);
  const periodEnd = new Date() < cutoff ? new Date() : cutoff;
  const totalDays = Math.min(windowDays, daysBetween(startISO, todayISO())+1);
  const uniqueWorkouts = [...new Set(workouts)];
  const present = uniqueWorkouts.filter(d => daysBetween(startISO, d) < totalDays).length;
  const consist = totalDays ? Math.round((present/totalDays)*100) : 0;
  const consOK = consist >= 80;

  // Peso: -2 a -3kg
  let delta = null, weightOK = false;
  if(typeof weightStart === 'number' && typeof weightNow === 'number'){
    delta = +(weightNow - weightStart).toFixed(1);
    weightOK = delta <= -2 && delta >= -3.5; // tolerância
  }

  // Exercícios semanais concluídos (todas as metas)
  const habitsTarget = 8; // ex.: 8 semanas
  const habitsOK = weeklyHabitsDone >= habitsTarget;

  // Atualiza UI
  $('[data-target="cons-text"]').textContent   = consist ? `${consist}%` : '—';
  $('[data-target="weight-text"]').textContent = (delta===null?'—': `${delta} kg`);
  $('[data-target="habits-text"]').textContent = `${weeklyHabitsDone}/${habitsTarget}`;

  // status visuais
  $('#elig-cons').classList.toggle('ok', consOK);
  $('#elig-weight').classList.toggle('ok', weightOK);
  $('#elig-habits').classList.toggle('ok', habitsOK);

  // score
  const parts = [
    consOK ? 1 : 0,
    weightOK ? 1 : 0,
    habitsOK ? 1 : 0,
  ];
  const score = parts.reduce((a,b)=>a+b,0)/3;
  $('#elig-bar').style.width = Math.round(score*100)+'%';
  $('#btnAsc').disabled = score < .999; // só habilita se os 3 estiverem ok

  // KPIs do card de progresso
  $('#kpi-dias').textContent  = `${diaJornada} de 60`;
  $('#kpi-tr').textContent    = `${present}`;
  $('#kpi-ex').textContent    = 'Ativo a cada 3 dias';
  $('#kpi-neuro').textContent = neuroDone;
  $('#kpi-cons').textContent  = consist ? `${consist}%` : '—';

  // barra do nível (dias concluídos/60)
  $('#level-bar').style.width = Math.round((diaJornada/60)*100)+'%';
  $('#kpi-dias').textContent  = `${diaJornada} de 60`;
}

calcElegibility();

// --------- MARCAR NEURO-HÁBITO (simples) ---------
$('#btnNeuroDone').addEventListener('click', ()=>{
  // controle diário de 3/3 do exercício atual
  const key = `neuro_${NIVEL}_streak`;
  const streak = LS.get(key, 0);
  const today = todayISO();
  const lastKey = `neuro_${NIVEL}_last`;
  const last = LS.get(lastKey, null);

  // evita marcar o mesmo dia duas vezes
  if(last === today) return;
  LS.set(lastKey, today);

  const next = Math.min(3, (streak||0)+1);
  LS.set(key, next);
  $('#neuro-bar').style.width = (next/3*100)+'%';
  $('#neuro-meta').textContent = `${next} de 3 dias concluídos`;

  if(next === 3){
    // concluiu 3/3 → incrementa exercícios concluídos semanais
    LS.set(`weeklyhabits_${NIVEL}`, (weeklyHabitsDone||0)+1);
    LS.set(`neuro_${NIVEL}_done`, (neuroDone||0)+1);
    // reseta streak para o próximo exercício (liberado em outra tela)
    LS.set(key, 0);
  }
  calcElegibility();
});

// --------- DICAS (treino e nutrição) ---------
async function safeLoad(url){
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

  // dia de dica = diaJornada (1..60)
  if(train && Array.isArray(train) && train[diaJornada-1]){
    $('#tip-train-text').textContent = train[diaJornada-1].texto;
  } else {
    $('#tip-train-text').textContent = 'Dica indisponível no momento.';
  }

  if(nutri && Array.isArray(nutri) && nutri[diaJornada-1]){
    $('#tip-nutri-text').textContent = nutri[diaJornada-1].texto;
  } else {
    $('#tip-nutri-text').textContent = 'Dica indisponível no momento.';
  }

  if(neuro && Array.isArray(neuro)){
    // exercício por bloco de 3 dias → índice = ceil(dia/3)-1
    const idx = Math.max(0, Math.ceil(diaJornada/3)-1);
    const item = neuro[idx];
    if(item){
      $('#neuro-title').textContent = item.titulo || 'Exercício de Neuro-hábito';
      $('#neuro-text').textContent  = item.objetivo || 'Prática ativa por 3 dias.';
    }
  }

  // Atualiza barra/label do neuro streak salvo
  const streak = LS.get(`neuro_${NIVEL}_streak`, 0);
  $('#neuro-bar').style.width = (streak/3*100)+'%';
  $('#neuro-meta').textContent = `${streak} de 3 dias concluídos`;
})();

// --- Mobile sidebar toggle ---
const sb = document.getElementById('sidebar');
const sbToggle = document.getElementById('sbToggle');
const sbBackdrop = document.getElementById('sbBackdrop');

function openSB(){
  sb.classList.add('open');
  sbBackdrop.classList.add('show');
  sbToggle?.setAttribute('aria-expanded','true');
  document.body.style.overflow = 'hidden';
}
function closeSB(){
  sb.classList.remove('open');
  sbBackdrop.classList.remove('show');
  sbToggle?.setAttribute('aria-expanded','false');
  document.body.style.overflow = '';
}

sbToggle?.addEventListener('click', ()=> {
  if(sb.classList.contains('open')) closeSB(); else openSB();
});
sbBackdrop?.addEventListener('click', closeSB);
window.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeSB(); });
document.querySelectorAll('.sb-nav a').forEach(a=> a.addEventListener('click', closeSB));