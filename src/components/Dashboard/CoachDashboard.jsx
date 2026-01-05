import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Clock, Plus, Minus, Mail, Phone, Award, Target, MoreVertical, Upload } from 'lucide-react'
import Anthropic from '@anthropic-ai/sdk'
import './CoachDashboard.css'
import '../shared/Modal.css'
import CalendarSync from '../Calendar/CalendarSync'
import LessonTemplates from '../Templates/LessonTemplates'
import { importHistoricalData, checkImportStatus } from '../../utils/importHistoricalData'

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

// Helper to format dates consistently
const formatLessonDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  })
}

const formatLessonTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString('en-US', { 
    hour: '2-digit', minute: '2-digit' 
  })
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
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(null)
  const [importStatus, setImportStatus] = useState({ imported: false, count: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    updatePastLessonStatus()
    fetchCoachData()
    checkExistingImport()
  }, [])

  const checkExistingImport = async () => {
    const status = await checkImportStatus()
    setImportStatus(status)
  }

  const handleImportHistoricalData = async () => {
    const confirmed = window.confirm(
      '⚠️ This will import 224 historical students into the database.\n\n' +
      'This should only be done ONCE.\n\n' +
      'Are you sure you want to continue?'
    )
    
    if (!confirmed) return
    
    setImporting(true)
    setImportProgress({ current: 0, total: 224, studentName: 'Starting...' })
    
    try {
      const result = await importHistoricalData((progress) => {
        setImportProgress(progress)
      })
      
      setImporting(false)
      setImportProgress(null)
      
      if (result.success) {
        alert(
          `✅ Import Complete!\n\n` +
          `Successfully imported: ${result.successCount} students\n` +
          `Skipped (already exist): ${result.skippedCount}\n\n` +
          `The page will now refresh.`
        )
        window.location.reload()
      } else {
        alert(
          `⚠️ Import completed with some errors\n\n` +
          `Success: ${result.successCount}\n` +
          `Skipped: ${result.skippedCount}\n` +
          `Errors: ${result.errorCount}\n\n` +
          `Check browser console for details.`
        )
        // Still refresh to show imported data
        window.location.reload()
      }
    } catch (error) {
      console.error('Import error:', error)
      setImporting(false)
      setImportProgress(null)
      alert(`❌ Import failed: ${error.message}`)
    }
  }

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
      // Fetch students - try with is_active filter, fallback if column doesn't exist
      let studentsData = []
      
      // First try with is_active filter
      let { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('is_active', true)
      
      if (error) {
        // Fallback: fetch all students if is_active column doesn't exist
        console.log('Fallback: fetching all students')
        const fallback = await supabase
          .from('students')
          .select('*')
        data = fallback.data
        error = fallback.error
      }
      
      if (error) {
        console.error('Error fetching students:', error)
        setError(`Error loading students: ${error.message}`)
      }
      
      studentsData = data || []

      // Fetch profiles for students
      let studentsWithProfiles = []
      if (studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, ntrp_level, phone')
          .in('id', studentIds)

        // Merge students with their profiles
        studentsWithProfiles = studentsData.map(student => {
          const profile = (profilesData || []).find(p => p.id === student.id)
          return { ...student, profiles: profile || null }
        })
      }

      setStudents(studentsWithProfiles)
      console.log('Students loaded:', studentsWithProfiles.length)

      // Get lessons only for active students
      const activeStudentIds = studentsWithProfiles.map(s => s.id)
      let lessonsData = []
      
      if (activeStudentIds.length > 0) {
        const { data, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .in('student_id', activeStudentIds)
          .order('lesson_date', { ascending: true })

        if (lessonsError) {
          console.error('Error fetching lessons:', lessonsError)
          throw lessonsError
        }
        lessonsData = data || []
      }

      // Enrich lessons with student/profile info
      const enrichedLessons = (lessonsData || []).map(lesson => {
        const student = studentsWithProfiles.find(s => s.id === lesson.student_id)
        return {
          ...lesson,
          students: student ? { profiles: student.profiles } : null
        }
      })

      setLessons(enrichedLessons)

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

      // Build prompt for Claude
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
Keep it concise and actionable. Do NOT use markdown formatting - just plain text with line breaks.`

      // Direct Anthropic API call
      const anthropic = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true // For local development - move to backend for production
      })

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const generatedPlan = message.content[0].text
      
      // Strip markdown from generated plan
      setLessonPlan(stripMarkdown(generatedPlan))
      setIsEditingPlan(false) // Show in display mode first
    } catch (error) {
      console.error('Error generating lesson plan:', error)
      alert('Error generating lesson plan: ' + error.message + '\n\nMake sure VITE_ANTHROPIC_API_KEY is set in your .env file.')
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
      // Direct Anthropic API call for refining lesson plan
      const anthropic = new Anthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
        dangerouslyAllowBrowser: true
      })

      const prompt = `You are an expert tennis coach. Refine this lesson plan based on the feedback provided.

CURRENT LESSON PLAN:
${lessonPlan}

COACH'S FEEDBACK/REQUESTED CHANGES:
${refinementFeedback}

Please provide an updated lesson plan that incorporates the feedback. Keep the same format but adjust content as requested.
Do NOT use markdown formatting - just plain text with line breaks.`

      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      })

      const refinedPlan = message.content[0].text

      // Strip markdown from refined plan
      setLessonPlan(stripMarkdown(refinedPlan))
      setRefinementFeedback('')
      setIsEditingPlan(false) // Show in display mode
    } catch (error) {
      console.error('Error refining lesson plan:', error)
      alert('Error refining lesson plan: ' + error.message + '\n\nMake sure VITE_ANTHROPIC_API_KEY is set in your .env file.')
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
      // Update lesson status
      const { error } = await supabase
        .from('lessons')
        .update({ status: newStatus })
        .eq('id', lessonId)

      if (error) throw error

      // If completing a lesson, deduct credit from student
      if (newStatus === 'completed') {
        // Get lesson details to find student
        const { data: lesson } = await supabase
          .from('lessons')
          .select('student_id, students(lesson_credits)')
          .eq('id', lessonId)
          .single()

        if (lesson && lesson.student_id && lesson.students) {
          const currentCredits = lesson.students.lesson_credits || 0
          const newCredits = Math.max(0, currentCredits - 1)

          // Deduct 1 credit
          const { error: creditError } = await supabase
            .from('students')
            .update({ lesson_credits: newCredits })
            .eq('id', lesson.student_id)

          if (!creditError) {
            console.log(`Credit deducted for student. New balance: ${newCredits}`)
          }
        }
      }

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
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        {/* Import Historical Data Button - Show if import not complete */}
        {!importStatus.complete ? (
          <div className="import-section">
            <button 
              onClick={handleImportHistoricalData} 
              disabled={importing}
              className="btn-import"
              style={{
                padding: '12px 24px',
                background: importing ? '#ccc' : '#4B2C6C',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: importing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(75, 44, 108, 0.3)'
              }}
            >
              <Upload size={18} />
              {importing ? '⏳ Importing...' : `📥 Import Remaining (${importStatus.remaining || '?'} left)`}
            </button>
            
            {importStatus.count > 0 && !importing && (
              <div style={{ marginTop: '8px', color: '#666', fontSize: '13px' }}>
                Already imported: {importStatus.count}/{importStatus.total}
              </div>
            )}
            
            {importProgress && (
              <div style={{ 
                marginTop: '12px', 
                padding: '12px 16px',
                background: '#F8F5FC',
                borderRadius: '8px',
                border: '1px solid #E0D4F7'
              }}>
                <div style={{ color: '#4B2C6C', fontWeight: '600', marginBottom: '6px' }}>
                  Importing: {importProgress.studentName}
                </div>
                <div style={{ color: '#666', fontSize: '14px' }}>
                  Progress: {importProgress.current}/{importProgress.total} 
                  {importProgress.skippedCount > 0 && ` (${importProgress.skippedCount} skipped)`}
                </div>
                <div style={{
                  marginTop: '8px',
                  height: '8px',
                  background: '#E0E0E0',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(importProgress.current / importProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #4B2C6C, #2D7F6F)',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
              </div>
            )}
          </div>
        ) : null}

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
          <>
            <div className="grid grid-2">
              {(showAllStudents ? students : students.slice(0, 4)).map((student, index) => {
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
            {students.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAllStudents(!showAllStudents)}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '8px',
                    border: '1px solid #4B2C6C',
                    background: 'white',
                    color: '#4B2C6C',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                  }}
                >
                  {showAllStudents ? (
                    <>
                      <Minus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      Show Less
                    </>
                  ) : (
                    <>
                      <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      Show More ({students.length - 4} more)
                    </>
                  )}
                </button>
              </div>
            )}
          </>
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
        <h2 className="section-title">Upcoming Lessons ({upcomingLessons.length})</h2>
        {upcomingLessons.length === 0 ? (
          <div className="empty-state">No upcoming lessons.</div>
        ) : (
          <>
            {(showAllUpcoming ? upcomingLessons : upcomingLessons.slice(0, 3)).map((lesson, index) => (
              <div 
                key={lesson.id} 
                className="lesson-card upcoming-lesson"
                onClick={() => handleLessonPlanClick(lesson)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="lesson-header">
                  <div className="lesson-info">
                    <h3>{lesson.students?.profiles?.full_name || 'Unknown Student'}</h3>
                    <div className="lesson-details">
                      <div className="detail-row">
                        <Calendar size={16} />
                        {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="detail-row">
                        <Clock size={16} />
                        {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="detail-row">
                        <Target size={16} />
                        {lesson.location}
                      </div>
                    </div>
                  </div>
                  <div className="lesson-actions" onClick={(e) => e.stopPropagation()}>
                    <select 
                      value={lesson.status}
                      onChange={(e) => handleUpdateLessonStatus(lesson.id, e.target.value)}
                      className="status-dropdown"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    {lesson.lesson_plan ? (
                      <span className="badge badge-success">✓ Plan Ready</span>
                    ) : (
                      <button 
                        className="btn-generate-plan"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLesson(lesson)
                          setLessonPlan('')
                          setIsEditingPlan(false)
                        }}
                      >
                        Generate with AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {upcomingLessons.length > 3 && (
              <button 
                className="show-more-btn"
                onClick={() => setShowAllUpcoming(!showAllUpcoming)}
              >
                {showAllUpcoming ? '▲ Show Less' : `▼ Show ${upcomingLessons.length - 3} More`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Recent Completed Lessons */}
      {completedLessons.length > 0 && (
        <div className="section">
          <h2 className="section-title">Recent Completed Lessons ({completedLessons.length})</h2>
          <div className="lessons-list">
            {(showAllCompleted ? completedLessons : completedLessons.slice(0, 3)).map(lesson => (
              <div 
                key={lesson.id} 
                className="lesson-card completed-lesson"
                onClick={() => handleLessonClick(lesson)}
              >
                <div className="lesson-header">
                  <div className="lesson-info">
                    <h3>{lesson.students?.profiles?.full_name || 'Unknown Student'}</h3>
                    <div className="lesson-details">
                      <div className="detail-row">
                        <Calendar size={16} />
                        {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="detail-row">
                        <Clock size={16} />
                        {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="detail-row">
                        <Target size={16} />
                        {lesson.location}
                      </div>
                    </div>
                  </div>
                  <div className="lesson-actions completed-actions">
                    <span className="badge badge-completed">Completed</span>
                    <div className="learnings-feedback-row">
                      {lesson.student_learnings ? (
                        <span className="feedback-given">✓ Learnings</span>
                      ) : (
                        <span className="no-learnings">No learnings</span>
                      )}
                      {lesson.coach_feedback ? (
                        <span className="feedback-given">✓ Feedback</span>
                      ) : (
                        <button 
                          className="btn-add-feedback"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFeedbackLesson(lesson)
                            setCoachFeedback('')
                          }}
                        >
                          Add feedback
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {completedLessons.length > 3 && (
              <button 
                className="show-more-btn"
                onClick={() => setShowAllCompleted(!showAllCompleted)}
              >
                {showAllCompleted ? '▲ Show Less' : `▼ Show ${completedLessons.length - 3} More`}
              </button>
            )}
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

              {/* Generate with AI / Use Template Buttons */}
              {!isEditingPlan && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button
                    className="btn btn-template"
                    onClick={() => setShowTemplates(true)}
                    style={{
                      flex: 1,
                      background: '#2D7F6F',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Use Template
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleGenerateLessonPlan}
                    disabled={generatingPlan}
                    style={{ flex: 1 }}
                  >
                    {generatingPlan ? '⏳ Generating...' : '✨ Generate with AI'}
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

      {/* Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '900px', margin: '20px' }}>
            <LessonTemplates 
              onSelectTemplate={(content) => {
                setLessonPlan(content)
                setIsEditingPlan(true) // Allow coach to edit template before saving
                setShowTemplates(false)
              }}
              onClose={() => setShowTemplates(false)}
            />
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
              {/* Lesson Info */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Date:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong>Time:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <strong>Location:</strong> {selectedLessonDetail.location || '-'}
                </div>
                
                {/* Status & Actions Row */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px',
                  backgroundColor: '#f8f8f8',
                  borderRadius: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>Status:</strong>
                    <span className={`badge badge-${selectedLessonDetail.status === 'completed' ? 'success' : selectedLessonDetail.status === 'cancelled' ? 'warning' : 'info'}`} style={{ textTransform: 'capitalize' }}>
                      {selectedLessonDetail.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {selectedLessonDetail.status !== 'completed' && (
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#28a745', color: 'white', border: 'none' }}
                        onClick={() => {
                          handleUpdateLessonStatus(selectedLessonDetail.id, 'completed')
                          setSelectedLessonDetail({ ...selectedLessonDetail, status: 'completed' })
                        }}
                      >
                        ✓ Complete
                      </button>
                    )}
                    {selectedLessonDetail.status !== 'cancelled' && selectedLessonDetail.status !== 'completed' && (
                      <button
                        className="btn btn-sm"
                        style={{ backgroundColor: '#dc3545', color: 'white', border: 'none' }}
                        onClick={() => {
                          handleUpdateLessonStatus(selectedLessonDetail.id, 'cancelled')
                          setSelectedLessonDetail({ ...selectedLessonDetail, status: 'cancelled' })
                        }}
                      >
                        ✗ Cancel
                      </button>
                    )}
                    {selectedLessonDetail.status === 'cancelled' && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => {
                          handleUpdateLessonStatus(selectedLessonDetail.id, 'scheduled')
                          setSelectedLessonDetail({ ...selectedLessonDetail, status: 'scheduled' })
                        }}
                      >
                        ↺ Reschedule
                      </button>
                    )}
                  </div>
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



