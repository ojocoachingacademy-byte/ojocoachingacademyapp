import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { TrendingUp, Target, Award, Zap } from 'lucide-react'
import { GOAL_OPTIONS, getMilestonesByLevel } from '../DevelopmentPlan/MilestonesConstants'
import './RecentProgress.css'

export default function RecentProgress({ studentId, developmentPlan, playerLevel = 'beginner' }) {
  const [progressData, setProgressData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (studentId) {
      fetchProgressData()
    }
  }, [studentId])

  const fetchProgressData = async () => {
    try {
      const milestones = getMilestonesByLevel(playerLevel)
      
      // Fetch all snapshots for this student
      const { data: snapshots, error } = await supabase
        .from('skill_progress_snapshots')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch all milestone achievements
      const { data: allMilestones } = await supabase
        .from('student_milestones')
        .select('milestone_number, milestone_name, achieved_at')
        .eq('student_id', studentId)
        .order('achieved_at', { ascending: false })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Recent milestones (last 30 days)
      const recentMilestones = allMilestones
        ?.filter(m => new Date(m.achieved_at) > thirtyDaysAgo)
        .slice(0, 3) || []

      // Total milestones achieved
      const totalMilestonesAchieved = allMilestones?.length || 0

      // Parse development plan to get goal even if no snapshots
      let planNoSnapshots = null
      let bigGoalNoSnapshots = null
      try {
        planNoSnapshots = typeof developmentPlan === 'string' 
          ? JSON.parse(developmentPlan) 
          : developmentPlan
        bigGoalNoSnapshots = planNoSnapshots?.section1?.bigGoal || planNoSnapshots?.goals?.targetLevel || null
      } catch (e) {
        console.error('Error parsing development plan:', e)
      }

      // Determine capability even with no snapshots
      let currentCapabilityNoSnapshots = ''
      if (playerLevel === 'beginner') {
        if (totalMilestonesAchieved >= 29) currentCapabilityNoSnapshots = "Enter USTA tournaments"
        else if (totalMilestonesAchieved >= 26) currentCapabilityNoSnapshots = "Compete in local leagues"
        else if (totalMilestonesAchieved >= 21) currentCapabilityNoSnapshots = "Play in intermediate groups"
        else if (totalMilestonesAchieved >= 16) currentCapabilityNoSnapshots = "Join a beginner doubles group"
        else if (totalMilestonesAchieved >= 11) currentCapabilityNoSnapshots = "Play casual games with friends"
        else if (totalMilestonesAchieved >= 6) currentCapabilityNoSnapshots = "Sustain longer rallies without errors"
        else if (totalMilestonesAchieved >= 1) currentCapabilityNoSnapshots = "Rally with a friend casually"
        else currentCapabilityNoSnapshots = 'Start your journey!'
      } else {
        // Advanced level capabilities
        if (totalMilestonesAchieved >= 29) currentCapabilityNoSnapshots = "Compete at 4.5+ level"
        else if (totalMilestonesAchieved >= 26) currentCapabilityNoSnapshots = "Win league championships"
        else if (totalMilestonesAchieved >= 21) currentCapabilityNoSnapshots = "Play tournament circuit"
        else if (totalMilestonesAchieved >= 16) currentCapabilityNoSnapshots = "Execute advanced tactics"
        else if (totalMilestonesAchieved >= 11) currentCapabilityNoSnapshots = "Compete with advanced technique"
        else if (totalMilestonesAchieved >= 6) currentCapabilityNoSnapshots = "Play competitive matches"
        else if (totalMilestonesAchieved >= 1) currentCapabilityNoSnapshots = "Master consistency and control"
        else currentCapabilityNoSnapshots = 'Start your journey!'
      }

      // Calculate goal progress even with no snapshots
      let goalProgressPercentNoSnapshots = 0
      let goalDescriptionNoSnapshots = ''
      let targetMilestoneNoSnapshots = 0
      let goalAchievedNoSnapshots = false
      
      if (bigGoalNoSnapshots && bigGoalNoSnapshots !== 'custom') {
        const goal = GOAL_OPTIONS.find(g => g.value === bigGoalNoSnapshots)
        if (goal && goal.targetMilestone) {
          targetMilestoneNoSnapshots = goal.targetMilestone
          goalDescriptionNoSnapshots = goal.label
          goalProgressPercentNoSnapshots = targetMilestoneNoSnapshots > 0 
            ? Math.min(Math.round((totalMilestonesAchieved / targetMilestoneNoSnapshots) * 100), 100)
            : 0
          goalAchievedNoSnapshots = totalMilestonesAchieved >= targetMilestoneNoSnapshots
        }
      }

      if (!snapshots || snapshots.length === 0) {
        // Initialize with empty data so cards still show
        // Calculate next skill milestone even with no snapshots
        let nextSkillMilestoneNoSnapshots = null
        let smallestGapNoSnapshots = Infinity

        if (planNoSnapshots?.section2) {
          const { skillRatings = {}, targetRatings = {} } = planNoSnapshots.section2
          
          Object.keys(skillRatings).forEach(skillKey => {
            const current = skillRatings[skillKey] || 0
            const target = targetRatings[skillKey] || 0
            const gap = target - current
            
            if (gap > 0 && gap < smallestGapNoSnapshots) {
              smallestGapNoSnapshots = gap
              nextSkillMilestoneNoSnapshots = {
                skill: skillKey.charAt(0).toUpperCase() + skillKey.slice(1), // Capitalize
                current: current,
                target: target,
                gap: gap
              }
            }
          })
        }

        setProgressData({
          recentWins: [],
          recentMilestones,
          goalsHitCount: 0,
          totalGoals: 0,
          nextSkillMilestone: nextSkillMilestoneNoSnapshots,
          biggestImprovement: [],
          bigGoal: bigGoalNoSnapshots,
          goalProgressPercent: goalProgressPercentNoSnapshots,
          goalDescription: goalDescriptionNoSnapshots,
          targetMilestone: targetMilestoneNoSnapshots,
          achievedCount: totalMilestonesAchieved,
          totalMilestonesAchieved,
          currentCapability: currentCapabilityNoSnapshots,
          goalAchieved: goalAchievedNoSnapshots
        })
        setLoading(false)
        return
      }

      // Get recent improvements (last 30 days)
      // Use current_change if exists, otherwise fall back to student_change for historical data
      const recentWins = snapshots
        .filter(s => new Date(s.created_at) > thirtyDaysAgo)
        .filter(s => (s.current_change && s.current_change > 0) || (s.student_change && s.student_change > 0))
        .map(s => ({
          ...s,
          change: s.current_change ?? s.student_change ?? 0
        }))
        .sort((a, b) => b.change - a.change)
        .slice(0, 3)
        .map(s => ({
          skill_name: s.skill_name,
          student_change: s.change // Keep for compatibility with display
        }))

      // Get latest snapshot for each skill to calculate goals hit
      const latestBySkill = {}
      snapshots.forEach(snapshot => {
        if (!latestBySkill[snapshot.skill_name]) {
          latestBySkill[snapshot.skill_name] = snapshot
        }
      })

      // Parse development plan to get target levels and goal
      let plan = null
      let bigGoal = null
      try {
        plan = typeof developmentPlan === 'string' 
          ? JSON.parse(developmentPlan) 
          : developmentPlan
        
        // Get bigGoal from section1
        bigGoal = plan?.section1?.bigGoal || plan?.goals?.targetLevel || null
      } catch (e) {
        console.error('Error parsing development plan:', e)
      }

      // Count skills at target (for old structure compatibility)
      let goalsHitCount = 0
      let totalGoals = 0

      if (plan?.skills) {
        plan.skills.forEach(planSkill => {
          const latest = latestBySkill[planSkill.skill_name]
          // Use current_level, fall back to student_assessment for historical data
          const currentLevel = latest?.current_level ?? latest?.student_assessment ?? planSkill.current_level ?? planSkill.student_assessment ?? 0
          const targetLevel = planSkill.target_level || 0

          if (targetLevel > 0) {
            totalGoals++
            if (currentLevel >= targetLevel) {
              goalsHitCount++
            }
          }
        })
      }

      // Calculate next milestone - skill closest to target (new structure)
      let nextSkillMilestone = null
      let smallestGap = Infinity

      if (plan?.section2) {
        const { skillRatings = {}, targetRatings = {} } = plan.section2
        
        Object.keys(skillRatings).forEach(skillKey => {
          const current = skillRatings[skillKey] || 0
          const target = targetRatings[skillKey] || 0
          const gap = target - current
          
          if (gap > 0 && gap < smallestGap) {
            smallestGap = gap
            nextSkillMilestone = {
              skill: skillKey.charAt(0).toUpperCase() + skillKey.slice(1), // Capitalize
              current: current,
              target: target,
              gap: gap
            }
          }
        })
      }

      // Find biggest overall improvement
      const allImprovements = {}
      Object.keys(latestBySkill).forEach(skillName => {
        const skillSnapshots = snapshots
          .filter(s => s.skill_name === skillName)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
        
        if (skillSnapshots.length >= 2) {
          const first = skillSnapshots[0]
          const last = skillSnapshots[skillSnapshots.length - 1]
          // Use current_level, fall back to student_assessment for historical data
          const firstLevel = first.current_level ?? first.student_assessment ?? 0
          const lastLevel = last.current_level ?? last.student_assessment ?? 0
          const improvement = lastLevel - firstLevel
          if (improvement > 0) {
            allImprovements[skillName] = improvement
          }
        }
      })

      const biggestImprovement = Object.entries(allImprovements)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)

      // Calculate goal progress
      let goalProgressPercent = 0
      let goalDescription = ''
      let targetMilestone = 0
      let achievedCount = totalMilestonesAchieved
      let goalAchieved = false
      
      if (bigGoal && bigGoal !== 'custom') {
        const goal = GOAL_OPTIONS.find(g => g.value === bigGoal)
        if (goal && goal.targetMilestone) {
          targetMilestone = goal.targetMilestone
          goalDescription = goal.label
          goalProgressPercent = targetMilestone > 0 
            ? Math.min(Math.round((achievedCount / targetMilestone) * 100), 100)
            : 0
          goalAchieved = achievedCount >= targetMilestone
        }
      }

      // Determine current capability based on total milestones achieved
      let currentCapability = ''
      if (playerLevel === 'beginner') {
        if (totalMilestonesAchieved >= 29) currentCapability = "Enter USTA tournaments"
        else if (totalMilestonesAchieved >= 26) currentCapability = "Compete in local leagues"
        else if (totalMilestonesAchieved >= 21) currentCapability = "Play in intermediate groups"
        else if (totalMilestonesAchieved >= 16) currentCapability = "Join a beginner doubles group"
        else if (totalMilestonesAchieved >= 11) currentCapability = "Play casual games with friends"
        else if (totalMilestonesAchieved >= 6) currentCapability = "Sustain longer rallies without errors"
        else if (totalMilestonesAchieved >= 1) currentCapability = "Rally with a friend casually"
        else currentCapability = 'Start your journey!'
      } else {
        // Advanced level capabilities
        if (totalMilestonesAchieved >= 29) currentCapability = "Compete at 4.5+ level"
        else if (totalMilestonesAchieved >= 26) currentCapability = "Win league championships"
        else if (totalMilestonesAchieved >= 21) currentCapability = "Play tournament circuit"
        else if (totalMilestonesAchieved >= 16) currentCapability = "Execute advanced tactics"
        else if (totalMilestonesAchieved >= 11) currentCapability = "Compete with advanced technique"
        else if (totalMilestonesAchieved >= 6) currentCapability = "Play competitive matches"
        else if (totalMilestonesAchieved >= 1) currentCapability = "Master consistency and control"
        else currentCapability = 'Start your journey!'
      }

      setProgressData({
        recentWins,
        recentMilestones,
        goalsHitCount,
        totalGoals,
        nextSkillMilestone,
        biggestImprovement,
        bigGoal,
        goalProgressPercent,
        goalDescription,
        targetMilestone,
        achievedCount,
        totalMilestonesAchieved,
        currentCapability,
        goalAchieved
      })
      
    } catch (error) {
      console.error('Error fetching progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="recent-progress-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  // Always show cards, even with empty data
  if (!progressData) {
    return null // Only return null if still loading and no data set
  }

  return (
    <div className="recent-progress-container">
      <h2 className="recent-progress-title">
        <TrendingUp size={24} />
        Recent Wins 🎉
      </h2>
      
      <div className="progress-cards-grid">
        {/* CARD 1 - Recent Wins */}
        {progressData.recentMilestones && progressData.recentMilestones.length > 0 ? (
          <div className="progress-card recent-card">
            <div className="progress-card-icon">
              <Zap size={32} />
            </div>
            <div className="progress-card-content">
              <div className="progress-card-label">Recent Wins 🎉</div>
              <div className="recent-wins-list">
                {progressData.recentMilestones.map((milestone, idx) => (
                  <div key={idx} className="recent-win-item">
                    <span className="win-skill">#{milestone.milestone_number}: {milestone.milestone_name}</span>
                    <span className="win-change">✅</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="progress-card recent-card">
            <div className="progress-card-icon">
              <Zap size={32} />
            </div>
            <div className="progress-card-content">
              <div className="progress-card-label">Recent Wins 🎉</div>
              <div className="progress-card-placeholder">Recent milestone achievements will appear here</div>
            </div>
          </div>
        )}

        {/* CARD 2 - Goal Progress */}
        {progressData.bigGoal && progressData.bigGoal !== 'custom' && (
          <div className={`progress-card goal-progress-card ${progressData.goalAchieved ? 'achieved' : ''}`}>
            <div className="progress-card-icon">
              <Target size={32} />
            </div>
            <div className="progress-card-content">
              {progressData.goalAchieved ? (
                // Goal Achieved State
                <>
                  <div className="progress-card-label">🎉 Goal Achieved!</div>
                  <div className="goal-achieved-message">
                    "{progressData.goalDescription}"
                  </div>
                  <div className="progress-card-detail" style={{ marginTop: '8px', color: '#059669' }}>
                    You completed {progressData.achievedCount} milestones - amazing progress!
                  </div>
                  <button 
                    className="btn btn-primary"
                    style={{ marginTop: '16px', width: '100%' }}
                    onClick={() => {
                      // Navigate to development plan to set new goal
                      window.location.href = window.location.pathname.includes('dashboard') 
                        ? '/development-plan' 
                        : '#development-plan'
                    }}
                  >
                    Set New Goal
                  </button>
                </>
              ) : (
                // Progress State (keep existing)
                <>
                  <div className="progress-card-label">Your Goal Progress</div>
                  <div className="progress-card-number">{progressData.goalProgressPercent}%</div>
                  <div className="progress-card-detail">
                    {progressData.goalDescription}
                  </div>
                  <div className="milestone-progress" style={{ marginTop: '12px' }}>
                    <div className="milestone-bar">
                      <div className="milestone-fill" style={{ width: `${progressData.goalProgressPercent}%` }} />
                    </div>
                    <div className="milestone-text">
                      {progressData.achievedCount} of {progressData.targetMilestone} milestones
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CARD 3 - Next Milestone */}
        {progressData.nextSkillMilestone && (
          <div className="progress-card milestone-card">
            <div className="progress-card-icon">
              <Target size={32} />
            </div>
            <div className="progress-card-content">
              <div className="progress-card-label">Next Milestone</div>
              <div className="milestone-skill">{progressData.nextSkillMilestone.skill}</div>
              <div className="milestone-progress">
                <div className="milestone-bar">
                  <div 
                    className="milestone-fill"
                    style={{ 
                      width: `${(progressData.nextSkillMilestone.current / progressData.nextSkillMilestone.target) * 100}%` 
                    }}
                  />
                </div>
                <div className="milestone-text">
                  {progressData.nextSkillMilestone.current}/{progressData.nextSkillMilestone.target}
                  <span className="milestone-gap"> · {progressData.nextSkillMilestone.gap} to go!</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CARD 4 - You're Ready For */}
        {progressData.totalMilestonesAchieved > 0 && (
          <div className="progress-card ready-card">
            <div className="progress-card-icon">
              <Award size={32} />
            </div>
            <div className="progress-card-content">
              <div className="progress-card-label">You're Ready For {playerLevel === 'advanced' && '(Advanced)'}</div>
              <div className="ready-capability">{progressData.currentCapability}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

