import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import './ResetPassword.css'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [validToken, setValidToken] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the email link
    const checkSession = async () => {
      // Wait a bit for Supabase to process the hash fragment from the URL
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setValidToken(true)
      } else {
        // Also check if there's a hash in the URL (Supabase uses hash fragments)
        if (window.location.hash) {
          // Wait a bit more for Supabase to process the hash
          setTimeout(async () => {
            const { data: { session: newSession } } = await supabase.auth.getSession()
            if (newSession) {
              setValidToken(true)
            } else {
              setError('Invalid or expired reset link. Please request a new one.')
            }
          }, 1000)
        } else {
          setError('Invalid or expired reset link. Please request a new one.')
        }
      }
    }
    checkSession()
  }, [])

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        throw updateError
      }

      // Success - redirect to login
      alert('Password updated successfully! You can now login with your new password.')
      navigate('/login')

    } catch (err) {
      console.error('Password update error:', err)
      setError('Failed to update password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!validToken && !error) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="loading">Verifying reset link...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <img 
            src="/Ojo_Coaching_Academy_Logo.png" 
            alt="OJO Coaching Academy" 
            className="reset-password-logo-img"
          />
          <h1>Set New Password</h1>
          <p>Choose a strong password for your account.</p>
        </div>

        {error && !validToken ? (
          <div className="error-card">
            <div className="error-icon">⚠️</div>
            <h2>Invalid Reset Link</h2>
            <p>{error}</p>
            <a href="/forgot-password" className="btn btn-primary">
              Request New Reset Link
            </a>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="reset-password-form">
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                required
                minLength="6"
                autoFocus
              />
              <span className="input-hint">At least 6 characters</span>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                minLength="6"
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
