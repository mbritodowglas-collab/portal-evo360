// ============================
// EVO360 · Dicas e Orientações (UNIFICADO)
// Atende Fundação / Ascensão / Domínio conforme window.NIVEL
// Requer: window.DATA_DICAS (JSON {dicas:[...] } ou Array)
// ============================

// Helpers
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// --------- NIVEL (parametriza faixas de Karvonen e rótulos) ----------
const NIVEL_CFG = (() => {
  const id = String(window.NIVEL || '').toLowerCase();
  if (id.includes('dominio')) {
    return { nome:'Domínio', low:0.70, high:0.85, tableMin:60, tableMax:90 };
  }
  if (id.includes('ascensao') || id.includes('ascensão')) {
    return { nome:'Ascensão', low:0.60, high:0.75, tableMin:55, tableMax:85 };
  }
  return { nome:'Fundação', low:0.50, high:0.65, tableMin:50, tableMax:80 };
})();

// --------- Util: cache-bust seguro ----------
function cacheBustUrl(url){
  if (!url) return url;
  const u = new URL(url, location.href);
  u.searchParams.set('cb', Date.now());
  return u.href;
}

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_dicas_orientacoes';

    // tenta usar Drip; se não houver, usa data de hoje + índice 1
    const startISO = (typeof Drip !== 'undefined')
      ? Drip.ensureStart(LEVEL_ID, DRIP_ID)
      : new Date().toISOString().slice(0, 10);

    async function load(url) {
      try {
        if (!url) return null;
        const r = await fetch(cacheBustUrl(url), { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        return await r.json();
      } catch {
        return null;
      }
    }

    const raw = await load(window.DATA_DICAS);
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    const prev  = $('#btnPrev');
    const next  = $('#btnNext');

    if (!data || !data.length) {
      meta  && (meta.textContent  = 'Dia —');
      texto && (texto.textContent = 'Dica indisponível.');
      return;
    }

    const MAX_DAYS = Math.min(60, data.length);
    const todayIdx = (typeof Drip !== 'undefined')
      ? Drip.getTodayIndex(startISO, MAX_DAYS)
      : 1;

    // estilização defensiva para textos longos
    if (texto) {
      Object.assign(texto.style, {
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        lineHeight: '1.6',
        marginTop: '6px'
      });
    }

    const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
    const LS = {
      get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
      set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
    };

    let day = LS.get(VIEW_KEY, todayIdx);

    function render() {
      const cap = Math.max(1, todayIdx);       // bloqueia futuro
      day = Math.max(1, Math.min(day, cap));

      const item = data[day - 1];
      if (item) {
        const rotulo = item.categoria === 'treino' ? 'Treino'
                    : item.categoria === 'nutricao' ? 'Nutrição'
                    : item.categoria === 'mentalidade' ? 'Mentalidade'
                    : 'Dica';

        meta && (meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${rotulo}${item.titulo ? ` · ${item.titulo}` : ''}`);

        const blocoHTML = (item.conceito || item.orientacao)
          ? `
            <div class="dica-bloco">
              ${item.conceito ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
              ${item.orientacao ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
            </div>
          `
          : `<p style="margin:0">${item.texto || ''}</p>`;

        texto && (texto.innerHTML = blocoHTML);
      } else {
        meta  && (meta.textContent  = `Dia ${day} de ${MAX_DAYS}`);
        texto && (texto.textContent = 'Dica indisponível.');
      }

      prev && (prev.disabled = day <= 1);
      next && (next.disabled = day >= cap);
      LS.set(VIEW_KEY, day);
    }

    prev?.addEventListener('click', () => { day--; render(); });
    next?.addEventListener('click', () => { day++; render(); });
    render();
  } catch (e) {
    console.warn('drip init falhou:', e);
  }
})();

// ---------- Abas (Calculadoras) ----------
(function tabs() {
  const tabs = $$('.tab');
  const panels = $$('.panel');
  if (!tabs.length || !panels.length) return;

  function activate(tabEl) {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tabEl.classList.add('active');

    const key = tabEl.dataset.tab;
    const panel = key ? document.querySelector(`#panel-${key}`) : null;
    (panel || panels[0])?.classList.add('active');
  }

  tabs.forEach(tb => tb.addEventListener('click', () => activate(tb)));
  activate(tabs.find(t => t.classList.contains('active')) || tabs[0]);
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

  const karvonenTarget = (fcMax, fcRep, frac) => Math.round(((fcMax - fcRep) * frac) + fcRep);

  function construirTabela(fcMax, fcRep) {
    const linhas = [];
    for (let pct = NIVEL_CFG.tableMin; pct <= NIVEL_CFG.tableMax; pct += 5) {
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
    const fcMax   = 220 - a;
    const alvoLow = karvonenTarget(fcMax, r, NIVEL_CFG.low);
    const alvoHigh= karvonenTarget(fcMax, r, NIVEL_CFG.high);

    out.innerHTML = `
      FC máx. estimada: <strong>${fcMax} bpm</strong><br>
      <span class="small muted">Faixa sugerida (${NIVEL_CFG.nome}): ${alvoLow}–${alvoHigh} bpm</span>
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
  [idade, fcr].forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); calcular(); }
  }));
})();

// ---------- Calculadora · TMB (Mifflin-St Jeor) ----------
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
    const s = (sex.value || 'f').toLowerCase();

    if (p > 0 && h > 0 && i > 0) {
      const base = Math.round((10*p) + (6.25*h) - (5*i) + (s === 'f' ? -161 : 5));
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