import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, Users, MapPin, Clock, Calendar, User, Edit2, Send, X } from 'lucide-react'
import './HittingPartners.css'
import '../shared/Modal.css'

export default function HittingPartners() {
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
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedPartner, setSelectedPartner] = useState(null)
  
  // Form states
  const [availabilityDays, setAvailabilityDays] = useState([])
  const [availabilityTimes, setAvailabilityTimes] = useState([])
  const [preferredLocations, setPreferredLocations] = useState('')
  const [bio, setBio] = useState('')
  const [contactPreference, setContactPreference] = useState('in-app')
  const [isActive, setIsActive] = useState(true)
  
  // Request message
  const [requestMessage, setRequestMessage] = useState('')
  
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const times = ['Morning', 'Afternoon', 'Evening']
  const ntrpLevels = ['All', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0+']

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
      
      // Sort by NTRP level (handle nulls and 5.0+)
      const sorted = (data || []).sort((a, b) => {
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
        setAvailabilityDays(partnerData.availability_days || [])
        setAvailabilityTimes(partnerData.availability_times || [])
        // Convert array back to comma-separated string for display in textarea
        const locationsStr = Array.isArray(partnerData.preferred_locations) 
          ? partnerData.preferred_locations.join(', ')
          : (partnerData.preferred_locations || '')
        setPreferredLocations(locationsStr)
        setBio(partnerData.bio || '')
        // Map database value back to form value (in_app -> in-app)
        const contactPref = partnerData.contact_preference || 'in_app'
        const contactPrefReverseMap = {
          'in_app': 'in-app',
          'in-app': 'in-app', // Handle both formats
          'phone': 'phone',
          'email': 'email'
        }
        setContactPreference(contactPrefReverseMap[contactPref] || 'in-app')
        setIsActive(partnerData.is_active !== false)
      } else {
        // No profile yet, show setup
        setShowSetupModal(true)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
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
      filtered = filtered.filter(p => p.profiles?.ntrp_level === filterNtrp)
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

      // Convert preferred_locations string to array (split by comma and trim)
      const locationsArray = preferredLocations
        ? preferredLocations.split(',').map(loc => loc.trim()).filter(loc => loc.length > 0)
        : []

      // Map contact preference values to match database constraint
      // The constraint likely expects: 'in_app', 'phone', or 'email' (with underscores)
      const contactPrefMap = {
        'in-app': 'in_app',
        'phone': 'phone',
        'email': 'email',
        'in_app': 'in_app' // Handle if already in correct format
      }
      
      let mappedContactPreference = contactPrefMap[contactPreference] || contactPreference
      
      // Validate the mapped value is one of the expected values
      const validValues = ['in_app', 'phone', 'email']
      if (!validValues.includes(mappedContactPreference)) {
        console.warn(`Invalid contact preference: ${mappedContactPreference}, defaulting to 'in_app'`)
        mappedContactPreference = 'in_app'
      }

      console.log('Contact preference mapping:', {
        original: contactPreference,
        mapped: mappedContactPreference,
        validValues: validValues
      })

      // Ensure contact_preference is never null or empty
      if (!mappedContactPreference || mappedContactPreference.trim() === '') {
        console.warn('Contact preference is empty, defaulting to in_app')
        mappedContactPreference = 'in_app'
      }

      const partnerData = {
        id: user.id,
        availability_days: availabilityDays.length > 0 ? availabilityDays : null,
        availability_times: availabilityTimes.length > 0 ? availabilityTimes : null,
        preferred_locations: locationsArray.length > 0 ? locationsArray : null,
        bio: bio.trim().substring(0, 500) || null,
        contact_preference: mappedContactPreference, // Ensure this is never null
        is_active: isActive !== undefined ? isActive : true
      }

      console.log('Saving partner data:', {
        ...partnerData,
        availability_days: partnerData.availability_days,
        availability_times: partnerData.availability_times,
        preferred_locations: partnerData.preferred_locations,
        contact_preference: partnerData.contact_preference
      })

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
        
        // More helpful error message
        let errorMsg = error.message
        if (error.message.includes('contact_preference_check')) {
          errorMsg = `Invalid contact preference value. The database expects one of: 'in_app', 'phone', or 'email'. We tried to send: '${mappedContactPreference}'. Please check the database constraint.`
        }
        
        throw new Error(errorMsg)
      }

      setShowSetupModal(false)
      setShowProfileModal(false)
      fetchPartners()
      fetchUserProfile()
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + error.message)
    }
  }

  const handleRequestToHit = (partner) => {
    setSelectedPartner(partner)
    
    // Generate pre-filled message
    const userDays = userPartnerProfile?.availability_days || []
    const userTimes = userPartnerProfile?.availability_times || []
    const message = `Hi ${partner.profiles?.full_name}, I'd like to hit with you! I'm available ${userDays.join(', ')} at ${userTimes.join(', ')}. Let me know if you're interested.`
    
    setRequestMessage(message)
    setShowRequestModal(true)
  }

  const handleSendRequest = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !selectedPartner) return

      // Ensure consistent ordering (smaller UUID first)
      const participant1 = user.id < selectedPartner.id ? user.id : selectedPartner.id
      const participant2 = user.id < selectedPartner.id ? selectedPartner.id : user.id
      
      // Try to find existing conversation
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1_id', participant1)
        .eq('participant_2_id', participant2)
        .single()

      let convId = existingConv?.id

      if (!convId) {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from('conversations')
          .insert({
            participant_1_id: participant1,
            participant_2_id: participant2
          })
          .select()
          .single()

        if (createError) throw createError
        convId = newConv.id
      }

      // Insert message
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          receiver_id: selectedPartner.id,
          content: requestMessage.trim(),
          message_type: 'hitting_partner_request'
        })

      if (error) throw error

      // Create notification
      await supabase
        .from('notifications')
        .insert({
          user_id: selectedPartner.id,
          type: 'hitting_partner_request',
          title: 'New Hitting Partner Request',
          body: `${userProfile?.full_name || 'Someone'} wants to hit with you!`,
          link: '/messages',
          read: false
        })

      // Show success toast
      alert('Request sent!')
      setShowRequestModal(false)
      setRequestMessage('')
      setSelectedPartner(null)
    } catch (error) {
      console.error('Error sending request:', error)
      alert('Error sending request: ' + error.message)
    }
  }

  const clearFilters = () => {
    setSearchName('')
    setFilterNtrp('All')
    setFilterDays([])
    setFilterTimes([])
  }

  if (loading) {
    return (
      <div className="hitting-partners-page">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="hitting-partners-page">
      {/* Header */}
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
              {ntrpLevels.map(level => (
                <option key={level} value={level}>{level}</option>
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
              onRequest={() => handleRequestToHit(partner)}
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
          bio={bio}
          setBio={setBio}
          contactPreference={contactPreference}
          setContactPreference={setContactPreference}
          isActive={isActive}
          setIsActive={setIsActive}
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
          bio={bio}
          setBio={setBio}
          contactPreference={contactPreference}
          setContactPreference={setContactPreference}
          isActive={isActive}
          setIsActive={setIsActive}
          onSave={handleSaveProfile}
          onClose={() => setShowProfileModal(false)}
          days={days}
          times={times}
          isEdit={true}
        />
      )}

      {/* Request Modal */}
      {showRequestModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Request to Hit</h2>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', color: '#666' }}>
                Send a message to <strong>{selectedPartner.profiles?.full_name}</strong>
              </p>
              <label className="label">Message</label>
              <textarea
                className="input"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                placeholder="Customize your message..."
                rows={6}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowRequestModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSendRequest}>
                <Send size={18} />
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PartnerCard({ partner, index, onRequest }) {
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
        </div>
      </div>

      {partner.availability_days && partner.availability_days.length > 0 && (
        <div className="partner-section">
          <div className="section-label">
            <Calendar size={16} />
            Available Days
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
            <Clock size={16} />
            Available Times
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
            <MapPin size={16} />
            Preferred Locations
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

      <button className="btn btn-primary" onClick={onRequest} style={{ width: '100%', marginTop: '16px' }}>
        <Send size={18} />
        Request to Hit
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
  bio,
  setBio,
  contactPreference,
  setContactPreference,
  isActive,
  setIsActive,
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
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
            <label className="label">Preferred Locations (comma separated)</label>
            <textarea
              className="input"
              value={preferredLocations}
              onChange={(e) => setPreferredLocations(e.target.value)}
              placeholder="Colina Del Sol Park, Balboa Park, etc."
              rows={3}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label">Bio (max 500 characters)</label>
            <textarea
              className="input"
              value={bio}
              onChange={(e) => setBio(e.target.value.substring(0, 500))}
              placeholder="Tell others about yourself..."
              rows={4}
              maxLength={500}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {bio.length}/500 characters
            </p>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label className="label">Contact Preference</label>
            <select
              className="input"
              value={contactPreference}
              onChange={(e) => setContactPreference(e.target.value)}
            >
              <option value="in-app">In-app message</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <label htmlFor="isActive" style={{ cursor: 'pointer', fontWeight: 500 }}>
              Active in directory (uncheck to hide your profile)
            </label>
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

