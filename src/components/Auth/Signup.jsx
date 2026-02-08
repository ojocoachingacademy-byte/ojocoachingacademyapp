import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { NTRP_OPTIONS } from '../../utils/ntrpLabels'
import './Signup.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState('student')
  const [ntrpLevel, setNtrpLevel] = useState('3.0')
  const [error, setError] = useState(null)
  const [signupSuccess, setSignupSuccess] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [resending, setResending] = useState(false)
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)
  const signupCardRef = useRef(null)
  const navigate = useNavigate()

  // Check if content is scrollable and if user has scrolled
  useEffect(() => {
    if (signupSuccess) return // Don't show on success screen

    const card = signupCardRef.current
    if (!card) return

    const checkScroll = () => {
      const isScrollable = card.scrollHeight > card.clientHeight
      const isScrolled = card.scrollTop > 20 // Show if scrolled more than 20px
      const isNearBottom = card.scrollHeight - card.scrollTop - card.clientHeight < 50

      setShowScrollIndicator(isScrollable && !isScrolled && !isNearBottom)
    }

    checkScroll()
    card.addEventListener('scroll', checkScroll)
    // Also check on resize
    window.addEventListener('resize', checkScroll)

    return () => {
      card.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [signupSuccess])

  const validatePhone = (phoneNumber) => {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '')
    return digitsOnly.length === 10
  }

  const handleResendEmail = async () => {
    if (!userEmail) return
    
    setResending(true)
    setError(null)
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirmed`
        }
      })
      
      if (resendError) {
        setError('Failed to resend email: ' + resendError.message)
      } else {
        setError(null)
        // Show temporary success message
        const successMsg = 'Confirmation email sent! Check your inbox.'
        setError(null)
        setTimeout(() => {
          alert(successMsg)
        }, 100)
      }
    } catch (err) {
      setError('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate password match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.')
      return
    }

    // Validate phone number (must be 10 digits)
    if (!validatePhone(phone)) {
      setError('Phone number must be exactly 10 digits')
      return
    }

    // Create auth user with email confirmation redirect
    const fullName = `${firstName} ${lastName}`.trim()
    const phoneDigitsOnly = phone.replace(/\D/g, '')
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect')
    const confirmedUrl = redirect
      ? `${window.location.origin}/auth/confirmed?redirect=${encodeURIComponent(redirect)}`
      : `${window.location.origin}/auth/confirmed`

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phoneDigitsOnly,
          account_type: accountType,
          ntrp_level: ntrpLevel
        },
        emailRedirectTo: confirmedUrl
      }
    })

    if (authError) {
      // Handle specific Supabase errors
      if (authError.message.includes('already registered')) {
        setError('This email is already registered. Please login or reset your password.')
      } else {
        setError(authError.message)
      }
      return
    }

    // CRITICAL: Check if user already exists
    // Supabase returns empty identities array for existing users
    if (authData?.user && authData.user.identities && authData.user.identities.length === 0) {
      setError('This email is already registered. Please login instead, or reset your password if you forgot it.')
      return
    }

    if (!authData.user) {
      setError('Failed to create user account. Please try again.')
      return
    }

    // Store user data in metadata - will be used after email confirmation
    // Profile creation will be handled by database trigger or after confirmation
    
    // Show success message (email confirmation required)
    setSignupSuccess(true)
    setUserEmail(email)
  }

  return (
    <div className="signup-container">
      <div className="signup-card" ref={signupCardRef}>
        <div className="signup-header">
          <img 
            src="/Ojo_Coaching_Academy_Logo.png" 
            alt="OJO Coaching Academy" 
            className="signup-logo-img"
          />
        </div>
        {signupSuccess ? (
          <div className="success-message-container">
            <div className="success-icon">✅</div>
            <h2>Account Created!</h2>
            <p>We sent a confirmation email to:</p>
            <p className="user-email">{userEmail}</p>
            <p className="instructions">
              Click the link in the email to verify your account, then you can log in.
            </p>
            {error && <div className="error-message">{error}</div>}
            <button 
              className="btn btn-secondary"
              onClick={handleResendEmail}
              disabled={resending}
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {resending ? 'Sending...' : 'Resend Confirmation Email'}
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignup} className="signup-form">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="label">First Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <small style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                  Passwords do not match
                </small>
              )}
              {confirmPassword && password === confirmPassword && password.length > 0 && (
                <small style={{ fontSize: '12px', color: '#10b981', marginTop: '4px', display: 'block' }}>
                  ✓ Passwords match
                </small>
              )}
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input
                type="tel"
                className="input"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                maxLength={14}
              />
              <small style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                Must be 10 digits
              </small>
            </div>
            <div>
              <label className="label">Account Type</label>
              <select
                className="input"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="player">Player (Hitting Partners Only)</option>
              </select>
            </div>
            <div>
              <label className="label">NTRP Level</label>
              <select
                className="input"
                value={ntrpLevel}
                onChange={(e) => setNtrpLevel(e.target.value)}
              >
                {NTRP_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            {error && (
              <div className="error-message" style={{
                background: '#FFEBEE',
                border: '1px solid #F44336',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                color: '#D32F2F'
              }}>
                <strong>Error:</strong> {error}
                {error.includes('already registered') && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <a href="/login" style={{ color: '#4B2C6C', textDecoration: 'underline', marginRight: '0.5rem' }}>
                      Go to Login
                    </a>
                    {'or '}
                    <a href="/forgot-password" style={{ color: '#4B2C6C', textDecoration: 'underline' }}>
                      Reset Password
                    </a>
                  </div>
                )}
              </div>
            )}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign Up
            </button>
          </form>
        )}
        <div className="signup-link">
          Already have an account? <a href="/login">Login</a>
        </div>
        
        {/* Scroll Indicator - Only show when form is visible and scrollable */}
        {!signupSuccess && showScrollIndicator && (
          <div className="scroll-indicator">
            <div className="scroll-fade"></div>
            <div className="scroll-prompt">
              <ChevronDown size={24} />
              <span>Scroll for more</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

