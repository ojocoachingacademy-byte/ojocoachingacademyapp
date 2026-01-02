import './EmptyState.css'

export default function EmptyState({ 
  icon = '📋', 
  title, 
  message, 
  actionLabel, 
  onAction,
  size = 'medium'
}) {
  return (
    <div className={`empty-state empty-state-${size}`}>
      <div className="empty-state-icon">{icon}</div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      {message && <p className="empty-state-message">{message}</p>}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary empty-state-action">
          {actionLabel}
        </button>
      )}
    </div>
  )
}

