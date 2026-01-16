import React from 'react'
import { Home, TrendingUp, Calendar, Users } from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics'
import './StudentTabs.css'

const StudentTabs = ({ activeTab, setActiveTab, showCommunity = false }) => {
  const baseTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'lessons', label: 'Lessons', icon: Calendar }
  ]

  const communityTab = { id: 'community', label: 'Community', icon: Users }
  
  const tabs = showCommunity ? [...baseTabs, communityTab] : baseTabs

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    trackEvent(EVENTS.TAB_CHANGE, { from: activeTab, to: tabId })
  }

  return (
    <nav className="student-tabs">
      {tabs.map(tab => {
        const IconComponent = tab.icon
        return (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
            aria-label={tab.label}
          >
            <IconComponent size={20} className="tab-icon" />
            <span className="tab-label">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

export default StudentTabs


