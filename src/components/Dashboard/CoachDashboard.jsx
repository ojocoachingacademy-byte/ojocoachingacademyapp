import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { supabaseAdmin } from '../../supabaseAdmin'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Clock, Plus, Minus, Mail, Phone, Award, Target, MoreVertical, Edit2 } from 'lucide-react'
import Anthropic from '@anthropic-ai/sdk'
import { GOAL_OPTIONS, getMilestonesByLevel } from '../DevelopmentPlan/MilestonesConstants'
import './CoachDashboard.css'
import '../shared/Modal.css'
import LessonTemplates from '../Templates/LessonTemplates'
import LogPaymentModal from '../Coach/LogPaymentModal'
import ReferralCelebrationModal from '../Referrals/ReferralCelebrationModal'
import CoachLayout from '../Layout/CoachLayout'
import { useToast, ToastContainer } from '../shared/Toast'
import ConfirmationModal from '../shared/ConfirmationModal'

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

// Helper to get the next/previous Sunday from a given date
const getNextSunday = (date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? 7 : 7 - day // If Sunday, get next Sunday; else get this coming Sunday
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const getPreviousSunday = (date) => {
  const result = new Date(date)
  const day = result.getDay()
  const diff = day === 0 ? 7 : day // If Sunday, get previous Sunday; else go back to last Sunday
  result.setDate(result.getDate() - diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const getThisSunday = (date) => {
  const result = new Date(date)
  const day = result.getDay()
  if (day === 0) {
    // It's Sunday - return today
    result.setHours(0, 0, 0, 0)
    return result
  }
  // Get this coming Sunday
  const diff = 7 - day
  result.setDate(result.getDate() + diff)
  result.setHours(0, 0, 0, 0)
  return result
}

const isSameDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate()
}

// Get student stage based on lesson count
const getStudentStage = (lessonCount) => {
  if (lessonCount === 0) return { label: '🆕 Pre-Lesson', color: '#9C27B0' }
  if (lessonCount <= 4) return { label: '🆕 New', color: '#2196F3' }
  if (lessonCount <= 19) return { label: '📈 Developing', color: '#FF9800' }
  return { label: '⭐ Established', color: '#4CAF50' }
}

// Calculate revenue for a lesson based on student's package
const getLessonRevenue = (student) => {
  // Default to $80 if no package info
  if (!student?.student_packages?.[0]) return 80
  
  const pkg = student.student_packages[0]
  return pkg.price_per_lesson || 80
}

// Get Sunday week number in month (1st Sunday, 2nd Sunday, etc.)
const getSundayWeekNumber = (date) => {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  const firstSunday = new Date(firstDay)
  
  // Find first Sunday of the month
  while (firstSunday.getDay() !== 0) {
    firstSunday.setDate(firstSunday.getDate() + 1)
  }
  
  // Calculate which Sunday this is
  const diffDays = Math.floor((date - firstSunday) / (1000 * 60 * 60 * 24))
  const weekNum = Math.floor(diffDays / 7) + 1
  
  return weekNum
}

// Format date as "Jan 25th"
const formatDateShort = (date) => {
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const day = date.getDate()
  const suffix = ['th', 'st', 'nd', 'rd'][((day % 100) - 20) % 10] || 
                 ['th', 'st', 'nd', 'rd'][day % 100] || 'th'
  return `${month} ${day}${suffix}`
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
  const [lessonPlan, setLessonPlan] = useState('') // Coach plan (what coach sees and saves)
  const [studentPlan, setStudentPlan] = useState('') // Student plan (for student view)
  const [generatingPlan, setGeneratingPlan] = useState(false)
  const [selectedFeedbackLesson, setSelectedFeedbackLesson] = useState(null)
  const [coachFeedback, setCoachFeedback] = useState('')
  const [practicePlan, setPracticePlan] = useState('')
  const [practicePlanTime, setPracticePlanTime] = useState('15')
  const [generatingPracticePlan, setGeneratingPracticePlan] = useState(false)
  const [isEditingPlan, setIsEditingPlan] = useState(false)
  const [refinementFeedback, setRefinementFeedback] = useState('')
  const [refiningPlan, setRefiningPlan] = useState(false)
  const [selectedLessonDetail, setSelectedLessonDetail] = useState(null)
  const [editingLesson, setEditingLesson] = useState(false)
  const [editLessonDate, setEditLessonDate] = useState('')
  const [editLessonTime, setEditLessonTime] = useState('')
  const [editLessonLocation, setEditLessonLocation] = useState('')
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllCompleted, setShowAllCompleted] = useState(false)
  const [showAllStudents, setShowAllStudents] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showLogPayment, setShowLogPayment] = useState(false)
  const [currentSunday, setCurrentSunday] = useState(getThisSunday(new Date()))
  const [viewMode, setViewMode] = useState('sunday') // 'sunday' or 'nonSunday'
  const [expandedLessonId, setExpandedLessonId] = useState(null)
  const [expandedFeedbackId, setExpandedFeedbackId] = useState(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [markingAllComplete, setMarkingAllComplete] = useState(false)
  const [showReferralCelebration, setShowReferralCelebration] = useState(false)
  const { toasts, showToast, removeToast } = useToast()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState(null)
  const [creatingLesson, setCreatingLesson] = useState(false)
  const [referralCelebrationData, setReferralCelebrationData] = useState({
    referrerName: '',
    referredName: '',
    referrerId: ''
  })
  const navigate = useNavigate()

  useEffect(() => {
    updatePastLessonStatus()
    fetchCoachData()
  }, [])

  const updatePastLessonStatus = async () => {
    try {
      const now = new Date()
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      
      await supabaseAdmin
        .from('lessons')
        .update({ status: 'completed' })
        .eq('status', 'scheduled')
        .lt('lesson_date', twoHoursAgo.toISOString())
    } catch (error) {
      console.error('Error updating past lesson status:', error)
    }
  }

  const fetchCoachData = async () => {
    try {
      // Fetch students - try with is_active filter, fallback if column doesn't exist
      let studentsData = []
      
      // First try with is_active filter
      let { data, error } = await supabaseAdmin
        .from('students')
        .select('*, lesson_count')
        .eq('is_active', true)
      
      if (error) {
        // Fallback: fetch all students if is_active column doesn't exist
        console.log('Fallback: fetching all students')
        const fallback = await supabaseAdmin
          .from('students')
          .select('*, lesson_count')
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
        const { data: profilesData } = await supabaseAdmin
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
        const { data, error: lessonsError } = await supabaseAdmin
          .from('lessons')
          .select(`
            *,
            students!student_id(
              *,
              lesson_count,
              profiles!students_id_fkey(id, full_name, email, ntrp_level, phone),
              student_packages!current_package_id(
                id,
                package_size,
                lessons_used,
                lessons_remaining,
                price_per_lesson
              )
            )
          `)
          .in('student_id', activeStudentIds)
          .order('lesson_date', { ascending: true })

        if (lessonsError) {
          console.error('Error fetching lessons:', lessonsError)
          throw lessonsError
        }
        lessonsData = data || []
      }

      // Enrich lessons with student/profile info (fallback for students not in active list)
      const enrichedLessons = (lessonsData || []).map(lesson => {
        const student = studentsWithProfiles.find(s => s.id === lesson.student_id)
        // Use data from join if available, otherwise fallback
        if (lesson.students) {
          return lesson
        }
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
    
    if (!selectedStudent) {
      showToast('Please select a student', 'warning')
      return
    }

    if (!lessonDate || !lessonTime) {
      showToast('Please enter both date and time', 'warning')
      return
    }

    const lessonDateTime = new Date(`${lessonDate}T${lessonTime}`)
    
    if (lessonDateTime < new Date()) {
      showToast('Cannot create a lesson in the past', 'warning')
      return
    }

    setCreatingLesson(true)
    try {
      // Create the lesson
      const { error: lessonError } = await supabaseAdmin
        .from('lessons')
        .insert([
          {
            student_id: selectedStudent,
            lesson_date: lessonDateTime.toISOString(),
            location: location || 'Colina Del Sol Park',
            status: 'scheduled'
          }
        ])

      if (lessonError) {
        throw lessonError
      }

      // Deduct one credit if student has credits
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('lesson_credits')
        .eq('id', selectedStudent)
        .single()

      if (student && student.lesson_credits > 0) {
        const { error: creditError } = await supabaseAdmin
          .from('students')
          .update({ lesson_credits: student.lesson_credits - 1 })
          .eq('id', selectedStudent)

        if (creditError) {
          console.error('Error deducting credit:', creditError)
          // Don't fail the lesson creation if credit deduction fails
        }
      }

      showToast('Lesson created successfully!', 'success')
      setShowCreateLesson(false)
      setSelectedStudent('')
      setLessonDate('')
      setLessonTime('')
      setLocation('Colina Del Sol Park')
      fetchCoachData()
    } catch (error) {
      console.error('Error creating lesson:', error)
      showToast('Error creating lesson: ' + (error.message || 'Unknown error'), 'error')
    } finally {
      setCreatingLesson(false)
    }
  }

  const handlePreviousWeek = () => {
    if (viewMode === 'nonSunday') {
      // Go back to current Sunday
      setViewMode('sunday')
      setCurrentSunday(getThisSunday(new Date()))
    } else {
      // Go to previous Sunday
      const prevSunday = getPreviousSunday(currentSunday)
      const thisSunday = getThisSunday(new Date())
      
      // If going back to current Sunday, stay on current Sunday
      if (isSameDay(prevSunday, thisSunday)) {
        setCurrentSunday(thisSunday)
      } else {
        setCurrentSunday(prevSunday)
      }
    }
  }

  const handleNextWeek = () => {
    const thisSunday = getThisSunday(new Date())
    const isCurrentSunday = isSameDay(currentSunday, thisSunday)
    
    if (viewMode === 'sunday' && isCurrentSunday) {
      // From current Sunday, go to "All Non-Sunday Lessons"
      setViewMode('nonSunday')
    } else if (viewMode === 'nonSunday') {
      // From "All Non-Sunday Lessons", go to next Sunday (second week after current)
      setViewMode('sunday')
      setCurrentSunday(getNextSunday(thisSunday))
    } else {
      // From any other Sunday, go to next Sunday
      setCurrentSunday(getNextSunday(currentSunday))
    }
  }

  const handleMarkAllSundayComplete = () => {
    const sundayLessons = lessons.filter(l => {
      const lessonDate = new Date(l.lesson_date)
      return isSameDay(lessonDate, currentSunday) && l.status === 'scheduled'
    })
    
    const lessonIds = sundayLessons.map(l => l.id)
    
    if (lessonIds.length === 0) {
      showToast('No scheduled lessons to mark complete', 'info')
      return
    }

    setConfirmModalConfig({
      title: 'Mark All Lessons Complete',
      message: `Mark all ${lessonIds.length} Sunday lesson(s) as completed? This will update all scheduled lessons for this date.`,
      confirmText: 'Mark Complete',
      cancelText: 'Cancel',
      type: 'info',
      onConfirm: async () => {
        setMarkingAllComplete(true)
        try {
          // Update all lessons to completed
          const { error } = await supabaseAdmin
            .from('lessons')
            .update({ status: 'completed' })
            .in('id', lessonIds)
          
          if (error) throw error
          
          // Create lesson transactions for each
          const lessonDate = currentSunday.toISOString().split('T')[0]
          
          for (const lesson of sundayLessons) {
            // Check if transaction already exists
            const { data: existingTx } = await supabaseAdmin
              .from('lesson_transactions')
              .select('id')
              .eq('student_id', lesson.student_id)
              .eq('transaction_date', lessonDate)
              .eq('transaction_type', 'lesson_taken')
              .maybeSingle()
            
            if (!existingTx) {
              await supabaseAdmin
                .from('lesson_transactions')
                .insert({
                  student_id: lesson.student_id,
                  transaction_date: lessonDate,
                  transaction_type: 'lesson_taken',
                  amount_paid: 0,
                  package_size: 0,
                  notes: 'Lesson completed (batch)'
                })
            }
          }
          
          showToast(`✅ Marked ${lessonIds.length} lesson(s) as completed!`, 'success')
          fetchCoachData() // Refresh
        } catch (error) {
          console.error('Error marking lessons complete:', error)
          showToast('Error: ' + error.message, 'error')
        } finally {
          setMarkingAllComplete(false)
        }
      }
    })
    setShowConfirmModal(true)
  }

  const handleToggleLessonExpansion = (lessonId) => {
    setExpandedLessonId(expandedLessonId === lessonId ? null : lessonId)
  }

  const handleToggleFeedbackExpansion = (lessonId) => {
    if (expandedFeedbackId === lessonId) {
      setExpandedFeedbackId(null)
      setFeedbackText('')
    } else {
      setExpandedFeedbackId(lessonId)
      const lesson = lessons.find(l => l.id === lessonId)
      setFeedbackText(lesson?.coach_feedback || '')
    }
  }

  const handleSaveInlineFeedback = async (lessonId) => {
    try {
      const { error } = await supabaseAdmin
        .from('lessons')
        .update({ coach_feedback: feedbackText })
        .eq('id', lessonId)

      if (error) throw error

      // Update local state
      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, coach_feedback: feedbackText } : l
      ))
      
      // Collapse the feedback form
      setExpandedFeedbackId(null)
      setFeedbackText('')
      
      showToast('Feedback saved successfully!', 'success')
      fetchCoachData() // Refresh to get updated data
    } catch (error) {
      console.error('Error saving feedback:', error)
      showToast('Error saving feedback: ' + error.message, 'error')
    }
  }

  const handleUpdateCredits = async (studentId, currentCredits, change) => {
    const newCredits = currentCredits + change
    
    const { error } = await supabaseAdmin
      .from('students')
      .update({ lesson_credits: newCredits })
      .eq('id', studentId)

    if (error) {
      showToast('Error updating credits: ' + error.message, 'error')
    } else {
      showToast('Credits updated successfully', 'success')
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
    setStudentPlan('')
    setIsEditingPlan(false)
    setRefinementFeedback('')
  }

  const handleGenerateLessonPlan = async () => {
    if (!selectedLesson) return

    setGeneratingPlan(true)
    try {
      const studentId = selectedLesson.student_id
      
      // Fetch student and profile separately to avoid ambiguous relationship error
      const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentError) throw studentError

      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', studentId)
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
          console.error('Error parsing development plan:', e)
        }
      }

      // Get achieved milestones
      const milestones = getMilestonesByLevel(playerLevel)
      const { data: achievedMilestonesData, error: milestonesError } = await supabaseAdmin
        .from('student_milestones')
        .select('milestone_number, milestone_name, achieved_at')
        .eq('student_id', studentId)
        .eq('milestone_level', playerLevel)
        .order('milestone_number', { ascending: true })

      if (milestonesError) throw milestonesError
      
      const achievedMilestones = achievedMilestonesData || []
      const achievedMilestoneNumbers = achievedMilestones.map(m => m.milestone_number)

      // Find next milestone (first not achieved)
      let nextMilestone = null
      let targetMilestoneForGoal = 30
      
      if (developmentPlan?.section1?.bigGoal) {
        const goal = GOAL_OPTIONS.find(g => g.value === developmentPlan.section1.bigGoal)
        if (goal) {
          targetMilestoneForGoal = goal.targetMilestone
        }
      }

      // Find next unachieved milestone
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

      // If all milestones achieved, use the last one
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
      const { data: lastLessonData, error: lastLessonError } = await supabaseAdmin
        .from('lessons')
        .select('student_learnings')
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('lesson_date', { ascending: false })
        .limit(1)
        .single()

      const lastLessonLearnings = lastLessonData?.student_learnings || null

      // Get recent lesson plans (last 2 completed lessons)
      const { data: recentLessonsData, error: recentLessonsError } = await supabaseAdmin
        .from('lessons')
        .select('lesson_plan')
        .eq('student_id', studentId)
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
            // Handle different error formats
            if (typeof errorData.error === 'string') {
              errorMessage = errorData.error
            } else if (errorData.error.message) {
              errorMessage = errorData.error.message
            } else {
              errorMessage = JSON.stringify(errorData.error)
            }
          }
        } catch (e) {
          // If JSON parsing fails, try to get text
          const text = await response.text().catch(() => '')
          if (text) errorMessage = text
        }
        
        // Provide helpful context for common errors
        if (response.status === 403 || response.status === 500) {
          errorMessage += '\n\nMake sure you are running with "netlify dev" (not "npm run dev") if testing locally, or test on the deployed site.'
        }
        
        throw new Error(errorMessage)
      }

      const { studentPlan: generatedStudentPlan, coachPlan: generatedCoachPlan } = await response.json()

      // Store both versions
      // Coach sees coachPlan (with coaching points)
      setLessonPlan(stripMarkdown(generatedCoachPlan || generatedStudentPlan))
      setStudentPlan(stripMarkdown(generatedStudentPlan || generatedCoachPlan))
      setIsEditingPlan(false) // Show in display mode first
    } catch (error) {
      console.error('Error generating lesson plan:', error)
      showToast('Error generating lesson plan: ' + error.message + '. Make sure the Netlify function is properly configured.', 'error')
    } finally {
      setGeneratingPlan(false)
    }
  }

  const handleSaveLessonPlan = async () => {
    if (!selectedLesson) return

    try {
      // Save both versions to database
      // lesson_plan stores the coach version (with coaching points)
      // student_lesson_plan stores the student version (motivational)
      const updateData = { lesson_plan: lessonPlan }
      
      // If we have a student version, save it too
      if (studentPlan) {
        // Try to save to student_lesson_plan field, or store in JSON if field doesn't exist
        updateData.student_lesson_plan = studentPlan
      }

      const { error } = await supabaseAdmin
        .from('lessons')
        .update(updateData)
        .eq('id', selectedLesson.id)

      if (error) throw error

      showToast('Lesson plan saved!', 'success')
      setIsEditingPlan(false)
      fetchCoachData() // Refresh to show updated lesson plan
    } catch (error) {
      console.error('Error saving lesson plan:', error)
      showToast('Error saving lesson plan: ' + error.message, 'error')
    }
  }

  const handleRefinePlan = async () => {
    if (!selectedLesson || !refinementFeedback.trim()) {
      showToast('Please provide refinement feedback', 'warning')
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
      showToast('Error refining lesson plan: ' + error.message + '. Make sure VITE_ANTHROPIC_API_KEY is set in your .env file.', 'error')
    } finally {
      setRefiningPlan(false)
    }
  }

  // Load practice plan for a lesson
  const loadPracticePlan = async (lessonId) => {
    if (!lessonId) {
      setPracticePlan('')
      setPracticePlanTime('15')
      return
    }

    try {
      const { data, error } = await supabaseAdmin
        .from('lessons')
        .select('practice_plan, practice_plan_time_estimate')
        .eq('id', lessonId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading practice plan:', error)
      } else if (data) {
        setPracticePlan(data.practice_plan || '')
        setPracticePlanTime(data.practice_plan_time_estimate?.toString() || '15')
      } else {
        setPracticePlan('')
        setPracticePlanTime('15')
      }
    } catch (error) {
      console.error('Error loading practice plan:', error)
      setPracticePlan('')
      setPracticePlanTime('15')
    }
  }

  // Generate AI practice plan suggestion
  const handleGeneratePracticePlan = async () => {
    if (!selectedFeedbackLesson) return
    
    setGeneratingPracticePlan(true)
    
    try {
      // Gather context
      const { data: student } = await supabaseAdmin
        .from('students')
        .select('id, development_plan, player_level, profiles!inner(full_name)')
        .eq('id', selectedFeedbackLesson.student_id)
        .single()
      
      if (!student) {
        throw new Error('Student not found')
      }

      const { data: recentLessons } = await supabaseAdmin
        .from('lessons')
        .select('lesson_plan, coach_feedback, created_at')
        .eq('student_id', selectedFeedbackLesson.student_id)
        .order('created_at', { ascending: false })
        .limit(3)
      
      // Parse development plan for goals
      let goals = 'Not specified'
      if (student.development_plan) {
        try {
          const plan = typeof student.development_plan === 'string' 
            ? JSON.parse(student.development_plan) 
            : student.development_plan
          if (plan.section1?.bigGoal) {
            const goalOption = GOAL_OPTIONS.find(g => g.value === plan.section1.bigGoal)
            goals = goalOption ? goalOption.label : plan.section1.bigGoal
          }
        } catch (e) {
          console.error('Error parsing development plan:', e)
        }
      }
      
      // Call AI function
      const response = await fetch('/.netlify/functions/generate-practice-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.profiles.full_name,
          goals: goals,
          skillLevel: student.player_level || 'beginner',
          todayLessonPlan: selectedFeedbackLesson.lesson_plan || '',
          todayNotes: selectedFeedbackLesson.coach_feedback || '',
          recentLessons: recentLessons || []
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate practice plan')
      }
      
      const data = await response.json()
      
      setPracticePlan(data.practicePlan || '')
      setPracticePlanTime(data.estimatedTime || '15')
      
    } catch (error) {
      console.error('Error generating practice plan:', error)
      showToast('Failed to generate suggestion. Please write one manually.', 'warning')
    } finally {
      setGeneratingPracticePlan(false)
    }
  }


  const handleFeedbackLessonClick = async (lesson) => {
    setSelectedFeedbackLesson(lesson)
    setCoachFeedback(lesson.coach_feedback || '')
    // Load existing practice plan for this lesson
    await loadPracticePlan(lesson.id)
  }

  const handleCloseFeedbackModal = () => {
    setSelectedFeedbackLesson(null)
    setCoachFeedback('')
    setPracticePlan('')
    setPracticePlanTime('15')
  }

  const handleSubmitFeedback = async () => {
    if (!selectedFeedbackLesson) {
      showToast('No lesson selected', 'warning')
      return
    }

    // Feedback is optional, but if provided it should not be empty
    if (coachFeedback.trim() && coachFeedback.trim().length < 10) {
      showToast('Please provide more detailed feedback (at least 10 characters) or leave it empty', 'warning')
      return
    }

    try {
      // Save feedback (can be empty string to clear it)
      const { error: feedbackError } = await supabaseAdmin
        .from('lessons')
        .update({ coach_feedback: coachFeedback.trim() || null })
        .eq('id', selectedFeedbackLesson.id)

      if (feedbackError) throw feedbackError

      // Save practice plan (optional - can be empty to remove practice plan)
      const practicePlanUpdate = {
        practice_plan: practicePlan.trim() || null,
        practice_plan_time_estimate: practicePlan.trim() ? parseInt(practicePlanTime) : null,
        practice_plan_completed: false, // Reset completion when updating
        practice_plan_completed_at: null
      }

      const { error: practicePlanError } = await supabaseAdmin
        .from('lessons')
        .update(practicePlanUpdate)
        .eq('id', selectedFeedbackLesson.id)

      if (practicePlanError) throw practicePlanError

      // Create notification for student only if feedback was provided
      if (coachFeedback.trim()) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: selectedFeedbackLesson.student_id,
            type: 'feedback_posted',
            title: 'Coach Feedback Posted',
            body: `Your coach has posted feedback for your lesson on ${new Date(selectedFeedbackLesson.lesson_date).toLocaleDateString()}`,
            link: `/dashboard`,
            read: false
          })
      }

      showToast('Feedback and practice plan saved!', 'success')
      
      // Create notification for student if practice plan was added
      if (practicePlan.trim()) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: selectedFeedbackLesson.student_id,
            type: 'practice_plan_assigned',
            title: 'New Practice Plan Assigned',
            body: `Your coach has assigned a new practice plan for this week!`,
            link: `/dashboard`,
            read: false
          })
      }
      handleCloseFeedbackModal()
      fetchCoachData() // Refresh data
    } catch (error) {
      console.error('Error saving feedback:', error)
      showToast('Error saving feedback: ' + error.message, 'error')
    }
  }

  const handleUpdateLessonStatus = async (lessonId, newStatus) => {
    try {
      // Update lesson status
      const { error } = await supabaseAdmin
        .from('lessons')
        .update({ status: newStatus })
        .eq('id', lessonId)

      if (error) throw error

      // If completing a lesson, deduct credit from student and record in lesson_transactions
      if (newStatus === 'completed') {
        // Get lesson details to find student
        const { data: lesson } = await supabaseAdmin
          .from('lessons')
          .select('student_id, lesson_date, students(lesson_credits)')
          .eq('id', lessonId)
          .single()

        if (lesson && lesson.student_id && lesson.students) {
          const currentCredits = lesson.students.lesson_credits || 0
          const newCredits = Math.max(0, currentCredits - 1)

          // Deduct 1 credit
          const { error: creditError } = await supabaseAdmin
            .from('students')
            .update({ lesson_credits: newCredits })
            .eq('id', lesson.student_id)

          if (!creditError) {
            console.log(`Credit deducted for student. New balance: ${newCredits}`)
          }

          // Record lesson in lesson_transactions for financial tracking
          // Check if transaction already exists to avoid duplicates
          try {
            const lessonDate = lesson.lesson_date ? new Date(lesson.lesson_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
            
            // Check if transaction already exists
            const { data: existingTransaction } = await supabaseAdmin
              .from('lesson_transactions')
              .select('id')
              .eq('student_id', lesson.student_id)
              .eq('transaction_date', lessonDate)
              .eq('transaction_type', 'lesson_taken')
              .maybeSingle()
            
            // Only insert if it doesn't already exist
            if (!existingTransaction) {
              const { error: txInsertError } = await supabaseAdmin
                .from('lesson_transactions')
                .insert({
                  student_id: lesson.student_id,
                  transaction_date: lessonDate,
                  transaction_type: 'lesson_taken',
                  amount_paid: 0,
                  package_size: 0,
                  notes: 'Lesson completed'
                })
              
              if (txInsertError) {
                console.warn('Could not record lesson transaction:', txInsertError.message)
              }
            }
          } catch (txError) {
            // If table doesn't exist or insert fails, log but don't fail the status update
            console.warn('Could not record lesson transaction:', txError.message)
          }
        }
      }

      fetchCoachData() // Refresh data
      if (selectedLessonDetail?.id === lessonId) {
        setSelectedLessonDetail({ ...selectedLessonDetail, status: newStatus })
      }
      showToast('Lesson status updated successfully', 'success')
    } catch (error) {
      console.error('Error updating lesson status:', error)
      showToast('Error updating lesson status: ' + error.message, 'error')
    }
  }

  const handleLessonClick = (lesson) => {
    setSelectedLessonDetail(lesson)
    setEditingLesson(false)
    // Initialize edit fields
    const lessonDate = new Date(lesson.lesson_date)
    setEditLessonDate(lessonDate.toISOString().split('T')[0])
    setEditLessonTime(lessonDate.toTimeString().slice(0, 5))
    setEditLessonLocation(lesson.location || '')
  }

  const handleCloseLessonDetail = () => {
    setSelectedLessonDetail(null)
    setEditingLesson(false)
    setEditLessonDate('')
    setEditLessonTime('')
    setEditLessonLocation('')
  }

  const handleSaveLessonEdit = async () => {
    if (!selectedLessonDetail) return

    try {
      // Combine date and time into ISO string
      const dateTime = new Date(`${editLessonDate}T${editLessonTime}`)
      
      const { error } = await supabaseAdmin
        .from('lessons')
        .update({
          lesson_date: dateTime.toISOString(),
          location: editLessonLocation
        })
        .eq('id', selectedLessonDetail.id)

      if (error) throw error

      // Update local state
      const updatedLesson = {
        ...selectedLessonDetail,
        lesson_date: dateTime.toISOString(),
        location: editLessonLocation
      }
      setSelectedLessonDetail(updatedLesson)
      
      // Update lessons list
      setLessons(lessons.map(l => l.id === selectedLessonDetail.id ? updatedLesson : l))
      
      setEditingLesson(false)
      showToast('Lesson updated successfully!', 'success')
      fetchCoachData() // Refresh data
    } catch (error) {
      console.error('Error updating lesson:', error)
      showToast('Error updating lesson: ' + error.message, 'error')
    }
  }

  if (loading) {
    return (
      <CoachLayout>
        <div style={{ padding: '20px' }}>Loading...</div>
      </CoachLayout>
    )
  }

  const upcomingLessons = lessons.filter(l => l.status === 'scheduled' && new Date(l.lesson_date) > new Date())
  const completedLessons = lessons.filter(l => l.status === 'completed').slice(0, 10).reverse()
  // Filter for lessons that need feedback
  // Exclude lessons that have been moved (have google_calendar_id but lesson_date is old, suggesting it was rescheduled)
  const pendingFeedback = lessons.filter(l => {
    if (l.status !== 'completed' || l.coach_feedback) {
      return false
    }
    
    const lessonDate = new Date(l.lesson_date)
    const now = new Date()
    const daysSinceLesson = (now - lessonDate) / (1000 * 60 * 60 * 24)
    
    // Check if lesson has a google_calendar_id in metadata (synced from Google Calendar)
    try {
      const metadata = typeof l.metadata === 'string' ? JSON.parse(l.metadata) : l.metadata
      const hasGoogleCalendarId = metadata?.google_calendar_id
      
      if (hasGoogleCalendarId) {
        // If lesson has google_calendar_id and is more than 2 days old, it might have been moved
        // Only show lessons that are within the last 2 days (reasonable window for feedback on recent lessons)
        // This prevents showing lessons that were moved but sync hasn't updated the date yet
        if (daysSinceLesson > 2) {
          return false // Lesson is too old and has google_calendar_id, likely moved
        }
      }
    } catch (e) {
      // If metadata parsing fails, include the lesson (better to show it than hide it)
    }
    
    // Only show lessons that are within the last 7 days (reasonable feedback window)
    return daysSinceLesson <= 7
  })

  return (
    <CoachLayout>
      <div className="page-container">
        <div className="coach-dashboard coach-dashboard-content">
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
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        {/* Left side - Search */}
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="🔍 Search students by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              border: '2px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)'
            }}
          />
        </div>
        
        {/* Right side - Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button 
          className="btn btn-primary"
          onClick={() => setShowLogPayment(true)}
          style={{ 
              fontSize: '15px',
              padding: '10px 20px',
            background: 'linear-gradient(135deg, #2D7F6F 0%, #3D9F8F 100%)',
            border: 'none'
          }}
        >
          💳 Log Payment
        </button>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateLesson(!showCreateLesson)}
            style={{ 
              fontSize: '15px', 
              padding: '10px 20px'
            }}
          >
            <Plus size={18} />
            Create Lesson
          </button>
        </div>
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

      {/* Compact Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'white',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#f9f9f9',
          borderRadius: 'var(--radius-sm)',
          flex: '1',
          minWidth: '150px'
        }}>
          <Users size={20} style={{ color: 'var(--color-primary)' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Total Students</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-dark)' }}>
              {students.length}
          </div>
        </div>
          </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: '#f9f9f9',
          borderRadius: 'var(--radius-sm)',
          flex: '1',
          minWidth: '150px'
        }}>
          <Calendar size={20} style={{ color: 'var(--color-secondary)' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Upcoming Lessons</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--color-dark)' }}>
              {upcomingLessons.length}
        </div>
          </div>
        </div>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: pendingFeedback.length > 0 ? '#FFF3E0' : '#f9f9f9',
          borderRadius: 'var(--radius-sm)',
          flex: '1',
          minWidth: '150px',
          border: pendingFeedback.length > 0 ? '2px solid #FF9800' : 'none'
        }}>
          <Target size={20} style={{ color: pendingFeedback.length > 0 ? '#FF9800' : '#999' }} />
          <div>
            <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>Needs Feedback</div>
            <div style={{ 
              fontSize: '20px', 
              fontWeight: 'bold', 
              color: pendingFeedback.length > 0 ? '#FF9800' : 'var(--color-dark)'
            }}>
              {pendingFeedback.length}
            </div>
          </div>
        </div>
      </div>


      {/* Needs Feedback Section */}
      {pendingFeedback.length > 0 && (
        <div className="section" style={{ marginTop: '32px' }}>
          <h2 className="section-title" style={{ color: '#FF9800' }}>
            🚨 Needs Feedback ({pendingFeedback.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingFeedback.map(lesson => {
              const isExpanded = expandedFeedbackId === lesson.id
              const studentName = lesson.students?.profiles?.full_name || 'Unknown Student'
              const lessonDate = new Date(lesson.lesson_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
              })

                return (
                <div
                  key={lesson.id}
                  style={{
                    border: '2px solid #FF9800',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    backgroundColor: 'white'
                  }}
                >
                  {/* Collapsed View */}
                  <div
                    onClick={() => handleToggleFeedbackExpansion(lesson.id)}
                    style={{
                      padding: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      backgroundColor: '#FFF3E0'
                    }}
                  >
                    <div>
                      <h3 style={{ margin: 0, marginBottom: '4px' }}>
                        ⚠️ {studentName}
                      </h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                        {lessonDate}
                      </p>
                        </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        className="btn btn-sm"
                        style={{ 
                          backgroundColor: '#FF9800', 
                          color: 'white',
                          pointerEvents: 'none'
                        }}
                      >
                        Give Feedback
                      </button>
                      <span style={{ fontSize: '18px', color: '#666' }}>
                        {isExpanded ? '▲' : '▼'}
                      </span>
                            </div>
                            </div>

                  {/* Expanded View - Feedback Form */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '24px',
                        backgroundColor: '#f9f9f9',
                        borderTop: '2px solid #FF9800'
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Student Learnings */}
                      {lesson.student_learnings && (
                        <div style={{ marginBottom: '24px' }}>
                          <h4 style={{ 
                            marginBottom: '12px', 
                            color: 'var(--color-primary)' 
                          }}>
                            Student's 3 Learnings:
                          </h4>
                          <div style={{
                            padding: '16px',
                            backgroundColor: 'white',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border)'
                          }}>
                            {(() => {
                              try {
                                const learnings = JSON.parse(lesson.student_learnings)
                                return learnings.map((learning, idx) => (
                                  <div 
                                    key={idx}
                                    style={{ 
                                      marginBottom: idx < 2 ? '8px' : 0,
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '8px'
                                    }}
                                  >
                                    <span style={{ color: 'var(--color-secondary)', fontWeight: 'bold' }}>
                                      •
                                    </span>
                                    <span>{learning}</span>
                          </div>
                                ))
                              } catch (e) {
                                return <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px' }}>{lesson.student_learnings}</div>
                              }
                            })()}
                              </div>
                              </div>
                            )}

                      {/* Coach Feedback Textarea */}
                      <div style={{ marginBottom: '20px' }}>
                        <label 
                          className="label" 
                          style={{ marginBottom: '8px', display: 'block' }}
                        >
                          Coach Feedback:
                        </label>
                        <textarea
                          className="input"
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Enter your feedback on this lesson..."
                          style={{
                            minHeight: '120px',
                            fontFamily: 'var(--font-family)',
                            lineHeight: '1.6',
                            resize: 'vertical'
                          }}
                        />
                          </div>

                      {/* Practice Plan Generation */}
                      <div style={{ marginBottom: '20px' }}>
                        <button 
                          className="btn btn-outline"
                          onClick={() => handleFeedbackLessonClick(lesson)}
                        >
                          📝 Generate Practice Plan
                        </button>
                        <p style={{ 
                          fontSize: '12px', 
                          color: '#666', 
                          marginTop: '8px',
                          fontStyle: 'italic'
                        }}>
                          Opens full feedback modal with AI practice plan generator
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                          className="btn btn-primary"
                          onClick={() => handleSaveInlineFeedback(lesson.id)}
                          disabled={!feedbackText.trim()}
                        >
                          💾 Save Feedback
                        </button>
                        <button 
                          className="btn btn-outline"
                          onClick={() => {
                            setExpandedFeedbackId(null)
                            setFeedbackText('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
        </div>
      )}

      {/* Sunday Calendar View / All Non-Sunday Lessons View */}
      <div className="section">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h2 className="section-title" style={{ margin: 0 }}>
              {viewMode === 'nonSunday' ? 'Upcoming Lessons' : 'Sunday'}
            </h2>
            {viewMode === 'sunday' ? (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                color: '#666'
              }}>
                <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                  {formatDateShort(currentSunday)}
                </span>
                <span style={{ color: '#999' }}>•</span>
                <span>
                  Week {getSundayWeekNumber(currentSunday)}
                </span>
                <span style={{ color: '#999' }}>•</span>
                <span style={{ 
                  fontWeight: '700', 
                  color: 'var(--color-secondary)',
                  fontSize: '18px'
                }}>
                  ${(() => {
                    const sundayLessons = lessons.filter(l => {
                      const lessonDate = new Date(l.lesson_date)
                      return isSameDay(lessonDate, currentSunday) && l.status === 'scheduled'
                    })
                    
                    let totalRevenue = 0
                    sundayLessons.forEach(lesson => {
                      const revenue = getLessonRevenue(lesson.students)
                      totalRevenue += revenue
                    })
                    
                    return Math.round(totalRevenue)
                  })()}
                </span>
              </div>
            ) : (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px',
                fontSize: '16px',
                color: '#666'
              }}>
                <span style={{ 
                  fontWeight: '700', 
                  color: 'var(--color-secondary)',
                  fontSize: '18px'
                }}>
                  ${(() => {
                    const nonSundayLessons = lessons.filter(l => {
                      const lessonDate = new Date(l.lesson_date)
                      const dayOfWeek = lessonDate.getDay()
                      return dayOfWeek !== 0 && // Not Sunday
                             l.status === 'scheduled' &&
                             lessonDate > new Date() // Future lessons
                    })
                    
                    let totalRevenue = 0
                    nonSundayLessons.forEach(lesson => {
                      const revenue = getLessonRevenue(lesson.students)
                      totalRevenue += revenue
                    })
                    
                    return Math.round(totalRevenue)
                  })()}
                </span>
              </div>
            )}
          </div>
          <div className="calendar-navigation-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'nowrap' }}>
            {/* Mark All Complete Button - only show for Sunday view with scheduled lessons */}
            {viewMode === 'sunday' && (() => {
              const sundayLessons = lessons.filter(l => {
                const lessonDate = new Date(l.lesson_date)
                return isSameDay(lessonDate, currentSunday) && l.status === 'scheduled'
              })
              
              if (sundayLessons.length > 0) {
                return (
                <button
                    className="btn btn-sm"
                    onClick={handleMarkAllSundayComplete}
                    disabled={markingAllComplete}
                  style={{
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                    fontWeight: '600',
                      cursor: markingAllComplete ? 'wait' : 'pointer',
                      opacity: markingAllComplete ? 0.6 : 1
                    }}
                  >
                    {markingAllComplete ? '⏳ Marking...' : `✓ Mark All Complete (${sundayLessons.length})`}
                  </button>
                )
              }
              return null
            })()}
            
            {/* Previous and Next buttons */}
            <button 
              className="btn btn-outline btn-sm"
              onClick={handlePreviousWeek}
              style={{ padding: '8px 16px' }}
            >
              ← Previous
            </button>
            <button 
              className="btn btn-outline btn-sm"
              onClick={handleNextWeek}
              style={{ padding: '8px 16px' }}
            >
              Next →
                </button>
              </div>
      </div>

        {viewMode === 'nonSunday' ? (
          // All Non-Sunday Lessons View
          (() => {
            const nonSundayLessons = lessons.filter(l => {
              const lessonDate = new Date(l.lesson_date)
              const dayOfWeek = lessonDate.getDay()
              return dayOfWeek !== 0 && // Not Sunday
                     l.status === 'scheduled' &&
                     lessonDate > new Date() // Future lessons
            }).sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date))

            if (nonSundayLessons.length === 0) {
              return (
                <div className="empty-state" style={{ 
                  padding: '48px', 
                  textAlign: 'center',
                  backgroundColor: '#f9f9f9',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <p style={{ fontSize: '18px', color: '#666', marginBottom: '12px' }}>
                    No upcoming non-Sunday lessons
                  </p>
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {nonSundayLessons.map((lesson) => {
                  const isExpanded = expandedLessonId === lesson.id
                  const studentName = lesson.students?.profiles?.full_name || 'Unknown Student'
                  const lessonTime = new Date(lesson.lesson_date).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })
                  const lessonDate = new Date(lesson.lesson_date)
                  const dayName = lessonDate.toLocaleDateString('en-US', { weekday: 'long' })
                  const dateStr = lessonDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

                  return (
                    <div 
                      key={lesson.id}
                      style={{ 
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-sm)',
                        overflow: 'hidden',
                        transition: 'all 0.3s ease',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      {/* Collapsed View - COMPACT */}
                      <div 
                        onClick={() => handleToggleLessonExpansion(lesson.id)}
                        style={{
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0'
                        }}
                        onMouseEnter={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = '#f9f9f9'
                        }}
                        onMouseLeave={(e) => {
                          if (!isExpanded) e.currentTarget.style.backgroundColor = 'white'
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '16px',
                          flex: 1 
                        }}>
                          {/* Time */}
                          <div style={{ 
                            fontSize: '15px',
                            fontWeight: '700', 
                            color: 'var(--color-primary)',
                            minWidth: '70px',
                            fontFamily: 'monospace'
                          }}>
                            {lessonTime}
                          </div>
                          
                          {/* Vertical separator */}
                          <div style={{
                            width: '1px',
                            height: '24px',
                            backgroundColor: '#e0e0e0'
                          }} />
                          
                          {/* Student Name with Stage Tag and Credits */}
                          <div style={{ 
                            display: 'flex',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: '8px',
                            flex: 1,
                            flexWrap: 'wrap'
                          }} className="student-info-row">
                            <div style={{ 
                              fontSize: '15px',
                              fontWeight: '600',
                              color: 'var(--color-dark)'
                            }}>
                              {studentName}
                            </div>
                            <div style={{ fontSize: '13px', color: '#666' }}>
                              {dayName}, {dateStr}
                            </div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              flexWrap: 'wrap'
                            }} className="student-badges">
                              {(() => {
                                const lessonCount = lesson.students?.lesson_count || 0
                                const stage = getStudentStage(lessonCount)
                                const credits = lesson.students?.lesson_credits || 0
                                return (
                                  <>
                                    <span style={{
                                      fontSize: lessonCount === 0 ? '10px' : '11px',
                                      padding: lessonCount === 0 ? '2px 6px' : '2px 8px',
                                      borderRadius: '12px',
                                      backgroundColor: stage.color,
                                      color: 'white',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {stage.label}
                                    </span>
                                    <span style={{
                                      fontSize: '11px',
                                      padding: '2px 8px',
                                      borderRadius: '12px',
                                      backgroundColor: credits <= 2 ? '#FF9800' : '#f0f0f0',
                                      color: credits <= 2 ? 'white' : '#666',
                                      fontWeight: '600',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {credits} credit{credits !== 1 ? 's' : ''}
                                    </span>
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                        </div>
                        
                        {/* Right side - Revenue, Credits, Status and Arrow */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '10px',
                          marginLeft: '16px'
                        }}>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600',
                            color: 'var(--color-secondary)'
                          }}>
                            ${getLessonRevenue(lesson.students)}
                          </div>
                          {lesson.lesson_plan ? (
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: '#E8F5E9',
                              color: '#2D7F6F',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              📝 <span>Ready</span>
                            </span>
                          ) : (
                            <span style={{
                              padding: '4px 10px',
                              backgroundColor: '#FFF3E0',
                              color: '#FF9800',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}>
                              No Plan
                            </span>
                          )}
                          <span style={{ 
                            fontSize: '14px',
                            color: '#999',
                            transition: 'transform 0.2s'
                          }}>
                            {isExpanded ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      {/* Expanded View - reuse same expanded view as Sunday lessons */}
                      {isExpanded && (
                        <div 
                          style={{
                            padding: '24px',
                            backgroundColor: '#f9f9f9',
                            borderTop: '2px solid var(--color-border)'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Lesson Details */}
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>
                              Lesson Details
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                              <div>
                                <strong>Student:</strong> {studentName}
                              </div>
                              <div>
                                <strong>Time:</strong> {lessonTime} on {dayName}, {dateStr}
                              </div>
                              <div>
                                <strong>Status:</strong>
                                <select 
                                  value={lesson.status}
                                  onChange={(e) => handleUpdateLessonStatus(lesson.id, e.target.value)}
                                  className="status-dropdown"
                                  style={{ marginLeft: '8px', padding: '4px 8px' }}
                                >
                                  <option value="scheduled">Scheduled</option>
                                  <option value="completed">Completed</option>
                                  <option value="cancelled">Cancelled</option>
                                </select>
                              </div>
                            </div>

                            {/* Current Package Info */}
                            {lesson.students?.student_packages?.[0] && (
                              <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '8px',
                                border: '1px solid #e0e0e0'
                              }}>
                                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-primary)' }}>
                                  Current Package
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                  <div>
                                    <div style={{ color: '#666' }}>Package Size</div>
                                    <div style={{ fontWeight: '600' }}>{lesson.students.student_packages[0].package_size} lessons</div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666' }}>Used</div>
                                    <div style={{ fontWeight: '600' }}>{lesson.students.student_packages[0].lessons_used}</div>
                                  </div>
                                  <div>
                                    <div style={{ color: '#666' }}>Remaining</div>
                                    <div style={{ fontWeight: '600', color: lesson.students.student_packages[0].lessons_remaining <= 2 ? '#FF9800' : 'inherit' }}>
                                      {lesson.students.student_packages[0].lessons_remaining}
                                      {lesson.students.student_packages[0].lessons_remaining <= 2 && ' ⚠️'}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                  ${lesson.students.student_packages[0].price_per_lesson?.toFixed(2) || '0.00'}/lesson
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Lesson Plan Preview */}
                          {lesson.lesson_plan && (
                            <div style={{ marginBottom: '20px' }}>
                              <h4 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>
                                Lesson Plan
                              </h4>
                              <div style={{
                                padding: '16px',
                                backgroundColor: 'white',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                whiteSpace: 'pre-wrap',
                                fontSize: '14px',
                                lineHeight: '1.6'
                              }}>
                                {lesson.lesson_plan}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleLessonPlanClick(lesson)}
                            >
                              {lesson.lesson_plan ? '✏️ Edit Plan' : '📝 Create Plan'}
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => navigate(`/coach/students/${lesson.student_id}`)}
                            >
                              👤 View Student Profile
                            </button>
                            <button
                              className="btn btn-outline btn-sm"
                              onClick={() => handleLessonClick(lesson)}
                            >
                              📋 Full Details
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()
        ) : (
          // Sunday Lessons View
          (() => {
            const sundayLessons = lessons.filter(l => {
              const lessonDate = new Date(l.lesson_date)
              return isSameDay(lessonDate, currentSunday) && l.status === 'scheduled'
            }).sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date))

            if (sundayLessons.length === 0) {
              return (
                <div className="empty-state" style={{ 
                  padding: '48px', 
                  textAlign: 'center',
                  backgroundColor: '#f9f9f9',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <p style={{ fontSize: '18px', color: '#666', marginBottom: '12px' }}>
                    No lessons scheduled for this Sunday
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateLesson(true)}
                    style={{ marginTop: '16px' }}
                  >
                    <Plus size={18} />
                    Schedule a Lesson
                  </button>
                </div>
              )
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {sundayLessons.map((lesson) => {
                const isExpanded = expandedLessonId === lesson.id
                const studentName = lesson.students?.profiles?.full_name || 'Unknown Student'
                const lessonTime = new Date(lesson.lesson_date).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })

                return (
            <div 
              key={lesson.id}
              style={{ 
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    {/* Collapsed View - COMPACT */}
                    <div 
                      onClick={() => handleToggleLessonExpansion(lesson.id)}
                      style={{
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: 'white',
                cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        borderBottom: isExpanded ? 'none' : '1px solid #f0f0f0'
                      }}
                      onMouseEnter={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = '#f9f9f9'
                      }}
                      onMouseLeave={(e) => {
                        if (!isExpanded) e.currentTarget.style.backgroundColor = 'white'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '16px',
                        flex: 1 
                      }}>
                        {/* Time */}
                        <div style={{ 
                          fontSize: '15px',
                          fontWeight: '700', 
                          color: 'var(--color-primary)',
                          minWidth: '70px',
                          fontFamily: 'monospace'
                        }}>
                          {lessonTime}
            </div>
                        
                        {/* Vertical separator */}
                        <div style={{
                          width: '1px',
                          height: '24px',
                          backgroundColor: '#e0e0e0'
                        }} />
                        
                        {/* Student Name with Stage Tag and Credits */}
                        <div style={{ 
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: '8px',
                          flex: 1,
                          flexWrap: 'wrap'
                        }} className="student-info-row">
                          <div style={{ 
                            fontSize: '15px',
                            fontWeight: '600',
                            color: 'var(--color-dark)'
                          }}>
                            {studentName}
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            flexWrap: 'wrap'
                          }} className="student-badges">
                            {(() => {
                              // Get lesson count from student data
                              const lessonCount = lesson.students?.lesson_count || 0
                              const stage = getStudentStage(lessonCount)
                              const credits = lesson.students?.lesson_credits || 0
                              return (
                                <>
                                  <span style={{
                                    fontSize: lessonCount === 0 ? '10px' : '11px',
                                    padding: lessonCount === 0 ? '2px 6px' : '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: stage.color,
                                    color: 'white',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {stage.label}
                                  </span>
                                  <span style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    backgroundColor: credits <= 2 ? '#FF9800' : '#f0f0f0',
                                    color: credits <= 2 ? 'white' : '#666',
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {credits} credit{credits !== 1 ? 's' : ''}
                                  </span>
                                </>
                              )
                            })()}
                          </div>
                        </div>

                        {/* Package Progress */}
                        {lesson.students?.student_packages?.[0] && (
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            padding: '4px 8px',
                            backgroundColor: '#f0f0f0',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            📊 {lesson.students.student_packages[0].lessons_used}/{lesson.students.student_packages[0].package_size} lessons
        </div>
      )}
                      </div>
                      
                      {/* Right side - Status and Arrow */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        marginLeft: '16px'
                      }}>
                        {lesson.lesson_plan ? (
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#E8F5E9',
                            color: '#2D7F6F',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            📝 <span>Ready</span>
                          </span>
                        ) : (
                          <span style={{
                            padding: '4px 10px',
                            backgroundColor: '#FFF3E0',
                            color: '#FF9800',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            No Plan
                          </span>
                        )}
                        <span style={{ 
                          fontSize: '14px',
                          color: '#999',
                          transition: 'transform 0.2s'
                        }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded View */}
                    {isExpanded && (
                      <div 
                        style={{
                          padding: '24px',
                          backgroundColor: '#f9f9f9',
                          borderTop: '2px solid var(--color-border)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Lesson Details */}
                        <div style={{ marginBottom: '20px' }}>
                          <h4 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>
                            Lesson Details
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                              <strong>Student:</strong> {studentName}
                      </div>
                            <div>
                              <strong>Time:</strong> {lessonTime}
                      </div>
                            <div>
                              <strong>Status:</strong>
                    <select 
                      value={lesson.status}
                      onChange={(e) => handleUpdateLessonStatus(lesson.id, e.target.value)}
                      className="status-dropdown"
                                style={{ marginLeft: '8px', padding: '4px 8px' }}
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                          {/* Current Package Info */}
                          {lesson.students?.student_packages?.[0] && (
                            <div style={{
                              marginTop: '16px',
                              padding: '12px',
                              backgroundColor: '#f9f9f9',
                              borderRadius: '8px',
                              border: '1px solid #e0e0e0'
                            }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: 'var(--color-primary)' }}>
                                Current Package
              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                <div>
                                  <div style={{ color: '#666' }}>Package Size</div>
                                  <div style={{ fontWeight: '600' }}>{lesson.students.student_packages[0].package_size} lessons</div>
      </div>
                                <div>
                                  <div style={{ color: '#666' }}>Used</div>
                                  <div style={{ fontWeight: '600' }}>{lesson.students.student_packages[0].lessons_used}</div>
                      </div>
                                <div>
                                  <div style={{ color: '#666' }}>Remaining</div>
                                  <div style={{ fontWeight: '600', color: lesson.students.student_packages[0].lessons_remaining <= 2 ? '#FF9800' : 'inherit' }}>
                                    {lesson.students.student_packages[0].lessons_remaining}
                                    {lesson.students.student_packages[0].lessons_remaining <= 2 && ' ⚠️'}
                      </div>
                      </div>
                    </div>
                              <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                                ${lesson.students.student_packages[0].price_per_lesson?.toFixed(2) || '0.00'}/lesson
                  </div>
                            </div>
                      )}
                    </div>

                        {/* Lesson Plan Preview */}
                        {lesson.lesson_plan && (
                          <div style={{ marginBottom: '20px' }}>
                            <h4 style={{ marginBottom: '12px', color: 'var(--color-primary)' }}>
                              Lesson Plan
                            </h4>
                            <div style={{
                              padding: '16px',
                              backgroundColor: 'white',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              whiteSpace: 'pre-wrap',
                              fontSize: '14px',
                              lineHeight: '1.6'
                            }}>
                              {lesson.lesson_plan}
                  </div>
                </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleLessonPlanClick(lesson)}
              >
                            {lesson.lesson_plan ? '✏️ Edit Plan' : '📝 Create Plan'}
              </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => navigate(`/coach/students/${lesson.student_id}`)}
                          >
                            👤 View Student Profile
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleLessonClick(lesson)}
                          >
                            📋 Full Details
                          </button>
          </div>
        </div>
      )}
                  </div>
                )
              })}
            </div>
          )
        })()
        )}
      </div>


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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Lesson Details</h3>
                  {!editingLesson && (
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => {
                        // Ensure edit fields are initialized when clicking Edit
                        const lessonDate = new Date(selectedLessonDetail.lesson_date)
                        setEditLessonDate(lessonDate.toISOString().split('T')[0])
                        setEditLessonTime(lessonDate.toTimeString().slice(0, 5))
                        setEditLessonLocation(selectedLessonDetail.location || '')
                        setEditingLesson(true)
                      }}
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                    >
                      <Edit2 size={14} style={{ marginRight: '4px' }} />
                      Edit
                    </button>
                  )}
                </div>
                
                {editingLesson ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Date:</label>
                      <input
                        type="date"
                        value={editLessonDate}
                        onChange={(e) => setEditLessonDate(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold' }}>Time:</label>
                      <input
                        type="time"
                        value={editLessonTime}
                        onChange={(e) => setEditLessonTime(e.target.value)}
                        className="input"
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleSaveLessonEdit}
                        style={{ padding: '8px 16px' }}
                      >
                        Save Changes
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setEditingLesson(false)
                          // Reset to original values
                          const lessonDate = new Date(selectedLessonDetail.lesson_date)
                          setEditLessonDate(lessonDate.toISOString().split('T')[0])
                          setEditLessonTime(lessonDate.toTimeString().slice(0, 5))
                          setEditLessonLocation(selectedLessonDetail.location || '')
                        }}
                        style={{ padding: '8px 16px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <strong>Date:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                      <strong>Time:</strong> {new Date(selectedLessonDetail.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </>
                )}
                
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

              {selectedLessonDetail.status === 'completed' && (
                <div style={{ marginBottom: '24px' }}>
                  {selectedLessonDetail.coach_feedback ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <h3 style={{ margin: 0, color: 'var(--color-primary)' }}>Coach Feedback</h3>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={async () => {
                            setSelectedFeedbackLesson(selectedLessonDetail)
                            setCoachFeedback(selectedLessonDetail.coach_feedback || '')
                            await loadPracticePlan(selectedLessonDetail.id)
                            handleCloseLessonDetail()
                          }}
                        >
                          Edit Feedback
                        </button>
                      </div>
                      <div style={{ padding: '16px', backgroundColor: '#E8F5E9', borderRadius: '8px', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                        {selectedLessonDetail.coach_feedback}
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        setSelectedFeedbackLesson(selectedLessonDetail)
                        setCoachFeedback('')
                        await loadHomework(selectedLessonDetail.id)
                        handleCloseLessonDetail()
                      }}
                    >
                      Add Feedback
                    </button>
                  )}
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

            <div style={{ marginTop: '24px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: '16px' }}>
                  🎯 Set This Week's Practice Plan
                </label>
                <button 
                  onClick={handleGeneratePracticePlan} 
                  className="btn btn-secondary"
                  disabled={generatingPracticePlan}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {generatingPracticePlan ? '🤖 Generating...' : '✨ Get AI Suggestion'}
                </button>
              </div>
              <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px', fontStyle: 'italic' }}>
                AI will suggest a personalized focus based on their goals and today's lesson
              </p>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Practice Plan (ONE focus for this week)
                </label>
                <textarea
                  value={practicePlan}
                  onChange={(e) => setPracticePlan(e.target.value)}
                  placeholder="Example: Focus on serve toss consistency - 50 tosses in front of mirror, keeping arm relaxed"
                  rows={4}
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Estimated Time
                </label>
                <select 
                  value={practicePlanTime} 
                  onChange={(e) => setPracticePlanTime(e.target.value)}
                  className="input"
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="20">20 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
              </div>
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
                onClick={handleSubmitFeedback}
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

      {/* Log Payment Modal */}
      {showLogPayment && (
        <LogPaymentModal
          onClose={() => setShowLogPayment(false)}
          onSuccess={() => {
            fetchCoachData()
            setShowLogPayment(false)
          }}
        />
      )}

      {/* Referral Celebration Modal */}
      {showReferralCelebration && (
        <ReferralCelebrationModal
          referrerName={referralCelebrationData.referrerName}
          referredName={referralCelebrationData.referredName}
          referrerId={referralCelebrationData.referrerId}
          onClose={() => {
            setShowReferralCelebration(false)
            fetchCoachData() // Refresh to show updated credits
          }}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {/* Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false)
            setConfirmModalConfig(null)
          }}
          onConfirm={() => {
            if (confirmModalConfig.onConfirm) {
              confirmModalConfig.onConfirm()
            }
            setShowConfirmModal(false)
            setConfirmModalConfig(null)
          }}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          confirmText={confirmModalConfig.confirmText}
          cancelText={confirmModalConfig.cancelText}
          type={confirmModalConfig.type}
          isLoading={confirmModalConfig.isLoading}
        />
      )}
        </div>
      </div>
    </CoachLayout>
  )
}



