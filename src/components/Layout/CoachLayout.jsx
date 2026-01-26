import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CoachTabs from '../Dashboard/CoachTabs'
import MoreMenu from './MoreMenu'
import './CoachLayout.css'

export default function CoachLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false)

  // Set active tab based on current route
  useEffect(() => {
    const path = location.pathname
    let newTab = 'dashboard'
    
    if (path.startsWith('/coach/students') || path.startsWith('/coach/lessons') || path.startsWith('/coach/calendar') || path.startsWith('/coach/emails')) {
      newTab = 'manage'
    } else if (path.startsWith('/coach/finances') || path.startsWith('/coach/expenses')) {
      newTab = 'finances'
    } else if (path.startsWith('/coach/testimonials') || path.startsWith('/coach/referrals')) {
      newTab = 'community'
    } else if (path === '/coach' || path.startsWith('/coach/dashboard')) {
      newTab = 'dashboard'
    }
    
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tab navigation when user clicks a tab
  const handleTabChange = (tabId) => {
    if (tabId === 'manage') {
      navigate('/coach/students') // Default to students page
    } else if (tabId === 'finances') {
      navigate('/coach/finances') // Navigate to finances page
    } else if (tabId === 'community') {
      navigate('/coach/testimonials') // Default to testimonials
    } else if (tabId === 'dashboard') {
      navigate('/coach')
    }
  }

  return (
    <>
      <div className="coach-page-content">
        {children}
      </div>
      <CoachTabs 
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onMoreClick={() => setIsMoreMenuOpen(true)}
      />
      <MoreMenu 
        isOpen={isMoreMenuOpen}
        onClose={() => setIsMoreMenuOpen(false)}
        isCoach={true}
      />
    </>
  )
}
