import { useState, useEffect } from 'react'
import { supabaseAdmin } from '../../supabaseAdmin'
import { Search, X, Check, User } from 'lucide-react'
import '../shared/Modal.css'
import './StudentSelectionModal.css'

export default function StudentSelectionModal({ isOpen, onClose, onConfirm, title = 'Select Students' }) {
  const [students, setStudents] = useState([])
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isOpen) {
      fetchStudents()
    } else {
      // Reset when modal closes
      setSelectedStudentIds(new Set())
      setSearchQuery('')
    }
  }, [isOpen])

  const fetchStudents = async () => {
    setLoading(true)
    try {
      // Fetch active students
      const { data: studentsData, error: studentsError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('is_active', true)

      if (studentsError) throw studentsError

      const studentIds = (studentsData || []).map(s => s.id)

      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)

      if (profilesError) throw profilesError

      // Combine and sort by name
      const studentsList = (profilesData || [])
        .map(profile => ({
          id: profile.id,
          full_name: profile.full_name || 'Unknown',
          email: profile.email || ''
        }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))

      setStudents(studentsList)
    } catch (error) {
      console.error('Error fetching students:', error)
      alert('Error loading students: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(studentId)) {
        newSet.delete(studentId)
      } else {
        newSet.add(studentId)
      }
      return newSet
    })
  }

  const handleConfirm = () => {
    const selected = students.filter(s => selectedStudentIds.has(s.id))
    onConfirm(selected)
  }

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.email && student.email.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="modal-overlay modal-above-tabs" onClick={onClose}>
      <div className="modal-content student-selection-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-state">
              <p>Loading students...</p>
            </div>
          ) : (
            <>
              <div className="search-container">
                <Search size={20} className="search-icon" />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="selected-count">
                {selectedStudentIds.size} student{selectedStudentIds.size !== 1 ? 's' : ''} selected
              </div>

              <div className="students-list">
                {filteredStudents.length === 0 ? (
                  <div className="empty-state">
                    <p>No students found matching "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredStudents.map(student => {
                    const isSelected = selectedStudentIds.has(student.id)
                    return (
                      <div
                        key={student.id}
                        className={`student-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleStudent(student.id)}
                      >
                        <div className="student-info">
                          <User size={18} className="student-icon" />
                          <div>
                            <div className="student-name">{student.full_name}</div>
                            {student.email && (
                              <div className="student-email">{student.email}</div>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check size={20} className="check-icon" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={selectedStudentIds.size === 0}
          >
            Send to {selectedStudentIds.size} Student{selectedStudentIds.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
