import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

/**
 * Custom hook to get the current logged-in coach's ID
 * @returns {{ coachId: string|null, isCoach: boolean, loading: boolean }}
 */
export function useCurrentCoach() {
  const [coachId, setCoachId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCoach, setIsCoach] = useState(false)

  useEffect(() => {
    const fetchCoachId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, account_type')
          .eq('id', user.id)
          .single()

        if (error || !profile) {
          setLoading(false)
          return
        }

        if (profile.account_type === 'coach') {
          setIsCoach(true)
          setCoachId(profile.id)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error fetching coach ID:', error)
        setLoading(false)
      }
    }

    fetchCoachId()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchCoachId()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { coachId, isCoach, loading }
}
