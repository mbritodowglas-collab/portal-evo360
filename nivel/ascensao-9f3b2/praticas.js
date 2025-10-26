<script>
/* ===== EVO360 · Práticas Mentais — compat Ascensão/Fundação ===== */
(function(){
  // ---------- Helpers ----------
  const $  = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
  const byId = (...ids) => ids.map(id=>document.getElementById(id)).find(Boolean) || null;

  const fmt = s => {
    s = Math.max(0, s|0);
    const m = String(Math.floor(s/60)).padStart(2,'0');
    const ss= String(s%60).padStart(2,'0');
    return `${m}:${ss}`;
  };

  // Beep (WebAudio)
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
      g.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime+0.25);
      o.stop(audioCtx.currentTime+0.27);
    }catch(_){}
  }

  // ---------- Tabs (aceita resp/respiracao, viz/visualizacao) ----------
  (function tabs(){
    const tabs = $$('.tab');
    const PANEL = {
      respiracao: ['#panel-respiracao','#panel-resp'],
      resp:       ['#panel-respiracao','#panel-resp'],
      visualizacao:['#panel-visualizacao','#panel-viz'],
      viz:        ['#panel-visualizacao','#panel-viz'],
      relax:      ['#panel-relax']
    };
    function pickSel(list){ return (list||[]).map(s=>$(s)).find(Boolean); }
    tabs.forEach(tb=>{
      tb.addEventListener('click', ()=>{
        tabs.forEach(x=>x.classList.remove('active'));
        tb.classList.add('active');
        $$('.panel').forEach(p=>p.classList.remove('active'));
        const key = tb.dataset.tab || '';
        const panel = pickSel(PANEL[key]);
        (panel || $$('.panel')[0])?.classList.add('active');
      });
    });
  })();

  // ---------- Respiração (4–4–6) ----------
  (function(){
    // IDs Fundação: r_*  —  Ascensão: respiro_*
    const durSel = byId('respiro_dur','r_dur');
    const phase  = byId('respiro_phase','r_phase');
    const barEl  = byId('respiro_bar');          // Ascensão (barra ▮▯)
    const count  = byId('r_count');              // Fundação (contador numérico)
    const timer  = byId('respiro_time','r_timer');
    const start  = byId('respiro_start','r_start');
    const stop   = byId('respiro_stop','r_stop');
    if(!durSel || !phase || !timer || !start || !stop) return;

    let running=false, left=0, tickI=null, pingI=null;
    let subLeft=0, subDur=0, mode='ready'; // 'in','hold','out'
    function setUI(run){ start.disabled=run; stop.disabled=!run; }
    function drawBar(){
      if(!barEl) return;
      const p = subDur? Math.round((1-(subLeft/subDur))*10) : 0;
      barEl.textContent = '▮'.repeat(p) + '▯'.repeat(10-p);
    }
    function showCount(){
      if(count) count.textContent = String(Math.max(0, subLeft|0));
    }
    function setPhase(name, secs){ mode=name; subLeft=secs; subDur=secs; phase.textContent =
      (name==='in'?'Inspire '+secs+'s': name==='hold'?'Segure '+secs+'s':'Expire '+secs+'s'); }
    function nextSub(){
      if(mode==='ready' || mode==='out') setPhase('in',4);
      else if(mode==='in')               setPhase('hold',4);
      else                               setPhase('out',6);
      drawBar(); showCount();
    }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tickI); clearInterval(pingI);
      phase.textContent='Pronto';
      if(barEl) barEl.textContent='—';
      if(count) count.textContent='—';
      timer.textContent='00:00';
    }
    function tick(){
      if(!running) return;
      left--; timer.textContent = fmt(left);
      if(left<=0){ stopAll(); return; }
      if(subLeft<=0) nextSub();
      subLeft--; drawBar(); showCount();
    }

    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||300;
      timer.textContent = fmt(left);
      mode='ready'; subLeft=0; nextSub();
      tickI = setInterval(tick, 1000);
      ping(); pingI = setInterval(ping, 60000);
    });
    stop.addEventListener('click', stopAll);
  })();

  // ---------- Visualização ----------
  (function(){
    // Fundação: v_*  —  Ascensão: viz_*
    const durSel = byId('viz_dur','v_dur');
    const readBox= byId('viz_text','v_readfirst');           // caixa com roteiro para ler
    const label  = byId('viz_status','v_line');              // linha dinâmica durante prática
    const clock  = byId('viz_clock','v_timer');
    const start  = byId('viz_start','v_start');
    const stop   = byId('viz_stop','v_stop');
    const prev   = byId('v_prev');                           // (opcionais)
    const next   = byId('v_next');
    if(!durSel || !readBox || !label || !clock || !start || !stop) return;

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

    // Preenche o bloco de leitura
    readBox.innerHTML = `
      <div class="note" style="margin-bottom:6px">Depois de ler, <strong>feche os olhos</strong> e inicie a prática.</div>
      <ol style="margin-left:18px">${readAll.map(t=>`<li style="margin:6px 0">${t}</li>`).join('')}</ol>
      <div class="note" style="margin-top:8px"><small>Dica: ler em voz baixa aumenta o engajamento.</small></div>
    `;

    let running=false, left=0, tI=null, cueI=null, pingI=null, idx=0;
    function setUI(run){
      start.disabled=run; stop.disabled=!run;
      if(prev) prev.disabled=!run;
      if(next) next.disabled=!run;
    }
    function show(){ label.innerHTML = cues[idx]||''; }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tI); clearInterval(cueI); clearInterval(pingI);
      clock.textContent='00:00';
      label.innerHTML='Pronto para começar? Depois de ler, feche os olhos e pressione Iniciar.';
    }
    if(prev) prev.addEventListener('click', ()=>{ if(!running) return; idx=(idx-1+cues.length)%cues.length; show(); });
    if(next) next.addEventListener('click', ()=>{ if(!running) return; idx=(idx+1)%cues.length; show(); });

    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||300;
      clock.textContent = fmt(left);
      idx=0; show();
      tI   = setInterval(()=>{ left--; clock.textContent=fmt(left); if(left<=0) stopAll(); }, 1000);
      cueI = setInterval(()=>{ if(!running) return; idx=(idx+1)%cues.length; show(); }, 4000);
      ping(); pingI = setInterval(ping, 60000);
    });
    stop.addEventListener('click', stopAll);
  })();

  // ---------- Relaxamento guiado ----------
  (function(){
    // Fundação: l_*  —  Ascensão: relax_*
    const durSel = byId('relax_dur','l_dur');
    const label  = byId('relax_step','l_line');
    const clock  = byId('relax_clock','l_timer');
    const start  = byId('relax_start','l_start');
    const stop   = byId('relax_stop','l_stop');
    const prev   = byId('l_prev');   // opcionais
    const next   = byId('l_next');
    if(!durSel || !label || !clock || !start || !stop) return;

    const steps = [
      "Pés e tornozelos — solte com a expiração.",
      "Panturrilhas e joelhos — amoleça.",
      "Coxas e quadris — relaxe o peso.",
      "Abdômen e lombar — respire amplo.",
      "Peito e ombros — solte e abaixe.",
      "Braços e mãos — descanse.",
      "Pescoço, mandíbula e rosto — suavize.",
      "Testa e couro cabeludo — alise a tensão.",
      "Respire amplo por alguns ciclos. Permaneça presente."
    ];

    let running=false, left=0, tI=null, stepI=null, pingI=null, idx=0, phase=4;
    function setUI(run){
      start.disabled=run; stop.disabled=!run;
      if(prev) prev.disabled=!run;
      if(next) next.disabled=!run;
    }
    function show(){ label.innerHTML = steps[idx]||steps[steps.length-1]; }
    function stopAll(){
      running=false; setUI(false);
      clearInterval(tI); clearInterval(stepI); clearInterval(pingI);
      clock.textContent='00:00';
      label.innerHTML = 'Inicie pelo contato dos pés com o solo/apoio.';
    }
    if(prev) prev.addEventListener('click', ()=>{ if(!running) return; idx=(idx-1+steps.length)%steps.length; show(); });
    if(next) next.addEventListener('click', ()=>{ if(!running) return; idx=(idx+1)%steps.length; show(); });

    start.addEventListener('click', ()=>{
      if(running) return;
      try{ audioCtx?.resume?.(); }catch(_){}
      running=true; setUI(true);
      left = parseInt(durSel.value,10)||300;
      clock.textContent = fmt(left);
      idx=0; phase=4; show();
      tI    = setInterval(()=>{ left--; clock.textContent=fmt(left); if(left<=0) stopAll(); }, 1000);
      stepI = setInterval(()=>{ if(!running) return; phase--; if(phase<=0){ idx=(idx+1)%steps.length; phase=4; show(); } }, 1000);
      ping(); pingI = setInterval(ping, 60000);
    });
    stop.addEventListener('click', stopAll);
  })();
})();
</script>