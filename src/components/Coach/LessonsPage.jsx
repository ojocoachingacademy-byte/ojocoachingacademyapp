import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, MapPin, FileText, CheckCircle, XCircle, AlertCircle, Edit2, Save } from 'lucide-react'
import './LessonsPage.css'

export default function LessonsPage() {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [editingPlan, setEditingPlan] = useState(false)
  const [lessonPlanText, setLessonPlanText] = useState('')

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    try {
      // Fetch lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('lesson_date', { ascending: false })

      if (lessonsError) throw lessonsError

      // Get unique student IDs
      const studentIds = [...new Set((lessonsData || []).map(l => l.student_id).filter(Boolean))]
      
      // Fetch profiles for those students
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)

      // Enrich lessons with student info
      const enrichedLessons = (lessonsData || []).map(lesson => {
        const profile = (profilesData || []).find(p => p.id === lesson.student_id)
        return {
          ...lesson,
          students: profile ? { profiles: profile } : null
        }
      })

      setLessons(enrichedLessons)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching lessons:', error)
      setLoading(false)
    }
  }

  const getActualStatus = (lesson) => {
    const lessonDate = new Date(lesson.lesson_date)
    const now = new Date()
    if (lesson.status === 'cancelled') return 'cancelled'
    if (lessonDate < now && lesson.status === 'scheduled') return 'completed' // Auto-complete past scheduled lessons
    return lesson.status || 'scheduled'
  }

  const getFilteredLessons = () => {
    let filtered = lessons

    // Filter by tab (using actual status)
    if (activeTab === 'upcoming') {
      filtered = filtered.filter(l => {
        const status = getActualStatus(l)
        return status === 'scheduled' && new Date(l.lesson_date) > new Date()
      })
    } else if (activeTab === 'completed') {
      filtered = filtered.filter(l => getActualStatus(l) === 'completed')
    } else if (activeTab === 'cancelled') {
      filtered = filtered.filter(l => l.status === 'cancelled')
    }

    // Filter by search term (student name)
    if (searchTerm) {
      filtered = filtered.filter(l => 
        l.students?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by date range
    if (dateFilter === 'today') {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      filtered = filtered.filter(l => {
        const lessonDate = new Date(l.lesson_date)
        return lessonDate >= today && lessonDate < tomorrow
      })
    } else if (dateFilter === 'week') {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      filtered = filtered.filter(l => new Date(l.lesson_date) >= weekAgo)
    } else if (dateFilter === 'month') {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      filtered = filtered.filter(l => new Date(l.lesson_date) >= monthAgo)
    }

    return filtered
  }

  const exportToCSV = () => {
    const filtered = getFilteredLessons()
    const headers = ['Date', 'Time', 'Student', 'Location', 'Status', 'Plan Created', 'Learnings Submitted', 'Feedback Given']
    const rows = filtered.map(lesson => [
      new Date(lesson.lesson_date).toLocaleDateString(),
      new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      lesson.students?.profiles?.full_name || 'Unknown',
      lesson.location || '',
      lesson.status,
      lesson.lesson_plan ? 'Yes' : 'No',
      lesson.student_learnings ? 'Yes' : 'No',
      lesson.coach_feedback ? 'Yes' : 'No'
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lessons-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="status-icon status-completed" />
      case 'cancelled':
        return <XCircle size={16} className="status-icon status-cancelled" />
      default:
        return <AlertCircle size={16} className="status-icon status-scheduled" />
    }
  }

  if (loading) {
    return <div className="page-container">Loading...</div>
  }

  const filteredLessons = getFilteredLessons()

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Lessons</h1>
        <button className="btn btn-primary" onClick={exportToCSV}>
          Export to CSV
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All ({lessons.length})
        </button>
        <button 
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({lessons.filter(l => {
            const status = getActualStatus(l)
            return status === 'scheduled' && new Date(l.lesson_date) > new Date()
          }).length})
        </button>
        <button 
          className={`tab ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed ({lessons.filter(l => getActualStatus(l) === 'completed').length})
        </button>
        <button 
          className={`tab ${activeTab === 'cancelled' ? 'active' : ''}`}
          onClick={() => setActiveTab('cancelled')}
        >
          Cancelled ({lessons.filter(l => l.status === 'cancelled').length})
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <input
          type="text"
          className="input"
          placeholder="Search by student name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ maxWidth: '300px' }}
        />
        <select
          className="input"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>

      {/* Lessons Table */}
      <div className="table-container">
        <table className="lessons-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Student</th>
              <th>Location</th>
              <th>Status</th>
              <th>Plan</th>
              <th>Learnings</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {filteredLessons.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  No lessons found
                </td>
              </tr>
            ) : (
              filteredLessons.map(lesson => (
                <tr 
                  key={lesson.id} 
                  className="table-row"
                  onClick={() => setSelectedLesson(lesson)}
                >
                  <td>{new Date(lesson.lesson_date).toLocaleDateString()}</td>
                  <td>{new Date(lesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{lesson.students?.profiles?.full_name || 'Unknown'}</td>
                  <td>{lesson.location || '-'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {getStatusIcon(getActualStatus(lesson))}
                      <span style={{ textTransform: 'capitalize' }}>{getActualStatus(lesson)}</span>
                    </div>
                  </td>
                  <td>
                    {lesson.lesson_plan ? (
                      <FileText size={16} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {lesson.student_learnings ? (
                      <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                  <td>
                    {lesson.coach_feedback ? (
                      <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="modal-overlay" onClick={() => {
          setSelectedLesson(null)
          setEditingPlan(false)
          setLessonPlanText('')
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Lesson Details</h2>
              <button className="modal-close" onClick={() => {
                setSelectedLesson(null)
                setEditingPlan(false)
                setLessonPlanText('')
              }}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '20px' }}>
                <strong>Student:</strong> {selectedLesson.students?.profiles?.full_name || 'Unknown'}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Date:</strong> {new Date(selectedLesson.lesson_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Time:</strong> {new Date(selectedLesson.lesson_date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Location:</strong> {selectedLesson.location || '-'}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <strong>Status:</strong> <span style={{ textTransform: 'capitalize' }}>{getActualStatus(selectedLesson)}</span>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong>Lesson Plan:</strong>
                  {!editingPlan && (
                    <button 
                      className="btn btn-outline btn-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingPlan(true)
                        setLessonPlanText(selectedLesson.lesson_plan || '')
                      }}
                      style={{ padding: '4px 12px', fontSize: '14px' }}
                    >
                      <Edit2 size={14} style={{ marginRight: '4px' }} />
                      Edit Plan
                    </button>
                  )}
                </div>
                {editingPlan ? (
                  <div>
                    <textarea
                      className="input"
                      value={lessonPlanText}
                      onChange={(e) => setLessonPlanText(e.target.value)}
                      rows={10}
                      style={{ width: '100%', fontFamily: 'inherit' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={async (e) => {
                          e.stopPropagation()
                          try {
                            const { error } = await supabase
                              .from('lessons')
                              .update({ lesson_plan: lessonPlanText })
                              .eq('id', selectedLesson.id)

                            if (error) throw error

                            // Update local state
                            setSelectedLesson({ ...selectedLesson, lesson_plan: lessonPlanText })
                            setLessons(lessons.map(l => l.id === selectedLesson.id ? { ...l, lesson_plan: lessonPlanText } : l))
                            setEditingPlan(false)
                          } catch (error) {
                            console.error('Error updating lesson plan:', error)
                            alert('Error updating lesson plan: ' + error.message)
                          }
                        }}
                        style={{ padding: '6px 16px', fontSize: '14px' }}
                      >
                        <Save size={14} style={{ marginRight: '4px' }} />
                        Save
                      </button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingPlan(false)
                          setLessonPlanText('')
                        }}
                        style={{ padding: '6px 16px', fontSize: '14px' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : selectedLesson.lesson_plan ? (
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.lesson_plan}
                  </div>
                ) : (
                  <div style={{ marginTop: '8px', padding: '12px', color: '#999', fontStyle: 'italic' }}>
                    No lesson plan yet
                  </div>
                )}
              </div>
              {selectedLesson.student_learnings && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Student Learnings:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E3F2FD', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.student_learnings}
                  </div>
                </div>
              )}
              {selectedLesson.coach_feedback && (
                <div style={{ marginBottom: '20px' }}>
                  <strong>Coach Feedback:</strong>
                  <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#E8F5E9', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                    {selectedLesson.coach_feedback}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => navigate(`/coach/students/${selectedLesson.student_id}`)}>
                View Student Profile
              </button>
              <button className="btn btn-outline" onClick={() => {
                setSelectedLesson(null)
                setEditingPlan(false)
                setLessonPlanText('')
              }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

