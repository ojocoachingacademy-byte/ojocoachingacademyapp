import { useState } from 'react'
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getSkillLevelColor, getSkillLevelLabel } from './DevelopmentPlanConstants'
import './DevelopmentPlanCard.css'

export default function DevelopmentPlanCard({ focusArea, previousLevel = null }) {
  const progress = (focusArea.current_level / focusArea.target_level) * 100
  const isImproving = previousLevel !== null && focusArea.current_level > previousLevel
  const isDeclining = previousLevel !== null && focusArea.current_level < previousLevel

  return (
    <div className="skill-card">
      <div className="skill-header">
        <div className="skill-name-section">
          <h4 className="skill-name">{focusArea.skill_name}</h4>
          {previousLevel !== null && (
            <div className="skill-trend">
              {isImproving && <TrendingUp size={16} className="trend-up" />}
              {isDeclining && <TrendingDown size={16} className="trend-down" />}
              {!isImproving && !isDeclining && <Minus size={16} className="trend-neutral" />}
            </div>
          )}
        </div>
        <div className="skill-levels">
          <span className="current-level" style={{ color: getSkillLevelColor(focusArea.current_level) }}>
            {focusArea.current_level}/5
          </span>
          <span className="level-separator">→</span>
          <span className="target-level">
            {focusArea.target_level}/5
          </span>
        </div>
      </div>

      <div className="progress-bar-container">
        <div 
          className="progress-bar"
          style={{ 
            width: `${progress}%`,
            backgroundColor: getSkillLevelColor(focusArea.current_level)
          }}
        />
      </div>

      <div className="skill-labels">
        <span className="current-label">{getSkillLevelLabel(focusArea.current_level)}</span>
        <span className="target-label">Target: {getSkillLevelLabel(focusArea.target_level)}</span>
      </div>

      {focusArea.notes && (
        <div className="skill-notes">
          <p>{focusArea.notes}</p>
        </div>
      )}
    </div>
  )
}

