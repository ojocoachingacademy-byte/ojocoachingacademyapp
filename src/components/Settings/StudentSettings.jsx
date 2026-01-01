import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Save, User, Mail, Phone, Award } from 'lucide-react'
import './StudentSettings.css'

export default function StudentSettings() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    ntrp_level: '3.0'
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        navigate('/login')
        return
      }

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single()

      if (studentError && studentError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is OK
        console.error('Error fetching student:', studentError)
      }

      setProfile(profileData)
      setStudent(studentData || null)
      
      // Populate form
      setFormData({
        full_name: profileData?.full_name || '',
        email: profileData?.email || user.email || '',
        phone: profileData?.phone || '',
        ntrp_level: profileData?.ntrp_level || '3.0'
      })

      setLoading(false)
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError('Failed to load profile. Please try again.')
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear success message when user starts typing
    if (success) setSuccess(false)
    if (error) setError(null)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          ntrp_level: formData.ntrp_level
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setProfile({ ...profile, ...formData })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      setError(error.message || 'Failed to save profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="settings-page">
        <div className="spinner"></div>
        <p style={{ textAlign: 'center', color: '#666', marginTop: '16px' }}>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your profile information</p>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="settings-card-header">
            <User size={24} />
            <h2>Profile Information</h2>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              Profile updated successfully!
            </div>
          )}

          <form onSubmit={handleSave} className="settings-form">
            <div className="form-group">
              <label htmlFor="full_name">
                <User size={16} />
                Full Name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                value={formData.full_name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Enter your full name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled
                className="form-input disabled"
                placeholder="Email address"
              />
              <p className="form-help">Email cannot be changed</p>
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Phone size={16} />
                Phone Number
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="form-input"
                placeholder="Enter your phone number"
              />
            </div>

            <div className="form-group">
              <label htmlFor="ntrp_level">
                <Award size={16} />
                NTRP Level
              </label>
              <select
                id="ntrp_level"
                name="ntrp_level"
                value={formData.ntrp_level}
                onChange={handleInputChange}
                className="form-select"
              >
                <option value="1.5">1.5 - Beginner</option>
                <option value="2.0">2.0 - Beginner</option>
                <option value="2.5">2.5 - Beginner+</option>
                <option value="3.0">3.0 - Intermediate</option>
                <option value="3.5">3.5 - Intermediate+</option>
                <option value="4.0">4.0 - Advanced</option>
                <option value="4.5">4.5 - Advanced+</option>
                <option value="5.0">5.0 - Expert</option>
                <option value="5.5">5.5 - Expert+</option>
                <option value="6.0+">6.0+ - Professional</option>
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {student && (
          <div className="settings-card">
            <div className="settings-card-header">
              <Award size={24} />
              <h2>Account Information</h2>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Lesson Credits:</span>
                <span className="info-value">{student.lesson_credits || 0}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Member Since:</span>
                <span className="info-value">
                  {student.start_date 
                    ? new Date(student.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

