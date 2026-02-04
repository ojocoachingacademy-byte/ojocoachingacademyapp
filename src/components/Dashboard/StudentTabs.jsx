import React from 'react'
import { Home, TrendingUp, Calendar, Users, MoreHorizontal } from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics'
import './StudentTabs.css'

const StudentTabs = ({ activeTab, setActiveTab, showCommunity = false, onMoreClick }) => {
  const baseTabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'progress', label: 'Progress', icon: TrendingUp },
    { id: 'lessons', label: 'Lessons', icon: Calendar }
  ]

  const hittingPartnersTab = { id: 'hitting-partners', label: 'Hitting Partners', icon: Users }
  const moreTab = { id: 'more', label: 'More', icon: MoreHorizontal }
  
  // Always show More tab - onMoreClick is optional
  const tabs = showCommunity 
    ? [...baseTabs, hittingPartnersTab, moreTab]
    : [...baseTabs, moreTab]

  const handleTabChange = (tabId, event) => {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }
    
    if (tabId === 'more') {
      if (onMoreClick) {
        onMoreClick()
      }
      return
    }
    
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
            onClick={(e) => handleTabChange(tab.id, e)}
            aria-label={tab.label}
            type="button"
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


