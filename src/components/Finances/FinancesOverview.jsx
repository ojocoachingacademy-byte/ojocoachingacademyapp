import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { supabaseAdmin } from '../../supabaseAdmin'
import { DollarSign, TrendingUp, Calendar, Package, Users, ChevronDown, AlertCircle } from 'lucide-react'
import './FinancesOverview.css'

export default function FinancesOverview() {
  const [viewMode, setViewMode] = useState('month') // 'year', 'month', 'week'
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()) // 0-11
  
  const [loading, setLoading] = useState(true)
  
  // Financial data
  const [monthlyData, setMonthlyData] = useState(null)
  const [weeklyBreakdown, setWeeklyBreakdown] = useState([])
  const [yearlyData, setYearlyData] = useState(null)
  const [deferredRevenue, setDeferredRevenue] = useState({ lessons: 0, value: 0 })
  const [currentPackages, setCurrentPackages] = useState([])
  
  // Available years for dropdown
  const [availableYears, setAvailableYears] = useState([])

  useEffect(() => {
    fetchAvailableYears()
    fetchFinancialData()
  }, [viewMode, selectedYear, selectedMonth])

  const fetchAvailableYears = async () => {
    try {
      // Get earliest package date
      const { data: packages } = await supabaseAdmin
        .from('student_packages')
        .select('purchased_date')
        .order('purchased_date', { ascending: true })
        .limit(1)

      if (packages && packages.length > 0) {
        const earliestYear = new Date(packages[0].purchased_date).getFullYear()
        const currentYear = new Date().getFullYear()
        const years = []
        for (let year = earliestYear; year <= currentYear; year++) {
          years.push(year)
        }
        setAvailableYears(years)
      } else {
        setAvailableYears([new Date().getFullYear()])
      }
    } catch (error) {
      console.error('Error fetching available years:', error)
      setAvailableYears([new Date().getFullYear()])
    }
  }

  const fetchFinancialData = async () => {
    setLoading(true)
    try {
      if (viewMode === 'year') {
        await fetchYearlyData()
      } else if (viewMode === 'month') {
        await fetchMonthlyData()
      }
      
      await fetchDeferredRevenue()
      await fetchCurrentPackages()
    } catch (error) {
      console.error('Error fetching financial data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchYearlyData = async () => {
    // Get all months for the selected year
    const startDate = `${selectedYear}-01-01`
    const endDate = `${selectedYear}-12-31`

    const { data: revenueData } = await supabaseAdmin
      .from('monthly_revenue_summary')
      .select('*')
      .gte('month', startDate)
      .lte('month', endDate)

    const { data: lessonsData } = await supabaseAdmin
      .from('monthly_lessons_summary')
      .select('*')
      .gte('month', startDate)
      .lte('month', endDate)

    // Aggregate yearly totals
    const totalRevenue = revenueData?.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0) || 0
    const totalLessons = lessonsData?.reduce((sum, row) => sum + parseInt(row.lessons_delivered || 0), 0) || 0
    const totalPackages = revenueData?.reduce((sum, row) => sum + parseInt(row.packages_sold || 0), 0) || 0

    setYearlyData({
      revenue: totalRevenue,
      lessons: totalLessons,
      packages: totalPackages,
      monthlyBreakdown: revenueData || [],
      lessonsBreakdown: lessonsData || []
    })
  }

  const fetchMonthlyData = async () => {
    const monthStr = String(selectedMonth + 1).padStart(2, '0')
    const monthDate = `${selectedYear}-${monthStr}-01`

    // Get revenue for the month
    const { data: revenueData } = await supabaseAdmin
      .from('monthly_revenue_summary')
      .select('*')
      .eq('month', monthDate)
      .maybeSingle()

    // Get lessons for the month
    const { data: lessonsData } = await supabaseAdmin
      .from('monthly_lessons_summary')
      .select('*')
      .eq('month', monthDate)
      .maybeSingle()

    // Get previous month for comparison
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear
    const prevMonthStr = String(prevMonth + 1).padStart(2, '0')
    const prevMonthDate = `${prevYear}-${prevMonthStr}-01`

    const { data: prevRevenueData } = await supabaseAdmin
      .from('monthly_revenue_summary')
      .select('*')
      .eq('month', prevMonthDate)
      .maybeSingle()

    const { data: prevLessonsData } = await supabaseAdmin
      .from('monthly_lessons_summary')
      .select('*')
      .eq('month', prevMonthDate)
      .maybeSingle()

    setMonthlyData({
      revenue: parseFloat(revenueData?.total_revenue || 0),
      lessons: parseInt(lessonsData?.lessons_delivered || 0),
      packages: parseInt(revenueData?.packages_sold || 0),
      students: parseInt(lessonsData?.students_coached || 0),
      prevRevenue: parseFloat(prevRevenueData?.total_revenue || 0),
      prevLessons: parseInt(prevLessonsData?.lessons_delivered || 0)
    })

    // Fetch weekly breakdown for the month
    await fetchWeeklyBreakdownForMonth()
  }

  const fetchWeeklyBreakdownForMonth = async () => {
    const startDate = new Date(selectedYear, selectedMonth, 1)
    const endDate = new Date(selectedYear, selectedMonth + 1, 0)

    const { data: revenueData } = await supabaseAdmin
      .from('weekly_revenue_summary')
      .select('*')
      .gte('week_start', startDate.toISOString().split('T')[0])
      .lte('week_start', endDate.toISOString().split('T')[0])
      .order('week_start', { ascending: true })

    const { data: lessonsData } = await supabaseAdmin
      .from('weekly_lessons_summary')
      .select('*')
      .gte('week_start', startDate.toISOString().split('T')[0])
      .lte('week_start', endDate.toISOString().split('T')[0])
      .order('week_start', { ascending: true })

    // Combine revenue and lessons data by week
    const weeklyMap = {}
    
    revenueData?.forEach(week => {
      weeklyMap[week.week_start] = {
        week_start: week.week_start,
        revenue: parseFloat(week.total_revenue || 0),
        packages: parseInt(week.packages_sold || 0),
        lessons: 0
      }
    })

    lessonsData?.forEach(week => {
      if (weeklyMap[week.week_start]) {
        weeklyMap[week.week_start].lessons = parseInt(week.lessons_delivered || 0)
      } else {
        weeklyMap[week.week_start] = {
          week_start: week.week_start,
          revenue: 0,
          packages: 0,
          lessons: parseInt(week.lessons_delivered || 0)
        }
      }
    })

    setWeeklyBreakdown(Object.values(weeklyMap))
  }

  const fetchDeferredRevenue = async () => {
    try {
      const { data } = await supabaseAdmin
        .from('student_packages')
        .select('lessons_remaining, price_per_lesson')
        .eq('is_active', true)

      const totalLessons = data?.reduce((sum, pkg) => sum + (pkg.lessons_remaining || 0), 0) || 0
      const totalValue = data?.reduce((sum, pkg) => 
        sum + ((pkg.lessons_remaining || 0) * (pkg.price_per_lesson || 0)), 0) || 0

      setDeferredRevenue({
        lessons: totalLessons,
        value: totalValue
      })
    } catch (error) {
      console.error('Error fetching deferred revenue:', error)
    }
  }

  const fetchCurrentPackages = async () => {
    try {
      console.log('Fetching current packages...') // Debug log
      
      const { data, error } = await supabaseAdmin
        .from('student_packages')
        .select(`
          id,
          student_id,
          package_size,
          price_paid,
          price_per_lesson,
          lessons_purchased,
          lessons_used,
          lessons_remaining,
          purchased_date,
          is_active,
          students!student_packages_student_id_fkey!inner (
            profiles!students_id_fkey!inner (
              full_name,
              email
            )
          )
        `)
        .eq('is_active', true)
        .order('lessons_remaining', { ascending: true })

      if (error) {
        console.error('Error fetching packages:', error)
        setCurrentPackages([])
        return
      }

      console.log('Fetched packages:', data?.length, 'packages')
      console.log('First package:', data?.[0]) // Debug first package structure
      
      setCurrentPackages(data || [])
    } catch (error) {
      console.error('Error fetching current packages:', error)
      setCurrentPackages([])
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateInput) => {
    if (!dateInput) return '-'
    
    // If already a Date object, use directly
    if (dateInput instanceof Date) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      return `${monthNames[dateInput.getMonth()]} ${dateInput.getDate()}`
    }
    
    // If string, parse carefully to avoid timezone issues
    const [year, month, day] = dateInput.split('-').map(Number)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[month - 1]} ${day}`
  }

  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const getMonthName = (monthIndex) => {
    return new Date(2000, monthIndex, 1).toLocaleDateString('en-US', { month: 'long' })
  }

  if (loading && !monthlyData && !yearlyData) {
    return (
      <div className="finances-overview">
        <div className="loading-state">Loading financial data...</div>
      </div>
    )
  }

  return (
    <div className="finances-overview">
      {/* Header with View Mode Selector */}
      <div className="finances-header">
        <h2>💰 Financial Overview</h2>
        <div className="view-controls">
          <div className="view-mode-selector">
            <button
              className={`view-btn ${viewMode === 'year' ? 'active' : ''}`}
              onClick={() => setViewMode('year')}
            >
              Year
            </button>
            <button
              className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Month
            </button>
          </div>

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="period-select"
          >
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          {/* Month Selector (only show if month view) */}
          {viewMode === 'month' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="period-select"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{getMonthName(i)}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {viewMode === 'month' && monthlyData && (
        <>
          <div className="summary-cards">
            {/* Cash Collected Card */}
            <div className="summary-card revenue-card">
              <div className="card-icon">
                <DollarSign size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Cash Collected</div>
                <div className="card-value">{formatCurrency(monthlyData.revenue)}</div>
                {monthlyData.prevRevenue > 0 && (
                  <div className={`card-change ${monthlyData.revenue >= monthlyData.prevRevenue ? 'positive' : 'negative'}`}>
                    <TrendingUp size={14} />
                    {calculateChange(monthlyData.revenue, monthlyData.prevRevenue)}% vs last month
                  </div>
                )}
              </div>
            </div>

            {/* Lessons Delivered Card */}
            <div className="summary-card lessons-card">
              <div className="card-icon">
                <Calendar size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Lessons Delivered</div>
                <div className="card-value">{monthlyData.lessons}</div>
                {monthlyData.prevLessons > 0 && (
                  <div className={`card-change ${monthlyData.lessons >= monthlyData.prevLessons ? 'positive' : 'negative'}`}>
                    <TrendingUp size={14} />
                    {calculateChange(monthlyData.lessons, monthlyData.prevLessons)} vs last month
                  </div>
                )}
              </div>
            </div>

            {/* Packages Sold Card */}
            <div className="summary-card packages-card">
              <div className="card-icon">
                <Package size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Packages Sold</div>
                <div className="card-value">{monthlyData.packages}</div>
              </div>
            </div>

            {/* Students Coached Card */}
            <div className="summary-card students-card">
              <div className="card-icon">
                <Users size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Students Coached</div>
                <div className="card-value">{monthlyData.students}</div>
              </div>
            </div>
          </div>

          {/* Weekly Breakdown */}
          <div className="weekly-breakdown">
            <h3>Week-by-Week Breakdown</h3>
            <div className="breakdown-table">
              <div className="table-header">
                <div className="col-week">Week</div>
                <div className="col-revenue">Cash Collected</div>
                <div className="col-lessons">Lessons Given</div>
                <div className="col-packages">Packages Sold</div>
              </div>
              {weeklyBreakdown.length > 0 ? (
                weeklyBreakdown.map((week, index) => {
                  // Parse date string directly to avoid timezone issues
                  const dateStr = week.week_start  // e.g., "2026-01-11"
                  const [year, month, day] = dateStr.split('-').map(Number)
                  const weekStart = new Date(year, month - 1, day)
                  const weekEnd = new Date(year, month - 1, day + 6)
                  
                  return (
                    <div key={week.week_start} className="table-row">
                      <div className="col-week">
                        <span className="week-label">Week {index + 1}</span>
                        <span className="week-dates">
                          {formatDate(weekStart)} - {formatDate(weekEnd)}
                        </span>
                      </div>
                      <div className="col-revenue">{formatCurrency(week.revenue)}</div>
                      <div className="col-lessons">{week.lessons}</div>
                      <div className="col-packages">{week.packages}</div>
                    </div>
                  )
                })
              ) : (
                <div className="table-row empty">
                  <div className="col-full">No data for this month</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Yearly View */}
      {viewMode === 'year' && yearlyData && (
        <>
          <div className="summary-cards">
            <div className="summary-card revenue-card">
              <div className="card-icon">
                <DollarSign size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Total Revenue ({selectedYear})</div>
                <div className="card-value">{formatCurrency(yearlyData.revenue)}</div>
              </div>
            </div>

            <div className="summary-card lessons-card">
              <div className="card-icon">
                <Calendar size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Total Lessons ({selectedYear})</div>
                <div className="card-value">{yearlyData.lessons}</div>
              </div>
            </div>

            <div className="summary-card packages-card">
              <div className="card-icon">
                <Package size={24} />
              </div>
              <div className="card-content">
                <div className="card-label">Packages Sold ({selectedYear})</div>
                <div className="card-value">{yearlyData.packages}</div>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown for Year */}
          <div className="monthly-breakdown">
            <h3>Monthly Breakdown - {selectedYear}</h3>
            <div className="breakdown-table">
              <div className="table-header">
                <div className="col-month">Month</div>
                <div className="col-revenue">Revenue</div>
                <div className="col-lessons">Lessons</div>
                <div className="col-packages">Packages</div>
              </div>
              {Array.from({ length: 12 }, (_, i) => {
                const monthData = yearlyData.monthlyBreakdown.find(m => 
                  new Date(m.month).getMonth() === i
                )
                const lessonsData = yearlyData.lessonsBreakdown.find(m => 
                  new Date(m.month).getMonth() === i
                )
                
                return (
                  <div 
                    key={i} 
                    className="table-row clickable"
                    onClick={() => {
                      setViewMode('month')
                      setSelectedMonth(i)
                    }}
                  >
                    <div className="col-month">{getMonthName(i)}</div>
                    <div className="col-revenue">
                      {monthData ? formatCurrency(monthData.total_revenue) : '$0'}
                    </div>
                    <div className="col-lessons">
                      {lessonsData ? lessonsData.lessons_delivered : 0}
                    </div>
                    <div className="col-packages">
                      {monthData ? monthData.packages_sold : 0}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Current Student Packages */}
      <div className="current-packages-section">
        <h3>📦 Current Student Packages</h3>
        <div className="packages-table">
          <div className="table-header">
            <div className="col-student">Student</div>
            <div className="col-package">Package</div>
            <div className="col-progress">Progress</div>
            <div className="col-remaining">Remaining</div>
            <div className="col-value">Value Left</div>
          </div>
          {currentPackages.length > 0 ? (
            currentPackages.map(pkg => {
              const studentName = pkg.students?.profiles?.full_name || 'Unknown'
              const percentUsed = (pkg.lessons_used / pkg.lessons_purchased) * 100
              const isLow = pkg.lessons_remaining <= 2
              
              console.log('Rendering package for:', studentName) // Debug log
              
              return (
                <div key={pkg.id} className={`table-row ${isLow ? 'low-credits' : ''}`}>
                  <div className="col-student">
                    {studentName}
                    {isLow && <AlertCircle size={16} className="warning-icon" />}
                  </div>
                  <div className="col-package">
                    {pkg.package_size} lessons @ {formatCurrency(pkg.price_per_lesson)}/lesson
                  </div>
                  <div className="col-progress">
                    <div className="progress-bar-container">
                      <div 
                        className="progress-bar-fill"
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <span className="progress-text">{pkg.lessons_used}/{pkg.lessons_purchased}</span>
                  </div>
                  <div className="col-remaining">
                    <span className={isLow ? 'low' : ''}>{pkg.lessons_remaining}</span>
                  </div>
                  <div className="col-value">
                    {formatCurrency(pkg.lessons_remaining * pkg.price_per_lesson)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="table-row empty">
              <div className="col-full">No active packages</div>
            </div>
          )}
        </div>
      </div>

      {/* Deferred Revenue Card */}
      <div className="deferred-revenue-card">
        <h3>📊 Deferred Revenue (Future Liability)</h3>
        <div className="deferred-content">
          <div className="deferred-stat">
            <span className="deferred-label">Lessons Owed:</span>
            <span className="deferred-value">{deferredRevenue.lessons} lessons</span>
          </div>
          <div className="deferred-stat">
            <span className="deferred-label">Value:</span>
            <span className="deferred-value">{formatCurrency(deferredRevenue.value)}</span>
          </div>
          <p className="deferred-note">
            This represents lessons that students have pre-paid for but haven't taken yet.
          </p>
        </div>
      </div>
    </div>
  )
}
