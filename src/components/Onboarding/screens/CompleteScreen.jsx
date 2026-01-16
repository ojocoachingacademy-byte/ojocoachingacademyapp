import React from 'react'
import './OnboardingScreens.css'

const CompleteScreen = ({ onComplete }) => {
  return (
    <div className="onboarding-screen-content complete-screen">
      <div className="complete-animation">
        <div className="checkmark-circle">
          <div className="checkmark">✓</div>
        </div>
      </div>
      
      <h2 className="screen-title">You're All Set!</h2>
      
      <div className="complete-summary">
        <div className="summary-item">
          <span className="summary-icon">✓</span>
          <span>Profile created</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">✓</span>
          <span>Goals set</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">✓</span>
          <span>First lesson confirmed</span>
        </div>
      </div>

      <p className="complete-message">
        I'll see you soon! In the meantime, explore your dashboard to see your upcoming lesson and track your progress.
      </p>

      <button className="btn-primary btn-large" onClick={onComplete}>
        Go to Dashboard →
      </button>
    </div>
  )
}

export default CompleteScreen


