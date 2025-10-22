window.$=(s,e=document)=>e.querySelector(s);window.$$=(s,e=document)=>[...e.querySelectorAll(s)];
const NIVEL=window.NIVEL||'fundacao';
const LS={get(k,d=null){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch{return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))},del(k){localStorage.removeItem(k)}};
function todayISO(){return new Date().toISOString().slice(0,10)}
function daysBetween(aISO,bISO){const a=new Date(aISO+'T00:00:00'),b=new Date(bISO+'T00:00:00');return Math.floor((b-a)/86400000)}
async function loadJSON(url){const r=await fetch(url+(url.includes('?')?'&':'?')+'v='+Date.now());if(!r.ok)throw new Error('Falha ao carregar '+url);return r.json()}
function el(tag,attrs={},children=[]){const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>{if(k==='class')e.className=v;else if(k.startsWith('on')&&typeof v==='function')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v)});children.forEach(c=>e.append(c));return e}
