import React, { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { GOAL_OPTIONS } from '../../DevelopmentPlan/MilestonesConstants'
import ProgressLadder from '../../Dashboard/ProgressLadder'
import './OnboardingScreens.css'

const ProgressLadderRevealScreen = ({ 
  studentData,
  developmentPlanData,
  onComplete,
  onBack 
}) => {
  const [targetMilestoneNumber, setTargetMilestoneNumber] = useState(null)
  const [goalText, setGoalText] = useState('')

  useEffect(() => {
    // Calculate target milestone from development plan
    const section1 = developmentPlanData?.section1 || {}
    
    if (section1.bigGoal && section1.bigGoal !== 'custom') {
      const goal = GOAL_OPTIONS.find(g => g.value === section1.bigGoal)
      if (goal && goal.targetMilestone) {
        setTargetMilestoneNumber(goal.targetMilestone)
        setGoalText(goal.label)
      }
    }
  }, [developmentPlanData])

  return (
    <div className="onboarding-screen-content progress-ladder-reveal">
      <div className="progress-ladder-reveal-container">
        <h2 className="onboarding-screen-title">
          This is your path to {goalText || 'your goal'}
        </h2>
        <p className="onboarding-screen-subtitle">
          Your target milestone is highlighted below. Milestones below are your achievable path, milestones above are future aspirations.
        </p>

        <div className="progress-ladder-wrapper">
          <ProgressLadder 
            studentId={studentData?.id}
            developmentPlan={JSON.stringify(developmentPlanData)}
            playerLevel={studentData?.player_level || 'beginner'}
            highlightTargetMilestone={targetMilestoneNumber}
          />
        </div>

        <div className="onboarding-screen-actions">
          <button className="btn-onboarding-secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            Back
          </button>
          <button 
            className="btn-onboarding-primary btn-complete"
            onClick={onComplete}
          >
            Let's Play! 🎾
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProgressLadderRevealScreen
