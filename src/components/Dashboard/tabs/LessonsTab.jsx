import React, { useState, useEffect } from 'react'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import LessonCard from '../LessonCard'
import './LessonsTab.css'

const LessonsTab = ({ studentData, onBookLesson }) => {
  const [upcomingLessons, setUpcomingLessons] = useState([])
  const [pastLessons, setPastLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'with_feedback', 'with_practice'

  useEffect(() => {
    if (studentData?.id) {
      fetchLessons()
    }
  }, [studentData])

  const fetchLessons = async () => {
    if (!studentData?.id) return

    try {
      // Fetch upcoming lessons
      const { data: upcoming } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('status', 'scheduled')
        .gte('lesson_date', new Date().toISOString())
        .order('lesson_date', { ascending: true })

      setUpcomingLessons(upcoming || [])

      // Fetch past lessons (completed or cancelled)
      const { data: past } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentData.id)
        .in('status', ['completed', 'cancelled'])
        .order('lesson_date', { ascending: false })

      setPastLessons(past || [])

    } catch (error) {
      console.error('Error fetching lessons:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPastLessons = pastLessons.filter(lesson => {
    if (filter === 'with_feedback') return lesson.coach_feedback || lesson.coach_notes
    if (filter === 'with_practice') return lesson.practice_plan
    return true
  })

  if (loading) {
    return (
      <div className="lessons-tab-loading">
        <div className="spinner"></div>
        <p>Loading lessons...</p>
      </div>
    )
  }

  const thisMonthCount = pastLessons.filter(l => {
    const lessonDate = new Date(l.lesson_date)
    const now = new Date()
    return lessonDate.getMonth() === now.getMonth() && 
           lessonDate.getFullYear() === now.getFullYear()
  }).length

  return (
    <div className="lessons-tab">
      {/* Header */}
      <div className="lessons-header">
        <h1>My Lessons 📅</h1>
        <p className="lessons-subtitle">Your complete lesson history</p>
      </div>

      {/* Summary Stats */}
      <div className="lessons-summary">
        <div className="summary-item">
          <span className="summary-label">Total Lessons</span>
          <span className="summary-value">{pastLessons.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-label">Upcoming</span>
          <span className="summary-value">{upcomingLessons.length}</span>
        </div>
        <div className="summary-divider"></div>
        <div className="summary-item">
          <span className="summary-label">This Month</span>
          <span className="summary-value">{thisMonthCount}</span>
        </div>
      </div>

      {/* Upcoming Lessons Section */}
      {upcomingLessons.length > 0 && (
        <section className="lessons-section">
          <h2 className="section-title">Upcoming Lessons</h2>
          <div className="lessons-list">
            {upcomingLessons.map(lesson => (
              <LessonCard 
                key={lesson.id} 
                lesson={lesson} 
                type="upcoming"
                onView={() => trackEvent(EVENTS.VIEW_LESSON_PLAN, { lesson_id: lesson.id })}
              />
            ))}
          </div>
        </section>
      )}

      {/* Past Lessons Section */}
      <section className="lessons-section">
        <div className="section-header-with-filter">
          <h2 className="section-title">Past Lessons ({filteredPastLessons.length})</h2>
          
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={`filter-btn ${filter === 'with_feedback' ? 'active' : ''}`}
              onClick={() => setFilter('with_feedback')}
            >
              With Feedback
            </button>
            <button 
              className={`filter-btn ${filter === 'with_practice' ? 'active' : ''}`}
              onClick={() => setFilter('with_practice')}
            >
              With Practice
            </button>
          </div>
        </div>

        {filteredPastLessons.length === 0 ? (
          <div className="no-lessons">
            <p>No lessons found with this filter</p>
          </div>
        ) : (
          <div className="lessons-list">
            {filteredPastLessons.map(lesson => (
              <LessonCard 
                key={lesson.id} 
                lesson={lesson} 
                type="past"
                onView={() => trackEvent(EVENTS.VIEW_LESSON_FEEDBACK, { lesson_id: lesson.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* Empty State */}
      {pastLessons.length === 0 && upcomingLessons.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎾</div>
          <h3>No lessons yet</h3>
          <p>Book your first lesson to get started!</p>
          {onBookLesson && (
            <button className="btn-primary" onClick={onBookLesson}>
              Book a Lesson
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default LessonsTab
