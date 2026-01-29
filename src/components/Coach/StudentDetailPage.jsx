import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { supabaseAdmin } from '../../supabaseAdmin'
import { ArrowLeft, Mail, Phone, Award, Calendar, Target, FileText, MessageSquare, Edit2, TrendingUp, CreditCard, Link2, UserCheck, UserX, DollarSign, Check, X, Trash2, Users } from 'lucide-react'
// Anthropic API calls are now handled server-side via Netlify functions
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'
import StudentPracticePlans from './StudentPracticePlans'
import NewConversationModal from '../Messaging/NewConversationModal'
import ProgressChart, { OverallProgressSummary } from '../Progress/ProgressChart'
import AddPackageModal from '../Payments/AddPackageModal'
import PackageHistory from '../Payments/PackageHistory'
import MergeHistoricalModal from '../History/MergeHistoricalModal'
import MergeProfilesModal from './MergeProfilesModal'
import SelectProfileModal from './SelectProfileModal'
import BookLessonModal from '../Calendar/BookLessonModal'
import CreateLessonModal from '../Calendar/CreateLessonModal'
import { MILESTONES, GOAL_OPTIONS, getMilestonesByLevel } from '../DevelopmentPlan/MilestonesConstants'
import { safeJsonParse } from '../../utils/safeJsonParse'
import { logger } from '../../utils/logger'
import { retrySupabaseQuery } from '../../utils/retry'
import ReferralCelebrationModal from '../Referrals/ReferralCelebrationModal'
import CoachLayout from '../Layout/CoachLayout'
import { useToast, ToastContainer } from '../shared/Toast'
import ConfirmationModal from '../shared/ConfirmationModal'
import LinkPartnerModal from './LinkPartnerModal'
import './StudentDetailPage.css'

