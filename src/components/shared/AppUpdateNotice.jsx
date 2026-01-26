import { useState, useEffect } from 'react'
import './AppUpdateNotice.css'

export default function AppUpdateNotice() {
  const [showNotice, setShowNotice] = useState(false)

  useEffect(() => {
    // Listen for app update available event
    const handleUpdateAvailable = () => {
      setShowNotice(true)
    }

    window.addEventListener('app-update-available', handleUpdateAvailable)

    return () => {
      window.removeEventListener('app-update-available', handleUpdateAvailable)
    }
  }, [])

  const handleUpdate = () => {
    // Tell service worker to skip waiting
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' })
    }
    
    // Reload the page
    window.location.reload()
  }

  const handleDismiss = () => {
    setShowNotice(false)
  }

  if (!showNotice) return null

  return (
    <div className="app-update-notice">
      <div className="update-notice-content">
        <div className="update-notice-icon">🔄</div>
        <div className="update-notice-text">
          <strong>New version available!</strong>
          <p>Update now to get the latest features and fixes.</p>
        </div>
        <div className="update-notice-actions">
          <button onClick={handleUpdate} className="btn btn-primary">
            Update Now
          </button>
          <button onClick={handleDismiss} className="btn btn-outline">
            Later
          </button>
        </div>
      </div>
    </div>
  )
}
