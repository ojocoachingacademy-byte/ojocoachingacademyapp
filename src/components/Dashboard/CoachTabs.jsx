import React, { useState } from 'react'
import { LayoutDashboard, Users, DollarSign, MessageCircle, MoreHorizontal, ChevronUp } from 'lucide-react'
import { trackEvent, EVENTS } from '../../utils/analytics'
import CoachTabsDropdown from './CoachTabsDropdown'
import './CoachTabs.css'

const CoachTabs = ({ activeTab, setActiveTab, onMoreClick }) => {
  const [openDropdown, setOpenDropdown] = useState(null)

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, hasDropdown: false },
    { id: 'manage', label: 'Manage', icon: Users, hasDropdown: true },
    { id: 'finances', label: 'Finances', icon: DollarSign, hasDropdown: true },
    { id: 'community', label: 'Community', icon: MessageCircle, hasDropdown: true },
    { id: 'more', label: 'More', icon: MoreHorizontal, hasDropdown: false }
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
      setOpenDropdown(null)
      return
    }

    const tab = tabs.find(t => t.id === tabId)
    
    // If tab has dropdown, toggle it
    if (tab?.hasDropdown) {
      if (openDropdown === tabId) {
        // Close dropdown if already open
        setOpenDropdown(null)
      } else {
        // Open dropdown (Option A: show dropdown on first tap)
        setOpenDropdown(tabId)
        setActiveTab(tabId)
      }
    } else {
      // No dropdown, navigate directly
      setOpenDropdown(null)
      setActiveTab(tabId)
      trackEvent(EVENTS.TAB_CHANGE, { from: activeTab, to: tabId })
    }
  }

  const handleCloseDropdown = () => {
    setOpenDropdown(null)
  }

  return (
    <>
      <nav className="coach-tabs">
        {tabs.map(tab => {
          const IconComponent = tab.icon
          const isDropdownOpen = openDropdown === tab.id
          const isActive = activeTab === tab.id
          
          return (
            <button
              key={tab.id}
              className={`tab-button ${isActive ? 'active' : ''} ${isDropdownOpen ? 'dropdown-open' : ''}`}
              onClick={(e) => handleTabChange(tab.id, e)}
              aria-label={tab.label}
              aria-expanded={isDropdownOpen}
              type="button"
            >
              <IconComponent size={20} className="tab-icon" />
              <span className="tab-label">{tab.label}</span>
              {tab.hasDropdown && (
                <ChevronUp 
                  size={14} 
                  className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`}
                />
              )}
            </button>
          )
        })}
      </nav>
      
      {/* Dropdown menus */}
      <CoachTabsDropdown
        isOpen={openDropdown === 'manage'}
        onClose={handleCloseDropdown}
        tabId="manage"
        activeTab={activeTab}
      />
      <CoachTabsDropdown
        isOpen={openDropdown === 'finances'}
        onClose={handleCloseDropdown}
        tabId="finances"
        activeTab={activeTab}
      />
      <CoachTabsDropdown
        isOpen={openDropdown === 'community'}
        onClose={handleCloseDropdown}
        tabId="community"
        activeTab={activeTab}
      />
    </>
  )
}

export default CoachTabs
