import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { supabase } from '../../supabaseClient'
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
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState(null)

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

  const sendTestEmail = async () => {
    setSendingTest(true)
    setTestResult(null)

    try {
      // Get current user's email
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        setTestResult({
          success: false,
          message: 'Could not get user email. Please make sure you are logged in.'
        })
        setSendingTest(false)
        return
      }

      const coachEmail = user.email
      if (!coachEmail) {
        setTestResult({
          success: false,
          message: 'User email not found'
        })
        setSendingTest(false)
        return
      }

      // Build image URL (use current origin for local dev or production)
      const imageUrl = `${window.location.origin}/email/tennis-mountain-journey.png`

      // Create test email HTML
      const testEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px;">
                  <tr>
                    <td style="padding: 40px 40px 20px 40px; text-align: center;">
                      <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: #1F2937;">Test Email</h2>
                      <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.5;">This is a test email to confirm email delivery is working correctly.</p>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 40px 40px 40px;">
                      <div style="background: #F9FAFB; padding: 30px; border-radius: 12px; border: 1px solid #E5E7EB;">
                        <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1F2937; font-weight: 600; text-align: center;">🏔️ Tennis Mountain Journey</h3>
                        
                        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                          <tr>
                            <td align="center" style="padding: 0 0 20px 0;">
                              <img src="${imageUrl}" 
                                   alt="Tennis Mountain Journey" 
                                   width="560" 
                                   border="0"
                                   style="width: 100%; max-width: 560px; height: auto; border-radius: 12px; display: block; margin: 0 auto;" />
                              <p style="margin: 12px 0 0 0; font-size: 13px; color: #6B7280; line-height: 1.4;">
                                Open the app to view your Tennis Mountain
                              </p>
                            </td>
                          </tr>
                        </table>
                        
                        <p style="margin: 20px 0 0 0; font-size: 12px; color: #9CA3AF; text-align: center; line-height: 1.5;">
                          If you received this email, your email system is working! 🎉
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <tr>
                    <td style="padding: 0 40px 40px 40px; text-align: center;">
                      <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                        - Ojo Coaching Academy
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `

      // Determine the correct function URL
      // In development, try Netlify Dev server (port 8888) first
      // Otherwise use relative path (works in production or when netlify dev is running)
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const isViteDev = isLocalhost && (window.location.port === '5173' || window.location.port === '')
      
      let functionUrl = '/.netlify/functions/send-email'
      
      // If running Vite dev server, try Netlify Dev server URL
      if (isViteDev) {
        functionUrl = 'http://localhost:8888/.netlify/functions/send-email'
      }

      // Send test email
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: coachEmail,
          subject: 'Ojo Coaching – Test Email',
          html: testEmailHtml,
          text: 'This is a test email to confirm email delivery is working correctly. Open the app to view your Tennis Mountain progress.'
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: '✅ Test email sent successfully'
        })
      } else {
        // Provide helpful error message if Netlify Dev isn't running
        let errorMessage = data.error || 'Failed to send test email'
        if (isViteDev && response.status === 404) {
          errorMessage = 'Netlify functions not available. Please run `netlify dev` instead of `npm run dev` to test email functionality.'
        }
        setTestResult({
          success: false,
          message: errorMessage
        })
      }
    } catch (error) {
      // Provide helpful error message if Netlify Dev isn't running
      let errorMessage = error.message
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      const isViteDev = isLocalhost && (window.location.port === '5173' || window.location.port === '')
      
      if (isViteDev && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        errorMessage = 'Netlify functions not available. Please run `netlify dev` instead of `npm run dev` to test email functionality.'
      }
      
      setTestResult({
        success: false,
        message: `Error: ${errorMessage}`
      })
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <CoachLayout>
      <div className="emails-management">
      <div className="emails-header">
        <h1>📧 Email Management</h1>
        <p className="emails-subtitle">Manually send emails to selected students</p>
        <div style={{ marginTop: '20px' }}>
          <button
            className="btn btn-outline"
            onClick={sendTestEmail}
            disabled={sendingTest || sending}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {sendingTest ? (
              <>
                <Loader size={18} className="spinner" />
                Sending…
              </>
            ) : (
              <>
                <Send size={18} />
                Send Test Email
              </>
            )}
          </button>
          {testResult && (
            <div style={{ 
              marginTop: '12px', 
              padding: '12px', 
              borderRadius: '8px',
              backgroundColor: testResult.success ? '#F0FDF4' : '#FEF2F2',
              color: testResult.success ? '#065F46' : '#991B1B',
              fontSize: '14px',
              display: 'inline-block'
            }}>
              {testResult.message}
            </div>
          )}
        </div>
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
