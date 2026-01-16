import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
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
            
            // Check if profile exists
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', session.user.id)
              .single()

            if (!existingProfile && full_name) {
              // Create profile
              await supabase
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

              // Create student or hitting partner record
              if (account_type === 'student') {
                await supabase
                  .from('students')
                  .insert([
                    {
                      id: session.user.id,
                      start_date: new Date().toISOString(),
                    },
                  ])
              } else if (account_type === 'player') {
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

