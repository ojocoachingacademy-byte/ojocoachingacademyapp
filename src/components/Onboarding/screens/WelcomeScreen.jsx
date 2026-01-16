import React from 'react'
import { ArrowRight } from 'lucide-react'
import './OnboardingScreens.css'

const WelcomeScreen = ({ studentName, onNext }) => {
  return (
    <div className="onboarding-screen-content">
      <div className="welcome-container">
        <div className="welcome-icon">🎾</div>
        <h1 className="welcome-title">
          Welcome to The Ojo Coaching Academy{studentName ? `, ${studentName}` : ''}!
        </h1>
        <p className="welcome-subtitle">
          Ready to accomplish your goals? Let's go!
        </p>
        <button 
          className="btn-onboarding-primary"
          onClick={onNext}
        >
          Get Started
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  )
}

export default WelcomeScreen
