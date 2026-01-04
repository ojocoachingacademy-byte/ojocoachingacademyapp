import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Bell, Check } from 'lucide-react'
import './NotificationList.css'

export default function NotificationList() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'unread'
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications()
    
    // Set up realtime subscription
    const notificationsSubscription = supabase
      .channel('notifications-list-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(notificationsSubscription)
    }
  }, [filter])

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (filter === 'unread') {
        query = query.eq('read', false)
      }

      const { data, error } = await query

      if (error) throw error

      setNotifications(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setLoading(false)
    }
  }

  const handleNotificationClick = async (notification) => {
    // Mark as read first if unread
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate after marking as read
    if (notification.link) {
      navigate(notification.link)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      // Update local state immediately
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ))
      
      // Refetch to ensure consistency
      setTimeout(() => {
        fetchNotifications()
      }, 100)
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Still update local state even if DB update fails
      setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ))
    }
  }

  const markAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      
      // Refetch to ensure consistency
      setTimeout(() => {
        fetchNotifications()
      }, 100)
    } catch (error) {
      console.error('Error marking all as read:', error)
      // Still update local state even if DB update fails
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    }
  }

  const formatNotificationTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffHours < 24) return `${diffHours} hours ago`
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return '💬'
      case 'lesson_reminder':
        return '📅'
      case 'feedback_posted':
        return '✅'
      case 'plan_updated':
        return '📝'
      case 'hitting_partner_request':
        return '🎾'
      case 'lesson_status_changed':
        return '🔄'
      case 'credit_added':
        return '💰'
      default:
        return '🔔'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="notification-list-page">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666', marginTop: '16px' }}>Loading notifications...</p>
      </div>
    )
  }

  return (
    <div className="notification-list-page">
      <div className="notification-list-header">
        <h1 className="page-title">Notifications</h1>
        <div className="notification-actions">
          <div className="filter-buttons">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <button className="mark-all-read-btn" onClick={markAllAsRead}>
              <Check size={16} />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
            <p>No notifications</p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
              {filter === 'unread' ? 'You have no unread notifications' : 'You\'re all caught up!'}
            </p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="notification-icon-large">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content-full">
                <div className="notification-header-item">
                  <p className="notification-title-full">{notification.title}</p>
                  {!notification.read && <div className="notification-dot-large"></div>}
                </div>
                <p className="notification-body-full">{notification.body}</p>
                <span className="notification-time-full">
                  {formatNotificationTime(notification.created_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
