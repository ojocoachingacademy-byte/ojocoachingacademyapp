import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration)
        
        // Check for updates every 60 seconds
        setInterval(() => {
          registration.update()
        }, 60000)
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New version available! Reload to update.')
              
              // Dispatch custom event that components can listen to
              window.dispatchEvent(new CustomEvent('app-update-available'))
            }
          })
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}
