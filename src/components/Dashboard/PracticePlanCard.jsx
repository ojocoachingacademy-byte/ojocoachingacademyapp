import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './PracticePlanCard.css'

export default function PracticePlanCard({ lesson, onComplete }) {
  const [completed, setCompleted] = useState(lesson.practice_plan_completed || false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [updating, setUpdating] = useState(false)

  // Update if lesson prop changes
  useEffect(() => {
    setCompleted(lesson.practice_plan_completed || false)
  }, [lesson.practice_plan_completed])

  const handleComplete = async () => {
    if (updating) return
    
    setUpdating(true)
    
    try {
      const { error } = await supabase
        .from('lessons')
        .update({
          practice_plan_completed: true,
          practice_plan_completed_at: new Date().toISOString()
        })
        .eq('id', lesson.id)
      
      if (!error) {
        setCompleted(true)
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3000)
        
        // Create notification for coach
        await supabase
          .from('notifications')
          .insert({
            user_id: lesson.student_id, // Coach will see this in their notifications
            type: 'practice_plan_completed',
            title: 'Practice Plan Completed!',
            body: `Student completed their practice plan for the lesson on ${new Date(lesson.lesson_date).toLocaleDateString()}`,
            link: `/coach/students/${lesson.student_id}`,
            read: false
          })
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete()
        }
      } else {
        console.error('Error updating practice plan:', error)
        alert('Error marking as complete. Please try again.')
      }
    } catch (error) {
      console.error('Error completing practice plan:', error)
      alert('Error marking as complete. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  if (!lesson.practice_plan) return null

  return (
    <div className={`practice-plan-card ${completed ? 'completed' : 'pending'}`}>
      {showConfetti && (
        <div className="confetti-animation">
          <span>🎉</span>
          <span>✨</span>
          <span>🏆</span>
        </div>
      )}
      
      <div className="practice-plan-header">
        <h3>🎯 Your Practice Plan This Week</h3>
        <span className="time-badge">{lesson.practice_plan_time_estimate || 15} minutes</span>
      </div>
      
      <div className="practice-plan-content">
        <p>{lesson.practice_plan}</p>
      </div>
      
      <div className="practice-plan-footer">
        {completed ? (
          <div className="completion-status">
            <span className="checkmark">✅</span>
            <span className="completion-text">Completed! Great work!</span>
            {lesson.practice_plan_completed_at && (
              <span className="completion-date">
                {new Date(lesson.practice_plan_completed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        ) : (
          <>
            <button 
              onClick={handleComplete}
              className="btn btn-primary complete-button"
              disabled={updating}
            >
              {updating ? 'Saving...' : '✓ Mark as Complete'}
            </button>
            <p className="motivation-text">
              💪 Even 5 minutes makes a difference!
            </p>
          </>
        )}
      </div>
    </div>
  )
}

