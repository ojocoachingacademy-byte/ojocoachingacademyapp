import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import './ConfirmationModal.css'

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger', 'warning', 'info'
  isLoading = false
}) => {
  if (!isOpen) return null

  return (
    <div className="confirmation-modal-overlay" onClick={onClose}>
      <div className="confirmation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-modal-header">
          <div className="confirmation-modal-icon-wrapper">
            <AlertTriangle 
              size={24} 
              className={`confirmation-modal-icon confirmation-modal-icon-${type}`}
            />
          </div>
          <h2 className="confirmation-modal-title">{title}</h2>
          <button 
            className="confirmation-modal-close"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="confirmation-modal-body">
          <p className="confirmation-modal-message">{message}</p>
        </div>
        
        <div className="confirmation-modal-footer">
          <button
            className="confirmation-modal-button confirmation-modal-button-cancel"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            className={`confirmation-modal-button confirmation-modal-button-confirm confirmation-modal-button-${type}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="confirmation-modal-spinner"></span>
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
