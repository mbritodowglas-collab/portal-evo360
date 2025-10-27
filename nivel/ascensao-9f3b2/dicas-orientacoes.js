// ============================
// EVO360 · Fundação
// Página: Dicas e Orientações (JS completo e corrigido)
// ============================

(() => {
  // Helpers locais (NÃO poluem o global)
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- DRIP: Dica do dia ----------
  (async function dicaDrip() {
    try {
      const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
      const DRIP_ID  = 'card1_dicas_orientacoes';
      const startISO = (typeof Drip !== 'undefined')
        ? Drip.ensureStart(LEVEL_ID, DRIP_ID)
        : new Date().toISOString().slice(0, 10);

      const dataPathBase = window.DATA_DICAS || '../../data/fundacao.json';
      const dataPath = `${dataPathBase}${dataPathBase.includes('?') ? '&' : '?'}cb=${Date.now()}`;

      async function load(url) {
        try {
          const r = await fetch(url, { cache: 'no-store' });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return await r.json();
        } catch (err) {
          console.warn('[Dica] Falha ao carregar JSON:', err);
          return null;
        }
      }

      const raw = await load(dataPath);
      const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

      const meta  = $('#dica-meta');
      const texto = $('#dica-texto');
      const prev  = $('#btnPrev');
      const next  = $('#btnNext');

      if (!data || !data.length) {
        meta && (meta.textContent = 'Dia —');
        texto && (texto.textContent = 'Dica indisponível.');
        return;
      }

      const MAX_DAYS = Math.min(60, data.length);
      const todayIdx = (typeof Drip !== 'undefined')
        ? Drip.getTodayIndex(startISO, MAX_DAYS)
        : 1;

      const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
      const LS = {
        get:(k,def=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):def }catch(_){ return def } },
        set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
      };

      let day = LS.get(VIEW_KEY, todayIdx);

      function render() {
        const cap = Math.max(1, todayIdx);
        day = Math.max(1, Math.min(day, cap));
        const item = data[day - 1];

        if (item) {
          const rotulo = item.categoria === 'treino' ? 'Treino'
                       : (item.categoria === 'nutricao' ? 'Nutrição'
                       : (item.categoria === 'mentalidade' ? 'Mentalidade' : 'Dica'));

          meta && (meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${rotulo}${item.titulo ? ` · ${item.titulo}` : ''}`);

          const blocoHTML = (item.conceito || item.orientacao)
            ? `
              <div class="dica-bloco">
                ${item.conceito ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
                ${item.orientacao ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
              </div>`
            : `<p style="margin:0">${item.texto || ''}</p>`;

          if (texto) {
            texto.innerHTML = blocoHTML;
            texto.style.whiteSpace   = 'normal';
            texto.style.overflowWrap = 'anywhere';
            texto.style.wordBreak    = 'break-word';
            texto.style.lineHeight   = '1.6';
            texto.style.marginTop    = '6px';
          }
        } else {
          meta && (meta.textContent = `Dia ${day} de ${MAX_DAYS}`);
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
      const target = key ? `#panel-${key}` : null;
      const panel = target ? $(target) : null;
      (panel || panels[0])?.classList.add('active');
    }

    tabs.forEach(tb => tb.addEventListener('click', () => activate(tb)));
    const anyActive = tabs.find(t => t.classList.contains('active')) || tabs[0];
    activate(anyActive);
  })();

  // ---------- Calculadora · FC de Reserva (Karvonen) ----------
  (function karvonen() {
    const idade = $('#k_idade');
    const fCR   = $('#k_fcr');
    const out   = $('#k_out');
    const table = $('#k_table');
    const btn   = $('#k_calcBtn');
    const clr   = $('#k_clearBtn');
    if (!idade || !fCR || !out || !table || !btn || !clr) return;

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
      const r = +fCR.value   || 0;
      if (a <= 0 || r <= 0) {
        out.textContent = 'Informe idade e FC de repouso.';
        table.innerHTML = '';
        return;
      }
      const fcMax = 220 - a; // Fundação mantém 220 - idade
      const alvo50 = karvonenTarget(fcMax, r, 0.50);
      const alvo65 = karvonenTarget(fcMax, r, 0.65);

      out.innerHTML = `
        FC máx. estimada: <strong>${fcMax} bpm</strong><br>
        <span class="small muted">Faixa sugerida: ${alvo50}–${alvo65} bpm</span>
      `;
      table.innerHTML = construirTabela(fcMax, r);
    }

    function limpar() {
      idade.value = '';
      fCR.value   = '';
      out.textContent = 'Informe idade e FC de repouso e clique em Calcular.';
      table.innerHTML = '';
    }

    btn.addEventListener('click', calcular);
    clr.addEventListener('click', limpar);
    [idade, fCR].forEach(el => {
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
})(); // ← fecha o wrapper e evita colisão no escopo global