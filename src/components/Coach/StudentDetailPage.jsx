import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { ArrowLeft, Mail, Phone, Award, Calendar, Target, FileText, MessageSquare, Edit2, TrendingUp, CreditCard, Link2, UserCheck, UserX, DollarSign, Check, X, Trash2 } from 'lucide-react'
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'
import NewConversationModal from '../Messaging/NewConversationModal'
import ProgressChart, { OverallProgressSummary } from '../Progress/ProgressChart'
import AddPackageModal from '../Payments/AddPackageModal'
import MergeHistoricalModal from '../History/MergeHistoricalModal'
import MergeProfilesModal from './MergeProfilesModal'
import SelectProfileModal from './SelectProfileModal'
import BookLessonModal from '../Calendar/BookLessonModal'
import CreateLessonModal from '../Calendar/CreateLessonModal'
import { MILESTONES, GOAL_OPTIONS } from '../DevelopmentPlan/MilestonesConstants'
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
  const [privateNotes, setPrivateNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [showAddPackage, setShowAddPackage] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [showMergeProfilesModal, setShowMergeProfilesModal] = useState(false)
  const [showBookLesson, setShowBookLesson] = useState(false)
  const [showCreateLesson, setShowCreateLesson] = useState(false)
  const [selectedProfileToMerge, setSelectedProfileToMerge] = useState(null)
  const [referringStudent, setReferringStudent] = useState(null)
  const [editingLeadSource, setEditingLeadSource] = useState(false)
  const [leadSourceForm, setLeadSourceForm] = useState({ leadSource: '', referredBy: '' })
  const [allStudents, setAllStudents] = useState([])
  const [financialData, setFinancialData] = useState(null)
  const [editingRevenue, setEditingRevenue] = useState(false)
  const [editingLessonsPurchased, setEditingLessonsPurchased] = useState(false)
  const [editingCredits, setEditingCredits] = useState(false)
  const [editRevenueValue, setEditRevenueValue] = useState('')
  const [editLessonsPurchasedValue, setEditLessonsPurchasedValue] = useState('')
  const [editCreditsValue, setEditCreditsValue] = useState('')
  
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
    fetchAllStudents()
  }, [id])

  useEffect(() => {
    if (student?.referred_by_student_id) {
      fetchReferringStudent()
    }
  }, [student?.referred_by_student_id])

  const fetchReferringStudent = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', student.referred_by_student_id)
      .single()
    
    setReferringStudent(data)
  }

  const fetchAllStudents = async () => {
    // Fetch students and profiles separately to avoid relationship ambiguity
    const { data: studentsData } = await supabase
      .from('students')
      .select('id')
      .eq('is_active', true)
      .order('id')
    
    if (studentsData) {
      const studentIds = studentsData.map(s => s.id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', studentIds)
      
      const merged = studentsData.map(s => ({
        ...s,
        profiles: (profilesData || []).find(p => p.id === s.id) || null
      }))
      setAllStudents(merged)
    } else {
      setAllStudents([])
    }
  }

  const fetchFinancialData = async () => {
    if (!id || !student) return
    
    try {
      // Fetch lesson dates from lesson_transactions
      const { data: lessonTransactions } = await supabase
        .from('lesson_transactions')
        .select('transaction_date')
        .eq('student_id', id)
        .eq('transaction_type', 'lesson_taken')
        .order('transaction_date', { ascending: true })
      
      const lessonDates = (lessonTransactions || []).map(t => t.transaction_date).filter(Boolean)
      
      const totalRevenue = parseFloat(student.total_revenue || 0)
      const totalLessonsPurchased = student.total_lessons_purchased || 0
      const avgPerLesson = totalLessonsPurchased > 0 ? totalRevenue / totalLessonsPurchased : 0
      
      setFinancialData({
        totalRevenue: totalRevenue,
        totalLessonsPurchased: totalLessonsPurchased,
        lessonCredits: student.lesson_credits || 0,
        lessonDates: lessonDates,
        firstLessonDate: lessonDates[0] || null,
        lastLessonDate: lessonDates.length > 0 ? lessonDates[lessonDates.length - 1] : null,
        avgPerLesson: avgPerLesson
      })
    } catch (error) {
      console.error('Error fetching financial data:', error)
    }
  }

  const handleSaveRevenue = async () => {
    try {
      const revenue = parseFloat(editRevenueValue) || 0
      const { error } = await supabase
        .from('students')
        .update({ total_revenue: revenue })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setStudent(prev => ({ ...prev, total_revenue: revenue }))
      setFinancialData(prev => ({
        ...prev,
        totalRevenue: revenue,
        avgPerLesson: prev.totalLessonsPurchased > 0 ? revenue / prev.totalLessonsPurchased : 0
      }))
      setEditingRevenue(false)
    } catch (error) {
      console.error('Error saving revenue:', error)
      alert('Error saving revenue: ' + error.message)
    }
  }

  const handleSaveLessonsPurchased = async () => {
    try {
      const lessonsPurchased = parseInt(editLessonsPurchasedValue) || 0
      const { error } = await supabase
        .from('students')
        .update({ total_lessons_purchased: lessonsPurchased })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setStudent(prev => ({ ...prev, total_lessons_purchased: lessonsPurchased }))
      setFinancialData(prev => ({
        ...prev,
        totalLessonsPurchased: lessonsPurchased,
        avgPerLesson: lessonsPurchased > 0 ? prev.totalRevenue / lessonsPurchased : 0
      }))
      setEditingLessonsPurchased(false)
    } catch (error) {
      console.error('Error saving lessons purchased:', error)
      alert('Error saving lessons purchased: ' + error.message)
    }
  }

  const handleSaveCredits = async () => {
    try {
      const credits = parseInt(editCreditsValue) || 0
      const { error } = await supabase
        .from('students')
        .update({ lesson_credits: credits })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setStudent(prev => ({ ...prev, lesson_credits: credits }))
      setFinancialData(prev => ({ ...prev, lessonCredits: credits }))
      setEditingCredits(false)
    } catch (error) {
      console.error('Error saving credits:', error)
      alert('Error saving credits: ' + error.message)
    }
  }

  useEffect(() => {
    if (student && activeTab === 'financial') {
      fetchFinancialData()
    }
  }, [student, activeTab, id])

  const fetchStudentData = async () => {
    try {
      console.log('=== FETCHING STUDENT DATA (COACH) ===')
      console.log('Student ID:', id)
      
      // Fetch student and profile separately to avoid relationship ambiguity
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (studentError) {
        console.error('Fetch error:', studentError)
        throw studentError
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, ntrp_level, phone')
        .eq('id', id)
        .single()

      const data = { ...studentData, profiles: profileData }

      console.log('Fetch response:', { data })
      
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
      setPrivateNotes(data.private_coach_notes || '')
      
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

  const handleDeleteLesson = async (lessonId, e) => {
    e.stopPropagation() // Prevent opening lesson detail modal
    
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId)

      if (error) throw error

      // Remove lesson from local state
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId))
      
      // If this lesson was selected, clear it
      if (selectedLesson?.id === lessonId) {
        setSelectedLesson(null)
      }
    } catch (error) {
      console.error('Error deleting lesson:', error)
      alert('Error deleting lesson: ' + error.message)
    }
  }

  const savePrivateNotes = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ private_coach_notes: privateNotes })
        .eq('id', id)

      if (error) throw error
      
      setEditingNotes(false)
      // Update the local student state
      setStudent(prev => ({ ...prev, private_coach_notes: privateNotes }))
      
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Error saving notes: ' + error.message)
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

  const toggleActiveStatus = async () => {
    try {
      const newStatus = !student.is_active
      const { error } = await supabase
        .from('students')
        .update({ is_active: newStatus })
        .eq('id', id)

      if (error) throw error
      
      setStudent(prev => ({ ...prev, is_active: newStatus }))
      alert(`Student marked as ${newStatus ? 'Active' : 'Inactive'}`)
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('Error updating status: ' + error.message)
    }
  }

  const saveLeadSource = async () => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          lead_source: leadSourceForm.leadSource || null,
          referred_by_student_id: leadSourceForm.leadSource === 'Referral' ? leadSourceForm.referredBy : null
        })
        .eq('id', id)

      if (error) throw error
      
      setStudent(prev => ({ 
        ...prev, 
        lead_source: leadSourceForm.leadSource,
        referred_by_student_id: leadSourceForm.leadSource === 'Referral' ? leadSourceForm.referredBy : null
      }))
      setEditingLeadSource(false)
      
      // Refresh referring student if needed
      if (leadSourceForm.leadSource === 'Referral' && leadSourceForm.referredBy) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', leadSourceForm.referredBy)
          .single()
        setReferringStudent(data)
      } else {
        setReferringStudent(null)
      }
    } catch (error) {
      console.error('Error saving lead source:', error)
      alert('Error saving: ' + error.message)
    }
  }

  const leadSourceOptions = [
    'Referral', 'Groupon', 'Findtennislessons', 'Playyourcourt', 
    'In Person', 'TeachMe', 'Thumbtack', 'Facebook', 'Instagram', 
    'Google', 'Website', 'Other'
  ]

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
                  <div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {student.profiles?.full_name || 'Unknown Student'}
                      <span 
                        style={{ 
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontWeight: 600,
                          background: student.is_active !== false ? '#D4EDDA' : '#F8D7DA',
                          color: student.is_active !== false ? '#155724' : '#721C24'
                        }}
                      >
                        {student.is_active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </h1>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={toggleActiveStatus}
                      style={{ 
                        background: student.is_active !== false ? '#F8D7DA' : '#D4EDDA',
                        color: student.is_active !== false ? '#721C24' : '#155724',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500
                      }}
                    >
                      {student.is_active !== false ? <UserX size={18} /> : <UserCheck size={18} />}
                      {student.is_active !== false ? 'Mark Inactive' : 'Mark Active'}
                    </button>
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => setShowAddPackage(true)}
                      style={{ 
                        background: '#2D7F6F',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <CreditCard size={18} />
                      Add Package
                    </button>
                    {(student.total_lessons_purchased || 0) === 0 && (
                      <button 
                        onClick={() => setShowMergeModal(true)}
                        style={{ 
                          background: '#FF9800',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        <Link2 size={18} />
                        Link History
                      </button>
                    )}
                    <button 
                      onClick={() => setShowMergeProfilesModal(true)}
                      style={{ 
                        background: '#9C27B0',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      <Link2 size={18} />
                      Merge Profiles
                    </button>
                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => setEditingProfile(true)}
                    >
                      <Edit2 size={18} />
                      Edit Profile
                    </button>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          // Primary action: Open Cal.com link directly
                          window.open('https://cal.com/tobi-ojo-jg8ane/60min', '_blank')
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Calendar size={18} />
                        Create Lesson
                      </button>
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowCreateLesson(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Calendar size={18} />
                        Book Directly
                      </button>
                    </div>
                  </div>
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

                {/* Lead Source Section */}
                <div className="lead-source-section">
                  {editingLeadSource ? (
                    <div className="lead-source-edit">
                      <select
                        className="input"
                        value={leadSourceForm.leadSource}
                        onChange={(e) => setLeadSourceForm({...leadSourceForm, leadSource: e.target.value})}
                        style={{ minWidth: '150px' }}
                      >
                        <option value="">Select lead source...</option>
                        {leadSourceOptions.map(source => (
                          <option key={source} value={source}>{source}</option>
                        ))}
                      </select>
                      {leadSourceForm.leadSource === 'Referral' && (
                        <select
                          className="input"
                          value={leadSourceForm.referredBy}
                          onChange={(e) => setLeadSourceForm({...leadSourceForm, referredBy: e.target.value})}
                          style={{ minWidth: '150px' }}
                        >
                          <option value="">Select referring student...</option>
                          {allStudents.filter(s => s.id !== id).map(s => (
                            <option key={s.id} value={s.id}>{s.profiles?.full_name}</option>
                          ))}
                        </select>
                      )}
                      <button onClick={saveLeadSource} className="btn btn-primary btn-sm">Save</button>
                      <button onClick={() => setEditingLeadSource(false)} className="btn btn-outline btn-sm">Cancel</button>
                    </div>
                  ) : (
                    <div className="lead-source-display">
                      {student.lead_source ? (
                        <span className="lead-source-badge-large">{student.lead_source}</span>
                      ) : (
                        <span className="no-lead-source">No lead source set</span>
                      )}
                      {referringStudent && (
                        <span 
                          className="referral-link"
                          onClick={() => navigate(`/coach/students/${student.referred_by_student_id}`)}
                        >
                          Referred by: {referringStudent.full_name}
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          setLeadSourceForm({
                            leadSource: student.lead_source || '',
                            referredBy: student.referred_by_student_id || ''
                          })
                          setEditingLeadSource(true)
                        }} 
                        className="btn-edit-lead-source"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  )}
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
        <button 
          className={`tab ${activeTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveTab('progress')}
        >
          <TrendingUp size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Progress
        </button>
        <button 
          className={`tab ${activeTab === 'financial' ? 'active' : ''}`}
          onClick={() => setActiveTab('financial')}
        >
          <DollarSign size={16} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          Financial
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

            {/* Player Level Toggle - Coach Only */}
            <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <strong>Player Level:</strong> 
                  <span style={{ marginLeft: '8px', textTransform: 'capitalize' }}>
                    {student?.player_level || 'beginner'}
                  </span>
                </div>
                <button
                  className="btn btn-outline"
                  onClick={async () => {
                    const newLevel = student?.player_level === 'beginner' ? 'advanced' : 'beginner'
                    const { error } = await supabase
                      .from('students')
                      .update({ player_level: newLevel })
                      .eq('id', student.id)
                    
                    if (!error) {
                      // Refresh student data
                      fetchStudentData()
                      alert(`Player level updated to ${newLevel}`)
                    } else {
                      console.error('Error updating player level:', error)
                      alert('Error updating player level')
                    }
                  }}
                  style={{ fontSize: '14px' }}
                >
                  Switch to {student?.player_level === 'beginner' ? 'Advanced' : 'Beginner'} Level
                </button>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
                {student?.player_level === 'beginner' 
                  ? '📚 Beginner Level: Building fundamentals (Milestones 1-30)'
                  : '🏆 Advanced Level: Competitive play (3.5+ players)'
                }
              </p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {lesson.lesson_plan && (
                          <FileText size={18} style={{ color: 'var(--color-success)' }} />
                        )}
                        <button
                          onClick={(e) => handleDeleteLesson(lesson.id, e)}
                          className="btn-icon-delete"
                          title="Delete lesson"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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
                          <div className="plan-section-content" style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span className={`status-badge status-${lesson.status}`}>
                            {lesson.status}
                          </span>
                          <button
                            onClick={(e) => handleDeleteLesson(lesson.id, e)}
                            className="btn-icon-delete"
                            title="Delete lesson"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
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

        {activeTab === 'progress' && (
          <div className="progress-section">
            {/* Overall Progress Summary */}
            {(() => {
              try {
                const plan = student.development_plan 
                  ? (typeof student.development_plan === 'string' 
                      ? JSON.parse(student.development_plan) 
                      : student.development_plan)
                  : null
                return plan ? <OverallProgressSummary developmentPlan={plan} /> : null
              } catch (e) {
                return null
              }
            })()}
            
            <h3 style={{ color: '#4B2C6C', marginBottom: '8px' }}>Skill Progress Over Time</h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>Track improvement across key tennis skills</p>
            
            {/* Progress Charts Grid - Top 6 most important skills */}
            <div className="progress-charts-grid">
              {['Forehand Groundstroke', 'Backhand Groundstroke', 'First Serve', 'Second Serve', 'Return of Serve', 'Footwork & Movement'].map(skill => (
                <ProgressChart 
                  key={skill}
                  studentId={id}
                  skillName={skill}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'financial' && (
          <div className="financial-section">
            <h3 style={{ color: '#4B2C6C', marginBottom: '24px' }}>Financial Information</h3>
            
            {financialData ? (
              <div className="financial-stats-grid">
                <div className="financial-stat-card">
                  <div className="financial-stat-label">Total Revenue</div>
                  {editingRevenue ? (
                    <div className="financial-stat-edit">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editRevenueValue}
                        onChange={(e) => setEditRevenueValue(e.target.value)}
                        className="financial-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveRevenue()
                          if (e.key === 'Escape') setEditingRevenue(false)
                        }}
                      />
                      <button 
                        className="financial-edit-btn save"
                        onClick={handleSaveRevenue}
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        className="financial-edit-btn cancel"
                        onClick={() => setEditingRevenue(false)}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="financial-stat-value editable"
                      onClick={() => {
                        setEditRevenueValue(financialData.totalRevenue.toString())
                        setEditingRevenue(true)
                      }}
                      title="Click to edit"
                    >
                      ${parseFloat(financialData.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <Edit2 size={14} style={{ marginLeft: '8px', opacity: 0.6 }} />
                    </div>
                  )}
                </div>
                
                <div className="financial-stat-card">
                  <div className="financial-stat-label">Lessons Purchased</div>
                  {editingLessonsPurchased ? (
                    <div className="financial-stat-edit">
                      <input
                        type="number"
                        min="0"
                        value={editLessonsPurchasedValue}
                        onChange={(e) => setEditLessonsPurchasedValue(e.target.value)}
                        className="financial-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveLessonsPurchased()
                          if (e.key === 'Escape') setEditingLessonsPurchased(false)
                        }}
                      />
                      <button 
                        className="financial-edit-btn save"
                        onClick={handleSaveLessonsPurchased}
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        className="financial-edit-btn cancel"
                        onClick={() => setEditingLessonsPurchased(false)}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="financial-stat-value editable"
                      onClick={() => {
                        setEditLessonsPurchasedValue(financialData.totalLessonsPurchased.toString())
                        setEditingLessonsPurchased(true)
                      }}
                      title="Click to edit"
                    >
                      {financialData.totalLessonsPurchased || 0}
                      <Edit2 size={14} style={{ marginLeft: '8px', opacity: 0.6 }} />
                    </div>
                  )}
                </div>
                
                <div className="financial-stat-card">
                  <div className="financial-stat-label">Credits Remaining</div>
                  {editingCredits ? (
                    <div className="financial-stat-edit">
                      <input
                        type="number"
                        min="0"
                        value={editCreditsValue}
                        onChange={(e) => setEditCreditsValue(e.target.value)}
                        className="financial-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCredits()
                          if (e.key === 'Escape') setEditingCredits(false)
                        }}
                      />
                      <button 
                        className="financial-edit-btn save"
                        onClick={handleSaveCredits}
                        title="Save"
                      >
                        <Check size={16} />
                      </button>
                      <button 
                        className="financial-edit-btn cancel"
                        onClick={() => setEditingCredits(false)}
                        title="Cancel"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="financial-stat-value editable"
                      onClick={() => {
                        setEditCreditsValue(financialData.lessonCredits.toString())
                        setEditingCredits(true)
                      }}
                      title="Click to edit"
                    >
                      {financialData.lessonCredits || 0}
                      <Edit2 size={14} style={{ marginLeft: '8px', opacity: 0.6 }} />
                    </div>
                  )}
                </div>
                
                <div className="financial-stat-card">
                  <div className="financial-stat-label">Average $/Lesson</div>
                  <div className="financial-stat-value">
                    ${financialData.avgPerLesson.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Loading financial data...</div>
            )}

            {financialData && (
              <>
                <div className="financial-dates-section" style={{ marginTop: '32px' }}>
                  <h4 style={{ color: '#4B2C6C', marginBottom: '16px' }}>Active Dates</h4>
                  {financialData.firstLessonDate && financialData.lastLessonDate ? (
                    <div style={{ padding: '16px', background: '#F8F5FC', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>First Lesson</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {new Date(financialData.firstLessonDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Last Lesson</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {new Date(financialData.lastLessonDate).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Total Lessons</div>
                          <div style={{ fontWeight: '600', color: '#333' }}>
                            {financialData.lessonDates.length}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px', background: '#F8F5FC', borderRadius: '8px', color: '#999' }}>
                      No lesson dates available
                    </div>
                  )}
                </div>

                {financialData.lessonDates.length > 0 && (
                  <div className="financial-lesson-dates" style={{ marginTop: '32px' }}>
                    <h4 style={{ color: '#4B2C6C', marginBottom: '16px' }}>All Lesson Dates ({financialData.lessonDates.length})</h4>
                    <div style={{ 
                      padding: '16px', 
                      background: '#F8F5FC', 
                      borderRadius: '8px',
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', 
                        gap: '8px' 
                      }}>
                        {financialData.lessonDates.map((date, index) => (
                          <div 
                            key={index}
                            style={{ 
                              padding: '8px', 
                              background: 'white', 
                              borderRadius: '4px',
                              fontSize: '13px',
                              textAlign: 'center'
                            }}
                          >
                            {new Date(date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Private Coach Notes - At Bottom */}
      <div className="private-notes-section">
        <div className="notes-section-header">
          <h2>🔒 Private Coach Notes</h2>
          <p className="notes-subtitle">Only visible to you - students cannot see this</p>
        </div>
        
        {editingNotes ? (
          <div className="notes-editor">
            <textarea
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              placeholder="Track anything important about this student:
- Playing style & tendencies
- Injuries or physical limitations
- Mental game notes
- What motivates them
- Equipment details
- Schedule preferences
- Personality quirks
- Things that work/don't work
- Family/work context
- Long-term goals"
              rows={12}
              className="notes-textarea"
            />
            <div className="notes-actions">
              <button onClick={savePrivateNotes} className="btn btn-primary">
                Save Notes
              </button>
              <button onClick={() => setEditingNotes(false)} className="btn btn-outline">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="notes-display">
            {privateNotes ? (
              <div className="notes-content">
                <pre>{privateNotes}</pre>
              </div>
            ) : (
              <div className="notes-empty">
                <p>No private notes yet</p>
                <p className="empty-hint">Click "Add Notes" to start tracking important details</p>
              </div>
            )}
            <button onClick={() => setEditingNotes(true)} className="btn-edit-notes">
              {privateNotes ? '✏️ Edit Notes' : '➕ Add Notes'}
            </button>
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

      {/* Add Package Modal */}
      {showAddPackage && student && (
        <AddPackageModal
          student={student}
          onClose={() => setShowAddPackage(false)}
          onSuccess={() => {
            fetchStudentData()
            setShowAddPackage(false)
          }}
        />
      )}

      {/* Merge Historical Modal */}
      {showMergeModal && student && (
        <MergeHistoricalModal
          studentId={student.id}
          studentName={student.profiles?.full_name || 'Unknown'}
          onClose={() => setShowMergeModal(false)}
          onSuccess={() => {
            fetchStudentData()
            setShowMergeModal(false)
          }}
        />
      )}

      {/* Select Profile Modal for Merging */}
      {showMergeProfilesModal && student && (
        <SelectProfileModal
          currentProfileId={student.id}
          onSelect={(selectedProfileId) => {
            setSelectedProfileToMerge(selectedProfileId)
            setShowMergeProfilesModal(false)
          }}
          onClose={() => setShowMergeProfilesModal(false)}
        />
      )}

      {/* Merge Profiles Modal */}
      {selectedProfileToMerge && student && (
        <MergeProfilesModal
          oldProfileId={student.id}
          newProfileId={selectedProfileToMerge}
          onClose={() => {
            setSelectedProfileToMerge(null)
          }}
          onSuccess={() => {
            fetchStudentData()
            setSelectedProfileToMerge(null)
            navigate('/coach/students')
          }}
        />
      )}

      {/* Create Lesson Modal (Direct Booking) */}
      {showCreateLesson && student && (
        <CreateLessonModal
          isOpen={showCreateLesson}
          onClose={() => setShowCreateLesson(false)}
          studentId={student.id}
          studentName={student.profiles?.full_name || 'Unknown Student'}
          onSuccess={() => {
            fetchStudentData()
            fetchLessons()
            setShowCreateLesson(false)
          }}
        />
      )}
    </div>
  )
}

