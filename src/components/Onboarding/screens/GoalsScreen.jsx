import React, { useState, useEffect } from 'react'
import './OnboardingScreens.css'

const GoalsScreen = ({ value, onChange, onNext, onBack }) => {
  const [goals, setGoals] = useState(value || '')

  useEffect(() => {
    if (value) {
      setGoals(value)
    }
  }, [value])

  const suggestions = [
    'Just have fun and exercise',
    'Play with friends and family',
    'Improve my serve',
    'Get better at doubles',
    'Join a local league',
    'Play tournament matches'
  ]

  const handleSelectSuggestion = (suggestion) => {
    let newGoals = goals
    
    // Check if suggestion is already in goals
    const goalsList = goals.split(',').map(g => g.trim()).filter(g => g)
    
    if (goalsList.includes(suggestion)) {
      // Remove if already selected
      newGoals = goalsList.filter(g => g !== suggestion).join(', ')
    } else {
      // Add to goals
      newGoals = goals ? `${goals}, ${suggestion}` : suggestion
    }
    
    setGoals(newGoals)
    onChange(newGoals)
  }

  const handleChange = (e) => {
    setGoals(e.target.value)
    onChange(e.target.value)
  }

  const handleNext = () => {
    onNext()
  }

  return (
    <div className="onboarding-screen-content goals-screen">
      <h2 className="screen-title">What do you want to achieve?</h2>
      <p className="screen-subtitle">Setting goals helps us track your progress</p>

      <div className="goals-suggestions">
        <p className="suggestions-label">Popular goals (tap to add):</p>
        <div className="suggestions-grid">
          {suggestions.map(suggestion => {
            const goalsList = goals.split(',').map(g => g.trim()).filter(g => g)
            const isSelected = goalsList.includes(suggestion)
            
            return (
              <button
                key={suggestion}
                className={`suggestion-chip ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {suggestion}
              </button>
            )
          })}
        </div>
      </div>

      <div className="goals-input-group">
        <label htmlFor="goals-input">Your goals:</label>
        <textarea
          id="goals-input"
          className="goals-textarea"
          placeholder="Example: I want to play in a local doubles league and improve my serve consistency..."
          value={goals}
          onChange={handleChange}
          rows="4"
        />
        <p className="input-note">You can edit this later in your profile</p>
      </div>

      <div className="screen-buttons">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button className="btn-primary" onClick={handleNext}>
          Next →
        </button>
      </div>
    </div>
  )
}

export default GoalsScreen


