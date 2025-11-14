// ============================
// EVO360 · Domínio
// Página: Dicas e Orientações (JS completo)
// ============================

// Helpers
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---- DRIP shim (fallback local) ----
(function ensureDrip(){
  if (typeof window.Drip !== 'undefined') return;

  const localISO = (d=new Date())=>{
    const y=d.getFullYear(),
          m=String(d.getMonth()+1).padStart(2,'0'),
          dd=String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  };

  const parseISO    = (s)=> new Date(`${s}T12:00:00`);
  const todayISO    = ()=> localISO(new Date());
  const daysBetween = (a,b)=> Math.floor((parseISO(b)-parseISO(a))/86400000);

  const LS = {
    get:(k,d=null)=>{ try{const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
    set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){ } },
  };

  window.Drip = {
    ensureStart(levelId, streamId){
      const KEY = `drip_start_${levelId}_${streamId}`;
      let start = LS.get(KEY, null);
      if (!(/^\d{4}-\d{2}-\d{2}$/.test(start||''))) {
        start = todayISO();
        LS.set(KEY, start);
      }
      return start;
    },
    getTodayIndex(startISO, maxDays=60){
      if (!(/^\d{4}-\d{2}-\d{2}$/.test(startISO||''))) startISO = todayISO();
      const idx = daysBetween(startISO, todayISO()) + 1;
      return Math.max(1, Math.min(maxDays, idx));
    }
  };
})();

function cacheBust(url){
  try {
    const u = new URL(url, location.href);
    u.searchParams.set('cb', Date.now());
    return u.href;
  } catch {
    return url;
  }
}

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'dominio-83f9x';
    const DRIP_ID  = 'card1_dicas_orientacoes';

    const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
    const dataPath = cacheBust(window.DATA_DICAS || '../../data/dominio-dicas.json');

    const r   = await fetch(dataPath, { cache: 'no-store' });
    const raw = r.ok ? await r.json() : null;

    // Aceita array direto ou { dicas: [...] }
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    const prev  = $('#btnPrev');
    const next  = $('#btnNext');

    if (!data || !data.length) {
      if (meta)  meta.textContent  = 'Dia —';
      if (texto) texto.textContent = 'Dica indisponível.';
      return;
    }

    const MAX_DAYS  = Math.min(60, data.length);
    const todayIdx  = Drip.getTodayIndex(startISO, MAX_DAYS);

    // Sem localStorage de "dia visual": sempre começa no dia atual do drip
    let day = todayIdx;

    function render() {
      const cap = Math.min(Math.max(1, todayIdx), data.length);
      day = Math.max(1, Math.min(day, cap));
      const item = data[day - 1];

      if (item) {
        const rotulo =
          item.categoria === 'treino'      ? 'Treino'      :
          item.categoria === 'nutricao'    ? 'Nutrição'    :
          item.categoria === 'mentalidade' ? 'Mentalidade' :
                                             'Dica';

        if (meta) {
          meta.textContent =
            `Dia ${day} de ${MAX_DAYS} — ${rotulo}` +
            (item.titulo ? ` · ${item.titulo}` : '');
        }

        const blocoHTML = (item.conceito || item.orientacao)
          ? `<div class="dica-bloco">
               ${item.conceito
                  ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div>
                     <p style="margin:0 0 10px">${item.conceito}</p>`
                  : ''}
               ${item.orientacao
                  ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div>
                     <p style="margin:0">${item.orientacao}</p>`
                  : ''}
             </div>`
          : `<p style="margin:0">${item.texto || ''}</p>`;

        if (texto) {
          texto.innerHTML          = blocoHTML;
          texto.style.whiteSpace   = 'normal';
          texto.style.overflowWrap = 'anywhere';
          texto.style.wordBreak    = 'break-word';
          texto.style.lineHeight   = '1.6';
          texto.style.marginTop    = '6px';
        }
      } else {
        if (meta)  meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
        if (texto) texto.textContent = 'Dica indisponível.';
      }

      if (prev) prev.disabled = (day <= 1);
      if (next) next.disabled = (day >= cap);
    }

    prev && prev.addEventListener('click', () => { day--; render(); });
    next && next.addEventListener('click', () => { day++; render(); });

    render();
  } catch (e) {
    console.warn('[Domínio/Drip] init falhou:', e);
  }
})();

