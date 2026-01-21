import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import RecentProgress from '../Progress/RecentProgress'
import './RecentWins.css'

/**
 * RecentWins component - Wrapper for RecentProgress to show on Home tab
 * showAll prop: if true, shows more wins (for Progress tab), if false shows limited (for Home tab)
 */
const RecentWins = ({ studentId, developmentPlan, playerLevel, showAll = false, hideGoalProgress = false, hideTitle = false }) => {
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    if (developmentPlan) {
      try {
        const parsed = typeof developmentPlan === 'string' 
          ? JSON.parse(developmentPlan) 
          : developmentPlan
        setPlan(parsed)
      } catch (e) {
        console.error('Error parsing development plan:', e)
      }
    }
  }, [developmentPlan])

  if (!studentId) return null

  return (
    <div className={`recent-wins-wrapper ${showAll ? 'show-all' : ''} ${hideGoalProgress ? 'hide-goal-progress' : ''}`}>
      <RecentProgress 
        studentId={studentId}
        developmentPlan={plan || developmentPlan}
        playerLevel={playerLevel || 'beginner'}
        hideGoalProgress={hideGoalProgress}
        hideTitle={hideTitle}
      />
    </div>
  )
}

export default RecentWins

