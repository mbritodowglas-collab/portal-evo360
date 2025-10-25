<script>
// ============================
// EVO360 · Fundação
// Página: Dicas e Orientações (JS completo, com fallbacks e debug)
// ============================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ------- helpers de fetch + debug -------
function cacheBust(url){
  if(!url) return url;
  const u = new URL(url, location.href);
  u.searchParams.set('cb', String(Date.now()));
  return u.href;
}
async function tryLoad(urls){
  for (const u of urls){
    try{
      if(!u) continue;
      const url = cacheBust(u);
      const r = await fetch(url, { cache: 'no-store' });
      console.debug('[Dicas] tentando:', url, 'status:', r.status);
      if (!r.ok) continue;
      const j = await r.json();
      console.debug('[Dicas] carregado de:', u, 'itens:', Array.isArray(j) ? j.length : (j?.dicas?.length ?? 'n/a'));
      return j;
    }catch(err){
      console.warn('[Dicas] falhou em', u, err);
    }
  }
  return null;
}

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'fundacao-72a9c';
    const DRIP_ID  = 'card1_dicas_orientacoes';

    // marca/recupera início (e auto-heal se futuro)
    let startISO = (typeof Drip !== 'undefined')
      ? Drip.ensureStart(LEVEL_ID, DRIP_ID)
      : (new Date()).toISOString().slice(0,10);

    if (typeof Drip !== 'undefined') {
      const diff = Drip.diffFrom(startISO);
      if (diff < 0) {
        Drip.reset(LEVEL_ID, DRIP_ID);
        startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
      }
      console.debug('[Dicas] start=', startISO, 'today=', Drip.getTodayISO(), 'diff=', Drip.diffFrom(startISO));
    } else {
      console.warn('[Dicas] Drip não encontrado — usando fallback simples.');
    }

    // Caminhos possíveis (prioriza window.DATA_DICAS, depois absolutos do projeto)
    const raw = await tryLoad([
      window.DATA_DICAS,                           // definido no HTML
      '/portal-evo360/data/fundacao.json',         // absoluto no GitHub Pages do projeto
      '/data/fundacao.json'                        // absoluto na raiz do domínio (fallback)
    ]);

    const meta  = $('#dica-meta');
    const texto = $('#dica-texto');
    const prev  = $('#btnPrev');
    const next  = $('#btnNext');

    // Aceita array direto OU {dicas:[...]}
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    if (!data || data.length === 0) {
      meta  && (meta.textContent = 'Dia —');
      texto && (texto.textContent = 'Dica indisponível.');
      if (prev) prev.disabled = true;
      if (next) next.disabled = true;
      console.error('[Dicas] Nenhum dado válido encontrado.');
      return;
    }

    const MAX_DAYS = Math.min(60, data.length);
    const todayIdx = (typeof Drip !== 'undefined') ? Drip.getTodayIndex(startISO, MAX_DAYS) : 1;

    // estilo para texto longo
    if (texto) {
      Object.assign(texto.style, {
        whiteSpace: 'normal',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        lineHeight: '1.6',
        marginTop: '6px'
      });
    }

    // controle de navegação (persiste último visto)
    const VIEW_KEY = `drip_view_${LEVEL_ID}_${DRIP_ID}`;
    const LS = {
      get:(k,d=null)=>{ try{ const v=localStorage.getItem(k); return v?JSON.parse(v):d }catch(_){ return d } },
      set:(k,v)=>localStorage.setItem(k, JSON.stringify(v))
    };

    let day = LS.get(VIEW_KEY, todayIdx);

    function render() {
      const cap = Math.max(1, todayIdx); // não passa do liberado
      day = Math.max(1, Math.min(day, cap));
      const item = data[day - 1];

      if (item) {
        const rotulo =
          item.categoria === 'treino' ? 'Treino' :
          item.categoria === 'nutricao' ? 'Nutrição' :
          item.categoria === 'mentalidade' ? 'Mentalidade' : 'Dica';

        meta.textContent  = `Dia ${day} de ${MAX_DAYS} — ${rotulo}${item.titulo ? ` · ${item.titulo}` : ''}`;

        texto.innerHTML = (item.conceito || item.orientacao)
          ? `
            <div class="dica-bloco">
              ${item.conceito ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
              ${item.orientacao ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
            </div>`
          : `<p style="margin:0">${item.texto || ''}</p>`;
      } else {
        meta.textContent  = `Dia ${day} de ${MAX_DAYS}`;
        texto.textContent = 'Dica indisponível.';
      }

      if (prev) prev.disabled = (day <= 1);
      if (next) next.disabled = (day >= cap);
      LS.set(VIEW_KEY, day);
      console.debug('[Dicas] render dia=', day, 'cap=', cap, 'todayIdx=', todayIdx);
    }

    prev?.addEventListener('click', ()=>{ day--; render(); });
    next?.addEventListener('click', ()=>{ day++; render(); });
    render();

  } catch (e) {
    console.warn('dicaDrip falhou:', e);
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

  const karvonenTarget = (fcMax, fcRep, frac) => Math.round(((fcMax - fcRep) * frac) + fcRep);

  const construirTabela = (fcMax, fcRep) => {
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
  };

  function calcular() {
    const a = +idade.value || 0;
    const r = +fcr.value   || 0;
    if (a <= 0 || r <= 0) {
      out.textContent = 'Informe idade e FC de repouso.';
      table.innerHTML = '';
      return;
    }
    const fcMax = 220 - a;
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
  [idade, fcr].forEach(el => el.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); calcular(); }
  }));
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
</script>