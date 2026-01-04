import { useState, useEffect, useMemo } from 'react'
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
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState('all')
  const [availableYears, setAvailableYears] = useState([])
  
  // Table controls state
  const [visibleColumns, setVisibleColumns] = useState({
    student: true,
    totalRevenue: true,
    lessonsPurchased: true,
    creditsRemaining: true,
    avgPerLesson: true,
    activeDates: true,
    lessonDates: false,
    leadSource: false
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'totalRevenue',
    direction: 'desc'
  })
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetchFinancialData()
  }, [selectedMonth, selectedYear])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // 1. Get all students with revenue data
      let studentData = []
      try {
        // Try with is_active filter first
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select(`
            id,
            total_revenue,
            total_lessons_purchased,
            lesson_credits,
            created_at,
            lead_source,
            referred_by_student_id,
            is_active
          `)
          .eq('is_active', true)
          .order('total_revenue', { ascending: false })

        if (studentsError) {
          // Fallback: try without is_active filter
          const { data: fallbackStudents } = await supabase
            .from('students')
            .select('id, total_revenue, total_lessons_purchased, lesson_credits, created_at, lead_source, referred_by_student_id')
            .order('total_revenue', { ascending: false })
          studentData = fallbackStudents || []
        } else {
          studentData = students || []
        }

        // Fetch profiles separately
        if (studentData.length > 0) {
          const studentIds = studentData.map(s => s.id)
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', studentIds)

          studentData = studentData.map(s => ({
            ...s,
            profiles: (profiles || []).find(p => p.id === s.id) || null
          }))
        }
      } catch (e) {
        console.error('Error fetching students:', e)
      }

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

      // 3. For each student, calculate active date range from transactions
      const studentsWithDates = studentData.map(student => {
        const studentTransactions = allTransactions.filter(t => t.student_id === student.id)
        // Try multiple possible date column names
        const transactionDates = studentTransactions
          .map(t => {
            // Try common date column names
            const date = t.payment_date || t.created_at || t.date || t.transaction_date
            return date ? new Date(date).toISOString() : null
          })
          .filter(Boolean)
          .sort()
        
        const firstDate = transactionDates[0]
        const lastDate = transactionDates[transactionDates.length - 1]
        
        // If no transactions, use student created_at as fallback
        const fallbackDate = student.created_at ? new Date(student.created_at).toISOString() : null
        const activeFirstDate = firstDate || fallbackDate
        const activeLastDate = lastDate || fallbackDate
        
        return {
          ...student,
          transactionDates,
          activeDateRange: activeFirstDate && activeLastDate ? {
            first: activeFirstDate,
            last: activeLastDate
          } : null
        }
      })

      // 4. Filter data by selected year
      let filteredStudents = studentsWithDates
      let filteredTransactions = allTransactions

      if (selectedYear !== 'all') {
        const year = parseInt(selectedYear)
        filteredTransactions = allTransactions.filter(t => 
          new Date(t.created_at).getFullYear() === year
        )
      }

      // 5. Calculate stats
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

      // 6. Fetch expenses (table may not exist yet)
      let filteredExpenses = []
      let totalExpenses = 0
      try {
        const { data: expensesData, error: expError } = await supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false })

        if (!expError && expensesData) {
          filteredExpenses = expensesData
          if (selectedYear !== 'all') {
            const year = parseInt(selectedYear)
            filteredExpenses = filteredExpenses.filter(e => 
              new Date(e.expense_date).getFullYear() === year
            )
          }
          totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
        }
      } catch (e) {
        console.log('Expenses table not available yet')
      }

      const netIncome = totalRevenue - totalExpenses

      setStats({
        totalRevenue,
        monthlyRevenue,
        yearRevenue,
        totalLessonsSold,
        activeStudents,
        avgRevenuePerStudent: filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0,
        totalStudents: filteredStudents.length,
        totalExpenses,
        netIncome
      })

      setTransactions(filteredTransactions)
      setStudentRevenue(studentsWithDates)
      setExpenses(filteredExpenses)

    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Sorting logic
  const sortedStudents = useMemo(() => {
    let sortableStudents = [...studentRevenue]
    
    if (sortConfig.key) {
      sortableStudents.sort((a, b) => {
        let aValue, bValue
        
        switch(sortConfig.key) {
          case 'student':
            aValue = (a.profiles?.full_name || '').toLowerCase()
            bValue = (b.profiles?.full_name || '').toLowerCase()
            break
          case 'totalRevenue':
            aValue = parseFloat(a.total_revenue || 0)
            bValue = parseFloat(b.total_revenue || 0)
            break
          case 'lessonsPurchased':
            aValue = a.total_lessons_purchased || 0
            bValue = b.total_lessons_purchased || 0
            break
          case 'creditsRemaining':
            aValue = a.lesson_credits || 0
            bValue = b.lesson_credits || 0
            break
          case 'avgPerLesson':
            aValue = a.total_lessons_purchased > 0 ? parseFloat(a.total_revenue || 0) / a.total_lessons_purchased : 0
            bValue = b.total_lessons_purchased > 0 ? parseFloat(b.total_revenue || 0) / b.total_lessons_purchased : 0
            break
          case 'activeDates':
            aValue = a.activeDateRange?.last || '0'
            bValue = b.activeDateRange?.last || '0'
            break
          case 'lessonDates':
            aValue = a.transactionDates?.[0] || '0'
            bValue = b.transactionDates?.[0] || '0'
            break
          case 'leadSource':
            aValue = (a.lead_source || '').toLowerCase()
            bValue = (b.lead_source || '').toLowerCase()
            break
          default:
            return 0
        }
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    
    return sortableStudents
  }, [studentRevenue, sortConfig])

  const displayedStudents = showAll ? sortedStudents : sortedStudents.slice(0, 10)

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }))
  }

  // Date formatting helpers
  const formatLessonDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`
  }

  const formatActiveDateRange = (range) => {
    if (!range) return '-'
    
    const first = new Date(range.first)
    const last = new Date(range.last)
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    
    const firstMonth = months[first.getMonth()]
    const firstYear = first.getFullYear().toString().slice(-2)
    
    const lastMonth = months[last.getMonth()]
    const lastYear = last.getFullYear().toString().slice(-2)
    
    if (firstMonth === lastMonth && firstYear === lastYear) {
      return `${firstMonth} '${firstYear}`
    }
    
    return `${firstMonth} '${firstYear} - ${lastMonth} '${lastYear}`
  }

  // Export to CSV
  const exportCSV = () => {
    const headers = ['Student', 'Email', 'Total Revenue', 'Lessons Purchased', 'Credits Remaining', 'Avg Per Lesson', 'Active Dates']
    const rows = sortedStudents.map(s => [
      s.profiles?.full_name || 'Unknown',
      s.profiles?.email || '',
      (s.total_revenue || 0).toFixed(2),
      s.total_lessons_purchased || 0,
      s.lesson_credits || 0,
      s.total_lessons_purchased > 0 
        ? ((s.total_revenue || 0) / s.total_lessons_purchased).toFixed(2)
        : '0.00',
      formatActiveDateRange(s.activeDateRange)
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
    const tableData = sortedStudents.map(s => [
      s.profiles?.full_name || 'Unknown',
      `$${parseFloat(s.total_revenue || 0).toFixed(2)}`,
      s.total_lessons_purchased || 0,
      s.lesson_credits || 0,
      `$${s.total_lessons_purchased > 0 
        ? ((s.total_revenue || 0) / s.total_lessons_purchased).toFixed(2)
        : '0.00'
      }`,
      formatActiveDateRange(s.activeDateRange)
    ])
    
    doc.autoTable({
      startY: 85,
      head: [['Student', 'Revenue', 'Lessons', 'Credits', 'Avg/Lesson', 'Active']],
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

  // Sort indicator
  const SortIndicator = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return <span className="sort-indicator">⇅</span>
    return <span className="sort-indicator active">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
  }

  // Calculate top referrers
  const calculateTopReferrers = () => {
    const referrerMap = {}
    
    studentRevenue.forEach(student => {
      if (student.referred_by_student_id) {
        if (!referrerMap[student.referred_by_student_id]) {
          // Find the referrer's name
          const referrer = studentRevenue.find(s => s.id === student.referred_by_student_id)
          referrerMap[student.referred_by_student_id] = {
            id: student.referred_by_student_id,
            name: referrer?.profiles?.full_name || 'Unknown',
            referralCount: 0,
            referralRevenue: 0
          }
        }
        referrerMap[student.referred_by_student_id].referralCount++
        referrerMap[student.referred_by_student_id].referralRevenue += parseFloat(student.total_revenue || 0)
      }
    })
    
    return Object.values(referrerMap)
      .sort((a, b) => b.referralRevenue - a.referralRevenue)
      .slice(0, 10)
  }

  const topReferrers = calculateTopReferrers()

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

        <div className="fin-stat-card expenses-card">
          <div className="fin-stat-icon">💸</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Total Expenses</div>
            <div className="fin-stat-value expense-value" title={`$${(stats.totalExpenses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(stats.totalExpenses || 0)}
            </div>
          </div>
        </div>

        <div className={`fin-stat-card net-card ${(stats.netIncome || 0) >= 0 ? 'positive' : 'negative'}`}>
          <div className="fin-stat-icon">{(stats.netIncome || 0) >= 0 ? '📈' : '📉'}</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Net Income</div>
            <div className="fin-stat-value" title={`$${(stats.netIncome || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(stats.netIncome || 0)}
            </div>
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
        
        {/* Table Controls */}
        <div className="table-controls">
          <div className="column-visibility-dropdown">
            <button className="btn-column-visibility">
              ⚙️ Columns
            </button>
            <div className="column-visibility-menu">
              {Object.entries({
                student: 'Student Name',
                totalRevenue: 'Total Revenue',
                lessonsPurchased: 'Lessons Purchased',
                creditsRemaining: 'Credits Remaining',
                avgPerLesson: 'Avg $/Lesson',
                activeDates: 'Active Dates',
                lessonDates: 'Transaction Dates',
                leadSource: 'Lead Source'
              }).map(([key, label]) => (
                <label key={key} className="column-checkbox">
                  <input
                    type="checkbox"
                    checked={visibleColumns[key]}
                    onChange={(e) => setVisibleColumns(prev => ({
                      ...prev,
                      [key]: e.target.checked
                    }))}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {studentRevenue.length === 0 ? (
          <div className="empty-state">
            <p>No student revenue data yet.</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="fin-table">
                <thead>
                  <tr>
                    {visibleColumns.student && (
                      <th onClick={() => handleSort('student')} className="sortable">
                        Student <SortIndicator columnKey="student" />
                      </th>
                    )}
                    {visibleColumns.totalRevenue && (
                      <th onClick={() => handleSort('totalRevenue')} className="sortable">
                        Total Revenue <SortIndicator columnKey="totalRevenue" />
                      </th>
                    )}
                    {visibleColumns.lessonsPurchased && (
                      <th onClick={() => handleSort('lessonsPurchased')} className="sortable">
                        Lessons <SortIndicator columnKey="lessonsPurchased" />
                      </th>
                    )}
                    {visibleColumns.creditsRemaining && (
                      <th onClick={() => handleSort('creditsRemaining')} className="sortable">
                        Credits <SortIndicator columnKey="creditsRemaining" />
                      </th>
                    )}
                    {visibleColumns.avgPerLesson && (
                      <th onClick={() => handleSort('avgPerLesson')} className="sortable">
                        Avg $/Lesson <SortIndicator columnKey="avgPerLesson" />
                      </th>
                    )}
                    {visibleColumns.activeDates && (
                      <th onClick={() => handleSort('activeDates')} className="sortable">
                        Active Dates <SortIndicator columnKey="activeDates" />
                      </th>
                    )}
                    {visibleColumns.lessonDates && (
                      <th onClick={() => handleSort('lessonDates')} className="sortable">
                        Transaction Dates <SortIndicator columnKey="lessonDates" />
                      </th>
                    )}
                    {visibleColumns.leadSource && (
                      <th onClick={() => handleSort('leadSource')} className="sortable">
                        Lead Source <SortIndicator columnKey="leadSource" />
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map(student => (
                    <tr key={student.id}>
                      {visibleColumns.student && (
                        <td>
                          <div className="student-cell">
                            <div className="student-name">{student.profiles?.full_name || 'Unknown'}</div>
                            <div className="student-email">{student.profiles?.email || ''}</div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.totalRevenue && (
                        <td className="revenue-cell">
                          ${parseFloat(student.total_revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      )}
                      {visibleColumns.lessonsPurchased && (
                        <td>{student.total_lessons_purchased || 0}</td>
                      )}
                      {visibleColumns.creditsRemaining && (
                        <td>
                          <span className={`credits-badge ${(student.lesson_credits || 0) === 0 ? 'low' : (student.lesson_credits || 0) <= 2 ? 'warning' : ''}`}>
                            {student.lesson_credits || 0}
                          </span>
                        </td>
                      )}
                      {visibleColumns.avgPerLesson && (
                        <td>
                          ${student.total_lessons_purchased > 0 
                            ? (parseFloat(student.total_revenue || 0) / student.total_lessons_purchased).toFixed(2)
                            : '0.00'
                          }
                        </td>
                      )}
                      {visibleColumns.activeDates && (
                        <td className="active-dates-cell">
                          {formatActiveDateRange(student.activeDateRange)}
                        </td>
                      )}
                      {visibleColumns.lessonDates && (
                        <td className="lesson-dates-cell">
                          {student.transactionDates?.length > 0 
                            ? student.transactionDates.slice(0, 5).map(date => formatLessonDate(date)).join(', ')
                              + (student.transactionDates.length > 5 ? ` +${student.transactionDates.length - 5} more` : '')
                            : '-'
                          }
                        </td>
                      )}
                      {visibleColumns.leadSource && (
                        <td>
                          {student.lead_source ? (
                            <span className="lead-source-tag">{student.lead_source}</span>
                          ) : '-'}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Show All / Show Less Button */}
            {sortedStudents.length > 10 && (
              <button 
                onClick={() => setShowAll(!showAll)}
                className="btn-show-toggle"
              >
                {showAll 
                  ? '↑ Show Less' 
                  : `↓ Show All ${sortedStudents.length} Students`
                }
              </button>
            )}
          </>
        )}
      </div>

      {/* Top Referrers */}
      {topReferrers.length > 0 && (
        <div className="fin-section">
          <div className="section-header">
            <h2>🤝 Top Referrers</h2>
            <span className="section-count">{topReferrers.length} referrer{topReferrers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="table-container">
            <table className="fin-table referrers-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Referrals</th>
                  <th>Revenue from Referrals</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map(referrer => (
                  <tr key={referrer.id}>
                    <td className="referrer-name">{referrer.name}</td>
                    <td className="referral-count">{referrer.referralCount}</td>
                    <td className="revenue-cell">${referrer.referralRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
