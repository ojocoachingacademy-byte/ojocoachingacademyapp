import { CheckCircle, Circle, ArrowRight } from 'lucide-react'
import './GettingStartedChecklist.css'

export default function GettingStartedChecklist({ 
  profileComplete = false,
  hasDevelopmentPlan = false,
  hasUpcomingLesson = false,
  hasCompletedLesson = false,
  onSetGoals,
  onBookLesson
}) {
  const checklistItems = [
    {
      id: 'profile',
      label: 'Complete your profile',
      completed: profileComplete,
      action: null // Profile editing is in settings
    },
    {
      id: 'goals',
      label: 'Set your tennis goals',
      completed: hasDevelopmentPlan,
      action: onSetGoals
    },
    {
      id: 'book',
      label: 'Book your first lesson',
      completed: hasUpcomingLesson,
      action: onBookLesson
    },
    {
      id: 'complete',
      label: 'Complete your first lesson',
      completed: hasCompletedLesson,
      action: null
    }
  ]

  const completedCount = checklistItems.filter(item => item.completed).length
  const totalCount = checklistItems.length
  const progressPercent = (completedCount / totalCount) * 100

  // Hide checklist when all items are complete
  if (completedCount === totalCount) {
    return null
  }

  return (
    <div className="getting-started-checklist">
      <div className="checklist-header">
        <h3 className="checklist-title">Getting Started 🎾</h3>
        <div className="checklist-progress-text">
          {completedCount} of {totalCount} complete
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="checklist-progress-bar-container">
        <div 
          className="checklist-progress-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Checklist Items */}
      <div className="checklist-items">
        {checklistItems.map((item) => (
          <div 
            key={item.id} 
            className={`checklist-item ${item.completed ? 'completed' : ''}`}
          >
            <div className="checklist-item-icon">
              {item.completed ? (
                <CheckCircle size={24} className="check-icon" />
              ) : (
                <Circle size={24} className="circle-icon" />
              )}
            </div>
            <span className="checklist-item-label">{item.label}</span>
            {!item.completed && item.action && (
              <button
                onClick={item.action}
                className="checklist-action-button"
              >
                Do it <ArrowRight size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

