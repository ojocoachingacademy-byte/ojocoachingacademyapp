import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import './Signup.css'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [accountType, setAccountType] = useState('student')
  const [ntrpLevel, setNtrpLevel] = useState('3.0')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const validatePhone = (phoneNumber) => {
    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '')
    return digitsOnly.length === 10
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    setError(null)

    // Validate phone number (must be 10 digits)
    if (!validatePhone(phone)) {
      setError('Phone number must be exactly 10 digits')
      return
    }

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
    const fullName = `${firstName} ${lastName}`.trim()
    const phoneDigitsOnly = phone.replace(/\D/g, '')
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .insert([
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          phone: phoneDigitsOnly,
          account_type: accountType,
          ntrp_level: ntrpLevel,
        },
      ])
      .select()
      .single()

    if (profileError || !profileData) {
      setError(profileError?.message || 'Failed to create profile')
      console.error('Profile creation error:', profileError)
      return
    }

    // If student, create student record (only after profile is confirmed created)
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
        setError(`Failed to create student record: ${studentError.message}`)
        console.error('Student creation error:', studentError)
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
          <img 
            src="/Ojo_Coaching_Academy_Logo.png" 
            alt="Ojo Coaching Academy" 
            className="signup-logo-img"
          />
          <div className="signup-brand">
            <span className="brand-ojo">OJO</span>
            <span className="brand-coaching">COACHING</span>
            <span className="brand-academy">ACADEMY</span>
          </div>
          <div className="signup-tagline">Embrace the Journey</div>
          <h2>Join the Academy</h2>
        </div>
        {success ? (
          <div className="success-message">Account created! Redirecting...</div>
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

