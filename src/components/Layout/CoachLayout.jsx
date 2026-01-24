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
    
    if (path.startsWith('/coach/students')) {
      newTab = 'students'
    } else if (path.startsWith('/coach/lessons')) {
      newTab = 'lessons'
    } else if (path.startsWith('/coach/calendar')) {
      newTab = 'calendar'
    } else if (path === '/coach') {
      newTab = 'dashboard'
    }
    
    if (newTab !== activeTab) {
      setActiveTab(newTab)
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle tab navigation when user clicks a tab
  const handleTabChange = (tabId) => {
    if (tabId === 'students') {
      navigate('/coach/students')
    } else if (tabId === 'lessons') {
      navigate('/coach/lessons')
    } else if (tabId === 'calendar') {
      navigate('/coach/calendar')
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
