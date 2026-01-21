import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { Bell, User, LogOut, X } from 'lucide-react'
import './MoreMenu.css'

export default function MoreMenu({ isOpen, onClose }) {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
      
      // Set up realtime subscription for new notifications
      const notificationsSubscription = supabase
        .channel('notifications-changes')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          () => {
            fetchNotifications()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(notificationsSubscription)
      }
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setNotifications(data || [])
      setUnreadCount(data?.filter(n => !n.read).length || 0)
    } catch (error) {
      console.error('Error fetching notifications:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const handleProfileClick = () => {
    onClose()
    // Trigger profile modal in StudentDashboard
    window.dispatchEvent(new CustomEvent('openProfileModal'))
  }

  const handleNotificationsClick = () => {
    onClose()
    navigate('/notifications')
  }

  if (!isOpen) {
    return null
  }

  return (
    <>
      <div className="more-menu-overlay" onClick={onClose} />
      <div className="more-menu" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <div className="more-menu-header">
          <h2 className="more-menu-title">More</h2>
          <button className="more-menu-close" onClick={onClose} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>
        
        <div className="more-menu-items">
          <button 
            className="more-menu-item"
            onClick={handleNotificationsClick}
          >
            <div className="more-menu-item-icon-wrapper">
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="more-menu-badge">{unreadCount}</span>
              )}
            </div>
            <span className="more-menu-item-label">Notifications</span>
            {unreadCount > 0 && (
              <span className="more-menu-item-count">{unreadCount} new</span>
            )}
          </button>

          <button 
            className="more-menu-item"
            onClick={handleProfileClick}
          >
            <User size={20} className="more-menu-item-icon" />
            <span className="more-menu-item-label">Profile</span>
          </button>

          <button 
            className="more-menu-item more-menu-item-logout"
            onClick={handleLogout}
          >
            <LogOut size={20} className="more-menu-item-icon" />
            <span className="more-menu-item-label">Logout</span>
          </button>
        </div>
      </div>
    </>
  )
}
