// EVO360 · Fundação — SW escopado ao nível
const CACHE_VERSION = 'v1';
const CACHE_NAME = `bp-fundacao-${CACHE_VERSION}`;

// Rotas críticas do nível
const CORE_ASSETS = [
  './', // index do nível (se existir)
  './dicas-orientacoes.html',
  './plano.html',
  './habitos.html',
  './praticas.html',
  './suporte.html',
  '../../assets/css/base.css?v=14',
  '../../assets/css/tema-fundacao.css?v=14',
  '../../assets/js/drip.js?v=21',
  './dicas-orientacoes.js?v=21', // se este arquivo existir para a página
  '../../assets/img/hub/banner-fundacao-hero.jpg'
];

// Dados dinâmicos usados na página
const DATA_URLS = [
  '../../data/fundacao.json',
  '../../data/fundacao-nutri-aulas.json'
];

// Pré-cache app shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Limpa versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => (k.startsWith('bp-fundacao-') && k !== CACHE_NAME) ? caches.delete(k) : null))
    )
  );
  self.clients.claim();
});

// Estratégias:
//  - Para CSS/JS/IMG do nível: cache-first
//  - Para JSON de dados: network-first com fallback cache/placeholder
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Só intercepta requisições do mesmo host
  if (url.origin !== location.origin) return;

  const isData = DATA_URLS.some(path => url.pathname.endsWith(path.replace('../..','')));
  const isCore = CORE_ASSETS.some(path => matchPath(url, path));

  if (isData) {
    // Network-first (dados precisam atualizar)
    e.respondWith(networkFirst(e.request));
    return;
  }

  if (isCore || isStatic(url)) {
    // Cache-first
    e.respondWith(cacheFirst(e.request));
  }
});

function matchPath(url, path) {
  try {
    const full = new URL(path, location.origin + location.pathname).pathname;
    return url.pathname.endsWith(full.replace(location.pathname,'').replace('//','/'));
  } catch { return false; }
}

function isStatic(url) {
  const exts = ['.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.woff2'];
  return exts.some(ext => url.pathname.endsWith(ext));
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    return cached || new Response('', { status: 504 });
  }
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(addCacheBust(req));
    if (fresh && fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    // Fallback de dados (placeholder vazio para não quebrar a UI)
    if (req.url.endsWith('fundacao.json')) {
      return new Response(JSON.stringify({ dicas: [] }), { headers: { 'Content-Type': 'application/json' }});
    }
    if (req.url.endsWith('fundacao-nutri-aulas.json')) {
      return new Response(JSON.stringify({ aulas: [] }), { headers: { 'Content-Type': 'application/json' }});
    }
    return new Response('', { status: 504 });
  }
}

function addCacheBust(req) {
  const url = new URL(req.url);
  url.searchParams.set('cb', Date.now());
  return url.toString();
}