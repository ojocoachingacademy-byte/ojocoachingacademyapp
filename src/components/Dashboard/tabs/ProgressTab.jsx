import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import { GOAL_OPTIONS } from '../../DevelopmentPlan/MilestonesConstants'
import DevelopmentPlanDisplay from '../DevelopmentPlanDisplay'
import MilestoneTracker from '../../DevelopmentPlan/MilestoneTracker'
import './ProgressTab.css'

const ProgressTab = ({ studentData, onEditPlan }) => {
  const [stats, setStats] = useState({
    totalLessons: 0,
    completedPractice: 0,
    joinedDate: null
  })
  const [loading, setLoading] = useState(true)
  const [targetMilestone, setTargetMilestone] = useState(null)
  const [achievedMilestones, setAchievedMilestones] = useState([])
  const [showCongratulations, setShowCongratulations] = useState(false)

  useEffect(() => {
    trackEvent(EVENTS.VIEW_PROGRESS)
    if (studentData?.id) {
      fetchProgressStats()
      calculateTargetMilestone()
    }
  }, [studentData])

  // Fetch achieved milestones after target is calculated
  useEffect(() => {
    if (studentData?.id) {
      fetchAchievedMilestones()
    }
  }, [studentData?.id, targetMilestone])

  // Calculate target milestone from development plan
  const calculateTargetMilestone = () => {
    if (!studentData?.development_plan) {
      setTargetMilestone(null)
      return
    }

    try {
      const plan = typeof studentData.development_plan === 'string' 
        ? JSON.parse(studentData.development_plan) 
        : studentData.development_plan

      if (plan?.section1?.bigGoal && plan.section1.bigGoal !== 'custom') {
        const goal = GOAL_OPTIONS.find(g => g.value === plan.section1.bigGoal)
        if (goal?.targetMilestone) {
          setTargetMilestone(goal.targetMilestone)
        }
      }
    } catch (error) {
      console.error('Error calculating target milestone:', error)
      setTargetMilestone(null)
    }
  }

  // Fetch achieved milestones to check if target is reached
  const fetchAchievedMilestones = async () => {
    if (!studentData?.id) return

    try {
      const { data, error } = await supabase
        .from('student_milestones')
        .select('milestone_number')
        .eq('student_id', studentData.id)
        .eq('milestone_level', studentData.player_level || 'beginner')

      if (error) throw error

      const achievedNumbers = (data || []).map(m => m.milestone_number)
      setAchievedMilestones(achievedNumbers)
    } catch (error) {
      console.error('Error fetching achieved milestones:', error)
    }
  }

  // Set up real-time subscription for milestone updates
  useEffect(() => {
    if (!studentData?.id) return

    const channel = supabase
      .channel(`milestones-${studentData.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'student_milestones',
          filter: `student_id=eq.${studentData.id}`
        },
        () => {
          // Refetch milestones when they change
          fetchAchievedMilestones()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [studentData?.id])

  // Check for target milestone achievement when achieved milestones or target changes
  useEffect(() => {
    if (targetMilestone && achievedMilestones.includes(targetMilestone)) {
      const congratsShown = sessionStorage.getItem(`congrats-${studentData?.id}-${targetMilestone}`)
      if (!congratsShown) {
        setShowCongratulations(true)
        sessionStorage.setItem(`congrats-${studentData?.id}-${targetMilestone}`, 'true')
      }
    }
  }, [targetMilestone, achievedMilestones, studentData?.id])

  const fetchProgressStats = async () => {
    if (!studentData?.id) return

    try {
      // Get total lessons
      const { data: lessons, count: totalCount } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .eq('student_id', studentData.id)
        .eq('status', 'completed')

      // Count completed practice plans
      const completedPractice = lessons?.filter(
        l => l.practice_plan_completed
      ).length || 0

      setStats({
        totalLessons: totalCount || 0,
        completedPractice,
        joinedDate: studentData.created_at
      })

    } catch (error) {
      console.error('Error fetching progress stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="progress-tab-loading">
        <div className="spinner"></div>
        <p>Loading your progress...</p>
      </div>
    )
  }

  return (
    <div className="progress-tab">
      {/* Header */}
      <div className="progress-header">
        <h1>Your Tennis Journey 🏆</h1>
        <p className="progress-subtitle">Track your development and celebrate your wins</p>
      </div>

      {/* Stats Section */}
      <div className="progress-overview">
        <div className="overview-card">
          <div className="overview-icon">🎾</div>
          <div className="overview-content">
            <span className="overview-value">{stats.totalLessons}</span>
            <span className="overview-label">Total Lessons</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">✅</div>
          <div className="overview-content">
            <span className="overview-value">{stats.completedPractice}</span>
            <span className="overview-label">Practice Completed</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="overview-icon">📅</div>
          <div className="overview-content">
            <span className="overview-value">
              {stats.joinedDate 
                ? new Date(stats.joinedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    year: 'numeric' 
                  })
                : 'N/A'
              }
            </span>
            <span className="overview-label">Member Since</span>
          </div>
        </div>
      </div>

      {/* Development Plan Section */}
      <section className="progress-section">
        <div className="section-header">
          <div>
            <h2>📋 Your Development Plan</h2>
            <p className="section-description">Your personalized roadmap to success</p>
          </div>
        </div>
        <DevelopmentPlanDisplay 
          studentData={studentData}
          onEdit={onEditPlan}
        />
      </section>

      {/* Progress Ladder Section */}
      <section className="progress-section">
        <div className="section-header">
          <div>
            <h2>Your Journey</h2>
            <p className="section-description">Your path to achieving your goals</p>
          </div>
        </div>
        <MilestoneTracker 
          studentId={studentData?.id}
          developmentPlan={studentData?.development_plan}
          playerLevel={studentData?.player_level || 'beginner'}
          highlightTargetMilestone={targetMilestone}
        />
      </section>

      {/* Congratulations Modal */}
      {showCongratulations && (
        <CongratulationsModal 
          onClose={() => setShowCongratulations(false)}
          onSetNewGoal={() => {
            setShowCongratulations(false)
            if (onEditPlan) onEditPlan()
          }}
        />
      )}
    </div>
  )
}

// Congratulations Modal Component
const CongratulationsModal = ({ onClose, onSetNewGoal }) => {
  return (
    <div className="modal-overlay congratulations-overlay" onClick={onClose}>
      <div className="congratulations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="congratulations-content">
          <div className="congratulations-icon">🎉</div>
          <h1 className="congratulations-title">Congratulations!</h1>
          <p className="congratulations-message">
            You've achieved your target milestone! This is a huge accomplishment. 🏆
          </p>
          <p className="congratulations-submessage">
            Ready to set a new goal? Work with your coach to create your next development plan.
          </p>
          <div className="congratulations-actions">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
            <button className="btn-primary" onClick={onSetNewGoal}>
              Set New Goal with Coach →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProgressTab

