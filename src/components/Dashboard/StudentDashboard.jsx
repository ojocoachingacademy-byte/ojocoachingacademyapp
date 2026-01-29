import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Users, Calendar, Award, Target, Edit2, TrendingUp, MessageSquare } from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics'
import './StudentDashboard.css'
import '../shared/Modal.css'
import DevelopmentPlanForm from '../DevelopmentPlan/DevelopmentPlanForm'
import RecentProgress from '../Progress/RecentProgress'
import TestimonialRequestBanner from '../Testimonials/TestimonialRequestBanner'
import MilestoneTracker from '../DevelopmentPlan/MilestoneTracker'
import BookLessonModal from '../Calendar/BookLessonModal'
import GettingStartedChecklist from './GettingStartedChecklist'
import PracticePlanCard from './PracticePlanCard'
import StudentTabs from './StudentTabs'
import HomeTab from './tabs/HomeTab'
import ProgressTab from './tabs/ProgressTab'
import LessonsTab from './tabs/LessonsTab'
import ProfileTab from './tabs/ProfileTab'
import OnboardingFlow from '../Onboarding/OnboardingFlow'
import LessonPlanReadyScreen from '../Onboarding/screens/LessonPlanReadyScreen'
import MoreMenu from '../Layout/MoreMenu'
import { MILESTONES, GOAL_OPTIONS } from '../DevelopmentPlan/MilestonesConstants'
import { logger } from '../../utils/logger'
import { retrySupabaseQuery } from '../../utils/retry'
import { safeJsonParse } from '../../utils/safeJsonParse'
import { useToast, ToastContainer } from '../shared/Toast'
import ConfirmationModal from '../shared/ConfirmationModal'

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('home')
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [selectedLessonForDetails, setSelectedLessonForDetails] = useState(null) // For viewing lesson details
  const [learning1, setLearning1] = useState('')
  const [learning2, setLearning2] = useState('')
  const [learning3, setLearning3] = useState('')
  const [submittingLearnings, setSubmittingLearnings] = useState(false)
  const [developmentPlan, setDevelopmentPlan] = useState([])
  const [editingPlan, setEditingPlan] = useState(false)
  const [user, setUser] = useState(null)
  const [showAllUpcoming, setShowAllUpcoming] = useState(false)
  const [showAllPast, setShowAllPast] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [currentPracticePlan, setCurrentPracticePlan] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showLessonPlanWelcome, setShowLessonPlanWelcome] = useState(false)
  const [firstLessonWithPlan, setFirstLessonWithPlan] = useState(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const { toasts, showToast, removeToast } = useToast()
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState(null)
  const developmentPlanRef = useRef(null)
  const promptedLessonsRef = useRef(new Set())
  const componentMountTimeRef = useRef(new Date()) // Track when component mounted
  const navigate = useNavigate()

  // Clear prompted lessons on mount - start fresh each time component mounts
  // This ensures we only prompt for lessons completed AFTER the component loads
  useEffect(() => {
    componentMountTimeRef.current = new Date()
    promptedLessonsRef.current.clear()
  }, [])

  // Save prompted lessons to sessionStorage whenever it changes
  useEffect(() => {
    const savePromptedLessons = () => {
      const lessonIds = Array.from(promptedLessonsRef.current)
      sessionStorage.setItem('promptedLessons', JSON.stringify(lessonIds))
    }
    
    // Save periodically (every time the ref might have changed)
    const interval = setInterval(savePromptedLessons, 2000)
    return () => clearInterval(interval)
  }, [])


  useEffect(() => {
    let isMounted = true
    
    fetchStudentData(isMounted)
    
    // Listen for profile modal open event from header
    const handleOpenProfileModal = () => {
      if (isMounted) {
        setShowProfileModal(true)
      }
    }
    window.addEventListener('openProfileModal', handleOpenProfileModal)
    
    return () => {
      isMounted = false
      window.removeEventListener('openProfileModal', handleOpenProfileModal)
    }
  }, [])

  // Function to check for newly completed lessons and show modal
  const checkForCompletedLessons = async () => {
    if (!user?.id) return

    try {
      
      // Get all completed lessons - prioritize recently completed ones
      // Only get lessons completed in the last 24 hours to avoid prompting for old lessons
      const oneDayAgo = new Date()
      oneDayAgo.setDate(oneDayAgo.getDate() - 1)
      
      const { data: completedLessons, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'completed')
        .gte('lesson_date', oneDayAgo.toISOString()) // Only lessons from last 24 hours
        .order('lesson_date', { ascending: false })
        .limit(10)

      if (error) {
        console.error('Error checking for completed lessons:', error)
        return
      }

      if (completedLessons && completedLessons.length > 0) {
        // Filter for lessons without learnings (null, empty string, or just whitespace)
        // Exclude lessons with learnings_waived flag
        const lessonsWithoutLearnings = completedLessons.filter(
          lesson => (!lesson.student_learnings || lesson.student_learnings.trim() === '') && !lesson.metadata?.learnings_waived
        )
        
        // Find the most recent one that we haven't prompted for
        // Only prompt for lessons completed AFTER component mounted (new lessons)
        const mountTime = componentMountTimeRef.current
        const lessonToShow = lessonsWithoutLearnings.find(
          lesson => {
            const wasPrompted = promptedLessonsRef.current.has(lesson.id)
            // Check when lesson was completed (use updated_at if available, otherwise lesson_date)
            const completedTime = lesson.updated_at ? new Date(lesson.updated_at) : new Date(lesson.lesson_date)
            const isNewLesson = completedTime >= mountTime // Completed after component mounted
            
            // Show if: not prompted OR it's a new lesson (completed after mount)
            return !wasPrompted || isNewLesson
          }
        )

        if (lessonToShow) {
          // Double-check the lesson still meets criteria
          // Exclude lessons with learnings_waived flag
          if (lessonToShow.status !== 'completed' || 
              (lessonToShow.student_learnings && lessonToShow.student_learnings.trim() !== '') ||
              lessonToShow.metadata?.learnings_waived) {
            return
          }
          
          // Check if this exact lesson is already showing
          if (selectedLesson?.id === lessonToShow.id) {
            return
          }
          
          // If ANY other modal is open, close it first
          if (selectedLesson !== null && selectedLesson.id !== lessonToShow.id) {
            setSelectedLesson(null)
            
            // Wait for state to clear, then show new modal
            setTimeout(() => {
              console.log('Learnings modal opened')
              setSelectedLesson(lessonToShow)
              promptedLessonsRef.current.add(lessonToShow.id)
            }, 150)
            return
          }
          
          // No modal open, show immediately
          console.log('Learnings modal opened')
          setSelectedLesson(lessonToShow)
          promptedLessonsRef.current.add(lessonToShow.id)
        }
      }
    } catch (error) {
      console.error('Error in checkForCompletedLessons:', error)
    }
  }

  // Real-time subscription to detect when lessons are marked as completed
  useEffect(() => {
    if (!user?.id) return

    // Subscribe to lessons table changes for this student
    const channel = supabase
      .channel(`lesson-status-changes-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lessons',
          filter: `student_id=eq.${user.id}`
        },
        async (payload) => {
          const updatedLesson = payload.new
          const oldLesson = payload.old

          // Check if lesson was just marked as completed
          const wasCompleted = updatedLesson.status === 'completed'
          const wasNotCompleted = oldLesson?.status !== 'completed'
          const hasNoLearnings = !updatedLesson.student_learnings || updatedLesson.student_learnings.trim() === ''

          // If lesson was just completed and has no learnings, show the modal
          if (wasCompleted && wasNotCompleted && hasNoLearnings) {
            // Immediately trigger a check (don't wait for polling interval)
            await checkForCompletedLessons()
          } else if (wasCompleted) {
            // Lesson was completed but already has learnings - just refresh the list
            const { data: refreshedLessons } = await supabase
              .from('lessons')
              .select('*')
              .eq('student_id', user.id)
              .order('lesson_date', { ascending: false })
            
            if (refreshedLessons) {
              setLessons(refreshedLessons)
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error - falling back to polling')
        }
      })

    // Fallback: Poll every 2 seconds to check for newly completed lessons
    // This ensures the modal appears even if real-time isn't working
    // Works in both development and production
    
    // Immediate checks on mount (aggressive polling at start)
    checkForCompletedLessons()
    const immediateCheck1 = setTimeout(() => checkForCompletedLessons(), 500)
    const immediateCheck2 = setTimeout(() => checkForCompletedLessons(), 1500)
    const immediateCheck3 = setTimeout(() => checkForCompletedLessons(), 2500)
    
    // Then regular polling every 2 seconds
    const pollInterval = setInterval(() => {
      checkForCompletedLessons()
    }, 2000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
      clearTimeout(immediateCheck1)
      clearTimeout(immediateCheck2)
      clearTimeout(immediateCheck3)
    }
  }, [user?.id])

  const fetchStudentData = async (isMounted = true) => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!isMounted) return
      
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

      if (!isMounted) return

      if (profileError) throw profileError
      setProfile(profileData)

      // Get student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!isMounted) return

      if (studentError) throw studentError
      setStudent(studentData)

      // Check if onboarding should be shown
      // Skip if: onboarding_completed is true OR development_plan already exists
      const hasDevelopmentPlan = studentData.development_plan && 
        (typeof studentData.development_plan === 'string' 
          ? studentData.development_plan.trim() !== '' && studentData.development_plan !== '{}'
          : Object.keys(studentData.development_plan || {}).length > 0)
      const onboardingComplete = studentData.onboarding_completed === true

      if (!onboardingComplete && !hasDevelopmentPlan) {
        setShowOnboarding(true)
      } else if (!onboardingComplete && hasDevelopmentPlan) {
        // User has dev plan but onboarding_completed flag wasn't set
        // Fix it in the database
        await supabase
          .from('students')
          .update({ onboarding_completed: true })
          .eq('id', user.id)
        
        console.log('Fixed onboarding_completed flag for existing user')
      }

      // Development plan is stored in studentData.development_plan (JSON)

      // Get lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', user.id)
        .order('lesson_date', { ascending: false })

      if (!isMounted) return

      if (lessonsError) throw lessonsError
      setLessons(lessonsData || [])

      // Check if we should show the lesson plan welcome screen
      // Only show if: onboarding completed, has a lesson with a plan, hasn't been dismissed, AND no completed lessons yet
      if (studentData.onboarding_completed && lessonsData && lessonsData.length > 0) {
        // Check if student has any completed lessons
        const now = new Date()
        const hasCompletedLesson = lessonsData.some(lesson => {
          const lessonDate = new Date(lesson.lesson_date)
          const status = lesson.status || 'scheduled'
          return (status === 'completed') || (lessonDate < now && status !== 'cancelled')
        })
        
        // Only show welcome screen if they haven't completed any lessons yet
        if (!hasCompletedLesson) {
          // Find the first upcoming lesson with a lesson plan
          const upcomingLessonWithPlan = lessonsData.find(lesson => {
            const lessonDate = new Date(lesson.lesson_date)
            const hasPlan = lesson.lesson_plan || lesson.student_lesson_plan
            return lessonDate > now && hasPlan
          })
          
          if (upcomingLessonWithPlan) {
            // Check if user has already dismissed this welcome screen
            const dismissedKey = `lessonPlanWelcomeDismissed_${upcomingLessonWithPlan.id}`
            const hasDismissed = localStorage.getItem(dismissedKey)
            
            if (!hasDismissed) {
              setFirstLessonWithPlan(upcomingLessonWithPlan)
              setShowLessonPlanWelcome(true)
            }
          }
        }
      }

      // Development plan is stored in student.development_plan (JSON)
      // It will be loaded from studentData

      // Fetch current practice plan (most recent incomplete one)
      await fetchCurrentPracticePlan(user.id)

      if (isMounted) {
        setLoading(false)
      }
    } catch (error) {
      logger.error('Error fetching data:', error)
      if (isMounted) {
        setLoading(false)
      }
    }
  }

  // Fetch current practice plan for student (most recent incomplete one)
  const fetchCurrentPracticePlan = async (studentId) => {
    if (!studentId) return
    
    try {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .not('practice_plan', 'is', null)
        .order('lesson_date', { ascending: false })
        .limit(5)
      
      if (error) {
        logger.error('Error fetching practice plan:', error)
        return
      }
      
      if (data && data.length > 0) {
        // Find the most recent incomplete practice plan only
        // If all are complete, don't show any (it will reappear when a new one is set)
        const incomplete = data.find(lesson => !lesson.practice_plan_completed)
        setCurrentPracticePlan(incomplete || null)
      } else {
        setCurrentPracticePlan(null)
      }
    } catch (error) {
      logger.error('Error fetching practice plan:', error)
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
      logger.error('Error fetching referral data:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleSubmitLearnings = async () => {
    if (!selectedLesson || !learning1.trim() || !learning2.trim() || !learning3.trim()) {
      showToast('Please enter all 3 learnings', 'warning')
      return
    }

    setSubmittingLearnings(true)

    // Combine the three learnings into one string
    const combinedLearnings = `1. ${learning1.trim()}\n2. ${learning2.trim()}\n3. ${learning3.trim()}`

    try {
      const { error } = await retrySupabaseQuery(() =>
        supabase
          .from('lessons')
          .update({ student_learnings: combinedLearnings })
          .eq('id', selectedLesson.id)
      )

      if (error) throw error

      // Create notification for coach
      const { data: { user } } = await supabase.auth.getUser()
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      // Import and use notification utility
      const { createCoachNotification } = await import('../../utils/notifications')
      await createCoachNotification({
        type: 'student_learnings',
        title: 'Student Learnings Submitted',
        body: `${studentProfile?.full_name || 'A student'} has submitted learnings for a lesson`,
        link: `/coach/lessons`
      })

      setSelectedLesson(null)
      setLearning1('')
      setLearning2('')
      setLearning3('')
      fetchStudentData() // Refresh to show updated data
      showToast('Learnings submitted successfully!', 'success')
    } catch (error) {
      logger.error('Error submitting learnings:', error)
      showToast('Error submitting learnings: ' + error.message, 'error')
    } finally {
      setSubmittingLearnings(false)
    }
  }

  const handleCloseLearningsModal = () => {
    setSelectedLesson(null)
    setLearning1('')
    setLearning2('')
    setLearning3('')
    // Don't clear promptedLessonsRef here - we want to remember we prompted
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
    if (!lessons || lessons.length === 0) return
    
    const now = new Date()
    // Find lessons that need to be updated (scheduled but past date)
    const lessonsToUpdate = lessons.filter(lesson => {
      const lessonDate = new Date(lesson.lesson_date)
      return lesson.status === 'scheduled' && lessonDate < now
    })
    
    if (lessonsToUpdate.length === 0) return
    
    // Process updates
    lessonsToUpdate.forEach(lesson => {
      supabase
        .from('lessons')
        .update({ status: 'completed' })
        .eq('id', lesson.id)
        .then(async ({ error }) => {
          if (error) {
            logger.error('Error updating lesson status:', error)
          } else {
            // Check if testimonial request should be created
            // The database trigger will create it, but we can also check client-side
            // and send email notification
            const studentId = student?.id
            if (studentId) {
              // Fetch updated lessons count after update
              const { data: updatedLessons } = await supabase
                .from('lessons')
                .select('id, status, lesson_date')
                .eq('student_id', studentId)
                .eq('status', 'completed')
              
              const currentPastLessonsCount = updatedLessons?.length || 0
              
              if (currentPastLessonsCount >= 5) {
                try {
                  const { checkAndCreateTestimonialRequest } = await import('../../utils/checkAndCreateTestimonialRequest')
                  await checkAndCreateTestimonialRequest(studentId, currentPastLessonsCount)
                } catch (err) {
                  logger.error('Error checking testimonial request:', err)
                }
              }
            }
            // Don't call fetchStudentData here - let the real-time subscription handle updates
          }
        })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.length]) // Only depend on lessons.length to avoid re-running on every render

  // Prepare student data object for tab components
  const studentData = student && profile ? {
    ...student,
    profiles: profile
  } : null

  const renderTabContent = () => {
    switch(activeTab) {
      case 'home':
        return <HomeTab 
          studentData={studentData} 
          onBookLesson={() => setShowBookingModal(true)}
        />
      case 'progress':
        return (
          <ProgressTab 
            studentData={studentData} 
            onEditPlan={() => {
              setEditingPlan(true)
              setActiveTab('progress')
              setTimeout(() => {
                developmentPlanRef.current?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
                })
              }, 100)
            }}
          />
        )
      case 'lessons':
        return (
          <LessonsTab 
            studentData={studentData} 
            onBookLesson={() => setShowBookingModal(true)}
          />
        )
      case 'community':
        return (
          <div className="community-tab-content">
            <div className="community-section">
              <h2>Community</h2>
              <div className="community-options">
                <button 
                  className="community-option-card"
                  onClick={() => navigate('/hitting-partners')}
                >
                  <Users size={24} />
                  <h3>Hitting Partners</h3>
                  <p>Find players to practice with</p>
                </button>
                <button 
                  className="community-option-card"
                  onClick={() => navigate('/tennis-resources')}
                >
                  <Award size={24} />
                  <h3>Tennis Resources</h3>
                  <p>Helpful guides and information</p>
                </button>
                <button 
                  className="community-option-card"
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare size={24} />
                  <h3>Messages</h3>
                  <p>Chat with your coach and partners</p>
                </button>
              </div>
            </div>
          </div>
        )
      default:
        return <HomeTab 
          studentData={studentData} 
          onBookLesson={() => setShowBookingModal(true)}
        />
    }
  }

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
    // Refresh student data to get updated onboarding status
    fetchStudentData()
  }

  const handleLessonPlanWelcomeContinue = () => {
    if (firstLessonWithPlan) {
      // Mark as dismissed so it doesn't show again
      const dismissedKey = `lessonPlanWelcomeDismissed_${firstLessonWithPlan.id}`
      localStorage.setItem(dismissedKey, 'true')
    }
    setShowLessonPlanWelcome(false)
    setFirstLessonWithPlan(null)
  }

  if (loading) {
    return (
      <div className="student-dashboard-wrapper">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  // Show onboarding if needed
  if (showOnboarding && student && studentData) {
    return (
      <OnboardingFlow 
        studentData={studentData}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // Show lesson plan welcome screen if needed
  if (showLessonPlanWelcome && firstLessonWithPlan) {
    return (
      <div className="student-dashboard-wrapper">
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '2rem',
          background: 'linear-gradient(to bottom, #fafafa 0%, #f0f0f0 100%)'
        }}>
          <LessonPlanReadyScreen 
            lesson={firstLessonWithPlan}
            onContinue={handleLessonPlanWelcomeContinue}
            studentName={student?.profiles?.full_name || profile?.full_name}
          />
        </div>
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
    <div className="student-dashboard-wrapper">
      <StudentTabs 
        activeTab={isMoreMenuOpen ? 'more' : activeTab} 
        setActiveTab={setActiveTab}
        showCommunity={Boolean(student?.onboarding_completed)}
        onMoreClick={() => setIsMoreMenuOpen(true)}
      />
      <MoreMenu 
        isOpen={isMoreMenuOpen} 
        onClose={() => setIsMoreMenuOpen(false)} 
      />
      
      <div className="student-dashboard-content">
        {renderTabContent()}
        
        {/* Profile Modal */}
        {showProfileModal && (
          <div className="profile-modal-overlay" onClick={() => setShowProfileModal(false)}>
            <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h2>Profile</h2>
                <button 
                  className="profile-modal-close"
                  onClick={() => setShowProfileModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="profile-modal-body">
                <ProfileTab 
                  studentData={studentData} 
                  onBookLesson={() => {
                    setShowBookingModal(true)
                    setShowProfileModal(false)
                  }}
                  onProfileUpdate={() => {
                    fetchStudentData()
                    setShowProfileModal(false)
                  }}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Legacy content temporarily hidden - will migrate to tabs in Steps 2-5 */}
        <div style={{ display: 'none' }}>
          <div className="student-dashboard">
      {/* Header */}
      <div className="dashboard-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <h1 className="welcome-message">Welcome {(profile?.full_name || studentData?.profiles?.full_name || 'there')}, let's get started! 🎾</h1>
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
              Book Your Lesson →
            </button>
          </div>
        </div>
      </div>

      {/* Getting Started Checklist */}
      {(() => {
        // Check if profile is complete (has name, email, phone)
        const profileComplete = !!(profile?.full_name && profile?.email && profile?.phone)
        const hasDevelopmentPlan = student?.development_plan && 
          (typeof student.development_plan === 'string' ? 
            student.development_plan.trim() !== '' && student.development_plan !== '{}' :
            Object.keys(student.development_plan || {}).length > 0)
        const hasUpcomingLesson = upcomingLessons.length > 0
        const hasCompletedLesson = pastLessons.length > 0
        
        return (
          <GettingStartedChecklist
            profileComplete={profileComplete}
            hasDevelopmentPlan={hasDevelopmentPlan}
            hasUpcomingLesson={hasUpcomingLesson}
            hasCompletedLesson={hasCompletedLesson}
            onSetGoals={() => {
              setEditingPlan(true)
              // Scroll to development plan form after a brief delay to ensure it's rendered
              setTimeout(() => {
                developmentPlanRef.current?.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start' 
                })
              }, 100)
            }}
            onBookLesson={() => setShowBookingModal(true)}
          />
        )
      })()}

      {/* Next Steps Banner - Show guidance for new students */}
      {(() => {
        const hasDevelopmentPlan = student?.development_plan && 
          (typeof student.development_plan === 'string' ? 
            student.development_plan.trim() !== '' && student.development_plan !== '{}' :
            Object.keys(student.development_plan || {}).length > 0)
        const hasUpcomingLesson = upcomingLessons.length > 0
        const nextLesson = upcomingLessons[0]
        
        // Step 1: No development plan
        if (!hasDevelopmentPlan) {
          return (
            <div className="next-steps-banner next-steps-step1">
              <div className="next-steps-content">
                <div className="next-steps-step-number">1</div>
                <div className="next-steps-text">
                  <h2 className="next-steps-title">🎯 Step 1: Set Your Tennis Goals</h2>
                  <p className="next-steps-description">Tell us what you want to achieve with tennis. This helps your coach create the perfect plan for you!</p>
                </div>
                <button
                  onClick={() => {
                    setEditingPlan(true)
                    // Scroll to development plan form after a brief delay
                    setTimeout(() => {
                      developmentPlanRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      })
                    }, 100)
                  }}
                  className="btn btn-primary btn-lg next-steps-button"
                >
                  Set Your Goals →
                </button>
              </div>
            </div>
          )
        }
        
        // Step 2: No upcoming lesson
        if (!hasUpcomingLesson) {
          return (
            <div className="next-steps-banner next-steps-step2">
              <div className="next-steps-content">
                <div className="next-steps-step-number">2</div>
                <div className="next-steps-text">
                  <h2 className="next-steps-title">📅 Step 2: Book Your First Lesson</h2>
                  <p className="next-steps-description">You're ready to start! Book a lesson and your coach will help you reach your goals.</p>
                </div>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="btn btn-primary btn-lg next-steps-button"
                  disabled={!student}
                >
                  Book Your First Lesson →
                </button>
              </div>
            </div>
          )
        }
        
        // All set - show next lesson date
        return (
          <div className="next-steps-banner next-steps-complete">
            <div className="next-steps-content">
              <div className="next-steps-checkmark">✓</div>
              <div className="next-steps-text">
                <h2 className="next-steps-title">You're all set! 🎉</h2>
                <p className="next-steps-description">
                  Your next lesson is on {nextLesson ? new Date(nextLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'coming soon'}
                  {nextLesson && (
                    <span> at {new Date(nextLesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )
      })()}
      
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

      {/* Practice Plan Section */}
      {currentPracticePlan && (
        <PracticePlanCard 
          lesson={currentPracticePlan} 
          onComplete={() => fetchCurrentPracticePlan(user.id)}
          studentGoal={(() => {
            // Extract goal from development plan
            if (!student?.development_plan) return null
            try {
              const plan = typeof student.development_plan === 'string' 
                ? JSON.parse(student.development_plan) 
                : student.development_plan
              const bigGoal = plan?.section1?.bigGoal || plan?.goals?.bigGoal
              // If it's 'other', treat as 'custom'
              if (bigGoal === 'other') return 'custom'
              return bigGoal || null
            } catch {
              return null
            }
          })()}
        />
      )}
      {!currentPracticePlan && pastLessons.length > 0 && (
        <div className="section">
          <div className="empty-state-card">
            <div className="empty-state-icon">🎯</div>
            <h3 className="empty-state-title">No Practice Plan Yet</h3>
            <p className="empty-state-text">Your coach will assign a practice plan after your next lesson!</p>
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
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3 className="empty-state-title">No Upcoming Lessons</h3>
                <p className="empty-state-text">Book your first lesson to get started on your tennis journey!</p>
                <button
                  onClick={() => setShowBookingModal(true)}
                  className="btn btn-primary btn-lg"
                  disabled={!student}
                  style={{ marginTop: '16px' }}
                >
                  Book Your First Lesson →
                </button>
              </div>
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
              <div className="empty-state">
                <div className="empty-state-icon">🎾</div>
                <h3 className="empty-state-title">No Past Lessons Yet</h3>
                <p className="empty-state-text">Complete your first lesson and you'll see your progress here!</p>
              </div>
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
                    {!lesson.student_learnings && lesson.status === 'completed' && !lesson.metadata?.learnings_waived && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedLesson(lesson)
                        }}
                        className="btn btn-primary btn-lg"
                        style={{ marginTop: '16px' }}
                      >
                        Share Your Learnings →
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
        <div className="section" ref={developmentPlanRef}>
          <h2 className="section-title">
            <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Edit Development Plan
          </h2>
          <DevelopmentPlanForm
            student={student}
            onSave={async (planData) => {
              try {
                logger.debug('=== STUDENT DASHBOARD SAVE STARTING ===')
                logger.debug('Plan data being saved:', planData)
                
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                  logger.error('No user found')
                  return
                }

                logger.debug('User ID:', user.id)

                // Check if this is the first time saving a development plan
                const { data: existingStudent } = await supabase
                  .from('students')
                  .select('development_plan')
                  .eq('id', user.id)
                  .single()

                const isFirstPlan = !existingStudent?.development_plan || existingStudent.development_plan === null || existingStudent.development_plan === ''

                // Ensure development_plan is properly formatted as JSON string
                const updateData = {
                  development_plan: typeof planData.development_plan === 'string' 
                    ? planData.development_plan 
                    : JSON.stringify(planData.development_plan),
                  development_plan_notes: planData.development_plan_notes || undefined
                }

                logger.debug('Formatted update data:', updateData)

                const { data, error } = await supabase
                  .from('students')
                  .update(updateData)
                  .eq('id', user.id)
                  .select()

                logger.debug('Save response:', { data, error })

                if (error) {
                  logger.error('Database error:', error)
                  showToast('Failed to save: ' + error.message, 'error')
                  return
                }

                logger.debug('Save successful, returned data:', data)

                // Verify the save
                const { data: verifyData, error: verifyError } = await supabase
                  .from('students')
                  .select('development_plan, development_plan_notes')
                  .eq('id', user.id)
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
                
                // Create notification for coach if this is the first plan
                if (isFirstPlan) {
                  const { data: studentProfile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single()

                  const { createCoachNotification } = await import('../../utils/notifications')
                  await createCoachNotification({
                    type: 'development_plan_completed',
                    title: 'Development Plan Completed',
                    body: `${studentProfile?.full_name || 'A student'} has completed their development plan`,
                    link: `/coach/students/${user.id}`
                  })
                }
                
                // Force refresh student data
                await fetchStudentData()
                
              } catch (error) {
                logger.error('Unexpected error:', error)
                showToast('Error saving plan: ' + error.message, 'error')
              }
            }}
            onCancel={() => setEditingPlan(false)}
            isStudent={true}
          />
        </div>
      ) : student?.development_plan ? (() => {
        try {
          // Commented out debug logging to prevent console spam
          // logger.debug('=== DEVELOPMENT PLAN DEBUG ===')
          // logger.debug('Student object:', student)
          // logger.debug('Has development_plan?:', student?.development_plan)
          // logger.debug('development_plan type:', typeof student?.development_plan)
          
          const plan = typeof student.development_plan === 'string' 
            ? safeJsonParse(student.development_plan, student.development_plan)
            : student.development_plan
          
          // logger.debug('Parsed plan:', plan)
          // logger.debug('Plan has section1?:', !!plan?.section1)
          // logger.debug('Plan has section2?:', !!plan?.section2)
          // logger.debug('Plan has skills?:', !!plan?.skills)
          // logger.debug('Plan has goals?:', !!plan?.goals)
          
          // Check for new structure (section1/section2) or old structure (skills/goals)
          const hasNewStructure = plan?.section1 || plan?.section2
          const hasOldStructure = plan?.skills && plan.skills.length > 0
          
          // logger.debug('Has new structure:', hasNewStructure)
          // logger.debug('Has old structure:', hasOldStructure)
          
          if (!plan || (!hasNewStructure && !hasOldStructure)) {
            // logger.debug('Returning null: No valid plan structure found')
            return null
          }
          
          // logger.debug('Rendering development plan')
          // logger.debug('============================')

          return (
            <div className="section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <Target size={24} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  My Development Plan
                </h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => {
                    setEditingPlan(true)
                    setTimeout(() => {
                      developmentPlanRef.current?.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                      })
                    }, 100)
                  }}
                >
                  <Edit2 size={18} />
                  Edit Your Plan →
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
          logger.error('Error parsing development plan:', error)
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
              onClick={() => {
                setEditingPlan(true)
                setTimeout(() => {
                  developmentPlanRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                  })
                }, 100)
              }}
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

      {/* Submit Learnings Modal - Rendered via Portal to ensure visibility */}
      {selectedLesson && (!selectedLesson.student_learnings || selectedLesson.student_learnings.trim() === '') && !selectedLesson.metadata?.learnings_waived && createPortal(
        <div 
          className="modal-overlay" 
          onClick={handleCloseLearningsModal}
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
            zIndex: 99999,
            opacity: 1,
            visibility: 'visible'
          }}
        >
          <div 
            className="modal-content" 
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative',
              zIndex: 10000,
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '2px solid var(--color-primary)' }}>
              <h2 className="modal-title" style={{ color: 'var(--color-primary)', margin: 0 }}>Reflection Time 🎾</h2>
              <button 
                className="modal-close" 
                onClick={handleCloseLearningsModal}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                ×
              </button>
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
                disabled={!learning1.trim() || !learning2.trim() || !learning3.trim() || submittingLearnings}
                style={{ 
                  opacity: submittingLearnings ? 0.6 : 1,
                  cursor: submittingLearnings ? 'wait' : 'pointer'
                }}
                aria-label="Submit lesson learnings"
              >
                {submittingLearnings ? 'Submitting...' : 'Submit Learnings'}
              </button>
            </div>
          </div>
        </div>
        ,
        document.body
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
        </div>
      </div>
      
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
  )
}

