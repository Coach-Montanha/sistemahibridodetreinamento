/* Coach Montanha — Service Worker PWA */
const CACHE_VERSION = 'coach-montanha-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;

const PRECACHE_ASSETS = [
  '/offline.html',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.webmanifest',
];

// Instalação: pré-carrega casca offline e ícones principais com tolerância a falhas
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PRECACHE_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'no-cache' });
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (err) {
            console.warn('[PWA SW] Falha ao pré-carregar recurso:', url, err);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// Ativação: limpa caches legados e assume controle das abas abertas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('coach-montanha-') && k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Interceptação de requisições de rede
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Apenas métodos GET no mesmo domínio
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Ignorar chamadas da API Supabase ou endpoints em tempo real para não corromper autenticação
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  // Estratégia 1: Navegação (páginas HTML) -> Rede primeiro, fallback para cache e offline.html
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
        })
    );
    return;
  }

  // Estratégia 2: Assets estáticos locais (scripts, css, imagens, fontes) -> Stale-While-Revalidate
  const isStaticAsset =
    url.origin === location.origin &&
    (/\.(js|css|png|jpg|jpeg|svg|webp|ico|woff|woff2|ttf|webmanifest)$/i.test(url.pathname) ||
      url.pathname.startsWith('/assets/'));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
  }
});

// Mensagens internas para atualização imediata
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
