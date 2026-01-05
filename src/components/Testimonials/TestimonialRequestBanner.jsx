import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { MessageSquare, X } from 'lucide-react'
import TestimonialSubmission from './TestimonialSubmission'
import './TestimonialRequestBanner.css'

export default function TestimonialRequestBanner({ studentId, lessonCount }) {
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    checkPendingRequest()
  }, [studentId])

  const checkPendingRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('testimonial_requests')
        .select('id')
        .eq('student_id', studentId)
        .eq('status', 'pending')
        .limit(1)

      if (!error && data && data.length > 0) {
        setHasPendingRequest(true)
      }
    } catch (error) {
      console.error('Error checking testimonial request:', error)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    // Store dismissal in localStorage to persist across sessions
    localStorage.setItem(`testimonial_dismissed_${studentId}`, 'true')
  }

  // Check if dismissed in localStorage
  useEffect(() => {
    const dismissedKey = localStorage.getItem(`testimonial_dismissed_${studentId}`)
    if (dismissedKey === 'true') {
      setDismissed(true)
    }
  }, [studentId])

  if (!hasPendingRequest || dismissed) {
    return null
  }

  return (
    <>
      <div className="testimonial-request-banner">
        <div className="testimonial-request-content">
          <MessageSquare size={24} className="testimonial-icon" />
          <div className="testimonial-request-text">
            <strong>Share Your Experience!</strong>
            <span>We'd love to hear about your journey. Submit a testimonial and help others discover OJO Coaching Academy.</span>
          </div>
        </div>
        <div className="testimonial-request-actions">
          <button
            className="btn-testimonial-submit"
            onClick={() => setShowSubmissionModal(true)}
          >
            Submit Testimonial
          </button>
          <button
            className="btn-testimonial-dismiss"
            onClick={handleDismiss}
            title="Dismiss"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {showSubmissionModal && (
        <TestimonialSubmission
          studentId={studentId}
          lessonCount={lessonCount}
          onClose={() => {
            setShowSubmissionModal(false)
            setHasPendingRequest(false) // Hide banner after submission
            handleDismiss() // Auto-dismiss after submission
          }}
          onSuccess={() => {
            setHasPendingRequest(false)
            setShowSubmissionModal(false)
          }}
        />
      )}
    </>
  )
}

