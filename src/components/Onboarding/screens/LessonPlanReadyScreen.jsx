import React from 'react'
import { CheckCircle, MapPin, Smile } from 'lucide-react'
import './OnboardingScreens.css'

const LessonPlanReadyScreen = ({ lesson, onContinue, studentName }) => {
  const lessonPlan = lesson?.student_lesson_plan || lesson?.lesson_plan || ''
  const lessonDate = lesson ? new Date(lesson.lesson_date) : null

  return (
    <div className="onboarding-screen-content lesson-plan-ready-screen">
      <div className="lesson-plan-ready-container">
        {/* Success Icon */}
        <div className="lesson-plan-ready-icon">
          <CheckCircle size={64} color="#2D7F6F" strokeWidth={2} />
        </div>

        {/* Main Title */}
        <h1 className="lesson-plan-ready-title">
          {studentName ? `${studentName}'s lesson plan is now available! 🎾` : 'Your lesson plan is now available! 🎾'}
        </h1>

        {/* Subtitle */}
        <p className="lesson-plan-ready-subtitle">
          Look through it so you know what you will be working on in lesson 1!
        </p>

        {/* Things to Bring Section */}
        <div className="lesson-plan-section">
          <h2 className="lesson-plan-section-title">Things to bring:</h2>
          <ul className="lesson-plan-checklist">
            <li>
              <CheckCircle size={20} color="#2D7F6F" />
              <span>Your Racket</span>
            </li>
            <li>
              <CheckCircle size={20} color="#2D7F6F" />
              <span>Water</span>
            </li>
            <li>
              <CheckCircle size={20} color="#2D7F6F" />
              <span>Tennis Shoes</span>
            </li>
            <li>
              <Smile size={20} color="#F4C430" />
              <span>A Smile :)</span>
            </li>
          </ul>
        </div>

        {/* Directions Section */}
        <div className="lesson-plan-section">
          <h2 className="lesson-plan-section-title">
            <MapPin size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Directions:
          </h2>
          <p className="lesson-plan-directions">
            The tennis courts at Colina Del Sol are located on Orange Avenue between 52nd and 54th street. 
            There are parking bays by the stairs that walk you down to the courts. We will be on court 5, 
            next to the pickleball courts.
          </p>
        </div>

        {/* Lesson Plan Section */}
        {lessonPlan && (
          <div className="lesson-plan-section lesson-plan-content">
            <h2 className="lesson-plan-section-title">Your Lesson Plan:</h2>
            {lessonDate && (
              <p className="lesson-plan-date">
                {lessonDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} at {lessonDate.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            )}
            <div className="lesson-plan-text">
              {lessonPlan}
            </div>
          </div>
        )}

        {/* Continue Button */}
        <button 
          className="btn-onboarding-primary lesson-plan-continue-btn"
          onClick={onContinue}
        >
          Continue to Dashboard
        </button>
      </div>
    </div>
  )
}

export default LessonPlanReadyScreen
