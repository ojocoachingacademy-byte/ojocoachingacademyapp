import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Award, Target, Edit2 } from 'lucide-react'
import './StudentDashboard.css'
import '../shared/Modal.css'
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [studentLearnings, setStudentLearnings] = useState('')
  const [developmentPlan, setDevelopmentPlan] = useState([])
  const [editingPlan, setEditingPlan] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      // Get current user
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

      // Development plan is stored in studentData.development_plan (JSON)

      // Get lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .order('lesson_date', { ascending: false })

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Development plan is stored in student.development_plan (JSON)
      // It will be loaded from studentData

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSubmitLearnings = async () => {
    if (!selectedLesson || !studentLearnings.trim()) {
      alert('Please enter your 3 learnings')
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ student_learnings: studentLearnings })
        .eq('id', selectedLesson.id)

      if (error) throw error

      // Create notification for coach
      const { data: { user } } = await supabase.auth.getUser()
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: 'tobiojo10@gmail.com', // Coach email - TODO: get from profiles table
          type: 'feedback_posted',
          title: 'Student Learnings Submitted',
          body: `${studentProfile?.full_name || 'A student'} has submitted learnings for a lesson`,
          link: `/coach`,
          read: false
        })

      setSelectedLesson(null)
      setStudentLearnings('')
      fetchStudentData() // Refresh to show updated data
    } catch (error) {
      console.error('Error submitting learnings:', error)
      alert('Error submitting learnings: ' + error.message)
    }
  }

  const handleCloseLearningsModal = () => {
    setSelectedLesson(null)
    setStudentLearnings('')
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
  const upcomingLessons = lessons.filter(l => {
    if (l.status !== 'scheduled') return false
    const lessonDate = new Date(l.lesson_date)
    return lessonDate > now
  })
  const pastLessons = lessons.filter(l => new Date(l.lesson_date) < now)
  
  // Helper function to check if lesson plan should be visible (24 hours before)
  const isLessonPlanVisible = (lessonDate) => {
    const lesson = new Date(lessonDate)
    const hoursUntilLesson = (lesson - now) / (1000 * 60 * 60)
    return hoursUntilLesson <= 24
  }

  return (
    <div className="student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="welcome-message">Welcome, {profile?.full_name}! 🎾</h1>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card card-gradient-purple">
          <div className="stat-card-content">
            <div className="stat-icon">💰</div>
            <div className="stat-label">Lesson Credits</div>
            <div className="stat-value">{student?.lesson_credits || 0}</div>
          </div>
        </div>
        <div className="stat-card card-gradient-teal">
          <div className="stat-card-content">
            <div className="stat-icon">📅</div>
            <div className="stat-label">Upcoming Lessons</div>
            <div className="stat-value">{upcomingLessons.length}</div>
          </div>
        </div>
        <div className="stat-card card-gradient-gold">
          <div className="stat-card-content">
            <div className="stat-icon">🏆</div>
            <div className="stat-label">NTRP Level</div>
            <div className="stat-value">{profile?.ntrp_level || 'N/A'}</div>
          </div>
        </div>
      </div>

      {/* Upcoming Lessons */}
      <div className="section">
        <h2 className="section-title">Upcoming Lessons</h2>
        {upcomingLessons.length === 0 ? (
          <div className="empty-state">No upcoming lessons scheduled.</div>
        ) : (
          upcomingLessons.map((lesson, index) => (
            <div key={lesson.id} className={`lesson-card stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
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
              {lesson.lesson_plan && isLessonPlanVisible(lesson.lesson_date) && (
                <div className="lesson-plan-box">
                  <strong>Lesson Plan:</strong>
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{lesson.lesson_plan}</p>
                </div>
              )}
              {lesson.lesson_plan && !isLessonPlanVisible(lesson.lesson_date) && (
                <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                  Lesson plan will be available 24 hours before the lesson
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Development Plan */}
      {editingPlan ? (
        <div className="section">
          <h2 className="section-title">
            <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Edit Development Plan
          </h2>
          <DevelopmentPlanForm
            student={student}
            onSave={async (planData) => {
              try {
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) return

                const { error } = await supabase
                  .from('students')
                  .update(planData)
                  .eq('id', user.id)

                if (error) throw error
                
                alert('Development plan saved!')
                setEditingPlan(false)
                fetchStudentData()
              } catch (error) {
                console.error('Error saving development plan:', error)
                alert('Error saving development plan: ' + error.message)
              }
            }}
            onCancel={() => setEditingPlan(false)}
            isStudent={true}
          />
        </div>
      ) : student?.development_plan ? (() => {
        try {
          const plan = typeof student.development_plan === 'string' 
            ? JSON.parse(student.development_plan) 
            : student.development_plan
          
          if (!plan || !plan.skills || plan.skills.length === 0) return null

          return (
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  My Development Plan
                </h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => setEditingPlan(true)}
                >
                  <Edit2 size={18} />
                  Edit Plan
                </button>
              </div>
              
              {/* Goals Section */}
              {plan.goals && (
                <div style={{ marginBottom: '32px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
                  <h3 style={{ margin: '0 0 16px 0', color: 'var(--color-primary)', fontSize: '18px' }}>Goals & Motivation</h3>
                  {plan.goals.targetLevel && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Target Goal:</strong> <span style={{ color: '#666' }}>{plan.goals.targetLevel}</span>
                    </div>
                  )}
                  {plan.goals.wantToBeat && (
                    <div style={{ marginBottom: '12px' }}>
                      <strong>I want to beat:</strong> <span style={{ color: '#666' }}>{plan.goals.wantToBeat}</span>
                    </div>
                  )}
                  {plan.goals.successLookLike && (
                    <div>
                      <strong>Success looks like:</strong>
                      <p style={{ margin: '8px 0 0 0', color: '#666', lineHeight: '1.6' }}>{plan.goals.successLookLike}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Section */}
              <div className="development-plan-grid">
                {plan.skills.map((skill, index) => {
                  // Support both old structure (current_level) and new structure (student_assessment, coach_assessment)
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
                <div style={{ marginTop: '32px', padding: '20px', backgroundColor: '#E3F2FD', borderRadius: '8px', borderLeft: '4px solid var(--color-secondary)' }}>
                  <h3 style={{ margin: '0 0 12px 0', color: 'var(--color-dark)', fontSize: '18px' }}>Coach's Notes</h3>
                  <p style={{ margin: 0, color: '#666', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                    {student.development_plan_notes}
                  </p>
                </div>
              )}
            </div>
          )
        } catch (error) {
          console.error('Error parsing development plan:', error)
          return null
        }
      })() : (
        <div className="section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
              My Development Plan
            </h2>
          </div>
          <div style={{ textAlign: 'center', padding: '48px 24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <Target size={48} style={{ opacity: 0.5, marginBottom: '16px', color: 'var(--color-primary)' }} />
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
              No development plan yet. Create one to track your progress!
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => setEditingPlan(true)}
            >
              <Target size={18} />
              Create Development Plan
            </button>
          </div>
        </div>
      )}

      {/* Past Lessons */}
      <div className="section">
        <h2 className="section-title">Past Lessons</h2>
        {pastLessons.length === 0 ? (
          <div className="empty-state">No past lessons yet.</div>
        ) : (
          pastLessons.map(lesson => (
            <div key={lesson.id} className="lesson-card">
              <div className="lesson-header">
                <div>
                  <div className="lesson-date">
                    {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="lesson-time">
                    {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <span className="status-dot status-completed"></span>
              </div>
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
              {!lesson.student_learnings && lesson.status === 'completed' && (
                <button
                  onClick={() => setSelectedLesson(lesson)}
                  className="btn btn-primary"
                  style={{ marginTop: '16px' }}
                >
                  Submit 3 Learnings
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Submit Learnings Modal */}
      {selectedLesson && (
        <div className="modal-overlay" onClick={handleCloseLearningsModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Reflection Time 🎾</h2>
              <button className="modal-close" onClick={handleCloseLearningsModal}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.6' }}>
                Take 2 minutes right now to capture what you learned today. What are 3 key takeaways from today's lesson? 
                (These can be technical fixes, mental game insights, strategy adjustments, or anything that clicked for you)
              </p>
              <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                <strong>Lesson Date:</strong> {new Date(selectedLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              
              <div>
                <label className="label">Your 3 Learnings:</label>
                <textarea
                  className="input"
                  value={studentLearnings}
                  onChange={(e) => setStudentLearnings(e.target.value)}
                  placeholder="Write your 3 key takeaways here..."
                  style={{ minHeight: '200px' }}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCloseLearningsModal}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSubmitLearnings}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

