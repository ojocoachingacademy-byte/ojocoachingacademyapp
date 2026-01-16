import React from 'react'
import './OnboardingScreens.css'

const FirstLessonScreen = ({ lesson, onNext, onBack }) => {
  return (
    <div className="onboarding-screen-content first-lesson-screen">
      <div className="lesson-icon">📅</div>
      
      <h2 className="screen-title">Your First Lesson</h2>
      
      <p className="screen-subtitle">
        Your first lesson that you booked will appear on the app along with your lesson plan within 24 hours.
      </p>

      <div className="screen-buttons">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-primary" onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  )
}

export default FirstLessonScreen


