import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Calendar, MapPin, Clock } from 'lucide-react'
import '../shared/Modal.css'
import './CreateLessonModal.css'

export default function CreateLessonModal({ isOpen, onClose, studentId, studentName, onSuccess }) {
  const [lessonDate, setLessonDate] = useState('')
  const [lessonTime, setLessonTime] = useState('')
  const [location, setLocation] = useState('Colina Del Sol Park')
  const [loading, setLoading] = useState(false)

  // Set default date to today when modal opens
  useEffect(() => {
    if (isOpen && !lessonDate) {
      const today = new Date()
      const dateString = today.toISOString().split('T')[0]
      setLessonDate(dateString)
    }
  }, [isOpen, lessonDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const lessonDateTime = new Date(`${lessonDate}T${lessonTime}`)
      
      if (lessonDateTime < new Date()) {
        alert('Cannot create a lesson in the past')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('lessons')
        .insert([
          {
            student_id: studentId,
            lesson_date: lessonDateTime.toISOString(),
            location: location || 'Colina Del Sol Park',
            status: 'scheduled'
          }
        ])

      if (error) {
        throw error
      }

      // Deduct one credit
      const { data: student } = await supabase
        .from('students')
        .select('lesson_credits')
        .eq('id', studentId)
        .single()

      if (student && student.lesson_credits > 0) {
        await supabase
          .from('students')
          .update({ lesson_credits: student.lesson_credits - 1 })
          .eq('id', studentId)
      }

      alert('Lesson created successfully!')
      onSuccess?.()
      handleClose()
    } catch (error) {
      console.error('Error creating lesson:', error)
      alert('Error creating lesson: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setLessonDate('')
    setLessonTime('')
    setLocation('Colina Del Sol Park')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-lesson-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Create Lesson</h2>
            <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
              Booking for: <strong>{studentName}</strong>
            </p>
          </div>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-lesson-form">
          <div className="form-field">
            <label className="form-label">
              <Calendar size={18} style={{ marginRight: '8px' }} />
              Date
            </label>
            <input
              type="date"
              className="input"
              value={lessonDate}
              onChange={(e) => setLessonDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <Clock size={18} style={{ marginRight: '8px' }} />
              Time
            </label>
            <input
              type="time"
              className="input"
              value={lessonTime}
              onChange={(e) => setLessonTime(e.target.value)}
              required
            />
          </div>

          <div className="form-field">
            <label className="form-label">
              <MapPin size={18} style={{ marginRight: '8px' }} />
              Location
            </label>
            <input
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Enter location"
              required
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

