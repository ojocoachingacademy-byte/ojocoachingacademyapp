import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, MapPin, User, ExternalLink } from 'lucide-react'
import './CalendarView.css'

export default function CalendarView() {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState('month') // 'month', 'week', 'day'
  const [selectedLesson, setSelectedLesson] = useState(null)

  useEffect(() => {
    fetchLessons()
    
    // Set up realtime subscription
    const lessonsSubscription = supabase
      .channel('lessons-calendar-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'lessons' },
        () => {
          fetchLessons()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(lessonsSubscription)
    }
  }, [])

  const fetchLessons = async () => {
    try {
      // First, get all active student IDs
      const { data: activeStudents, error: studentsError } = await supabase
        .from('students')
        .select('id')
        .eq('is_active', true)

      if (studentsError) {
        console.error('Error fetching active students:', studentsError)
      }

      const activeStudentIds = (activeStudents || []).map(s => s.id)

      // Fetch lessons only for active students
      let lessonsData = []
      if (activeStudentIds.length > 0) {
        const { data, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('student_id', activeStudentIds)
          .order('lesson_date', { ascending: true })

        if (lessonsError) throw lessonsError
        lessonsData = data || []
      }

      // Get unique student IDs from the filtered lessons
      const studentIds = [...new Set((lessonsData || []).map(l => l.student_id).filter(Boolean))]
      
      // Fetch profiles for those students
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, ntrp_level')
        .in('id', studentIds)

      // Enrich lessons with student info
      const enrichedLessons = (lessonsData || []).map(lesson => {
        const profile = (profilesData || []).find(p => p.id === lesson.student_id)
        return {
          ...lesson,
          students: profile ? { profiles: profile } : null
        }
      })

      setLessons(enrichedLessons)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setLoading(false)
    }
  }

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getLessonsForDate = (date) => {
    if (!date) return []
    
    const dateStr = date.toISOString().split('T')[0]
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.lesson_date).toISOString().split('T')[0]
      return lessonDate === dateStr
    })
  }

  // Check if lesson is from Google Calendar
  const isGoogleCalendarLesson = (lesson) => {
    if (!lesson.metadata) return false
    try {
      const metadata = typeof lesson.metadata === 'string' 
        ? JSON.parse(lesson.metadata) 
        : lesson.metadata
      return metadata.source === 'google_calendar'
    } catch {
      return false
    }
  }

  // Get student name from lesson (from profile or metadata)
  const getStudentName = (lesson) => {
    if (lesson.students?.profiles?.full_name) {
      return lesson.students.profiles.full_name
    }
    try {
      const metadata = typeof lesson.metadata === 'string' 
        ? JSON.parse(lesson.metadata) 
        : lesson.metadata
      return metadata?.student_name || 'Unknown'
    } catch {
      return 'Unknown'
    }
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#F4C430' // Gold
      case 'completed':
        return '#2D7F6F' // Teal
      case 'cancelled':
        return '#999' // Gray
      default:
        return '#4B2C6C' // Purple
    }
  }

  if (loading) {
    return (
      <div className="calendar-view">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666', marginTop: '16px' }}>Loading calendar...</p>
      </div>
    )
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <div className="calendar-controls">
          <button className="btn btn-outline" onClick={() => navigateMonth(-1)}>
            <ChevronLeft size={20} />
          </button>
          <h1 className="calendar-title">{formatDate(currentDate)}</h1>
          <button className="btn btn-outline" onClick={() => navigateMonth(1)}>
            <ChevronRight size={20} />
          </button>
          <button className="btn btn-primary" onClick={goToToday}>
            Today
          </button>
        </div>
        <div className="view-mode-toggle">
          <button
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Day
          </button>
        </div>
      </div>

      {viewMode === 'month' && (
        <div className="calendar-grid">
          <div className="calendar-weekdays">
            {weekDays.map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {days.map((date, index) => {
              const dayLessons = getLessonsForDate(date)
              const isToday = date && 
                date.toDateString() === new Date().toDateString()
              const isCurrentMonth = date && 
                date.getMonth() === currentDate.getMonth()

              return (
                <div
                  key={index}
                  className={`calendar-day ${!date ? 'empty' : ''} ${isToday ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`}
                >
                  {date && (
                    <>
                      <div className="day-number">{date.getDate()}</div>
                      <div className="day-lessons">
                        {dayLessons.slice(0, 3).map(lesson => (
                          <div
                            key={lesson.id}
                            className="lesson-event"
                            style={{ 
                              borderLeftColor: getStatusColor(lesson.status),
                              backgroundColor: `${getStatusColor(lesson.status)}15`
                            }}
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            <div className="lesson-event-header">
                              <div className="lesson-time">
                                {formatTime(lesson.lesson_date)}
                              </div>
                              <div className="lesson-source-badge" style={{
                                backgroundColor: isGoogleCalendarLesson(lesson) ? '#2D7F6F' : '#4B2C6C',
                                color: 'white',
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}>
                                {isGoogleCalendarLesson(lesson) ? 'CAL' : 'APP'}
                              </div>
                            </div>
                            <div className="lesson-student">
                              {getStudentName(lesson)}
                            </div>
                          </div>
                        ))}
                        {dayLessons.length > 3 && (
                          <div className="more-lessons">
                            +{dayLessons.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'week' && (
        <div className="week-view">
          <div className="week-header">
            {weekDays.map((day, index) => {
              const weekStart = new Date(currentDate)
              weekStart.setDate(currentDate.getDate() - currentDate.getDay())
              const weekDate = new Date(weekStart)
              weekDate.setDate(weekStart.getDate() + index)
              const dayLessons = getLessonsForDate(weekDate)
              const isToday = weekDate.toDateString() === new Date().toDateString()

              return (
                <div key={day} className={`week-day-column ${isToday ? 'today' : ''}`}>
                  <div className="week-day-header">
                    <div className="week-day-name">{day}</div>
                    <div className="week-day-number">{weekDate.getDate()}</div>
                  </div>
                  <div className="week-day-lessons">
                    {dayLessons.map(lesson => (
                      <div
                        key={lesson.id}
                        className="week-lesson-event"
                        style={{ 
                          borderLeftColor: getStatusColor(lesson.status),
                          backgroundColor: `${getStatusColor(lesson.status)}15`
                        }}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div className="week-lesson-time">
                            {formatTime(lesson.lesson_date)}
                          </div>
                          <div style={{
                            backgroundColor: isGoogleCalendarLesson(lesson) ? '#2D7F6F' : '#4B2C6C',
                            color: 'white',
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600
                          }}>
                            {isGoogleCalendarLesson(lesson) ? 'CAL' : 'APP'}
                          </div>
                        </div>
                        <div className="week-lesson-student">
                          {getStudentName(lesson)}
                        </div>
                        {lesson.location && (
                          <div className="week-lesson-location">
                            <MapPin size={12} />
                            {lesson.location}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="day-view">
          <div className="day-header">
            <h2>{currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric',
              year: 'numeric'
            })}</h2>
          </div>
          <div className="day-timeline">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourLessons = lessons.filter(lesson => {
                const lessonDate = new Date(lesson.lesson_date)
                const lessonHour = lessonDate.getHours()
                const lessonDay = lessonDate.toDateString()
                const currentDay = currentDate.toDateString()
                return lessonHour === hour && lessonDay === currentDay
              })

              return (
                <div key={hour} className="timeline-hour">
                  <div className="hour-label">
                    {hour === 0 ? '12 AM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                  </div>
                  <div className="hour-slot">
                    {hourLessons.map(lesson => (
                      <div
                        key={lesson.id}
                        className="day-lesson-event"
                        style={{ 
                          borderLeftColor: getStatusColor(lesson.status),
                          backgroundColor: `${getStatusColor(lesson.status)}15`
                        }}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className="day-lesson-header">
                          <div className="day-lesson-time">
                            {formatTime(lesson.lesson_date)}
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{
                              backgroundColor: isGoogleCalendarLesson(lesson) ? '#2D7F6F' : '#4B2C6C',
                              color: 'white',
                              fontSize: '10px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: 600
                            }}>
                              {isGoogleCalendarLesson(lesson) ? 'CAL' : 'APP'}
                            </div>
                            <div className="day-lesson-status" style={{ 
                              color: getStatusColor(lesson.status) 
                            }}>
                              {lesson.status}
                            </div>
                          </div>
                        </div>
                        <div className="day-lesson-student">
                          <User size={14} />
                          {getStudentName(lesson)}
                        </div>
                        {lesson.location && (
                          <div className="day-lesson-location">
                            <MapPin size={12} />
                            {lesson.location}
                          </div>
                        )}
                        {lesson.lesson_plan && (
                          <div className="day-lesson-plan-indicator">
                            ✓ Plan Ready
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="modal-overlay" onClick={() => setSelectedLesson(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Details</h2>
              <button className="modal-close" onClick={() => setSelectedLesson(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="lesson-detail-section">
                <div className="detail-item">
                  <strong>Student:</strong>
                  <span>{getStudentName(selectedLesson)}</span>
                </div>
                <div className="detail-item">
                  <strong>Date & Time:</strong>
                  <span>
                    {new Date(selectedLesson.lesson_date).toLocaleString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <div className="detail-item">
                  <strong>Location:</strong>
                  <span>{selectedLesson.location || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <strong>Status:</strong>
                  <span style={{ color: getStatusColor(selectedLesson.status) }}>
                    {selectedLesson.status}
                  </span>
                </div>
                {isGoogleCalendarLesson(selectedLesson) && (
                  <div className="detail-item">
                    <strong>Source:</strong>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      backgroundColor: '#2D7F6F',
                      color: 'white',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      Google Calendar
                      {(() => {
                        try {
                          const metadata = typeof selectedLesson.metadata === 'string' 
                            ? JSON.parse(selectedLesson.metadata) 
                            : selectedLesson.metadata
                          return metadata.google_calendar_link ? (
                            <a 
                              href={metadata.google_calendar_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: 'white', textDecoration: 'underline', marginLeft: '4px' }}
                            >
                              <ExternalLink size={12} />
                            </a>
                          ) : null
                        } catch {
                          return null
                        }
                      })()}
                    </span>
                  </div>
                )}
                {selectedLesson.students?.profiles?.ntrp_level && (
                  <div className="detail-item">
                    <strong>NTRP Level:</strong>
                    <span>{selectedLesson.students.profiles.ntrp_level}</span>
                  </div>
                )}
                {selectedLesson.lesson_plan && (
                  <div className="detail-item">
                    <strong>Lesson Plan:</strong>
                    <div className="lesson-plan-preview">
                      {selectedLesson.lesson_plan.substring(0, 200)}
                      {selectedLesson.lesson_plan.length > 200 && '...'}
                    </div>
                  </div>
                )}
                {selectedLesson.student_learnings && (
                  <div className="detail-item">
                    <strong>Student Learnings:</strong>
                    <div className="learnings-preview">
                      {selectedLesson.student_learnings}
                    </div>
                  </div>
                )}
                {selectedLesson.coach_feedback && (
                  <div className="detail-item">
                    <strong>Coach Feedback:</strong>
                    <div className="feedback-preview">
                      {selectedLesson.coach_feedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setSelectedLesson(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

