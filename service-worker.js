const CACHE='evo360-v1';
const ASSETS=['./','./index.html','./assets/css/base.css','./assets/js/core.js','./assets/js/drip.js','./assets/js/tools.js','./_data/fundacao.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))))});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
