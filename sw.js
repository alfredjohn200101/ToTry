// To Try — Service Worker v14
// Bump CACHE version with every new deploy to force update
const CACHE = 'totry-v14';

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon.svg',
];

// ── INSTALL — cache all core files immediately ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — remove old caches, claim clients ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH — smart caching strategy ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // NEVER cache API calls — always go to network
  const apiHosts = [
    'api.anthropic.com',
    'oauth.fatsecret.com',
    'platform.fatsecret.com',
    'world.openfoodfacts.org',
    'exercisedb-api.vercel.app',
    'wger.de',
    'bible.helloao.org',
    'cdn.jsdelivr.net',
    'bible-api.com',
    'api.esv.org',
    'www.strava.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  if(apiHosts.some(h => url.hostname.includes(h))) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({error: 'offline'}),
        {status: 503, headers: {'Content-Type': 'application/json'}}
      ))
    );
    return;
  }

  // For local app files — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => {
        // Offline fallback — return cached index.html
        return caches.match('./index.html');
      });
    })
  );
});

// ── MESSAGE — handle skip waiting ──
self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
});
