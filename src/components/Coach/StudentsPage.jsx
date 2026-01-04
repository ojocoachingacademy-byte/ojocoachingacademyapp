import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Search, Award, Calendar, User, Edit2, Check, X, UserPlus } from 'lucide-react'
import AddStudentModal from './AddStudentModal'
import './StudentsPage.css'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [statusFilter, setStatusFilter] = useState('active') // 'all', 'active', 'inactive'
  const [editingCredits, setEditingCredits] = useState(null) // student id being edited
  const [editCreditsValue, setEditCreditsValue] = useState(0)
  const [showAddStudent, setShowAddStudent] = useState(false)

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      // Fetch students - try with all columns, fallback if needed
      let studentsData = []
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('id', { ascending: true })

      if (error) {
        console.error('Error fetching students:', error)
        setLoading(false)
        return
      }

      studentsData = data || []

      // Fetch profiles for all students
      if (studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email, ntrp_level, phone')
          .in('id', studentIds)

        // Merge students with their profiles
        studentsData = studentsData.map(student => {
          const profile = (profilesData || []).find(p => p.id === student.id)
          return { ...student, profiles: profile || null }
        })
      }

      setStudents(studentsData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching students:', error)
      setLoading(false)
    }
  }

  const getFilteredAndSortedStudents = () => {
    let filtered = students.filter(student => {
      // Status filter (is_active defaults to true if not set)
      const isActive = student.is_active !== false
      if (statusFilter === 'active' && !isActive) return false
      if (statusFilter === 'inactive' && isActive) return false

      // Search filter
      const name = student.profiles?.full_name || 'Unknown'
      if (searchTerm && !name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Level filter
      if (levelFilter !== 'all' && student.profiles?.ntrp_level !== levelFilter) {
        return false
      }

      return true
    })

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.profiles?.full_name || '').localeCompare(b.profiles?.full_name || '')
        case 'level':
          return parseFloat(b.profiles?.ntrp_level || 0) - parseFloat(a.profiles?.ntrp_level || 0)
        case 'credits':
          return (b.lesson_credits || 0) - (a.lesson_credits || 0)
        case 'lastLesson':
          // Would need to fetch last lesson date - simplified for now
          return 0
        default:
          return 0
      }
    })

    return filtered
  }

  const getInitials = (name) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const handleEditCredits = (e, student) => {
    e.stopPropagation() // Prevent navigating to student detail
    setEditingCredits(student.id)
    setEditCreditsValue(student.lesson_credits || 0)
  }

  const handleSaveCredits = async (e, studentId) => {
    e.stopPropagation()
    try {
      const { error } = await supabase
        .from('students')
        .update({ lesson_credits: parseInt(editCreditsValue) || 0 })
        .eq('id', studentId)

      if (error) throw error

      // Update local state
      setStudents(prev => prev.map(s => 
        s.id === studentId 
          ? { ...s, lesson_credits: parseInt(editCreditsValue) || 0 }
          : s
      ))
      setEditingCredits(null)
    } catch (error) {
      console.error('Error updating credits:', error)
      alert('Failed to update credits')
    }
  }

  const handleCancelEdit = (e) => {
    e.stopPropagation()
    setEditingCredits(null)
  }

  if (loading) {
    return <div className="page-container">Loading...</div>
  }

  const filteredStudents = getFilteredAndSortedStudents()

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Students</h1>
          <div className="student-count">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</div>
        </div>
        <button 
          className="btn btn-primary add-student-btn"
          onClick={() => setShowAddStudent(true)}
        >
          <UserPlus size={18} />
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input search-input"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="active">Active Students</option>
          <option value="inactive">Inactive Students</option>
          <option value="all">All Students</option>
        </select>
        <select
          className="input"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="all">All Levels</option>
          <option value="2.5">2.5</option>
          <option value="3.0">3.0</option>
          <option value="3.5">3.5</option>
          <option value="4.0">4.0</option>
          <option value="4.5">4.5</option>
          <option value="5.0+">5.0+</option>
        </select>
        <select
          className="input"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="name">Sort by Name</option>
          <option value="level">Sort by Level</option>
          <option value="credits">Sort by Credits</option>
        </select>
      </div>

      {/* Student Grid */}
      {filteredStudents.length === 0 ? (
        <div className="empty-state">
          <User size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
          <p>No students found</p>
        </div>
      ) : (
        <div className="students-grid">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              className="student-card"
              onClick={() => navigate(`/coach/students/${student.id}`)}
            >
              {student.is_active === false && (
                <div className="inactive-badge" title="Inactive Student">
                  Inactive
                </div>
              )}
              {student.private_coach_notes && (
                <div className="notes-indicator" title="Has private notes">
                  🔒 Notes
                </div>
              )}
              <div className="student-avatar">
                {getInitials(student.profiles?.full_name || 'Unknown')}
              </div>
              <div className="student-info">
                <h3 className="student-name">{student.profiles?.full_name || 'Unknown Student'}</h3>
                <div className="student-details">
                  <div className="detail-item">
                    <Award size={16} />
                    <span>NTRP {student.profiles?.ntrp_level || 'N/A'}</span>
                  </div>
                  <div className="detail-item credits-item">
                    <Calendar size={16} />
                    {editingCredits === student.id ? (
                      <div className="credits-edit" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          value={editCreditsValue}
                          onChange={(e) => setEditCreditsValue(e.target.value)}
                          className="credits-input"
                          autoFocus
                        />
                        <button 
                          className="credits-btn save"
                          onClick={(e) => handleSaveCredits(e, student.id)}
                          title="Save"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          className="credits-btn cancel"
                          onClick={handleCancelEdit}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <span 
                        className="credits-display"
                        onClick={(e) => handleEditCredits(e, student)}
                        title="Click to edit credits"
                      >
                        {student.lesson_credits || 0} Credits
                        <Edit2 size={12} className="edit-icon" />
                      </span>
                    )}
                  </div>
                </div>
                {student.profiles?.email && (
                  <div className="student-email">{student.profiles.email}</div>
                )}
                {student.lead_source && (
                  <div className="lead-source-badge">
                    {student.lead_source}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onSuccess={() => {
            fetchStudents()
            setShowAddStudent(false)
          }}
        />
      )}
    </div>
  )
}



