import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { trackEvent, EVENTS } from '../../utils/analytics'
import { GOAL_OPTIONS } from '../DevelopmentPlan/MilestonesConstants'
import WelcomeScreen from './screens/WelcomeScreen'
import YourWhyScreen from './screens/YourWhyScreen'
import RateYourSkillsScreen from './screens/RateYourSkillsScreen'
import JourneySummaryScreen from './screens/JourneySummaryScreen'
import ProgressLadderRevealScreen from './screens/ProgressLadderRevealScreen'
import './OnboardingFlow.css'

const OnboardingFlow = ({ studentData, onComplete }) => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const containerRef = useRef(null)
  const scrollContentRef = useRef(null)
  const [developmentPlanData, setDevelopmentPlanData] = useState({
    section1: {
      triggerReason: '',
      bigGoal: '',
      customGoal: '',
      sundayVision: '',
      customSundayVision: ''
    },
    section2: {
      skillRatings: {
        forehand: null,
        backhand: null,
        serve: null,
        net: null,
        movement: null
      },
      targetRatings: {
        forehand: 0,
        backhand: 0,
        serve: 0,
        net: 0,
        movement: 0
      }
    }
  })

  useEffect(() => {
    trackEvent(EVENTS.ONBOARDING_START)
  }, [])

  useEffect(() => {
    async function checkUserType() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) return

      const { data: student } = await supabase
        .from('students')
        .select('is_active')
        .eq('id', user.id)
        .single()

      if (student && !student.is_active) {
        navigate('/hitting-partners')
      }
    }
    checkUserType()
  }, [navigate])

  // Scroll to top when step changes (scroll the content div that has overflowY: auto)
  useEffect(() => {
    if (scrollContentRef.current) {
      scrollContentRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'auto'
      })
    }
  }, [currentStep])

  const updateDevelopmentPlan = (updates) => {
    setDevelopmentPlanData(prev => {
      const newData = { ...prev }
      
      // Handle section1 updates
      if (updates.triggerReason !== undefined) newData.section1.triggerReason = updates.triggerReason
      if (updates.bigGoal !== undefined) newData.section1.bigGoal = updates.bigGoal
      if (updates.customGoal !== undefined) newData.section1.customGoal = updates.customGoal
      if (updates.sundayVision !== undefined) newData.section1.sundayVision = updates.sundayVision
      if (updates.customSundayVision !== undefined) newData.section1.customSundayVision = updates.customSundayVision
      
      // Handle section2 updates
      if (updates.skillRatings) newData.section2.skillRatings = { ...newData.section2.skillRatings, ...updates.skillRatings }
      if (updates.targetRatings) newData.section2.targetRatings = { ...newData.section2.targetRatings, ...updates.targetRatings }
      
      return newData
    })
  }

  // Auto-fill target ratings based on bigGoal
  useEffect(() => {
    const bigGoal = developmentPlanData.section1.bigGoal
    if (!bigGoal || bigGoal === 'custom') return

    const goal = GOAL_OPTIONS.find(g => g.value === bigGoal)
    if (!goal || !goal.targetMilestone) return

    let targetValue = 5 // Default
    if (goal.targetMilestone <= 15) {
      targetValue = 5
    } else if (goal.targetMilestone <= 20) {
      targetValue = 6
    } else {
      targetValue = 7
    }

    setDevelopmentPlanData(prev => ({
      ...prev,
      section2: {
        ...prev.section2,
        targetRatings: {
          forehand: targetValue,
          backhand: targetValue,
          serve: targetValue,
          net: targetValue,
          movement: targetValue
        }
      }
    }))
  }, [developmentPlanData.section1.bigGoal])

  const nextStep = () => {
    setCurrentStep(prev => prev + 1)
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const completeOnboarding = async () => {
    try {
      // Prepare development plan data
      const finalPlan = {
        section1: {
          triggerReason: developmentPlanData.section1.triggerReason,
          bigGoal: developmentPlanData.section1.bigGoal,
          customGoal: developmentPlanData.section1.customGoal,
          sundayVision: developmentPlanData.section1.sundayVision === 'custom' 
            ? developmentPlanData.section1.customSundayVision 
            : developmentPlanData.section1.sundayVision,
          customSundayVision: developmentPlanData.section1.sundayVision === 'custom' 
            ? developmentPlanData.section1.customSundayVision 
            : ''
        },
        section2: {
          skillRatings: developmentPlanData.section2.skillRatings,
          targetRatings: developmentPlanData.section2.targetRatings
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save to students table
      const updateData = {
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        development_plan: JSON.stringify(finalPlan),
        lesson_credits: 1 // Default credit for new students
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', studentData.id)

      if (error) throw error

      trackEvent(EVENTS.ONBOARDING_COMPLETE, {
        has_goal: !!developmentPlanData.section1.bigGoal,
        target_milestone: developmentPlanData.section1.bigGoal ? 
          (GOAL_OPTIONS.find(g => g.value === developmentPlanData.section1.bigGoal)?.targetMilestone || null) 
          : null
      })

        // REMOVED: Immediate email notification
        // Only the delayed email (below) will be sent to prevent duplicates

      // Schedule delayed email notification (30 minutes after onboarding)
      // This is the ONLY email sent after development plan completion
      try {
        await fetch('/.netlify/functions/delayed-onboarding-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: studentData.id,
            studentName: studentData?.profiles?.full_name || 'New Student',
            studentEmail: studentData?.profiles?.email || 'No email provided',
            studentPhone: studentData?.profiles?.phone || 'Not provided',
            developmentPlan: finalPlan,
            signupTimestamp: new Date().toISOString()
          })
        })
      } catch (emailError) {
        // Don't block onboarding completion if email fails
        console.error('Error scheduling delayed notification:', emailError)
      }

      // Call parent callback
      onComplete()

    } catch (error) {
      console.error('Error completing onboarding:', error)
      alert('Failed to save your information. Please try again.')
    }
  }

  const totalSteps = 5
  const progress = (currentStep / totalSteps) * 100

  // Step 2: Next disabled until all 3 questions answered (trigger, goal, sunday vision)
  const s1 = developmentPlanData.section1
  const hasTrigger = s1.triggerReason != null && String(s1.triggerReason).trim().length > 0
  const hasGoal = s1.bigGoal && (s1.bigGoal !== 'custom' || (s1.customGoal && s1.customGoal.trim()))
  const hasSundayVision = s1.sundayVision && (s1.sundayVision !== 'custom' || (s1.customSundayVision && s1.customSundayVision.trim()))
  const canProceedStep2 = hasTrigger && hasGoal && hasSundayVision
  // Step 3: Next disabled until all skills rated
  const skillRatings = developmentPlanData.section2.skillRatings || {}
  const allSkillsRated = ['forehand', 'backhand', 'serve', 'net', 'movement'].every(
    (k) => skillRatings[k] != null
  )
  const canProceedStep3 = allSkillsRated

  const isStep5 = currentStep === 5
  const nextLabel = currentStep === 1 ? 'Get Started' : currentStep === 4 ? 'See My Path' : isStep5 ? "Let's Play! 🎾" : 'Next →'
  const nextDisabled = (currentStep === 2 && !canProceedStep2) || (currentStep === 3 && !canProceedStep3)

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container" ref={containerRef}>
        {/* Progress Bar */}
        <div className="onboarding-progress-bar">
          <div 
            className="onboarding-progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Progress Indicator */}
        <div className="onboarding-step-indicator">
          Step {currentStep} of {totalSteps}
        </div>

        {/* Screen Content - padding so content isn't hidden by fixed buttons */}
        <div
          ref={scrollContentRef}
          className="onboarding-screen"
          style={{
            padding: '24px 20px',
            paddingBottom: 'calc(140px + env(safe-area-inset-bottom))',
            minHeight: 'calc(100vh - 70px)',
            overflowY: 'auto',
            boxSizing: 'border-box'
          }}
        >
          {currentStep === 1 && (
            <WelcomeScreen 
              studentName={studentData?.profiles?.full_name}
              onNext={nextStep}
            />
          )}

          {currentStep === 2 && (
            <YourWhyScreen
              triggerReason={developmentPlanData.section1.triggerReason}
              bigGoal={developmentPlanData.section1.bigGoal}
              customGoal={developmentPlanData.section1.customGoal}
              sundayVision={developmentPlanData.section1.sundayVision}
              customSundayVision={developmentPlanData.section1.customSundayVision}
              onUpdate={updateDevelopmentPlan}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 3 && (
            <RateYourSkillsScreen
              skillRatings={developmentPlanData.section2.skillRatings}
              targetRatings={developmentPlanData.section2.targetRatings}
              onUpdate={updateDevelopmentPlan}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 4 && (
            <JourneySummaryScreen
              developmentPlanData={developmentPlanData}
              onNext={nextStep}
              onBack={prevStep}
            />
          )}

          {currentStep === 5 && (
            <ProgressLadderRevealScreen
              studentData={studentData}
              developmentPlanData={developmentPlanData}
              onComplete={completeOnboarding}
              onBack={prevStep}
            />
          )}
        </div>

        {/* Single fixed button bar - sits above nav with safe area support */}
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(70px + env(safe-area-inset-bottom))',
            left: 0,
            right: 0,
            padding: '12px 16px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            zIndex: 100,
            boxSizing: 'border-box'
          }}
        >
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            style={{
              width: '100%',
              padding: '14px',
              marginBottom: '8px',
              background: 'white',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              opacity: currentStep === 1 ? 0.5 : 1,
              boxSizing: 'border-box'
            }}
          >
            ← Back
          </button>

          <button
            onClick={isStep5 ? completeOnboarding : nextStep}
            disabled={!isStep5 && nextDisabled}
            style={{
              width: '100%',
              padding: '14px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: (!isStep5 && nextDisabled) ? 'not-allowed' : 'pointer',
              opacity: (!isStep5 && nextDisabled) ? 0.6 : 1,
              boxSizing: 'border-box'
            }}
          >
            {nextLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default OnboardingFlow
