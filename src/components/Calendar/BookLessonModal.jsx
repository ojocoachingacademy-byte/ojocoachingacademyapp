import { useEffect } from 'react'
import { getCalApi } from "@calcom/embed-react"
import Cal from "@calcom/embed-react"
import '../shared/Modal.css'
import './BookLessonModal.css'

export default function BookLessonModal({ isOpen, onClose, studentId, studentEmail, availableCredits }) {
  useEffect(() => {
    if (isOpen) {
      (async function () {
        const cal = await getCalApi()
        cal("ui", {
          theme: "light",
          styles: { 
            branding: { 
              brandColor: "#4B2C6C" 
            } 
          },
          hideEventTypeDetails: false,
          layout: "month_view"
        })
      })()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cal-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Book a Lesson</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Available Credits: <strong style={{ color: 'var(--color-primary)' }}>{availableCredits}</strong>
            </p>
            {availableCredits === 0 && (
              <p style={{ margin: '8px 0 0 0', color: '#F44336', fontSize: '14px', fontWeight: 600 }}>
                ⚠️ No credits available. Contact coach to purchase lessons.
              </p>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="cal-embed-container">
          <Cal
            calLink="tobi-ojo-jg8ane/60min"
            style={{ width: "100%", height: "600px", overflow: "scroll" }}
            config={{
              name: studentEmail || "prefilled-from-app",
              email: studentEmail || "prefilled-from-app",
              metadata: {
                studentId: studentId,
                source: "ojo-coaching-app"
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}




