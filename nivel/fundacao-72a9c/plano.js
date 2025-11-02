// ============================
// EVO360 · Fundação · plano.js (robusto)
// Tarefas semanais + Microtarefas com gotejamento
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- Tabs ----------
(function tabs() {
  const tabs = $$('.tab');
  if (!tabs.length) return;

  function activate(tb){
    tabs.forEach(x => x.classList.remove('active'));
    tb.classList.add('active');
    $$('.panel').forEach(p => p.classList.remove('active'));
    const key = tb.dataset.tab;
    $('#panel-' + key)?.classList.add('active');
  }

  tabs.forEach(tb => tb.addEventListener('click', () => activate(tb)));
  activate(tabs.find(t=>t.classList.contains('active')) || tabs[0]);
})();

// ---------- Utils ----------
function cacheBust(url){
  if(!url) return url;
  try {
    const u = new URL(url, location.href);
    u.searchParams.set('cb', String(Date.now()));
    return u.href;
  } catch { return url; }
}

// Descobre a "raiz do repo": tudo antes de "/nivel/..."
// ex.: "/bella-prime-dashboard/nivel/fundacao-72a9c/plano.html"
// -> retorna "/bella-prime-dashboard/"
function repoRoot() {
  const path = location.pathname; // ex. "/bella-prime-dashboard/nivel/fundacao-72a9c/plano.html"
  const split = path.split('/nivel/');
  if (split.length > 1) {
    let base = split[0];
    if (!base.endsWith('/')) base += '/';
    return base;             // ex.: "/bella-prime-dashboard/"
  }
  // Se não houver "/nivel/", tenta a pasta atual como base
  const lastSlash = path.lastIndexOf('/');
  return lastSlash > 0 ? path.slice(0, lastSlash + 1) : '/';
}

async function fetchJson(url){
  const res = await fetch(cacheBust(url), { cache: 'no-store' });
  if (!res.ok) throw new Error(String(res.status));
  return await res.json();
}

async function tryMany(urls){
  for (const url of urls){
    if (!url) continue;
    try {
      const data = await fetchJson(url);
      console.info('[plano] carregado:', url);
      return data;
    } catch (e) {
      console.warn('[plano] falhou:', url, e?.message||e);
    }
  }
  return null;
}

function showError(msg){
  const semTit  = $('#sem-titulo');
  const semTxt  = $('#sem-texto');
  const micTit  = $('#mic-titulo');
  const micTxt  = $('#mic-texto');
  if (semTit) semTit.textContent = 'Conteúdo indisponível';
  if (micTit) micTit.textContent = 'Conteúdo indisponível';
  if (semTxt) semTxt.innerHTML   = `<span class="muted">${msg}</span>`;
  if (micTxt) micTxt.textContent = '—';
}

// ---------- Drip fallback (caso drip.js não esteja carregado) ----------
if (typeof window.Drip === 'undefined') {
  (function(){
    const localISO = (d=new Date())=>{
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${dd}`;
    };
    const parseISO   = (s)=>new Date(`${s}T12:00:00`);
    const daysBetween= (a,b)=>Math.floor((parseISO(b)-parseISO(a))/86400000);
    const todayISO   = ()=>localISO(new Date());
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

    // datas iniciais (marcam o "dia 1" de cada stream)
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

    // -------- Carregamento dos dados --------
    const ROOT = repoRoot();
    const hinted = window.DATA_PLANO; // prioridade absoluta se definido no HTML

    const candidates = [
      hinted,                                        // ex.: "../../data/fundacao-tarefas.json"
      `${ROOT}data/fundacao-tarefas.json`,           // unificado por nível
      `${ROOT}_data/fundacao-tarefas.json`,
      `${ROOT}data/plano.json`,                      // nome genérico (site inteiro)
      `${ROOT}_data/plano.json`,
      // compat: separados
      `${ROOT}data/tarefas-semanais.json`,
      `${ROOT}_data/tarefas-semanais.json`,
    ];

    const planoRaw = await tryMany(candidates);
    if (!planoRaw) {
      showError('Não foi possível carregar as tarefas (verifique o arquivo em /data).');
      return;
    }

    // aceita unificado { semanais:[], micros:[] } ou separados
    let semanais = Array.isArray(planoRaw.semanais) ? planoRaw.semanais : null;
    let micros   = Array.isArray(planoRaw.micros)   ? planoRaw.micros   : null;

    // fallback separado se não vierem as chaves
    if (!semanais || !micros) {
      const semCfg = window.DATA_TAREFAS_SEMANAIS || `${ROOT}data/tarefas-semanais.json`;
      const micCfg = window.DATA_MICRO_TAREFAS   || `${ROOT}data/microtarefas.json`;

      const semanaisRaw = semanais ? semanais : await tryMany([ semCfg, `${ROOT}_data/tarefas-semanais.json` ]);
      const microsRaw   = micros   ? micros   : await tryMany([ micCfg, `${ROOT}_data/microtarefas.json`, `${ROOT}_data/micro-tarefas.json` ]);

      semanais = Array.isArray(semanaisRaw) ? semanaisRaw
               : (semanaisRaw && Array.isArray(semanaisRaw.items) ? semanaisRaw.items : []);
      micros   = Array.isArray(microsRaw) ? microsRaw
               : (microsRaw && Array.isArray(microsRaw.items) ? microsRaw.items : []);
    }

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

      if (semMeta) semMeta.textContent = `Semana ${semDay} de ${SEM_MAX}`;
      if (semTit)  semTit.textContent  = item.titulo || '—';

      if (semTxt) {
        semTxt.innerHTML =
          (item.conceito   ? `<div style="margin-bottom:8px">${item.conceito}</div>`   : '') +
          (item.orientacao ? `<div style="margin-bottom:8px">${item.orientacao}</div>` : '') +
          (Array.isArray(item.tarefas) && item.tarefas.length
            ? '<ul style="margin:0;padding-left:18px">' + item.tarefas.map(t=>`<li>${t}</li>`).join('') + '</ul>'
            : '');
        if (!semTxt.innerHTML.trim()) semTxt.textContent = '—';
      }

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

      if (micMeta) micMeta.textContent = `Bloco ${micDay} de ${MIC_MAX}`;
      if (micTit)  micTit.textContent  = item.titulo || '—';
      if (micTxt)  micTxt.textContent  = (item.texto || '').trim() || '—';

      if (micPrev) micPrev.disabled = (micDay <= 1);
      if (micNext) micNext.disabled = (micDay >= cap);
      LS.set(MIC_VIEW_KEY, micDay);
    }

    micPrev?.addEventListener('click', ()=>{ micDay--; renderMic(); });
    micNext?.addEventListener('click', ()=>{ micDay++; renderMic(); });
    renderMic();

  } catch (e) {
    console.warn('dripPlano falhou:', e);
    showError('Erro ao inicializar o módulo.');
  }
})();