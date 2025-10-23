// ============================
// EVO360 · Fundação
// Página: Dicas e Orientações
// ============================

// Utilidades locais
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- DRIP: Dica do dia (usa Drip.js já incluído) ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_dicas_orientacoes';
    const MAX_DAYS = 60;

    // garante start e índice do dia (1..60)
    const startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
    const todayIdx = Drip.getTodayIndex(startISO, MAX_DAYS);

    // carrega dataset
    const load = async (url) => {
      try { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) throw 0; return await r.json(); }
      catch { return null; }
    };
    const data = await load(window.DATA_DICAS);

    // elementos
    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    const prev  = $('#btnPrev');
    const next  = $('#btnNext');

    // estado de visualização (lembra onde o usuário parou)
    const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
    let day = Drip.LS.get(VIEW_KEY, todayIdx);

    function render() {
      // trava visualização no passado/presente (sem futuro)
      day = Math.max(1, Math.min(day, todayIdx));

      const item = data && data[day - 1];
      if (item) {
        const rotulo = item.categoria === 'treino' ? 'Treino' : (item.categoria === 'nutricao' ? 'Nutrição' : 'Dica');
        meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${rotulo}`;
        texto.textContent = item.texto;
      } else {
        meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
        texto.textContent = 'Dica indisponível.';
      }

      prev.disabled = (day <= 1);
      next.disabled = (day >= todayIdx);
      Drip.LS.set(VIEW_KEY, day);
    }

    prev?.addEventListener('click', () => { day--; render(); });
    next?.addEventListener('click', () => { day++; render(); });
    render();
  } catch (e) {
    // falha silenciosa para não travar a página
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
      // alterna painéis
      $$('.panel').forEach(p => p.classList.remove('active'));
      const id = tb.dataset.tab;
      const map = { karvonen: '#panel-karvonen', tmb: '#panel-tmb' };
      const target = $(map[id]);
      if (target) target.classList.add('active');
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

  if (!idade || !fcr || !out || !table || !btn || !clr) return; // HTML não encontrado

  function karvonenTarget(fcMax, fcRep, frac) {
    // Fórmula Karvonen: alvo = ((FCmax - FCrep) * frac) + FCrep
    return Math.round(((fcMax - fcRep) * frac) + fcRep);
  }

  function construirTabela(fcMax, fcRep) {
    // zonas de 50% a 80% (de 5 em 5)
    const linhas = [];
    for (let pct = 50; pct <= 80; pct += 5) {
      const frac = pct / 100;
      const alvo = karvonenTarget(fcMax, fcRep, frac);
      linhas.push(`<div class="row" style="justify-content:space-between">
        <span>${pct}% da FC de reserva</span>
        <strong>${alvo} bpm</strong>
      </div>`);
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

    const fcMax = 220 - a;                 // FCmáx estimada
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
    out.textContent   = 'Informe os dados e clique em Calcular.';
    table.innerHTML   = '';
  }

  // eventos
  btn.addEventListener('click', calcular);
  clr.addEventListener('click', limpar);

  // acessibilidade: Enter nos inputs dispara cálculo
  [idade, fcr].forEach(el => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        calcular();
      }
    });
  });
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
    const s = sex.value || 'f';

    if (p > 0 && h > 0 && i > 0) {
      const base = Math.round((10 * p) + (6.25 * h) - (5 * i) + (s === 'f' ? -161 : 5));
      out.innerHTML = `Sua TMB estimada: <strong>${base} kcal/dia</strong><br>
        <span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
    } else {
      out.textContent = 'Preencha peso, altura e idade.';
    }
  }

  ['input', 'change'].forEach(ev => {
    peso.addEventListener(ev, calc);
    alt.addEventListener(ev, calc);
    ida.addEventListener(ev, calc);
    sex.addEventListener(ev, calc);
  });
  calc();
})();