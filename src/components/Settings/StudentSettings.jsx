import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Save, User, Mail, Phone, Award, Trophy } from 'lucide-react'
import './StudentSettings.css'

export default function StudentSettings() {
  const [profile, setProfile] = useState(null)
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [referralData, setReferralData] = useState({ rank: null, referralCount: 0, referralRevenue: 0, totalReferrers: 0 })
  const [topReferrers, setTopReferrers] = useState([])
  const navigate = useNavigate()

  // Form state
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
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
      setError(null)
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('[Settings] Error getting user:', userError)
        setError('Authentication error. Please log in again.')
        setLoading(false)
        return
      }
      
      if (!user) {
        console.log('[Settings] No user found, redirecting to login')
        navigate('/login')
        return
      }

      console.log('[Settings] Fetching profile for user:', user.id)

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('[Settings] Profile fetch result:', { profileData, profileError })

      if (profileError) {
        console.error('[Settings] Profile error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        throw profileError
      }

      // Fetch student data
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', user.id)
        .single()

      if (studentError && studentError.code !== 'PGRST116') {
        // PGRST116 means no rows returned, which is OK
        console.warn('[Settings] Student fetch warning:', studentError)
      } else {
        console.log('[Settings] Student data:', studentData)
      }

      setProfile(profileData)
      setStudent(studentData || null)
      
      // Populate form - split full_name into first_name and last_name
      const fullName = profileData?.full_name || ''
      const nameParts = fullName.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const initialFormData = {
        first_name: firstName,
        last_name: lastName,
        email: profileData?.email || user.email || '',
        phone: profileData?.phone || '',
        ntrp_level: profileData?.ntrp_level || '3.0'
      }

      console.log('[Settings] Setting form data:', initialFormData)
      setFormData(initialFormData)

      // Fetch referral data
      if (user) {
        await fetchReferralData(user.id)
      }

      setLoading(false)
    } catch (error) {
      console.error('[Settings] Error fetching profile:', error)
      const errorMessage = error.message || 'Failed to load profile. Please try again.'
      setError(errorMessage)
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

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('[Settings] Error getting user:', userError)
        setError('Authentication error. Please log in again.')
        setSaving(false)
        return
      }

      if (!user) {
        console.error('[Settings] No user found')
        navigate('/login')
        return
      }

      console.log('[Settings] Saving profile for user:', user.id)
      console.log('[Settings] Form data:', formData)

      // Combine first_name and last_name into full_name
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim()

      // Update profile
      const updateData = {
        full_name: fullName || null,
        phone: formData.phone || null,
        ntrp_level: formData.ntrp_level
      }

      console.log('[Settings] Update data:', updateData)

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id)
        .select()

      console.log('[Settings] Update response:', { data, error: updateError })

      if (updateError) {
        console.error('[Settings] Supabase error details:', {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          fullError: updateError
        })
        throw updateError
      }

      console.log('[Settings] Profile updated successfully:', data)
      setSuccess(true)
      setProfile({ ...profile, full_name: fullName, phone: formData.phone, ntrp_level: formData.ntrp_level })
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('[Settings] Error saving profile:', error)
      const errorMessage = error.message || 'Failed to save profile. Please try again.'
      console.error('[Settings] Error message:', errorMessage)
      setError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const fetchReferralData = async (studentId) => {
    try {
      // Fetch all students to calculate referral rankings
      const { data: allStudents } = await supabase
        .from('students')
        .select('id, total_revenue, referred_by_student_id')

      if (!allStudents) return

      // Build referrer map
      const referrerMap = {}
      allStudents.forEach(student => {
        if (student.referred_by_student_id) {
          const referrerId = student.referred_by_student_id
          if (!referrerMap[referrerId]) {
            referrerMap[referrerId] = {
              id: referrerId,
              referralCount: 0,
              referralRevenue: 0
            }
          }
          referrerMap[referrerId].referralCount++
          referrerMap[referrerId].referralRevenue += parseFloat(student.total_revenue || 0)
        }
      })

      // Fetch profiles for referrer names
      const referrerIds = Object.keys(referrerMap)
      if (referrerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', referrerIds)

        // Map names to referrers
        profiles?.forEach(profile => {
          if (referrerMap[profile.id]) {
            referrerMap[profile.id].name = profile.full_name
          }
        })
      }

      // Sort by revenue and get top 3
      const sortedReferrers = Object.values(referrerMap)
        .filter(r => r.name) // Only include those with names
        .sort((a, b) => b.referralRevenue - a.referralRevenue)
        .slice(0, 3)

      // Set top 3 referrers with bonus amounts ($100 per referral)
      const topReferrersWithBonus = sortedReferrers.map(referrer => ({
        ...referrer,
        bonusAmount: referrer.referralCount * 100 // $100 per referral
      }))
      setTopReferrers(topReferrersWithBonus)

      // Find current student's referral data
      const studentReferralData = referrerMap[studentId]
      if (studentReferralData) {
        // Calculate rank
        const allReferrers = Object.values(referrerMap).sort((a, b) => b.referralRevenue - a.referralRevenue)
        const rank = allReferrers.findIndex(r => r.id === studentId) + 1

        setReferralData({
          rank: rank > 0 ? rank : null,
          referralCount: studentReferralData.referralCount,
          referralRevenue: studentReferralData.referralRevenue,
          totalReferrers: allReferrers.length
        })
      } else {
        setReferralData({
          rank: null,
          referralCount: 0,
          referralRevenue: 0,
          totalReferrers: Object.keys(referrerMap).length
        })
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
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
              <label htmlFor="first_name">
                <User size={16} />
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Enter your first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">
                <User size={16} />
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="form-input"
                placeholder="Enter your last name"
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

        {/* Referral Information */}
        <div className="settings-card">
          <div className="settings-card-header">
            <Trophy size={24} />
            <h2>Referral Program</h2>
          </div>
          
          {referralData.referralCount > 0 ? (
            <>
              <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#F8F9FA', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <Trophy size={20} style={{ color: '#FFD700' }} />
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Your Referral Stats</h3>
                </div>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Referral Rank:</span>
                    <span className="info-value">#{referralData.rank}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Total Referrals:</span>
                    <span className="info-value">{referralData.referralCount}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Revenue Generated:</span>
                    <span className="info-value">${referralData.referralRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              <p>You haven't made any referrals yet. Start referring friends to earn $100 per referral!</p>
            </div>
          )}

          {topReferrers.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600 }}>
                <Trophy size={18} style={{ display: 'inline', marginRight: '8px', color: '#FFD700' }} />
                Top Referrers - Earn $100 Per Referral!
              </h3>
              <p style={{ color: '#666', marginBottom: '16px', fontSize: '14px' }}>
                Refer a friend and get $100 credit when they sign up!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {topReferrers.map((referrer, index) => (
                  <div key={index} style={{ padding: '16px', backgroundColor: '#F8F9FA', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
                      {index === 0 && <Trophy size={18} style={{ color: '#FFD700' }} />}
                      {index === 1 && <Trophy size={18} style={{ color: '#C0C0C0' }} />}
                      {index === 2 && <Trophy size={18} style={{ color: '#CD7F32' }} />}
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>#{index + 1}</span>
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{referrer.name}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '4px' }}>
                      ${referrer.bonusAmount.toLocaleString('en-US')}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Referral Bonus</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

