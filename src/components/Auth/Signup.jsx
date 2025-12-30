import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import './Signup.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState('student')
  const [ntrpLevel, setNtrpLevel] = useState('3.0')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      return
    }

    if (!authData.user) {
      setError('Failed to create user account')
      return
    }

    // Use session from signUp response (available if email confirmation is disabled)
    // If email confirmation is enabled, session will be null and we need a different approach
    const session = authData.session || (await supabase.auth.getSession()).data.session
    
    if (!session) {
      // Email confirmation required - user needs to confirm email first
      // Profile creation should be handled by a database trigger or after email confirmation
      setSuccess(true)
      setError('Please check your email to confirm your account. You will be able to complete your profile after confirmation.')
      setTimeout(() => navigate('/login'), 3000)
      return
    }

    // Create profile with authenticated session
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          phone,
          account_type: accountType,
          ntrp_level: ntrpLevel,
        },
      ])

    if (profileError) {
      setError(profileError.message)
      return
    }

    // If student, create student record
    if (accountType === 'student') {
      const { error: studentError } = await supabase
        .from('students')
        .insert([
          {
            id: authData.user.id,
            start_date: new Date().toISOString(),
          },
        ])

      if (studentError) {
        setError(studentError.message)
        return
      }
    }

    // If player, create hitting partner profile
    if (accountType === 'player') {
      const { error: partnerError } = await supabase
        .from('hitting_partners')
        .insert([
          {
            id: authData.user.id,
            is_active: true,
          },
        ])

      if (partnerError) {
        setError(partnerError.message)
        return
      }
    }

    setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 2000)
  }

  return (
    <div className="signup-container">
      <div className="signup-card">
        <div className="signup-header">
          <div className="signup-logo">OJO</div>
          <div className="signup-tagline">Embrace the Journey</div>
          <h2>Join Ojo Coaching Academy</h2>
        </div>
        {success ? (
          <div className="success-message">Account created! Redirecting...</div>
        ) : (
          <form onSubmit={handleSignup} className="signup-form">
            <div>
              <label className="label">Full Name</label>
              <input
                type="text"
                className="input"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
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
              <label className="label">Phone (Optional)</label>
              <input
                type="tel"
                className="input"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
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
                <option value="1.5">1.5 - Beginner</option>
                <option value="2.0">2.0 - Beginner</option>
                <option value="2.5">2.5 - Beginner+</option>
                <option value="3.0">3.0 - Intermediate</option>
                <option value="3.5">3.5 - Intermediate+</option>
                <option value="4.0">4.0 - Advanced</option>
                <option value="4.5">4.5 - Advanced+</option>
                <option value="5.0+">5.0+ - Expert</option>
              </select>
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Sign Up
            </button>
          </form>
        )}
        <div className="signup-link">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  )
}

