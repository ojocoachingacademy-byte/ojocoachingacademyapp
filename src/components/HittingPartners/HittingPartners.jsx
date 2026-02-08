import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, Users, User, Edit2, Send, X } from 'lucide-react'
import StudentPageWrapper from '../Layout/StudentPageWrapper'
import './HittingPartners.css'
import '../shared/Modal.css'

export default function HittingPartners({ isCoach = false }) {
  const [partners, setPartners] = useState([])
  const [filteredPartners, setFilteredPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState(null)
  const [userPartnerProfile, setUserPartnerProfile] = useState(null)
  
  // Search and filters
  const [searchName, setSearchName] = useState('')
  const [filterNtrp, setFilterNtrp] = useState('All')
  const [filterDays, setFilterDays] = useState([])
  const [filterTimes, setFilterTimes] = useState([])
  
  // Modals
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(false)
  
  // Form states
  const [availabilityDays, setAvailabilityDays] = useState([])
  const [availabilityTimes, setAvailabilityTimes] = useState([])
  const [preferredLocations, setPreferredLocations] = useState([])
  const [locationArea, setLocationArea] = useState('')
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const times = ['Morning', 'Afternoon', 'Evening']
  const ntrpLevelOptions = [
    { value: 'All', label: 'All' },
    { value: '1.0', label: '1.0 - Beginner' },
    { value: '1.5', label: '1.5 - Limited Experience' },
    { value: '2.0', label: '2.0 - Can Play Sets' },
    { value: '2.5', label: '2.5 - Could Play on a League Team' },
    { value: '3.0', label: '3.0 - Could Play a Tournament' },
    { value: '3.5', label: '3.5 - Experienced Player' },
    { value: '4.0', label: '4.0 - Equivalent to Junior College Level' },
    { value: '4.5', label: '4.5 - Equivalent to D3 Level' },
    { value: '5.0', label: '5.0 - Equivalent D2-D1 Level' },
    { value: '5.5+', label: '5.5+ - D1+' }
  ]

  useEffect(() => {
    fetchPartners()
    fetchUserProfile()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [partners, searchName, filterNtrp, filterDays, filterTimes])

  const fetchPartners = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('hitting_partners')
        .select(`
          *,
          profiles (
            id,
            full_name,
            ntrp_level,
            email,
            phone
          )
        `)
        .eq('is_active', true)

      if (error) throw error

      // Exclude current user — don't show your own profile as a hitting partner
      const others = (data || []).filter((p) => p.id !== user.id)

      // Sort by NTRP level (handle nulls and 5.0+)
      const sorted = others.sort((a, b) => {
        const levelAStr = a.profiles?.ntrp_level || '0'
        const levelBStr = b.profiles?.ntrp_level || '0'
        
        // Handle 5.0+ as 5.5 for sorting
        const levelA = levelAStr.includes('+') ? 5.5 : parseFloat(levelAStr) || 0
        const levelB = levelBStr.includes('+') ? 5.5 : parseFloat(levelBStr) || 0
        
        return levelB - levelA
      })

      setPartners(sorted)
      setFilteredPartners(sorted)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching partners:', error)
      setLoading(false)
    }
  }

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      setUserProfile(profileData)

      // Get hitting partner profile
      const { data: partnerData } = await supabase
        .from('hitting_partners')
        .select('*')
        .eq('id', user.id)
        .single()

      if (partnerData) {
        setUserPartnerProfile(partnerData)
        
        // Check if profile is incomplete (no availability set)
        if (!partnerData.availability_days || partnerData.availability_days.length === 0) {
          // Incomplete profile, show welcome screen
          setShowWelcomeScreen(true)
        } else {
          // Complete profile, load existing data
          setAvailabilityDays(partnerData.availability_days || [])
          setAvailabilityTimes(partnerData.availability_times || [])
          const locationsArray = Array.isArray(partnerData.preferred_locations)
            ? partnerData.preferred_locations
            : (partnerData.preferred_locations ? [partnerData.preferred_locations] : [])
          setPreferredLocations(locationsArray)
          setLocationArea(partnerData.location_area || '')
        }
      } else {
        // No record at all (shouldn't happen anymore), show setup
        setShowSetupModal(true)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  const getMatchScore = (partner) => {
    if (!userProfile || !userPartnerProfile) return 0

    let score = 0

    // 1. NTRP Level Proximity (50 points max) - 50 only when same level
    const userLevel = parseFloat(userProfile.ntrp_level || '0')
    const partnerLevel = parseFloat(partner.profiles?.ntrp_level || '0')
    const levelDiff = Math.abs(userLevel - partnerLevel)

    if (levelDiff === 0) score += 50
    else if (levelDiff <= 0.5) score += 30
    else if (levelDiff <= 1.0) score += 15
    else if (levelDiff <= 1.5) score += 5
    else score += 0

    // 2. Overlapping Days (30 points max - 10 per day)
    const userDays = userPartnerProfile.availability_days || []
    const partnerDays = partner.availability_days || []
    const commonDays = userDays.filter(day => partnerDays.includes(day))
    score += Math.min(commonDays.length * 10, 30)

    // 3. Overlapping Times (10 points max - 5 per time)
    const userTimes = userPartnerProfile.availability_times || []
    const partnerTimes = partner.availability_times || []
    const commonTimes = userTimes.filter(time => partnerTimes.includes(time))
    score += Math.min(commonTimes.length * 5, 10)

    // 4. Location Match (10 points max)
    if (userPartnerProfile.location_area &&
        partner.location_area &&
        userPartnerProfile.location_area.toLowerCase() === partner.location_area.toLowerCase()) {
      score += 10
    }

    return score
  }

  const logInteraction = async (partnerId, interactionType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from('hitting_partner_interactions')
        .insert({
          requester_id: user.id,
          partner_id: partnerId,
          interaction_type: interactionType
        })
    } catch (error) {
      console.error('Error logging interaction:', error)
    }
  }

  const handleContact = (partner) => {
    // Log the interaction
    logInteraction(partner.id, 'click_contact')
    
    const phone = partner.profiles?.phone
    if (!phone) {
      alert('Phone number not available. Ask Coach Tobi for an introduction.')
      return
    }
    
    const message = `Hi ${partner.profiles?.full_name}, I'm ${userProfile?.full_name || 'a fellow player'} from Ojo Coaching Academy. I saw your profile in the hitting partner directory and would love to hit sometime! Are you available this week?`
    window.open(`sms:${phone}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? '&' : '?'}body=${encodeURIComponent(message)}`, '_self')
  }

  const applyFilters = () => {
    let filtered = [...partners]

    // Search by name
    if (searchName) {
      filtered = filtered.filter(p => 
        p.profiles?.full_name?.toLowerCase().includes(searchName.toLowerCase())
      )
    }

    // Filter by NTRP
    if (filterNtrp !== 'All') {
      if (filterNtrp === '5.5+') {
        filtered = filtered.filter(p => ['5.5+', '5.0+', '5.5', '6.0+'].includes(p.profiles?.ntrp_level))
      } else {
        filtered = filtered.filter(p => p.profiles?.ntrp_level === filterNtrp)
      }
    }

    // Filter by days
    if (filterDays.length > 0) {
      filtered = filtered.filter(p => {
        const partnerDays = p.availability_days || []
        return filterDays.some(day => partnerDays.includes(day))
      })
    }

    // Filter by times
    if (filterTimes.length > 0) {
      filtered = filtered.filter(p => {
        const partnerTimes = p.availability_times || []
        return filterTimes.some(time => partnerTimes.includes(time))
      })
    }

    // Sort: (1) top matches first, (2) same NTRP, (3) everyone else by proximity (match score)
    const userLevel = userProfile ? parseFloat(String(userProfile.ntrp_level || '0').replace(/\+$/, '')) || 0 : 0
    const getTier = (partner) => {
      const score = getMatchScore(partner)
      const raw = partner.profiles?.ntrp_level || '0'
      const partnerLevel = parseFloat(String(raw).replace(/\+$/, '')) || 0
      const levelDiff = Math.abs(userLevel - partnerLevel)
      const sameNtrp = levelDiff === 0
      if (score >= 70) return 0 // top matches
      if (sameNtrp) return 1 // same NTRP, not top match
      return 2 // everyone else
    }
    filtered.sort((a, b) => {
      const tierA = getTier(a)
      const tierB = getTier(b)
      if (tierA !== tierB) return tierA - tierB
      return getMatchScore(b) - getMatchScore(a)
    })

    setFilteredPartners(filtered)
  }

  const handleDayToggle = (day) => {
    setFilterDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleTimeToggle = (time) => {
    setFilterTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Validate required fields
      if (availabilityDays.length === 0) {
        alert('Please select at least one availability day')
        return
      }

      if (availabilityTimes.length === 0) {
        alert('Please select at least one availability time')
        return
      }

      const locationsArray = preferredLocations.length > 0 ? preferredLocations : null

      const partnerData = {
        id: user.id,
        availability_days: availabilityDays.length > 0 ? availabilityDays : null,
        availability_times: availabilityTimes.length > 0 ? availabilityTimes : null,
        preferred_locations: locationsArray,
        location_area: locationArea.trim() || null,
        is_active: true,  // Always active after setup
        contact_preference: 'in_app'  // Always in_app (we use SMS regardless)
      }

      const { error } = await supabase
        .from('hitting_partners')
        .upsert(partnerData, { onConflict: 'id' })

      if (error) {
        console.error('Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        })
        throw new Error(error.message)
      }

      setShowSetupModal(false)
      setShowProfileModal(false)
      fetchPartners()
      fetchUserProfile()
      alert('✓ Profile Complete! You\'re now visible in the directory with full details.')
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + error.message)
    }
  }

  const clearFilters = () => {
    setSearchName('')
    setFilterNtrp('All')
    setFilterDays([])
    setFilterTimes([])
  }

  if (loading) {
    const loadingContent = (
      <div className="hitting-partners-page">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666' }}>Loading...</p>
      </div>
    )
    return isCoach ? loadingContent : <StudentPageWrapper>{loadingContent}</StudentPageWrapper>
  }

  if (showWelcomeScreen) {
    return (
      <StudentPageWrapper>
        <WelcomeScreen 
          onSetup={() => {
            setShowWelcomeScreen(false)
            setShowSetupModal(true)
          }}
          onBrowse={() => {
            setShowWelcomeScreen(false)
            // Let them browse with incomplete profile
          }}
          activePlayerCount={partners.filter(p => p.is_active).length}
        />
      </StudentPageWrapper>
    )
  }

  const mainContent = (
    <div className="hitting-partners-page">
        {!isCoach && (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Hitting Partner Directory</h1>
            <p className="page-subtitle">Find players to practice with</p>
          </div>
          {userPartnerProfile && (
            <button 
              className="btn btn-outline"
              onClick={() => setShowProfileModal(true)}
            >
              <User size={18} />
              My Profile
            </button>
          )}
        </div>
      </>
        )}

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label className="filter-label">NTRP Level</label>
            <select 
              className="input"
              value={filterNtrp}
              onChange={(e) => setFilterNtrp(e.target.value)}
            >
              {ntrpLevelOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Availability Days</label>
            <div className="filter-chips">
              {days.map(day => (
                <button
                  key={day}
                  className={`filter-chip ${filterDays.includes(day) ? 'active' : ''}`}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">Time of Day</label>
            <div className="filter-chips">
              {times.map(time => (
                <button
                  key={time}
                  className={`filter-chip ${filterTimes.includes(time) ? 'active' : ''}`}
                  onClick={() => handleTimeToggle(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <button className="btn btn-outline btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Partners Grid */}
      <div className="partners-grid">
        {filteredPartners.length === 0 ? (
          <div className="empty-state">
            {partners.length === 0 ? (
              <>
                <Users size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>Be the first to join the hitting partner network!</p>
              </>
            ) : (
              <>
                <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p>No hitting partners found. Try adjusting your filters.</p>
              </>
            )}
          </div>
        ) : (
          filteredPartners.map((partner, index) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              index={index}
              matchScore={getMatchScore(partner)}
              onRequest={() => handleContact(partner)}
            />
          ))
        )}
      </div>

      {/* Setup Modal */}
      {showSetupModal && (
        <ProfileSetupModal
          availabilityDays={availabilityDays}
          setAvailabilityDays={setAvailabilityDays}
          availabilityTimes={availabilityTimes}
          setAvailabilityTimes={setAvailabilityTimes}
          preferredLocations={preferredLocations}
          setPreferredLocations={setPreferredLocations}
          locationArea={locationArea}
          setLocationArea={setLocationArea}
          onSave={handleSaveProfile}
          onClose={() => setShowSetupModal(false)}
          days={days}
          times={times}
        />
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <ProfileSetupModal
          availabilityDays={availabilityDays}
          setAvailabilityDays={setAvailabilityDays}
          availabilityTimes={availabilityTimes}
          setAvailabilityTimes={setAvailabilityTimes}
          preferredLocations={preferredLocations}
          setPreferredLocations={setPreferredLocations}
          locationArea={locationArea}
          setLocationArea={setLocationArea}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
          days={days}
          times={times}
          isEdit={true}
        />
      )}

      </div>
  )

  return isCoach ? mainContent : <StudentPageWrapper>{mainContent}</StudentPageWrapper>
}

function WelcomeScreen({ onSetup, onBrowse, activePlayerCount }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      textAlign: 'center',
      minHeight: '100vh',
      background: 'white'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎾</div>

      <h2 style={{
        fontSize: '24px',
        fontWeight: 700,
        margin: '0 0 8px 0',
        color: '#1f2937'
      }}>
        Ojo Hitting Partner Network
      </h2>

      <p style={{
        fontSize: '14px',
        color: '#6b7280',
        margin: '0 0 20px 0',
        lineHeight: 1.4
      }}>
        Find tennis players at your level to practice with in San Diego
      </p>

      <div style={{
        width: '100%',
        maxWidth: '300px',
        marginBottom: '20px',
        fontSize: '13px',
        color: '#374151',
        textAlign: 'left'
      }}>
        <div style={{ marginBottom: '8px' }}>✓ {activePlayerCount} active players looking to hit</div>
        <div style={{ marginBottom: '8px' }}>✓ All skill levels (1.0 - 5.0+)</div>
        <div style={{ marginBottom: '8px' }}>✓ Same courts you use</div>
      </div>

      <p style={{
        fontSize: '12px',
        color: '#6b7280',
        margin: '0 0 24px 0',
        fontStyle: 'italic'
      }}>
        Most players get 2-3 new hitting partners in their first week
      </p>

      <button
        onClick={onSetup}
        style={{
          width: '100%',
          maxWidth: '300px',
          padding: '14px 24px',
          background: '#6366f1',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '12px'
        }}
      >
        Set Up My Profile
        <div style={{ fontSize: '11px', fontWeight: 400, marginTop: '2px' }}>
          Takes 30 seconds
        </div>
      </button>

      <button
        onClick={onBrowse}
        style={{
          background: 'transparent',
          color: '#6366f1',
          border: 'none',
          fontSize: '14px',
          fontWeight: 500,
          cursor: 'pointer',
          textDecoration: 'underline'
        }}
      >
        Browse Players First
      </button>
    </div>
  )
}

function PartnerCard({ partner, index, matchScore, onRequest }) {
  const [expandedBio, setExpandedBio] = useState(false)
  const bio = partner.bio || ''
  const shouldTruncate = bio.length > 100

  return (
    <div className={`partner-card stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="partner-header">
        <div className="partner-avatar">
          {partner.profiles?.full_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="partner-info">
          <h3 className="partner-name">{partner.profiles?.full_name || 'Unknown'}</h3>
          <span className="ntrp-badge">{partner.profiles?.ntrp_level || 'N/A'}</span>
          {matchScore >= 70 && (
            <span className="match-badge great-match">Great Match!</span>
          )}
          {matchScore >= 50 && matchScore < 70 && (
            <span className="match-badge good-match">Good Match</span>
          )}
        </div>
      </div>

      {partner.location_area && (
        <div className="partner-section">
          <div className="section-label">
            📍 Location
          </div>
          <p className="partner-text">{partner.location_area}</p>
        </div>
      )}

      {partner.availability_days && partner.availability_days.length > 0 && (
        <div className="partner-section">
          <div className="section-label">
            📅 Available Days
          </div>
          <div className="badge-group">
            {partner.availability_days.map(day => (
              <span key={day} className="info-badge">{day}</span>
            ))}
          </div>
        </div>
      )}

      {partner.availability_times && partner.availability_times.length > 0 && (
        <div className="partner-section">
          <div className="section-label">
            ⏰ Available Times
          </div>
          <div className="badge-group">
            {partner.availability_times.map(time => (
              <span key={time} className="info-badge">{time}</span>
            ))}
          </div>
        </div>
      )}

      {partner.preferred_locations && (
        <div className="partner-section">
          <div className="section-label">
            🎾 Preferred Courts
          </div>
          <p className="partner-text">
            {Array.isArray(partner.preferred_locations) 
              ? partner.preferred_locations.join(', ')
              : partner.preferred_locations}
          </p>
        </div>
      )}

      {bio && (
        <div className="partner-section">
          <div className="section-label">Bio</div>
          <p className="partner-text">
            {expandedBio || !shouldTruncate ? bio : `${bio.substring(0, 100)}...`}
          </p>
          {shouldTruncate && (
            <button 
              className="read-more-btn"
              onClick={() => setExpandedBio(!expandedBio)}
            >
              {expandedBio ? 'Read less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      <button 
        className="btn btn-primary" 
        onClick={onRequest} 
        style={{ width: '100%', marginTop: '16px' }}
      >
        <Send size={18} />
        Text {partner.profiles?.full_name?.split(' ')[0] || 'Player'}
      </button>
    </div>
  )
}

function ProfileSetupModal({
  availabilityDays,
  setAvailabilityDays,
  availabilityTimes,
  setAvailabilityTimes,
  preferredLocations,
  setPreferredLocations,
  locationArea,
  setLocationArea,
  onSave,
  onClose,
  days,
  times,
  isEdit = false
}) {
  const handleDayToggle = (day) => {
    setAvailabilityDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleTimeToggle = (time) => {
    setAvailabilityTimes(prev => 
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  return (
    <div className="modal-overlay modal-above-tabs" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit My Profile' : 'Set Up Your Hitting Partner Profile'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '20px' }}>
            <label className="label">Availability Days</label>
            <div className="filter-chips">
              {days.map(day => (
                <button
                  key={day}
                  type="button"
                  className={`filter-chip ${availabilityDays.includes(day) ? 'active' : ''}`}
                  onClick={() => handleDayToggle(day)}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label">Availability Times</label>
            <div className="filter-chips">
              {times.map(time => (
                <button
                  key={time}
                  type="button"
                  className={`filter-chip ${availabilityTimes.includes(time) ? 'active' : ''}`}
                  onClick={() => handleTimeToggle(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label">Your Location</label>
            <input
              type="text"
              className="input"
              value={locationArea}
              onChange={(e) => setLocationArea(e.target.value)}
              placeholder="e.g., Pacific Beach, La Jolla, North Park"
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Neighborhood or area you're based in
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label">Preferred Tennis Courts</label>
            <textarea
              className="input"
              value={preferredLocations.join(', ')}
              onChange={(e) => setPreferredLocations(
                e.target.value.split(',').map(loc => loc.trim()).filter(loc => loc.length > 0)
              )}
              placeholder="Colina Del Sol Park, Balboa Park, etc."
              rows={3}
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave}>
            Save Profile
          </button>
        </div>
      </div>
    </div>
  )
}

