import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { ArrowLeft, Mail, Phone, Award, Calendar, Target, FileText, MessageSquare, Edit2 } from 'lucide-react'
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'
import NewConversationModal from '../Messaging/NewConversationModal'
import './StudentDetailPage.css'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editingPlan, setEditingPlan] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState(null)
  
  // Profile editing state
  const [profileFormData, setProfileFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    ntrp_level: '3.0',
    lesson_credits: 0
  })

  useEffect(() => {
    fetchStudentData()
    fetchLessons()
  }, [id])

  const fetchStudentData = async () => {
    try {
      console.log('=== FETCHING STUDENT DATA (COACH) ===')
      console.log('Student ID:', id)
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles (full_name, email, ntrp_level, phone)
        `)
        .eq('id', id)
        .single()

      console.log('Fetch response:', { data, error })

      if (error) {
        console.error('Fetch error:', error)
        throw error
      }
      
      console.log('Student data fetched:', data)
      console.log('Development plan in fetched data:', data?.development_plan)
      console.log('Development plan type:', typeof data?.development_plan)
      
      if (data?.development_plan) {
        try {
          const parsed = typeof data.development_plan === 'string'
            ? JSON.parse(data.development_plan)
            : data.development_plan
          console.log('Parsed development plan:', parsed)
        } catch (parseError) {
          console.error('Error parsing development plan:', parseError)
        }
      }
      
      setStudent(data)
      
      // Populate profile form data - split full_name into first_name and last_name
      if (data?.profiles) {
        const fullName = data.profiles.full_name || ''
        const nameParts = fullName.trim().split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        setProfileFormData({
          first_name: firstName,
          last_name: lastName,
          email: data.profiles.email || '',
          phone: data.profiles.phone || '',
          ntrp_level: data.profiles.ntrp_level || '3.0',
          lesson_credits: data.lesson_credits || 0
        })
      }
      
      setLoading(false)
      console.log('=== FETCH COMPLETE (COACH) ===')
    } catch (error) {
      console.error('Error fetching student:', error)
      setLoading(false)
    }
  }

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', id)
        .order('lesson_date', { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      console.error('Error fetching lessons:', error)
    }
  }

  const handleSaveDevelopmentPlan = async (planData) => {
    try {
      console.log('=== COACH SAVE DEVELOPMENT PLAN STARTING ===')
      console.log('Plan data being saved:', planData)
      console.log('Student ID:', id)
      
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
        .eq('id', id)
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
        .eq('id', id)
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
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const fullName = `${profileFormData.first_name} ${profileFormData.last_name}`.trim()
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          email: profileFormData.email,
          phone: profileFormData.phone,
          ntrp_level: profileFormData.ntrp_level
        })
        .eq('id', id)

      if (profileError) throw profileError

      // Update students table (lesson_credits)
      const { error: studentError } = await supabase
        .from('students')
        .update({
          lesson_credits: profileFormData.lesson_credits
        })
        .eq('id', id)

      if (studentError) throw studentError

      alert('Student information updated successfully!')
      setEditingProfile(false)
      await fetchStudentData() // Refresh to show updated data
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + error.message)
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading) {
    return <div className="page-container">Loading...</div>
  }

  if (!student) {
    return <div className="page-container">Student not found</div>
  }

  const developmentPlan = student.development_plan 
    ? (typeof student.development_plan === 'string' 
        ? JSON.parse(student.development_plan) 
        : student.development_plan)
    : null

  const upcomingLessons = lessons.filter(l => l.status === 'scheduled' && new Date(l.lesson_date) > new Date())
  const pastLessons = lessons.filter(l => l.status === 'completed' || new Date(l.lesson_date) < new Date())

  return (
    <div className="page-container">
      {/* Header */}
      <div className="student-detail-header">
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/coach/students')}>
          <ArrowLeft size={18} />
          Back to Students
        </button>
        <div className="student-header-content">
          <div className="student-avatar-large">
            {getInitials(student.profiles?.full_name || 'Unknown')}
          </div>
          <div style={{ flex: 1 }}>
            {editingProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>First Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileFormData.first_name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, first_name: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Last Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileFormData.last_name}
                      onChange={(e) => setProfileFormData({ ...profileFormData, last_name: e.target.value })}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Email</label>
                  <input
                    type="email"
                    className="input"
                    value={profileFormData.email}
                    onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={profileFormData.phone}
                    onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>NTRP Level</label>
                    <select
                      className="input"
                      value={profileFormData.ntrp_level}
                      onChange={(e) => setProfileFormData({ ...profileFormData, ntrp_level: e.target.value })}
                      style={{ width: '100%' }}
                    >
                      <option value="1.5">1.5 - Beginner</option>
                      <option value="2.0">2.0 - Beginner</option>
                      <option value="2.5">2.5 - Beginner+</option>
                      <option value="3.0">3.0 - Intermediate</option>
                      <option value="3.5">3.5 - Intermediate+</option>
                      <option value="4.0">4.0 - Advanced</option>
                      <option value="4.5">4.5 - Advanced+</option>
                      <option value="5.0+">5.0+ - Expert</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600 }}>Lesson Credits</label>
                    <input
                      type="number"
                      className="input"
                      value={profileFormData.lesson_credits}
                      onChange={(e) => setProfileFormData({ ...profileFormData, lesson_credits: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%' }}
                      min="0"
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button 
                    className="btn btn-outline" 
                    onClick={() => {
                      setEditingProfile(false)
                      // Reset form data to current values
                      const fullName = student.profiles?.full_name || ''
                      const nameParts = fullName.trim().split(' ')
                      const firstName = nameParts[0] || ''
                      const lastName = nameParts.slice(1).join(' ') || ''
                      setProfileFormData({
                        first_name: firstName,
                        last_name: lastName,
                        email: student.profiles?.email || '',
                        phone: student.profiles?.phone || '',
                        ntrp_level: student.profiles?.ntrp_level || '3.0',
                        lesson_credits: student.lesson_credits || 0
                      })
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h1>{student.profiles?.full_name || 'Unknown Student'}</h1>
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => setEditingProfile(true)}
                    style={{ marginLeft: '16px' }}
                  >
                    <Edit2 size={18} />
                    Edit Profile
                  </button>
                </div>
                <div className="student-contact-info">
                  {student.profiles?.email && (
                    <div className="contact-item">
                      <Mail size={16} />
                      <span>{student.profiles.email}</span>
                    </div>
                  )}
                  {student.profiles?.phone && (
                    <div className="contact-item">
                      <Phone size={16} />
                      <span>{student.profiles.phone}</span>
                    </div>
                  )}
                  <div className="contact-item">
                    <Award size={16} />
                    <span>NTRP {student.profiles?.ntrp_level || 'N/A'}</span>
                  </div>
                  <div className="contact-item">
                    <Calendar size={16} />
                    <span>{student.lesson_credits || 0} Credits</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab ${activeTab === 'plan' ? 'active' : ''}`}
          onClick={() => setActiveTab('plan')}
        >
          Development Plan
        </button>
        <button 
          className={`tab ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          Lesson History ({lessons.length})
        </button>
        <button 
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total Lessons</div>
                <div className="stat-value">{lessons.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Upcoming</div>
                <div className="stat-value">{upcomingLessons.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Completed</div>
                <div className="stat-value">{pastLessons.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Credits</div>
                <div className="stat-value">{student.lesson_credits || 0}</div>
              </div>
            </div>

            {upcomingLessons.length > 0 && (
              <div className="section">
                <h3>Upcoming Lessons</h3>
                <div className="lessons-list">
                  {upcomingLessons.map(lesson => (
                    <div key={lesson.id} className="lesson-item">
                      <div>
                        <strong>{new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        <div style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                          {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} • {lesson.location}
                        </div>
                      </div>
                      {lesson.lesson_plan && (
                        <FileText size={18} style={{ color: 'var(--color-success)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'plan' && (
          <div className="plan-section">
            {editingPlan ? (
              <DevelopmentPlanForm
                student={student}
                onSave={handleSaveDevelopmentPlan}
                onCancel={() => setEditingPlan(false)}
                isStudent={false}
              />
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <h3>Development Plan</h3>
                  <button className="btn btn-primary" onClick={() => setEditingPlan(true)}>
                    <Edit2 size={18} />
                    {developmentPlan ? 'Edit Plan' : 'Create Plan'}
                  </button>
                </div>

                {developmentPlan ? (
                  <div className="plan-display">
                    {developmentPlan.skills && developmentPlan.skills.length > 0 && (
                      <div className="plan-section-content">
                        <h4>Skills</h4>
                        <div className="skills-grid">
                          {developmentPlan.skills.map((skill, index) => (
                            <div key={index} className="skill-item">
                              <div className="skill-header">
                                <strong>{skill.skill_name}</strong>
                                <span>{skill.current_level}/10 → {skill.target_level}/10</span>
                              </div>
                              <div className="skill-progress-bar">
                                <div 
                                  className="skill-progress-fill"
                                  style={{ width: `${(skill.current_level / skill.target_level) * 100}%` }}
                                />
                              </div>
                              {skill.notes && <p className="skill-notes">{skill.notes}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {developmentPlan.goals && (
                      <div className="plan-section-content">
                        <h4>Goals & Motivation</h4>
                        {developmentPlan.goals.inspiration && (
                          <div className="goal-item">
                            <strong>What inspired you to improve?</strong>
                            <p>{developmentPlan.goals.inspiration}</p>
                          </div>
                        )}
                        {developmentPlan.goals.targetLevel && (
                          <div className="goal-item">
                            <strong>What level do you want to reach?</strong>
                            <p>{developmentPlan.goals.targetLevel}</p>
                          </div>
                        )}
                        {developmentPlan.goals.wantToBeat && (
                          <div className="goal-item">
                            <strong>Who do you want to beat?</strong>
                            <p>{developmentPlan.goals.wantToBeat}</p>
                          </div>
                        )}
                        {developmentPlan.goals.successLookLike && (
                          <div className="goal-item">
                            <strong>What would success look like?</strong>
                            <p>{developmentPlan.goals.successLookLike}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {student.development_plan_notes && (
                      <div className="plan-section-content">
                        <h4>Coach Notes</h4>
                        <div className="coach-notes">
                          {student.development_plan_notes}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Target size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                    <p>No development plan yet. Click "Create Plan" to get started.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'lessons' && (
          <div className="lessons-section">
            <h3>Lesson History</h3>
            {lessons.length === 0 ? (
              <div className="empty-state">No lessons yet.</div>
            ) : (
              <div className="lessons-list">
                {lessons.map(lesson => (
                  <div 
                    key={lesson.id} 
                    className="lesson-item-detailed"
                    onClick={() => setSelectedLesson(lesson)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="lesson-date-column">
                      <div className="lesson-date-main">
                        {new Date(lesson.lesson_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="lesson-time">
                        {new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="lesson-content">
                      <div className="lesson-header-row">
                        <strong>{new Date(lesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                        <span className={`status-badge status-${lesson.status}`}>
                          {lesson.status}
                        </span>
                      </div>
                      <div className="lesson-meta">{lesson.location}</div>
                      {lesson.lesson_plan && (
                        <div className="lesson-detail">
                          <FileText size={16} />
                          <span>Lesson plan available</span>
                        </div>
                      )}
                      {lesson.student_learnings && (
                        <div className="lesson-detail">
                          <span>✓ Learnings submitted</span>
                        </div>
                      )}
                      {lesson.coach_feedback && (
                        <div className="lesson-detail">
                          <span>✓ Feedback provided</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="notes-section">
            <h3>Coach Notes</h3>
            <textarea
              className="input"
              value={student.development_plan_notes || ''}
              placeholder="Add notes about this student..."
              rows={10}
              onChange={async (e) => {
                const newNotes = e.target.value
                try {
                  const { error } = await supabase
                    .from('students')
                    .update({ development_plan_notes: newNotes })
                    .eq('id', id)

                  if (error) throw error
                  setStudent({ ...student, development_plan_notes: newNotes })
                } catch (error) {
                  console.error('Error saving notes:', error)
                  alert('Error saving notes: ' + error.message)
                }
              }}
            />
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              Notes are automatically saved as you type.
            </p>
          </div>
        )}
      </div>

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
                  <span>{student?.profiles?.full_name || 'Unknown'}</span>
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
                  <span className={`status-badge status-${selectedLesson.status}`}>
                    {selectedLesson.status}
                  </span>
                </div>
                
                {selectedLesson.lesson_plan && (
                  <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <strong style={{ marginBottom: '8px' }}>Lesson Plan:</strong>
                    <div style={{ 
                      backgroundColor: '#f5f5f5', 
                      padding: '12px', 
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      width: '100%'
                    }}>
                      {selectedLesson.lesson_plan}
                    </div>
                  </div>
                )}

                {selectedLesson.student_learnings && (
                  <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <strong style={{ marginBottom: '8px' }}>Student Learnings:</strong>
                    <div style={{ 
                      backgroundColor: '#f0f7ff', 
                      padding: '12px', 
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      width: '100%'
                    }}>
                      {selectedLesson.student_learnings}
                    </div>
                  </div>
                )}

                {selectedLesson.coach_feedback && (
                  <div className="detail-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <strong style={{ marginBottom: '8px' }}>Coach Feedback:</strong>
                    <div style={{ 
                      backgroundColor: '#fff5e6', 
                      padding: '12px', 
                      borderRadius: '4px',
                      whiteSpace: 'pre-wrap',
                      width: '100%'
                    }}>
                      {selectedLesson.coach_feedback}
                    </div>
                  </div>
                )}

                {selectedLesson.metadata && (() => {
                  try {
                    const metadata = typeof selectedLesson.metadata === 'string' 
                      ? JSON.parse(selectedLesson.metadata) 
                      : selectedLesson.metadata
                    
                    if (metadata?.source === 'google_calendar') {
                      return (
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
                            {metadata.google_calendar_link && (
                              <a 
                                href={metadata.google_calendar_link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: 'white', textDecoration: 'underline', marginLeft: '8px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open in Google Calendar
                              </a>
                            )}
                          </span>
                        </div>
                      )
                    }
                  } catch (e) {
                    return null
                  }
                  return null
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

