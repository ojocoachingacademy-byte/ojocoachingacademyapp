// Minimal service worker - enables PWA install without caching
// This allows "Add to Home Screen" while always serving fresh content
// AUTO-GENERATED - DO NOT EDIT MANUALLY

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing (no cache)')
  self.skipWaiting() // Activate immediately, don't wait for old worker to close
})

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating')
  event.waitUntil(
    // Clear any old caches
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Clearing cache:', cacheName)
          return caches.delete(cacheName)
        })
      )
    }).then(() => {
      // Take control of all pages immediately
      return clients.claim()
    })
  )
})

// NO fetch handler = no caching = always fresh content
// Pages are served directly from network every time
