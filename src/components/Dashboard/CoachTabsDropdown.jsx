import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Users, Calendar, CalendarDays, Mail, DollarSign, FileText, MessageCircle, Star, Gift } from 'lucide-react'
import './CoachTabsDropdown.css'

const CoachTabsDropdown = ({ 
  isOpen, 
  onClose, 
  tabId, 
  activeTab 
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      // Prevent body scroll when dropdown is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      window.addEventListener('keydown', handleEscape)
    }

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleItemClick = (path) => {
    navigate(path)
    onClose()
  }

  const isActive = (path) => {
    if (path === '/coach/students') {
      return location.pathname === '/coach/students' || location.pathname.startsWith('/coach/students/')
    }
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const menuItems = {
    manage: [
      { 
        label: 'Students', 
        path: '/coach/students', 
        icon: Users,
        active: isActive('/coach/students')
      },
      { 
        label: 'Lessons', 
        path: '/coach/lessons', 
        icon: Calendar,
        active: isActive('/coach/lessons')
      },
      { 
        label: 'Calendar', 
        path: '/coach/calendar', 
        icon: CalendarDays,
        active: isActive('/coach/calendar')
      },
      { 
        label: 'Emails', 
        path: '/coach/emails', 
        icon: Mail,
        active: isActive('/coach/emails')
      }
    ],
    finances: [
      { 
        label: 'Overview', 
        path: '/coach/finances', 
        icon: DollarSign,
        active: isActive('/coach/finances')
      },
      { 
        label: 'Expenses', 
        path: '/coach/expenses', 
        icon: FileText,
        active: isActive('/coach/expenses')
      }
    ],
    community: [
      { 
        label: 'Testimonials', 
        path: '/coach/testimonials', 
        icon: Star,
        active: isActive('/coach/testimonials')
      },
      { 
        label: 'Referrals', 
        path: '/coach/referrals', 
        icon: Gift,
        active: isActive('/coach/referrals')
      }
    ]
  }

  const items = menuItems[tabId] || []

  if (!isOpen || !items.length) return null

  return (
    <>
      <div className="tabs-dropdown-overlay" onClick={onClose} />
      <div 
        ref={dropdownRef}
        className={`tabs-dropdown ${isOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((item) => {
          const IconComponent = item.icon
          return (
            <button
              key={item.path}
              className={`tabs-dropdown-item ${item.active ? 'active' : ''}`}
              onClick={() => handleItemClick(item.path)}
            >
              <IconComponent size={20} className="dropdown-item-icon" />
              <span className="dropdown-item-label">{item.label}</span>
              {item.active && <span className="active-indicator">●</span>}
            </button>
          )
        })}
      </div>
    </>
  )
}

export default CoachTabsDropdown
