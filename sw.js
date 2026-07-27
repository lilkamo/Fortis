// Fortis PWA Service Worker — v20260726
// Strategy: Network-first for HTML, cache-first for assets.
// When a new version deploys, the SW intercepts and caches the new
// HTML, then signals the page to show an update banner.

var CACHE = 'fortis-v20260726';
var SHELL = ['./programme_app.html', './'];

// INSTALL: cache the shell files immediately, skip waiting so the
// new SW activates as soon as possible (important for iOS).
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      return c.addAll(SHELL).catch(function() {
        // Non-fatal: file might not exist at the registered path
      });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ACTIVATE: delete every old cache so stale content never shows.
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim(); // Take control of open tabs immediately
    }).then(function() {
      // Tell all open clients to show the update banner
      return self.clients.matchAll({type:'window'}).then(function(clients) {
        clients.forEach(function(c) { c.postMessage({type:'SW_UPDATED',version:'v20260726'}); });
      });
    })
  );
});

// FETCH: Network-first for HTML (always get latest code),
// cache-first for everything else (fonts, icons, etc.)
self.addEventListener('fetch', function(e) {
  var url = e.request.url;
  var isHTML = url.endsWith('.html') || url.endsWith('/') || !url.includes('.');

  if (e.request.method !== 'GET') return;

  if (isHTML) {
    // Network-first: always try to fetch latest HTML, fall back to cache if offline
    e.respondWith(
      fetch(e.request).then(function(r) {
        if (r && r.ok) {
          caches.open(CACHE).then(function(c) { c.put(e.request, r.clone()); });
        }
        return r;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
  } else {
    // Cache-first for assets
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(r) {
          if (r && r.ok) {
            caches.open(CACHE).then(function(c) { c.put(e.request, r.clone()); });
          }
          return r;
        });
      })
    );
  }
});
