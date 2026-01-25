import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { createCoachNotification } from '../../utils/notifications'
import './EmailConfirmed.css'

export default function EmailConfirmed() {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(3)
  const [verified, setVerified] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user came from email confirmation link
    const checkConfirmation = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user?.email_confirmed_at) {
          setVerified(true)
          setLoading(false)
          
          // Create profile if it doesn't exist (using metadata from signup)
          if (session.user.user_metadata) {
            const { full_name, phone, account_type, ntrp_level } = session.user.user_metadata
            
            console.log('📧 EmailConfirmed: Processing user metadata:', {
              full_name,
              account_type,
              email: session.user.email,
              userId: session.user.id
            })
            
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single()

            // Check if student record already exists
            const { data: existingStudent } = await supabase
              .from('students')
              .select('id')
              .eq('id', session.user.id)
              .single()

            console.log('📧 EmailConfirmed: Existing records check:', {
              existingProfile: !!existingProfile,
              existingStudent: !!existingStudent
            })

            // Check if this is a student account
            const isStudentAccount = account_type === 'student'
            
            // Only process if this is a new signup (student doesn't exist yet OR was just created by trigger)
            // We'll send email if: it's a student account AND we have full_name
            const shouldProcessStudent = isStudentAccount && full_name

            console.log('📧 EmailConfirmed: Student account check:', {
              account_type,
              isStudentAccount,
              hasExistingStudent: !!existingStudent,
              hasFullName: !!full_name,
              shouldProcessStudent
            })

            if (shouldProcessStudent) {
              console.log('📧 EmailConfirmed: Processing student signup...')
              
              // Create profile if it doesn't exist
              if (!existingProfile) {
                console.log('📧 EmailConfirmed: Creating profile...')
                const { error: profileError } = await supabase
                  .from('profiles')
                  .insert([
                    {
                      id: session.user.id,
                      email: session.user.email,
                      full_name: full_name,
                      phone: phone || null,
                      account_type: account_type || 'student',
                      ntrp_level: ntrp_level || '3.0',
                    },
                  ])
                if (profileError) {
                  console.error('📧 EmailConfirmed: Error creating profile:', profileError)
                }
              }

              // Create student record if it doesn't exist (might have been created by trigger)
              let studentData = existingStudent
              let studentError = null
              
              if (!existingStudent) {
                console.log('📧 EmailConfirmed: Creating student record...')
                const result = await supabase
                  .from('students')
                  .insert([
                    {
                      id: session.user.id,
                      start_date: new Date().toISOString(),
                      is_active: true, // Auto-set new students as active
                    },
                  ])
                  .select()
                  .single()
                studentData = result.data
                studentError = result.error
              } else {
                console.log('📧 EmailConfirmed: Student record already exists (possibly created by trigger)')
              }

              console.log('📧 EmailConfirmed: Student record result:', {
                success: !studentError,
                error: studentError?.message,
                studentData: studentData ? 'exists' : 'null'
              })

              // Send email notification if we have student data (either newly created or existing)
              // This ensures email is sent even if student was created by a database trigger
              if (studentData || !studentError) {
                console.log('📧 EmailConfirmed: Student record ready, sending email notification...')
                try {
                  const studentName = full_name || 'New Student'
                  const studentEmail = session.user.email || 'No email provided'
                  const studentPhone = phone || 'Not provided'

                  const emailSubject = `New Student Signup: ${studentName}`
                  const emailBody = `
                    <h2>New Student Just Signed Up! 🎾</h2>
                    <p><strong>Student Name:</strong> ${studentName}</p>
                    <p><strong>Email:</strong> ${studentEmail}</p>
                    <p><strong>Phone:</strong> ${studentPhone}</p>
                    <p><strong>NTRP Level:</strong> ${ntrp_level || 'Not specified'}</p>
                    <p><strong>Signup Time:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    <p><em>This student has confirmed their email and their account is ready. They may complete onboarding next.</em></p>
                    <p><a href="https://ojocoachingacademyapp.netlify.app/coach/students/${session.user.id}">View Student Profile →</a></p>
                  `

                  // Use proper URL for Netlify function
                  const functionUrl = window.location.hostname === 'localhost' 
                    ? 'http://localhost:8888/.netlify/functions/send-email'
                    : '/.netlify/functions/send-email'

                  console.log('📧 EmailConfirmed: Calling send-email function at:', functionUrl)
                  console.log('📧 EmailConfirmed: Email payload:', {
                    to: 'tobi@ojocoachingacademy.com',
                    subject: emailSubject,
                    hasHtml: !!emailBody,
                    hasText: !!(emailBody.replace(/<[^>]*>/g, ''))
                  })

                  const emailResponse = await fetch(functionUrl, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      to: 'tobi@ojocoachingacademy.com',
                      subject: emailSubject,
                      html: emailBody,
                      text: emailBody.replace(/<[^>]*>/g, '')
                    })
                  })

                  if (!emailResponse.ok) {
                    const errorData = await emailResponse.text()
                    console.error('Failed to send signup email:', emailResponse.status, errorData)
                    throw new Error(`Email send failed: ${emailResponse.status} - ${errorData}`)
                  }

                  const emailResult = await emailResponse.json()
                  console.log('Signup email sent successfully:', emailResult)

                  // Create in-app notification for coach
                  await createCoachNotification({
                    type: 'student_signup',
                    title: 'New Student Signed Up',
                    body: `${studentName} has signed up and confirmed their email`,
                    link: `/coach/students/${session.user.id}`
                  })
                } catch (emailError) {
                  // Don't block account creation if email fails, but log it
                  console.error('Error sending signup notification email:', emailError)
                  // Still create the notification even if email fails
                  try {
                    await createCoachNotification({
                      type: 'student_signup',
                      title: 'New Student Signed Up',
                      body: `${full_name || 'New Student'} has signed up and confirmed their email`,
                      link: `/coach/students/${session.user.id}`
                    })
                  } catch (notifError) {
                    console.error('Error creating notification:', notifError)
                  }
                }
              }
            } else {
              console.log('📧 EmailConfirmed: Skipping email - conditions not met:', {
                isNewStudent,
                hasFullName: !!full_name,
                account_type,
                existingStudent: !!existingStudent
              })
            }
            
            if (account_type === 'player' && !existingProfile) {
              // Create profile for hitting partner if it doesn't exist
              await supabase
                .from('profiles')
                .insert([
                  {
                    id: session.user.id,
                    email: session.user.email,
                    full_name: full_name,
                    phone: phone || null,
                    account_type: account_type || 'player',
                    ntrp_level: ntrp_level || '3.0',
                  },
                ])

              await supabase
                .from('hitting_partners')
                .insert([
                  {
                    id: session.user.id,
                    is_active: true,
                  },
                ])
            }
          }
          
          // Sign out the auto-created session for security (force manual login)
          await supabase.auth.signOut()
        } else {
          // Not confirmed or no session, redirect to login
          setLoading(false)
          // Navigate after component has mounted
          setTimeout(() => navigate('/login'), 100)
        }
      } catch (error) {
        console.error('Error checking confirmation:', error)
        setLoading(false)
        setTimeout(() => navigate('/login'), 100)
      }
    }
    
    checkConfirmation()
  }, [navigate])

  // Handle countdown and redirect separately
  useEffect(() => {
    if (!verified || loading) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          // Navigate after state update completes
          setTimeout(() => navigate('/login'), 100)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [verified, loading, navigate])

  if (loading) {
    return (
      <div className="email-confirmed-container">
        <div className="confirmed-card">
          <div className="spinner"></div>
          <p>Verifying your email...</p>
        </div>
      </div>
    )
  }

  if (!verified) return null

  return (
    <div className="email-confirmed-container">
      <div className="confirmed-card">
        <div className="success-icon">✅</div>
        <h1>Email Confirmed!</h1>
        <p>Your account is now verified and ready to use.</p>
        <p className="countdown">Redirecting to login in {countdown} seconds...</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/login')}
        >
          Log In Now
        </button>
      </div>
    </div>
  )
}

