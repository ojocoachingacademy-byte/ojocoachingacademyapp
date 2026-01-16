import React from 'react'
import MilestoneTracker from '../DevelopmentPlan/MilestoneTracker'
import './ProgressLadder.css'

/**
 * ProgressLadder component - Shows all milestones in a ladder format
 * Highlights the target milestone if provided
 */
const ProgressLadder = ({ studentId, developmentPlan, playerLevel, highlightTargetMilestone }) => {
  if (!studentId) return null

  return (
    <div className="progress-ladder">
      <MilestoneTracker 
        studentId={studentId}
        isCoach={false}
        playerLevel={playerLevel || 'beginner'}
        highlightTargetMilestone={highlightTargetMilestone}
      />
    </div>
  )
}

export default ProgressLadder


