#!/usr/bin/env node

/**
 * Generates a minimal service worker for PWA install support.
 * No caching - enables "Add to Home Screen" while always serving fresh content.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const serviceWorkerPath = path.join(rootDir, 'public', 'service-worker.js')

const serviceWorkerContent = `// Minimal service worker - enables PWA install without caching
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
`

fs.writeFileSync(serviceWorkerPath, serviceWorkerContent, 'utf-8')
console.log('✅ Generated minimal service-worker.js (PWA install, no cache)')
