// ============================
// EVO360 · Ascensão
// Página: Dicas e Orientações (JS robusto / compat)
// ============================

(function () {
  // Helpers locais
  function $(s, r) { return (r || document).querySelector(s); }
  function $all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  // ---------- DRIP: Dica do dia ----------
  (function dicaDrip() {
    try {
      var LEVEL_ID = (window && window.NIVEL) || 'ascensao-9f3b2';
      var DRIP_ID  = 'card1_dicas_orientacoes';

      // startISO: usa Drip se existir; senão usa hoje em ISO local (aaaa-mm-dd)
      var startISO;
      if (typeof Drip !== 'undefined' && Drip && typeof Drip.ensureStart === 'function') {
        startISO = Drip.ensureStart(LEVEL_ID, DRIP_ID);
      } else {
        startISO = (function todayISO(){
          var d=new Date(), y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
          return y+'-'+m+'-'+dd;
        })();
      }

      // Caminho do JSON
      var dataPathBase = (window && window.DATA_DICAS) || '../../data/ascensao.json';
      var dataPath = dataPathBase + (dataPathBase.indexOf('?')>-1 ? '&' : '?') + 'cb=' + Date.now();

      function loadJSON(url){
        return fetch(url, { cache:'no-store' })
          .then(function(r){
            if(!r.ok) throw new Error('HTTP '+r.status);
            return r.text(); // lê como texto primeiro pra diagnosticar JSON quebrado
          })
          .then(function(txt){
            try { return JSON.parse(txt); }
            catch(parseErr){
              console.warn('[Dica] JSON inválido em', url, parseErr);
              // expõe diagnóstico na UI
              var meta = $('#dica-meta'), texto=$('#dica-texto');
              if(meta) meta.textContent = 'Dia —';
              if(texto) texto.textContent = 'Não foi possível ler o JSON (formatação inválida).';
              return null;
            }
          })
          .catch(function(err){
            console.warn('[Dica] Falha ao carregar JSON:', err);
            var meta = $('#dica-meta'), texto=$('#dica-texto');
            if(meta) meta.textContent = 'Dia —';
            if(texto) texto.textContent = 'Dica indisponível (erro de rede/arquivo).';
            return null;
          });
      }

      function coerceTips(raw){
        // Aceita: array puro; {dicas:[...]}; {items:[...]}; {tips:[...]}.
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (raw.dicas && Array.isArray(raw.dicas)) return raw.dicas;
        if (raw.items && Array.isArray(raw.items)) return raw.items;
        if (raw.tips  && Array.isArray(raw.tips))  return raw.tips;
        return [];
      }

      function getTodayIndexCompat(startISO, maxDays){
        // Usa Drip se existir; senão calcula diferença de dias local
        if (typeof Drip !== 'undefined' && Drip && typeof Drip.getTodayIndex === 'function') {
          return Drip.getTodayIndex(startISO, maxDays);
        }
        function parseISO(s){ return new Date(s+'T12:00:00'); }
        function todayISO(){
          var d=new Date(), y=d.getFullYear(), m=('0'+(d.getMonth()+1)).slice(-2), dd=('0'+d.getDate()).slice(-2);
          return y+'-'+m+'-'+dd;
        }
        var delta = Math.floor((parseISO(todayISO()) - parseISO(startISO)) / 86400000);
        var idx = Math.min(maxDays, delta+1);
        return Math.max(1, idx);
      }

      loadJSON(dataPath).then(function(raw){
        var data = coerceTips(raw);

        var meta  = $('#dica-meta');
        var texto = $('#dica-texto');
        var prev  = $('#btnPrev');
        var next  = $('#btnNext');

        if (!data || !data.length) {
          if (meta)  meta.textContent  = 'Dia —';
          if (texto) texto.textContent = 'Nenhuma dica encontrada. Verifique /data/ascensao.json.';
          return;
        }

        var MAX_DAYS = Math.min(60, data.length);
        var todayIdx = getTodayIndexCompat(startISO, MAX_DAYS);

        // localStorage seguro (sem JSON.parse obrigatório)
        var VIEW_KEY = 'drip_view_'+LEVEL_ID+'_'+DRIP_ID;
        var day = todayIdx;
        try {
          var prevVal = localStorage.getItem(VIEW_KEY);
          if (prevVal != null) {
            // aceita número puro ou JSON; se quebrar, ignora
            var parsed = parseInt(prevVal.replace(/[^0-9]/g,''), 10);
            if (!isNaN(parsed)) day = parsed;
          }
        } catch(_){}

        function setLS(k,v){
          try { localStorage.setItem(k, String(v)); } catch(_){}
        }

        function rotuloCategoria(cat){
          if (cat === 'treino') return 'Treino';
          if (cat === 'nutricao') return 'Nutrição';
          if (cat === 'mentalidade') return 'Mentalidade';
          return 'Dica';
        }

        function render(){
          var cap = Math.max(1, todayIdx);   // trava no dia liberado de hoje
          if (day < 1) day = 1;
          if (day > cap) day = cap;

          var item = data[day-1];
          if (item) {
            var rot = rotuloCategoria(item.categoria);
            if (meta) meta.textContent = 'Dia '+day+' de '+MAX_DAYS+' — '+rot+(item.titulo ? ' · '+item.titulo : '');

            var blocoHTML = '';
            if (item.conceito || item.orientacao) {
              blocoHTML += '<div class="dica-bloco">';
              if (item.conceito)   blocoHTML += '<div class="dica-label">Conceito</div><p style="margin:0 0 10px">'+item.conceito+'</p>';
              if (item.orientacao) blocoHTML += '<div class="dica-label">Orientação</div><p style="margin:0">'+item.orientacao+'</p>';
              blocoHTML += '</div>';
            } else {
              blocoHTML = '<p style="margin:0">'+(item.texto || '')+'</p>';
            }
            if (texto) texto.innerHTML = blocoHTML;
          } else {
            if (meta)  meta.textContent  = 'Dia '+day+' de '+MAX_DAYS;
            if (texto) texto.textContent = 'Dica indisponível.';
          }

          if (prev) prev.disabled = (day <= 1);
          if (next) next.disabled = (day >= Math.max(1,todayIdx));
          setLS(VIEW_KEY, day);
        }

        if (prev) prev.addEventListener('click', function(){ day--; render(); });
        if (next) next.addEventListener('click', function(){ day++; render(); });
        render();
      });
    } catch (e) {
      console.warn('drip init falhou:', e);
      var meta  = $('#dica-meta');
      var texto = $('#dica-texto');
      if (meta)  meta.textContent  = 'Dia —';
      if (texto) texto.textContent = 'Falha ao iniciar as dicas.';
    }
  })();

  // ---------- Abas (Calculadoras) ----------
  (function tabs() {
    var tabs = $all('.tab');
    var panels = $all('.panel');
    if (!tabs.length || !panels.length) return;

    function activate(tabEl) {
      tabs.forEach(function(x){ x.classList.remove('active'); });
      panels.forEach(function(p){ p.classList.remove('active'); });
      tabEl.classList.add('active');
      var key = tabEl.getAttribute('data-tab');
      var target = key ? '#panel-' + key : null;
      var panel = target ? $(target) : null;
      (panel || panels[0]).classList.add('active');
    }

    tabs.forEach(function(tb){ tb.addEventListener('click', function(){ activate(tb); }); });
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
      var fcMax = 220 - a;
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
        out.innerHTML = 'Sua TMB estimada: <strong>'+base+' kcal/dia</strong><br>' +
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