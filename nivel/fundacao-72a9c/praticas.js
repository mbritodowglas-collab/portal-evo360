/* ===== Práticas Mentais – EVO360 Fundação ===== */
(function(){
  // Tabs
  const tabs = document.querySelectorAll('.tab');
  const panels = { resp: '#panel-resp', viz: '#panel-viz', relax: '#panel-relax' };
  tabs.forEach(tb=>{
    tb.addEventListener('click', ()=>{
      tabs.forEach(x=>x.classList.remove('active'));
      tb.classList.add('active');
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      const sel = panels[tb.dataset.tab];
      if(sel) document.querySelector(sel).classList.add('active');
    });
  });

  // util
  const fmt = s => {
    s = Math.max(0, Math.floor(s));
    const m = String(Math.floor(s/60)).padStart(2,'0');
    const r = String(s%60).padStart(2,'0');
    return `${m}:${r}`;
  };

  // Ping (WebAudio)
  let audioCtx = null;
  function ping(){
    try{
      if(!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type='sine'; o.frequency.setValueAtTime(880, audioCtx.currentTime);
      g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      o.connect(g); g.connect(audioCtx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.20);
      o.stop(audioCtx.currentTime+0.22);
    }catch(_){}
  }

  // ===== Respiração 4–2–6 (inalterado) =====
  (function(){
    const durSel = document.getElementById('r_dur');
    const phase  = document.getElementById('r_phase');
    const count  = document.getElementById('r_count');
    const timer  = document.getElementById('r_timer');
    const start  = document.getElementById('r_start');
    const stop   = document.getElementById('r_stop');

    let running=false, left=0, tickI=null, pingI=null;
    let subLeft=0, subMode='ready'; // 'in','hold','out'

    function setUI(run){ start.disabled=run; stop.disabled=!run; }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tickI); clearInterval(pingI);
      phase.textContent='Pronto'; count.textContent='—'; timer.textContent='00:00';
    }
    function nextSubcycle(){
      if(subMode==='ready' || subMode==='out'){ subMode='in'; subLeft=4; phase.textContent='Inspire'; }
      else if(subMode==='in'){ subMode='hold'; subLeft=2; phase.textContent='Segure'; }
      else if(subMode==='hold'){ subMode='out'; subLeft=6; phase.textContent='Expire'; }
    }
    function tick(){
      if(!running) return;
      left--; timer.textContent = fmt(left);
      if(left<=0){ stopAll(); return; }
      if(subLeft<=0) nextSubcycle();
      count.textContent = String(subLeft);
      subLeft--;
    }
    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||120;
      timer.textContent = fmt(left);
      subMode='ready'; subLeft=0; nextSubcycle();
      count.textContent = String(subLeft);
      tickI = setInterval(tick, 1000);
      ping(); pingI = setInterval(ping, 60000);
    });
    stop.addEventListener('click', stopAll);
  })();

  // ===== Visualização Mental (AJUSTADO) =====
  (function(){
    // Roteiro completo para LER ANTES
    const readAll = [
      "Respire fundo e suavize o corpo.",
      "Traga à mente uma versão sua com energia, leveza e postura confiante.",
      "Veja-se movendo com prazer, sentindo o corpo responder bem.",
      "Imagine uma rotina simples e consistente, dia após dia.",
      "Perceba o orgulho após cumprir pequenas metas.",
      "Sinta o foco crescer; distrações perdem força.",
      "Escolhas que nutrem e sustentam você.",
      "Conclua um treino mentalmente: satisfação e bem-estar.",
      "Agradeça pela sua dedicação.",
      "Quando terminar a leitura: feche os olhos e pressione Iniciar."
    ];

    // Mensagens curtas que avançam a cada 4s DURANTE a prática (olhos fechados)
    const cues = [
      "Respiração calma… mantenha a imagem.",
      "Reforce sua postura interna confiante.",
      "Sinta consistência diária.",
      "Atenção gentil, intenção clara.",
      "Celebre sua pequena vitória.",
      "Retorne ao objetivo principal.",
      "Veja escolhas que te fazem bem.",
      "Sinta o corpo leve e ativo.",
      "Gratidão por você hoje.",
      "Leve isso para o resto do dia."
    ];

    const durSel = document.getElementById('v_dur');
    const readBox= document.getElementById('v_readfirst');
    const label  = document.getElementById('v_line');
    const timer  = document.getElementById('v_timer');
    const start  = document.getElementById('v_start');
    const stop   = document.getElementById('v_stop');
    const prev   = document.getElementById('v_prev');
    const next   = document.getElementById('v_next');

    // Preenche o bloco “ler antes”
    if(readBox){
      readBox.innerHTML = `
        <ol style="margin-left:18px">
          ${readAll.map(t=>`<li style="margin:6px 0">${t}</li>`).join('')}
        </ol>
        <div class="muted" style="margin-top:8px"><small>Dica: se preferir, leia em voz baixa para engajar mais áreas do cérebro.</small></div>
      `;
    }

    let idx=0, running=false, left=0, tickI=null, autoI=null, pingI=null;

    function show(){ label.innerHTML = cues[idx] || ''; }
    function setUI(run){
      start.disabled=run; stop.disabled=!run;
      prev.disabled=!run; next.disabled=!run;
    }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tickI); clearInterval(autoI); clearInterval(pingI);
      timer.textContent='00:00';
      // ao parar, volta a mensagem neutra
      label.innerHTML = `<em>Pronto para começar? Depois de ler, feche os olhos e pressione Iniciar.</em>`;
    }

    prev.addEventListener('click', ()=>{ if(!running) return; idx = (idx-1+cues.length)%cues.length; show(); });
    next.addEventListener('click', ()=>{ if(!running) return; idx = (idx+1)%cues.length; show(); });

    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||120;
      timer.textContent = fmt(left);
      idx=0; show();
      // contador e auto-avance 4s
      tickI = setInterval(()=>{ left--; timer.textContent=fmt(left); if(left<=0) stopAll(); }, 1000);
      autoI = setInterval(()=>{ if(!running) return; idx=(idx+1)%cues.length; show(); }, 4000);
      // ping por minuto (toca um no início)
      ping(); pingI = setInterval(ping, 60000);
    });

    stop.addEventListener('click', stopAll);
  })();

  // ===== Relaxamento Guiado (inalterado) =====
  (function(){
    const steps = [
      "<strong>Cabeça e testa:</strong> solte a expressão, alise a testa por dentro.",
      "<strong>Olhos e face:</strong> relaxe pálpebras, bochechas e mandíbula.",
      "<strong>Pescoço:</strong> alivie a nuca; alongue suavemente por dentro.",
      "<strong>Ombros:</strong> deixe pesarem, afaste-os das orelhas.",
      "<strong>Braços e mãos:</strong> solte bíceps, antebraços e dedos.",
      "<strong>Peito:</strong> respiração ampla e tranquila.",
      "<strong>Abdômen:</strong> descontraia; permita o fluxo da respiração.",
      "<strong>Costas:</strong> relaxe entre as escápulas e lombar.",
      "<strong>Quadris:</strong> libere tensões profundas.",
      "<strong>Pernas e pés:</strong> solte coxas, panturrilhas e dedos dos pés.",
      "Permaneça alguns instantes nessa quietude atenta."
    ];
    const durSel = document.getElementById('l_dur');
    const label  = document.getElementById('l_line');
    const timer  = document.getElementById('l_timer');
    const start  = document.getElementById('l_start');
    const stop   = document.getElementById('l_stop');
    const prev   = document.getElementById('l_prev');
    const next   = document.getElementById('l_next');

    let idx=0, running=false, left=0, tickI=null, autoI=null, pingI=null;

    function show(){ label.innerHTML = steps[idx] || ''; }
    function setUI(run){ start.disabled=run; stop.disabled=!run; prev.disabled=!run; next.disabled=!run; }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tickI); clearInterval(autoI); clearInterval(pingI);
      timer.textContent='00:00';
    }

    prev.addEventListener('click', ()=>{ if(!running) return; idx = (idx-1+steps.length)%steps.length; show(); });
    next.addEventListener('click', ()=>{ if(!running) return; idx = (idx+1)%steps.length; show(); });

    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||120;
      timer.textContent = fmt(left);
      idx=0; show();

      tickI = setInterval(()=>{ left--; timer.textContent=fmt(left); if(left<=0) stopAll(); }, 1000);
      autoI = setInterval(()=>{ if(!running) return; idx=(idx+1)%steps.length; show(); }, 4000);
      ping(); pingI = setInterval(ping, 60000);
    });

    stop.addEventListener('click', stopAll);
  })();
})();