import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import StudentTabs from '../Dashboard/StudentTabs'
import MoreMenu from './MoreMenu'
import ProfileTab from '../Dashboard/tabs/ProfileTab'
import './StudentPageWrapper.css'
import '../Dashboard/StudentDashboard.css'

/**
 * Wrapper component for student pages that need bottom navigation
 * This replaces the old Header navigation with the new bottom tabs
 */
export default function StudentPageWrapper({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [profileModalData, setProfileModalData] = useState(null)
  const [profileModalLoading, setProfileModalLoading] = useState(false)

  // Map routes to tab IDs
  const getActiveTab = (pathname) => {
    const path = pathname || location.pathname
    if (path === '/dashboard' || path.startsWith('/dashboard')) return location.state?.tab === 'progress' ? 'progress' : 'home'
    if (path === '/lessons' || path.startsWith('/lessons')) return 'lessons'
    if (path === '/hitting-partners' || path.startsWith('/hitting-partners')) return 'hitting-partners'
    if (path === '/messages' || path.startsWith('/messages')) return 'hitting-partners'
    if (path === '/tennis-resources' || path.startsWith('/tennis-resources')) return 'hitting-partners'
    if (path === '/settings' || path.startsWith('/settings')) return 'home'
    if (path === '/notifications' || path.startsWith('/notifications')) return 'more'
    return 'home'
  }

  const [activeTab, setActiveTab] = useState(() => getActiveTab(location.pathname))
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)
  const [isActiveStudent, setIsActiveStudent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkUserAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.id) {
        navigate('/login')
        setLoading(false)
        return
      }

      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('is_active')
          .eq('id', user.id)
          .single()

        if (error) {
          console.error('Error checking student:', error)
          navigate('/login')
          setLoading(false)
          return
        }

        if (student && !student.is_active) {
          console.log('Network-only user detected, redirecting to hitting partners')
          navigate('/hitting-partners')
          setLoading(false)
          return
        }

        setIsActiveStudent(true)
      } catch (err) {
        console.error('Error:', err)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    checkUserAccess()
  }, [navigate])

  // Update active tab when route changes
  useEffect(() => {
    if (!isMoreMenuOpen) {
      setActiveTab(getActiveTab(location.pathname))
    }
  }, [location.pathname, isMoreMenuOpen])

  // Listen for profile modal open (e.g. from More menu on hitting partners page).
  // On dashboard, StudentDashboard handles the event; we only open modal when on other student pages.
  useEffect(() => {
    const handleOpenProfileModal = async () => {
      if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard')) {
        return // Dashboard has its own listener and data
      }
      setShowProfileModal(true)
      setProfileModalLoading(true)
      setProfileModalData(null)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.id) {
          setShowProfileModal(false)
          return
        }
        const [profileRes, studentRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('students').select('*').eq('id', user.id).single()
        ])
        const profile = profileRes.data
        const student = studentRes.data
        if (profile && student) {
          setProfileModalData({ ...student, profiles: profile })
        }
      } catch (err) {
        console.error('Error loading profile for modal:', err)
      } finally {
        setProfileModalLoading(false)
      }
    }
    window.addEventListener('openProfileModal', handleOpenProfileModal)
    return () => window.removeEventListener('openProfileModal', handleOpenProfileModal)
  }, [location.pathname])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    
    // Navigate based on tab
    switch (tabId) {
      case 'home':
        navigate('/dashboard', { state: { tab: 'home' } })
        break
      case 'progress':
        navigate('/dashboard', { state: { tab: 'progress' } })
        break
      case 'lessons':
        navigate('/lessons')
        break
      case 'hitting-partners':
        // Default to hitting partners when tab is selected
        if (location.pathname !== '/hitting-partners' && 
            location.pathname !== '/messages' && 
            location.pathname !== '/tennis-resources') {
          navigate('/hitting-partners')
        }
        break
      default:
        break
    }
  }

  const bottomNav = (
    <>
      <StudentTabs 
        activeTab={isMoreMenuOpen ? 'more' : activeTab} 
        setActiveTab={handleTabChange}
        showCommunity={true}
        isActiveStudent={isActiveStudent}
        onMoreClick={() => setIsMoreMenuOpen(true)}
      />
      <MoreMenu 
        isOpen={isMoreMenuOpen} 
        onClose={() => setIsMoreMenuOpen(false)} 
      />
    </>
  )

  return (
    <div className="student-page-wrapper">
      <div className="student-page-content">
        {children}
      </div>
      {typeof document !== 'undefined' && document.body && createPortal(bottomNav, document.body)}

      {/* Profile modal (opened from More menu when not on dashboard) */}
      {showProfileModal && (
        <div
          className="profile-modal-overlay"
          onClick={() => setShowProfileModal(false)}
          aria-modal="true"
        >
          <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="profile-modal-header">
              <h2>Profile</h2>
              <button
                className="profile-modal-close"
                onClick={() => setShowProfileModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="profile-modal-body">
              {profileModalLoading ? (
                <p style={{ padding: '1.5rem', color: '#666' }}>Loading...</p>
              ) : profileModalData ? (
                <ProfileTab
                  studentData={profileModalData}
                  onBookLesson={() => {
                    setShowProfileModal(false)
                    navigate('/dashboard')
                  }}
                  onProfileUpdate={() => {
                    setShowProfileModal(false)
                  }}
                  onClose={() => setShowProfileModal(false)}
                  isHittingPartnersOnly
                />
              ) : (
                <p style={{ padding: '1.5rem', color: '#666' }}>Could not load profile.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