// ---------- Abas (Calculadoras) ----------
(function tabs() {
  const tabs = $$('.tab');
  const panels = $$('.panel');

  if (!tabs.length || !panels.length) return;

  // ajuda a ativar a primeira aba caso nada esteja ativo
  function activate(tabEl) {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tabEl.classList.add('active');

    const key = tabEl.dataset.tab;                   // ex.: "karvonen" ou "tmb"
    const target = key ? `#panel-${key}` : null;     // ex.: "#panel-karvonen"
    const panel = target ? $(target) : null;

    // fallback: se não achar pelo data-tab, mantém a atual
    (panel || panels[0])?.classList.add('active');
  }

  tabs.forEach(tb => {
    tb.addEventListener('click', () => activate(tb));
  });

  // garante estado inicial válido
  const anyActive = tabs.find(t => t.classList.contains('active')) || tabs[0];
  activate(anyActive);
})();

// ---------- Calculadora · FC de Reserva (Karvonen) ----------
(function karvonen() {
  const idade = $('#k_idade');
  const fcr   = $('#k_fcr');
  const out   = $('#k_out');
  const table = $('#k_table');
  const btn   = $('#k_calcBtn');
  const clr   = $('#k_clearBtn');

  if (!idade || !fcr || !out || !table || !btn || !clr) return;

  function karvonenTarget(fcMax, fcRep, frac) {
    return Math.round(((fcMax - fcRep) * frac) + fcRep);
  }

  function construirTabela(fcMax, fcRep) {
    const linhas = [];
    for (let pct = 50; pct <= 80; pct += 5) {
      const frac = pct / 100;
      const alvo = karvonenTarget(fcMax, fcRep, frac);
      linhas.push(
        `<div class="row" style="justify-content:space-between">
          <span>${pct}% da FC de reserva</span>
          <strong>${alvo} bpm</strong>
        </div>`
      );
    }
    return linhas.join('');
  }

  function calcular() {
    const a = +idade.value || 0;
    const r = +fcr.value   || 0;

    if (a <= 0 || r <= 0) {
      out.textContent = 'Informe idade e FC de repouso.';
      table.innerHTML = '';
      return;
    }

    const fcMax = 220 - a; // estimativa
    const alvo50 = karvonenTarget(fcMax, r, 0.50);
    const alvo65 = karvonenTarget(fcMax, r, 0.65);

    out.innerHTML = `
      FC máx. estimada: <strong>${fcMax} bpm</strong><br>
      <span class="small muted">Faixa sugerida (Fundação): ${alvo50}–${alvo65} bpm</span>
    `;
    table.innerHTML = construirTabela(fcMax, r);
  }

  function limpar() {
    idade.value = '';
    fcr.value   = '';
    out.textContent = 'Informe idade e FC de repouso e clique em Calcular.';
    table.innerHTML = '';
  }

  btn.addEventListener('click', calcular);
  clr.addEventListener('click', limpar);

  [idade, fcr].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); calcular(); }
    });
  });
})();

// ---------- Calculadora · TMB ----------
(function tmb() {
  const peso = $('#t_peso');
  const alt  = $('#t_altura');
  const ida  = $('#t_idade');
  const sex  = $('#t_sexo');
  const out  = $('#t_out');

  if (!peso || !alt || !ida || !sex || !out) return;

  function calc() {
    const p = +peso.value || 0;
    const h = +alt.value  || 0;
    const i = +ida.value  || 0;
    const s = sex.value || 'f';

    if (p > 0 && h > 0 && i > 0) {
      const base = Math.round((10*p) + (6.25*h) - (5*i) + (s==='f' ? -161 : 5));
      out.innerHTML = `Sua TMB estimada: <strong>${base} kcal/dia</strong><br>
        <span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
    } else {
      out.textContent = 'Preencha peso, altura e idade.';
    }
  }

  ['input','change'].forEach(ev=>{
    peso.addEventListener(ev, calc);
    alt.addEventListener(ev, calc);
    ida.addEventListener(ev, calc);
    sex.addEventListener(ev, calc);
  });
  calc();
})();