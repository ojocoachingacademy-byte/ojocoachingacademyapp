import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import { GOAL_OPTIONS } from '../../DevelopmentPlan/MilestonesConstants'
import { NTRP_OPTIONS, getNtrpLabel } from '../../../utils/ntrpLabels'
import { Edit2 } from 'lucide-react'
import './ProfileTab.css'

const ProfileTab = ({ studentData, onBookLesson, onProfileUpdate, onClose, isHittingPartnersOnly = false }) => {
  const navigate = useNavigate()
  const [activePackage, setActivePackage] = useState(null)
  const [accountStats, setAccountStats] = useState({
    totalLessons: 0,
    completedPractice: 0,
    joinedDate: null
  })
  const [loading, setLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileFormData, setProfileFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    ntrp_level: '3.0'
  })
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    ntrp_level: '3.0'
  })

  useEffect(() => {
    if (studentData?.id) {
      fetchAccountStats()
    }
  }, [studentData])

  useEffect(() => {
    fetchPackageInfo()
  }, [studentData?.id])

  const fetchPackageInfo = async () => {
    if (!studentData?.id) return

    try {
      // Get active package
      const { data: pkg } = await supabase
        .from('student_packages')
        .select('*')
        .eq('student_id', studentData.id)
        .eq('is_active', true)
        .maybeSingle()

      if (pkg) {
        setActivePackage(pkg)
      } else {
        setActivePackage(null)
      }
    } catch (error) {
      console.error('Error fetching package:', error)
    }
  }

  // Use lessons_remaining from package (DB trigger keeps it in sync)
  const creditsRemaining = activePackage != null && Number.isFinite(activePackage.lessons_remaining)
    ? Math.max(0, activePackage.lessons_remaining)
    : (activePackage ? Math.max(0, (Number(activePackage.lessons_purchased ?? activePackage.package_size) || 0) - (Number(activePackage.lessons_used) || 0)) : 0)

  useEffect(() => {
    // Initialize form data when studentData changes
    if (studentData?.profiles) {
      const nameParts = (studentData.profiles.full_name || '').split(' ')
      setProfileFormData({
        full_name: studentData.profiles.full_name || '',
        email: studentData.profiles.email || '',
        phone: studentData.profiles.phone || '',
        ntrp_level: studentData.profiles.ntrp_level || '3.0'
      })
    }
  }, [studentData])

  const fetchAccountStats = async () => {
    if (!studentData?.id) return

    try {
      // Get lesson stats
      const { data: lessons, count } = await supabase
        .from('lessons')
        .select('*', { count: 'exact' })
        .eq('student_id', studentData.id)
        .eq('status', 'completed')

      const completedPractice = lessons?.filter(
        l => l.practice_plan_completed
      ).length || 0

      setAccountStats({
        totalLessons: count || 0,
        completedPractice,
        joinedDate: studentData.created_at
      })

    } catch (error) {
      console.error('Error fetching account stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await trackEvent(EVENTS.LOGOUT)
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  const handleBookLessons = () => {
    // Open booking page in new tab
    window.open('https://ojocoachingacademy.com/booking', '_blank')
  }

  const handleContactCoach = () => {
    window.location.href = 'mailto:tobi@ojocoachingacademy.com'
  }

  const handleOpenEditModal = () => {
    const nameParts = (profileFormData.full_name || '').trim().split(' ')
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''
    setEditFormData({
      first_name: firstName,
      last_name: lastName,
      email: profileFormData.email || '',
      phone: profileFormData.phone || '',
      ntrp_level: profileFormData.ntrp_level || '3.0'
    })
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
  }

  const handleSaveProfile = async (e) => {
    e?.preventDefault?.()
    if (!studentData?.id) return

    const fullName = [editFormData.first_name, editFormData.last_name].filter(Boolean).join(' ').trim()

    setEditingProfile(true)
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName || profileFormData.full_name,
          email: editFormData.email,
          phone: editFormData.phone,
          ntrp_level: editFormData.ntrp_level
        })
        .eq('id', studentData.id)

      if (profileError) throw profileError

      // If email changed, update auth email
      if (editFormData.email !== studentData.profiles?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editFormData.email
        })
        if (emailError) {
          console.warn('Email update may require confirmation:', emailError.message)
        }
      }

      setProfileFormData({
        full_name: fullName || profileFormData.full_name,
        email: editFormData.email,
        phone: editFormData.phone,
        ntrp_level: editFormData.ntrp_level
      })
      alert('Profile updated successfully!')
      setShowEditModal(false)
      
      // Notify parent to refresh data
      if (onProfileUpdate) {
        onProfileUpdate()
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile: ' + error.message)
    } finally {
      setEditingProfile(false)
    }
  }

  if (loading) {
    return (
      <div className="profile-tab-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="profile-tab">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          {studentData?.profiles?.full_name?.charAt(0).toUpperCase() || '👤'}
        </div>
        <div className="profile-header-info">
          <h1>{studentData?.profiles?.full_name || 'Student'}</h1>
          <p className="profile-email">{studentData?.profiles?.email}</p>
        </div>
      </div>

      {/* Package Card - Clickable (hidden for hitting-partners-only profile) */}
      {!isHittingPartnersOnly && (
        <div
          className="package-card clickable"
          onClick={() => navigate('/packages')}
          style={{ cursor: 'pointer' }}
        >
          <div className="package-content">
            <div className="package-icon">📦</div>
            <div className="package-info">
              <span className="package-label">Lesson Package</span>
              {activePackage ? (
                <>
                  <span className="package-value">
                    {creditsRemaining} credits left
                  </span>
                  <span className="package-subtitle">
                    {activePackage.package_name}
                  </span>
                </>
              ) : (
                <span className="package-value">No active package</span>
              )}
            </div>
            <div className="package-arrow">→</div>
          </div>
          {activePackage && creditsRemaining <= 2 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 12px',
              background: '#fef2f2',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#991b1b'
            }}>
              ⚠️ {creditsRemaining === 0 ? 'No credits remaining' : 'Running low on credits'}
            </div>
          )}
        </div>
      )}

      {/* Practice Plans Card */}
      {!isHittingPartnersOnly && (
        <div
          className="practice-plans-card clickable"
          onClick={() => navigate('/practice-plans')}
          style={{
            cursor: 'pointer',
            background: 'white',
            border: '2px solid #e5e7eb',
            borderRadius: '12px',
            padding: '20px',
            transition: 'all 0.2s ease',
            marginTop: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#6366f1'
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ fontSize: '32px' }}>🎯</div>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: '13px', color: '#666', fontWeight: 500, display: 'block', marginBottom: '4px' }}>
                Practice Plans
              </span>
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                View all practice assignments
              </span>
            </div>
            <div style={{ fontSize: '24px', color: '#d1d5db' }}>→</div>
          </div>
        </div>
      )}

      {/* Account Stats - 3 cards, each on its own row (hidden for hitting-partners-only profile) */}
      {!isHittingPartnersOnly && (
        <div className="account-stats" style={{ marginBottom: '2rem' }}>
          <h3>Your Stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Total Lessons */}
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🎾</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {accountStats.totalLessons}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Lessons
              </div>
            </div>

            {/* Practice Completed */}
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {accountStats.completedPractice}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Practice Completed
              </div>
            </div>

            {/* Member Since */}
            <div style={{
              textAlign: 'center',
              padding: '20px',
              background: '#f9fafb',
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>📅</div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                {accountStats.joinedDate
                  ? new Date(accountStats.joinedDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : 'N/A'}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Member Since
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Information */}
      <div className="profile-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>Personal Information</h3>
          <button 
            className="btn-edit-profile"
            onClick={handleOpenEditModal}
          >
            <Edit2 size={16} />
            Edit Profile
          </button>
        </div>
        <div className="info-list">
          <div className="info-item">
            <span className="info-label">Name</span>
            <span className="info-value">{studentData?.profiles?.full_name || 'Not set'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Email</span>
            <span className="info-value">{studentData?.profiles?.email || 'Not set'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Phone</span>
            <span className="info-value">{studentData?.profiles?.phone || 'Not set'}</span>
          </div>
          {studentData?.profiles?.ntrp_level && (
            <div className="info-item">
              <span className="info-label">Skill Level</span>
              <span className="info-value">{getNtrpLabel(studentData.profiles.ntrp_level)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal - mobile responsive */}
      {showEditModal && (
        <div
          className="edit-profile-modal-overlay modal-overlay"
          onClick={handleCloseEditModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            className="edit-profile-modal-content modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '500px',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '20px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1,
              borderRadius: '12px 12px 0 0'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                Edit Profile
              </h2>
              <button
                onClick={handleCloseEditModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  color: '#6b7280'
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px' }}>
              <form onSubmit={handleSaveProfile}>
                {/* First Name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151'
                  }}>
                    First Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.first_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Last Name */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151'
                  }}>
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.last_name || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Email */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151'
                  }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editFormData.email || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                    Changing email may require verification
                  </small>
                </div>

                {/* Phone */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151'
                  }}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Skill Level (NTRP) */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '6px',
                    color: '#374151'
                  }}>
                    Skill Level (NTRP)
                  </label>
                  <select
                    value={editFormData.ntrp_level || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, ntrp_level: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '16px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {NTRP_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '24px',
                  flexDirection: 'column'
                }}>
                  <button
                    type="submit"
                    disabled={editingProfile}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: editingProfile ? 'not-allowed' : 'pointer',
                      opacity: editingProfile ? 0.6 : 1
                    }}
                  >
                    {editingProfile ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    disabled={editingProfile}
                    style={{
                      width: '100%',
                      padding: '12px 20px',
                      background: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Mobile styles - scoped to edit profile modal */}
          <style>{`
            @media (max-width: 640px) {
              .edit-profile-modal-overlay {
                padding: 8px !important;
                align-items: flex-end !important;
              }
              
              .edit-profile-modal-content {
                max-width: 100% !important;
                max-height: calc(100vh - 16px) !important;
                border-radius: 16px 16px 0 0 !important;
              }
            }
          `}</style>
        </div>
      )}

      {/* Goals - Parse from development plan if exists */}
      {(() => {
        let goalText = null
        if (studentData?.development_plan) {
          try {
            const plan = typeof studentData.development_plan === 'string' 
              ? safeJsonParse(studentData.development_plan, studentData.development_plan)
              : studentData.development_plan
            
            if (plan?.section1?.bigGoal) {
              const goal = GOAL_OPTIONS.find(g => g.value === plan.section1.bigGoal)
              goalText = goal ? goal.label : plan.section1.customGoal || plan.section1.bigGoal
            } else if (plan?.goals?.targetLevel) {
              goalText = plan.goals.targetLevel
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        if (goalText) {
          return (
            <div className="profile-section">
              <h3>Your Goals</h3>
              <div className="goals-display">
                <p>"{goalText}"</p>
              </div>
            </div>
          )
        }
        return null
      })()}

      {/* Quick Actions */}
      <div className="profile-section">
        <h3>Quick Actions</h3>
        <div className="actions-list">
          <button className="action-button" onClick={handleBookLessons}>
            <span className="action-icon">📅</span>
            <span className="action-text">
              {isHittingPartnersOnly ? 'Book a Lesson with Coach Tobi' : 'Book More Lessons'}
            </span>
            <span className="action-arrow">→</span>
          </button>

          <button className="action-button" onClick={handleContactCoach}>
            <span className="action-icon">💬</span>
            <span className="action-text">Contact Coach Tobi</span>
            <span className="action-arrow">→</span>
          </button>
        </div>
      </div>

      {/* App Settings */}
      <div className="profile-section">
        <h3>App Settings</h3>
        <button
          onClick={async () => {
            if ('serviceWorker' in navigator) {
              const registrations = await navigator.serviceWorker.getRegistrations()
              registrations.forEach((registration) => registration.unregister())
            }
            // Clear all caches
            if ('caches' in window) {
              const cacheNames = await caches.keys()
              cacheNames.forEach((name) => caches.delete(name))
            }
            // Reload
            window.location.reload(true)
          }}
          className="btn btn-outline"
          style={{ width: '100%', marginBottom: '8px' }}
        >
          🔄 Force Refresh App
        </button>
        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px', marginBottom: 0 }}>
          Use this if the app is behaving strangely or stuck on an old version
        </p>
      </div>

      {/* Logout */}
      <div className="profile-section logout-section">
        <div className="profile-actions-row">
          <button className="btn-logout" onClick={handleLogout}>
            <span>Logout</span>
            <span className="logout-icon">🚪</span>
          </button>
        </div>
      </div>

      {/* Close (when in modal) - sticky at bottom */}
      {onClose && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px',
            background: 'white',
            borderTop: '1px solid #e5e7eb',
            zIndex: 1000
          }}
        >
          <button
            type="button"
            onClick={() => onClose()}
            style={{
              width: '100%',
              padding: '12px',
              background: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}

      {/* Footer Info */}
      <div className="profile-footer">
        <p className="footer-text">
          Questions? Email <a href="mailto:tobi@ojocoachingacademy.com">tobi@ojocoachingacademy.com</a>
        </p>
        <p className="footer-text">
          <a href="https://ojocoachingacademy.com/privacy-policy.html" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          {' • '}
          <a href="https://ojocoachingacademy.com/terms.html" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
        </p>
      </div>
    </div>
  )
}

export default ProfileTab
