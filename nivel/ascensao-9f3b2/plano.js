// ============================
// EVO360 · Ascensão · plano.js
// Tarefas semanais + Microtarefas (gotejamento) — ARQUIVO ÚNICO
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
    $('#panel-' + tb.dataset.tab)?.classList.add('active');
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
      console.info('[ascensao/plano] carregado:', url);
      return data;
    } catch (e) {
      console.warn('[ascensao/plano] falhou:', url, e?.message||e);
    }
  }
  return null;
}

function getQP(){
  const u = new URL(location.href);
  const g = (k, def=null) => {
    const v = u.searchParams.get(k);
    return v === null ? def : v;
  };
  return {
    reset : g('reset'),
    sem   : g('sem', null), // força semana visual
    mic   : g('mic', null), // força micro visual
    diag  : g('diag', null) // liga diagnóstico visual
  };
}

function showError(msg){
  const semTit  = $('#sem-titulo');
  const semTxt  = $('#sem-texto');
  const micTit  = $('#mic-titulo');
  const micTxt  = $('#mic-texto');
  if (semTit) semTit.textContent = 'Conteúdo indisponível';
  if (micTit) micTit.textContent = 'Conteúdo indisponível';
  if (semTxt) semTxt.innerHTML = `<span class="muted">${msg}</span>`;
  if (micTxt) micTxt.textContent = '—';
}

// ---------- Drip fallback ----------
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
      set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ } },
      del:(k)=>{ try{ localStorage.removeItem(k); }catch(_){ } }
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
      },
      reset(level, stream){
        LS.del(`drip_start_${level}_${stream}`);
      },
      LS
    };
  })();
}

// ---------- Gotejamento ----------
(async function dripPlano() {
  try {
    const qp = getQP();

    const LEVEL_ID = window.NIVEL || 'ascensao-9f3b2';
    const SEM_ID  = 'card2_tarefas_semanais';
    const MIC_ID  = 'card2_microtarefas';
    const SEM_MAX = 8;
    const MIC_MAX = 20;

    // Reset opcional via query param (?reset=1)
    if (qp.reset) {
      Drip.reset?.(LEVEL_ID, SEM_ID);
      Drip.reset?.(LEVEL_ID, MIC_ID);
    }

    // datas iniciais (marcam o "dia 1" de cada stream)
    const semStart = Drip.ensureStart(LEVEL_ID, SEM_ID);
    const micStart = Drip.ensureStart(LEVEL_ID, MIC_ID);

    // índices liberados pelo tempo (1-based)
    const semIdxTime = Math.max(1, Math.min(
      SEM_MAX,
      Math.floor((Drip.getTodayIndex(semStart, SEM_MAX * 7) - 1) / 7) + 1
    ));
    const micIdxTime = Math.max(1, Math.min(
      MIC_MAX,
      Math.floor((Drip.getTodayIndex(micStart, MIC_MAX * 3) - 1) / 3) + 1
    ));

    // -------- Carregamento dos dados (ARQUIVO ÚNICO) --------
    const hinted = window.DATA_PLANO; // ../../data/ascensao-tarefas.json
    const candidates = [
      hinted,
      "../../data/ascensao-tarefas.json", // prioridade local
      "../../_data/ascensao-tarefas.json" // fallback
    ];
    const planoRaw = await tryMany(candidates);

    if (!planoRaw) {
      showError('Não foi possível carregar as tarefas (verifique o arquivo em /data).');
      return;
    }

    const semanais = Array.isArray(planoRaw.semanais) ? planoRaw.semanais : [];
    const micros   = Array.isArray(planoRaw.micros)   ? planoRaw.micros   : [];

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

    // permite simular visual via ?sem=4 (sem passar do liberado pelo tempo)
    let semDay = (() => {
      const forced = qp.sem ? Math.max(1, Math.min(SEM_MAX, parseInt(qp.sem,10)||1)) : null;
      if (forced) return Math.min(forced, semIdxTime);
      return LS.get(SEM_VIEW_KEY, semIdxTime);
    })();

    function renderSem() {
      if (!semanais.length) {
        semMeta && (semMeta.textContent = 'Semana —');
        semTit  && (semTit.textContent  = 'Conteúdo indisponível');
        semTxt  && (semTxt.textContent  = '—');
        if (semPrev) semPrev.disabled = true;
        if (semNext) semNext.disabled = true;
        return;
      }
      const cap = semIdxTime; // limite pelo tempo
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

    let micDay = (() => {
      const forced = qp.mic ? Math.max(1, Math.min(MIC_MAX, parseInt(qp.mic,10)||1)) : null;
      if (forced) return Math.min(forced, micIdxTime);
      return LS.get(MIC_VIEW_KEY, micIdxTime);
    })();

    function renderMic() {
      if (!micros.length) {
        micMeta && (micMeta.textContent = 'Bloco —');
        micTit  && (micTit.textContent  = 'Conteúdo indisponível');
        micTxt  && (micTxt.textContent  = '—');
        if (micPrev) micPrev.disabled = true;
        if (micNext) micNext.disabled = true;
        return;
      }
      const cap = micIdxTime;
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

    // ---------- Diagnóstico visual opcional (?diag=1) ----------
    if (qp.diag) {
      const diag = document.createElement('div');
      diag.style.cssText = 'position:fixed;bottom:10px;left:10px;z-index:9999;background:#0f1318;border:1px solid var(--line);border-radius:10px;padding:10px;font-size:12px;color:#cfe3ff;max-width:92vw';
      diag.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px">Drip · Ascensão</div>
        <div>Nível: <code>${LEVEL_ID}</code></div>
        <div>Start semanais: <code>${semStart}</code> → liberado até: <b>${semIdxTime}</b> / ${SEM_MAX}</div>
        <div>Start micro: <code>${micStart}</code> → liberado até: <b>${micIdxTime}</b> / ${MIC_MAX}</div>
        <div>Visual sem/mic: <b>${semDay}</b> / <b>${micDay}</b></div>
        <div>Fonte: <code>${candidates.find(Boolean)}</code></div>
        <div style="margin-top:6px" class="small muted">Use ?reset=1 para reiniciar o gotejamento.</div>
      `;
      document.body.appendChild(diag);
    }

  } catch (e) {
    console.warn('dripPlano (ascensao) falhou:', e);
    showError('Erro ao inicializar o módulo.');
  }
})();