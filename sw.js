/* Cycle Count service worker — makes the app open and work offline.
 * When you change any app file, bump VERSION so phones get the update. */
const VERSION = 'cc-v4';
const SHELL = [
  './', './index.html', './styles.css', './app.js', './config.js', './manifest.webmanifest',
  './html5-qrcode.min.js',
  './logo.png', './icon-192.png', './icon-512.png', './favicon.png'
];
const RUNTIME = 'cc-runtime';
const IMAGES = 'cc-images';
const MAX_IMAGES = 600;

self.addEventListener('install', e => {
  // Cache each file on its own, so one missing file can't stop the app from installing
  e.waitUntil(
    caches.open(VERSION)
      .then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== VERSION && k !== RUNTIME && k !== IMAGES).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API calls (POST) always go to the network
  const url = new URL(req.url);
  if (url.hostname.endsWith('script.google.com') || url.hostname.endsWith('googleusercontent.com')) return;

  // The page itself: network first (to get updates), device copy when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // App files: device copy first, refreshed in the background
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(hit => {
        const net = fetch(req).then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
    return;
  }

  // Fonts: cache first
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(cacheFirst(RUNTIME, req));
    return;
  }

  // Product photos: cache first, so photos you've seen still show offline
  if (req.destination === 'image') {
    e.respondWith(cacheFirst(IMAGES, req, MAX_IMAGES));
  }
});

async function cacheFirst(name, req, max) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      await cache.put(req, res.clone());
      if (max) trim(cache, max);
    }
    return res;
  } catch (err) {
    return hit || Response.error();
  }
}

async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}
