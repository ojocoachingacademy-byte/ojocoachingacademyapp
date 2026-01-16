import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit2 } from 'lucide-react'
import { GOAL_OPTIONS } from '../DevelopmentPlan/MilestonesConstants'
import DevelopmentPlanCard from '../DevelopmentPlan/DevelopmentPlanCard'
import './DevelopmentPlanDisplay.css'

/**
 * DevelopmentPlanDisplay - Read-only view of development plan for students
 */
const DevelopmentPlanDisplay = ({ studentData, onEdit }) => {
  const navigate = useNavigate()
  const [plan, setPlan] = useState(null)

  React.useEffect(() => {
    if (studentData?.development_plan) {
      try {
        const parsed = typeof studentData.development_plan === 'string' 
          ? JSON.parse(studentData.development_plan) 
          : studentData.development_plan
        setPlan(parsed)
      } catch (e) {
        console.error('Error parsing development plan:', e)
      }
    }
  }, [studentData?.development_plan])

  if (!plan) {
    return (
      <div className="no-development-plan">
        <p>You haven't created a development plan yet.</p>
        {onEdit && (
          <button className="btn-primary" onClick={onEdit}>
            Create Your Plan →
          </button>
        )}
      </div>
    )
  }

  // Check for new structure (section1/section2) or old structure (skills/goals)
  const hasNewStructure = plan?.section1 || plan?.section2
  const hasOldStructure = plan?.skills && plan.skills.length > 0

  return (
    <div className="development-plan-display">
      {/* Section 1: Your Why */}
      {hasNewStructure && plan.section1 && (
        <div className="plan-section">
          <h3>🎯 Your Why</h3>
          {plan.section1.bigGoal && (
            <div className="plan-item">
              <strong>Your Goal:</strong>
              <p>
                {(() => {
                  const goal = GOAL_OPTIONS.find(g => g.value === plan.section1.bigGoal)
                  return goal ? goal.label : plan.section1.customGoal || plan.section1.bigGoal
                })()}
              </p>
            </div>
          )}
          {plan.section1.sundayVision && (
            <div className="plan-item">
              <strong>Your Vision:</strong>
              <p>{plan.section1.customSundayVision || plan.section1.sundayVision}</p>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Skill Ratings */}
      {hasNewStructure && plan.section2 && plan.section2.skillRatings && (
        <div className="plan-section">
          <h3>📊 Current Skill Ratings</h3>
          <div className="skills-grid">
            {Object.entries(plan.section2.skillRatings).map(([skillKey, currentLevel]) => {
              const targetLevel = plan.section2.targetRatings?.[skillKey] || currentLevel
              const skillName = skillKey.charAt(0).toUpperCase() + skillKey.slice(1)
              
              return (
                <DevelopmentPlanCard
                  key={skillKey}
                  focusArea={{
                    skill_name: skillName,
                    current_level: currentLevel || 0,
                    target_level: targetLevel || 0
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Old Structure: Skills */}
      {hasOldStructure && plan.skills && plan.skills.length > 0 && (
        <div className="plan-section">
          <h3>📊 Skill Development</h3>
          <div className="skills-grid">
            {plan.skills.map((skill, index) => {
              const currentLevel = skill.current_level ?? skill.student_assessment ?? 0
              const targetLevel = skill.target_level ?? 0
              
              return (
                <DevelopmentPlanCard
                  key={index}
                  focusArea={{
                    skill_name: skill.skill_name,
                    current_level: currentLevel,
                    target_level: targetLevel,
                    notes: skill.notes
                  }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Old Structure: Goals */}
      {hasOldStructure && plan.goals && (
        <div className="plan-section">
          <h3>🎯 Goals & Motivation</h3>
          {plan.goals.inspiration && (
            <div className="plan-item">
              <strong>What inspired you to improve?</strong>
              <p>{plan.goals.inspiration}</p>
            </div>
          )}
          {plan.goals.targetLevel && (
            <div className="plan-item">
              <strong>What level do you want to reach?</strong>
              <p>{plan.goals.targetLevel}</p>
            </div>
          )}
        </div>
      )}

      {/* Milestone Tracker - Removed to avoid duplicate with Progress Tab */}

      {/* Edit Button */}
      {onEdit && (
        <div className="plan-actions">
          <button className="btn-primary" onClick={onEdit}>
            <Edit2 size={18} />
            Edit Your Plan →
          </button>
        </div>
      )}
    </div>
  )
}

export default DevelopmentPlanDisplay

