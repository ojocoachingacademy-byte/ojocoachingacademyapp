import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { X, Users } from 'lucide-react'
import { useToast, ToastContainer } from '../shared/Toast'
import ConfirmationModal from '../shared/ConfirmationModal'
import '../shared/Modal.css'

export default function LinkPartnerModal({ student, onClose, onSuccess }) {
  const [students, setStudents] = useState([])
  const [selectedPartnerId, setSelectedPartnerId] = useState('')
  const [isPrimaryForPair, setIsPrimaryForPair] = useState(true)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const { toasts, showToast, removeToast } = useToast()
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    fetchAvailableStudents()
  }, [])

  const fetchAvailableStudents = async () => {
    try {
      // Fetch all students EXCEPT:
      // 1. Current student
      // 2. Students already paired
      // 3. Students explicitly marked as inactive (is_active = false)
      // More flexible: include students where is_active is true OR null/undefined
      // (treats null/undefined as active for backwards compatibility)
      // Fetch students and profiles separately to avoid relationship ambiguity
      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id, is_active, paired_with_id')
        .is('paired_with_id', null) // Not already paired
        .neq('id', student.id) // Not self

      if (studentsError) throw studentsError

      // Get student IDs
      const studentIds = (studentsData || []).map(s => s.id)

      // Fetch profiles separately
      let profilesData = []
      if (studentIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)

        if (profilesError) throw profilesError
        profilesData = profiles || []
      }

      // Combine students with their profiles
      const data = (studentsData || []).map(student => ({
        ...student,
        profiles: profilesData.find(p => p.id === student.id) || null
      }))

      console.log('Fetched students for pairing:', data?.length, 'total students')

      // Filter: include students where is_active is true OR null/undefined
      // Exclude only those explicitly set to false
      // Also ensure they have a profile (full_name) so we can display them
      const availableStudents = (data || []).filter(s => {
        const isActive = s.is_active === true || s.is_active === null || s.is_active === undefined
        const hasProfile = s.profiles && s.profiles.full_name
        const notPaired = !s.paired_with_id
        return isActive && hasProfile && notPaired
      })

      console.log('Available students after filtering:', availableStudents.length)
      console.log('Sample available students:', availableStudents.slice(0, 3))

      setStudents(availableStudents)
    } catch (error) {
      console.error('Error fetching students:', error)
      showToast('Failed to load students', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleLink = () => {
    if (!selectedPartnerId) {
      showToast('Please select a partner', 'warning')
      return
    }

    setShowConfirmModal(true)
  }

  const confirmLink = async () => {
    setSubmitting(true)
    setShowConfirmModal(false)
    try {
      const partnerId = selectedPartnerId

      // Validate that both students exist before attempting to link
      const { data: currentStudentCheck, error: currentCheckError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', student.id)
        .single()

      if (currentCheckError || !currentStudentCheck) {
        throw new Error(`Current student (${student.id}) not found. Please refresh the page.`)
      }

      const { data: partnerStudentCheck, error: partnerCheckError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('id', partnerId)
        .single()

      if (partnerCheckError || !partnerStudentCheck) {
        throw new Error(`Partner student (${partnerId}) not found. Please select a different partner.`)
      }

      // Update current student
      const { error: error1 } = await supabaseAdmin
        .from('students')
        .update({
          paired_with_id: partnerId,
          is_primary_for_pair: isPrimaryForPair
        })
        .eq('id', student.id)

      if (error1) {
        console.error('Error updating current student:', error1)
        throw new Error(`Failed to update current student: ${error1.message}`)
      }

      // Update partner student
      const { error: error2 } = await supabaseAdmin
        .from('students')
        .update({
          paired_with_id: student.id,
          is_primary_for_pair: !isPrimaryForPair // Opposite of current student
        })
        .eq('id', partnerId)

      if (error2) {
        console.error('Error updating partner student:', error2)
        // Try to rollback the first update if the second fails
        await supabaseAdmin
          .from('students')
          .update({
            paired_with_id: null,
            is_primary_for_pair: false
          })
          .eq('id', student.id)
        throw new Error(`Failed to update partner student: ${error2.message}`)
      }

      showToast('Students linked successfully!', 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (error) {
      console.error('Error linking students:', error)
      showToast(error.message || 'Error linking students: ' + error.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedPartner = students.find(s => s.id === selectedPartnerId)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} style={{ color: 'var(--color-primary)' }} />
            <h2 className="modal-title">Link Semi-Private Partner</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <p style={{ marginBottom: '24px', color: '#666', lineHeight: '1.6' }}>
            Link <strong>{student.profiles?.full_name}</strong> with another student for semi-private lessons. 
            They will share credits and take lessons together.
          </p>

          {/* Partner Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label className="label" style={{ marginBottom: '8px', display: 'block' }}>
              Select Partner:
            </label>
            {loading ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>Loading students...</p>
            ) : students.length === 0 ? (
              <p style={{ color: '#999', fontStyle: 'italic' }}>
                No available students to pair. All students are either already paired or inactive.
              </p>
            ) : (
              <select
                className="input"
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Select a student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.profiles?.full_name} ({s.profiles?.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Primary Account Selection */}
          {selectedPartnerId && (
            <div style={{ marginBottom: '24px' }}>
              <label className="label" style={{ marginBottom: '12px', display: 'block' }}>
                Who handles payments?
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  border: '2px solid',
                  borderColor: isPrimaryForPair ? 'var(--color-primary)' : '#e0e0e0',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: isPrimaryForPair ? '#f9f9ff' : 'white'
                }}>
                  <input
                    type="radio"
                    name="primary"
                    checked={isPrimaryForPair}
                    onChange={() => setIsPrimaryForPair(true)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>{student.profiles?.full_name}</div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      This student will purchase packages and both will use credits
                    </div>
                  </div>
                </label>

                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  padding: '12px',
                  border: '2px solid',
                  borderColor: !isPrimaryForPair ? 'var(--color-primary)' : '#e0e0e0',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  backgroundColor: !isPrimaryForPair ? '#f9f9ff' : 'white'
                }}>
                  <input
                    type="radio"
                    name="primary"
                    checked={!isPrimaryForPair}
                    onChange={() => setIsPrimaryForPair(false)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: '600' }}>
                      {selectedPartner?.profiles?.full_name || 'Partner'}
                    </div>
                    <div style={{ fontSize: '13px', color: '#666' }}>
                      Partner will purchase packages and both will use credits
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f0f7ff',
            border: '1px solid #b3d9ff',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px'
          }}>
            <h4 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '14px', 
              fontWeight: '600',
              color: 'var(--color-primary)'
            }}>
              How Semi-Private Lessons Work:
            </h4>
            <ul style={{ 
              margin: 0, 
              paddingLeft: '20px', 
              fontSize: '13px', 
              lineHeight: '1.6',
              color: '#666'
            }}>
              <li>Both students share the same lesson plan</li>
              <li>Each student submits their own 3 learnings</li>
              <li>Each gets individual coach feedback and practice plans</li>
              <li>Credits deduct from the primary account's package</li>
              <li>Both students see the lesson in their dashboard</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            className="btn btn-outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleLink}
            disabled={!selectedPartnerId || submitting || students.length === 0}
            style={{
              opacity: (!selectedPartnerId || submitting || students.length === 0) ? 0.5 : 1,
              cursor: (!selectedPartnerId || submitting || students.length === 0) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? '⏳ Linking...' : '🔗 Link Partners'}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmLink}
        title="Link Semi-Private Partners"
        message={`Link ${student.profiles?.full_name} with ${selectedPartner?.profiles?.full_name || 'selected partner'} as a semi-private pair?`}
        confirmText="Link Partners"
        cancelText="Cancel"
        type="info"
        isLoading={submitting}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  )
}
