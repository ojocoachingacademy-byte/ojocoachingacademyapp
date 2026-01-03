import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './FinancialDashboard.css'

export default function FinancialDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalLessonsSold: 0,
    activeStudents: 0,
    avgRevenuePerStudent: 0,
    totalStudents: 0
  })
  const [transactions, setTransactions] = useState([])
  const [studentRevenue, setStudentRevenue] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  useEffect(() => {
    fetchFinancialData()
  }, [selectedMonth])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // 1. Get all students with revenue data
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          total_revenue,
          total_lessons_purchased,
          lesson_credits,
          profiles!inner(full_name, email)
        `)
        .order('total_revenue', { ascending: false })

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
      }

      const studentData = students || []

      // 2. Try to get transactions (table may not exist)
      let allTransactions = []
      try {
        const { data: txData, error: txError } = await supabase
          .from('payment_transactions')
          .select('*')
          .order('created_at', { ascending: false })

        if (!txError && txData) {
          allTransactions = txData
        }
      } catch (e) {
        console.log('Transactions table not available')
      }

      // 3. Calculate stats from student data
      const totalRevenue = studentData.reduce((sum, s) => sum + (parseFloat(s.total_revenue) || 0), 0)
      const totalLessonsSold = studentData.reduce((sum, s) => sum + (s.total_lessons_purchased || 0), 0)
      const activeStudents = studentData.filter(s => (s.lesson_credits || 0) > 0).length

      // Monthly revenue calculation from student data changes
      // For now, estimate based on recent activity or use transaction data if available
      let monthlyRevenue = 0
      if (allTransactions.length > 0) {
        const monthStart = new Date(selectedMonth + '-01')
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
        
        monthlyRevenue = allTransactions
          .filter(t => {
            const transDate = new Date(t.created_at)
            return transDate >= monthStart && transDate <= monthEnd
          })
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }

      setStats({
        totalRevenue,
        monthlyRevenue,
        totalLessonsSold,
        activeStudents,
        avgRevenuePerStudent: studentData.length > 0 ? totalRevenue / studentData.length : 0,
        totalStudents: studentData.length
      })

      setTransactions(allTransactions)
      setStudentRevenue(studentData)

    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="financial-dashboard">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading financial data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="financial-dashboard">
      <div className="fin-dashboard-header">
        <h1>💰 Financial Dashboard</h1>
        <div className="month-selector">
          <label>View Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="month-input"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="fin-stats-grid">
        <div className="fin-stat-card revenue-card">
          <div className="fin-stat-icon">💵</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Total Revenue</div>
            <div className="fin-stat-value">${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="fin-stat-card monthly-card">
          <div className="fin-stat-icon">📅</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="fin-stat-value">${stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        <div className="fin-stat-card lessons-card">
          <div className="fin-stat-icon">🎾</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Lessons Sold</div>
            <div className="fin-stat-value">{stats.totalLessonsSold}</div>
          </div>
        </div>

        <div className="fin-stat-card active-card">
          <div className="fin-stat-icon">👥</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Active Students</div>
            <div className="fin-stat-value">{stats.activeStudents} / {stats.totalStudents}</div>
          </div>
        </div>

        <div className="fin-stat-card average-card">
          <div className="fin-stat-icon">📊</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Avg Revenue/Student</div>
            <div className="fin-stat-value">${stats.avgRevenuePerStudent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Revenue by Student */}
      <div className="fin-section">
        <h2>💼 Revenue by Student</h2>
        {studentRevenue.length === 0 ? (
          <div className="empty-state">
            <p>No student revenue data yet.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="fin-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Total Revenue</th>
                  <th>Lessons Purchased</th>
                  <th>Credits Remaining</th>
                  <th>Avg $/Lesson</th>
                </tr>
              </thead>
              <tbody>
                {studentRevenue.map(student => (
                  <tr key={student.id}>
                    <td>
                      <div className="student-cell">
                        <div className="student-name">{student.profiles?.full_name || 'Unknown'}</div>
                        <div className="student-email">{student.profiles?.email || ''}</div>
                      </div>
                    </td>
                    <td className="revenue-cell">${parseFloat(student.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{student.total_lessons_purchased || 0}</td>
                    <td>
                      <span className={`credits-badge ${(student.lesson_credits || 0) === 0 ? 'low' : (student.lesson_credits || 0) <= 2 ? 'warning' : ''}`}>
                        {student.lesson_credits || 0}
                      </span>
                    </td>
                    <td>
                      ${student.total_lessons_purchased > 0 
                        ? (parseFloat(student.total_revenue || 0) / student.total_lessons_purchased).toFixed(2)
                        : '0.00'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction History */}
      <div className="fin-section">
        <h2>📝 Recent Transactions</h2>
        {transactions.length === 0 ? (
          <div className="empty-state">
            <p>No transaction history available.</p>
            <p className="empty-hint">Transactions will appear here when you add packages to students.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="fin-table transactions-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Credits</th>
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 50).map(transaction => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td>
                      <span className="credits-added">+{transaction.lesson_credits}</span>
                    </td>
                    <td className="revenue-cell">${parseFloat(transaction.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td>{transaction.payment_method || 'N/A'}</td>
                    <td className="notes-cell">{transaction.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pricing Reference */}
      <div className="fin-section pricing-reference">
        <h2>💲 Pricing Reference</h2>
        <div className="pricing-grids">
          <div className="pricing-column">
            <h3>Existing Students</h3>
            <div className="pricing-list">
              <div className="pricing-item">
                <span>1 Lesson</span>
                <span>$70</span>
              </div>
              <div className="pricing-item">
                <span>5 Lessons</span>
                <span>$325 ($65/lesson)</span>
              </div>
              <div className="pricing-item">
                <span>10 Lessons</span>
                <span>$600 ($60/lesson)</span>
              </div>
              <div className="pricing-item">
                <span>20 Lessons</span>
                <span>$1,000 ($50/lesson)</span>
              </div>
            </div>
          </div>
          <div className="pricing-column">
            <h3>New Students</h3>
            <div className="pricing-list">
              <div className="pricing-item">
                <span>1 Lesson</span>
                <span>$100</span>
              </div>
              <div className="pricing-item">
                <span>5 Lessons</span>
                <span>$450 ($90/lesson)</span>
              </div>
              <div className="pricing-item">
                <span>20 Lessons</span>
                <span>$1,400 ($70/lesson)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

