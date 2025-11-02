// ============================
// EVO360 · Domínio
// Página: Dicas e Orientações (JS completo, com avanço automático seguro)
// ============================

// Helpers
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// ---------- DRIP: Dica do dia ----------
(async function dicaDrip() {
  try {
    const LEVEL_ID = window.NIVEL || 'dominio-83f9x';
    const DRIP_ID  = 'card1_dicas_orientacoes';

    // pode não existir se drip.js não carregar
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

    // garanta no HTML:
    // window.DATA_DICAS = "../../data/dominio.json";
    const raw = await load(window.DATA_DICAS);

    // aceita array direto OU { dicas: [...] }
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
      set:(k,v)=>{ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){} }
    };

    // carrega o visto; força número válido
    let day = Number(LS.get(VIEW_KEY, todayIdx)) || todayIdx;

    // avanço automático seguro para o último dia liberado
    const cap = Math.max(1, todayIdx);
    if (day < cap) { day = cap; LS.set(VIEW_KEY, day); }

    function render() {
      let cur = Math.max(1, Math.min(day, cap));
      const item = data[cur - 1];

      if (item) {
        const rotulo =
          item.categoria === 'treino'       ? 'Treino'      :
          item.categoria === 'nutricao'     ? 'Nutrição'    :
          item.categoria === 'mentalidade'  ? 'Mentalidade' : 'Dica';

        if (meta) meta.textContent = `Dia ${cur} de ${MAX_DAYS} — ${rotulo}${item.titulo ? ` · ${item.titulo}` : ''}`;

        const blocoHTML = (item.conceito || item.orientacao)
          ? `
            <div class="dica-bloco">
              ${item.conceito   ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div><p style="margin:0 0 10px">${item.conceito}</p>` : ''}
              ${item.orientacao ? `<div class="dica-label" style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div><p style="margin:0">${item.orientacao}</p>` : ''}
            </div>`
          : `<p style="margin:0">${item.texto || ''}</p>`;

        if (texto) texto.innerHTML = blocoHTML;
      } else {
        meta  && (meta.textContent  = `Dia ${cur} de ${MAX_DAYS}`);
        texto && (texto.textContent = 'Dica indisponível.');
      }

      if (prev) prev.disabled = (cur <= 1);
      if (next) next.disabled = (cur >= cap);
      day = cur;
      LS.set(VIEW_KEY, day);
    }

    prev?.addEventListener('click', () => { day--; render(); });
    next?.addEventListener('click', () => { day++; render(); });
    render();
  } catch (e) {
    console.warn('drip init falhou:', e);
  }
})();