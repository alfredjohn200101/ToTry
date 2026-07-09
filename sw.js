// To Try — Service Worker
// Bump CACHE version with every new deploy to force update
const CACHE = 'totry-v190-dedupe-cleanup';

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
  // Only handle http/https requests - skip chrome-extension, devtools, etc
  const url = new URL(e.request.url);
  if(url.protocol !== 'http:' && url.protocol !== 'https:') return;
  // Only GET is cacheable; let POST/PUT/etc (sync writes, API posts) pass straight to network.
  if(e.request.method !== 'GET') return;

  // NEVER cache API calls — always go to network
  const apiHosts = [
    'api.anthropic.com',
    'supabase.co',
    'oauth.fatsecret.com',
    'platform.fatsecret.com',
    'world.openfoodfacts.org',
    'exercisedb-api.vercel.app',
    'wger.de',
    'bible.helloao.org',
    'cpbjr.github.io',
    'bible-api.com',
    'api.esv.org',
    'www.strava.com',
    'fonts.googleapis.com',
    'fonts.gstatic.com',
  ];

  // The Supabase JS library (jsdelivr) is a CORE dependency — cache it stale-while-revalidate so
  // the app can boot OFFLINE. Serve cached instantly, refresh in the background. Without this the
  // whole app failed to initialize with no connection.
  if(url.hostname.includes('cdn.jsdelivr.net')){
    e.respondWith(
      caches.match(e.request).then(cached => {
        const network = fetch(e.request).then(resp => {
          if(resp && resp.status === 200){ try{ const c2 = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, c2)).catch(()=>{}); }catch(_){} }
          return resp;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  if(apiHosts.some(h => url.hostname.includes(h))) {
    e.respondWith(
      fetch(e.request).catch(() => new Response(
        JSON.stringify({error: 'offline'}),
        {status: 503, headers: {'Content-Type': 'application/json'}}
      ))
    );
    return;
  }

  // The app shell (HTML / navigation requests) — NETWORK FIRST so a redeploy always
  // shows up immediately. Cache is only a fallback for when offline.
  // (Cache-first here was why old versions kept showing after deploys.)
  const isHTML = e.request.mode === 'navigate' ||
                 (e.request.destination === 'document') ||
                 url.pathname.endsWith('/') ||
                 url.pathname.endsWith('index.html');
  if(isHTML){
    e.respondWith(
      fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          try{ const clone = resp.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)).catch(()=>{}); }catch(_){}
        }
        return resp;
      }).catch(() => caches.match(e.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  // Other local files (icons, manifest) — cache first, network fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(resp => {
        if(resp && resp.status === 200 && resp.type === 'basic') {
          try {
            const clone = resp.clone();
            caches.open(CACHE).then(c => {
              try { c.put(e.request, clone); } catch(e) { /* silent */ }
            }).catch(() => {});
          } catch(e) { /* silent */ }
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

// ── WEB PUSH — reminders for the daily rhythm (iOS 16.4+ requires Home-Screen install) ──
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch(_) { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'To Try', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'totry',
    data: { url: d.url || './' }
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) { if (c.navigate) c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
