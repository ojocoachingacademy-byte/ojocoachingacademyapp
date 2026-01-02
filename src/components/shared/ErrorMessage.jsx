import { AlertCircle, RefreshCw } from 'lucide-react'
import './ErrorMessage.css'

export default function ErrorMessage({ error, onRetry, title = 'Something went wrong' }) {
  if (!error) return null
  
  return (
    <div className="error-message">
      <div className="error-icon">
        <AlertCircle size={24} />
      </div>
      <div className="error-content">
        <h3>{title}</h3>
        <p>{typeof error === 'string' ? error : error.message || 'An unexpected error occurred'}</p>
        {onRetry && (
          <button onClick={onRetry} className="btn btn-secondary error-retry-btn">
            <RefreshCw size={16} />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

