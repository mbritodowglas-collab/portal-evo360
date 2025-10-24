// ============================
// EVO360 · Fundação
// Página: Dicas e Orientações
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_dicas_orientacoes';

    // pode não existir se drip.js não carregar, por isso o try/catch
    const startISO = (typeof Drip !== 'undefined')
      ? Drip.ensureStart(LEVEL_ID, DRIP_ID)
      : (new Date()).toISOString().slice(0,10);

    async function load(url) {
      try {
        if (!url) return null;
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw 0;
        return await r.json();
      } catch {
        return null;
      }
    }

    const raw = await load(window.DATA_DICAS);

    // Aceita _data como array direto OU como { dicas: [...] }
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    if (!data || data.length === 0) {
      const meta  = $('#dica-meta');
      const texto = $('#dica-texto');
      if (meta)  meta.textContent  = 'Dia —';
      if (texto) texto.textContent = 'Dica indisponível.';
      return;
    }

    const MAX_DAYS = Math.min(60, data.length);
    const todayIdx = (typeof Drip !== 'undefined')
      ? Drip.getTodayIndex(startISO, MAX_DAYS)
      : 1;

    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    const prev  = $('#btnPrev');
    const next  = $('#btnNext');

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
        // normaliza rótulo
        const cat = (item.categoria || '').toString().toLowerCase();
        const rotulo =
          cat.includes('treino') ? 'Treino' :
          cat.includes('nutri')   ? 'Nutrição' :
          cat.includes('menta') || cat.includes('mind') ? 'Mentalidade' : 'Dica';

        meta.textContent = `Dia ${day} de ${MAX_DAYS} — ${rotulo}`;

        // >>> ajuste: título + texto completo com quebras de linha
        const titulo = item.titulo ? `<strong>${item.titulo}</strong><br>` : '';
        const corpo  = (item.texto || '')
          .replace(/\n{2,}/g, '<br><br>')
          .replace(/\n/g, '<br>');
        texto.innerHTML = `${titulo}${corpo}`;
      } else {
        meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
        texto.textContent = 'Dica indisponível.';
      }

      if (prev) prev.disabled = (day <= 1);
      if (next) next.disabled = (day >= cap);
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
  tabs.forEach(tb => {
    tb.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      tb.classList.add('active');
      $$('.panel').forEach(p => p.classList.remove('active'));
      const target = tb.dataset.tab === 'karvonen' ? '#panel-karvonen' : '#panel-tmb';
      $(target)?.classList.add('active');
    });
  });
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