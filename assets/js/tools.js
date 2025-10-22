const FEATURES=window.FEATURES||{visualizacao:true,habitos:true,recompensas:true,install:true,checkin:true};

function initTools(){
  const wrap=$('#tools'); if(!wrap) return; wrap.style.display='';
  if(FEATURES.visualizacao) $('#ft-visualizacao').style.display='';
  if(FEATURES.habitos){ $('#ft-habitos').style.display=''; renderHabits(); }
  if(FEATURES.recompensas){ $('#ft-recompensas').style.display=''; renderRewards(); }
  if(FEATURES.install){ $('#ft-install').style.display=''; setupInstall(); }
  if(FEATURES.checkin){ $('#ft-checkin').style.display=''; renderCheckin(); }
}

function startViz(){
  const out=$('#vizOut'); const steps=['Respire 4-4-6','Visualize a técnica perfeita','Sinta força e controle','Projete o resultado dia após dia'];
  let i=0; out.innerHTML='<div class="item">Iniciando…</div>';
  const id=setInterval(()=>{ if(i<steps.length){ out.innerHTML=`<div class="item">${steps[i++]}</div>` } else { clearInterval(id); out.innerHTML='<div class="item">✔ Sessão concluída</div>'; const k=`visualizacoes_${NIVEL}`; const arr=LS.get(k,[]); arr.push({at:new Date().toISOString()}); LS.set(k,arr);} },4000);
}

const FIXED_HABITS=['Concluir o treino','Plano alimentar','Beber 35 ml/kg de água','Dormir 7h+','Visualização (2–5min) ou respiração 4-4-6'];
function renderHabits(){
  const today=todayISO(), key=`habitos_${NIVEL}_${today}`, extrasKey=`habitos_extras_${NIVEL}`;
  const done=new Set(LS.get(key,[])), extras=LS.get(extrasKey,[]);
  const wrap=$('#habits'); wrap.innerHTML='<h3>Habit Tracker</h3>';
  const list=el('div',{class:'list'});
  [...FIXED_HABITS,...extras].forEach((h,idx)=>{const cb=el('input',{type:'checkbox',checked:done.has(h),onchange(){this.checked?done.add(h):done.delete(h);LS.set(key,[...done])}}); list.append(el('div',{class:'item'},[el('label',{},[h]),cb]))});
  wrap.append(list);
  wrap.append(el('div',{class:'item'},[
    el('input',{id:'newHabit',placeholder:'Adicionar hábito extra…',style:'flex:1'}),
    el('button',{class:'btn ghost',onclick(){const v=$('#newHabit').value?.trim();if(!v)return;const a=LS.get(extrasKey,[]); if(!a.includes(v)){a.push(v);LS.set(extrasKey,a);renderHabits()} $('#newHabit').value='';}},['+ Adicionar'])
  ]));
}

function renderRewards(){
  const key=`rewards_${NIVEL}`; const rewards=LS.get(key,[]);
  const wrap=$('#rewards'); wrap.innerHTML='<h3>Recompensas</h3>';
  const list=el('div',{class:'list'});
  rewards.forEach((r,i)=>{const pct=Math.min(100,Math.round((r.progresso/r.meta)*100));
    list.append(el('div',{class:'card'},[
      el('div',{},[el('strong',{},[r.descricao]),' ',el('span',{class:'small muted'},[`Meta ${r.meta} • Progresso ${r.progresso}`])]),
      el('div',{class:'progress',style:'margin:8px 0'},[el('span',{style:`width:${pct}%`})]),
      el('div',{},[
        el('button',{class:'btn',onclick(){r.progresso=(r.progresso||0)+1;rewards[i]=r;LS.set(key,rewards);renderRewards()}},['+1']),
        ' ',
        el('button',{class:'btn ghost',onclick(){rewards.splice(i,1);LS.set(key,rewards);renderRewards()}},['Excluir'])
      ])
    ]));
  });
  wrap.append(list);
  wrap.append(el('div',{class:'item'},[
    el('input',{id:'rwDesc',placeholder:'Ex.: Dia de massagem',style:'flex:1'}),
    el('input',{id:'rwMeta',type:'number',min:'1',step:'1',placeholder:'Meta'}),
    el('button',{class:'btn ghost',onclick(){const d=$('#rwDesc').value?.trim();const m=parseInt($('#rwMeta').value||'0',10);if(!d||m<1)return;rewards.push({id:'R'+Date.now(),descricao:d,meta:m,progresso:0});LS.set(key,rewards);renderRewards()}},['+ Adicionar'])
  ]));
}

