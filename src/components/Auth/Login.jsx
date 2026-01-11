import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setShowResend(false)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      const errorMsg = error.message.toLowerCase()
      if (errorMsg.includes('email not confirmed') || 
          errorMsg.includes('not verified') ||
          errorMsg.includes('email not verified')) {
        setError('Please confirm your email first. Check your inbox for the confirmation link.')
        setShowResend(true)
      } else {
        setError(error.message)
      }
    } else {
      navigate('/dashboard')
    }
  }

  const handleResendConfirmation = async () => {
    if (!email) {
      setError('Please enter your email address first.')
      return
    }

    setResending(true)
    setError(null)
    
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirmed`
        }
      })
      
      if (resendError) {
        setError('Failed to resend: ' + resendError.message)
      } else {
        setError(null)
        alert('Confirmation email sent! Check your inbox.')
        setShowResend(false)
      }
    } catch (err) {
      setError('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img 
            src="/Ojo_Coaching_Academy_Logo.png" 
            alt="OJO Coaching Academy" 
            className="login-logo-img"
          />
        </div>
        <form onSubmit={handleLogin} className="login-form">
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {showResend && (
            <div className="resend-section">
              <p className="resend-text">Didn't receive the email?</p>
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleResendConfirmation}
                disabled={resending}
                style={{ width: '100%', marginBottom: '12px' }}
              >
                {resending ? 'Sending...' : 'Resend Confirmation Email'}
              </button>
            </div>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
            Login
          </button>
        </form>
        <div className="login-link">
          Don't have an account? <a href="/signup">Sign up</a>
        </div>
      </div>
    </div>
  )
}

