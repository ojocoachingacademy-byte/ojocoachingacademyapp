import React, { useState } from 'react'
import './LessonCard.css'

const LessonCard = ({ lesson, type, onView }) => {
  const [expanded, setExpanded] = useState(false)

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'long' }),
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
  }

  const getDaysUntil = (dateString) => {
    const days = Math.ceil((new Date(dateString) - new Date()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 0) return 'Past'
    return `In ${days} days`
  }

  const { day, date, time } = formatDate(lesson.lesson_date)

  const toggleExpand = () => {
    setExpanded(!expanded)
    if (!expanded && onView) {
      onView()
    }
  }

  // Check for lesson plan (prefer student_lesson_plan, fallback to lesson_plan)
  const lessonPlan = lesson.student_lesson_plan || lesson.lesson_plan
  // Check for feedback (coach_feedback or coach_notes)
  const feedback = lesson.coach_feedback || lesson.coach_notes

  return (
    <div className={`lesson-card ${type} ${expanded ? 'expanded' : ''}`}>
      {/* Card Header */}
      <div className="lesson-card-header" onClick={toggleExpand}>
        <div className="lesson-date-info">
          <span className="lesson-day">{day}</span>
          <span className="lesson-date">{date}</span>
          <span className="lesson-time">{time}</span>
          {type === 'upcoming' && (
            <span className="lesson-countdown">{getDaysUntil(lesson.lesson_date)}</span>
          )}
        </div>

        <div className="lesson-indicators">
          {feedback && <span className="indicator feedback" title="Has feedback">📝</span>}
          {lesson.practice_plan && (
            <span 
              className={`indicator practice ${lesson.practice_plan_completed ? 'completed' : ''}`}
              title={lesson.practice_plan_completed ? 'Practice completed' : 'Practice plan assigned'}
            >
              {lesson.practice_plan_completed ? '✅' : '🎯'}
            </span>
          )}
          {lessonPlan && <span className="indicator plan" title="Has lesson plan">📋</span>}
        </div>

        <button className="expand-btn" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="lesson-card-content">
          {/* Lesson Plan */}
          {lessonPlan && (
            <div className="lesson-detail-section">
              <h4>📋 Lesson Plan</h4>
              <div className="detail-content">
                <p>{lessonPlan}</p>
              </div>
            </div>
          )}

          {/* Coach Feedback */}
          {feedback && (
            <div className="lesson-detail-section">
              <h4>📝 Coach Feedback</h4>
              <div className="detail-content feedback-content">
                <p>{feedback}</p>
              </div>
            </div>
          )}

          {/* Practice Plan */}
          {lesson.practice_plan && (
            <div className="lesson-detail-section practice-section">
              <h4>🎯 Practice Plan</h4>
              <div className="detail-content practice-content">
                <div className="practice-header">
                  {lesson.practice_plan_time_estimate && (
                    <span className="practice-time">⏱️ {lesson.practice_plan_time_estimate} minutes</span>
                  )}
                  {lesson.practice_plan_completed && (
                    <span className="practice-completed">✅ Completed</span>
                  )}
                </div>
                <p>{lesson.practice_plan}</p>
              </div>
            </div>
          )}

          {/* Student Learnings (if present) */}
          {lesson.student_learnings && (
            <div className="lesson-detail-section">
              <h4>💭 My Learnings</h4>
              <div className="detail-content learnings-content">
                <p>{lesson.student_learnings}</p>
              </div>
            </div>
          )}

          {/* Location */}
          <div className="lesson-location">
            <span className="location-icon">📍</span>
            <span>{lesson.location || 'Colina Del Sol Park'}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default LessonCard


