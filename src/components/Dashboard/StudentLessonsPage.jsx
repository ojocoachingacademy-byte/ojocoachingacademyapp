import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Calendar, Target, BookOpen, MessageSquare, CheckCircle } from 'lucide-react'
import './StudentDashboard.css'
import '../shared/Modal.css'

export default function StudentLessonsPage() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      // Get profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError
      setProfile(profileData)

      // Get student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single()

      if (studentError) throw studentError
      setStudent(studentData)

      // Get lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .order('lesson_date', { ascending: false })

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666' }}>Loading...</p>
      </div>
    )
  }

  const now = new Date()
  // Determine actual status based on date/time
  const getActualStatus = (lesson) => {
    const lessonDate = new Date(lesson.lesson_date)
    if (lesson.status === 'cancelled') return 'cancelled'
    if (lessonDate < now && lesson.status === 'scheduled') return 'completed' // Auto-complete past scheduled lessons
    return lesson.status || 'scheduled'
  }
  
  const upcomingLessons = lessons.filter(l => {
    const status = getActualStatus(l)
    if (status !== 'scheduled') return false
    const lessonDate = new Date(l.lesson_date)
    return lessonDate > now
  })
  const pastLessons = lessons.filter(l => {
    const status = getActualStatus(l)
    return status === 'completed' || (new Date(l.lesson_date) < now && status !== 'cancelled')
  })

  // Parse development plan
  let developmentPlan = null
  if (student?.development_plan) {
    try {
      developmentPlan = typeof student.development_plan === 'string' 
        ? JSON.parse(student.development_plan) 
        : student.development_plan
    } catch (error) {
      console.error('Error parsing development plan:', error)
    }
  }

  return (
    <div className="student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="welcome-message">My Lessons & Progress 🎾</h1>
      </div>

      {/* Development Plan Section */}
      {developmentPlan && developmentPlan.skills && developmentPlan.skills.length > 0 && (
        <div className="section">
          <h2 className="section-title">
            <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Development Plan
          </h2>

          {/* Goals & Motivation Section */}
          {developmentPlan.goals && (
            <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid #E0E0E0' }}>
              <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-primary)', fontSize: '20px', fontWeight: 600 }}>
                Goals & Motivation
              </h3>
              
              {developmentPlan.goals.inspiration && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                    What inspired you to improve your tennis game?
                  </strong>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                    {developmentPlan.goals.inspiration}
                  </p>
                </div>
              )}
              
              {developmentPlan.goals.targetLevel && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                    What level do you want to reach?
                  </strong>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                    {developmentPlan.goals.targetLevel}
                  </p>
                </div>
              )}
              
              {developmentPlan.goals.wantToBeat && (
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                  <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                    Who do you want to beat once you improve?
                  </strong>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                    {developmentPlan.goals.wantToBeat}
                  </p>
                </div>
              )}
              
              {developmentPlan.goals.successLookLike && (
                <div>
                  <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                    What would success look like for you?
                  </strong>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                    {developmentPlan.goals.successLookLike}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Skills Section */}
          <div className="development-plan-grid">
            {developmentPlan.skills.map((skill, index) => {
              const studentLevel = skill.student_assessment ?? skill.current_level ?? null
              const coachLevel = skill.coach_assessment ?? null
              const targetLevel = skill.target_level ?? null
              
              return (
                <div key={index} className="skill-card-student">
                  <div className="skill-header-student">
                    <strong>{skill.skill_name}</strong>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {studentLevel && (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '14px' }}>
                          You: {studentLevel}/10
                        </span>
                      )}
                      {coachLevel && (
                        <span style={{ color: 'var(--color-secondary)', fontWeight: 600, fontSize: '14px' }}>
                          Coach: {coachLevel}/10
                        </span>
                      )}
                      {targetLevel && (
                        <span style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '14px' }}>
                          Target: {targetLevel}/10
                        </span>
                      )}
                    </div>
                  </div>
                  {targetLevel && (
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar"
                        style={{ 
                          width: `${Math.min(((studentLevel || coachLevel || 0) / targetLevel) * 100, 100)}%`,
                          backgroundColor: (studentLevel || coachLevel || 0) >= targetLevel ? 'var(--color-success)' : 'var(--color-primary)'
                        }}
                      />
                    </div>
                  )}
                  {skill.notes && (
                    <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', fontStyle: 'italic' }}>
                      {skill.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          {/* Coach Notes */}
          {student.development_plan_notes && (
            <div style={{ marginTop: '32px', padding: '24px', backgroundColor: '#F0F9FF', borderRadius: '12px', borderLeft: '4px solid var(--color-secondary)', boxShadow: 'var(--shadow-sm)' }}>
              <h3 style={{ margin: '0 0 12px 0', color: 'var(--color-dark)', fontSize: '18px', fontWeight: 600 }}>
                Coach's Notes
              </h3>
              <p style={{ margin: 0, color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap', fontSize: '15px' }}>
                {student.development_plan_notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Lessons */}
      <div className="section">
        <h2 className="section-title">
          <Calendar size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Upcoming Lessons ({upcomingLessons.length})
        </h2>
        {upcomingLessons.length === 0 ? (
          <div className="empty-state">No upcoming lessons scheduled.</div>
        ) : (
          upcomingLessons.map((lesson, index) => (
            <div 
              key={lesson.id} 
              className={`lesson-card stagger-item`} 
              style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
              onClick={() => setSelectedLesson(lesson)}
            >
              <div className="lesson-header">
                <div>
                  <div className="lesson-date">
                    {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="lesson-time">
                    {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="lesson-location">
                    <Calendar size={16} style={{ display: 'inline', marginRight: '8px' }} />
                    {lesson.location}
                  </div>
                </div>
                <span className="status-dot status-scheduled"></span>
              </div>
              {lesson.lesson_plan && (
                <div className="lesson-plan-box">
                  <strong>Lesson Plan:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{lesson.lesson_plan}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Past Lessons */}
      <div className="section">
        <h2 className="section-title">
          <BookOpen size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
          Past Lessons ({pastLessons.length})
        </h2>
        {pastLessons.length === 0 ? (
          <div className="empty-state">No past lessons yet.</div>
        ) : (
          pastLessons.map((lesson, index) => {
            const actualStatus = getActualStatus(lesson)
            return (
              <div 
                key={lesson.id} 
                className={`lesson-card stagger-item`} 
                style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="lesson-header">
                  <div>
                    <div className="lesson-date">
                      {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="lesson-time">
                      {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="lesson-location">
                      <Calendar size={16} style={{ display: 'inline', marginRight: '8px' }} />
                      {lesson.location}
                    </div>
                  </div>
                  <span className={`status-dot status-${actualStatus}`}></span>
                </div>

                {lesson.lesson_plan && (
                  <div className="lesson-plan-box">
                    <strong>Lesson Plan:</strong>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{lesson.lesson_plan}</p>
                  </div>
                )}

                {lesson.student_learnings && (
                  <div className="learnings-box">
                    <strong>My Learnings:</strong>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{lesson.student_learnings}</p>
                    {!lesson.coach_feedback && (
                      <div className="status-badge status-waiting">
                        ✅ Waiting for coach feedback
                      </div>
                    )}
                  </div>
                )}

                {lesson.coach_feedback && (
                  <div className="feedback-box">
                    <strong>Coach Feedback:</strong>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{lesson.coach_feedback}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="modal-overlay" onClick={() => setSelectedLesson(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Details</h2>
              <button className="modal-close" onClick={() => setSelectedLesson(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>Date:</strong> {new Date(selectedLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Time:</strong> {new Date(selectedLesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Location:</strong> {selectedLesson.location || '-'}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{getActualStatus(selectedLesson)}</span>
              </div>
              {selectedLesson.lesson_plan && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Lesson Plan:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.lesson_plan}
                  </div>
                </div>
              )}
              {selectedLesson.student_learnings && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>My Learnings:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.student_learnings}
                  </div>
                </div>
              )}
              {selectedLesson.coach_feedback && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Coach Feedback:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E8F5E9', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.coach_feedback}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedLesson(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

