import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { Mail, Send, CheckCircle, XCircle, Loader } from 'lucide-react'
import StudentSelectionModal from './StudentSelectionModal'
import CoachLayout from '../Layout/CoachLayout'
import './EmailsManagement.css'

export default function EmailsManagement() {
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [selectedEmailType, setSelectedEmailType] = useState(null)
  const [selectedStudents, setSelectedStudents] = useState([])
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  const emailTypes = [
    {
      id: 'wednesday-checkin',
      name: 'Wednesday Check-In',
      description: 'Midweek check-in emails for upcoming Sunday lessons',
      icon: Mail,
      requiresStudentSelection: true,
      method: 'GET'
    },
    {
      id: 'lesson-recap',
      name: 'Lesson Recap',
      description: 'Send recap emails for completed lessons with feedback',
      icon: Mail,
      requiresStudentSelection: false,
      method: 'GET',
      note: 'Sends to all students with completed lessons from today'
    },
    {
      id: 'testimonial-request',
      name: 'Testimonial Request',
      description: 'Request testimonials from students',
      icon: Mail,
      requiresStudentSelection: true,
      method: 'POST',
      requiresBody: true
    },
    {
      id: 'testimonial-thankyou',
      name: 'Testimonial Thank You',
      description: 'Send thank you emails after testimonial submission',
      icon: Mail,
      requiresStudentSelection: true,
      method: 'POST',
      requiresBody: true
    },
    {
      id: 'lesson-plan-ready',
      name: 'Lesson Plan Ready Notification',
      description: 'Notify students when their lesson plan is ready (sends email)',
      icon: Mail,
      requiresStudentSelection: true,
      method: 'POST',
      requiresBody: true,
      note: 'Sends email using the student\'s latest lesson plan'
    }
  ]

  const handleEmailClick = (emailType) => {
    setSelectedEmailType(emailType)
    setResult(null)
    
    if (emailType.requiresStudentSelection) {
      setShowStudentModal(true)
    } else {
      // For emails that don't require student selection (like lesson-recap)
      sendEmails(emailType, [])
    }
  }

  const handleStudentsSelected = async (students) => {
    setShowStudentModal(false)
    setSelectedStudents(students)
    
    if (students.length === 0) {
      setResult({ success: false, message: 'No students selected' })
      return
    }

    await sendEmails(selectedEmailType, students)
  }

  const sendEmails = async (emailType, students) => {
    setSending(true)
    setResult(null)

    try {
      let functionUrl = ''
      let requestOptions = {}

      // Build function URL and request options based on email type
      switch (emailType.id) {
        case 'wednesday-checkin':
          const studentNames = students.map(s => s.full_name.split(' ')[0].toLowerCase()).join(',')
          functionUrl = `/.netlify/functions/send-wednesday-checkins?students=${encodeURIComponent(studentNames)}`
          requestOptions = { method: 'GET' }
          break

        case 'lesson-recap':
          // Lesson recap sends to all students with completed lessons from today
          functionUrl = `/.netlify/functions/send-lesson-recap`
          requestOptions = { method: 'GET' }
          break

        case 'testimonial-request':
          // Send testimonial request to each selected student
          await sendTestimonialEmails(students, 'request')
          return

        case 'testimonial-thankyou':
          // Send thank you to each selected student
          await sendTestimonialEmails(students, 'thankyou')
          return

        case 'lesson-plan-ready':
          // This requires lesson data - fetch latest lesson plan for each student
          await sendLessonPlanReadyEmails(students)
          return

        default:
          setResult({
            success: false,
            message: `Unknown email type: ${emailType.id}`,
            details: null
          })
          setSending(false)
          return
      }

      const response = await fetch(functionUrl, requestOptions)
      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Emails sent successfully! Sent: ${data.sent || data.synced || 0}, Errors: ${data.errors || data.failed || 0}`,
          details: data
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send emails',
          details: data
        })
      }
    } catch (error) {
      setResult({
        success: false,
        message: `Error: ${error.message}`,
        details: null
      })
    } finally {
      setSending(false)
    }
  }

  const sendTestimonialEmails = async (students, type) => {
    let sentCount = 0
    let errorCount = 0
    const errors = []

    for (const student of students) {
      try {
        const response = await fetch('/.netlify/functions/send-testimonial-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: type,
            to: student.email,
            name: student.full_name,
            lessonCount: 5 // Default, can be customized
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          sentCount++
        } else {
          errorCount++
          errors.push({ student: student.full_name, error: data.error || 'Unknown error' })
        }
      } catch (error) {
        errorCount++
        errors.push({ student: student.full_name, error: error.message })
      }
    }

    setResult({
      success: errorCount === 0,
      message: `Sent ${sentCount} ${type === 'request' ? 'testimonial request' : 'thank you'} emails. Errors: ${errorCount}`,
      details: errors.length > 0 ? { errors } : null
    })
    setSending(false)
  }

  const sendLessonPlanReadyEmails = async (students) => {
    let sentCount = 0
    let errorCount = 0
    const errors = []

    for (const student of students) {
      try {
        // Fetch the student's latest lesson with a lesson plan
        const { data: lesson, error: lessonError } = await supabaseAdmin
          .from('lessons')
          .select('id, lesson_date, lesson_plan')
          .eq('student_id', student.id)
          .not('lesson_plan', 'is', null)
          .order('lesson_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lessonError || !lesson) {
          errorCount++
          errors.push({ 
            student: student.full_name, 
            error: lessonError ? lessonError.message : 'No lesson plan found for this student' 
          })
          continue
        }

        // Send the notification email
        const response = await fetch('/.netlify/functions/notify-lesson-plan-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentId: student.id,
            studentName: student.full_name,
            studentEmail: student.email,
            lessonId: lesson.id,
            lessonDate: lesson.lesson_date,
            lessonPlan: lesson.lesson_plan
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          sentCount++
        } else {
          errorCount++
          errors.push({ student: student.full_name, error: data.error || 'Unknown error' })
        }
      } catch (error) {
        errorCount++
        errors.push({ student: student.full_name, error: error.message })
      }
    }

    setResult({
      success: errorCount === 0,
      message: `Sent ${sentCount} lesson plan ready emails. Errors: ${errorCount}`,
      details: errors.length > 0 ? { errors } : null
    })
    setSending(false)
  }

  return (
    <CoachLayout>
      <div className="emails-management">
      <div className="emails-header">
        <h1>📧 Email Management</h1>
        <p className="emails-subtitle">Manually send emails to selected students</p>
      </div>

      <div className="emails-content">
        <div className="email-types-grid">
          {emailTypes.map((emailType) => {
            const Icon = emailType.icon
            return (
              <div key={emailType.id} className="email-type-card">
                <div className="email-type-icon">
                  <Icon size={32} />
                </div>
                <h3>{emailType.name}</h3>
                <p>{emailType.description}</p>
                {emailType.note && (
                  <p style={{ fontSize: '12px', color: '#999', fontStyle: 'italic', marginTop: '4px' }}>
                    {emailType.note}
                  </p>
                )}
                <button
                  className="btn btn-primary"
                  onClick={() => handleEmailClick(emailType)}
                  disabled={sending}
                >
                  <Send size={18} style={{ marginRight: '8px' }} />
                  Send Email
                </button>
              </div>
            )
          })}
        </div>

        {sending && (
          <div className="sending-status">
            <Loader size={24} className="spinner" />
            <p>Sending emails...</p>
          </div>
        )}

        {result && (
          <div className={`result-message ${result.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {result.success ? <CheckCircle size={24} /> : <XCircle size={24} />}
            </div>
            <div className="result-content">
              <p className="result-message-text">{result.message}</p>
              {result.details && (
                <div className="result-details">
                  <pre>{JSON.stringify(result.details, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showStudentModal && (
        <StudentSelectionModal
          isOpen={showStudentModal}
          onClose={() => {
            setShowStudentModal(false)
            setSelectedEmailType(null)
          }}
          onConfirm={handleStudentsSelected}
          title={`Select Students for ${selectedEmailType?.name}`}
        />
      )}
      </div>
    </CoachLayout>
  )
}
