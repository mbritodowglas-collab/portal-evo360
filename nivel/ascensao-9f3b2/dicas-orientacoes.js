// ============================
// EVO360 · Ascensão
// Página: Dicas e Orientações (JS robusto / compat)
// ============================

(function () {
  // Helpers locais
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---- DRIP shim (fallback local) ----
  (function ensureDrip(){
    if (typeof window.Drip !== 'undefined') return;

    function localISO(d){
      d = d || new Date();
      var y  = d.getFullYear();
      var m  = ('0'+(d.getMonth()+1)).slice(-2);
      var dd = ('0'+d.getDate()).slice(-2);
      return y + '-' + m + '-' + dd;
    }

    function parseISO(s){ return new Date(s + 'T12:00:00'); }
    function todayISO(){ return localISO(new Date()); }
    function daysBetween(a,b){
      return Math.floor((parseISO(b) - parseISO(a)) / 86400000);
    }

    var LS = {
      get: function(k,d){
        try{
          var v = localStorage.getItem(k);
          return v ? JSON.parse(v) : d;
        } catch(_) {
          return d;
        }
      },
      set: function(k,v){
        try{
          localStorage.setItem(k, JSON.stringify(v));
        } catch(_) {}
      }
    };

    window.Drip = {
      ensureStart: function(levelId, streamId){
        var KEY   = 'drip_start_' + levelId + '_' + streamId;
        var start = LS.get(KEY, null);
        if (!(/^\d{4}-\d{2}-\d{2}$/.test(start || ''))) {
          start = todayISO();
          LS.set(KEY, start);
        }
        return start;
      },
      getTodayIndex: function(startISO, maxDays){
        if (!(/^\d{4}-\d{2}-\d{2}$/.test(startISO || ''))) {
          startISO = todayISO();
        }
        var idx = daysBetween(startISO, todayISO()) + 1;
        if (idx < 1) idx = 1;
        if (idx > maxDays) idx = maxDays;
        return idx;
      }
    };
  })();

  function cacheBust(url){
    try {
      var u = new URL(url, location.href);
      u.searchParams.set('cb', Date.now());
      return u.href;
    } catch {
      return url;
    }
  }

  // ---------- DRIP: Dica do dia ----------
  (function dicaDrip() {
    try {
      var LEVEL_ID = (window && window.NIVEL) || 'ascensao-9f3b2';
      var DRIP_ID  = 'card1_dicas_orientacoes';
      var startISO = window.Drip.ensureStart(LEVEL_ID, DRIP_ID);

      var dataPath = cacheBust((window && window.DATA_DICAS) || '../../data/ascensao.json');

      function coerceTips(raw){
        // Igual ao Fundação: array direto ou {dicas:[...]}
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.dicas && Array.isArray(raw.dicas)) return raw.dicas;
        return [];
      }

      fetch(dataPath, { cache:'no-store' })
        .then(function(r){
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(function(raw){
          var data  = coerceTips(raw);
          var meta  = $('#dica-meta');
          var texto = $('#dica-texto');
          var prev  = $('#btnPrev');
          var next  = $('#btnNext');

          if (!data || !data.length) {
            if (meta)  meta.textContent  = 'Dia —';
            if (texto) texto.textContent = 'Dica indisponível.';
            return;
          }

          var MAX_DAYS = Math.min(60, data.length);
          var todayIdx = window.Drip.getTodayIndex(startISO, MAX_DAYS);

          // Sem localStorage do dia visual: sempre começa no dia de hoje
          var day = todayIdx;

          function rotuloCategoria(cat){
            if (cat === 'treino')      return 'Treino';
            if (cat === 'nutricao')    return 'Nutrição';
            if (cat === 'mentalidade') return 'Mentalidade';
            return 'Dica';
          }

          function render(){
            var cap = Math.min(Math.max(1, todayIdx), data.length);
            if (day < 1)   day = 1;
            if (day > cap) day = cap;

            var item = data[day - 1];

            if (item) {
              var rot = rotuloCategoria(item.categoria);
              if (meta) {
                meta.textContent =
                  'Dia ' + day + ' de ' + MAX_DAYS + ' — ' + rot +
                  (item.titulo ? ' · ' + item.titulo : '');
              }

              var blocoHTML;
              if (item.conceito || item.orientacao) {
                blocoHTML = '<div class="dica-bloco">';
                if (item.conceito) {
                  blocoHTML +=
                    '<div class="dica-label" ' +
                    'style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Conceito</div>' +
                    '<p style="margin:0 0 10px">' + item.conceito + '</p>';
                }
                if (item.orientacao) {
                  blocoHTML +=
                    '<div class="dica-label" ' +
                    'style="font-weight:700;color:var(--ink-1);margin:6px 0 2px">Orientação</div>' +
                    '<p style="margin:0">' + item.orientacao + '</p>';
                }
                blocoHTML += '</div>';
              } else {
                blocoHTML = '<p style="margin:0">' + (item.texto || '') + '</p>';
              }

              if (texto) {
                texto.innerHTML          = blocoHTML;
                texto.style.whiteSpace   = 'normal';
                texto.style.overflowWrap = 'anywhere';
                texto.style.wordBreak    = 'break-word';
                texto.style.lineHeight   = '1.6';
                texto.style.marginTop    = '6px';
              }
            } else {
              if (meta)  meta.textContent  = 'Dia ' + day + ' de ' + MAX_DAYS;
              if (texto) texto.textContent = 'Dica indisponível.';
            }

            if (prev) prev.disabled = (day <= 1);
            if (next) next.disabled = (day >= cap);
          }

          if (prev) prev.addEventListener('click', function(){ day--; render(); });
          if (next) next.addEventListener('click', function(){ day++; render(); });

          render();
        })
        .catch(function(err){
          console.warn('[Ascensão/Drip] erro ao carregar JSON:', err);
          var meta  = $('#dica-meta');
          var texto = $('#dica-texto');
          if (meta)  meta.textContent  = 'Dia —';
          if (texto) texto.textContent = 'Dica indisponível (erro ao carregar arquivo).';
        });
    } catch (e) {
      console.warn('[Ascensão/Drip] init falhou:', e);
      var meta  = $('#dica-meta');
      var texto = $('#dica-texto');
      if (meta)  meta.textContent  = 'Dia —';
      if (texto) texto.textContent = 'Falha ao iniciar as dicas.';
    }
  })();

  // ---------- Abas (Calculadoras) ----------
  (function tabs() {
    var tabs   = $all('.tab');
    var panels = $all('.panel');
    if (!tabs.length || !panels.length) return;

    function activate(tabEl) {
      tabs.forEach(function(x){ x.classList.remove('active'); });
      panels.forEach(function(p){ p.classList.remove('active'); });
      tabEl.classList.add('active');
      var key    = tabEl.getAttribute('data-tab');
      var target = key ? '#panel-' + key : null;
      var panel  = target ? $(target) : null;
      (panel || panels[0]).classList.add('active');
    }

    tabs.forEach(function(tb){
      tb.addEventListener('click', function(){ activate(tb); });
    });
    var anyActive = tabs.filter(function(t){ return t.classList.contains('active'); })[0] || tabs[0];
    activate(anyActive);
  })();

  // ---------- Calculadora · FC de Reserva (Karvonen) ----------
  (function karvonen() {
    var idade = $('#k_idade');
    var fCR   = $('#k_fcr');
    var out   = $('#k_out');
    var table = $('#k_table');
    var btn   = $('#k_calcBtn');
    var clr   = $('#k_clearBtn');

    if (!idade || !fCR || !out || !table || !btn || !clr){
      console.warn('[Karvonen] Elementos não encontrados no HTML.');
      return;
    }

    function karvonenTarget(fcMax, fcRep, frac) {
      return Math.round(((fcMax - fcRep) * frac) + fcRep);
    }

    function construirTabela(fcMax, fcRep) {
      var linhas = [];
      for (var pct = 50; pct <= 80; pct += 5) {
        var frac = pct / 100;
        var alvo = karvonenTarget(fcMax, fcRep, frac);
        linhas.push(
          '<div class="row" style="justify-content:space-between">' +
            '<span>'+pct+'% da FC de reserva</span>' +
            '<strong>'+alvo+' bpm</strong>' +
          '</div>'
        );
      }
      return linhas.join('');
    }

    function calcular() {
      var a = parseInt(idade.value,10) || 0;
      var r = parseInt(fCR.value,10)   || 0;
      if (a <= 0 || r <= 0) {
        out.textContent = 'Informe idade e FC de repouso.';
        table.innerHTML = '';
        return;
      }
      var fcMax  = 220 - a;
      var alvo50 = karvonenTarget(fcMax, r, 0.50);
      var alvo65 = karvonenTarget(fcMax, r, 0.65);
      out.innerHTML =
        'FC máx. estimada: <strong>'+fcMax+' bpm</strong><br>' +
        '<span class="small muted">Faixa sugerida: '+alvo50+'–'+alvo65+' bpm</span>';
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
    [idade, fCR].forEach(function(el){
      el.addEventListener('keydown', function(e){
        if (e.key === 'Enter') { e.preventDefault(); calcular(); }
      });
    });
  })();

  // ---------- Calculadora · TMB ----------
  (function tmb() {
    var peso = $('#t_peso');
    var alt  = $('#t_altura');
    var ida  = $('#t_idade');
    var sex  = $('#t_sexo');
    var out  = $('#t_out');

    if (!peso || !alt || !ida || !sex || !out){
      console.warn('[TMB] Elementos não encontrados no HTML.');
      return;
    }

    function calc() {
      var p = parseFloat(peso.value) || 0;
      var h = parseFloat(alt.value)  || 0;
      var i = parseInt(ida.value,10) || 0;
      var s = String(sex.value || 'f').toLowerCase();

      if (p > 0 && h > 0 && i > 0) {
        var base = Math.round((10*p) + (6.25*h) - (5*i) + (s === 'f' ? -161 : 5));
        out.innerHTML =
          'Sua TMB estimada: <strong>'+base+' kcal/dia</strong><br>' +
          '<span class="small muted">Autoconhecimento energético — não é um plano alimentar.</span>';
      } else {
        out.textContent = 'Preencha peso, altura e idade.';
      }
    }

    ['input','change'].forEach(function(ev){
      peso.addEventListener(ev, calc);
      alt.addEventListener(ev, calc);
      ida.addEventListener(ev, calc);
      sex.addEventListener(ev, calc);
    });
    calc();
  })();
})();