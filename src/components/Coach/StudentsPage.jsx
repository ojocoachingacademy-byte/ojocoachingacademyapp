import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Search, Award, Calendar, User } from 'lucide-react'
import './StudentsPage.css'

export default function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState('all')
  const [sortBy, setSortBy] = useState('name')

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          profiles (full_name, email, ntrp_level, phone)
        `)
        .order('id', { ascending: true })

      if (error) {
        // Fallback if join fails
        const { data: studentsOnly } = await supabase
          .from('students')
          .select('*')
        
        const studentsWithProfiles = await Promise.all(
          (studentsOnly || []).map(async (student) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email, ntrp_level, phone')
              .eq('id', student.id)
              .single()
            
            return { ...student, profiles: profile || null }
          })
        )
        
        setStudents(studentsWithProfiles)
      } else {
        setStudents(data || [])
      }
      
      setLoading(false)
    } catch (error) {
      console.error('Error fetching students:', error)
      setLoading(false)
    }
  }

  const getFilteredAndSortedStudents = () => {
    let filtered = students.filter(student => {
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

  if (loading) {
    return <div className="page-container">Loading...</div>
  }

  const filteredStudents = getFilteredAndSortedStudents()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Students</h1>
        <div className="student-count">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</div>
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
                  <div className="detail-item">
                    <Calendar size={16} />
                    <span>{student.lesson_credits || 0} Credits</span>
                  </div>
                </div>
                {student.profiles?.email && (
                  <div className="student-email">{student.profiles.email}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

