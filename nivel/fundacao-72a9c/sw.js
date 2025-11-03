// SW Kill-Switch (Fundação) — remove este arquivo depois de normalizar
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (_) {}
    try { await self.registration.unregister(); } catch (_) {}
    // garante que páginas controlem a si mesmas sem SW
    const clientsArr = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clientsArr.forEach(c => c.navigate(c.url));
  })());
});