import React from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { GOAL_OPTIONS, MILESTONES } from '../../DevelopmentPlan/MilestonesConstants'
import './OnboardingScreens.css'

const JourneySummaryScreen = ({ 
  developmentPlanData,
  onNext,
  onBack 
}) => {
  // Parse the data
  const section1 = developmentPlanData?.section1 || {}
  const section2 = developmentPlanData?.section2 || {}
  
  // Get goal text
  let goalText = ''
  if (section1.bigGoal && section1.bigGoal !== 'custom') {
    const goal = GOAL_OPTIONS.find(g => g.value === section1.bigGoal)
    goalText = goal ? goal.label : section1.bigGoal
  } else if (section1.customGoal) {
    goalText = section1.customGoal
  }

  // Get target milestone
  let targetMilestone = null
  if (section1.bigGoal && section1.bigGoal !== 'custom') {
    const goal = GOAL_OPTIONS.find(g => g.value === section1.bigGoal)
    if (goal && goal.targetMilestone) {
      targetMilestone = MILESTONES.find(m => m.number === goal.targetMilestone)
    }
  }

  // Calculate skill level needed
  let skillLevelNeeded = 'N/A'
  if (targetMilestone) {
    if (targetMilestone.number <= 15) {
      skillLevelNeeded = '4/10 in all areas'
    } else if (targetMilestone.number <= 20) {
      skillLevelNeeded = '6/10 in all areas'
    } else {
      skillLevelNeeded = '7/10 in all areas'
    }
  }

  return (
    <div className="onboarding-screen-content">
      <div className="journey-summary-container">
        <h2 className="onboarding-screen-title">Your Tennis Journey</h2>
        <p className="onboarding-screen-subtitle">
          Here's what we've set up for you
        </p>

        <div className="journey-summary-cards">
          <div className="journey-summary-card">
            <div className="summary-card-icon">🎯</div>
            <div className="summary-card-content">
              <h3 className="summary-card-label">Your Goal</h3>
              <p className="summary-card-value">{goalText || 'Not set'}</p>
            </div>
          </div>

          <div className="journey-summary-card">
            <div className="summary-card-icon">🏆</div>
            <div className="summary-card-content">
              <h3 className="summary-card-label">Target Milestone</h3>
              <p className="summary-card-value">
                {targetMilestone 
                  ? `#${targetMilestone.number} - ${targetMilestone.name}`
                  : 'Not set'
                }
              </p>
            </div>
          </div>

          <div className="journey-summary-card">
            <div className="summary-card-icon">📈</div>
            <div className="summary-card-content">
              <h3 className="summary-card-label">Skill Level Needed</h3>
              <p className="summary-card-value">{skillLevelNeeded}</p>
            </div>
          </div>
        </div>

        <div className="onboarding-screen-actions">
          <button className="btn-onboarding-secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            Back
          </button>
          <button 
            className="btn-onboarding-primary"
            onClick={onNext}
          >
            See My Path
            <ArrowRight size={18} />
          </button>
        </div>

        <div className="onboarding-screen-actions">
          <button className="btn-onboarding-secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            Back
          </button>
          <button 
            className="btn-onboarding-primary"
            onClick={onNext}
          >
            See My Path
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default JourneySummaryScreen

