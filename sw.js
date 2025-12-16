/**
 * Minimal Service Worker for JayaApp
 * Based on YogaVasishtha sw.js but smaller and focused for JayaApp
 */

const CACHE_NAME = 'jayaapp-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/icon.png',
  '/css/style.css',
  '/js/init.js',
  '/js/main.js'
];

self.addEventListener('install', (event) => {
  console.log('📦 JayaApp Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .catch((err) => { console.warn('Cache install partial failure', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('🔄 JayaApp Service Worker activating...');
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k); })
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return res;
      }).catch((err) => {
        if (event.request.mode === 'navigate') return caches.match('/index.html');
        throw err;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('🚀 JayaApp Service Worker loaded');
