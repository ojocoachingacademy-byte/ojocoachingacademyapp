import { useEffect, useState } from 'react'
import { getMilestoneData } from '../../utils/lessonMilestones'
import './LessonMilestoneModal.css'

export default function LessonMilestoneModal({ milestone, onClose, onMarkShown }) {
  const [showConfetti, setShowConfetti] = useState(true)
  const milestoneData = getMilestoneData(milestone)

  useEffect(() => {
    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => {
      if (onMarkShown) {
        onMarkShown(milestone)
      }
      if (onClose) {
        onClose()
      }
    }, 5000)

    return () => clearTimeout(timer)
  }, [milestone, onMarkShown, onClose])

  useEffect(() => {
    // Trigger confetti animation when milestone changes
    setShowConfetti(true)
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [milestone])

  const handleClose = () => {
    if (onMarkShown) {
      onMarkShown(milestone)
    }
    if (onClose) {
      onClose()
    }
  }

  if (!milestoneData) return null

  return (
    <div className="milestone-modal-overlay" onClick={handleClose}>
      <div className="milestone-modal-content" onClick={(e) => e.stopPropagation()}>
        {showConfetti && (
          <div className="confetti-container">
            {[...Array(50)].map((_, i) => (
              <div key={i} className="confetti" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][Math.floor(Math.random() * 5)]
              }} />
            ))}
          </div>
        )}
        
        <div className="milestone-icon">
          {milestoneData.emoji}
        </div>
        
        <h2 className="milestone-title">{milestoneData.title}</h2>
        
        <div className="milestone-number">
          {milestone} Lessons
        </div>
        
        <p className="milestone-message">{milestoneData.message}</p>
        
        <p className="milestone-description">{milestoneData.description}</p>
        
        <button 
          className="milestone-close-btn"
          onClick={handleClose}
        >
          Continue Your Journey →
        </button>
      </div>
    </div>
  )
}
