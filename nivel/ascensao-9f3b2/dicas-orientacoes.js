<!-- dicas-orientacoes.js (Ascensão) -->
<script>
// ============================
// EVO360 · Ascensão
// Página: Dicas e Orientações (JS completo)
// ============================

// Helpers
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL
      || (location.pathname.match(/ascensao-[\w-]+/)||[])[0]
      || 'ascensao-9xxxx';

    const DRIP_ID  = 'card1_dicas_orientacoes';

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
    const data = Array.isArray(raw) ? raw : (raw && Array.isArray(raw.dicas) ? raw.dicas : []);

    if (!data || data.length === 0) {
      $('#dica-meta')?.textContent  = 'Dia —';
      $('#dica-texto')?.textContent = 'Dica indisponível.';
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

    if (texto) {
      texto.style.whiteSpace   = 'normal';
      texto.style.overflowWrap = 'anywhere';
      texto.style.wordBreak    = 'break-word';
      texto.style.lineHeight   = '1.6';
      texto.style.marginTop    = '6px';
    }

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
  const tabs = $$('.tabs .tab');
  const panels = $$('.panel');
  if (!tabs.length || !panels.length) return;

  function activate(tabEl) {
    tabs.forEach(x => x.classList.remove('active'));
    panels.forEach(p => p.classList.remove('active'));
    tabEl.classList.add('active');
    const key = tabEl.dataset.tab;
    const panel = key ? document.getElementById('panel-' + key) : null;
    (panel || panels[0])?.classList.add('active');
  }

  tabs.forEach(tb => tb.addEventListener('click', () => activate(tb)));
  activate(tabs.find(t=>t.classList.contains('active')) || tabs[0]);
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

  const hrMax = (age) => 208 - 0.7*age; // fórmula atualizada
  const target = (hmax, fcrep, frac) => Math.round(((hmax - fcrep) * frac) + fcrep);

  function construirTabela(hmax, fcrep){
    const pcts = [50,55,60,65,70,75,80];
    return pcts.map(p=>{
      const thr = target(hmax, fcrep, p/100);
      return `<div class="row" style="justify-content:space-between"><span>${p}%</span><strong>${thr} bpm</strong></div>`;
    }).join('');
  }

  function calcular() {
    const a = parseFloat(idade.value);
    const r = parseFloat(fcr.value);
    if (!Number.isFinite(a) || !Number.isFinite(r) || a<10 || a>100 || r<30 || r>120){
      out.textContent = 'Preencha idade (10–100) e FC de repouso (30–120).';
      table.innerHTML = '';
      return;
    }
    const hmax = hrMax(a);
    const lo = target(hmax, r, 0.50);
    const hi = target(hmax, r, 0.65);
    out.innerHTML = `HRmáx ≈ <strong>${Math.round(hmax)} bpm</strong><br><span class="small muted">Faixa sugerida (Ascensão): ${lo}–${hi} bpm</span>`;
    table.innerHTML = construirTabela(hmax, r);
  }

  function limpar(){
    idade.value=''; fcr.value='';
    out.textContent='Informe idade e FC de repouso e clique em Calcular.';
    table.innerHTML='';
  }

  btn.addEventListener('click', calcular);
  clr.addEventListener('click', limpar);
  [idade,fcr].forEach(el=> el.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); calcular(); }}));
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
    const p = parseFloat(peso.value);
    const h = parseFloat(alt.value);
    const i = parseFloat(ida.value);
    const s = (sex.value||'f').toLowerCase();
    if (![p,h,i].every(Number.isFinite)) { out.textContent='Preencha peso, altura e idade.'; return; }
    const base = (10*p) + (6.25*h) - (5*i);
    const tmb  = Math.round(s==='m' ? base + 5 : base - 161);
    out.innerHTML = `Sua TMB estimada: <strong>${tmb} kcal/dia</strong><br><span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>`;
  }
  ['input','change'].forEach(ev=>{ peso.addEventListener(ev,calc); alt.addEventListener(ev,calc); ida.addEventListener(ev,calc); sex.addEventListener(ev,calc); });
  calc();
})();
</script>