import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './MergeHistoricalModal.css'

export default function MergeHistoricalModal({ studentId, studentName, onClose, onSuccess }) {
  const [historicalStudents, setHistoricalStudents] = useState([])
  const [selectedHistorical, setSelectedHistorical] = useState(null)
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchHistoricalStudents()
  }, [])

  const fetchHistoricalStudents = async () => {
    try {
      // Get students that have historical data (imported records)
      const { data, error } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .or('historical_student_name.not.is.null,profiles.email.ilike.%@historical.student')
        .order('total_revenue', { ascending: false })

      if (error) throw error
      setHistoricalStudents(data || [])
    } catch (error) {
      console.error('Error fetching historical students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    if (!selectedHistorical) return
    
    setMerging(true)
    try {
      // Get historical student full data
      const { data: historical, error: histError } = await supabase
        .from('students')
        .select('*')
        .eq('id', selectedHistorical.id)
        .single()

      if (histError) throw histError

      // Update current student with historical data
      const { error: updateError } = await supabase
        .from('students')
        .update({
          total_revenue: (historical.total_revenue || 0),
          total_lessons_purchased: (historical.total_lessons_purchased || 0),
          lesson_credits: (historical.lesson_credits || 0),
          private_coach_notes: [
            `Merged with historical record: ${selectedHistorical.profiles?.full_name || selectedHistorical.historical_student_name}`,
            historical.private_coach_notes || ''
          ].filter(Boolean).join('\n\n')
        })
        .eq('id', studentId)

      if (updateError) throw updateError

      // Transfer all transactions to new student
      try {
        await supabase
          .from('lesson_transactions')
          .update({ student_id: studentId })
          .eq('student_id', selectedHistorical.id)
      } catch (e) {
        console.log('Transaction transfer skipped (table may not exist)')
      }

      // Transfer all lessons to new student
      try {
        await supabase
          .from('lessons')
          .update({ student_id: studentId })
          .eq('student_id', selectedHistorical.id)
      } catch (e) {
        console.log('Lesson transfer skipped')
      }

      // Delete historical placeholder profile and student record
      await supabase
        .from('students')
        .delete()
        .eq('id', selectedHistorical.id)

      // Only delete profile if it's a historical placeholder
      if (selectedHistorical.profiles?.email?.includes('@historical.student')) {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', selectedHistorical.id)
      }

      alert('Historical record merged successfully!')
      onSuccess()
      onClose()
      
    } catch (error) {
      console.error('Error merging:', error)
      alert('Error merging records: ' + error.message)
    } finally {
      setMerging(false)
    }
  }

  // Filter historical students based on search
  const filteredStudents = historicalStudents.filter(student => {
    const name = (student.historical_student_name || student.profiles?.full_name || '').toLowerCase()
    return name.includes(searchTerm.toLowerCase())
  })

  return (
    <div className="merge-modal-overlay" onClick={onClose}>
      <div className="merge-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="merge-modal-header">
          <h2>🔗 Link Historical Record</h2>
          <button onClick={onClose} className="merge-btn-close">×</button>
        </div>

        <div className="merge-modal-body">
          <div className="merge-info-box">
            <p>
              <strong>Current Student:</strong> {studentName}
            </p>
            <p className="merge-info-hint">
              Select a historical record below to merge. This will transfer all past lessons, 
              transactions, and revenue data to this student's account.
            </p>
          </div>

          {/* Search */}
          <div className="merge-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search historical records..."
              className="merge-search-input"
            />
          </div>

          {loading ? (
            <div className="merge-loading">Loading historical records...</div>
          ) : filteredStudents.length === 0 ? (
            <div className="merge-empty">
              {searchTerm ? 'No matching historical records found.' : 'No historical records available.'}
            </div>
          ) : (
            <div className="historical-list">
              {filteredStudents.map(student => (
                <div 
                  key={student.id}
                  className={`historical-card ${selectedHistorical?.id === student.id ? 'selected' : ''}`}
                  onClick={() => setSelectedHistorical(student)}
                >
                  <div className="historical-card-header">
                    <h3>{student.historical_student_name || student.profiles?.full_name}</h3>
                    {selectedHistorical?.id === student.id && (
                      <span className="selected-badge">✓ Selected</span>
                    )}
                  </div>
                  <div className="historical-card-stats">
                    <div className="historical-stat">
                      <span className="stat-label">Revenue</span>
                      <span className="stat-value revenue">${(student.total_revenue || 0).toFixed(2)}</span>
                    </div>
                    <div className="historical-stat">
                      <span className="stat-label">Lessons</span>
                      <span className="stat-value">{student.total_lessons_purchased || 0}</span>
                    </div>
                    <div className="historical-stat">
                      <span className="stat-label">Credits</span>
                      <span className="stat-value">{student.lesson_credits || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="merge-modal-footer">
          <button onClick={onClose} className="merge-btn-secondary">
            Cancel
          </button>
          <button 
            onClick={handleMerge} 
            disabled={!selectedHistorical || merging}
            className="merge-btn-primary"
          >
            {merging ? '⏳ Merging...' : '🔗 Merge Selected Record'}
          </button>
        </div>
      </div>
    </div>
  )
}


