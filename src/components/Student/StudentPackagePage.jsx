import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import StudentPageWrapper from '../Layout/StudentPageWrapper'
import './StudentPackagePage.css'

export default function StudentPackagePage() {
  const navigate = useNavigate()
  const [packages, setPackages] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPackageData()
  }, [])

  const fetchPackageData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get all packages
      const { data: pkgs } = await supabase
        .from('student_packages')
        .select('*')
        .eq('student_id', user.id)
        .order('purchase_date', { ascending: false })

      // Get all transactions
      const { data: txs } = await supabase
        .from('lesson_transactions')
        .select(`
          *,
          lessons (
            lesson_date,
            location
          )
        `)
        .eq('student_id', user.id)
        .order('transaction_date', { ascending: false })

      setPackages(pkgs || [])
      setTransactions(txs || [])
    } catch (error) {
      console.error('Error fetching package data:', error)
    } finally {
      setLoading(false)
    }
  }

  const activePackage = packages.find(p => p.is_active)

  const getTotalCredits = (pkg) => Number(pkg.lessons_purchased ?? pkg.package_size ?? pkg.total_credits) || 0
  const getCreditsUsed = (pkg) => Number(pkg.lessons_used) || 0
  // Use lessons_remaining from package (DB trigger keeps it in sync) - more reliable than lesson_transactions
  const getCreditsRemaining = (pkg) =>
    Number.isFinite(pkg.lessons_remaining)
      ? Math.max(0, pkg.lessons_remaining)
      : Math.max(0, getTotalCredits(pkg) - getCreditsUsed(pkg))

  return (
    <StudentPageWrapper>
      <div className="student-package-page" style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              color: '#6366f1',
              padding: 0
            }}
          >
            <ArrowLeft size={20} />
            Back to Dashboard
          </button>
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
          My Packages
        </h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>
          Your lesson package history with Ojo Coaching Academy
        </p>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <>
            {/* Active Package */}
            {activePackage && (
              <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', margin: 0 }}>Current Package</h2>
                    <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>{activePackage.package_name}</p>
                  </div>
                  <span style={{
                    padding: '6px 12px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}>
                    ACTIVE
                  </span>
                </div>

                {/* Credits Progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', opacity: 0.9 }}>Credits Left</span>
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>
                      {getCreditsRemaining(activePackage)} <span style={{ fontSize: '12px', opacity: 0.8 }}>({getCreditsUsed(activePackage)} of {getTotalCredits(activePackage)} used)</span>
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      background: 'white',
                      width: `${getTotalCredits(activePackage) > 0 ? (getCreditsUsed(activePackage) / getTotalCredits(activePackage)) * 100 : 0}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Package Details Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '16px',
                  marginTop: '20px'
                }}>
                  <div>
                    <div style={{ fontSize: '13px', opacity: 0.8 }}>Credits Remaining</div>
                    <div style={{ fontSize: '24px', fontWeight: 700 }}>
                      {getCreditsRemaining(activePackage)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', opacity: 0.8 }}>Purchased</div>
                    <div style={{ fontSize: '16px', fontWeight: 600 }}>
                      {new Date(activePackage.purchase_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  {activePackage.expiration_date && (
                    <div>
                      <div style={{ fontSize: '13px', opacity: 0.8 }}>Expires</div>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>
                        {new Date(activePackage.expiration_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Past Packages */}
            {packages.filter(p => !p.is_active).length > 0 && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                  Package History
                </h3>
                {packages.filter(p => !p.is_active).map(pkg => (
                  <div key={pkg.id} style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '20px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{pkg.package_name}</h4>
                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
                          {getCreditsUsed(pkg)} of {getTotalCredits(pkg)} credits used
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '13px', color: '#999' }}>Purchased</div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {new Date(pkg.purchase_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Recent Transactions */}
            {transactions.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
                  Recent Lessons
                </h3>
                <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                  {transactions.slice(0, 10).map(tx => (
                    <div key={tx.id} style={{
                      padding: '16px',
                      borderBottom: '1px solid #f3f4f6',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600 }}>
                          {new Date(tx.lessons?.lesson_date || tx.transaction_date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        {tx.lessons?.location && (
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                            {tx.lessons.location}
                          </div>
                        )}
                      </div>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ef4444'
                      }}>
                        -{tx.credits_used} credit{tx.credits_used === 1 ? '' : 's'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentPageWrapper>
  )
}
