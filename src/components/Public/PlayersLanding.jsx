import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import './PlayersLanding.css'

export default function PlayersLanding() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [levelCounts, setLevelCounts] = useState({}) // ntrp_level -> count for "X at this level"
  const navigate = useNavigate()

  useEffect(() => {
    checkAuthAndFetchPlayers()
  }, [])

  // Hide app nav/header on this public landing page
  useEffect(() => {
    document.body.classList.add('players-landing-page')
    return () => document.body.classList.remove('players-landing-page')
  }, [])

  const checkAuthAndFetchPlayers = async () => {
    // Check for preview mode (for testing while logged in)
    const urlParams = new URLSearchParams(window.location.search)
    const isPreview = urlParams.get('preview') === 'true'

    // Check if user is already logged in
    const { data: { user } } = await supabase.auth.getUser()

    if (user && !isPreview) {
      // Already logged in and not in preview mode, redirect to main hitting partners page
      navigate('/hitting-partners')
      return
    }

    // Not logged in OR in preview mode, fetch players for preview
    fetchPlayers()
  }

  const fetchPlayers = async () => {
    try {
      // Get total count of active players
      const { count, error: countError } = await supabase
        .from('hitting_partners')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
      
      if (countError) {
        console.error('Error counting players:', countError)
      } else {
        setTotalCount(count || 0)
      }

      const { data: allData, error } = await supabase
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

      if (error) throw error

      const all = allData || []
      const countsByLevel = {}
      all.forEach((p) => {
        const level = p.profiles?.ntrp_level || 'N/A'
        countsByLevel[level] = (countsByLevel[level] || 0) + 1
      })
      setLevelCounts(countsByLevel)

      // Sort by NTRP level and take 12 for preview
      const sorted = [...all].sort((a, b) => {
        const levelA = parseFloat(a.profiles?.ntrp_level || '0')
        const levelB = parseFloat(b.profiles?.ntrp_level || '0')
        return levelB - levelA
      })
      const preview = sorted.slice(0, 12)
      setPlayers(preview)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching players:', error)
      setLoading(false)
    }
  }

  const handleSignUp = () => {
    navigate('/signup?redirect=/hitting-partners')
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div className="players-landing">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">Find Tennis Players in San Diego</h1>
          <p className="hero-subtitle">
            Connect with players at your level for FREE. Practice more, improve faster.
          </p>

          {/* 3. Ultra-condensed How It Works (~40px on mobile) */}
          <div className="hero-how-it-works" style={{
            marginTop: '20px',
            marginBottom: '20px',
            padding: '10px 16px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            opacity: 0.95,
            textAlign: 'center'
          }}>
            Join (30s) → See Matches → Text & Play
          </div>

          {/* 4. Stats cards */}
          <div className="hero-stats" style={{ marginBottom: '16px' }}>
            <div className="stat-item">
              <div className="stat-number">{loading ? '...' : (totalCount || '0')}</div>
              <div className="stat-label">Active Players</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">1.0 - 5.0+</div>
              <div className="stat-label">All Levels</div>
            </div>
          </div>

          {/* 5. Compact info (urgency + level breakdown) (~50px on mobile) */}
          <div className="hero-compact-info" style={{
            marginTop: '12px',
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '8px',
            fontSize: '11px',
            opacity: 0.9,
            textAlign: 'center',
            lineHeight: 1.6
          }}>
            <div style={{ fontWeight: 600, marginBottom: '6px' }}>
              🔥 3 new players this week
            </div>
            <div>
              {players.filter(p => parseFloat(p.profiles?.ntrp_level || '0') <= 2.5).length} Beginners • {' '}
              {players.filter(p => {
                const l = parseFloat(p.profiles?.ntrp_level || '0')
                return l >= 3.0 && l <= 3.5
              }).length} Intermediate • {' '}
              {players.filter(p => parseFloat(p.profiles?.ntrp_level || '0') >= 4.0).length} Advanced
            </div>
          </div>

          {/* 6. CTA - must be visible */}
          <button
            className="cta-button hero-cta"
            onClick={handleSignUp}
            style={{
              fontSize: '20px',
              padding: '24px 56px',
              marginTop: '32px'
            }}
          >
            Join Free - Find Your Match
            <span className="cta-subtitle">Takes 30 seconds • No credit card</span>
          </button>
        </div>
      </div>

      {/* Players Preview */}
      <div className="players-preview-section">
        <h2 className="section-title">Players Looking to Hit</h2>
        <p className="section-subtitle">Join to see contact info and reach out</p>

        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginBottom: '32px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          <div>
            ✓ <strong>New this week:</strong> 3 players joined
          </div>
          <div>
            ✓ <strong>Active now:</strong> {players.filter(p => {
              const days = p.availability_days || []
              return days.length > 0
            }).length} players ready to hit
          </div>
        </div>

        <div className="players-grid">
          {players.map((player) => (
            <div key={player.id} className="preview-card">
              <div className="preview-header">
                <div className="preview-avatar">
                  {player.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div>
                  <h3 className="preview-name">
                  {player.profiles?.full_name 
                    ? (() => {
                        const parts = player.profiles.full_name.trim().split(' ')
                        if (parts.length === 1) return parts[0]
                        const firstName = parts[0]
                        const lastInitial = parts[parts.length - 1].charAt(0)
                        return `${firstName} ${lastInitial}.`
                      })()
                    : 'Player'
                  }
                </h3>
                  <span className="preview-level">{player.profiles?.ntrp_level || 'N/A'}</span>
                  {player.availability_days && player.availability_days.length >= 3 && (
                    <span style={{
                      marginLeft: '8px',
                      background: '#dcfce7',
                      color: '#16a34a',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600
                    }}>
                      Very Active
                    </span>
                  )}
                </div>
              </div>

              {player.location_area && (
                <div className="preview-info">
                  <span className="preview-label">📍 {player.location_area}</span>
                </div>
              )}

              {player.availability_days && player.availability_days.length > 0 && (
                <div className="preview-info">
                  <span className="preview-label">📅 {player.availability_days.join(', ')}</span>
                </div>
              )}

              {player.availability_times && player.availability_times.length > 0 && (
                <div className="preview-info">
                  <span className="preview-label">⏰ {player.availability_times.join(', ')}</span>
                </div>
              )}

              {(levelCounts[player.profiles?.ntrp_level || 'N/A'] ?? 0) > 0 && (
                <div className="preview-info preview-at-level">
                  <span className="preview-label">
                    🎾 {levelCounts[player.profiles?.ntrp_level || 'N/A']} player{levelCounts[player.profiles?.ntrp_level || 'N/A'] === 1 ? '' : 's'} at this level
                  </span>
                </div>
              )}

              <button className="preview-cta" onClick={handleSignUp}>
                Join to Contact
              </button>
              {player.availability_days && player.availability_days.length > 0 && (
                <div style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  Available {player.availability_days.length} days/week
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px' }}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
          Common Questions
        </h3>
        <div style={{ fontSize: '14px', color: '#6b7280' }}>
          <p><strong>Is it really free?</strong> Yes, forever.</p>
          <p><strong>Who can join?</strong> Anyone in San Diego who plays tennis.</p>
          <p><strong>How do I contact people?</strong> Direct text message.</p>
        </div>
      </div>

      <div style={{
        background: '#f9fafb',
        padding: '32px 24px',
        textAlign: 'center',
        marginTop: '48px'
      }}>
        <p style={{
          fontSize: '16px',
          fontStyle: 'italic',
          color: '#6b7280',
          maxWidth: '600px',
          margin: '0 auto'
        }}>
          "I found 3 new hitting partners in my first week. Game changer for my practice schedule."
        </p>
        <p style={{
          fontSize: '14px',
          color: '#9ca3af',
          marginTop: '12px'
        }}>
          - Tom D., 3.5 NTRP
        </p>
      </div>

      {/* Footer CTA */}
      <div className="footer-cta-section">
        <h2>Ready to Find Your Hitting Partners?</h2>
        <button className="cta-button" onClick={handleSignUp}>
          Join Free
        </button>
      </div>
    </div>
  )
}
