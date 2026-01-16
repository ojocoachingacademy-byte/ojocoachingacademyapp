import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import { getStudentStage } from '../../../utils/studentStage'
import PracticePlanCard from '../PracticePlanCard'
import RecentWins from '../RecentWins'
import './HomeTab.css'

const HomeTab = ({ studentData, onBookLesson }) => {
  const navigate = useNavigate()
  const [upcomingLesson, setUpcomingLesson] = useState(null)
  const [completedLessons, setCompletedLessons] = useState([])
  const [recentFeedback, setRecentFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState(null)
  const [activePracticePlan, setActivePracticePlan] = useState(null)

  useEffect(() => {
    if (studentData?.id) {
      fetchHomeData()
    }
  }, [studentData])

  const fetchHomeData = async () => {
    if (!studentData?.id) return

    try {
      // Fetch upcoming lesson
      const { data: upcoming } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('status', 'scheduled')
        .gte('lesson_date', new Date().toISOString())
        .order('lesson_date', { ascending: true })
        .limit(1)
        .maybeSingle()

      setUpcomingLesson(upcoming || null)

      // Fetch completed lessons
      const { data: completed } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('status', 'completed')
        .order('lesson_date', { ascending: false })
        .limit(20) // Get enough to determine stage

      setCompletedLessons(completed || [])

      // Find active practice plan (most recent incomplete one)
      if (completed && completed.length > 0) {
        const practicePlanLesson = completed.find(
          l => l.practice_plan && !l.practice_plan_completed
        ) || completed.find(l => l.practice_plan)
        setActivePracticePlan(practicePlanLesson || null)
      }

      // Get most recent feedback
      if (completed && completed.length > 0) {
        const withFeedback = completed.find(l => l.coach_feedback)
        setRecentFeedback(withFeedback || null)
      }

      // Determine stage based on lesson count
      const studentStage = getStudentStage(studentData, upcoming, completed || [])
      setStage(studentStage)

    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewLessonPlan = (lessonId) => {
    trackEvent(EVENTS.VIEW_LESSON_PLAN, { lesson_id: lessonId })
    // For now, we'll show lesson details in a modal or navigate
    // This can be enhanced later with a lesson detail view
    console.log('View lesson plan:', lessonId)
  }

  const handleViewFeedback = (lessonId) => {
    trackEvent(EVENTS.VIEW_LESSON_FEEDBACK, { lesson_id: lessonId })
    // Navigate to lessons tab or show lesson details
    console.log('View feedback:', lessonId)
  }

  const handleBookLesson = () => {
    trackEvent(EVENTS.TAB_CHANGE, { action: 'book_lesson' })
    if (onBookLesson) {
      onBookLesson()
    }
  }

  if (loading) {
    return (
      <div className="home-tab-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    )
  }

  const completedCount = completedLessons.length
  const practicePlanCount = completedLessons.filter(l => l.practice_plan).length
  const completedPracticeCount = completedLessons.filter(l => l.practice_plan_completed).length

  return (
    <div className="home-tab">
      {/* Header - Stage Aware */}
      <div className="home-header">
        <h1>{stage?.title || `Welcome back, ${studentData?.profiles?.full_name?.split(' ')[0] || 'there'}! 👋`}</h1>
        <p className="home-subtitle">{stage?.description || 'Your tennis journey continues'}</p>
      </div>

      {/* Quick Stats Bar */}
      <div className="quick-stats">
        <div className="stat-item">
          <span className="stat-value">{completedCount}</span>
          <span className="stat-label">Lessons</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-value">{studentData?.lesson_credits || 0}</span>
          <span className="stat-label">Credits</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-value">
            {practicePlanCount > 0 ? `${completedPracticeCount}/${practicePlanCount}` : '0'}
          </span>
          <span className="stat-label">Practice</span>
        </div>
      </div>

      {/* STAGE 1: Pre-First Lesson */}
      {stage?.stageNumber === 1 && (
        <>
          {/* Welcome Message Card */}
          <div className="welcome-message-card">
            <div className="card-header">
              <h3>Welcome to Ojo Coaching Academy!</h3>
            </div>
            <div className="welcome-message-content">
              <p>
                Your first lesson plan will appear here within 24 hours. In the meantime, check out the Community tab for resources and connect with other players.
              </p>
            </div>
          </div>

          {/* Next Upcoming Lesson Card (if synced from calendar) */}
          {upcomingLesson && (
            <div className="next-lesson-card">
              <div className="card-header">
                <h3>📅 Next Lesson</h3>
              </div>
              <div className="lesson-info">
                <div className="lesson-date">
                  <span className="day">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  <span className="date">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="time">
                    {new Date(upcomingLesson.lesson_date).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="lesson-location">
                  <span className="location-icon">📍</span>
                  <span>{upcomingLesson.location || 'Colina Del Sol Park'}</span>
                </div>
              </div>
              {upcomingLesson.lesson_plan && (
                <button 
                  className="btn-secondary view-plan-btn"
                  onClick={() => handleViewLessonPlan(upcomingLesson.id)}
                >
                  View Lesson Plan →
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* STAGE 2: Just Started (1-4 lessons) */}
      {stage?.stageNumber === 2 && (
        <>
          {/* Current Practice Plan */}
          {activePracticePlan && (
            <PracticePlanCard 
              lesson={activePracticePlan}
              onComplete={fetchHomeData}
            />
          )}

          {/* Next Lesson Card */}
          {upcomingLesson && (
            <div className="next-lesson-card">
              <div className="card-header">
                <h3>📅 Next Lesson</h3>
              </div>
              <div className="lesson-info">
                <div className="lesson-date">
                  <span className="day">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  <span className="date">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="time">
                    {new Date(upcomingLesson.lesson_date).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="lesson-location">
                  <span className="location-icon">📍</span>
                  <span>{upcomingLesson.location || 'Colina Del Sol Park'}</span>
                </div>
              </div>
              {upcomingLesson.lesson_plan && (
                <button 
                  className="btn-secondary view-plan-btn"
                  onClick={() => handleViewLessonPlan(upcomingLesson.id)}
                >
                  View Lesson Plan →
                </button>
              )}
            </div>
          )}

          {/* Recent Wins */}
          {stage?.showRecentWins && studentData?.development_plan && (
            <div className="recent-wins-section">
              <h3>🏆 Recent Wins</h3>
              <RecentWins 
                studentId={studentData.id} 
                developmentPlan={studentData.development_plan}
                playerLevel={studentData.player_level || 'beginner'}
              />
            </div>
          )}

          {/* Encouragement Message */}
          {stage?.encouragementMessage && (
            <div className="encouragement-message">
              <p>💪 {stage.encouragementMessage}</p>
            </div>
          )}
        </>
      )}

      {/* STAGE 3 & 4: Developing (5-19) and Established (20+) */}
      {(stage?.stageNumber === 3 || stage?.stageNumber === 4) && (
        <>
          {/* Practice Plan - Prominent */}
          {activePracticePlan && (
            <PracticePlanCard 
              lesson={activePracticePlan}
              onComplete={fetchHomeData}
            />
          )}

          {/* Next Lesson */}
          {upcomingLesson && (
            <div className="next-lesson-card">
              <div className="card-header">
                <h3>📅 Next Lesson</h3>
              </div>
              <div className="lesson-info">
                <div className="lesson-date">
                  <span className="day">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long' })}
                  </span>
                  <span className="date">
                    {new Date(upcomingLesson.lesson_date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                  <span className="time">
                    {new Date(upcomingLesson.lesson_date).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                  </span>
                </div>
                <div className="lesson-location">
                  <span className="location-icon">📍</span>
                  <span>{upcomingLesson.location || 'Colina Del Sol Park'}</span>
                </div>
              </div>
              {upcomingLesson.lesson_plan && (
                <button 
                  className="btn-secondary view-plan-btn"
                  onClick={() => handleViewLessonPlan(upcomingLesson.id)}
                >
                  View Lesson Plan →
                </button>
              )}
            </div>
          )}

          {/* Recent Wins */}
          {stage?.showRecentWins && studentData?.development_plan && (
            <div className="recent-wins-section">
              <h3>🏆 Recent Wins</h3>
              <RecentWins 
                studentId={studentData.id} 
                developmentPlan={studentData.development_plan}
                playerLevel={studentData.player_level || 'beginner'}
              />
            </div>
          )}

          {/* Progress Highlights - Stage 3 & 4 */}
          {stage?.showProgressHighlights && (
            <div className="progress-highlights">
              <h3>📈 Your Progress</h3>
              <div className="highlights-grid">
                <div className="highlight-card">
                  <span className="highlight-value">{completedCount}</span>
                  <span className="highlight-label">Lessons Completed</span>
                </div>
                <div className="highlight-card">
                  <span className="highlight-value">{completedPracticeCount}</span>
                  <span className="highlight-label">Practice Plans Done</span>
                </div>
              </div>
            </div>
          )}

          {/* Recent Feedback Preview */}
          {recentFeedback && recentFeedback.coach_feedback && (
            <div className="recent-feedback-card">
              <div className="card-header">
                <h3>📝 From Last Lesson</h3>
                <span className="feedback-date">
                  {new Date(recentFeedback.lesson_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
              <div className="feedback-preview">
                <p>
                  {recentFeedback.coach_feedback.length > 150 
                    ? recentFeedback.coach_feedback.substring(0, 150) + '...'
                    : recentFeedback.coach_feedback
                  }
                </p>
              </div>
              <button 
                className="btn-text read-more-btn"
                onClick={() => handleViewFeedback(recentFeedback.id)}
              >
                Read Full Feedback →
              </button>
            </div>
          )}
        </>
      )}

      {/* Book More Lessons CTA - If low on credits (not Stage 1) */}
      {stage?.stageNumber !== 1 && studentData?.lesson_credits <= 2 && studentData?.lesson_credits > 0 && (
        <div className="low-credits-banner">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <strong>Running low on credits!</strong>
            <p>You have {studentData.lesson_credits} lesson{studentData.lesson_credits === 1 ? '' : 's'} remaining</p>
          </div>
          <button 
            className="btn-secondary"
            onClick={handleBookLesson}
          >
            Book More →
          </button>
        </div>
      )}

      {/* Zero Credits CTA (not Stage 1) */}
      {stage?.stageNumber !== 1 && studentData?.lesson_credits === 0 && (
        <div className="zero-credits-banner">
          <span className="banner-icon">🎾</span>
          <div className="banner-content">
            <strong>Time to reup!</strong>
            <p>You're out of lesson credits</p>
          </div>
          <button 
            className="btn-primary"
            onClick={() => navigate('/profile')}
          >
            Buy Package →
          </button>
        </div>
      )}
    </div>
  )
}

export default HomeTab
