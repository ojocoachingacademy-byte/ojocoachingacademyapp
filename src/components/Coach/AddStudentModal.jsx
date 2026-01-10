import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './AddStudentModal.css'

export default function AddStudentModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    ntrpLevel: '3.0',
    leadSource: '',
    referredByStudentId: '',
    initialCredits: 0,
    initialAmount: 0
  })
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    const { data } = await supabase
      .from('students')
      .select('id, profiles:id(full_name)')
      .eq('is_active', true)
      .order('id')
    
    setStudents(data || [])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Generate a random password for the student account
      const tempPassword = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: tempPassword,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'student',
            account_type: 'student'
          }
        }
      })

      if (authError) throw authError

      // Wait a moment for the trigger to create profile (if trigger exists)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check if profile exists, create if not, otherwise update
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (!existingProfile) {
        // Profile doesn't exist - create it
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            phone: formData.phone || null,
            ntrp_level: formData.ntrpLevel,
            account_type: 'student'
          })

        if (profileCreateError) {
          console.error('Profile creation error:', profileCreateError)
          throw new Error(`Failed to create profile: ${profileCreateError.message}`)
        }
      } else {
        // Profile exists - update it with additional info
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.fullName,
            phone: formData.phone || null,
            ntrp_level: formData.ntrpLevel,
            account_type: 'student'
          })
          .eq('id', authData.user.id)

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError)
          throw new Error(`Failed to update profile: ${profileUpdateError.message}`)
        }
      }

      // Check if student record exists (created by trigger) or create it
      const { data: existingStudent } = await supabase
        .from('students')
        .select('id')
        .eq('id', authData.user.id)
        .single()

      if (existingStudent) {
        // Update existing student record
        const { error: studentError } = await supabase
          .from('students')
          .update({
            lesson_credits: formData.initialCredits,
            total_revenue: formData.initialAmount,
            total_lessons_purchased: formData.initialCredits,
            lead_source: formData.leadSource || null,
            referred_by_student_id: formData.leadSource === 'Referral' ? formData.referredByStudentId : null,
            is_active: true
          })
          .eq('id', authData.user.id)

        if (studentError) throw studentError
      } else {
        // Create student record
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            id: authData.user.id,
            lesson_credits: formData.initialCredits,
            total_revenue: formData.initialAmount,
            total_lessons_purchased: formData.initialCredits,
            lead_source: formData.leadSource || null,
            referred_by_student_id: formData.leadSource === 'Referral' ? formData.referredByStudentId : null,
            is_active: true
          })

        if (studentError) throw studentError
      }

      // Award referral credit if this is a referral
      if (formData.leadSource === 'Referral' && formData.referredByStudentId) {
        try {
          const { awardReferralCredit } = await import('../../utils/processReferralReward')
          await awardReferralCredit(formData.referredByStudentId, authData.user.id)
        } catch (rewardError) {
          console.error('Error awarding referral credit:', rewardError)
          // Don't fail the student creation if reward fails
        }
      }

      // If they paid, create transaction
      if (formData.initialAmount > 0) {
        await supabase
          .from('payment_transactions')
          .insert({
            student_id: authData.user.id,
            payment_date: new Date().toISOString().split('T')[0],
            amount: formData.initialAmount,
            lesson_credits: formData.initialCredits,
            payment_method: 'Cash',
            notes: `Initial package - ${formData.initialCredits} lessons`
          })
      }

      alert('Student added successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error adding student:', error)
      alert('Error: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const leadSourceOptions = [
    'Referral',
    'Groupon',
    'Findtennislessons',
    'Playyourcourt',
    'In Person',
    'TeachMe',
    'Thumbtack',
    'Facebook',
    'Instagram',
    'Google',
    'Website',
    'Other'
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-student-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>➕ Add New Student</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="add-student-form">
          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input
                type="text"
                className="input"
                value={formData.fullName}
                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="student@email.com"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                className="input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="(555) 123-4567"
              />
            </div>

            <div className="form-group">
              <label>NTRP Level</label>
              <select
                className="input"
                value={formData.ntrpLevel}
                onChange={(e) => setFormData({...formData, ntrpLevel: e.target.value})}
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
          </div>

          <div className="form-section">
            <h3>Lead Source</h3>
            <div className="form-row">
              <div className="form-group">
                <label>How did they find you?</label>
                <select
                  className="input"
                  value={formData.leadSource}
                  onChange={(e) => setFormData({...formData, leadSource: e.target.value})}
                >
                  <option value="">Select lead source...</option>
                  {leadSourceOptions.map(source => (
                    <option key={source} value={source}>{source}</option>
                  ))}
                </select>
              </div>

              {formData.leadSource === 'Referral' && (
                <div className="form-group">
                  <label>Referred By *</label>
                  <select
                    className="input"
                    value={formData.referredByStudentId}
                    onChange={(e) => setFormData({...formData, referredByStudentId: e.target.value})}
                    required
                  >
                    <option value="">Select student...</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.profiles?.full_name || 'Unknown'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="form-section">
            <h3>Initial Package (Optional)</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Lesson Credits</label>
                <input
                  type="number"
                  className="input"
                  value={formData.initialCredits}
                  onChange={(e) => setFormData({...formData, initialCredits: parseInt(e.target.value) || 0})}
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Amount Paid ($)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.initialAmount}
                  onChange={(e) => setFormData({...formData, initialAmount: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-outline">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Adding...' : 'Add Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

