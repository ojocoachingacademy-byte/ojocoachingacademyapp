#!/usr/bin/env node

/**
 * Auto-generates service-worker.js with a unique cache version
 * Uses build timestamp + git commit hash for automatic versioning
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Get git commit hash (short, 7 chars) or fallback to timestamp
function getVersion() {
  try {
    const commitHash = execSync('git rev-parse --short HEAD', { 
      encoding: 'utf-8',
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim()
    
    // Use commit hash as version (e.g., "v2.0.0-abc1234")
    return `v2.0.0-${commitHash}`
  } catch (error) {
    // Fallback to timestamp if git is not available
    const timestamp = Date.now()
    return `v2.0.0-${timestamp}`
  }
}

const CACHE_VERSION = getVersion()
const serviceWorkerPath = path.join(rootDir, 'public', 'service-worker.js')

const serviceWorkerContent = `// Service Worker with Cache Versioning
// AUTO-GENERATED - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Version: ${CACHE_VERSION}
const CACHE_VERSION = '${CACHE_VERSION}'
const CACHE_NAME = \`ojo-coaching-\${CACHE_VERSION}\`

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
`

// Write the generated service worker
fs.writeFileSync(serviceWorkerPath, serviceWorkerContent, 'utf-8')
console.log(`✅ Generated service-worker.js with version: ${CACHE_VERSION}`)
