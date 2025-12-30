import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { LogOut, LayoutDashboard, Calendar, Users } from 'lucide-react'
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
            <span className="logo-text">OJO</span>
            <span className="logo-tagline">Coaching Academy</span>
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
              {isCoach && (
                <>
                  <button 
                    className={`nav-link ${isActive('/coach/students') || location.pathname.startsWith('/coach/students/') ? 'active' : ''}`}
                    onClick={() => navigate('/coach/students')}
                  >
                    <Users size={18} />
                    Students
                  </button>
                  <button 
                    className={`nav-link ${isActive('/coach/lessons') ? 'active' : ''}`}
                    onClick={() => navigate('/coach/lessons')}
                  >
                    <Calendar size={18} />
                    Lessons
                  </button>
                </>
              )}
              <button 
                className={`nav-link ${isActive('/hitting-partners') ? 'active' : ''}`}
                onClick={() => navigate('/hitting-partners')}
              >
                <Users size={18} />
                Hitting Partners
              </button>
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

