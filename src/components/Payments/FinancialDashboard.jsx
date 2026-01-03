import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
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
  const [selectedYear, setSelectedYear] = useState('all')
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    fetchFinancialData()
  }, [selectedMonth, selectedYear])

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
          
          // Extract available years from transactions
          const years = [...new Set(
            txData.map(t => new Date(t.created_at).getFullYear())
          )].sort((a, b) => b - a)
          setAvailableYears(years)
        }
      } catch (e) {
        console.log('Transactions table not available')
      }

      // 3. Filter data by selected year
      let filteredStudents = studentData
      let filteredTransactions = allTransactions

      if (selectedYear !== 'all') {
        const year = parseInt(selectedYear)
        filteredTransactions = allTransactions.filter(t => 
          new Date(t.created_at).getFullYear() === year
        )
      }

      // 4. Calculate stats
      const totalRevenue = filteredStudents.reduce((sum, s) => sum + (parseFloat(s.total_revenue) || 0), 0)
      const totalLessonsSold = filteredStudents.reduce((sum, s) => sum + (s.total_lessons_purchased || 0), 0)
      const activeStudents = filteredStudents.filter(s => (s.lesson_credits || 0) > 0).length

      // Monthly revenue calculation
      let monthlyRevenue = 0
      if (filteredTransactions.length > 0) {
        const monthStart = new Date(selectedMonth + '-01')
        const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0)
        
        monthlyRevenue = filteredTransactions
          .filter(t => {
            const transDate = new Date(t.created_at)
            return transDate >= monthStart && transDate <= monthEnd
          })
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
      }

      // Year revenue
      const yearRevenue = selectedYear === 'all' 
        ? totalRevenue 
        : filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

      setStats({
        totalRevenue,
        monthlyRevenue,
        yearRevenue,
        totalLessonsSold,
        activeStudents,
        avgRevenuePerStudent: filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0,
        totalStudents: filteredStudents.length
      })

      setTransactions(filteredTransactions)
      setStudentRevenue(filteredStudents)

    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Student', 'Email', 'Total Revenue', 'Lessons Purchased', 'Credits Remaining', 'Avg Per Lesson']
    const rows = studentRevenue.map(s => [
      s.profiles?.full_name || 'Unknown',
      s.profiles?.email || '',
      (s.total_revenue || 0).toFixed(2),
      s.total_lessons_purchased || 0,
      s.lesson_credits || 0,
      s.total_lessons_purchased > 0 
        ? ((s.total_revenue || 0) / s.total_lessons_purchased).toFixed(2)
        : '0.00'
    ])
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ojo-finances-${selectedYear === 'all' ? 'all-time' : selectedYear}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Export to PDF
  const exportPDF = () => {
    const doc = new jsPDF()
    
    // Header
    doc.setFontSize(22)
    doc.setTextColor(75, 44, 108)
    doc.text('OJO Coaching Academy', 105, 20, { align: 'center' })
    
    doc.setFontSize(14)
    doc.setTextColor(100, 100, 100)
    doc.text(`Financial Report - ${selectedYear === 'all' ? 'All Time' : selectedYear}`, 105, 30, { align: 'center' })
    
    // Separator
    doc.setDrawColor(75, 44, 108)
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)
    
    // Summary stats
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45)
    doc.text(`Total Revenue: $${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, 55)
    doc.text(`Total Students: ${studentRevenue.length}`, 20, 62)
    doc.text(`Active Students: ${stats.activeStudents}`, 20, 69)
    doc.text(`Total Lessons Sold: ${stats.totalLessonsSold}`, 20, 76)
    
    // Table
    const tableData = studentRevenue.map(s => [
      s.profiles?.full_name || 'Unknown',
      `$${parseFloat(s.total_revenue || 0).toFixed(2)}`,
      s.total_lessons_purchased || 0,
      s.lesson_credits || 0,
      `$${s.total_lessons_purchased > 0 
        ? ((s.total_revenue || 0) / s.total_lessons_purchased).toFixed(2)
        : '0.00'
      }`
    ])
    
    doc.autoTable({
      startY: 85,
      head: [['Student', 'Revenue', 'Lessons', 'Credits', 'Avg/Lesson']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [75, 44, 108],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' }
      }
    })
    
    // Footer
    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('OJO Coaching Academy - Financial Report', 105, 285, { align: 'center' })
    
    doc.save(`ojo-finances-${selectedYear === 'all' ? 'all-time' : selectedYear}-${new Date().toISOString().slice(0, 10)}.pdf`)
  }

  // Format currency - compact for large numbers
  const formatCurrency = (value) => {
    if (value >= 100000) {
      return `$${(value / 1000).toFixed(1)}K`
    } else if (value >= 10000) {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
        <div className="fin-header-actions">
          <div className="filter-group">
            <label>Year:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              <option value="all">All Time</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Month:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="month-input"
            />
          </div>
          <div className="export-buttons">
            <button onClick={exportCSV} className="btn-export">
              📊 CSV
            </button>
            <button onClick={exportPDF} className="btn-export">
              📄 PDF
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="fin-stats-grid">
        <div className="fin-stat-card revenue-card">
          <div className="fin-stat-icon">💵</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Total Revenue</div>
            <div className="fin-stat-value" title={`$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(stats.totalRevenue)}
            </div>
          </div>
        </div>

        <div className="fin-stat-card monthly-card">
          <div className="fin-stat-icon">📅</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">
              {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="fin-stat-value" title={`$${stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(stats.monthlyRevenue)}
            </div>
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
            <div className="fin-stat-value" title={`$${stats.avgRevenuePerStudent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(stats.avgRevenuePerStudent)}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Student */}
      <div className="fin-section">
        <div className="section-header">
          <h2>💼 Revenue by Student</h2>
          <span className="section-count">{studentRevenue.length} students</span>
        </div>
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
        <div className="section-header">
          <h2>📝 Recent Transactions</h2>
          <span className="section-count">{transactions.length} transactions</span>
        </div>
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
