/**
 * Enhanced Service Worker for JayaApp
 * - Precache core app shell
 * - Runtime cache for dynamic resources
 * - Network-first strategy for TrueHeart sync files (ensure fresh auth)
 * - Support for caching data files on demand
 */

const CACHE_NAME = 'jayaapp-core-v1.0.0';
const RUNTIME_CACHE = 'jayaapp-runtime-v1';

// Core files to precache (app shell)
const CORE_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon.png',
  '/assets/background.png',
  '/css/style.css',
  '/js/init.js',
  '/js/main.js',
  '/js/navigation.js',
  '/js/background.js',
  '/js/trueheart-integration.js',
  '/js/trueheart-ui.js',
  '/css/trueheart-style.css'
];

// Explicit list of data files to preload (keeps filenames inside the SW)
const DATA_PRELOAD = [
  '/data/lexicon.json',
  '/data/locale.json',
  '/data/maha_en.json',
  '/data/maha_pl.json',
  '/data/maha_sa.json',
  '/data/prompts_en.json',
  '/data/prompts_pl.json',
  '/data/unique_words.json',
  '/data/words_occurrences.json'
];

// Pattern matchers
const DATA_FILES_RE = /\/data\/.*\.json$/;
const TRUEHEART_RE = /trueheart-|\/sync\//i;

const EXTERNAL_RESOURCES = [
  'https://fonts.googleapis.com',
  'https://cdn.jsdelivr.net'
];

// Install - precache core files
self.addEventListener('install', (event) => {
  console.log('📦 JayaApp SW installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_FILES))
      .then(async () => {
        console.log('✅ JayaApp SW: Core files cached');
        // Attempt to preload data files into runtime cache (non-fatal)
        try {
          const runtime = await caches.open(RUNTIME_CACHE);
          await Promise.all(DATA_PRELOAD.map(async (p) => {
            try {
              const resp = await fetch(p);
              if (resp && resp.status === 200) {
                await runtime.put(p, resp.clone());
                console.log('💾 JayaApp SW: Preloaded', p);
              }
            } catch (e) {
              console.warn('⚠️ JayaApp SW: Failed to preload', p, e && e.message);
            }
          }));
        } catch (e) {
          console.warn('⚠️ JayaApp SW: Data preloading failed', e && e.message);
        }
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('⚠️ JayaApp SW: Cache install partial failure', err);
      })
  );
});

// Activate - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('🔄 JayaApp SW activating...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME && k !== RUNTIME_CACHE) {
            console.log('🗑️ Removing old cache:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch handler with strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip some cross-origin requests unless known external resources
  if (url.origin !== self.location.origin && !EXTERNAL_RESOURCES.some(e => req.url.startsWith(e))) {
    return;
  }

  // Network-first for TrueHeart sync files to ensure fresh auth/state
  if (TRUEHEART_RE.test(req.url)) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(RUNTIME_CACHE).then(cache => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => caches.match(req).then(cached => cached || new Response('// Sync unavailable offline', { status: 200, headers: { 'Content-Type': 'application/javascript' } })))
    );
    return;
  }

  // Network-first for data files
  if (DATA_FILES_RE.test(url.pathname)) {
    event.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then(cache => cache.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // For navigation requests, try cache then network with offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(cached => cached || fetch(req).then(res => res).catch(() => caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for other resources (core files)
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (!res || res.status !== 200 || res.type === 'error') return res;
        const clone = res.clone();
        caches.open(RUNTIME_CACHE).then(cache => cache.put(req, clone));
        return res;
      }).catch(() => {
        // If external resource fails, let it fail silently or return cached
        return caches.match(req);
      });
    })
  );
});

// Message handling (skip waiting, cache data files)
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    console.log('📨 SW received SKIP_WAITING');
    return self.skipWaiting();
  }

  if (data.type === 'CACHE_DATA_FILES' && Array.isArray(data.files)) {
    const files = data.files.map(f => new Request(f, { credentials: 'same-origin' }));
    caches.open(RUNTIME_CACHE).then(cache => cache.addAll(files)).then(() => {
      console.log('📨 SW: Preloaded data files', data.files);
    }).catch(err => console.warn('📨 SW: Failed to preload data files', err));
  }

  if (data.type === 'GET_VERSION' && event.ports && event.ports[0]) {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Background sync handling for TrueHeart
self.addEventListener('sync', (event) => {
  if (event.tag === 'trueheart-sync') {
    console.log('🔄 Background sync triggered for TrueHeart');
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'BACKGROUND_SYNC', action: 'trueheart-sync' }));
      })
    );
  }
});

// Push/notification placeholder
self.addEventListener('push', (event) => {
  console.log('📬 Push received');
  const options = { body: 'New activity', icon: '/assets/icon.png', badge: '/assets/icon.png' };
  event.waitUntil(self.registration.showNotification('JayaApp', options));
});

console.log('🚀 JayaApp Service Worker (enhanced) loaded');
