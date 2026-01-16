import React, { useState } from 'react'
import './OnboardingScreens.css'

const ExperienceScreen = ({ value, onChange, onNext, onBack }) => {
  const [selected, setSelected] = useState(value)

  const levels = [
    {
      id: 'complete_beginner',
      title: 'Complete Beginner',
      description: 'Never played or just starting out',
      icon: '🌱'
    },
    {
      id: 'beginner',
      title: 'Beginner',
      description: 'Played a few times, learning basics',
      icon: '🎾'
    },
    {
      id: 'intermediate',
      title: 'Intermediate',
      description: 'Can rally, working on consistency',
      icon: '📈'
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Competitive player or tournament experience',
      icon: '🏆'
    }
  ]

  const handleSelect = (levelId) => {
    setSelected(levelId)
    onChange(levelId)
  }

  const handleNext = () => {
    if (!selected) {
      alert('Please select your experience level')
      return
    }
    onNext()
  }

  return (
    <div className="onboarding-screen-content experience-screen">
      <h2 className="screen-title">What's your tennis experience?</h2>
      <p className="screen-subtitle">This helps me tailor your lessons</p>

      <div className="experience-options">
        {levels.map(level => (
          <button
            key={level.id}
            className={`experience-option ${selected === level.id ? 'selected' : ''}`}
            onClick={() => handleSelect(level.id)}
          >
            <span className="option-icon">{level.icon}</span>
            <div className="option-content">
              <h3 className="option-title">{level.title}</h3>
              <p className="option-description">{level.description}</p>
            </div>
            <span className="option-check">{selected === level.id ? '✓' : ''}</span>
          </button>
        ))}
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

export default ExperienceScreen


