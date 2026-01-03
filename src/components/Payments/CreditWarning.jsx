import './CreditWarning.css'

export default function CreditWarning({ credits }) {
  if (credits === 0) {
    return (
      <div className="credit-alert critical">
        <div className="credit-alert-icon">⚠️</div>
        <div className="credit-alert-content">
          <h3>No Credits Remaining</h3>
          <p>You're out of lesson credits! Contact Coach Tobi to purchase a new package.</p>
        </div>
      </div>
    )
  }
  
  if (credits === 1) {
    return (
      <div className="credit-alert warning-high">
        <div className="credit-alert-icon">⚠️</div>
        <div className="credit-alert-content">
          <h3>Only 1 Credit Left!</h3>
          <p>Time to purchase more lessons. Contact Coach Tobi to get your next package.</p>
        </div>
      </div>
    )
  }
  
  if (credits === 2) {
    return (
      <div className="credit-alert warning-low">
        <div className="credit-alert-icon">💡</div>
        <div className="credit-alert-content">
          <h3>Running Low on Credits</h3>
          <p>You have 2 credits remaining. Consider purchasing your next package soon.</p>
        </div>
      </div>
    )
  }
  
  return null
}

