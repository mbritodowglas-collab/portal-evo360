(async function(){
  const app=$('#app'); const startKey=`startDate_${NIVEL}`;
  if(!LS.get(startKey)) LS.set(startKey, todayISO());
  const startISO=LS.get(startKey), today=todayISO();
  let liberados=Math.max(1, daysBetween(startISO,today)+1);
  try{
    const data=await loadJSON(window.DATA_URL); liberados=Math.min(liberados,data.length);
    const list=el('div',{class:'list'});
    for(let i=0;i<liberados;i++){
      const d=data[i];
      const item=el('div',{class:'item'},[
        el('div',{},[
          el('div',{class:'small'},[d.title||`Dia ${i+1}`]),
          el('div',{class:'small muted'},[`Treino: ${d.treino||'-'}`]),
          el('div',{class:'small muted'},[`Nutrição: ${d.nutricao||'-'}`]),
          el('div',{class:'small'},[d.dica||'—'])
        ]),
        el('button',{class:'btn ghost',onclick(){markDone(i)}},['Concluir ✓'])
      ]);
      list.append(item);
    }
    app.innerHTML=''; app.append(el('h2',{},['Seu Plano do Dia']),list);
    initTools();
  }catch(e){ app.innerHTML='<div class="alert">Não foi possível carregar o conteúdo.</div>'; console.error(e);}
  function markDone(i){const key=`progresso_${NIVEL}_${todayISO()}`;const prog=LS.get(key,[]);if(!prog.includes(i)){prog.push(i);LS.set(key,prog)}alert('Atividade registrada!')}
})();