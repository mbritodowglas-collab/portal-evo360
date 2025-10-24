<!-- /portal-evo360/assets/js/dicas-orientacoes.js -->
<script>
// ===== EVO360 Fundação — Drip Controller v1 =====
// Estratégia: t0 = 1ª visita. Card1 (dicas) libera em t0.
// Card2 (plano) libera em t0 + cadenceHours (default 48h).
// Admin overrides: ?unlock=all | ?reset=drip | localStorage.setItem('evo360_admin','1')

;(() => {
  const NS = 'evo360_fundacao';
  const KEY = `${NS}_drip_state`;
  const isAdmin = () => localStorage.getItem('evo360_admin') === '1';
  const HOURS = 60*60*1000;

  const now = () => Date.now();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
  const write = (s) => localStorage.setItem(KEY, JSON.stringify(s));

  function init({ cadenceHours = 48, startAt = null } = {}) {
    const q = new URLSearchParams(location.search);
    if (q.get('reset') === 'drip') { localStorage.removeItem(KEY); return location.replace(location.pathname); }
    if (q.get('unlock') === 'all') { localStorage.setItem('evo360_admin','1'); }

    let s = read();
    if (!s.t0) {
      s = {
        t0: startAt ? new Date(startAt).getTime() : now(),
        cadence: cadenceHours,
        unlocked: { card1: true, card2: false },
        completed: { card1: false, card2: false },
        meta: { version: 1 }
      };
      write(s);
    }
    return compute(s);
  }

  function compute(state) {
    // Card 1 sempre desbloqueado
    state.unlocked.card1 = true;

    // Card 2: t0 + cadence
    const due2 = state.t0 + (state.cadence * HOURS);
    if (now() >= due2 || isAdmin()) state.unlocked.card2 = true;

    state.due = { card2: due2 };
    return state;
  }

  function remainingMs(state, card) {
    if (card === 'card2') {
      const r = (state.due?.card2 || 0) - now();
      return r > 0 ? r : 0;
    }
    return 0;
  }

  function fmt(ms) {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  }

  function gate(selector, { card, onUnlock } = {}) {
    const root = document.querySelector(selector);
    if (!root) return;

    let state = compute(read());

    const lockUI = document.createElement('div');
    lockUI.className = 'evo-lock';
    lockUI.innerHTML = `
      <div class="evo-lock-inner">
        <div class="evo-lock-icon">🔒</div>
        <div class="evo-lock-title">Conteúdo bloqueado</div>
        <div class="evo-lock-sub">Aguarde a liberação automática.</div>
        <div class="evo-lock-count" id="evo-count"></div>
        ${isAdmin() ? `<button class="evo-btn" id="evo-unlock-now">Forçar desbloqueio (admin)</button>` : ''}
      </div>
    `;

    function render() {
      state = compute(read());
      if (state.unlocked[card]) {
        root.removeAttribute('data-locked');
        const bar = document.querySelector('#evo-adminbar'); if (bar) bar.remove();
        if (typeof onUnlock === 'function') onUnlock();
      } else {
        root.setAttribute('data-locked','');
        if (!root.querySelector('.evo-lock')) root.appendChild(lockUI);
        tick();
      }
    }

    function tick() {
      const el = root.querySelector('#evo-count');
      if (!el) return;
      const ms = remainingMs(state, card);
      el.textContent = ms > 0 ? `Libera em ${fmt(ms)}` : 'Quase lá...';
    }

    // Admin bar
    if (isAdmin()) {
      const bar = document.createElement('div');
      bar.id = 'evo-adminbar';
      bar.className = 'evo-adminbar';
      bar.innerHTML = `
        <span>Admin ON • t0: ${new Date(state.t0).toLocaleString()}</span>
        <button class="evo-btn" id="evo-reset">Reset Drip</button>
        <button class="evo-btn" id="evo-unlock-all">Unlock All</button>
      `;
      document.body.appendChild(bar);
      bar.addEventListener('click', (e) => {
        if (e.target.id === 'evo-reset') { localStorage.removeItem(KEY); location.reload(); }
        if (e.target.id === 'evo-unlock-all') { localStorage.setItem('evo360_admin','1'); location.reload(); }
      });
    }

    lockUI.addEventListener('click', (e) => {
      if (e.target.id === 'evo-unlock-now') {
        const s = read(); s.unlocked[card] = true; write(s); render();
      }
    });

    render();
    setInterval(render, 1000);
  }

  // API global minimalista
  window.EVO360_FUNDACAO = {
    init,
    gate,
    state: () => read(),
    markDone: (card) => { const s = read(); s.completed[card] = true; write(s); },
    isUnlocked: (card) => read().unlocked?.[card] === true
  };
})();
</script>

<style>
/* ===== UI do lock/gate ===== */
[data-locked]{ position:relative; }
[data-locked] > *:not(.evo-lock){ filter: blur(3px); pointer-events:none; user-select:none; }
.evo-lock{ position:absolute; inset:0; display:grid; place-items:center; background:rgba(11,13,13,.62); backdrop-filter: blur(3px); }
.evo-lock-inner{ background:rgba(0,0,0,.78); color:#fff; padding:18px 20px; border:1px solid rgba(255,255,255,.12); border-radius:14px; text-align:center; min-width:260px; }
.evo-lock-icon{ font-size:28px; margin-bottom:6px; }
.evo-lock-title{ font-weight:800; letter-spacing:.3px; }
.evo-lock-sub{ font-size:13px; opacity:.9; margin:4px 0 10px; }
.evo-lock-count{ font-family: ui-monospace, monospace; font-size:14px; opacity:.9; margin-bottom:10px; }
.evo-btn{ background:#111; color:#fff; border:1px solid rgba(255,255,255,.2); border-radius:10px; padding:8px 10px; cursor:pointer; }
.evo-btn:hover{ filter:brightness(1.15); }
.evo-adminbar{ position:fixed; z-index:9999; bottom:10px; right:10px; background:#0b0d0d; color:#fff; border:1px solid rgba(255,255,255,.18); border-radius:12px; padding:8px 10px; display:flex; align-items:center; gap:8px; font-size:12px; opacity:.95 }
</style>