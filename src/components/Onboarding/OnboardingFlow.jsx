import React, { useState, useEffect, useRef } from 'react'
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
  const [currentStep, setCurrentStep] = useState(1)
  const containerRef = useRef(null)
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

  // Scroll to top when step changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
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

        // Send immediate email notification to coach
        try {
          const studentName = studentData?.profiles?.full_name || 'New Student'
          const studentEmail = studentData?.profiles?.email || 'No email provided'
          const bigGoal = developmentPlanData.section1.bigGoal || 'Not specified'
          const goalText = bigGoal === 'custom' 
            ? developmentPlanData.section1.customGoal 
            : (GOAL_OPTIONS.find(g => g.value === bigGoal)?.label || bigGoal)

          const immediateEmailSubject = `New Student Signup: ${studentName}`
          const immediateEmailBody = `
            <h2>New Student Just Signed Up! 🎾</h2>
            <p><strong>Student Name:</strong> ${studentName}</p>
            <p><strong>Email:</strong> ${studentEmail}</p>
            <p><strong>Goal:</strong> ${goalText}</p>
            <p><strong>Development Plan Created:</strong> Yes</p>
            <p><em>You'll receive a detailed email with their full development plan in 30 minutes after calendar sync.</em></p>
          `

          const emailResponse = await fetch('/.netlify/functions/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              to: 'tobi@ojocoachingacademy.com',
              subject: immediateEmailSubject,
              html: immediateEmailBody,
              text: immediateEmailBody.replace(/<[^>]*>/g, '')
            })
          })

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text()
            console.warn('Email function returned non-OK status:', emailResponse.status, errorText)
          }
        } catch (emailError) {
          // Don't block onboarding completion if email fails
          console.error('Error sending immediate notification:', emailError)
        }

      // Schedule delayed email notification (30 minutes after onboarding)
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

        {/* Screen Content */}
        <div className="onboarding-screen">
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
      </div>
    </div>
  )
}

export default OnboardingFlow
