import { X } from 'lucide-react'
import '../shared/Modal.css'
import './PracticePlanCelebrationModal.css'

export default function PracticePlanCelebrationModal({ goal, onClose }) {
  // Get goal text from GOAL_OPTIONS or use custom goal
  const getGoalText = () => {
    if (!goal) return 'your tennis goals'
    
    // If it's a custom goal, return it directly
    if (goal === 'custom' || goal === 'other') {
      return 'your tennis goals'
    }
    
    // Map goal values to labels
    const goalMap = {
      'start_hobby': 'starting a new hobby that gets you outside and exercising',
      'rally_with_friend': 'being able to rally with your partner/friend and actually know what you\'re doing',
      'build_confidence': 'building your confidence to play again after a long break',
      'join_doubles': 'joining a weekly doubles group',
      'usta_league': 'playing in a USTA league or tournament'
    }
    
    return goalMap[goal] || 'your tennis goals'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content celebration-modal" onClick={(e) => e.stopPropagation()}>
        <button 
          className="modal-close-button" 
          onClick={onClose}
          aria-label="Close"
        >
          <X size={24} />
        </button>
        
        <div className="celebration-content">
          <div className="celebration-emoji">🎉</div>
          <h2 className="celebration-title">Amazing job completing your practice plan!</h2>
          <p className="celebration-message">
            Every practice brings you one step closer to accomplishing your goal of{' '}
            <strong>{getGoalText()}</strong>. Keep Going!
          </p>
          <button 
            className="btn btn-primary celebration-button"
            onClick={onClose}
          >
            Keep Going! 💪
          </button>
        </div>
      </div>
    </div>
  )
}
