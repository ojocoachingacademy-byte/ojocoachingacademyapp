import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { LogOut, LayoutDashboard, Calendar, Users, MessageSquare, Settings, DollarSign, Receipt, UserCheck, ThumbsUp, MapPin } from 'lucide-react'
import NotificationBell from '../Notifications/NotificationBell'
import DropdownNav from './DropdownNav'
import './Header.css'

export default function Header({ user, isCoach }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <header className="app-header">
      <div className="header-container">
            <div className="header-left">
              <div className="logo-container" onClick={() => navigate(isCoach ? '/coach' : '/dashboard')}>
                <img 
                  src="/Ojo_Coaching_Academy_Logo.png" 
                  alt="OJO Coaching Academy" 
                  className="logo-image"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
                <div className="logo-text-container" style={{ display: 'none' }}>
                  <span className="logo-text">OJO</span>
                  <span className="logo-tagline">Coaching Academy</span>
                </div>
              </div>
            </div>
        
        <nav className="header-nav">
          {user && (
            <>
              <button 
                className={`nav-link ${isActive(isCoach ? '/coach' : '/dashboard') ? 'active' : ''}`}
                onClick={() => navigate(isCoach ? '/coach' : '/dashboard')}
              >
                <LayoutDashboard size={18} />
                Dashboard
              </button>

              {isCoach ? (
                <>
                  {/* Coach Management Dropdown */}
                  <DropdownNav label="Manage" icon={Users}>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/students') || location.pathname.startsWith('/coach/students/') ? 'active' : ''}`}
                      onClick={() => {
                        navigate('/coach/students')
                      }}
                    >
                      <Users size={16} className="icon" />
                      Students
                    </button>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/lessons') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/lessons')}
                    >
                      <Calendar size={16} className="icon" />
                      Lessons
                    </button>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/calendar') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/calendar')}
                    >
                      <Calendar size={16} className="icon" />
                      Calendar
                    </button>
                  </DropdownNav>

                  {/* Coach Finances Dropdown */}
                  <DropdownNav label="Finances" icon={DollarSign}>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/finances') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/finances')}
                    >
                      <DollarSign size={16} className="icon" />
                      Revenue
                    </button>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/expenses') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/expenses')}
                    >
                      <Receipt size={16} className="icon" />
                      Expenses
                    </button>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/referrals') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/referrals')}
                    >
                      <UserCheck size={16} className="icon" />
                      Referrals
                    </button>
                  </DropdownNav>

                  {/* Coach Marketing Dropdown */}
                  <DropdownNav label="Marketing" icon={ThumbsUp}>
                    <button 
                      className={`dropdown-menu-item ${isActive('/coach/testimonials') ? 'active' : ''}`}
                      onClick={() => navigate('/coach/testimonials')}
                    >
                      <ThumbsUp size={16} className="icon" />
                      Testimonials
                    </button>
                  </DropdownNav>
                </>
              ) : (
                <button 
                  className={`nav-link ${isActive('/lessons') ? 'active' : ''}`}
                  onClick={() => navigate('/lessons')}
                >
                  <Calendar size={18} />
                  Lessons
                </button>
              )}

              {/* Community Dropdown */}
              <DropdownNav label="Community" icon={Users}>
                <button 
                  className={`dropdown-menu-item ${isActive('/hitting-partners') ? 'active' : ''}`}
                  onClick={() => navigate('/hitting-partners')}
                >
                  <Users size={16} className="icon" />
                  Hitting Partners
                </button>
                <button 
                  className={`dropdown-menu-item ${isActive('/tennis-resources') ? 'active' : ''}`}
                  onClick={() => navigate('/tennis-resources')}
                >
                  <MapPin size={16} className="icon" />
                  Tennis Resources
                </button>
                <button 
                  className={`dropdown-menu-item ${isActive('/messages') ? 'active' : ''}`}
                  onClick={() => navigate('/messages')}
                >
                  <MessageSquare size={16} className="icon" />
                  Messages
                </button>
              </DropdownNav>

              {!isCoach && (
                <button 
                  className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                  onClick={() => navigate('/settings')}
                >
                  <Settings size={18} />
                  Settings
                </button>
              )}

              <NotificationBell />
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

