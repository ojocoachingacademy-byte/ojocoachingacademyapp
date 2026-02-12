import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { AlertCircle, X } from 'lucide-react'
import './ImpersonationBanner.css'

export default function ImpersonationBanner() {
  const [isImpersonating, setIsImpersonating] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    checkImpersonationStatus()
  }, [])

  const checkImpersonationStatus = async () => {
    // Check if we have a stored coach session
    const coachSessionStr = localStorage.getItem('impersonation_coach_session')

    if (coachSessionStr) {
      setIsImpersonating(true)

      // Get current student info (we're viewing as them)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single()

        setStudentName(profile?.full_name || profile?.email || 'Student')
      }
    }
  }

  const handleExitImpersonation = async () => {
    setExiting(true)

    try {
      // Get stored coach session
      const coachSessionStr = localStorage.getItem('impersonation_coach_session')

      if (!coachSessionStr) {
        alert('Coach session not found. Please login normally.')
        await supabase.auth.signOut()
        window.location.href = '/login'
        return
      }

      const coachSession = JSON.parse(coachSessionStr)

      // Sign out student session
      await supabase.auth.signOut()

      // Restore coach session
      await supabase.auth.setSession({
        access_token: coachSession.access_token,
        refresh_token: coachSession.refresh_token
      })

      // Clear impersonation flag
      localStorage.removeItem('impersonation_coach_session')

      // Redirect to coach dashboard
      window.location.href = '/coach/students'
    } catch (error) {
      console.error('Error exiting impersonation:', error)
      alert('Failed to exit impersonation. Please login normally.')
      await supabase.auth.signOut()
      window.location.href = '/login'
    }
  }

  if (!isImpersonating) return null

  return (
    <div className="impersonation-banner">
      <div className="impersonation-content">
        <AlertCircle size={20} />
        <span>
          <strong>Impersonating:</strong> {studentName}
        </span>
      </div>
      <button
        onClick={handleExitImpersonation}
        disabled={exiting}
        className="exit-impersonation-btn"
      >
        {exiting ? 'Exiting...' : 'Exit Impersonation'}
        {!exiting && <X size={16} />}
      </button>
    </div>
  )
}
