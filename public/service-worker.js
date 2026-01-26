// Service Worker with Cache Versioning
// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated at: 2026-01-26T06:41:10.873Z
// Version: v2.0.0-de6f7ac
const CACHE_VERSION = 'v2.0.0-de6f7ac'
const CACHE_NAME = `ojo-coaching-${CACHE_VERSION}`

const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css'
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', CACHE_VERSION)
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell')
      return cache.addAll(urlsToCache)
    }).then(() => {
      // Force this SW to become active immediately
      return self.skipWaiting()
    })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION)
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim()
    })
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response
      }
      
      // Clone the request
      const fetchRequest = event.request.clone()
      
      return fetch(fetchRequest).then((response) => {
        // Check if valid response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response
        }
        
        // Clone the response
        const responseToCache = response.clone()
        
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })
        
        return response
      })
    })
  )
})

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