function setupInstall(){
  const btn=$('#btnInstall'); const hint=$('#iosHint');
  let promptEvt=null;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(isStandalone){btn.style.display='none'; return;}
  if(isIOS){btn.style.display='none'; hint.style.display=''; return;}
  btn.style.display='none';
  window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault(); promptEvt=e; btn.style.display='';});
  btn.addEventListener('click',async()=>{ if(!promptEvt) return; promptEvt.prompt(); const {outcome}=await promptEvt.userChoice; promptEvt=null; if(outcome==='accepted') btn.textContent='✅ App instalado'; });
}

// ---- Check-in Diário Inteligente ----
function renderCheckin(){
  const wrap=$('#checkinWrap');
  const today=todayISO();
  const key=`checkin_${NIVEL}_${today}`;
  const saved=LS.get(key,{ energia:3, sono:3, humor:3, foco:3, dores:1 });

  wrap.innerHTML = '';
  const form = el('div',{class:'grid'},[
    rangeRow('Energia','energia',saved.energia),
    rangeRow('Sono','sono',saved.sono),
    rangeRow('Humor','humor',saved.humor),
    rangeRow('Foco','foco',saved.foco),
    rangeRow('Dores','dores',saved.dores)
  ]);
  const actions = el('div',{class:'row'},[
    el('button',{class:'btn',onclick(){ 
      const vals = readForm(form);
      LS.set(key, vals);
      const out = evaluateDay(vals);
      $('#coachOut').innerHTML = out.html;
    }},['Salvar Check-in'])
  ]);
  wrap.append(form, actions);

  if(saved){ const out = evaluateDay(saved); $('#coachOut').innerHTML = out.html; }

  function rangeRow(label,name,val){
    const row = el('div',{class:'item'},[
      el('label',{},[label]),
      el('input',{type:'range',min:'1',max:'5',value:String(val),id:`ck_${name}`,oninput(){ this.nextSibling.textContent = ' '+this.value; }}),
      document.createTextNode(' '+val)
    ]);
    return row;
  }
  function readForm(f){
    const get = (n)=> parseInt(f.querySelector('#ck_'+n).value,10);
    return { energia:get('energia'), sono:get('sono'), humor:get('humor'), foco:get('foco'), dores:get('dores') };
  }
}

function evaluateDay({energia,sono,humor,foco,dores}){
  const media = (energia + sono + humor + foco) / 4;
  let nivel='Leve', tipo='Mobilidade/Recuperação', msg='Hoje é dia de respeito ao corpo. Foque em respiração 4-4-6, alongamentos e caminhada leve.';

  if (dores >= 4){
    nivel='Leve (recuperativo)';
    tipo='Mobilidade + descarga + alongamentos';
    msg='⚠️ Dores elevadas detectadas. Evite cargas altas. Faça liberação, mobilidade e finalize com respiração 4-4-6.';
  } else if (media >= 4.5){
    nivel='Alta';
    tipo='Força/Metabólico';
    msg='🔥 Pico de performance! Trabalhe cargas progressivas em movimentos compostos. Finalize com técnica sob fadiga controlada.';
  } else if (media >= 3.5){
    nivel='Moderada-alta';
    tipo='Treino completo — técnica + carga';
    msg='Dia bom! Execute o plano com foco na forma e aumentos sutis de carga.';
  } else if (media >= 2.5){
    nivel='Moderada';
    tipo='Técnica e controle de cadência';
    msg='Mantenha a constância. Priorize execução perfeita e cadência 3-1 nos principais exercícios.';
  } else if (media >= 1.5){
    nivel='Leve';
    tipo='Cardio leve + mobilidade';
    msg='Energia baixa. Faça 20–30min de caminhada/ciclismo leve e mobilidade.';
  } else {
    nivel='Recuperativo';
    tipo='Respiração/Meditação/Descanso ativo';
    msg='Exaustão. Hoje, recupere: respiração, alongamentos suaves e sono.';
  }

  const html = `
    <div class="card">
      <h3>🧭 Diagnóstico do dia</h3>
      <div class="small muted">Média: ${media.toFixed(1)} • Dores: ${dores}</div>
      <p><strong>Intensidade sugerida:</strong> ${nivel}</p>
      <p><strong>Atividade do dia:</strong> ${tipo}</p>
      <p>${msg}</p>
    </div>`;

  return { nivel, tipo, html };
}
