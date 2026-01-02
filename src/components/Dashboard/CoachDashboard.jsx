import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Clock, Plus, Minus, Mail, Phone, Award, Target, MoreVertical } from 'lucide-react'
import './CoachDashboard.css'
import '../shared/Modal.css'
import CalendarSync from '../Calendar/CalendarSync'

// Helper to get initials from name
const getInitials = (name) => {
  if (!name) return '?'
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Lesson Actions Component - Using dropdown instead of menu to avoid overlap
const LessonActions = ({ lesson, onUpdateStatus, onOpenPlanModal }) => {
  return (
    <div className="lesson-actions" onClick={(e) => e.stopPropagation()}>
      <select 
        value={lesson.status}
        onChange={(e) => onUpdateStatus(lesson.id, e.target.value)}
        className="status-dropdown"
        onClick={(e) => e.stopPropagation()}
      >
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      
      {!lesson.lesson_plan && (
        <button 
          className="btn btn-sm btn-primary"
          onClick={(e) => {
            e.stopPropagation()
            onOpenPlanModal(lesson)
          }}
        >
          Create Plan
        </button>
      )}
      
      {lesson.lesson_plan && (
        <span className="badge badge-success">Plan Ready</span>
      )}
    </div>
  )
}

// Helper to get avatar color based on name
const getAvatarColor = (name) => {
  const colors = [
    'linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%)',
    'linear-gradient(135deg, #2D7F6F 0%, #3D9F8F 100%)',
    'linear-gradient(135deg, #7B68EE 0%, #9370DB 100%)',
    'linear-gradient(135deg, #FF6B6B 0%, #EE5A6F 100%)',
    'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
  ]
  if (!name) return colors[0]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function CoachDashboard() {
  const [students, setStudents] = useState([])
  const [lessons, setLessons] = useState([])
  const [showCreateLesson, setShowCreateLesson] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [lessonTime, setLessonTime] = useState('')
  const [location, setLocation] = useState('Colina Del Sol Park')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [lessonPlan, setLessonPlan] = useState('')
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [selectedFeedbackLesson, setSelectedFeedbackLesson] = useState(null)
  const [coachFeedback, setCoachFeedback] = useState('')
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [refinementFeedback, setRefinementFeedback] = useState('')
  const [refiningPlan, setRefiningPlan] = useState(false)
  const [selectedLessonDetail, setSelectedLessonDetail] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    updatePastLessonStatus()
    fetchCoachData()
  }, [])

  const updatePastLessonStatus = async () => {
    try {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      
      await supabase
        .from('lessons')
        .update({ status: 'completed' })
        .eq('status', 'scheduled')
        .lt('lesson_date', twoHoursAgo.toISOString())
    } catch (error) {
      console.error('Error updating past lesson status:', error)
    }
  }

  const handleSyncComplete = () => {
    // Refresh lessons after sync
    fetchCoachData()
  }

  const fetchCoachData = async () => {
    try {
      // First, try to get students without join to see if RLS is working
      const { data: studentsOnly, error: studentsOnlyError } = await supabase
        .from('students')
        .select('*')
      
      console.log('Students (no join):', studentsOnly?.length || 0, studentsOnlyError)

      // Get all students with profiles join (left join - includes students without profiles)
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          profiles (full_name, email, ntrp_level, phone)
        `)

      if (studentsError) {
        console.error('Error fetching students with profiles:', studentsError)
        // If join fails, try without join and fetch profiles separately
        console.log('Attempting fallback: fetch students and profiles separately')
        
        const { data: fallbackStudents, error: fallbackError } = await supabase
          .from('students')
          .select('*')
        
        if (fallbackError) {
          setError(`Error loading students: ${fallbackError.message}`)
          throw fallbackError
        }

        // Fetch profiles for each student
        const studentsWithProfiles = await Promise.all(
          (fallbackStudents || []).map(async (student) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email, ntrp_level, phone')
              .eq('id', student.id)
              .single()
            
            return {
              ...student,
              profiles: profileData || null
            }
          })
        )

        setStudents(studentsWithProfiles)
        console.log('Students loaded (fallback):', studentsWithProfiles.length)
      } else {
        setStudents(studentsData || [])
        console.log('Students loaded (with join):', studentsData?.length || 0)
        console.log('Sample student:', studentsData?.[0])
      }

      // Get all lessons with student and profile info
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
          *,
          students (
            profiles (full_name, ntrp_level)
          )
        `)
        .order('lesson_date', { ascending: true })

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError)
        throw lessonsError
      }
      setLessons(lessonsData || [])

      setLoading(false)
      setError(null)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleCreateLesson = async (e) => {
    e.preventDefault()
    
    const lessonDateTime = new Date(`${lessonDate}T${lessonTime}`)

    const { error } = await supabase
      .from('lessons')
      .insert([
        {
          student_id: selectedStudent,
          lesson_date: lessonDateTime.toISOString(),
          location: location,
          status: 'scheduled'
        }
      ])

    if (error) {
      alert('Error creating lesson: ' + error.message)
    } else {
      alert('Lesson created!')
      setShowCreateLesson(false)
      setSelectedStudent('')
      setLessonDate('')
      setLessonTime('')
      fetchCoachData()
    }
  }

  const handleUpdateCredits = async (studentId, currentCredits, change) => {
    const newCredits = currentCredits + change
    
    const { error } = await supabase
      .from('students')
      .update({ lesson_credits: newCredits })
      .eq('id', studentId)

    if (error) {
      alert('Error updating credits: ' + error.message)
    } else {
      fetchCoachData()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  // Function to strip markdown formatting
  const stripMarkdown = (text) => {
    if (!text) return ''
    return text
      // Remove markdown headers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic (**text** or *text*)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove checkboxes [ ] or [x]
      .replace(/\[[\sx]\]\s*/g, '')
      // Remove code blocks ```
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code `code`
      .replace(/`([^`]+)`/g, '$1')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }

  const handleLessonPlanClick = (lesson) => {
    setSelectedLesson(lesson)
    const plan = lesson.lesson_plan || ''
    // Strip markdown when loading
    setLessonPlan(stripMarkdown(plan))
    setIsEditingPlan(false)
    setRefinementFeedback('')
  }

  const handleCloseLessonPlan = () => {
    setSelectedLesson(null)
    setLessonPlan('')
    setIsEditingPlan(false)
    setRefinementFeedback('')
  }

  const handleGenerateLessonPlan = async () => {
    if (!selectedLesson) return

    setGeneratingPlan(true)
    try {
      const studentId = selectedLesson.student_id
      
      // Get student profile (goals might not exist in schema, handle gracefully)
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          profiles (full_name, ntrp_level)
        `)
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      const studentName = studentData.profiles?.full_name || 'Student'
      const ntrpLevel = studentData.profiles?.ntrp_level || 'N/A'
      // Handle goals field - may not exist in schema
      const goals = studentData.goals || studentData.student_goals || 'No specific goals listed'

      // Get past 3 completed lessons
      const { data: pastLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('lesson_date, coach_feedback, student_learnings')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('lesson_date', { ascending: false })
        .limit(3)

      if (lessonsError) throw lessonsError

      // Format past lessons
      const last3Lessons = (pastLessons || []).map(lesson => {
        const date = new Date(lesson.lesson_date).toLocaleDateString()
        const feedback = lesson.coach_feedback || 'No feedback'
        const learnings = lesson.student_learnings || 'No learnings noted'
        return `Date: ${date}\nCoach Feedback: ${feedback}\nStudent Learnings: ${learnings}`
      }).join('\n\n---\n\n') || 'No past lessons'

      // Build prompt
      const prompt = `You are an expert tennis coach. Generate a detailed 60-minute lesson plan.

STUDENT INFO:
Name: ${studentName}
Level: ${ntrpLevel}
Goals: ${goals}
Recent lessons: ${last3Lessons}

LESSON PLAN FORMAT:

Warm-up (5-10 min): [Specific activities]
Technical Work (20 min): [Main drill with progressions]
Live Ball Practice (20 min): [Match-situation drill]
Tactical/Strategy (10 min): [Point play or pattern work]
Cool Down (5 min): [Final activity]

For each section include specific drills, key coaching points, and progressions.
Keep it concise and actionable.`

      // Call Netlify function to generate lesson plan
      const response = await fetch('/.netlify/functions/generate-lesson-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentName,
          ntrpLevel,
          goals,
          pastLessons: last3Lessons
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate lesson plan')
      }

      const data = await response.json()
      // Strip markdown from generated plan
      setLessonPlan(stripMarkdown(data.lessonPlan))
      setIsEditingPlan(false) // Show in display mode first
    } catch (error) {
      console.error('Error generating lesson plan:', error)
      alert('Error generating lesson plan: ' + error.message)
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleSaveLessonPlan = async () => {
    if (!selectedLesson) return

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ lesson_plan: lessonPlan })
        .eq('id', selectedLesson.id)

      if (error) throw error

      alert('Lesson plan saved!')
      setIsEditingPlan(false)
      fetchCoachData() // Refresh to show updated lesson plan
    } catch (error) {
      console.error('Error saving lesson plan:', error)
      alert('Error saving lesson plan: ' + error.message)
    }
  }

  const handleRefinePlan = async () => {
    if (!selectedLesson || !refinementFeedback.trim()) {
      alert('Please provide refinement feedback')
      return
    }

    setRefiningPlan(true)
    try {
      // Call Netlify function to refine lesson plan
      const response = await fetch('/.netlify/functions/refine-lesson-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPlan: lessonPlan,
          feedback: refinementFeedback
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to refine lesson plan' }))
        throw new Error(errorData.error || 'Failed to refine lesson plan')
      }

      const data = await response.json()
      // Strip markdown from refined plan
      setLessonPlan(stripMarkdown(data.lessonPlan))
      setRefinementFeedback('')
      setIsEditingPlan(false) // Show in display mode
    } catch (error) {
      console.error('Error refining lesson plan:', error)
      alert('Error refining lesson plan: ' + error.message)
    } finally {
      setRefiningPlan(false)
    }
  }

  const handleFeedbackLessonClick = (lesson) => {
    setSelectedFeedbackLesson(lesson)
    setCoachFeedback(lesson.coach_feedback || '')
  }

  const handleCloseFeedbackModal = () => {
    setSelectedFeedbackLesson(null)
    setCoachFeedback('')
  }

  const handleSaveFeedback = async () => {
    if (!selectedFeedbackLesson || !coachFeedback.trim()) {
      alert('Please enter feedback')
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ coach_feedback: coachFeedback })
        .eq('id', selectedFeedbackLesson.id)

      if (error) throw error

      // Create notification for student
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedFeedbackLesson.student_id,
          type: 'feedback_posted',
          title: 'Coach Feedback Posted',
          body: `Your coach has posted feedback for your lesson on ${new Date(selectedFeedbackLesson.lesson_date).toLocaleDateString()}`,
          link: `/dashboard`,
          read: false
        })

      alert('Feedback saved!')
      handleCloseFeedbackModal()
      fetchCoachData() // Refresh to remove from pending list
    } catch (error) {
      console.error('Error saving feedback:', error)
      alert('Error saving feedback: ' + error.message)
    }
  }

  const handleUpdateLessonStatus = async (lessonId, newStatus) => {
    try {
      const { error } = await supabase
        .from('lessons')
        .update({ status: newStatus })
        .eq('id', lessonId)

      if (error) throw error

      fetchCoachData() // Refresh data
      if (selectedLessonDetail?.id === lessonId) {
        setSelectedLessonDetail({ ...selectedLessonDetail, status: newStatus })
      }
    } catch (error) {
      console.error('Error updating lesson status:', error)
      alert('Error updating lesson status: ' + error.message)
    }
  }

  const handleLessonClick = (lesson) => {
    setSelectedLessonDetail(lesson)
  }

  const handleCloseLessonDetail = () => {
    setSelectedLessonDetail(null)
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading...</div>
  }

  const upcomingLessons = lessons.filter(l => l.status === 'scheduled' && new Date(l.lesson_date) > new Date())
  const completedLessons = lessons.filter(l => l.status === 'completed').slice(0, 10).reverse()
  const pendingFeedback = lessons.filter(l => l.student_learnings && !l.coach_feedback)

  return (
    <div className="page-container">
      <div className="coach-dashboard">
      <CalendarSync onSyncComplete={handleSyncComplete} />
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">Coach Dashboard</h1>
        <p className="dashboard-subtitle">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ padding: '15px', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '8px', marginBottom: '20px', color: '#c00' }}>
          {error}
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'flex-end' }}>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateLesson(!showCreateLesson)}
          style={{ fontSize: '18px', padding: '14px 28px' }}
        >
          <Plus size={20} />
          {showCreateLesson ? 'Cancel' : 'Create Lesson'}
        </button>
      </div>

      {/* Create Lesson Form */}
      {showCreateLesson && (
        <div className="create-lesson-form">
          <h2>Create New Lesson</h2>
          <form onSubmit={handleCreateLesson}>
            <div className="form-grid">
              <div>
                <label className="label">Student</label>
                <select 
                  className="input"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  required
                >
                  <option value="">Select a student</option>
                  {students.map(student => {
                    const profile = student.profiles
                    const name = profile?.full_name || 'No Name'
                    const level = profile?.ntrp_level || 'N/A'
                    return (
                      <option key={student.id} value={student.id}>
                        {name} ({level})
                      </option>
                    )
                  })}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input 
                  type="date"
                  className="input"
                  value={lessonDate}
                  onChange={(e) => setLessonDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Time</label>
                <input 
                  type="time"
                  className="input"
                  value={lessonTime}
                  onChange={(e) => setLessonTime(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Location</label>
                <input 
                  type="text"
                  className="input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              Create Lesson
            </button>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card card-gradient-purple">
          <div className="stat-card-content">
            <div className="stat-icon">👥</div>
            <div className="stat-label">Total Students</div>
            <div className="stat-value">{students.length}</div>
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
            <div className="stat-icon">⏳</div>
            <div className="stat-label">Pending Feedback</div>
            <div className="stat-value">{pendingFeedback.length}</div>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="section">
        <h2 className="section-title">Your Students ({students.length})</h2>
        {students.length === 0 ? (
          <div className="empty-state">No students found. Check console for details.</div>
        ) : (
          <div className="grid grid-2">
            {students.map((student, index) => {
              const profile = student.profiles
              const name = profile?.full_name || 'No Name'
              const initials = getInitials(name)
              const avatarBg = getAvatarColor(name)
              return (
                <div key={student.id} className={`student-card stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="student-header">
                    <div className="student-main">
                      <div className="student-avatar" style={{ background: avatarBg }}>
                        {initials}
                      </div>
                      <div className="student-info">
                        <h3>{name}</h3>
                        <div className="student-details">
                          <div className="student-detail-item">
                            <Award size={16} />
                            <span className="ntrp-badge">{profile?.ntrp_level || 'N/A'}</span>
                          </div>
                          <div className="student-detail-item">
                            <span className="credits-display">💰 {student.lesson_credits || 0} Credits</span>
                          </div>
                        </div>
                        <div className="student-details" style={{ marginTop: '8px' }}>
                          {profile?.email && (
                            <div className="student-detail-item">
                              <Mail size={14} />
                              <span>{profile.email}</span>
                            </div>
                          )}
                          {profile?.phone && (
                            <div className="student-detail-item">
                              <Phone size={14} />
                              <span>{profile.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="student-actions">
                      <button 
                        className="btn btn-sm btn-pill"
                        onClick={() => navigate(`/coach/students/${student.id}`)}
                        style={{ background: 'linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%)', color: 'white', marginRight: '8px' }}
                      >
                        <Target size={16} />
                        View Profile
                      </button>
                      <button 
                        className="btn btn-sm btn-pill"
                        onClick={() => handleUpdateCredits(student.id, student.lesson_credits || 0, 1)}
                        style={{ background: 'linear-gradient(135deg, #2D7F6F 0%, #3D9F8F 100%)', color: 'white' }}
                      >
                        <Plus size={16} />
                        +1
                      </button>
                      <button 
                        className="btn btn-sm btn-pill"
                        onClick={() => handleUpdateCredits(student.id, student.lesson_credits || 0, -1)}
                        disabled={(student.lesson_credits || 0) === 0}
                        style={{ background: 'linear-gradient(135deg, #F44336 0%, #E91E63 100%)', color: 'white' }}
                      >
                        <Minus size={16} />
                        -1
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pending Feedback Section */}
      {pendingFeedback.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2>Pending Feedback ({pendingFeedback.length})</h2>
          {pendingFeedback.map(lesson => (
            <div 
              key={lesson.id}
              onClick={() => handleFeedbackLessonClick(lesson)}
              style={{ 
                padding: '15px', 
                border: '2px solid #ffc107', 
                borderRadius: '8px', 
                marginBottom: '10px',
                cursor: 'pointer',
                backgroundColor: '#fff3cd'
              }}
            >
              <h3>{lesson.students?.profiles?.full_name || 'Unknown Student'}</h3>
              <p>{new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p style={{ color: '#856404', fontSize: '14px', marginTop: '10px' }}>
                ⚠️ Student submitted learnings - Click to provide feedback
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming Lessons */}
      <div className="section">
        <h2 className="section-title">Upcoming Lessons</h2>
        {upcomingLessons.length === 0 ? (
          <div className="empty-state">No upcoming lessons.</div>
        ) : (
          upcomingLessons.map((lesson, index) => (
            <div 
              key={lesson.id} 
              className={`lesson-card stagger-item ${lesson.lesson_plan ? 'has-plan' : ''}`}
              onClick={() => handleLessonPlanClick(lesson)}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="lesson-header">
                <div>
                  <h3 style={{ margin: '0 0 8px 0' }}>{lesson.students?.profiles?.full_name || 'Unknown Student'}</h3>
                  <div className="lesson-date">
                    {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="lesson-time">
                    <Clock size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="lesson-location">
                    <Calendar size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                    {lesson.location}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <span className={`status-dot status-${lesson.status}`} style={{ textTransform: 'capitalize' }}>
                      {lesson.status}
                    </span>
                    {lesson.lesson_plan ? (
                      <span className="status-dot status-completed">✓ Plan Ready</span>
                    ) : (
                      <span className="status-dot status-needed">⚠️ Plan Needed</span>
                    )}
                  </div>
                  <LessonActions 
                    lesson={lesson} 
                    onUpdateStatus={handleUpdateLessonStatus}
                    onOpenPlanModal={(lesson) => {
                      setSelectedLesson(lesson)
                      setLessonPlan('')
                      setIsEditingPlan(false)
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Completed Lessons */}
      {completedLessons.length > 0 && (
        <div className="section">
          <h2 className="section-title">Recent Completed Lessons</h2>
          <div className="lessons-list">
            {completedLessons.map(lesson => (
              <div 
                key={lesson.id} 
                className="lesson-card"
                onClick={() => handleLessonClick(lesson)}
              >
                <div className="lesson-header">
                  <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>{lesson.students?.profiles?.full_name || 'Unknown Student'}</h3>
                    <div className="lesson-date">
                      {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="lesson-time">
                      <Clock size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                      {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="lesson-location">
                      <Calendar size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                      {lesson.location}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <span className="status-dot status-completed">Completed</span>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#666' }}>
                      {lesson.student_learnings ? (
                        <span style={{ color: 'var(--color-success)' }}>✓ Learnings</span>
                      ) : (
                        <span style={{ color: '#999' }}>No learnings</span>
                      )}
                      {lesson.coach_feedback ? (
                        <span style={{ color: 'var(--color-success)' }}>✓ Feedback</span>
                      ) : (
                        <span 
                          style={{ color: 'var(--color-warning)', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFeedbackLesson(lesson)
                            setCoachFeedback('')
                          }}
                        >
                          ⚠️ Add feedback
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lesson Plan Modal */}
      {selectedLesson && (
        <div className="modal-overlay" onClick={handleCloseLessonPlan}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Plan - {selectedLesson.students?.profiles?.full_name || 'Student'}</h2>
              <button className="modal-close" onClick={handleCloseLessonPlan}>×</button>
            </div>
            
            <div className="modal-body">
              <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>
                {new Date(selectedLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {new Date(selectedLesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              
              {/* Lesson Plan Display/Edit */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label className="label" style={{ margin: 0 }}>Lesson Plan</label>
                  {!isEditingPlan && lessonPlan && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => setIsEditingPlan(true)}
                    >
                      ✏️ Edit Plan
                    </button>
                  )}
                </div>
                
                {isEditingPlan ? (
                  <textarea
                    className="input"
                    value={lessonPlan}
                    onChange={(e) => setLessonPlan(e.target.value)}
                    placeholder="Enter lesson plan manually or generate with AI..."
                    style={{
                      minHeight: '300px',
                      fontFamily: 'var(--font-family)',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap'
                    }}
                  />
                ) : (
                  <div 
                    className="lesson-plan-display"
                    style={{
                      minHeight: '300px',
                      padding: '16px',
                      backgroundColor: '#f9f9f9',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.8',
                      fontSize: '15px',
                      color: '#333'
                    }}
                  >
                    {lessonPlan || (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>
                        No lesson plan yet. Generate one with AI or edit to create manually.
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isEditingPlan && (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleSaveLessonPlan}
                  >
                    💾 Save Changes
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setIsEditingPlan(false)
                      // Reload original plan if user cancels
                      setLessonPlan(stripMarkdown(selectedLesson.lesson_plan || ''))
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Generate with AI Button */}
              {!isEditingPlan && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateLessonPlan}
                    disabled={generatingPlan}
                  >
                    {generatingPlan ? '⏳ Generating...' : '🤖 Generate with AI'}
                  </button>
                </div>
              )}

              {/* Refine with AI Section */}
              {lessonPlan && !isEditingPlan && (
                <div style={{ 
                  marginTop: '32px', 
                  padding: '20px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--color-primary)' }}>
                    ✨ Refine with AI
                  </h3>
                  <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#666' }}>
                    Provide feedback to improve the lesson plan. For example: "Make it more advanced", "Add more volley drills", "Focus on mental game"
                  </p>
                  <div style={{ marginBottom: '12px' }}>
                    <input
                      className="input"
                      type="text"
                      value={refinementFeedback}
                      onChange={(e) => setRefinementFeedback(e.target.value)}
                      placeholder="e.g., Make it more advanced, Add more volley drills, Focus on mental game"
                      style={{ marginBottom: '12px' }}
                    />
                    <button
                      className="btn btn-secondary"
                      onClick={handleRefinePlan}
                      disabled={refiningPlan || !refinementFeedback.trim()}
                    >
                      {refiningPlan ? '⏳ Refining...' : '🔄 Regenerate'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCloseLessonPlan}>
                Close
              </button>
              {!isEditingPlan && lessonPlan && (
                <button className="btn btn-primary" onClick={handleSaveLessonPlan}>
                  💾 Save Lesson Plan
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLessonDetail && (
        <div className="modal-overlay" onClick={handleCloseLessonDetail}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h2 className="modal-title">
                Lesson Details - {selectedLessonDetail.students?.profiles?.full_name || 'Unknown Student'}
              </h2>
              <button className="modal-close" onClick={handleCloseLessonDetail}>×</button>
            </div>
            
            <div className="modal-body">
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <strong>Date:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`status-dot status-${selectedLessonDetail.status}`} style={{ textTransform: 'capitalize' }}>
                      {selectedLessonDetail.status}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {selectedLessonDetail.status !== 'completed' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateLessonStatus(selectedLessonDetail.id, 'completed')}
                        >
                          Mark Complete
                        </button>
                      )}
                      {selectedLessonDetail.status !== 'cancelled' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateLessonStatus(selectedLessonDetail.id, 'cancelled')}
                          style={{ color: 'var(--color-error)' }}
                        >
                          Cancel
                        </button>
                      )}
                      {selectedLessonDetail.status === 'cancelled' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => handleUpdateLessonStatus(selectedLessonDetail.id, 'scheduled')}
                        >
                          Reschedule
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: '8px' }}>
                  <strong>Time:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div>
                  <strong>Location:</strong> {selectedLessonDetail.location || '-'}
                </div>
              </div>

              {selectedLessonDetail.lesson_plan && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Lesson Plan</h3>
                  <div style={{ padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedLessonDetail.lesson_plan}
                  </div>
                </div>
              )}

              {selectedLessonDetail.student_learnings && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Student Learnings</h3>
                  <div style={{ padding: '16px', backgroundColor: '#E3F2FD', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedLessonDetail.student_learnings}
                  </div>
                </div>
              )}

              {selectedLessonDetail.coach_feedback && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>Coach Feedback</h3>
                  <div style={{ padding: '16px', backgroundColor: '#E8F5E9', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                    {selectedLessonDetail.coach_feedback}
                  </div>
                </div>
              )}

              {selectedLessonDetail.student_learnings && !selectedLessonDetail.coach_feedback && (
                <div style={{ marginBottom: '24px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setSelectedFeedbackLesson(selectedLessonDetail)
                      setCoachFeedback('')
                      handleCloseLessonDetail()
                    }}
                  >
                    Add Feedback
                  </button>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => {
                handleCloseLessonDetail()
                navigate(`/coach/students/${selectedLessonDetail.student_id}`)
              }}>
                View Student Profile
              </button>
              <button className="btn btn-outline" onClick={handleCloseLessonDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach Feedback Modal */}
      {selectedFeedbackLesson && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={handleCloseFeedbackModal}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Provide Feedback</h2>
            <p style={{ color: '#666', marginBottom: '10px' }}>
              <strong>Student:</strong> {selectedFeedbackLesson.students?.profiles?.full_name || 'Unknown Student'}
            </p>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              <strong>Lesson Date:</strong> {new Date(selectedFeedbackLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
              <strong>Student's Learnings:</strong>
              <p style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>{selectedFeedbackLesson.student_learnings}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
                Your Feedback:
              </label>
              <textarea
                value={coachFeedback}
                onChange={(e) => setCoachFeedback(e.target.value)}
                placeholder="Provide feedback on the student's learnings..."
                style={{
                  width: '100%',
                  minHeight: '250px',
                  padding: '10px',
                  fontSize: '14px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseFeedbackModal}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFeedback}
                style={{
                  padding: '10px 20px',
                  fontSize: '16px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}



