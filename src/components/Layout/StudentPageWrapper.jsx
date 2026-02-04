import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import StudentTabs from '../Dashboard/StudentTabs'
import MoreMenu from './MoreMenu'
import './StudentPageWrapper.css'

/**
 * Wrapper component for student pages that need bottom navigation
 * This replaces the old Header navigation with the new bottom tabs
 */
export default function StudentPageWrapper({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

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

  // Update active tab when route changes
  useEffect(() => {
    if (!isMoreMenuOpen) {
      setActiveTab(getActiveTab(location.pathname))
    }
  }, [location.pathname, isMoreMenuOpen])

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
    </div>
  )
}
