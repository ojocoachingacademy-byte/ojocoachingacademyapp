import React, { useState } from 'react'
import { supabase } from '../../supabaseClient'
import './ForgotPassword.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)

  const handleResetRequest = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      // Ensure we're using the correct redirect URL
      // Supabase requires the redirect URL to be whitelisted in the dashboard
      const redirectUrl = 'https://ojocoachingacademyapp.netlify.app/reset-password'

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      })

      if (resetError) {
        // Provide more helpful error messages
        if (resetError.message?.includes('redirect')) {
          throw new Error('The reset link URL is not configured. Please contact support.')
        }
        throw resetError
      }

      setSentEmail(email)
      setSuccess(true)
      setEmail('') // Clear the input

    } catch (err) {
      console.error('Password reset error:', err)
      setError('Failed to send reset email. Please check your email address and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <img 
            src="/Ojo_Coaching_Academy_Logo.png" 
            alt="OJO Coaching Academy" 
            className="forgot-password-logo-img"
          />
          <h1>Reset Your Password</h1>
          <p>Enter your email address and we'll send you a link to reset your password.</p>
        </div>

        {success ? (
          <div className="success-card">
            <div className="success-icon">✓</div>
            <h2>Check Your Email</h2>
            <p>
              We've sent a password reset link to <strong>{sentEmail}</strong>
            </p>
            <p className="success-note">
              The link will expire in 1 hour. If you don't see the email, check your spam folder.
            </p>
            <a href="/login" className="btn btn-primary">
              Back to Login
            </a>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="forgot-password-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div className="form-footer">
              <p>
                Remember your password? <a href="/login">Back to Login</a>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
