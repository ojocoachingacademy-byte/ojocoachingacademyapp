import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import { getStudentStage } from '../../../utils/studentStage'
import { detectNewMilestone } from '../../../utils/lessonMilestones'
import PracticePlanCard from '../PracticePlanCard'
import LessonMilestoneModal from '../LessonMilestoneModal'
import RecentWins from '../RecentWins'
// import ProgressReportCard from '../ProgressReportCard' // Commented out - may add back later
import '../../shared/Modal.css'
import './HomeTab.css'

const HomeTab = ({ studentData, onBookLesson }) => {
  const navigate = useNavigate()
  const [upcomingLesson, setUpcomingLesson] = useState(null)
  const [completedLessons, setCompletedLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [stage, setStage] = useState(null)
  const [activePracticePlan, setActivePracticePlan] = useState(null)
  const [selectedLessonForPlan, setSelectedLessonForPlan] = useState(null)
  const [manualFocusAreas, setManualFocusAreas] = useState([])
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const [currentMilestone, setCurrentMilestone] = useState(null)

  // Helper to extract goal from development plan
  const getStudentGoal = () => {
    if (!studentData?.development_plan) return null
    try {
      const plan = typeof studentData.development_plan === 'string' 
        ? JSON.parse(studentData.development_plan) 
        : studentData.development_plan
      const bigGoal = plan?.section1?.bigGoal || plan?.goals?.bigGoal
      // If it's 'other', treat as 'custom'
      if (bigGoal === 'other') return 'custom'
      return bigGoal || null
    } catch {
      return null
    }
  }

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
      // Check both completed and upcoming lessons for practice plans
      let practicePlanLesson = null
      
      // First check upcoming lesson for practice plan
      if (upcoming && upcoming.practice_plan && !upcoming.practice_plan_completed) {
        practicePlanLesson = upcoming
      }
      
      // Then check completed lessons
      if (!practicePlanLesson && completed && completed.length > 0) {
        practicePlanLesson = completed.find(
          l => l.practice_plan && !l.practice_plan_completed
        ) || completed.find(l => l.practice_plan)
      }
      
      setActivePracticePlan(practicePlanLesson || null)

      // Determine stage based on lesson count
      const studentStage = getStudentStage(studentData, upcoming, completed || [])
      setStage(studentStage)

      // Check for lesson milestones after fetching student data
      if (studentData) {
        checkLessonMilestones(completed?.length || 0, studentData.shown_lesson_milestones || [])
      }

      // Fetch manual focus areas (only unresolved ones)
      if (studentData?.id) {
        try {
          const { data: focusAreas, error: focusError } = await supabase
            .from('student_focus_areas')
            .select('*')
            .eq('student_id', studentData.id)
            .eq('is_resolved', false)
            .order('created_at', { ascending: false })

          if (!focusError && focusAreas) {
            setManualFocusAreas(focusAreas || [])
          } else if (focusError) {
            console.error('Error fetching focus areas:', focusError)
            setManualFocusAreas([])
          }
        } catch (error) {
          console.error('Error fetching focus areas:', error)
          setManualFocusAreas([])
        }
      }

    } catch (error) {
      console.error('Error fetching home data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleViewLessonPlan = async (lessonId) => {
    trackEvent(EVENTS.VIEW_LESSON_PLAN, { lesson_id: lessonId })
    
    try {
      // Check if we already have the lesson data (for upcoming lesson)
      if (upcomingLesson && upcomingLesson.id === lessonId) {
        setSelectedLessonForPlan(upcomingLesson)
        return
      }

      // Otherwise, fetch the lesson data
      const { data: lesson, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()

      if (error) throw error

      if (lesson) {
        setSelectedLessonForPlan(lesson)
      }
    } catch (error) {
      console.error('Error fetching lesson plan:', error)
      alert('Failed to load lesson plan. Please try again.')
    }
  }


  const handleBookLesson = () => {
    trackEvent(EVENTS.TAB_CHANGE, { action: 'book_lesson' })
    if (onBookLesson) {
      onBookLesson()
    }
  }

  const checkLessonMilestones = (completedCount, shownMilestones) => {
    if (!completedCount || completedCount < 5) return
    
    const newMilestone = detectNewMilestone(completedCount, shownMilestones || [])
    
    if (newMilestone) {
      setCurrentMilestone(newMilestone)
      setShowMilestoneModal(true)
    }
  }

  const handleMilestoneShown = async (milestoneNumber) => {
    if (!studentData?.id || !milestoneNumber) return

    try {
      const { data: student, error: fetchError } = await supabase
        .from('students')
        .select('shown_lesson_milestones')
        .eq('id', studentData.id)
        .single()

      if (fetchError) throw fetchError

      const currentShown = student?.shown_lesson_milestones || []
      
      // Don't add if already in the array
      if (currentShown.includes(milestoneNumber)) {
        setShowMilestoneModal(false)
        setCurrentMilestone(null)
        return
      }

      const updatedShown = [...currentShown, milestoneNumber]

      const { error: updateError } = await supabase
        .from('students')
        .update({ shown_lesson_milestones: updatedShown })
        .eq('id', studentData.id)

      if (updateError) throw updateError

      setShowMilestoneModal(false)
      setCurrentMilestone(null)
    } catch (error) {
      console.error('Error updating shown milestones:', error)
      // Still close modal even if update fails
      setShowMilestoneModal(false)
      setCurrentMilestone(null)
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

  // Extract problems/areas to improve from coach feedback
  const extractProblems = () => {
    if (!completedLessons || completedLessons.length === 0) return []
    
    const problems = []
    const feedbackKeywords = {
      'improve': ['improve', 'better', 'work on', 'focus on', 'needs work'],
      'problem': ['problem', 'issue', 'struggle', 'difficulty', 'challenge'],
      'weakness': ['weak', 'weakness', 'weak area', 'needs improvement'],
      'fix': ['fix', 'correct', 'adjust', 'change']
    }
    
    // Get recent lessons with feedback (last 5)
    const recentLessonsWithFeedback = completedLessons
      .filter(l => l.coach_feedback)
      .slice(0, 5)
    
    // Use Set for O(1) duplicate checking
    const seenProblems = new Set()
    
    recentLessonsWithFeedback.forEach(lesson => {
      if (!lesson.coach_feedback) return
      
      const feedback = lesson.coach_feedback.toLowerCase()
      
      // Look for problem indicators
      Object.keys(feedbackKeywords).forEach(key => {
        feedbackKeywords[key].forEach(keyword => {
          if (feedback.includes(keyword)) {
            // Extract sentence or phrase containing the keyword
            const sentences = (lesson.coach_feedback || '').split(/[.!?]\s+/)
            sentences.forEach(sentence => {
              if (sentence && sentence.toLowerCase().includes(keyword) && sentence.length > 20) {
                // Clean up and add if not duplicate
                const cleanSentence = sentence.trim()
                if (cleanSentence && !seenProblems.has(cleanSentence)) {
                  seenProblems.add(cleanSentence)
                  problems.push({
                    text: cleanSentence,
                    date: lesson.lesson_date,
                    lessonId: lesson.id,
                    source: 'auto-extracted'
                  })
                }
              }
            })
          }
        })
      })
    })
    
    // If no specific problems found, look for general improvement areas
    if (problems.length === 0 && recentLessonsWithFeedback.length > 0) {
      const latestFeedback = recentLessonsWithFeedback[0]?.coach_feedback
      if (latestFeedback) {
        // Try to extract actionable items (sentences with action verbs)
        const sentences = (latestFeedback || '').split(/[.!?]\s+/)
        sentences.forEach(sentence => {
          if (sentence) {
            const actionVerbs = ['practice', 'focus', 'work', 'develop', 'strengthen', 'improve']
            if (actionVerbs.some(verb => sentence.toLowerCase().includes(verb)) && sentence.length > 30) {
              const trimmedSentence = sentence.trim()
              if (trimmedSentence && !seenProblems.has(trimmedSentence)) {
                seenProblems.add(trimmedSentence)
                problems.push({
                  text: trimmedSentence,
                  date: recentLessonsWithFeedback[0].lesson_date,
                  lessonId: recentLessonsWithFeedback[0].id,
                  source: 'auto-extracted'
                })
              }
            }
          }
        })
      }
    }
    
    return problems.slice(0, 3) // Return top 3 problems
  }

  // Combine manual focus areas with auto-extracted ones
  // Manual areas come first, then auto-extracted
  const getAllFocusAreas = () => {
    const manual = (manualFocusAreas || []).map(fa => ({
      text: fa.area_text,
      date: fa.created_at,
      id: fa.id,
      source: 'manual'
    }))

    const autoExtracted = extractProblems()

    // Combine: manual first, then auto-extracted (limit total to 5)
    const combined = [...manual, ...autoExtracted].slice(0, 5)
    return combined
  }

  const problems = getAllFocusAreas()

  return (
    <div className="home-tab">
      {/* Header - Stage Aware */}
      <div className="home-header">
        <h1>{stage?.title || `Welcome ${(studentData?.profiles?.full_name || studentData?.full_name || 'there')}, let's get started! 🎾`}</h1>
        <p className="home-subtitle">{stage?.description || 'Your tennis journey continues'}</p>
      </div>

      {/* Quick Stats Bar - Enhanced */}
      <div className="quick-stats">
        <div className="stat-item enhanced">
          <div className="stat-icon">📚</div>
          <div className="stat-content">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Lessons</span>
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item enhanced">
          <div className="stat-icon">💳</div>
          <div className="stat-content">
            <span className="stat-value">{studentData?.lesson_credits || 0}</span>
            <span className="stat-label">Credits</span>
            {(studentData?.lesson_credits ?? 0) <= 2 && (
              <span className="stat-progress">
                {(studentData?.lesson_credits ?? 0) === 0 ? 'Time to Re-Up' : 'Almost Time to Re-Up'}
              </span>
            )}
          </div>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item enhanced">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <span className="stat-value">
              {practicePlanCount > 0 ? `${completedPracticeCount}/${practicePlanCount}` : '0'}
            </span>
            <span className="stat-label">Practice</span>
            {practicePlanCount > 0 && (
              <span className="stat-progress">
                {Math.round((completedPracticeCount / practicePlanCount) * 100)}% complete
              </span>
            )}
          </div>
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

          {/* Current Practice Plan - Show if available */}
          {activePracticePlan && (
            <PracticePlanCard 
              lesson={activePracticePlan}
              onComplete={fetchHomeData}
              studentGoal={getStudentGoal()}
            />
          )}

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
              studentGoal={getStudentGoal()}
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
          {/* 1. Practice Plan - Most actionable */}
          {activePracticePlan && (
            <PracticePlanCard 
              lesson={activePracticePlan}
              onComplete={fetchHomeData}
              studentGoal={getStudentGoal()}
            />
          )}


          {/* Progress Report Card - Weekly/Monthly Summary */}
          {/* Commented out - may add back later
          {completedLessons.length >= 2 && (
            <ProgressReportCard 
              studentId={studentData?.id}
              timeRange={7}
            />
          )}
          */}

          {/* 3. Next Lesson Card - Upcoming schedule */}
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

          {/* 4. Areas to Focus On - What to work on */}
          {stage?.showProgressHighlights && (
            <div className="problem-card">
              <div className="problem-card-header">
                <h3>🎯 Areas to Focus On</h3>
                <span className="problem-card-subtitle">Based on your recent lessons</span>
              </div>
              {problems.length > 0 ? (
                <div className="problems-list">
                  {problems.map((problem, index) => (
                    <div key={problem.id || `auto-${index}`} className="problem-item">
                      <div className="problem-icon">•</div>
                      <div className="problem-content">
                        <p className="problem-text">{problem.text}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span className="problem-date">
                            {new Date(problem.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {problem.source === 'manual' && (
                            <span style={{ 
                              fontSize: '11px', 
                              color: '#4B2C6C', 
                              backgroundColor: '#E9E3FF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '500'
                            }}>
                              Coach Added
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-problems-message">
                  <p>Keep up the great work! Your coach will add specific areas to focus on in your feedback.</p>
                </div>
              )}
            </div>
          )}

          {/* 5. Recent Wins - Progress/Celebration */}
          {stage?.showRecentWins && studentData?.development_plan && (
            <div className="recent-wins-section">
              <h3>🏆 Recent Wins</h3>
              <RecentWins 
                studentId={studentData.id} 
                developmentPlan={studentData.development_plan}
                playerLevel={studentData.player_level || 'beginner'}
                hideGoalProgress={false}
                hideTitle={true}
              />
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

      {/* Lesson Milestone Celebration Modal */}
      {showMilestoneModal && currentMilestone && (
        <LessonMilestoneModal
          milestone={currentMilestone}
          onClose={() => setShowMilestoneModal(false)}
          onMarkShown={handleMilestoneShown}
        />
      )}

      {/* Lesson Plan Modal */}
      {selectedLessonForPlan && (
        <div className="modal-overlay" onClick={() => setSelectedLessonForPlan(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Plan</h2>
              <button className="modal-close" onClick={() => setSelectedLessonForPlan(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>Date:</strong> {new Date(selectedLessonForPlan.lesson_date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Time:</strong> {new Date(selectedLessonForPlan.lesson_date).toLocaleTimeString('en-US', { 
                  hour: 'numeric', 
                  minute: '2-digit' 
                })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Location:</strong> {selectedLessonForPlan.location || 'Colina Del Sol Park'}
              </div>
              {(selectedLessonForPlan.lesson_plan || selectedLessonForPlan.student_lesson_plan) && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Lesson Plan:</strong>
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '16px', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '8px', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '15px'
                  }}>
                    {selectedLessonForPlan.student_lesson_plan || selectedLessonForPlan.lesson_plan}
                  </div>
                </div>
              )}
              {selectedLessonForPlan.practice_plan && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Practice Plan:</strong>
                  <div style={{ 
                    marginTop: '12px', 
                    padding: '16px', 
                    backgroundColor: '#e8f5e9', 
                    borderRadius: '8px', 
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.6',
                    fontSize: '15px'
                  }}>
                    {selectedLessonForPlan.practice_plan}
                    {selectedLessonForPlan.practice_plan_time_estimate && (
                      <div style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                        ⏱️ Estimated time: {selectedLessonForPlan.practice_plan_time_estimate} minutes
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedLessonForPlan(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default HomeTab
