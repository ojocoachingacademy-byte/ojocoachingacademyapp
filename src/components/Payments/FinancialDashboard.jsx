import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import './FinancialDashboard.css'

export default function FinancialDashboard() {
  const navigate = useNavigate()
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
    leadSource: false,
    status: false
  })
  const [sortConfig, setSortConfig] = useState({
    key: 'totalRevenue',
    direction: 'desc'
  })
  const [showAll, setShowAll] = useState(false)

  // Comprehensive filter state
  const [filters, setFilters] = useState({
    year: 'All Time',
    month: null,
    searchQuery: '',
    revenueMin: '',
    revenueMax: '',
    dateRangeStart: '',
    dateRangeEnd: '',
    leadSources: [],
    showActiveOnly: false
  })

  useEffect(() => {
    fetchFinancialData()
  }, [selectedMonth, selectedYear])

  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      
      // 1. Get total count of all students first
      let totalStudentsCount = 0
      try {
        const { count } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
        totalStudentsCount = count || 0
      } catch (e) {
        console.error('Error fetching total students count:', e)
      }

      // 2. Get ALL students with revenue data (Financial Dashboard shows all students)
      let studentData = []
      try {
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
          .order('total_revenue', { ascending: false })

        if (studentsError) {
          throw studentsError
        }
        studentData = students || []

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

      // 3. Try to get transactions (table may not exist)
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
            txData.map(t => new Date(t.created_at || t.payment_date || t.date).getFullYear())
          )].sort((a, b) => b - a)
          setAvailableYears(years)
        }
      } catch (e) {
        console.log('Transactions table not available:', e)
      }

      // 4. For each student, fetch lesson dates from lesson_transactions
      const studentsWithDates = await Promise.all(
        studentData.map(async (student) => {
          try {
            // Fetch lesson_taken transactions for this student
            const { data: lessonTransactions } = await supabase
              .from('lesson_transactions')
              .select('transaction_date')
              .eq('student_id', student.id)
              .eq('transaction_type', 'lesson_taken')
              .order('transaction_date', { ascending: true })
            
            const lessonDates = (lessonTransactions || []).map(t => t.transaction_date).filter(Boolean)
            
            const firstDate = lessonDates[0] || null
            const lastDate = lessonDates.length > 0 ? lessonDates[lessonDates.length - 1] : null
            
            return {
              ...student,
              transactionDates: lessonDates,
              lesson_dates: lessonDates,
              first_lesson_date: firstDate,
              last_lesson_date: lastDate,
              activeDateRange: firstDate && lastDate ? {
                first: firstDate,
                last: lastDate
              } : null
            }
          } catch (error) {
            console.error(`Error fetching lesson dates for student ${student.id}:`, error)
            // Return student without dates if fetch fails
            return {
              ...student,
              transactionDates: [],
              lesson_dates: [],
              first_lesson_date: null,
              last_lesson_date: null,
              activeDateRange: null
            }
          }
        })
      )

      // Extract available years from lesson dates
      const allLessonDates = studentsWithDates
        .flatMap(s => s.lesson_dates || [])
        .filter(Boolean)
      
      const yearsFromLessons = [...new Set(
        allLessonDates.map(date => new Date(date).getFullYear())
      )].sort((a, b) => b - a)
      
      // Use lesson dates years, or fallback to payment transaction years if no lesson dates
      if (yearsFromLessons.length > 0) {
        setAvailableYears(yearsFromLessons)
      }

      // 5. Filter data by selected year
      let filteredStudents = studentsWithDates
      let filteredTransactions = allTransactions

      if (selectedYear !== 'all') {
        const year = parseInt(selectedYear)
        filteredTransactions = allTransactions.filter(t => 
          new Date(t.created_at).getFullYear() === year
        )
      }

      // 6. Calculate stats
      const totalRevenue = filteredStudents.reduce((sum, s) => sum + (parseFloat(s.total_revenue) || 0), 0)
      const totalLessonsSold = filteredStudents.reduce((sum, s) => sum + (s.total_lessons_purchased || 0), 0)
      // Count active students from all students (Financial Dashboard shows all students)
      const activeStudentsCount = filteredStudents.filter(s => s.is_active !== false).length

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

      // 7. Fetch expenses (table may not exist yet)
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
        activeStudents: activeStudentsCount,
        avgRevenuePerStudent: filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0,
        totalStudents: totalStudentsCount,
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

  // Filtering logic
  const filteredStudents = useMemo(() => {
    let filtered = [...studentRevenue]
    
    // Year filter
    if (filters.year !== 'All Time') {
      const targetYear = parseInt(filters.year)
      if (!isNaN(targetYear)) {
        filtered = filtered.filter(student => {
          if (!student.lesson_dates || student.lesson_dates.length === 0) return false
          return student.lesson_dates.some(date => {
            try {
              // Handle both date strings and Date objects
              const dateStr = typeof date === 'string' ? date : date?.toISOString?.() || ''
              if (!dateStr) return false
              const dateObj = new Date(dateStr)
              if (isNaN(dateObj.getTime())) return false
              return dateObj.getFullYear() === targetYear
            } catch (e) {
              return false
            }
          })
        })
      }
    }
    
    // Month filter (requires year to be set)
    if (filters.month !== null && filters.year !== 'All Time') {
      const targetYear = parseInt(filters.year)
      const targetMonth = filters.month
      if (!isNaN(targetYear) && !isNaN(targetMonth)) {
        filtered = filtered.filter(student => {
          if (!student.lesson_dates || student.lesson_dates.length === 0) return false
          return student.lesson_dates.some(date => {
            try {
              // Handle both date strings and Date objects
              const dateStr = typeof date === 'string' ? date : date?.toISOString?.() || ''
              if (!dateStr) return false
              const dateObj = new Date(dateStr)
              if (isNaN(dateObj.getTime())) return false
              return dateObj.getFullYear() === targetYear && dateObj.getMonth() === targetMonth
            } catch (e) {
              return false
            }
          })
        })
      }
    }
    
    // Name search
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(student => 
        (student.profiles?.full_name || '').toLowerCase().includes(query) ||
        (student.profiles?.email || '').toLowerCase().includes(query)
      )
    }
    
    // Revenue range
    if (filters.revenueMin) {
      filtered = filtered.filter(student => 
        parseFloat(student.total_revenue || 0) >= parseFloat(filters.revenueMin)
      )
    }
    if (filters.revenueMax) {
      filtered = filtered.filter(student => 
        parseFloat(student.total_revenue || 0) <= parseFloat(filters.revenueMax)
      )
    }
    
    // Date range filter (active between dates)
    if (filters.dateRangeStart) {
      try {
        const startDate = new Date(filters.dateRangeStart)
        if (!isNaN(startDate.getTime())) {
          startDate.setHours(0, 0, 0, 0) // Normalize to start of day
          filtered = filtered.filter(student => {
            if (!student.first_lesson_date) return false
            try {
              const firstDate = new Date(student.first_lesson_date)
              if (isNaN(firstDate.getTime())) return false
              firstDate.setHours(0, 0, 0, 0)
              return firstDate >= startDate
            } catch (e) {
              return false
            }
          })
        }
      } catch (e) {
        console.error('Error parsing dateRangeStart:', e)
      }
    }
    if (filters.dateRangeEnd) {
      try {
        const endDate = new Date(filters.dateRangeEnd)
        if (!isNaN(endDate.getTime())) {
          endDate.setHours(23, 59, 59, 999) // Normalize to end of day
          filtered = filtered.filter(student => {
            if (!student.last_lesson_date) return false
            try {
              const lastDate = new Date(student.last_lesson_date)
              if (isNaN(lastDate.getTime())) return false
              lastDate.setHours(23, 59, 59, 999)
              return lastDate <= endDate
            } catch (e) {
              return false
            }
          })
        }
      } catch (e) {
        console.error('Error parsing dateRangeEnd:', e)
      }
    }
    
    // Lead source filter
    if (filters.leadSources.length > 0) {
      filtered = filtered.filter(student => 
        student.lead_source && filters.leadSources.includes(student.lead_source)
      )
    }
    
    // Active only filter
    if (filters.showActiveOnly) {
      filtered = filtered.filter(student => student.is_active !== false)
    }
    
    return filtered
  }, [studentRevenue, filters])

  // Sorting logic
  const sortedStudents = useMemo(() => {
    let sortableStudents = [...filteredStudents]
    
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
            aValue = a.lesson_dates?.[0] || a.transactionDates?.[0] || '0'
            bValue = b.lesson_dates?.[0] || b.transactionDates?.[0] || '0'
            break
          case 'leadSource':
            aValue = (a.lead_source || '').toLowerCase()
            bValue = (b.lead_source || '').toLowerCase()
            break
          case 'status':
            // Sort by is_active: true (active) comes before false (inactive)
            aValue = a.is_active !== false ? 1 : 0
            bValue = b.is_active !== false ? 1 : 0
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
  }, [filteredStudents, sortConfig])

  // Calculate stats from filtered data
  const filteredStats = useMemo(() => {
    const totalRevenue = filteredStudents.reduce((sum, s) => sum + parseFloat(s.total_revenue || 0), 0)
    const totalLessonsSold = filteredStudents.reduce((sum, s) => sum + parseInt(s.total_lessons_purchased || 0), 0)
    const activeCount = filteredStudents.filter(s => s.is_active !== false).length
    const avgRevenuePerStudent = filteredStudents.length > 0 ? totalRevenue / filteredStudents.length : 0
    
    return {
      totalRevenue,
      totalLessonsSold,
      activeStudents: activeCount,
      totalStudents: filteredStudents.length,
      avgRevenuePerStudent
    }
  }, [filteredStudents])

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
            <div className="fin-stat-label">Total Revenue {filteredStudents.length !== studentRevenue.length ? `(Filtered)` : ''}</div>
            <div className="fin-stat-value" title={`$${filteredStats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(filteredStats.totalRevenue)}
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
            <div className="fin-stat-label">Lessons Sold {filteredStudents.length !== studentRevenue.length ? `(Filtered)` : ''}</div>
            <div className="fin-stat-value">{filteredStats.totalLessonsSold}</div>
          </div>
        </div>

        <div className="fin-stat-card active-card">
          <div className="fin-stat-icon">👥</div>
          <div className="fin-stat-content">
            <div className="fin-stat-label">Active Students {filteredStudents.length !== studentRevenue.length ? `(Filtered)` : ''}</div>
            <div className="fin-stat-value">{filteredStats.activeStudents} / {filteredStats.totalStudents}</div>
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
            <div className="fin-stat-label">Avg Revenue/Student {filteredStudents.length !== studentRevenue.length ? `(Filtered)` : ''}</div>
            <div className="fin-stat-value" title={`$${filteredStats.avgRevenuePerStudent.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}>
              {formatCurrency(filteredStats.avgRevenuePerStudent)}
            </div>
          </div>
        </div>
      </div>

      {/* Revenue by Student */}
      <div className="fin-section">
        <div className="section-header">
          <h2>💼 Revenue by Student</h2>
          <span className="section-count">{filteredStudents.length} of {studentRevenue.length} students</span>
        </div>
        
        {/* Filters Section */}
        <div className="filters-section">
          <div className="filter-row">
            {/* Year Dropdown */}
            <select 
              value={filters.year} 
              onChange={(e) => setFilters({...filters, year: e.target.value, month: null})}
              className="filter-select"
            >
              <option value="All Time">All Time</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            {/* Month Dropdown - Only enabled when year is selected */}
            <select 
              value={filters.month !== null ? filters.month : ''} 
              onChange={(e) => setFilters({...filters, month: e.target.value !== '' ? parseInt(e.target.value) : null})}
              className="filter-select"
              disabled={filters.year === 'All Time'}
            >
              <option value="">All Months</option>
              <option value="0">January</option>
              <option value="1">February</option>
              <option value="2">March</option>
              <option value="3">April</option>
              <option value="4">May</option>
              <option value="5">June</option>
              <option value="6">July</option>
              <option value="7">August</option>
              <option value="8">September</option>
              <option value="9">October</option>
              <option value="10">November</option>
              <option value="11">December</option>
            </select>
            
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={filters.searchQuery}
              onChange={(e) => setFilters({...filters, searchQuery: e.target.value})}
              className="filter-search"
            />
            
            {/* Revenue Range */}
            <input
              type="number"
              placeholder="Min Revenue"
              value={filters.revenueMin}
              onChange={(e) => setFilters({...filters, revenueMin: e.target.value})}
              className="filter-number"
            />
            <input
              type="number"
              placeholder="Max Revenue"
              value={filters.revenueMax}
              onChange={(e) => setFilters({...filters, revenueMax: e.target.value})}
              className="filter-number"
            />
          </div>
          
          <div className="filter-row">
            {/* Date Range */}
            <input
              type="date"
              value={filters.dateRangeStart}
              onChange={(e) => setFilters({...filters, dateRangeStart: e.target.value})}
              className="filter-date"
              placeholder="Active from"
            />
            <input
              type="date"
              value={filters.dateRangeEnd}
              onChange={(e) => setFilters({...filters, dateRangeEnd: e.target.value})}
              className="filter-date"
              placeholder="Active until"
            />
            
            {/* Lead Source Filter */}
            <select
              value={filters.leadSources.length > 0 ? filters.leadSources[0] : ''}
              onChange={(e) => setFilters({
                ...filters, 
                leadSources: e.target.value ? [e.target.value] : []
              })}
              className="filter-select"
            >
              <option value="">All Lead Sources</option>
              <option value="Groupon">Groupon</option>
              <option value="Findtennislessons">Findtennislessons</option>
              <option value="Playyourcourt">Playyourcourt</option>
              <option value="Referral">Referral</option>
              <option value="In Person">In Person</option>
              <option value="TeachMe">TeachMe</option>
              <option value="Thumbtack">Thumbtack</option>
              <option value="Facebook">Facebook</option>
              <option value="Instagram">Instagram</option>
              <option value="Other">Other</option>
            </select>
            
            {/* Active Only Toggle */}
            <label className="filter-checkbox">
              <input
                type="checkbox"
                checked={filters.showActiveOnly}
                onChange={(e) => setFilters({...filters, showActiveOnly: e.target.checked})}
              />
              Active Students Only
            </label>
            
            {/* Clear Filters Button */}
            <button 
              onClick={() => setFilters({
                year: 'All Time',
                month: null,
                searchQuery: '',
                revenueMin: '',
                revenueMax: '',
                dateRangeStart: '',
                dateRangeEnd: '',
                leadSources: [],
                showActiveOnly: false
              })}
              className="btn-clear-filters"
            >
              Clear All Filters
            </button>
          </div>
          
          {/* Filter Summary */}
          {Object.values(filters).some(v => {
            if (Array.isArray(v)) return v.length > 0
            if (v === null) return false
            return v !== '' && v !== 'All Time' && v !== false
          }) && (
            <div className="filter-summary">
              Showing {filteredStudents.length} of {studentRevenue.length} students
            </div>
          )}
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
                leadSource: 'Lead Source',
                status: 'Status'
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
                    {visibleColumns.status && (
                      <th onClick={() => handleSort('status')} className="sortable">
                        Status <SortIndicator columnKey="status" />
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
                            <div 
                              className="student-name" 
                              style={{ cursor: 'pointer', color: '#4B2C6C', textDecoration: 'underline' }}
                              onClick={() => navigate(`/coach/students/${student.id}`)}
                              onMouseEnter={(e) => e.target.style.color = '#6A4C8C'}
                              onMouseLeave={(e) => e.target.style.color = '#4B2C6C'}
                            >
                              {student.profiles?.full_name || 'Unknown'}
                            </div>
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
                          {student.lesson_dates?.length > 0 
                            ? (
                              <div>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                  {student.lesson_dates.length} lesson{student.lesson_dates.length !== 1 ? 's' : ''}
                                </div>
                                <div style={{ fontSize: '12px', color: '#666' }}>
                                  {student.lesson_dates.slice(0, 3).map(date => formatLessonDate(date)).join(', ')}
                                  {student.lesson_dates.length > 3 && ` +${student.lesson_dates.length - 3} more`}
                                </div>
                              </div>
                            )
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
                      {visibleColumns.status && (
                        <td>
                          {student.is_active !== false ? (
                            <span className="status-badge active">Active</span>
                          ) : (
                            <span className="status-badge inactive">Inactive</span>
                          )}
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
