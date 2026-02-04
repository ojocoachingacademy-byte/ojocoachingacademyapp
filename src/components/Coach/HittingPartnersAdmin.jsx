import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import './HittingPartnersAdmin.css'

export default function HittingPartnersAdmin() {
  const [metrics, setMetrics] = useState(null)
  const [players, setPlayers] = useState([])
  const [interactions, setInteractions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all', 'active', 'inactive'
  const [profileFilter, setProfileFilter] = useState('all') // 'all', 'complete', 'incomplete'

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch metrics
      const { data: metricsData } = await supabase
        .from('hitting_partner_metrics')
        .select('*')
        .single()

      setMetrics(metricsData)

      // Fetch all players with profile info
      const { data: playersData } = await supabase
        .from('hitting_partners')
        .select(`
          id,
          is_active,
          availability_days,
          availability_times,
          location_area,
          created_at,
          profiles (
            full_name,
            ntrp_level,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      // Add last interaction date to each player
      const playersWithActivity = await Promise.all(
        (playersData || []).map(async (player) => {
          // Fetch last interaction without .single() to avoid 406 on empty results
          const { data: lastInteractionData } = await supabase
            .from('hitting_partner_interactions')
            .select('created_at')
            .or(`requester_id.eq.${player.id},partner_id.eq.${player.id}`)
            .order('created_at', { ascending: false })
            .limit(1)

          // Extract first result if exists
          const lastInteraction = lastInteractionData && lastInteractionData.length > 0
            ? lastInteractionData[0]
            : null

          return {
            ...player,
            last_active: lastInteraction?.created_at || null
          }
        })
      )

      setPlayers(playersWithActivity)

      // Fetch recent interactions
      const { data: interactionsData } = await supabase
        .from('hitting_partner_interactions')
        .select(`
          id,
          created_at,
          interaction_type,
          requester:profiles!hitting_partner_interactions_requester_id_fkey(full_name),
          partner:profiles!hitting_partner_interactions_partner_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      setInteractions(interactionsData || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setLoading(false)
    }
  }

  const getProfileStatus = (player) => {
    if (player.availability_days && player.availability_times) {
      return { label: '✓ Complete', color: '#16a34a' }
    }
    return { label: '⚠️ Incomplete', color: '#ea580c' }
  }

  const getLastActiveText = (lastActive) => {
    if (!lastActive) return 'Never'

    const daysSince = Math.floor((new Date() - new Date(lastActive)) / (1000 * 60 * 60 * 24))
    if (daysSince === 0) return 'Today'
    if (daysSince === 1) return 'Yesterday'
    if (daysSince < 7) return `${daysSince} days ago`
    if (daysSince < 30) return `${Math.floor(daysSince / 7)} weeks ago`
    return `${Math.floor(daysSince / 30)} months ago`
  }

  const incompleteProfiles = players.filter(p => !p.availability_days || !p.availability_times)
  const inactivePlayers = players.filter(p => {
    if (!p.last_active) return true
    const daysSince = Math.floor((new Date() - new Date(p.last_active)) / (1000 * 60 * 60 * 24))
    return daysSince > 30
  })

  const filteredPlayers = players.filter(player => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const name = player.profiles?.full_name?.toLowerCase() || ''
      const level = player.profiles?.ntrp_level?.toLowerCase() || ''
      const location = player.location_area?.toLowerCase() || ''

      if (!name.includes(query) && !level.includes(query) && !location.includes(query)) {
        return false
      }
    }

    // Status filter
    if (statusFilter === 'active' && !player.is_active) return false
    if (statusFilter === 'inactive' && player.is_active) return false

    // Profile filter
    const isComplete = player.availability_days && player.availability_times
    if (profileFilter === 'complete' && !isComplete) return false
    if (profileFilter === 'incomplete' && isComplete) return false

    return true
  })

  const markAsPlayed = async (interactionId, requesterName, partnerName) => {
    try {
      await supabase
        .from('hitting_partner_interactions')
        .update({ interaction_type: 'confirmed_play' })
        .eq('id', interactionId)

      alert(`Marked ${requesterName} and ${partnerName} as having played together!`)
      fetchDashboardData() // Refresh
    } catch (error) {
      console.error('Error marking as played:', error)
      alert('Error updating: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Hitting Partner Network Dashboard</h1>
      </div>

      {/* Metrics Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{metrics?.active_players || 0}</div>
          <div className="metric-label">Active Players</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics?.contacts_last_30_days || 0}</div>
          <div className="metric-label">Contacts (30 Days)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics?.active_requesters_30_days || 0}</div>
          <div className="metric-label">Active Users</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{metrics?.contacts_last_7_days || 0}</div>
          <div className="metric-label">Contacts (7 Days)</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">
            {interactions.filter(i => i.interaction_type === 'confirmed_play').length}
          </div>
          <div className="metric-label">Confirmed Plays</div>
        </div>
      </div>

      {/* Needs Attention */}
      {(incompleteProfiles.length > 0 || inactivePlayers.length > 0) && (
        <div className="attention-section">
          <h2>⚠️ Needs Attention</h2>
          <div className="attention-items">
            {incompleteProfiles.length > 0 && (
              <div className="attention-item">
                <strong>{incompleteProfiles.length} players</strong> haven't completed their profile
              </div>
            )}
            {inactivePlayers.length > 0 && (
              <div className="attention-item">
                <strong>{inactivePlayers.length} players</strong> inactive for 30+ days
              </div>
            )}
          </div>
        </div>
      )}

      {/* Players Section with Filters */}
      <div className="section">
        <div className="section-header">
          <h2>👥 All Players ({filteredPlayers.length})</h2>

          <div className="filters-row">
            {/* Search */}
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, level, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Status Filter */}
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {/* Profile Filter */}
            <select
              className="filter-select"
              value={profileFilter}
              onChange={(e) => setProfileFilter(e.target.value)}
            >
              <option value="all">All Profiles</option>
              <option value="complete">Complete Only</option>
              <option value="incomplete">Incomplete Only</option>
            </select>
          </div>
        </div>

        <div className="players-grid">
          {filteredPlayers.length === 0 ? (
            <div className="empty-state">No players match your filters</div>
          ) : (
            filteredPlayers.map(player => {
              const profileStatus = getProfileStatus(player)
              return (
                <div key={player.id} className="player-card">
                  <div className="player-card-header">
                    <div className="player-avatar">
                      {player.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="player-info">
                      <h3>{player.profiles?.full_name || 'Unknown'}</h3>
                      <span className="player-level">{player.profiles?.ntrp_level || 'N/A'}</span>
                    </div>
                    <span className={`status-badge ${player.is_active ? 'active' : 'inactive'}`}>
                      {player.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="player-card-body">
                    <div className="player-detail">
                      <span className="detail-label">Profile:</span>
                      <span style={{ color: profileStatus.color, fontWeight: 600 }}>
                        {profileStatus.label}
                      </span>
                    </div>

                    {player.location_area && (
                      <div className="player-detail">
                        <span className="detail-label">📍 Location:</span>
                        <span>{player.location_area}</span>
                      </div>
                    )}

                    {player.availability_days && player.availability_days.length > 0 && (
                      <div className="player-detail">
                        <span className="detail-label">📅 Days:</span>
                        <span>{player.availability_days.join(', ')}</span>
                      </div>
                    )}

                    <div className="player-detail">
                      <span className="detail-label">Last Active:</span>
                      <span>{getLastActiveText(player.last_active)}</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Recent Interactions */}
      <div className="section">
        <h2>🔗 Recent Interactions</h2>
        <div className="interactions-list">
          {interactions.length === 0 ? (
            <p>No interactions yet</p>
          ) : (
            interactions.map(interaction => (
              <div key={interaction.id} className="interaction-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{interaction.requester?.full_name || 'Someone'}</strong>
                    {' contacted '}
                    <strong>{interaction.partner?.full_name || 'someone'}</strong>
                    <span className="interaction-time">
                      {' • '}{getLastActiveText(interaction.created_at)}
                    </span>
                    {interaction.interaction_type === 'confirmed_play' && (
                      <span style={{
                        marginLeft: '8px',
                        background: '#dcfce7',
                        color: '#16a34a',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        ✓ Played
                      </span>
                    )}
                  </div>
                  {interaction.interaction_type !== 'confirmed_play' && (
                    <button
                      className="btn btn-sm"
                      onClick={() => markAsPlayed(
                        interaction.id,
                        interaction.requester?.full_name,
                        interaction.partner?.full_name
                      )}
                      style={{
                        fontSize: '12px',
                        padding: '4px 12px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      Mark as Played
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
