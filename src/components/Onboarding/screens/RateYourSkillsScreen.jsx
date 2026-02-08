import React from 'react'
import { SKILL_AREAS } from '../../DevelopmentPlan/MilestonesConstants'
import './OnboardingScreens.css'

const RateYourSkillsScreen = ({ 
  skillRatings,
  targetRatings,
  onUpdate,
  onNext,
  onBack 
}) => {
  const handleSkillRatingChange = (skillKey, value) => {
    const newRatings = { ...skillRatings, [skillKey]: parseInt(value) || null }
    onUpdate({ skillRatings: newRatings })
  }

  const handleTargetRatingChange = (skillKey, value) => {
    const currentRating = skillRatings?.[skillKey] || 0
    const targetValue = parseInt(value) || 0
    
    // Ensure target is >= current rating
    if (targetValue >= currentRating) {
      const newTargetRatings = { ...targetRatings, [skillKey]: targetValue }
      onUpdate({ targetRatings: newTargetRatings })
    }
  }

  const allSkillsRated = SKILL_AREAS.every(skill => {
    const rating = skillRatings?.[skill.key]
    return rating !== null && rating !== undefined && rating > 0
  })

  return (
    <div className="onboarding-screen-content">
      <div className="onboarding-form-container">
        <h2 className="onboarding-screen-title">Rate Your Skills</h2>
        <p className="onboarding-screen-subtitle">
          Rate yourself honestly on each area (1 = just starting, 10 = tournament level). Be honest - your coach will help you improve!
        </p>

        <div className="skills-rating-container">
          {SKILL_AREAS.map(skill => {
            const currentRating = skillRatings?.[skill.key] || null
            const targetRating = targetRatings?.[skill.key] || 0
            
            return (
              <div key={skill.key} className="skill-rating-card-onboarding">
                <div className="skill-rating-header-onboarding">
                  <h4>{skill.name}</h4>
                  <p className="skill-question-onboarding">{skill.question}</p>
                </div>
                
                <div className="skill-rating-columns-onboarding">
                  {/* Current Rating */}
                  <div className="rating-column-onboarding">
                    <div className="column-label-onboarding">Current</div>
                    <div className="level-selector-onboarding">
                      <div className="level-label-onboarding">
                        {currentRating || '—'}/10
                      </div>
                      <div className="level-buttons-onboarding">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                          <button
                            key={num}
                            type="button"
                            className={`level-btn-onboarding ${currentRating === num ? 'active' : ''}`}
                            onClick={() => handleSkillRatingChange(skill.key, num)}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Target Rating */}
                  <div className="rating-column-onboarding">
                    <div className="column-label-onboarding">Target</div>
                    <div className="level-selector-onboarding">
                      <div className="level-label-onboarding">
                        {targetRating || '—'}/10
                      </div>
                      <div className="level-buttons-onboarding">
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(num => {
                          const disabled = num < (currentRating || 0)
                          return (
                            <button
                              key={num}
                              type="button"
                              className={`level-btn-onboarding ${targetRating === num ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                              onClick={() => !disabled && handleTargetRatingChange(skill.key, num)}
                              disabled={disabled}
                            >
                              {num}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Buttons rendered by OnboardingFlow fixed bar */}
      </div>
    </div>
  )
}

export default RateYourSkillsScreen
