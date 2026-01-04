import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X } from 'lucide-react'
import '../shared/Modal.css'
import './SelectProfileModal.css'

export default function SelectProfileModal({ currentProfileId, onSelect, onClose }) {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchProfiles()
  }, [])

  const fetchProfiles = async () => {
    try {
      setLoading(true)
      // Fetch all profiles except the current one
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .neq('id', currentProfileId)
        .order('full_name')

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error fetching profiles:', error)
      alert('Error loading profiles: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredProfiles = profiles.filter(profile =>
    profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content select-profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Select Profile to Merge With</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading profiles...</div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
              No profiles found
            </div>
          ) : (
            <div className="profiles-list">
              {filteredProfiles.map(profile => (
                <div
                  key={profile.id}
                  className="profile-item"
                  onClick={() => onSelect(profile.id)}
                >
                  <div className="profile-name">{profile.full_name}</div>
                  {profile.email && (
                    <div className="profile-email">{profile.email}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

