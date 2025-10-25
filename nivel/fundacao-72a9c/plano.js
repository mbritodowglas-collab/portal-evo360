// ============================
// EVO360 · Fundação · plano.js
// Tarefas semanais + Microtarefas com gotejamento
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

// ---------- Utils ----------
function cacheBust(url){
  if(!url) return url;
  const u = new URL(url, location.href);
  u.searchParams.set('cb', String(Date.now())); // força não-cached
  return u.href;
}

function repoRoot() {
  // Se for user site (ex: wglas-collab.github.io), root = "/"
  // Se for project site (ex: /portal-evo360/...), root = "/portal-evo360/"
  const path = location.pathname; // ex: /portal-evo360/nivel/fundacao/plano.html ou /nivel/fundacao/plano.html
  const i = path.indexOf('/nivel/');
  const base = i > -1 ? path.slice(0, i + 1) : '/';
  return base || '/';
}

async function fetchJsonSmart(paths) {
  for (const p of paths) {
    if (!p) continue;
    try {
      const res = await fetch(cacheBust(p), { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      return data;
    } catch(_){ /* tenta próximo */ }
  }
  return null;
}

// ---------- Drip fallback (se drip.js não carregar por algum motivo) ----------
if (typeof window.Drip === 'undefined') {
  (function(){
    const localISO = (d=new Date())=>{
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    const parseISO = (s)=>new Date(`${s}T12:00:00`);
    const daysBetween = (a,b)=>Math.floor((parseISO(b)-parseISO(a))/86400000);
    const todayISO = ()=>localISO(new Date());
    const LS = {
      get:(k,d=null)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
      set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ } }
    };
    window.Drip = {
      ensureStart(level, stream){
        const KEY=`drip_start_${level}_${stream}`;
        let s = LS.get(KEY, null);
        if(!s){ s = todayISO(); LS.set(KEY, s); }
        return s;
      },
      getTodayIndex(startISO, maxDays=60){
        const idx = daysBetween(startISO, todayISO()) + 1;
        return Math.max(1, Math.min(maxDays, idx));
      }
    };
  })();
}

// ---------- Gotejamento ----------
(async function dripPlano() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';

    const SEM_ID  = 'card2_tarefas_semanais';
    const MIC_ID  = 'card2_microtarefas';
    const SEM_MAX = 8;
    const MIC_MAX = 20;

    // datas iniciais
    const semStart = Drip.ensureStart(LEVEL_ID, SEM_ID);
    const micStart = Drip.ensureStart(LEVEL_ID, MIC_ID);

    // índices (1-based): semana = cada 7 dias; micro = cada 3 dias
    const semIdx = Math.max(1, Math.min(
      SEM_MAX,
      Math.floor((Drip.getTodayIndex(semStart, SEM_MAX * 7) - 1) / 7) + 1
    ));
    const micIdx = Math.max(1, Math.min(
      MIC_MAX,
      Math.floor((Drip.getTodayIndex(micStart, MIC_MAX * 3) - 1) / 3) + 1
    ));

    // Resolve caminhos (funciona em raiz e em subpasta)
    const ROOT = repoRoot(); // ex: "/" ou "/portal-evo360/"
    const semCfg = window.DATA_TAREFAS_SEMANAIS || '../../_data/tarefas-semanais.json';
    const micCfg = window.DATA_MICRO_TAREFAS   || '../../_data/microtarefas.json';

    const semPaths = [
      semCfg,
      ROOT + '_data/tarefas-semanais.json'
    ];
    const micPaths = [
      micCfg,
      ROOT + '_data/microtarefas.json',
      ROOT + '_data/micro-tarefas.json'
    ];

    const semanaisRaw = await fetchJsonSmart(semPaths);
    const microsRaw   = await fetchJsonSmart(micPaths);

    // Normalização (espera array)
    const semanais = Array.isArray(semanaisRaw)
      ? semanaisRaw
      : (semanaisRaw && Array.isArray(semanaisRaw.items) ? semanaisRaw.items : []);
    const micros   = Array.isArray(microsRaw)
      ? microsRaw
      : (microsRaw && Array.isArray(microsRaw.items) ? microsRaw.items : []);

    // ---------- Semanais ----------
    const semMeta = $('#sem-meta');
    const semTit  = $('#sem-titulo');
    const semTxt  = $('#sem-texto');
    const semPrev = $('#semPrev');
    const semNext = $('#semNext');

    const SEM_VIEW_KEY = `drip_view_${LEVEL_ID}_${SEM_ID}`;
    const LS = {
      get:(k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
      set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
    };

    let semDay = LS.get(SEM_VIEW_KEY, semIdx);

    function renderSem() {
      if (!Array.isArray(semanais) || semanais.length === 0) {
        if (semMeta) semMeta.textContent = 'Semana —';
        if (semTit)  semTit.textContent  = 'Conteúdo indisponível';
        if (semTxt)  semTxt.textContent  = '—';
        if (semPrev) semPrev.disabled = true;
        if (semNext) semNext.disabled = true;
        return;
      }
      const cap = semIdx;
      semDay = Math.max(1, Math.min(semDay, cap));
      const item = semanais[semDay - 1] || {};

      const titulo = item.titulo || '—';
      let texto = '';
      if (typeof item.texto === 'string' && item.texto.trim()) {
        texto = item.texto.trim();
      } else {
        const partes = [];
        if (item.conceito)   partes.push(String(item.conceito).trim());
        if (item.orientacao) partes.push(String(item.orientacao).trim());
        texto = partes.join('\n\n');
      }

      semMeta.textContent = `Semana ${semDay} de ${SEM_MAX}`;
      semTit.textContent  = titulo;
      semTxt.textContent  = texto || '—';

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
        if (micMeta) micMeta.textContent = 'Bloco —';
        if (micTit)  micTit.textContent  = 'Conteúdo indisponível';
        if (micTxt)  micTxt.textContent  = '—';
        if (micPrev) micPrev.disabled = true;
        if (micNext) micNext.disabled = true;
        return;
      }
      const cap = micIdx;
      micDay = Math.max(1, Math.min(micDay, cap));
      const item = micros[micDay - 1] || {};

      micMeta.textContent = `Bloco ${micDay} de ${MIC_MAX}`;
      micTit.textContent  = item.titulo || '—';
      micTxt.textContent  = (item.texto || '').trim() || '—';

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