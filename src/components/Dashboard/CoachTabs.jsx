import React from 'react'
import { LayoutDashboard, Users, Calendar, CalendarDays, MoreHorizontal } from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics'
import './CoachTabs.css'

const CoachTabs = ({ activeTab, setActiveTab, onMoreClick }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'lessons', label: 'Lessons', icon: Calendar },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'more', label: 'More', icon: MoreHorizontal }
  ]

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
    <nav className="coach-tabs">
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

export default CoachTabs
