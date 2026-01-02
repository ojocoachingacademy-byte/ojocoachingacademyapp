import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react'
import './Toast.css'

export function useToast() {
  const [toasts, setToasts] = useState([])
  
  const showToast = (message, type = 'success', duration = 3000) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duration)
  }
  
  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }
  
  return { toasts, showToast, removeToast }
}

export function ToastContainer({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null
  
  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const icons = {
          success: CheckCircle,
          error: XCircle,
          warning: AlertCircle,
          info: Info
        }
        const Icon = icons[toast.type] || CheckCircle
        
        return (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <Icon size={20} className="toast-icon" />
            <span className="toast-message">{toast.message}</span>
            <button 
              className="toast-close" 
              onClick={() => removeToast(toast.id)}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

