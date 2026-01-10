import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Award, Target, Edit2, TrendingUp } from 'lucide-react'
import './StudentDashboard.css'
import '../shared/Modal.css'
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'
import RecentProgress from '../Progress/RecentProgress'
import TestimonialRequestBanner from '../Testimonials/TestimonialRequestBanner'
import MilestoneTracker from '../DevelopmentPlan/MilestoneTracker'
import BookLessonModal from '../Calendar/BookLessonModal'
import { MILESTONES, GOAL_OPTIONS } from '../DevelopmentPlan/MilestonesConstants'

export default function StudentDashboard() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [selectedLessonForDetails, setSelectedLessonForDetails] = useState(null) // For viewing lesson details
  const [learning1, setLearning1] = useState('')
  const [learning2, setLearning2] = useState('')
  const [learning3, setLearning3] = useState('')
  const [developmentPlan, setDevelopmentPlan] = useState([])
  const [editingPlan, setEditingPlan] = useState(false)
  const [user, setUser] = useState(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [homework, setHomework] = useState([])
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
      
      setUser(user)

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

      // Fetch homework
      await fetchHomework(user.id)

      setLoading(false)
    } catch (error) {
      console.error('Error fetching data:', error)
      setLoading(false)
    }
  }

  // Fetch homework for student
  const fetchHomework = async (studentId) => {
    if (!studentId) return
    
    try {
      const { data, error } = await supabase
        .from('lesson_homework')
        .select('*')
        .eq('student_id', studentId)
        .eq('completed', false)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching homework:', error)
        return
      }
      
      if (data) {
        setHomework(data)
      }
    } catch (error) {
      console.error('Error fetching homework:', error)
    }
  }

  // Toggle homework completion
  const handleToggleHomework = async (homeworkId, currentCompleted) => {
    try {
      const { error } = await supabase
        .from('lesson_homework')
        .update({ 
          completed: !currentCompleted,
          completed_at: !currentCompleted ? new Date().toISOString() : null
        })
        .eq('id', homeworkId)
      
      if (error) {
        console.error('Error updating homework:', error)
        alert('Error updating homework')
      } else {
        // Refresh homework list
        if (user) {
          await fetchHomework(user.id)
        }
      }
    } catch (error) {
      console.error('Error toggling homework:', error)
      alert('Error updating homework')
    }
  }

  const fetchReferralData = async (studentId) => {
    try {
      // Fetch all students to calculate referral rankings
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, total_revenue, referred_by_student_id')

      if (!allStudents) return

      // Fetch profiles for all students
      const studentIds = allStudents.map(s => s.id)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)

      // Merge students with profiles
      const studentsWithProfiles = allStudents.map(student => ({
        ...student,
        profiles: profiles?.find(p => p.id === student.id)
      }))

      // Calculate referral data
      const referrerMap = {}
      studentsWithProfiles.forEach(student => {
        if (student.referred_by_student_id) {
          const referrerId = student.referred_by_student_id
          if (!referrerMap[referrerId]) {
            referrerMap[referrerId] = {
              id: referrerId,
              referralCount: 0,
              referralRevenue: 0
            }
          }
          referrerMap[referrerId].referralCount++
          referrerMap[referrerId].referralRevenue += parseFloat(student.total_revenue || 0)
        }
      })

      // Convert to array, add names, and sort
      const referrers = Object.values(referrerMap)
        .map(referrer => {
          const referrerProfile = studentsWithProfiles.find(s => s.id === referrer.id)
          return {
            ...referrer,
            name: referrerProfile?.profiles?.full_name || 'Unknown'
          }
        })
        .sort((a, b) => b.referralRevenue - a.referralRevenue)

      // Set top 3 referrers with bonus amounts ($100 per referral)
      const top3 = referrers.slice(0, 3).map(referrer => ({
        name: referrer.name,
        bonusAmount: referrer.referralCount * 100 // $100 per referral
      }))
      setTopReferrers(top3)

      // Find current student's rank and stats
      const studentReferralData = referrerMap[studentId]
      if (studentReferralData) {
        const rank = referrers.findIndex(r => r.id === studentId) + 1
        setReferralData({
          rank,
          referralCount: studentReferralData.referralCount,
          referralRevenue: studentReferralData.referralRevenue,
          totalReferrers: referrers.length
        })
      } else {
        setReferralData({
          rank: null,
          referralCount: 0,
          referralRevenue: 0,
          totalReferrers: referrers.length
        })
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSubmitLearnings = async () => {
    if (!selectedLesson || !learning1.trim() || !learning2.trim() || !learning3.trim()) {
      alert('Please enter all 3 learnings')
      return
    }

    // Combine the three learnings into one string
    const combinedLearnings = `1. ${learning1.trim()}\n2. ${learning2.trim()}\n3. ${learning3.trim()}`

    try {
      const { error } = await supabase
        .from('lessons')
        .update({ student_learnings: combinedLearnings })
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
      setLearning1('')
      setLearning2('')
      setLearning3('')
      fetchStudentData() // Refresh to show updated data
    } catch (error) {
      console.error('Error submitting learnings:', error)
      alert('Error submitting learnings: ' + error.message)
    }
  }

  const handleCloseLearningsModal = () => {
    setSelectedLesson(null)
    setLearning1('')
    setLearning2('')
    setLearning3('')
  }

  const now = new Date()
  
  // Determine actual status based on date/time
  const getActualStatus = (lesson) => {
    const lessonDate = new Date(lesson.lesson_date)
    if (lesson.status === 'cancelled') return 'cancelled'
    if (lessonDate < now && lesson.status === 'scheduled') return 'completed' // Auto-complete past scheduled lessons
    return lesson.status || 'scheduled'
  }
  
  // Calculate past lessons before useEffect (needed for dependency array)
  const pastLessons = (lessons || []).filter(l => {
    const status = getActualStatus(l)
    return status === 'completed' || (new Date(l.lesson_date) < now && status !== 'cancelled')
  })
  
  // Update past scheduled lessons to completed in database
  useEffect(() => {
    lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.lesson_date)
      if (lesson.status === 'scheduled' && lessonDate < now) {
        supabase
          .from('lessons')
          .update({ status: 'completed' })
          .eq('id', lesson.id)
          .then(async ({ error }) => {
            if (error) {
              console.error('Error updating lesson status:', error)
            } else {
              // Check if testimonial request should be created
              // The database trigger will create it, but we can also check client-side
              // and send email notification
              if (student && pastLessons.length + 1 >= 5) {
                try {
                  const { checkAndCreateTestimonialRequest } = await import('../../utils/checkAndCreateTestimonialRequest')
                  await checkAndCreateTestimonialRequest(student.id, pastLessons.length + 1)
                } catch (err) {
                  console.error('Error checking testimonial request:', err)
                }
              }
              fetchStudentData() // Refresh to get updated status
            }
          })
      }
    })
  }, [lessons, student, pastLessons.length])

  if (loading) {
    return (
      <div className="student-dashboard">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666' }}>Loading...</p>
      </div>
    )
  }
  
  const upcomingLessons = (lessons || []).filter(l => {
    const status = getActualStatus(l)
    if (status !== 'scheduled') return false
    const lessonDate = new Date(l.lesson_date)
    return lessonDate > now
  })
  
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 className="welcome-message">Welcome, {profile?.full_name}! 🎾</h1>
            {/* Header Stats - Small cards on same row as welcome */}
            <div className="header-stats-row">
              <div className="stat-card-small card-gradient-purple">
                <div className="stat-card-content-small">
                  <div className="stat-icon-small">💰</div>
                  <div className="stat-info-small">
                    <div className="stat-label-small">Lesson Credits</div>
                    <div className="stat-value-small">{student?.lesson_credits || 0}</div>
                  </div>
                </div>
              </div>
              <div className="stat-card-small card-gradient-teal">
                <div className="stat-card-content-small">
                  <div className="stat-icon-small">📅</div>
                  <div className="stat-info-small">
                    <div className="stat-label-small">Upcoming Lessons</div>
                    <div className="stat-value-small">{upcomingLessons.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowBookingModal(true)}
              className="btn btn-primary"
              disabled={!student}
            >
              <Calendar size={18} style={{ marginRight: '8px' }} />
              Book a Lesson
            </button>
          </div>
        </div>
      </div>
      
      {/* Testimonial Request Banner */}
      {student && pastLessons.length >= 10 && (
        <div className="testimonial-banner-container">
          <TestimonialRequestBanner 
            studentId={student.id} 
            lessonCount={pastLessons.length}
          />
        </div>
      )}

      {/* Recent Wins Section */}
      {user && student?.development_plan && (
        <div className="section student-progress-section">
          <RecentProgress 
            studentId={user.id}
            developmentPlan={student.development_plan}
            playerLevel={student?.player_level || 'beginner'}
          />
        </div>
      )}

      {/* Homework Section */}
      {homework.length > 0 && (
        <div className="section">
          <h2 className="section-title">Homework Before Next Lesson 📝</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {homework.map(hw => (
              <div 
                key={hw.id}
                style={{
                  padding: '16px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '2px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'start',
                  gap: '12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={hw.completed || false}
                  onChange={() => handleToggleHomework(hw.id, hw.completed || false)}
                  style={{ 
                    width: '20px', 
                    height: '20px', 
                    marginTop: '2px',
                    cursor: 'pointer'
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontSize: '16px',
                    color: hw.completed ? '#9ca3af' : '#111',
                    textDecoration: hw.completed ? 'line-through' : 'none'
                  }}>
                    {hw.homework_text}
                  </div>
                  {hw.completed && hw.completed_at && (
                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                      ✓ Completed {new Date(hw.completed_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lessons Section */}
      <div className="lessons-section">
        <h2 className="section-title">My Lessons</h2>
        <div className="lessons-grid">
          <div className="lessons-column">
            <h3>Upcoming Lessons ({upcomingLessons.length})</h3>
            {upcomingLessons.length === 0 ? (
              <p className="empty-state">No upcoming lessons scheduled.</p>
            ) : (
              <>
                {(showAllUpcoming ? upcomingLessons : upcomingLessons.slice(0, 3)).map((lesson, index) => (
                  <div 
                    key={lesson.id} 
                    className={`lesson-card stagger-item`} 
                    style={{ animationDelay: `${index * 0.05}s`, cursor: 'pointer' }}
                    onClick={() => setSelectedLessonForDetails(lesson)}
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
                      <span className={`status-dot status-${getActualStatus(lesson)}`}></span>
                    </div>
                    {(lesson.lesson_plan || lesson.student_lesson_plan) && isLessonPlanVisible(lesson.lesson_date) && (
                      <div className="lesson-plan-box">
                        <strong>Lesson Plan:</strong>
                        <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>
                          {lesson.student_lesson_plan || lesson.lesson_plan}
                        </p>
                      </div>
                    )}
                    {(lesson.lesson_plan || lesson.student_lesson_plan) && !isLessonPlanVisible(lesson.lesson_date) && (
                      <p style={{ color: '#999', fontSize: '14px', marginTop: '10px' }}>
                        Lesson plan will be available 24 hours before the lesson
                      </p>
                    )}
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
          
          <div className="lessons-column">
            <h3>Past Lessons ({pastLessons.length})</h3>
            {pastLessons.length === 0 ? (
              <p className="empty-state">No past lessons yet.</p>
            ) : (
              <>
                {(showAllPast ? pastLessons : pastLessons.slice(0, 1)).map(lesson => (
                  <div 
                    key={lesson.id} 
                    className="lesson-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedLessonForDetails(lesson)}
                  >
                    <div className="lesson-header">
                      <div>
                        <div className="lesson-date">
                          {new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <div className="lesson-time">
                          {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <span className={`status-dot status-${getActualStatus(lesson)}`}></span>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLesson(lesson)
                        }}
                        className="btn btn-primary"
                        style={{ marginTop: '16px' }}
                      >
                        Submit 3 Learnings
                      </button>
                    )}
                  </div>
                ))}
                {pastLessons.length > 1 && (
                  <button 
                    className="show-more-btn"
                    onClick={() => setShowAllPast(!showAllPast)}
                  >
                    {showAllPast ? '▲ Show Less' : `▼ Show ${pastLessons.length - 1} More`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
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
                console.log('=== STUDENT DASHBOARD SAVE STARTING ===')
                console.log('Plan data being saved:', planData)
                
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                  console.error('No user found')
                  return
                }

                console.log('User ID:', user.id)

                // Ensure development_plan is properly formatted as JSON string
                const updateData = {
                  development_plan: typeof planData.development_plan === 'string' 
                    ? planData.development_plan 
                    : JSON.stringify(planData.development_plan),
                  development_plan_notes: planData.development_plan_notes || undefined
                }

                console.log('Formatted update data:', updateData)

                const { data, error } = await supabase
                  .from('students')
                  .update(updateData)
                  .eq('id', user.id)
                  .select()

                console.log('Save response:', { data, error })

                if (error) {
                  console.error('Database error:', error)
                  alert('Failed to save: ' + error.message)
                  return
                }

                console.log('Save successful, returned data:', data)

                // Verify the save
                const { data: verifyData, error: verifyError } = await supabase
                  .from('students')
                  .select('development_plan, development_plan_notes')
                  .eq('id', user.id)
                  .single()

                if (verifyError) {
                  console.error('Verification failed:', verifyError)
                } else {
                  console.log('Verification successful - data in DB:', verifyData)
                  if (!verifyData?.development_plan) {
                    console.warn('WARNING: Data did not save to database!')
                    alert('WARNING: Data did not save properly. Please try again.')
                    return
                  }
                }

                alert('Development plan saved successfully!')
                setEditingPlan(false)
                
                // Force refresh student data
                await fetchStudentData()
                
              } catch (error) {
                console.error('Unexpected error:', error)
                alert('Error saving plan: ' + error.message)
              }
            }}
            onCancel={() => setEditingPlan(false)}
            isStudent={true}
          />
        </div>
      ) : student?.development_plan ? (() => {
        try {
          console.log('=== DEVELOPMENT PLAN DEBUG ===')
          console.log('Student object:', student)
          console.log('Has development_plan?:', student?.development_plan)
          console.log('development_plan type:', typeof student?.development_plan)
          
          const plan = typeof student.development_plan === 'string' 
            ? JSON.parse(student.development_plan) 
            : student.development_plan
          
          console.log('Parsed plan:', plan)
          console.log('Plan has section1?:', !!plan?.section1)
          console.log('Plan has section2?:', !!plan?.section2)
          console.log('Plan has skills?:', !!plan?.skills)
          console.log('Plan has goals?:', !!plan?.goals)
          
          // Check for new structure (section1/section2) or old structure (skills/goals)
          const hasNewStructure = plan?.section1 || plan?.section2
          const hasOldStructure = plan?.skills && plan.skills.length > 0
          
          console.log('Has new structure:', hasNewStructure)
          console.log('Has old structure:', hasOldStructure)
          
          if (!plan || (!hasNewStructure && !hasOldStructure)) {
            console.log('Returning null: No valid plan structure found')
            return null
          }
          
          console.log('Rendering development plan')
          console.log('============================')

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
                <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid #E0E0E0' }}>
                  <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-primary)', fontSize: '20px', fontWeight: 600 }}>
                    Goals & Motivation
                  </h3>
                  
                  {plan.goals.inspiration && (
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                        What inspired you to improve your tennis game?
                      </strong>
                      <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                        {plan.goals.inspiration}
                      </p>
                    </div>
                  )}
                  
                  {plan.goals.targetLevel && (
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                        What level do you want to reach?
                      </strong>
                      <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                        {plan.goals.targetLevel}
                      </p>
                    </div>
                  )}
                  
                  {plan.goals.wantToBeat && (
                    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                      <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                        Who do you want to beat once you improve?
                      </strong>
                      <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                        {plan.goals.wantToBeat}
                      </p>
                    </div>
                  )}
                  
                  {plan.goals.successLookLike && (
                    <div>
                      <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                        What would success look like for you?
                      </strong>
                      <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                        {plan.goals.successLookLike}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Section - Only render if using old structure */}
              {plan.skills && plan.skills.length > 0 && (
              <div className="development-plan-grid">
                {plan.skills.map((skill, index) => {
                  // Use current_level, fall back to student_assessment for historical data
                  const currentLevel = skill.current_level ?? skill.student_assessment ?? null
                  const targetLevel = skill.target_level ?? null
                  
                  return (
                    <div key={index} className="skill-card-student">
                      <div className="skill-header-student">
                        <strong>{skill.skill_name}</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          {currentLevel && (
                            <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '14px' }}>
                              Current: {currentLevel}/10
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
                              width: `${Math.min(((currentLevel || 0) / targetLevel) * 100, 100)}%`,
                              backgroundColor: (currentLevel || 0) >= targetLevel ? 'var(--color-success)' : 'var(--color-primary)'
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
              )}

              {/* New Structure: Section 1 & 2 */}
              {hasNewStructure && (
                <>
                  {/* Section 1: Student's Why */}
                  {plan.section1 && (
                    <div style={{ marginBottom: '32px', padding: '24px', backgroundColor: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-sm)', border: '1px solid #E0E0E0' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-primary)', fontSize: '20px', fontWeight: 600 }}>
                        Your Why
                      </h3>
                      
                      {plan.section1.triggerReason && (
                        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                          <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                            What triggered you?
                          </strong>
                          <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                            {plan.section1.triggerReason}
                          </p>
                        </div>
                      )}
                      
                      {plan.section1.bigGoal && (
                        <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #F0F0F0' }}>
                          <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                            Your big goal
                          </strong>
                          <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                            {plan.section1.bigGoal === 'custom' 
                              ? plan.section1.customGoal 
                              : GOAL_OPTIONS.find(g => g.value === plan.section1.bigGoal)?.label || plan.section1.bigGoal}
                          </p>
                        </div>
                      )}
                      
                      {plan.section1.sundayVision && (
                        <div>
                          <strong style={{ display: 'block', marginBottom: '8px', color: 'var(--color-dark)', fontSize: '15px' }}>
                            Sunday Vision
                          </strong>
                          <p style={{ margin: 0, color: '#666', lineHeight: '1.6', fontSize: '15px' }}>
                            {plan.section1.sundayVision === 'custom'
                              ? plan.section1.customSundayVision || plan.section1.sundayVision
                              : plan.section1.sundayVision}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Section 2: Skill Ratings */}
                  {plan.section2 && plan.section2.skillRatings && (
                    <div style={{ marginBottom: '32px' }}>
                      <h3 style={{ margin: '0 0 20px 0', color: 'var(--color-primary)', fontSize: '20px', fontWeight: 600 }}>
                        Current Skill Ratings
                      </h3>
                      <div className="development-plan-grid">
                        {Object.entries(plan.section2.skillRatings)
                          .filter(([_, rating]) => rating !== null && rating !== undefined)
                          .map(([skillKey, rating]) => {
                            const skillName = skillKey.charAt(0).toUpperCase() + skillKey.slice(1)
                            return (
                              <div key={skillKey} className="skill-card-student">
                                <div className="skill-header-student">
                                  <strong>{skillName}</strong>
                                  <span style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '14px' }}>
                                    {rating}/10
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Recommended Path */}
              {(() => {
                try {
                  const plan = typeof student.development_plan === 'string' 
                    ? JSON.parse(student.development_plan) 
                    : student.development_plan
                  
                  const bigGoal = plan?.section1?.bigGoal
                  if (!bigGoal || bigGoal === 'custom') return null
                  
                  const goal = GOAL_OPTIONS.find(g => g.value === bigGoal)
                  if (!goal) return null
                  
                  const targetMilestone = MILESTONES.find(m => m.number === goal.targetMilestone)
                  
                  let targetSkill = 5
                  if (goal.targetMilestone <= 15) targetSkill = 5
                  else if (goal.targetMilestone <= 20) targetSkill = 6
                  else targetSkill = 7
                  
                  return (
                    <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <strong style={{ fontSize: '16px' }}>📋 Recommended Path:</strong>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
                          🎯 <strong>Target Milestone:</strong> #{goal.targetMilestone} - {targetMilestone?.name}
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                            "{targetMilestone?.description}"
                          </div>
                        </div>
                        <div style={{ padding: '12px', background: 'white', borderRadius: '6px' }}>
                          📈 <strong>Skill Level Needed:</strong> {targetSkill}/10 in all areas
                        </div>
                      </div>
                    </div>
                  )
                } catch (e) {
                  return null
                }
              })()}

              {/* Milestone Progress Tracker */}
              <div style={{ marginTop: '40px' }}>
                <MilestoneTracker 
                  studentId={user.id}
                  isCoach={false}
                  playerLevel={student?.player_level || 'beginner'}
                />
              </div>
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


      {/* Lesson Detail Modal */}
      {selectedLessonForDetails && (
        <div className="modal-overlay" onClick={() => setSelectedLessonForDetails(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Details</h2>
              <button className="modal-close" onClick={() => setSelectedLessonForDetails(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>Date:</strong> {new Date(selectedLessonForDetails.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Time:</strong> {new Date(selectedLessonForDetails.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Location:</strong> {selectedLessonForDetails.location || '-'}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{getActualStatus(selectedLessonForDetails)}</span>
              </div>
              {(selectedLessonForDetails.lesson_plan || selectedLessonForDetails.student_lesson_plan) && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Lesson Plan:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLessonForDetails.student_lesson_plan || selectedLessonForDetails.lesson_plan}
                  </div>
                </div>
              )}
              {selectedLessonForDetails.student_learnings && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>My Learnings:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLessonForDetails.student_learnings}
                  </div>
                </div>
              )}
              {selectedLessonForDetails.coach_feedback && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Coach Feedback:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E8F5E9', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLessonForDetails.coach_feedback}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setSelectedLessonForDetails(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              
              <div className="learnings-form">
                <div className="learning-input-group">
                  <label className="label">Learning #1</label>
                  <textarea
                    className="input"
                    value={learning1}
                    onChange={(e) => setLearning1(e.target.value)}
                    placeholder="What was your first key learning from this lesson?"
                    maxLength={200}
                    rows={3}
                  />
                  <span style={{ display: 'block', textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>{learning1.length}/200</span>
                </div>
                
                <div className="learning-input-group">
                  <label className="label">Learning #2</label>
                  <textarea
                    className="input"
                    value={learning2}
                    onChange={(e) => setLearning2(e.target.value)}
                    placeholder="What was your second key learning?"
                    maxLength={200}
                    rows={3}
                  />
                  <span style={{ display: 'block', textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>{learning2.length}/200</span>
                </div>
                
                <div className="learning-input-group">
                  <label className="label">Learning #3</label>
                  <textarea
                    className="input"
                    value={learning3}
                    onChange={(e) => setLearning3(e.target.value)}
                    placeholder="What was your third key learning?"
                    maxLength={200}
                    rows={3}
                  />
                  <span style={{ display: 'block', textAlign: 'right', fontSize: '12px', color: '#999', marginTop: '4px' }}>{learning3.length}/200</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={handleCloseLearningsModal}>
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmitLearnings}
                disabled={!learning1.trim() || !learning2.trim() || !learning3.trim()}
              >
                Submit Learnings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Book Lesson Modal */}
      <BookLessonModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        studentId={user?.id}
        studentEmail={user?.email || profile?.email}
        availableCredits={student?.lesson_credits || 0}
      />
    </div>
  )
}

