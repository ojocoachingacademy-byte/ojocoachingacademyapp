import { useState, useEffect } from 'react'
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
    if (path === '/dashboard' || path.startsWith('/dashboard')) return 'home'
    if (path === '/lessons' || path.startsWith('/lessons')) return 'lessons'
    if (path === '/hitting-partners' || path.startsWith('/hitting-partners')) return 'community'
    if (path === '/messages' || path.startsWith('/messages')) return 'community'
    if (path === '/tennis-resources' || path.startsWith('/tennis-resources')) return 'community'
    if (path === '/settings' || path.startsWith('/settings')) return 'home'
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
        navigate('/dashboard')
        break
      case 'progress':
        navigate('/dashboard')
        // If on dashboard, switch to progress tab
        // This will be handled by StudentDashboard's internal tab state
        break
      case 'lessons':
        navigate('/lessons')
        break
      case 'community':
        // Default to hitting partners for community
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

  return (
    <div className="student-page-wrapper">
      <div className="student-page-content">
        {children}
      </div>
      <StudentTabs 
        activeTab={isMoreMenuOpen ? 'more' : activeTab} 
        setActiveTab={handleTabChange}
        showCommunity={true}
        onMoreClick={() => {
          setIsMoreMenuOpen(true)
        }}
      />
      <MoreMenu 
        isOpen={isMoreMenuOpen} 
        onClose={() => setIsMoreMenuOpen(false)} 
      />
    </div>
  )
}
