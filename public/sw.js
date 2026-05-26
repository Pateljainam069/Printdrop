self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === 'POST' &&
    url.pathname === '/' &&
    url.origin === self.location.origin
  ) {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const file = formData.get('file');
        
        if (file) {
          const cache = await caches.open('shared-file');
          await cache.put('shared-file', new Response(file));
        }
        
        return Response.redirect('/?shared=true', 303);
      })()
    );
  }
});
