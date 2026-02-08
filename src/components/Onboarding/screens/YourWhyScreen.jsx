import React from 'react'
import { GOAL_OPTIONS, SUNDAY_VISION_OPTIONS } from '../../DevelopmentPlan/MilestonesConstants'
import './OnboardingScreens.css'

const YourWhyScreen = ({ 
  triggerReason, 
  bigGoal, 
  customGoal, 
  sundayVision, 
  customSundayVision,
  onUpdate,
  onNext,
  onBack 
}) => {
  const handleUpdate = (key, value) => {
    onUpdate({ [key]: value })
  }

  return (
    <div className="onboarding-screen-content">
      <div className="onboarding-form-container">
        <h2 className="onboarding-screen-title">Your Why</h2>
        <p className="onboarding-screen-subtitle">
          Tell us what you want to achieve with tennis. This helps create the perfect plan for you!
        </p>

        <div className="onboarding-form-section">
          <label className="onboarding-label">
            What triggered you to get serious about lessons RIGHT NOW?
          </label>
          <textarea
            className="onboarding-textarea"
            value={triggerReason || ''}
            onChange={(e) => handleUpdate('triggerReason', e.target.value)}
            placeholder="Example: Lost to my friend Dave, tired of not being able to rally, want to join my spouse on court..."
            rows={3}
            maxLength={300}
          />
          <p className="char-count">{(triggerReason || '').length}/300 characters</p>
        </div>

        <div className="onboarding-form-section">
          <label className="onboarding-label">
            Your big goal - what ONE thing would make these lessons worth it?
          </label>
          <div className="radio-options">
            {GOAL_OPTIONS.map(option => (
              <label key={option.value} className="radio-option">
                <input
                  type="radio"
                  name="bigGoal"
                  value={option.value}
                  checked={bigGoal === option.value}
                  onChange={(e) => {
                    handleUpdate('bigGoal', e.target.value)
                    if (e.target.value !== 'custom') {
                      handleUpdate('customGoal', '')
                    }
                  }}
                />
                <span>{option.label}</span>
              </label>
            ))}
            <label className="radio-option">
              <input
                type="radio"
                name="bigGoal"
                value="custom"
                checked={bigGoal === 'custom'}
                onChange={(e) => handleUpdate('bigGoal', e.target.value)}
              />
              <span>Other:</span>
            </label>
          </div>
          {bigGoal === 'custom' && (
            <input
              type="text"
              className="onboarding-input"
              value={customGoal || ''}
              onChange={(e) => handleUpdate('customGoal', e.target.value)}
              placeholder="Describe your custom goal..."
            />
          )}
        </div>

        <div className="onboarding-form-section">
          <label className="onboarding-label">
            6 months from now, you've crushed it. What does a typical Sunday look like?
          </label>
          <div className="radio-options">
            {SUNDAY_VISION_OPTIONS.map((option, index) => (
              <label key={index} className="radio-option">
                <input
                  type="radio"
                  name="sundayVision"
                  value={option}
                  checked={sundayVision === option}
                  onChange={(e) => {
                    handleUpdate('sundayVision', e.target.value)
                    if (e.target.value !== 'custom') {
                      handleUpdate('customSundayVision', '')
                    }
                  }}
                />
                <span>{option}</span>
              </label>
            ))}
            <label className="radio-option">
              <input
                type="radio"
                name="sundayVision"
                value="custom"
                checked={sundayVision === 'custom'}
                onChange={(e) => handleUpdate('sundayVision', e.target.value)}
              />
              <span>Other:</span>
            </label>
          </div>
          {sundayVision === 'custom' && (
            <input
              type="text"
              className="onboarding-input"
              value={customSundayVision || ''}
              onChange={(e) => handleUpdate('customSundayVision', e.target.value)}
              placeholder="Describe your custom vision..."
            />
          )}
        </div>

        {/* Buttons rendered by OnboardingFlow fixed bar */}
      </div>
    </div>
  )
}

export default YourWhyScreen

