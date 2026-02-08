import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'

/**
 * Handles "/" by redirecting:
 * - No user → /login
 * - Active student (is_active) → /dashboard
 * - Network-only (inactive) → /hitting-partners
 */
export default function DefaultStudentRedirect() {
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function redirect() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user?.id) {
        if (!cancelled) {
          setLoading(false)
          navigate('/login', { replace: true })
        }
        return
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_type')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (profile?.account_type === 'coach') {
          navigate('/coach', { replace: true })
          setLoading(false)
          return
        }

        const { data: student } = await supabase
          .from('students')
          .select('is_active')
          .eq('id', user.id)
          .single()

        if (cancelled) return

        if (student?.is_active) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/hitting-partners', { replace: true })
        }
      } catch (err) {
        console.error('DefaultStudentRedirect:', err)
        if (!cancelled) {
          navigate('/dashboard', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    redirect()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        Loading...
      </div>
    )
  }

  return null
}
