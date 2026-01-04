import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Users, Trophy, TrendingUp, Gift, UserCheck, ArrowRight } from 'lucide-react'
import './ReferralDashboard.css'

export default function ReferralDashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalReferralRevenue: 0,
    activeReferrers: 0,
    avgRevenuePerReferral: 0
  })
  const [referrerData, setReferrerData] = useState([])
  const [referralDetails, setReferralDetails] = useState([])

  useEffect(() => {
    fetchReferralData()
  }, [])

  const fetchReferralData = async () => {
    try {
      setLoading(true)

      // Fetch all students with their profiles
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          total_revenue,
          is_active,
          referred_by_student_id,
          lesson_credits
        `)

      if (studentsError) throw studentsError

      // Fetch profiles for all students
      if (studentsData && studentsData.length > 0) {
        const studentIds = studentsData.map(s => s.id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds)

        // Merge students with profiles
        const studentsWithProfiles = studentsData.map(student => ({
          ...student,
          profiles: profilesData?.find(p => p.id === student.id)
        }))

        setStudents(studentsWithProfiles)

        // Calculate referral data
        calculateReferralMetrics(studentsWithProfiles)
      }
    } catch (error) {
      console.error('Error fetching referral data:', error)
      alert('Error loading referral data: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const calculateReferralMetrics = (studentsData) => {
    const referrerMap = {}
    const details = []

    // Build referral map and details
    studentsData.forEach(student => {
      if (student.referred_by_student_id) {
        const referrerId = student.referred_by_student_id
        
        // Find referrer
        const referrer = studentsData.find(s => s.id === referrerId)
        
        if (!referrerMap[referrerId]) {
          referrerMap[referrerId] = {
            id: referrerId,
            name: referrer?.profiles?.full_name || 'Unknown',
            email: referrer?.profiles?.email || '',
            referralCount: 0,
            referralRevenue: 0,
            referredStudents: []
          }
        }

        referrerMap[referrerId].referralCount++
        referrerMap[referrerId].referralRevenue += parseFloat(student.total_revenue || 0)
        referrerMap[referrerId].referredStudents.push({
          id: student.id,
          name: student.profiles?.full_name || 'Unknown',
          email: student.profiles?.email || '',
          revenue: parseFloat(student.total_revenue || 0),
          isActive: student.is_active !== false
        })

        // Add to details list
        details.push({
          referrerId,
          referrerName: referrer?.profiles?.full_name || 'Unknown',
          referredStudentId: student.id,
          referredStudentName: student.profiles?.full_name || 'Unknown',
          referredStudentEmail: student.profiles?.email || '',
          revenue: parseFloat(student.total_revenue || 0),
          isActive: student.is_active !== false
        })
      }
    })

    // Convert to array and sort
    const referrers = Object.values(referrerMap)
      .sort((a, b) => b.referralRevenue - a.referralRevenue)

    setReferrerData(referrers)
    setReferralDetails(details.sort((a, b) => b.revenue - a.revenue))

    // Calculate stats
    const totalReferrals = details.length
    const totalReferralRevenue = details.reduce((sum, d) => sum + d.revenue, 0)
    const activeReferrers = referrers.filter(r => {
      const referrer = studentsData.find(s => s.id === r.id)
      return referrer?.is_active !== false
    }).length
    const avgRevenuePerReferral = totalReferrals > 0 ? totalReferralRevenue / totalReferrals : 0

    setReferralStats({
      totalReferrals,
      totalReferralRevenue,
      activeReferrers,
      avgRevenuePerReferral
    })
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="referral-dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading referral data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="referral-dashboard">
        {/* Header */}
        <div className="referral-dashboard-header">
          <div>
            <h1>🤝 Referral Dashboard</h1>
            <p className="referral-subtitle">Track referrals, rewards, and referral performance</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="referral-stats-grid">
          <div className="referral-stat-card">
            <div className="referral-stat-icon">
              <Users size={24} />
            </div>
            <div className="referral-stat-content">
              <div className="referral-stat-label">Total Referrals</div>
              <div className="referral-stat-value">{referralStats.totalReferrals}</div>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="referral-stat-content">
              <div className="referral-stat-label">Total Referral Revenue</div>
              <div className="referral-stat-value">
                ${referralStats.totalReferralRevenue.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon">
              <Trophy size={24} />
            </div>
            <div className="referral-stat-content">
              <div className="referral-stat-label">Active Referrers</div>
              <div className="referral-stat-value">{referralStats.activeReferrers}</div>
            </div>
          </div>

          <div className="referral-stat-card">
            <div className="referral-stat-icon">
              <Gift size={24} />
            </div>
            <div className="referral-stat-content">
              <div className="referral-stat-label">Avg Revenue/Referral</div>
              <div className="referral-stat-value">
                ${referralStats.avgRevenuePerReferral.toLocaleString('en-US', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Referral Leaderboard */}
        <div className="referral-section">
          <div className="section-header">
            <h2>🏆 Referral Leaderboard</h2>
            <span className="section-count">{referrerData.length} referrer{referrerData.length !== 1 ? 's' : ''}</span>
          </div>

          {referrerData.length === 0 ? (
            <div className="empty-state">
              <p>No referrals yet.</p>
              <p className="empty-hint">Start tracking referrals when students sign up!</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Referrer</th>
                    <th>Referrals</th>
                    <th>Total Revenue</th>
                    <th>Avg Revenue/Referral</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referrerData.map((referrer, index) => (
                    <tr key={referrer.id}>
                      <td className="rank-cell">
                        {index === 0 && <Trophy size={18} className="trophy-gold" />}
                        {index === 1 && <Trophy size={18} className="trophy-silver" />}
                        {index === 2 && <Trophy size={18} className="trophy-bronze" />}
                        <span className="rank-number">{index + 1}</span>
                      </td>
                      <td>
                        <div className="referrer-cell">
                          <div 
                            className="referrer-name"
                            onClick={() => navigate(`/coach/students/${referrer.id}`)}
                            title="View profile"
                          >
                            {referrer.name}
                          </div>
                          {referrer.email && (
                            <div className="referrer-email">{referrer.email}</div>
                          )}
                        </div>
                      </td>
                      <td className="referral-count-cell">
                        <span className="badge badge-referrals">{referrer.referralCount}</span>
                      </td>
                      <td className="revenue-cell">
                        ${referrer.referralRevenue.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td className="avg-revenue-cell">
                        ${(referrer.referralRevenue / referrer.referralCount).toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td>
                        <button
                          className="btn-view-details"
                          onClick={() => {
                            const details = referrer.referredStudents.map(s => s.name).join(', ')
                            alert(`Students referred by ${referrer.name}:\n\n${details}`)
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Referral Details */}
        <div className="referral-section">
          <div className="section-header">
            <h2>📋 All Referral Details</h2>
            <span className="section-count">{referralDetails.length} referral{referralDetails.length !== 1 ? 's' : ''}</span>
          </div>

          {referralDetails.length === 0 ? (
            <div className="empty-state">
              <p>No referral details to display.</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="referral-table">
                <thead>
                  <tr>
                    <th>Referrer</th>
                    <th></th>
                    <th>Referred Student</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {referralDetails.map((detail, index) => (
                    <tr key={`${detail.referrerId}-${detail.referredStudentId}-${index}`}>
                      <td>
                        <div 
                          className="student-name-link"
                          onClick={() => navigate(`/coach/students/${detail.referrerId}`)}
                          title="View referrer profile"
                        >
                          {detail.referrerName}
                        </div>
                      </td>
                      <td className="arrow-cell">
                        <ArrowRight size={16} />
                      </td>
                      <td>
                        <div 
                          className="student-name-link"
                          onClick={() => navigate(`/coach/students/${detail.referredStudentId}`)}
                          title="View student profile"
                        >
                          {detail.referredStudentName}
                        </div>
                        {detail.referredStudentEmail && (
                          <div className="student-email">{detail.referredStudentEmail}</div>
                        )}
                      </td>
                      <td className="revenue-cell">
                        ${detail.revenue.toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td>
                        {detail.isActive ? (
                          <span className="badge badge-active">Active</span>
                        ) : (
                          <span className="badge badge-inactive">Inactive</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn-view-profile"
                          onClick={() => navigate(`/coach/students/${detail.referredStudentId}`)}
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

