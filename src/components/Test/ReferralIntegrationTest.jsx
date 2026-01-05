import { useState, useEffect } from 'react'
import { verifyIntegration } from '../../utils/verifyReferralIntegration'
import { getWebsiteReferrals, getWebsiteReferralStats, getCombinedReferralStats } from '../../utils/referralDataSync'
import './ReferralIntegrationTest.css'

export default function ReferralIntegrationTest() {
  const [verificationResults, setVerificationResults] = useState(null)
  const [websiteReferrals, setWebsiteReferrals] = useState([])
  const [stats, setStats] = useState(null)
  const [combinedStats, setCombinedStats] = useState(null)
  const [loading, setLoading] = useState(false)

  const runVerification = async () => {
    setLoading(true)
    // Clear console first
    console.clear()
    console.log('🔍 Starting Verification...\n')
    
    const results = await verifyIntegration()
    setVerificationResults(results)
    setLoading(false)
  }

  const fetchWebsiteData = async () => {
    setLoading(true)
    try {
      const referrals = await getWebsiteReferrals()
      const websiteStats = await getWebsiteReferralStats()
      const combined = await getCombinedReferralStats()
      
      setWebsiteReferrals(referrals)
      setStats(websiteStats)
      setCombinedStats(combined)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Auto-run verification on mount
    runVerification()
    fetchWebsiteData()
  }, [])

  return (
    <div className="referral-test-page">
      <div className="test-header">
        <h1>Referral Integration Test</h1>
        <p>Use this page to verify your referral integration is working correctly</p>
      </div>

      <div className="test-actions">
        <button onClick={runVerification} disabled={loading} className="btn-test">
          🔄 Run Verification Again
        </button>
        <button onClick={fetchWebsiteData} disabled={loading} className="btn-test">
          📊 Refresh Data
        </button>
      </div>

      {loading && <div className="loading">Loading...</div>}

      {/* Verification Results */}
      {verificationResults && (
        <div className="test-section">
          <h2>✅ Verification Results</h2>
          <div className="results-grid">
            <div className={`result-card ${verificationResults.tablesExist ? 'success' : 'error'}`}>
              <strong>Tables Exist:</strong> {verificationResults.tablesExist ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`result-card ${verificationResults.canReadBookings ? 'success' : 'error'}`}>
              <strong>Can Read Bookings:</strong> {verificationResults.canReadBookings ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`result-card ${verificationResults.canReadReferrals ? 'success' : 'error'}`}>
              <strong>Can Read Referrals:</strong> {verificationResults.canReadReferrals ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`result-card ${verificationResults.canReadRedemptions ? 'success' : 'error'}`}>
              <strong>Can Read Redemptions:</strong> {verificationResults.canReadRedemptions ? '✅ Yes' : '❌ No'}
            </div>
            <div className={`result-card ${verificationResults.statsWork ? 'success' : 'error'}`}>
              <strong>Stats Functions:</strong> {verificationResults.statsWork ? '✅ Working' : '❌ Failed'}
            </div>
            <div className={`result-card ${verificationResults.combinedStatsWork ? 'success' : 'error'}`}>
              <strong>Combined Stats:</strong> {verificationResults.combinedStatsWork ? '✅ Working' : '❌ Failed'}
            </div>
          </div>

          {verificationResults.errors.length > 0 && (
            <div className="errors-section">
              <h3>⚠️ Errors:</h3>
              <ul>
                {verificationResults.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Website Stats */}
      {stats && (
        <div className="test-section">
          <h2>📊 Website Referral Statistics</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Referrals</div>
              <div className="stat-value">{stats.totalReferrals}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${stats.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unique Codes</div>
              <div className="stat-value">{stats.uniqueCodes}</div>
            </div>
          </div>

          {stats.topReferrers.length > 0 && (
            <div className="top-referrers">
              <h3>Top Referrers:</h3>
              <table>
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>Count</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topReferrers.map((ref, index) => (
                    <tr key={index}>
                      <td>{ref.referralCode}</td>
                      <td>{ref.count}</td>
                      <td>${ref.totalRevenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Combined Stats */}
      {combinedStats && (
        <div className="test-section">
          <h2>🔗 Combined Statistics (App + Website)</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Referrals</div>
              <div className="stat-value">{combinedStats.combined.totalReferrals}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${combinedStats.combined.totalRevenue.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Unique Referrers</div>
              <div className="stat-value">{combinedStats.combined.uniqueReferrers}</div>
            </div>
          </div>
        </div>
      )}

      {/* Website Referrals List */}
      {websiteReferrals.length > 0 && (
        <div className="test-section">
          <h2>📋 Website Referrals ({websiteReferrals.length})</h2>
          <div className="referrals-list">
            {websiteReferrals.slice(0, 10).map((booking, index) => (
              <div key={booking.id || index} className="referral-item">
                <div className="referral-header">
                  <strong>{booking.customer_first_name} {booking.customer_last_name}</strong>
                  <span className="referral-code">{booking.referral_code}</span>
                </div>
                <div className="referral-details">
                  <span>Package: {booking.package_name}</span>
                  <span>Price: ${parseFloat(booking.price).toLocaleString()}</span>
                  <span>Date: {new Date(booking.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
            {websiteReferrals.length > 10 && (
              <p className="more-indicator">...and {websiteReferrals.length - 10} more</p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="test-section instructions">
        <h2>ℹ️ Instructions</h2>
        <ol>
          <li>This page automatically runs verification on load</li>
          <li>Check the verification results above - all should show ✅</li>
          <li>If you see ❌, check the errors section</li>
          <li>Make a test booking on your website with a referral code</li>
          <li>Click "Refresh Data" to see the new booking appear</li>
          <li>Check the browser console (F12) for detailed logs</li>
        </ol>
      </div>
    </div>
  )
}

