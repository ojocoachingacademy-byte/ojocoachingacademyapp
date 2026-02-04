import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function HittingPartnerSuggestion({ userId }) {
  const [topMatch, setTopMatch] = useState(null)
  const [hasProfile, setHasProfile] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchTopMatch()
  }, [userId])

  const fetchTopMatch = async () => {
    try {
      // Check if user has hitting partner profile
      const { data: userProfile } = await supabase
        .from('hitting_partners')
        .select('availability_days, availability_times')
        .eq('id', userId)
        .single()

      if (!userProfile?.availability_days) {
        setHasProfile(false)
        setLoading(false)
        return
      }

      setHasProfile(true)

      // Fetch top match (simplified - just get first different player)
      const { data: partners } = await supabase
        .from('hitting_partners')
        .select(`
          id,
          availability_days,
          availability_times,
          location_area,
          profiles (
            full_name,
            ntrp_level
          )
        `)
        .eq('is_active', true)
        .neq('id', userId)
        .limit(1)

      if (partners && partners.length > 0) {
        setTopMatch(partners[0])
      }

      setLoading(false)
    } catch (error) {
      console.error('Error fetching top match:', error)
      setLoading(false)
    }
  }

  if (loading) return null

  if (!hasProfile) {
    return (
      <div className="card">
        <h3>🎾 Find Hitting Partners</h3>
        <p>Set up your profile to connect with other players</p>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/hitting-partners')}
        >
          Get Started
        </button>
      </div>
    )
  }

  if (!topMatch) return null

  return (
    <div className="card">
      <h3>🎾 Suggested Hitting Partner</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          fontWeight: '600'
        }}>
          {topMatch.profiles?.full_name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <strong>{topMatch.profiles?.full_name}</strong>
          <span style={{ marginLeft: '8px', fontSize: '14px' }}>
            {topMatch.profiles?.ntrp_level}
          </span>
          {topMatch.availability_days && (
            <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
              Available: {topMatch.availability_days.join(', ')}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
        <button 
          className="btn btn-primary"
          onClick={() => navigate('/hitting-partners')}
        >
          See All Players
        </button>
      </div>
    </div>
  )
}