export default function StudentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingStudent, setDeletingStudent] = useState(false)
  const [selectedProfileToMerge, setSelectedProfileToMerge] = useState(null)
  const [referringStudent, setReferringStudent] = useState(null)
  const [editingLeadSource, setEditingLeadSource] = useState(false)
  const [leadSourceForm, setLeadSourceForm] = useState({ leadSource: '', referredBy: '' })
  const [allStudents, setAllStudents] = useState([])
  const [financialData, setFinancialData] = useState(null)
  const [editingRevenue, setEditingRevenue] = useState(false)
  const [editingLessonsPurchased, setEditingLessonsPurchased] = useState(false)
  const [editingCredits, setEditingCredits] = useState(false)
  const [savingRevenue, setSavingRevenue] = useState(false)
  const [savingLessonsPurchased, setSavingLessonsPurchased] = useState(false)
  const [savingCredits, setSavingCredits] = useState(false)
  const [editRevenueValue, setEditRevenueValue] = useState('')
  const [editLessonsPurchasedValue, setEditLessonsPurchasedValue] = useState('')
  const [editCreditsValue, setEditCreditsValue] = useState('')
  const [focusAreas, setFocusAreas] = useState([])
  const [editingFocusArea, setEditingFocusArea] = useState(null)
  const [newFocusAreaText, setNewFocusAreaText] = useState('')
  const [showAddFocusArea, setShowAddFocusArea] = useState(false)
  const [showReferralCelebration, setShowReferralCelebration] = useState(false)
  const [referralCelebrationData, setReferralCelebrationData] = useState({
    referrerName: '',
    referredName: '',
    referrerId: ''
  })
  const { toasts, showToast, removeToast } = useToast()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState(null)
  const [showLinkPartnerModal, setShowLinkPartnerModal] = useState(false)
  const [pairedPartner, setPairedPartner] = useState(null)
  const [editingLesson, setEditingLesson] = useState(false)
  const [lessonEditForm, setLessonEditForm] = useState({
    lesson_date: '',
    lesson_time: '',
    location: '',
    status: '',
    lesson_plan: '',
    coach_feedback: '',
    student_learnings: ''
  })
  const [savingLesson, setSavingLesson] = useState(false)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [refiningPlan, setRefiningPlan] = useState(false)
  const [refinementFeedback, setRefinementFeedback] = useState('')
  
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
    fetchFocusAreas()
  }, [id])

  // Read URL parameters to set active tab and edit mode
  useEffect(() => {
    const tab = searchParams.get('tab')
    const edit = searchParams.get('edit')
    
    if (tab) {
      setActiveTab(tab)
    }
    
    if (edit === 'true' && tab === 'plan') {
      setEditingPlan(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (student?.referred_by_student_id) {
      fetchReferringStudent()
    }
  }, [student?.referred_by_student_id])

  const fetchReferringStudent = async () => {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', student.referred_by_student_id)
      .single()
    
    setReferringStudent(data)
  }

  const fetchAllStudents = async () => {
    // Fetch students and profiles separately to avoid relationship ambiguity
    const { data: studentsData } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('is_active', true)
      .order('id')
    
    if (studentsData) {
      const studentIds = studentsData.map(s => s.id)
      const { data: profilesData } = await supabaseAdmin
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
      const { data: lessonTransactions } = await supabaseAdmin
        .from('lesson_transactions')
        .select('transaction_date, transaction_type')
        .eq('student_id', id)
        .eq('transaction_type', 'lesson_taken')
        .order('transaction_date', { ascending: true })
      
      const lessonDates = (lessonTransactions || []).map(t => t.transaction_date).filter(Boolean)
      
      // Fetch payment transactions to calculate revenue from transactions
      const { data: paymentTransactions } = await supabaseAdmin
        .from('lesson_transactions')
        .select('amount_paid, package_size, transaction_date')
        .eq('student_id', id)
        .eq('transaction_type', 'package_purchase')
        .order('transaction_date', { ascending: true })
      
      // Calculate revenue from payment transactions
      const revenueFromTransactions = (paymentTransactions || []).reduce((sum, t) => {
        const amount = parseFloat(t.amount_paid || 0)
        return sum + (isNaN(amount) ? 0 : amount)
      }, 0)
      
      // Calculate total lessons purchased from payment transactions
      const lessonsPurchasedFromTransactions = (paymentTransactions || []).reduce((sum, t) => {
        const size = parseInt(t.package_size || 0, 10)
        return sum + (isNaN(size) ? 0 : size)
      }, 0)
      
      // Use student.total_revenue and total_lessons_purchased as fallback, but prefer transaction data
      // This ensures we're always in sync with actual transactions
      const totalRevenue = revenueFromTransactions > 0 ? revenueFromTransactions : parseFloat(student.total_revenue || 0)
      const totalLessonsPurchased = lessonsPurchasedFromTransactions > 0 ? lessonsPurchasedFromTransactions : (student.total_lessons_purchased || 0)
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
      logger.error('Error fetching financial data:', error)
    }
  }

  const handleSaveRevenue = async () => {
    setSavingRevenue(true)
    try {
      const revenue = parseFloat(editRevenueValue) || 0
      const { error } = await retrySupabaseQuery(() =>
        supabaseAdmin
          .from('students')
          .update({ total_revenue: revenue })
          .eq('id', id)
      )

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
      logger.error('Error saving revenue:', error)
      showToast('Error saving revenue: ' + error.message, 'error')
    } finally {
      setSavingRevenue(false)
    }
  }

  const handleSaveLessonsPurchased = async () => {
    setSavingLessonsPurchased(true)
    try {
      const lessonsPurchased = parseInt(editLessonsPurchasedValue) || 0
      const { error } = await retrySupabaseQuery(() =>
        supabaseAdmin
          .from('students')
          .update({ total_lessons_purchased: lessonsPurchased })
          .eq('id', id)
      )

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
      logger.error('Error saving lessons purchased:', error)
      showToast('Error saving lessons purchased: ' + error.message, 'error')
    } finally {
      setSavingLessonsPurchased(false)
    }
  }

  const handleSaveCredits = async () => {
    setSavingCredits(true)
    try {
      const credits = parseInt(editCreditsValue) || 0
      const { error } = await retrySupabaseQuery(() =>
        supabaseAdmin
          .from('students')
          .update({ lesson_credits: credits })
          .eq('id', id)
      )

      if (error) throw error

      // Update local state
      setStudent(prev => ({ ...prev, lesson_credits: credits }))
      setFinancialData(prev => ({ ...prev, lessonCredits: credits }))
      setEditingCredits(false)
    } catch (error) {
      logger.error('Error saving credits:', error)
      showToast('Error saving credits: ' + error.message, 'error')
    } finally {
      setSavingCredits(false)
    }
  }

  useEffect(() => {
    if (student && activeTab === 'financial') {
      fetchFinancialData()
    }
  }, [student, activeTab, id, student?.total_revenue, student?.total_lessons_purchased, student?.lesson_credits])

  const fetchStudentData = async () => {
    try {
      logger.debug('=== FETCHING STUDENT DATA (COACH) ===')
      logger.debug('Student ID:', id)
      
      if (!id) {
        logger.error('No student ID provided')
        setLoading(false)
        return
      }
      
      // Check if supabaseAdmin is available
      if (!supabaseAdmin) {
        logger.error('Supabase admin client not available. Check environment variables.')
        showToast('Configuration error: Supabase admin client not available. Please check environment variables.', 'error')
        setLoading(false)
        return
      }
      
      // Fetch student and profile separately to avoid relationship ambiguity
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (studentError) {
        logger.error('Fetch error:', studentError)
        logger.error('Error code:', studentError.code)
        logger.error('Error message:', studentError.message)
        logger.error('Error details:', studentError.details)
        
        // Handle 406/PGRST116 error - student not found
        if (studentError.code === 'PGRST116' || studentError.message?.includes('0 rows') || studentError.message?.includes('not found')) {
          logger.warn('Student not found - may have been deleted')
          showToast('Student not found. They may have been deleted. Redirecting...', 'warning')
          setTimeout(() => {
            navigate('/coach/students')
          }, 2000)
          setLoading(false)
          return
        }
        
        // Handle 406 error specifically
        if (studentError.code === 'PGRST301' || studentError.message?.includes('406') || studentError.message?.includes('Not Acceptable')) {
          logger.error('406 Not Acceptable error - this usually means:')
          logger.error('1. Supabase client not properly initialized')
          logger.error('2. Missing or incorrect environment variables')
          logger.error('3. API endpoint configuration issue')
          showToast('Error loading student data. Please check that Supabase environment variables are properly configured.', 'error')
        }
        
        throw studentError
      }

      const { data: profileData, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('full_name, email, ntrp_level, phone')
        .eq('id', id)
        .single()
      
      if (profileError) {
        logger.warn('Error fetching profile (non-critical):', profileError.message)
        // Continue without profile data
      }

      const data = { ...studentData, profiles: profileData }

      logger.debug('Fetch response:', { data })
      
      logger.debug('Student data fetched:', data)
      logger.debug('Development plan in fetched data:', data?.development_plan)
      logger.debug('Development plan type:', typeof data?.development_plan)
      
      if (data?.development_plan) {
        try {
          const parsed = typeof data.development_plan === 'string'
            ? safeJsonParse(data.development_plan, data.development_plan)
            : data.development_plan
          logger.debug('Parsed development plan:', parsed)
        } catch (parseError) {
          logger.error('Error parsing development plan:', parseError)
        }
      }
      
      setStudent(data)
      setPrivateNotes(data.private_coach_notes || '')
      
      // Fetch paired partner info if exists
      if (data.paired_with_id) {
        try {
          // Fetch student and profile separately to avoid relationship ambiguity
          const { data: partnerStudentData, error: partnerStudentError } = await supabaseAdmin
            .from('students')
            .select('id')
            .eq('id', data.paired_with_id)
            .single()
          
          if (partnerStudentError) {
            logger.warn('Error fetching paired partner student:', partnerStudentError.message)
            setPairedPartner(null)
          } else if (partnerStudentData) {
            // Fetch profile separately
            const { data: partnerProfileData, error: partnerProfileError } = await supabaseAdmin
              .from('profiles')
              .select('id, full_name, email')
              .eq('id', data.paired_with_id)
              .single()
            
            if (partnerProfileError) {
              logger.warn('Error fetching paired partner profile:', partnerProfileError.message)
              setPairedPartner(null)
            } else {
              setPairedPartner({
                ...partnerStudentData,
                profiles: partnerProfileData
              })
            }
          } else {
            setPairedPartner(null)
          }
        } catch (error) {
          logger.warn('Error fetching paired partner:', error)
          setPairedPartner(null)
        }
      } else {
        setPairedPartner(null)
      }
      
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
      logger.debug('=== FETCH COMPLETE (COACH) ===')
    } catch (error) {
      logger.error('Error fetching student:', error)
      setLoading(false)
    }
  }

  const fetchLessons = async () => {
    try {
      const { data, error } = await supabaseAdmin
        .from('lessons')
        .select('*')
        .eq('student_id', id)
        .order('lesson_date', { ascending: false })

      if (error) throw error
      setLessons(data || [])
    } catch (error) {
      logger.error('Error fetching lessons:', error)
    }
  }

  const fetchFocusAreas = async () => {
    if (!id) return
    try {
      const { data, error } = await supabaseAdmin
        .from('student_focus_areas')
        .select('*')
        .eq('student_id', id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setFocusAreas(data || [])
    } catch (error) {
      logger.error('Error fetching focus areas:', error)
    }
  }

  const createFocusArea = async () => {
    if (!newFocusAreaText.trim()) {
      showToast('Please enter a focus area', 'warning')
      return
    }

    if (!id) {
      showToast('Student ID is missing', 'error')
      return
    }

    try {
      let userId = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id
      } catch (authError) {
        logger.warn('Could not get user ID:', authError)
        // Continue without user ID - created_by can be null
      }

      const { data, error } = await supabaseAdmin
        .from('student_focus_areas')
        .insert({
          student_id: id,
          area_text: newFocusAreaText.trim(),
          created_by: userId
        })
        .select()
        .single()

      if (error) throw error

      setFocusAreas(prev => [data, ...prev])
      setNewFocusAreaText('')
      setShowAddFocusArea(false)
    } catch (error) {
      logger.error('Error creating focus area:', error)
      showToast('Error creating focus area: ' + error.message, 'error')
    }
  }

  const updateFocusArea = async (focusAreaId, newText) => {
    if (!newText.trim()) {
      showToast('Focus area cannot be empty', 'warning')
      return
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('student_focus_areas')
        .update({ area_text: newText.trim() })
        .eq('id', focusAreaId)
        .select()
        .single()

      if (error) throw error

      setFocusAreas(prev => prev.map(fa => fa.id === focusAreaId ? data : fa))
      setEditingFocusArea(null)
    } catch (error) {
      logger.error('Error updating focus area:', error)
      showToast('Error updating focus area: ' + error.message, 'error')
    }
  }

  const deleteFocusArea = async (focusAreaId) => {
    setConfirmModalConfig({
      title: 'Delete Focus Area',
      message: 'Are you sure you want to delete this focus area?',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabaseAdmin
            .from('student_focus_areas')
            .delete()
            .eq('id', focusAreaId)

          if (error) throw error

          setFocusAreas(prev => prev.filter(fa => fa.id !== focusAreaId))
          showToast('Focus area deleted successfully', 'success')
        } catch (error) {
          logger.error('Error deleting focus area:', error)
          showToast('Error deleting focus area: ' + error.message, 'error')
        }
      }
    })
    setShowConfirmModal(true)
  }

  const toggleFocusAreaResolved = async (focusAreaId, currentStatus) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('student_focus_areas')
        .update({ is_resolved: !currentStatus })
        .eq('id', focusAreaId)
        .select()
        .single()

      if (error) throw error

      setFocusAreas(prev => prev.map(fa => fa.id === focusAreaId ? data : fa))
    } catch (error) {
      logger.error('Error toggling focus area resolved status:', error)
      showToast('Error updating focus area: ' + error.message, 'error')
    }
  }

  const handleDeleteLesson = async (lessonId, e) => {
    e.stopPropagation() // Prevent opening lesson detail modal
    
    setConfirmModalConfig({
      title: 'Delete Lesson',
      message: 'Are you sure you want to delete this lesson? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabaseAdmin
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
          
          fetchStudentData() // Refresh data
          showToast('Lesson deleted successfully', 'success')
        } catch (error) {
          logger.error('Error deleting lesson:', error)
          showToast('Error deleting lesson: ' + error.message, 'error')
        }
      }
    })
    setShowConfirmModal(true)
  }

  const savePrivateNotes = async () => {
    try {
      const { error } = await supabaseAdmin
        .from('students')
        .update({ private_coach_notes: privateNotes })
        .eq('id', id)

      if (error) throw error
      
      setEditingNotes(false)
      // Update the local student state
      setStudent(prev => ({ ...prev, private_coach_notes: privateNotes }))
      
    } catch (error) {
      logger.error('Error saving notes:', error)
      showToast('Error saving notes: ' + error.message, 'error')
    }
  }

  // Helper to strip markdown formatting
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

  const handleSaveLesson = async () => {
    if (!selectedLesson) return

    setSavingLesson(true)
    try {
      // Combine date and time into a single datetime
      const lessonDateTime = new Date(`${lessonEditForm.lesson_date}T${lessonEditForm.lesson_time}`)
      
      // Parse student_learnings if it's a JSON string
      let parsedLearnings = lessonEditForm.student_learnings
      if (lessonEditForm.student_learnings) {
        try {
          // Try to parse as JSON
          const parsed = JSON.parse(lessonEditForm.student_learnings)
          parsedLearnings = parsed
        } catch (e) {
          // If it's not valid JSON, keep as string
          parsedLearnings = lessonEditForm.student_learnings
        }
      }

      const { error } = await supabaseAdmin
        .from('lessons')
        .update({
          lesson_date: lessonDateTime.toISOString(),
          location: lessonEditForm.location,
          status: lessonEditForm.status,
          lesson_plan: lessonEditForm.lesson_plan,
          coach_feedback: lessonEditForm.coach_feedback,
          student_learnings: parsedLearnings
        })
        .eq('id', selectedLesson.id)

      if (error) throw error

      // Update local state
      setLessons(prev => prev.map(lesson => 
        lesson.id === selectedLesson.id 
          ? { ...lesson, ...lessonEditForm, lesson_date: lessonDateTime.toISOString() }
          : lesson
      ))

      setEditingLesson(false)
      setSelectedLesson(null)
      setLessonEditForm({
        lesson_date: '',
        lesson_time: '',
        location: '',
        status: '',
        lesson_plan: '',
        coach_feedback: '',
        student_learnings: ''
      })
    } catch (error) {
      logger.error('Error saving lesson:', error)
      showToast('Error saving lesson: ' + error.message, 'error')
    } finally {
      setSavingLesson(false)
    }
  }

  const handleGenerateLessonPlan = async () => {
    if (!selectedLesson || !id) return

    setGeneratingPlan(true)
    try {
      // Fetch student and profile separately to avoid ambiguous relationship error
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', id)
        .single()

      if (studentError) throw studentError
      if (!student) throw new Error('Student not found')

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single()

      if (profileError) {
        console.warn('Profile fetch error (non-critical):', profileError)
      }

      // Combine student and profile data
      const studentData = {
        ...student,
        profiles: profile
      }

      const studentName = profile?.full_name || 'Student'
      const playerLevel = studentData.player_level || 'beginner'
      
      // Parse development plan
      let developmentPlan = null
      if (studentData.development_plan) {
        try {
          developmentPlan = typeof studentData.development_plan === 'string'
            ? JSON.parse(studentData.development_plan)
            : studentData.development_plan
        } catch (e) {
          logger.warn('Error parsing development plan:', e)
        }
      }

      // Get milestones using helper function
      const milestones = getMilestonesByLevel(playerLevel)
      
      // Get achieved milestones
      const { data: achievedMilestonesData, error: achievedMilestonesError } = await supabaseAdmin
        .from('student_milestones')
        .select('milestone_number, milestone_name, achieved_at')
        .eq('student_id', id)
        .eq('milestone_level', playerLevel)

      if (achievedMilestonesError) throw achievedMilestonesError
      
      const achievedMilestones = achievedMilestonesData || []
      const achievedMilestoneNumbers = achievedMilestones.map(m => m.milestone_number)

      // Find next milestone
      let nextMilestone = null
      let targetMilestoneForGoal = 30
      
      if (developmentPlan?.section1?.bigGoal) {
        const goal = GOAL_OPTIONS.find(g => g.value === developmentPlan.section1.bigGoal)
        if (goal) {
          targetMilestoneForGoal = goal.targetMilestone
        }
      }

      for (const milestone of milestones) {
        if (!achievedMilestoneNumbers.includes(milestone.number)) {
          nextMilestone = {
            number: milestone.number,
            name: milestone.name,
            description: milestone.description,
            targetForGoal: targetMilestoneForGoal
          }
          break
        }
      }

      if (!nextMilestone && milestones.length > 0) {
        const lastMilestone = milestones[milestones.length - 1]
        nextMilestone = {
          number: lastMilestone.number,
          name: lastMilestone.name,
          description: lastMilestone.description,
          targetForGoal: targetMilestoneForGoal
        }
      }

      // Get last lesson's learnings
      const { data: lastLessonData } = await supabaseAdmin
        .from('lessons')
        .select('student_learnings')
        .eq('student_id', id)
        .eq('status', 'completed')
        .order('lesson_date', { ascending: false })
        .limit(1)
        .single()

      const lastLessonLearnings = lastLessonData?.student_learnings || null

      // Get recent lesson plans
      const { data: recentLessonsData } = await supabaseAdmin
        .from('lessons')
        .select('lesson_plan')
        .eq('student_id', id)
        .eq('status', 'completed')
        .not('lesson_plan', 'is', null)
        .order('lesson_date', { ascending: false })
        .limit(2)

      const pastLessonPlans = (recentLessonsData || [])
        .map(l => l.lesson_plan)
        .filter(Boolean)

      // Call Netlify function
      // Automatically use test mode when running locally (localhost)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const functionUrl = isLocalhost 
        ? '/.netlify/functions/generate-lesson-plan?test=true'
        : '/.netlify/functions/generate-lesson-plan'
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentName,
          playerLevel: playerLevel,
          developmentPlan: developmentPlan,
          currentMilestones: achievedMilestoneNumbers,
          nextMilestone: nextMilestone,
          lastLessonLearnings: lastLessonLearnings,
          pastLessonPlans: pastLessonPlans
        })
      })

      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.error) {
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message
            } else {
              errorMessage = JSON.stringify(errorData.error)
            }
          }
        } catch (e) {
          const text = await response.text().catch(() => '')
          if (text) errorMessage = text
        }
        
        if (response.status === 403 || response.status === 500) {
          errorMessage += '\n\nMake sure you are running with "netlify dev" (not "npm run dev") if testing locally, or test on the deployed site.'
        }
        
        throw new Error(errorMessage)
      }

      const { studentPlan: generatedStudentPlan, coachPlan: generatedCoachPlan } = await response.json()

      // Update the lesson plan in the form
      const generatedPlan = stripMarkdown(generatedCoachPlan || generatedStudentPlan)
      setLessonEditForm(prev => ({ ...prev, lesson_plan: generatedPlan }))
    } catch (error) {
      console.error('Error generating lesson plan:', error)
      showToast('Error generating lesson plan: ' + error.message + '. Make sure the Netlify function is properly configured.', 'error')
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleRefinePlan = async () => {
    if (!selectedLesson || !refinementFeedback.trim()) {
      showToast('Please provide refinement feedback', 'warning')
      return
    }

    setRefiningPlan(true)
    try {
      // Call secure Netlify function instead of direct API call
      const functionUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8888/.netlify/functions/refine-lesson-plan'
        : '/.netlify/functions/refine-lesson-plan'

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPlan: lessonEditForm.lesson_plan,
          feedback: refinementFeedback
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const refinedPlan = data.lessonPlan || data.refinedPlan

      if (!refinedPlan) {
        throw new Error('No refined plan returned from server')
      }

      // Update the lesson plan in the form
      setLessonEditForm(prev => ({ ...prev, lesson_plan: stripMarkdown(refinedPlan) }))
      setRefinementFeedback('')
      showToast('Lesson plan refined successfully!', 'success')
    } catch (error) {
      console.error('Error refining lesson plan:', error)
      showToast('Error refining lesson plan: ' + (error.message || 'Please try again'), 'error')
    } finally {
      setRefiningPlan(false)
    }
  }

  const handleSaveDevelopmentPlan = async (planData) => {
    try {
      logger.debug('=== COACH SAVE DEVELOPMENT PLAN STARTING ===')
      logger.debug('Plan data being saved:', planData)
      logger.debug('Student ID:', id)
      
      // Ensure development_plan is properly formatted as JSON string
      const updateData = {
        development_plan: typeof planData.development_plan === 'string' 
          ? planData.development_plan 
          : JSON.stringify(planData.development_plan),
        development_plan_notes: planData.development_plan_notes || undefined
      }

      logger.debug('Formatted update data:', updateData)

      const { data, error } = await supabaseAdmin
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()

      logger.debug('Save response:', { data, error })

      if (error) {
        logger.error('Database error:', error)
        showToast('Failed to save: ' + error.message, 'error')
        return
      }

      logger.debug('Save successful, returned data:', data)

      // Verify the save
      const { data: verifyData, error: verifyError } = await supabaseAdmin
        .from('students')
        .select('development_plan, development_plan_notes')
        .eq('id', id)
        .single()

      if (verifyError) {
        logger.error('Verification failed:', verifyError)
      } else {
        logger.debug('Verification successful - data in DB:', verifyData)
        if (!verifyData?.development_plan) {
          logger.warn('WARNING: Data did not save to database!')
          showToast('WARNING: Data did not save properly. Please try again.', 'warning')
          return
        }
      }

      showToast('Development plan saved successfully!', 'success')
      setEditingPlan(false)
      
      // Force refresh student data
      await fetchStudentData()
    } catch (error) {
      logger.error('Unexpected error:', error)
      showToast('Error saving plan: ' + error.message, 'error')
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
      
      // Update profiles table with retry logic
      const { error: profileError } = await retrySupabaseQuery(() =>
        supabaseAdmin
          .from('profiles')
          .update({
            full_name: fullName,
            email: profileFormData.email,
            phone: profileFormData.phone,
            ntrp_level: profileFormData.ntrp_level
          })
          .eq('id', id)
      )

      if (profileError) throw profileError

      // Update students table (lesson_credits) with retry logic
      const { error: studentError } = await retrySupabaseQuery(() =>
        supabaseAdmin
          .from('students')
          .update({
            lesson_credits: profileFormData.lesson_credits
          })
          .eq('id', id)
      )

      if (studentError) throw studentError

      showToast('Student information updated successfully!', 'success')
      setEditingProfile(false)
      await fetchStudentData() // Refresh to show updated data
    } catch (error) {
      logger.error('Error saving profile:', error)
      showToast('Error saving profile: ' + error.message, 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const toggleActiveStatus = async () => {
    try {
      const newStatus = !student.is_active
      const { error } = await supabaseAdmin
        .from('students')
        .update({ is_active: newStatus })
        .eq('id', id)

      if (error) throw error
      
      setStudent(prev => ({ ...prev, is_active: newStatus }))
      showToast(`Student marked as ${newStatus ? 'Active' : 'Inactive'}`, 'success')
    } catch (error) {
      logger.error('Error toggling status:', error)
      showToast('Error updating status: ' + error.message, 'error')
    }
  }

  const handleUnlinkPartner = async () => {
    setConfirmModalConfig({
      isOpen: true,
      title: 'Unlink Semi-Private Pair',
      message: `Unlink this semi-private pair? Both students will return to individual lessons.`,
      confirmText: 'Unlink',
      cancelText: 'Cancel',
      type: 'warning',
      onConfirm: async () => {
        try {
          const partnerId = student.paired_with_id

          // Unlink current student
          const { error: error1 } = await supabaseAdmin
            .from('students')
            .update({
              paired_with_id: null,
              is_primary_for_pair: false
            })
            .eq('id', student.id)

          if (error1) throw error1

          // Unlink partner
          const { error: error2 } = await supabaseAdmin
            .from('students')
            .update({
              paired_with_id: null,
              is_primary_for_pair: false
            })
            .eq('id', partnerId)

          if (error2) throw error2

          showToast('Students unlinked successfully!', 'success')
          setConfirmModalConfig(null)
          fetchStudentData() // Refresh
        } catch (error) {
          console.error('Error unlinking:', error)
          showToast('Error unlinking students: ' + error.message, 'error')
          setConfirmModalConfig(null)
        }
      },
      onClose: () => setConfirmModalConfig(null)
    })
  }

  const handleDeleteStudent = async () => {
    if (!student || deletingStudent) return // Prevent multiple clicks
    
    setDeletingStudent(true)
    try {
      const studentId = student.id
      
      if (!studentId) {
        throw new Error('No student ID available. Please refresh the page and try again.')
      }
      
      logger.debug('Starting deletion process for student:', studentId)
      logger.debug('Student data before deletion:', { id: student.id, name: student.profiles?.full_name })
      
      // Verify student exists before attempting deletion
      const { data: verifyStudent, error: verifyError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', studentId)
        .maybeSingle()
      
      if (verifyError) {
        logger.warn('Error verifying student exists:', verifyError)
        // Continue anyway - might be a transient error
      } else if (!verifyStudent) {
        throw new Error('Student not found. They may have already been deleted. Refreshing page...')
      }
      
      // Delete user and all related records via Netlify function
      logger.debug('Calling delete-auth-user function...')
      const functionUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:8888/.netlify/functions/delete-auth-user'
        : '/.netlify/functions/delete-auth-user'
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: studentId })
      })

      // Check if response has content before parsing JSON
      const text = await response.text()
      logger.debug('Delete user response status:', response.status)
      logger.debug('Delete user response text:', text.substring(0, 500)) // Limit log size

      if (response.status === 404) {
        throw new Error('Netlify function not found. If testing locally, use "netlify dev" instead of "npm run dev". Or test on the deployed site.')
      }

      if (!text) {
        throw new Error('Empty response from delete-auth-user function. Check Netlify function logs.')
      }

      let result = safeJsonParse(text, null)
      
      if (!result) {
        logger.error('Failed to parse JSON response. Response text was:', text)
        throw new Error(`Invalid response from server: ${text.substring(0, 100)}`)
      }

      if (!response.ok) {
        logger.error('Error deleting user - Full error object:', result)
        
        // Provide more helpful error messages
        let errorMessage = result.error || result.details || 'Unknown error'
        
        // Check for specific error types
        if (result.code === 'database_constraint_error' || result.remainingReferences) {
          const refs = result.remainingReferences || []
          errorMessage = `Failed to delete: Database constraint error. Remaining references: ${refs.join(', ')}. Please check Netlify function logs for details.`
        } else if (result.code === 'unexpected_failure' || result.details?.includes('Database error')) {
          errorMessage = `Database error during deletion. ${result.details || 'Check Netlify function logs for details.'}`
          if (result.remainingReferences && result.remainingReferences.length > 0) {
            errorMessage += ` Remaining references: ${result.remainingReferences.join(', ')}`
          }
        } else if (result.details && result.details.includes('configuration')) {
          errorMessage = 'Server configuration error. Please contact support or check Netlify environment variables.'
        } else if (result.details && result.details.includes('not configured')) {
          errorMessage = 'Server configuration error. Please contact support.'
        } else if (result.code === 'PGRST116' || result.details?.includes('not found')) {
          errorMessage = 'User not found. They may have already been deleted.'
        } else if (result.details) {
          errorMessage = `Failed to delete user: ${result.details}`
        }
        
        throw new Error(errorMessage)
      }

      logger.debug('User deletion result:', result)
      
      // Handle partial success (all app data deleted but auth user deletion failed)
      if (result.partial === true) {
        logger.warn('Partial deletion success:', result)
        showToast(
          result.warning || 'Student data deleted, but auth user deletion failed. Student is removed from the app.',
          'warning'
        )
        // Still navigate away since the student is effectively deleted from the app
        navigate('/coach/students')
        return
      }
      
      // Full success
      logger.debug('User and all related records deleted successfully:', result)
      logger.debug('Student deletion completed successfully')
      
      // Show success message with any warnings
      if (result.verification && (result.verification.studentsRemaining > 0 || result.verification.profilesRemaining > 0)) {
        showToast('Student deleted, but some records may remain. Check logs for details.', 'warning')
      } else {
        showToast('Student profile deleted successfully', 'success')
      }
      
      navigate('/coach/students')
    } catch (error) {
      logger.error('Error deleting student:', error)
      logger.error('Error stack:', error.stack)
      
      // Show detailed error message
      const errorMsg = error.message || 'Unknown error occurred'
      showToast(`Error deleting student: ${errorMsg}`, 'error')
      
      // If student not found, refresh the page
      if (error.message?.includes('not found') || error.message?.includes('already been deleted')) {
        setTimeout(() => {
          navigate('/coach/students')
        }, 2000)
      }
    } finally {
      setDeletingStudent(false)
      setShowDeleteConfirm(false)
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
        
        // Trigger referral celebration modal
        const studentProfile = student?.profiles || {}
        const referredName = studentProfile.full_name || 'A student'
        triggerReferralCelebration(leadSourceForm.referredBy, referredName)
      } else {
        setReferringStudent(null)
      }
    } catch (error) {
      logger.error('Error saving lead source:', error)
      showToast('Error saving: ' + error.message, 'error')
    }
  }

  const triggerReferralCelebration = async (referrerId, referredName) => {
    try {
      // Get referrer's profile
      const { data: referrerProfile, error } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', referrerId)
        .single()

      if (error) throw error

      setReferralCelebrationData({
        referrerName: referrerProfile.full_name || 'A student',
        referredName: referredName,
        referrerId: referrerId
      })
      setShowReferralCelebration(true)
    } catch (error) {
      console.error('Error loading referrer data:', error)
      showToast('Could not load referrer information', 'warning')
    }
  }

  const leadSourceOptions = [
    'Referral', 'Groupon', 'Findtennislessons', 'Playyourcourt', 
    'In Person', 'TeachMe', 'Thumbtack', 'Facebook', 'Instagram', 
    'Google', 'Website', 'Other'
  ]

  if (loading) {
    return (
      <CoachLayout>
        <div className="page-container">Loading...</div>
      </CoachLayout>
    )
  }

  if (!student) {
    return (
      <CoachLayout>
        <div className="page-container">Student not found</div>
      </CoachLayout>
    )
  }

  const developmentPlan = student.development_plan 
    ? (typeof student.development_plan === 'string' 
        ? safeJsonParse(student.development_plan, student.development_plan) 
        : student.development_plan)
    : null

  const upcomingLessons = lessons.filter(l => l.status === 'scheduled' && new Date(l.lesson_date) > new Date())
  const pastLessons = lessons.filter(l => l.status === 'completed' || new Date(l.lesson_date) < new Date())

  return (
    <CoachLayout>
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
                      <button 
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#dc3545',
                          borderColor: '#dc3545'
                        }}
                      >
                        <Trash2 size={18} />
                        Delete Profile
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

                {/* Semi-Private Pairing Status */}
                {student?.paired_with_id && pairedPartner ? (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#f0f7ff',
                    border: '2px solid #4B2C6C',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Users size={24} style={{ color: 'var(--color-primary)' }} />
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '16px', marginBottom: '4px' }}>
                          👥 Semi-Private Pair
                        </div>
                        <div style={{ fontSize: '14px', color: '#666' }}>
                          Paired with <strong>{pairedPartner.profiles?.full_name}</strong>
                          {student.is_primary_for_pair && (
                            <span style={{ 
                              marginLeft: '8px',
                              padding: '2px 8px',
                              backgroundColor: 'var(--color-secondary)',
                              color: 'white',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              PRIMARY (Pays)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={handleUnlinkPartner}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: '#F44336'
                      }}
                    >
                      <X size={16} />
                      Unlink
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn btn-outline"
                    onClick={() => setShowLinkPartnerModal(true)}
                    style={{
                      marginBottom: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Link2 size={18} />
                    Link Semi-Private Partner
                  </button>
                )}

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
                    const { error } = await supabaseAdmin
                      .from('students')
                      .update({ player_level: newLevel })
                      .eq('id', student.id)
                    
                    if (!error) {
                      // Refresh student data
                      fetchStudentData()
                      showToast(`Player level updated to ${newLevel}`, 'success')
                    } else {
                      logger.error('Error updating player level:', error)
                      showToast('Error updating player level', 'error')
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

            {/* Target Milestone Display - Same as Student View */}
            {(() => {
              try {
                const plan = typeof student.development_plan === 'string' 
                  ? safeJsonParse(student.development_plan, student.development_plan)
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
                  <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
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

            {upcomingLessons.length > 0 && (
              <div className="section">
                <h3>Upcoming Lessons</h3>
                <div className="lessons-list">
                  {upcomingLessons.map(lesson => (
                    <div 
                      key={lesson.id} 
                      className="lesson-item"
                      onClick={() => setSelectedLesson(lesson)}
                      style={{ cursor: 'pointer' }}
                    >
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
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteLesson(lesson.id, e)
                          }}
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

            {/* Practice Plan Completion Tracking */}
            <StudentPracticePlans studentId={id} />

            {/* Areas to Focus On */}
            <div className="section" style={{ marginTop: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3>🎯 Areas to Focus On</h3>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowAddFocusArea(true)
                    setNewFocusAreaText('')
                  }}
                  style={{ fontSize: '14px', padding: '8px 16px' }}
                >
                  + Add Area
                </button>
              </div>

              {/* Add New Focus Area Form */}
              {showAddFocusArea && (
                <div style={{ 
                  padding: '16px', 
                  backgroundColor: '#f9fafb', 
                  borderRadius: '8px', 
                  marginBottom: '16px',
                  border: '1px solid #e5e7eb'
                }}>
                  <textarea
                    value={newFocusAreaText}
                    onChange={(e) => setNewFocusAreaText(e.target.value)}
                    placeholder="Enter an area for the student to focus on..."
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      padding: '12px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      marginBottom: '12px'
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-outline"
                      onClick={() => {
                        setShowAddFocusArea(false)
                        setNewFocusAreaText('')
                      }}
                      style={{ fontSize: '14px' }}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={createFocusArea}
                      style={{ fontSize: '14px' }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}

              {/* Active Focus Areas */}
              {focusAreas && focusAreas.filter(fa => !fa.is_resolved).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {focusAreas
                    .filter(fa => !fa.is_resolved)
                    .map(focusArea => (
                      <div
                        key={focusArea.id}
                        style={{
                          padding: '16px',
                          backgroundColor: '#fff5f5',
                          borderRadius: '8px',
                          border: '2px solid #ff6b6b',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}
                      >
                        {editingFocusArea?.id === focusArea.id ? (
                          <div style={{ flex: 1 }}>
                            <textarea
                              value={editingFocusArea.text}
                              onChange={(e) => setEditingFocusArea({ ...editingFocusArea, text: e.target.value })}
                              style={{
                                width: '100%',
                                minHeight: '60px',
                                padding: '8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                fontSize: '14px',
                                fontFamily: 'inherit',
                                resize: 'vertical',
                                marginBottom: '8px'
                              }}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn btn-primary"
                                onClick={() => updateFocusArea(focusArea.id, editingFocusArea.text)}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                Save
                              </button>
                              <button
                                className="btn btn-outline"
                                onClick={() => setEditingFocusArea(null)}
                                style={{ fontSize: '12px', padding: '6px 12px' }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.5' }}>
                                {focusArea.area_text}
                              </p>
                              <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                                Added {new Date(focusArea.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                              <button
                                className="btn-icon"
                                onClick={() => setEditingFocusArea({ id: focusArea.id, text: focusArea.area_text })}
                                title="Edit"
                                style={{ padding: '6px' }}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => toggleFocusAreaResolved(focusArea.id, focusArea.is_resolved)}
                                title="Mark as resolved"
                                style={{ padding: '6px', color: '#10b981' }}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                className="btn-icon-delete"
                                onClick={() => deleteFocusArea(focusArea.id)}
                                title="Delete"
                                style={{ padding: '6px' }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                !showAddFocusArea && (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: '#666',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px dashed #d1d5db'
                  }}>
                    <p style={{ margin: 0 }}>No active focus areas. Click "Add Area" to create one.</p>
                  </div>
                )
              )}

              {/* Resolved Focus Areas (Collapsed) */}
              {focusAreas && focusAreas.filter(fa => fa.is_resolved).length > 0 && (
                <details style={{ marginTop: '16px' }}>
                  <summary style={{ 
                    cursor: 'pointer', 
                    color: '#666', 
                    fontSize: '14px',
                    padding: '8px',
                    userSelect: 'none'
                  }}>
                    Resolved ({focusAreas && focusAreas.filter(fa => fa.is_resolved).length || 0})
                  </summary>
                  <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {focusAreas
                      .filter(fa => fa.is_resolved)
                      .map(focusArea => (
                        <div
                          key={focusArea.id}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f0fdf4',
                            borderRadius: '6px',
                            border: '1px solid #bbf7d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            opacity: 0.8
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <p style={{ margin: 0, fontSize: '14px', textDecoration: 'line-through', color: '#666' }}>
                              {focusArea.area_text}
                            </p>
                            <span style={{ fontSize: '11px', color: '#666' }}>
                              Resolved {focusArea.resolved_at ? new Date(focusArea.resolved_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          <button
                            className="btn-icon"
                            onClick={() => toggleFocusAreaResolved(focusArea.id, focusArea.is_resolved)}
                            title="Mark as active"
                            style={{ padding: '6px', color: '#666' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                </details>
              )}
            </div>
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
                          ? safeJsonParse(student.development_plan, student.development_plan) 
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
                  const { error } = await supabaseAdmin
                    .from('students')
                    .update({ development_plan_notes: newNotes })
                    .eq('id', id)

                  if (error) throw error
                  setStudent({ ...student, development_plan_notes: newNotes })
                } catch (error) {
                  logger.error('Error saving notes:', error)
                  showToast('Error saving notes: ' + error.message, 'error')
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
                      ? safeJsonParse(student.development_plan, student.development_plan) 
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
                        disabled={savingCredits}
                        title="Save"
                        aria-label="Save lesson credits"
                      >
                        {savingCredits ? '...' : <Check size={16} />}
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

                {/* Package History */}
                <div style={{ marginTop: '32px' }}>
                  <PackageHistory studentId={id} />
                </div>
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
        <div className="modal-overlay" onClick={() => {
          setSelectedLesson(null)
          setEditingLesson(false)
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="modal-title">{editingLesson ? 'Edit Lesson' : 'Lesson Details'}</h2>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {!editingLesson && (
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => {
                      const lessonDate = new Date(selectedLesson.lesson_date)
                      setLessonEditForm({
                        lesson_date: lessonDate.toISOString().split('T')[0],
                        lesson_time: lessonDate.toTimeString().slice(0, 5),
                        location: selectedLesson.location || '',
                        status: selectedLesson.status || 'scheduled',
                        lesson_plan: selectedLesson.lesson_plan ? stripMarkdown(selectedLesson.lesson_plan) : '',
                        coach_feedback: selectedLesson.coach_feedback || '',
                        student_learnings: typeof selectedLesson.student_learnings === 'string' 
                          ? selectedLesson.student_learnings 
                          : (selectedLesson.student_learnings ? JSON.stringify(selectedLesson.student_learnings, null, 2) : '')
                      })
                      setRefinementFeedback('')
                      setEditingLesson(true)
                    }}
                    style={{ padding: '6px 12px', fontSize: '14px' }}
                  >
                    <Edit2 size={16} style={{ marginRight: '4px' }} />
                    Edit
                  </button>
                )}
                <button className="modal-close" onClick={() => {
                  setSelectedLesson(null)
                  setEditingLesson(false)
                }}>×</button>
              </div>
            </div>
            <div className="modal-body">
              {editingLesson ? (
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  await handleSaveLesson()
                }}>
                  <div className="lesson-detail-section">
                    <div className="detail-item">
                      <strong>Student:</strong>
                      <span>{student?.profiles?.full_name || 'Unknown'}</span>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                      <div className="form-group">
                        <label>Date <span className="required">*</span></label>
                        <input
                          type="date"
                          value={lessonEditForm.lesson_date}
                          onChange={(e) => setLessonEditForm({...lessonEditForm, lesson_date: e.target.value})}
                          className="input"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label>Time <span className="required">*</span></label>
                        <input
                          type="time"
                          value={lessonEditForm.lesson_time}
                          onChange={(e) => setLessonEditForm({...lessonEditForm, lesson_time: e.target.value})}
                          className="input"
                          required
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Location</label>
                      <input
                        type="text"
                        value={lessonEditForm.location}
                        onChange={(e) => setLessonEditForm({...lessonEditForm, location: e.target.value})}
                        className="input"
                        placeholder="Enter location"
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Status <span className="required">*</span></label>
                      <select
                        value={lessonEditForm.status}
                        onChange={(e) => setLessonEditForm({...lessonEditForm, status: e.target.value})}
                        className="input"
                        required
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Lesson Plan</label>
                      <textarea
                        value={lessonEditForm.lesson_plan}
                        onChange={(e) => setLessonEditForm({...lessonEditForm, lesson_plan: e.target.value})}
                        className="input"
                        rows={6}
                        placeholder="Enter lesson plan manually or generate with AI..."
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                      
                      {/* Generate with AI Button */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleGenerateLessonPlan}
                          disabled={generatingPlan}
                          style={{ flex: 1 }}
                        >
                          {generatingPlan ? '⏳ Generating...' : '✨ Generate with AI'}
                        </button>
                      </div>

                      {/* Refine with AI Section */}
                      {lessonEditForm.lesson_plan && (
                        <div style={{ 
                          marginTop: '20px', 
                          padding: '16px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '8px',
                          border: '1px solid #e0e0e0'
                        }}>
                          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#2D7F6F' }}>
                            ✨ Refine with AI
                          </h3>
                          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#666' }}>
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
                              type="button"
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

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Coach Feedback</label>
                      <textarea
                        value={lessonEditForm.coach_feedback}
                        onChange={(e) => setLessonEditForm({...lessonEditForm, coach_feedback: e.target.value})}
                        className="input"
                        rows={6}
                        placeholder="Enter coach feedback..."
                        style={{ fontFamily: 'inherit', resize: 'vertical' }}
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Student Learnings</label>
                      <textarea
                        value={lessonEditForm.student_learnings}
                        onChange={(e) => setLessonEditForm({...lessonEditForm, student_learnings: e.target.value})}
                        className="input"
                        rows={4}
                        placeholder="Enter student learnings (JSON format or plain text)..."
                        style={{ fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                      />
                      <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                        Can be JSON array or plain text
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e0e0e0' }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => {
                          setEditingLesson(false)
                          setLessonEditForm({
                            lesson_date: '',
                            lesson_time: '',
                            location: '',
                            status: '',
                            lesson_plan: '',
                            coach_feedback: '',
                            student_learnings: ''
                          })
                        }}
                        disabled={savingLesson}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={savingLesson}
                      >
                        {savingLesson ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <>
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
                      {(() => {
                        try {
                          const learnings = typeof selectedLesson.student_learnings === 'string' 
                            ? JSON.parse(selectedLesson.student_learnings)
                            : selectedLesson.student_learnings
                          if (Array.isArray(learnings)) {
                            return learnings.map((learning, idx) => (
                              <div key={idx} style={{ marginBottom: idx < learnings.length - 1 ? '8px' : 0 }}>
                                • {learning}
                              </div>
                            ))
                          }
                          return selectedLesson.student_learnings
                        } catch {
                          return selectedLesson.student_learnings
                        }
                      })()}
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
                      ? safeJsonParse(selectedLesson.metadata, selectedLesson.metadata) 
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
                </>
              )}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div 
          className="modal-overlay" 
          onClick={() => !deletingStudent && setShowDeleteConfirm(false)}
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
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: 600, color: '#1f2937' }}>
                Delete Student Profile
              </h2>
              <p style={{ margin: 0, color: '#6b7280', fontSize: '16px', lineHeight: 1.5 }}>
                Are you sure you want to delete this student profile? This will permanently delete:
              </p>
              <ul style={{ margin: '16px 0 0 20px', color: '#6b7280', fontSize: '14px', lineHeight: 1.8 }}>
                <li>Student profile and all associated data</li>
                <li>All lessons and lesson history</li>
                <li>Development plans and progress</li>
                <li>Their authentication account</li>
              </ul>
              <p style={{ margin: '16px 0 0 0', color: '#dc3545', fontSize: '14px', fontWeight: 600 }}>
                This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-outline"
                onClick={() => !deletingStudent && setShowDeleteConfirm(false)}
                disabled={deletingStudent}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500
                }}
              >
                No, Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleDeleteStudent}
                disabled={deletingStudent}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  backgroundColor: '#dc3545',
                  borderColor: '#dc3545',
                  color: 'white'
                }}
              >
                {deletingStudent ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Referral Celebration Modal */}
      {showReferralCelebration && (
        <ReferralCelebrationModal
          referrerName={referralCelebrationData.referrerName}
          referredName={referralCelebrationData.referredName}
          referrerId={referralCelebrationData.referrerId}
          onClose={() => {
            setShowReferralCelebration(false)
            fetchStudentData() // Refresh to show updated credits
          }}
        />
      )}

      {/* Link Partner Modal */}
      {showLinkPartnerModal && student && (
        <LinkPartnerModal
          student={student}
          onClose={() => setShowLinkPartnerModal(false)}
          onSuccess={() => {
            setShowLinkPartnerModal(false)
            fetchStudentData() // Refresh to show pairing
          }}
        />
      )}
      </div>
    </CoachLayout>
  )
}

