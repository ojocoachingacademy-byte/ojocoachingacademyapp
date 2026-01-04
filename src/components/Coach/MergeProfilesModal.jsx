import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X, Check } from 'lucide-react'
import '../shared/Modal.css'
import './MergeProfilesModal.css'

export default function MergeProfilesModal({ oldProfileId, newProfileId, onClose, onSuccess }) {
  const [oldProfile, setOldProfile] = useState(null)
  const [oldStudent, setOldStudent] = useState(null)
  const [newProfile, setNewProfile] = useState(null)
  const [newStudent, setNewStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  
  // Field selection: 'old' or 'new' - which profile's data to keep
  const [fieldSelection, setFieldSelection] = useState({
    // Profile fields
    full_name: 'old',
    email: 'old',
    phone: 'old',
    ntrp_level: 'old',
    // Student fields
    lesson_credits: 'old',
    total_revenue: 'old',
    total_lessons_purchased: 'old',
    lead_source: 'old',
    referred_by_student_id: 'old',
    is_active: 'old',
    development_plan: 'old',
    development_plan_notes: 'old',
    private_coach_notes: 'old'
  })

  useEffect(() => {
    fetchProfiles()
  }, [oldProfileId, newProfileId])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      
      // Fetch old profile and student
      const { data: oldProfileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', oldProfileId)
        .single()
      
      const { data: oldStudentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', oldProfileId)
        .single()
      
      // Fetch new profile and student
      const { data: newProfileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', newProfileId)
        .single()
      
      const { data: newStudentData } = await supabase
        .from('students')
        .select('*')
        .eq('id', newProfileId)
        .single()
      
      setOldProfile(oldProfileData)
      setOldStudent(oldStudentData)
      setNewProfile(newProfileData)
      setNewStudent(newStudentData)
    } catch (error) {
      console.error('Error fetching profiles:', error)
      alert('Error loading profiles: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!confirm(`Merge these profiles?\n\nThis will:\n- Keep profile: ${fieldSelection.full_name === 'old' ? oldProfile?.full_name : newProfile?.full_name}\n- Delete profile: ${fieldSelection.full_name === 'old' ? newProfile?.full_name : oldProfile?.full_name}\n- Transfer all data to the kept profile`)) {
      return
    }

    setMerging(true)
    try {
      // Determine which profile to keep (the one selected for full_name)
      const keepProfileId = fieldSelection.full_name === 'old' ? oldProfileId : newProfileId
      const deleteProfileId = fieldSelection.full_name === 'old' ? newProfileId : oldProfileId
      
      // Build merged profile data
      const mergedProfile = {
        full_name: fieldSelection.full_name === 'old' ? oldProfile?.full_name : newProfile?.full_name,
        email: fieldSelection.email === 'old' ? oldProfile?.email : newProfile?.email,
        phone: fieldSelection.phone === 'old' ? oldProfile?.phone : newProfile?.phone,
        ntrp_level: fieldSelection.ntrp_level === 'old' ? oldProfile?.ntrp_level : newProfile?.ntrp_level
      }
      
      // Build merged student data
      const mergedStudent = {
        lesson_credits: fieldSelection.lesson_credits === 'old' ? oldStudent?.lesson_credits : newStudent?.lesson_credits,
        total_revenue: fieldSelection.total_revenue === 'old' ? oldStudent?.total_revenue : newStudent?.total_revenue,
        total_lessons_purchased: fieldSelection.total_lessons_purchased === 'old' ? oldStudent?.total_lessons_purchased : newStudent?.total_lessons_purchased,
        lead_source: fieldSelection.lead_source === 'old' ? oldStudent?.lead_source : newStudent?.lead_source,
        referred_by_student_id: fieldSelection.referred_by_student_id === 'old' ? oldStudent?.referred_by_student_id : newStudent?.referred_by_student_id,
        is_active: fieldSelection.is_active === 'old' ? oldStudent?.is_active : newStudent?.is_active,
        development_plan: fieldSelection.development_plan === 'old' ? oldStudent?.development_plan : newStudent?.development_plan,
        development_plan_notes: fieldSelection.development_plan_notes === 'old' ? oldStudent?.development_plan_notes : newStudent?.development_plan_notes,
        private_coach_notes: fieldSelection.private_coach_notes === 'old' ? oldStudent?.private_coach_notes : newStudent?.private_coach_notes
      }

      // Update the profile to keep
      const { error: profileError } = await supabase
        .from('profiles')
        .update(mergedProfile)
        .eq('id', keepProfileId)
      
      if (profileError) throw profileError

      // Update the student to keep
      const { error: studentError } = await supabase
        .from('students')
        .update(mergedStudent)
        .eq('id', keepProfileId)
      
      if (studentError) throw studentError

      // Update all foreign key references from deleteProfileId to keepProfileId
      // Update lessons
      await supabase
        .from('lessons')
        .update({ student_id: keepProfileId })
        .eq('student_id', deleteProfileId)

      // Update payment_transactions
      await supabase
        .from('payment_transactions')
        .update({ student_id: keepProfileId })
        .eq('student_id', deleteProfileId)

      // Update lesson_transactions
      await supabase
        .from('lesson_transactions')
        .update({ student_id: keepProfileId })
        .eq('student_id', deleteProfileId)

      // Update referred_by_student_id in students table
      await supabase
        .from('students')
        .update({ referred_by_student_id: keepProfileId })
        .eq('referred_by_student_id', deleteProfileId)

      // Delete the duplicate profile and student
      await supabase
        .from('students')
        .delete()
        .eq('id', deleteProfileId)

      await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteProfileId)

      // Note: Auth user deletion requires admin privileges and service role key
      // The duplicate auth user will remain but won't cause issues since the profile is deleted

      alert('✅ Profiles merged successfully!')
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error merging profiles:', error)
      alert('Error merging profiles: ' + error.message)
    } finally {
      setMerging(false)
    }
  }

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content merge-modal">
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading profiles...</div>
        </div>
      </div>
    )
  }

  if (!oldProfile || !newProfile || !oldStudent || !newStudent) {
    return (
      <div className="modal-overlay">
        <div className="modal-content merge-modal">
          <div style={{ padding: '40px', textAlign: 'center', color: '#d32f2f' }}>
            Error: Could not load profiles
          </div>
        </div>
      </div>
    )
  }

  const FieldRow = ({ fieldKey, label, oldValue, newValue, fieldType = 'text' }) => {
    const selection = fieldSelection[fieldKey]
    
    const formatValue = (value) => {
      if (value === null || value === undefined) return '(empty)'
      if (fieldType === 'number') return value || 0
      if (fieldType === 'boolean') return value ? 'Yes' : 'No'
      if (fieldType === 'json') return value ? '✓ Has data' : '(empty)'
      return String(value)
    }

    return (
      <div className="merge-field-row">
        <div className="merge-field-label">{label}</div>
        <div className="merge-field-comparison">
          <div className={`merge-field-option ${selection === 'old' ? 'selected' : ''}`}>
            <label>
              <input
                type="radio"
                name={fieldKey}
                value="old"
                checked={selection === 'old'}
                onChange={(e) => setFieldSelection({...fieldSelection, [fieldKey]: 'old'})}
              />
              <div className="merge-field-value">{formatValue(oldValue)}</div>
            </label>
          </div>
          <div className={`merge-field-option ${selection === 'new' ? 'selected' : ''}`}>
            <label>
              <input
                type="radio"
                name={fieldKey}
                value="new"
                checked={selection === 'new'}
                onChange={(e) => setFieldSelection({...fieldSelection, [fieldKey]: 'new'})}
              />
              <div className="merge-field-value">{formatValue(newValue)}</div>
            </label>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content merge-modal" onClick={(e) => e.stopPropagation()}>
        <div className="merge-modal-header">
          <h2>Merge Profiles</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="merge-modal-body">
          <div className="merge-profiles-info">
            <div className="merge-profile-box old-profile">
              <h3>Existing Profile (Old)</h3>
              <div className="profile-summary">
                <div><strong>Name:</strong> {oldProfile.full_name}</div>
                <div><strong>Email:</strong> {oldProfile.email || '(empty)'}</div>
                <div><strong>Credits:</strong> {oldStudent.lesson_credits || 0}</div>
              </div>
            </div>
            <div className="merge-profile-box new-profile">
              <h3>New Profile (Student Login)</h3>
              <div className="profile-summary">
                <div><strong>Name:</strong> {newProfile.full_name}</div>
                <div><strong>Email:</strong> {newProfile.email || '(empty)'}</div>
                <div><strong>Credits:</strong> {newStudent.lesson_credits || 0}</div>
              </div>
            </div>
          </div>

          <div className="merge-fields-section">
            <h3>Select which data to keep for each field:</h3>
            
            <div className="merge-fields-group">
              <h4>Profile Information</h4>
              <FieldRow fieldKey="full_name" label="Full Name" oldValue={oldProfile.full_name} newValue={newProfile.full_name} />
              <FieldRow fieldKey="email" label="Email" oldValue={oldProfile.email} newValue={newProfile.email} />
              <FieldRow fieldKey="phone" label="Phone" oldValue={oldProfile.phone} newValue={newProfile.phone} />
              <FieldRow fieldKey="ntrp_level" label="NTRP Level" oldValue={oldProfile.ntrp_level} newValue={newProfile.ntrp_level} />
            </div>

            <div className="merge-fields-group">
              <h4>Student Information</h4>
              <FieldRow fieldKey="lesson_credits" label="Lesson Credits" oldValue={oldStudent.lesson_credits} newValue={newStudent.lesson_credits} fieldType="number" />
              <FieldRow fieldKey="total_revenue" label="Total Revenue" oldValue={oldStudent.total_revenue} newValue={newStudent.total_revenue} fieldType="number" />
              <FieldRow fieldKey="total_lessons_purchased" label="Lessons Purchased" oldValue={oldStudent.total_lessons_purchased} newValue={newStudent.total_lessons_purchased} fieldType="number" />
              <FieldRow fieldKey="lead_source" label="Lead Source" oldValue={oldStudent.lead_source} newValue={newStudent.lead_source} />
              <FieldRow fieldKey="referred_by_student_id" label="Referred By" oldValue={oldStudent.referred_by_student_id} newValue={newStudent.referred_by_student_id} />
              <FieldRow fieldKey="is_active" label="Active Status" oldValue={oldStudent.is_active} newValue={newStudent.is_active} fieldType="boolean" />
              <FieldRow fieldKey="development_plan" label="Development Plan" oldValue={oldStudent.development_plan} newValue={newStudent.development_plan} fieldType="json" />
              <FieldRow fieldKey="development_plan_notes" label="Development Plan Notes" oldValue={oldStudent.development_plan_notes} newValue={newStudent.development_plan_notes} />
              <FieldRow fieldKey="private_coach_notes" label="Private Coach Notes" oldValue={oldStudent.private_coach_notes} newValue={newStudent.private_coach_notes} />
            </div>
          </div>
        </div>

        <div className="merge-modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={merging}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleMerge} disabled={merging}>
            {merging ? 'Merging...' : 'Merge Profiles'}
          </button>
        </div>
      </div>
    </div>
  )
}

