import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../supabaseClient'
import { trackEvent, EVENTS } from '../../../utils/analytics'
import { GOAL_OPTIONS } from '../../DevelopmentPlan/MilestonesConstants'
import { NTRP_OPTIONS, getNtrpLabel } from '../../../utils/ntrpLabels'
import { Edit2, X } from 'lucide-react'
import './ProfileTab.css'

const ProfileTab = ({ studentData, onBookLesson, onProfileUpdate, onClose, isHittingPartnersOnly = false }) => {
  const navigate = useNavigate()
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

  useEffect(() => {
    if (studentData?.id) {
      fetchAccountStats()
    }
  }, [studentData])

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
    setShowEditModal(true)
  }

  const handleCloseEditModal = () => {
    setShowEditModal(false)
  }

  const handleSaveProfile = async () => {
    if (!studentData?.id) return

    setEditingProfile(true)
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileFormData.full_name,
          email: profileFormData.email,
          phone: profileFormData.phone,
          ntrp_level: profileFormData.ntrp_level
        })
        .eq('id', studentData.id)

      if (profileError) throw profileError

      // If email changed, update auth email
      if (profileFormData.email !== studentData.profiles?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profileFormData.email
        })
        if (emailError) {
          console.warn('Email update may require confirmation:', emailError.message)
        }
      }

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

  // Use lesson_credits (the actual field name) instead of lessons_remaining
  const credits = studentData?.lesson_credits || 0
  const creditsLow = credits <= 2 && credits > 0
  const creditsEmpty = credits === 0

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

      {/* Credits Card - Most Important (hidden for hitting-partners-only profile) */}
      {!isHittingPartnersOnly && (
        <div className={`credits-card ${creditsLow ? 'low' : ''} ${creditsEmpty ? 'empty' : ''}`}>
          <div className="credits-content">
            <div className="credits-icon">🎾</div>
            <div className="credits-info">
              <span className="credits-label">Lesson Credits</span>
              <span className="credits-value">{credits}</span>
              {credits <= 2 && (
                <span className="credits-reup-hint">
                  {creditsEmpty ? 'Time to Re-Up' : 'Almost Time to Re-Up'}
                </span>
              )}
              {creditsLow && !creditsEmpty && (
                <span className="credits-warning">Running low!</span>
              )}
              {creditsEmpty && (
                <span className="credits-warning empty">No credits remaining</span>
              )}
            </div>
          </div>
          <button 
            className={`btn-credits ${creditsEmpty ? 'btn-primary' : 'btn-secondary'}`}
            onClick={handleBookLessons}
          >
            {creditsEmpty ? 'Buy Package' : 'Book More Lessons'}
          </button>
        </div>
      )}

      {/* Account Stats (hidden for hitting-partners-only profile) */}
      {!isHittingPartnersOnly && (
        <div className="account-stats">
          <h3>Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">🎾</span>
              <div className="stat-content">
                <span className="stat-value">{accountStats.totalLessons}</span>
                <span className="stat-label">Total Lessons</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">✅</span>
              <div className="stat-content">
                <span className="stat-value">{accountStats.completedPractice}</span>
                <span className="stat-label">Practice Completed</span>
              </div>
            </div>

            <div className="stat-item">
              <span className="stat-icon">📅</span>
              <div className="stat-content">
                <span className="stat-value">
                  {accountStats.joinedDate 
                    ? new Date(accountStats.joinedDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })
                    : 'N/A'
                  }
                </span>
                <span className="stat-label">Member Since</span>
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

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="edit-profile-modal-overlay" onClick={handleCloseEditModal}>
          <div className="edit-profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-profile-modal-header">
              <h2>Edit Profile</h2>
              <button 
                className="edit-profile-modal-close"
                onClick={handleCloseEditModal}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="edit-profile-modal-body">
              <div className="form-group">
                <label htmlFor="edit-full-name">Full Name</label>
                <input
                  id="edit-full-name"
                  type="text"
                  value={profileFormData.full_name}
                  onChange={(e) => setProfileFormData({ ...profileFormData, full_name: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-email">Email</label>
                <input
                  id="edit-email"
                  type="email"
                  value={profileFormData.email}
                  onChange={(e) => setProfileFormData({ ...profileFormData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
                <small style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block' }}>
                  Changing email may require verification
                </small>
              </div>
              <div className="form-group">
                <label htmlFor="edit-phone">Phone</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={profileFormData.phone}
                  onChange={(e) => setProfileFormData({ ...profileFormData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-ntrp">Skill Level (NTRP)</label>
                <select
                  id="edit-ntrp"
                  value={profileFormData.ntrp_level}
                  onChange={(e) => setProfileFormData({ ...profileFormData, ntrp_level: e.target.value })}
                >
                  {NTRP_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="edit-profile-modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={handleCloseEditModal}
                  disabled={editingProfile}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={handleSaveProfile}
                  disabled={editingProfile}
                >
                  {editingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
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
