import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './StudentLessonHistory.css'

export default function StudentLessonHistory({ studentId }) {
  const [transactions, setTransactions] = useState([])
  const [lessons, setLessons] = useState([])
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('packages')

  useEffect(() => {
    if (studentId) {
      fetchHistory()
    }
  }, [studentId])

  const fetchHistory = async () => {
    try {
      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*, profiles(full_name, email)')
        .eq('id', studentId)
        .single()
      
      if (studentError) throw studentError
      setStudent(studentData)

      // Get lesson transactions (if table exists)
      try {
        const { data: transData } = await supabase
          .from('lesson_transactions')
          .select('*')
          .eq('student_id', studentId)
          .order('transaction_date', { ascending: false })

        setTransactions(transData || [])
      } catch (e) {
        console.log('Transactions table not available')
        setTransactions([])
      }

      // Get actual lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .order('lesson_date', { ascending: false })

      setLessons(lessonsData || [])

    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportInvoice = () => {
    if (!student) return

    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(75, 44, 108)
    doc.text('OJO Coaching Academy', 105, 20, { align: 'center' })
    
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text('Lesson History Invoice', 105, 30, { align: 'center' })
    
    // Separator line
    doc.setDrawColor(75, 44, 108)
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)
    
    // Student info
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`Student: ${student.profiles?.full_name || 'Unknown'}`, 20, 48)
    doc.text(`Email: ${student.profiles?.email || 'N/A'}`, 20, 55)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 62)
    
    // Summary box
    doc.setFillColor(248, 245, 252)
    doc.roundedRect(120, 43, 70, 25, 3, 3, 'F')
    doc.setFontSize(10)
    doc.text('Total Paid:', 125, 52)
    doc.setFontSize(16)
    doc.setTextColor(45, 127, 111)
    doc.text(`$${(student.total_revenue || 0).toFixed(2)}`, 125, 62)
    
    // Package purchases table
    const packages = transactions.filter(t => t.transaction_type === 'package_purchase')
    
    if (packages.length > 0) {
      const tableData = packages.map(t => [
        new Date(t.transaction_date).toLocaleDateString('en-US', { 
          year: 'numeric', month: 'short', day: 'numeric' 
        }),
        `${t.package_size} lessons`,
        `$${parseFloat(t.amount_paid || 0).toFixed(2)}`
      ])
      
      doc.autoTable({
        startY: 75,
        head: [['Date', 'Package', 'Amount Paid']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [75, 44, 108],
          fontSize: 11,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 10
        },
        columnStyles: {
          2: { halign: 'right' }
        }
      })
    }
    
    // Lessons summary
    const finalY = packages.length > 0 ? doc.lastAutoTable.finalY + 15 : 80
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Lessons Completed: ${lessons.filter(l => l.status === 'completed').length}`, 20, finalY)
    doc.text(`Credits Remaining: ${student.lesson_credits || 0}`, 20, finalY + 7)
    
    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Thank you for training with OJO Coaching Academy!', 105, 280, { align: 'center' })
    
    // Save
    const fileName = `OJO-Invoice-${(student.profiles?.full_name || 'Student').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`
    doc.save(fileName)
  }

  if (loading) {
    return (
      <div className="lesson-history-loading">
        <div className="loading-spinner"></div>
        <p>Loading history...</p>
      </div>
    )
  }

  if (!student) {
    return <div className="lesson-history-empty">No student data found.</div>
  }

  const packages = transactions.filter(t => t.transaction_type === 'package_purchase')
  const completedLessons = lessons.filter(l => l.status === 'completed')

  return (
    <div className="lesson-history">
      <div className="history-header">
        <h2>📚 My Lesson History</h2>
        <button onClick={exportInvoice} className="btn-export-invoice">
          📄 Export Invoice (PDF)
        </button>
      </div>

      {/* Stats Summary */}
      <div className="history-stats">
        <div className="history-stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <div className="stat-value">${(student.total_revenue || 0).toFixed(2)}</div>
            <div className="stat-label">Total Invested</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon">🎾</div>
          <div className="stat-info">
            <div className="stat-value">{student.total_lessons_purchased || 0}</div>
            <div className="stat-label">Lessons Purchased</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{completedLessons.length}</div>
            <div className="stat-label">Lessons Completed</div>
          </div>
        </div>
        <div className="history-stat-card">
          <div className="stat-icon">🎟️</div>
          <div className="stat-info">
            <div className="stat-value">{student.lesson_credits || 0}</div>
            <div className="stat-label">Credits Remaining</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="history-tabs">
        <button 
          className={`tab-btn ${activeTab === 'packages' ? 'active' : ''}`}
          onClick={() => setActiveTab('packages')}
        >
          Package Purchases ({packages.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'lessons' ? 'active' : ''}`}
          onClick={() => setActiveTab('lessons')}
        >
          Lessons Completed ({completedLessons.length})
        </button>
      </div>

      {/* Package Purchases Tab */}
      {activeTab === 'packages' && (
        <div className="tab-content">
          {packages.length === 0 ? (
            <div className="empty-state">
              <p>No package purchase history recorded yet.</p>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Package Size</th>
                  <th>Amount Paid</th>
                  <th>Per Lesson</th>
                </tr>
              </thead>
              <tbody>
                {packages.map(transaction => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.transaction_date).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'short', day: 'numeric'
                    })}</td>
                    <td>{transaction.package_size} lessons</td>
                    <td className="amount">${parseFloat(transaction.amount_paid || 0).toFixed(2)}</td>
                    <td className="per-lesson">
                      ${(parseFloat(transaction.amount_paid || 0) / transaction.package_size).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Lessons Tab */}
      {activeTab === 'lessons' && (
        <div className="tab-content">
          {completedLessons.length === 0 ? (
            <div className="empty-state">
              <p>No completed lessons yet.</p>
            </div>
          ) : (
            <div className="lessons-timeline">
              {completedLessons.map(lesson => (
                <div key={lesson.id} className="lesson-timeline-item">
                  <div className="timeline-date">
                    {new Date(lesson.lesson_date).toLocaleDateString('en-US', {
                      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
                    })}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-time">
                      {new Date(lesson.lesson_date).toLocaleTimeString('en-US', {
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                    <div className="timeline-location">{lesson.location || 'TBD'}</div>
                    {lesson.lesson_plan && (
                      <div className="timeline-badge">📋 Plan</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

