import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { X } from 'lucide-react'
import MessageComposer from './MessageComposer'
import '../shared/Modal.css'

export default function NewConversationModal({ isOpen, onClose, preselectedUserId = null }) {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (isOpen) {
      fetchUser()
      if (preselectedUserId) {
        fetchUserById(preselectedUserId)
      } else {
        fetchUsers()
      }
    }
  }, [isOpen, preselectedUserId])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchUserById = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('id', userId)
        .single()

      if (error) throw error

      setSelectedUser(data)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching user:', error)
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      // Get all profiles (coaches can message students, students can message coaches)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, account_type')
        .neq('id', currentUser.id)
        .order('full_name', { ascending: true })

      if (error) throw error

      setUsers(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching users:', error)
      setLoading(false)
    }
  }

  const handleUserSelect = (user) => {
    setSelectedUser(user)
  }

  const handleMessageSent = () => {
    onClose()
    // Optionally refresh conversations in parent
  }

  if (!isOpen) return null

  if (selectedUser) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2 className="modal-title">New Message to {selectedUser.full_name}</h2>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <MessageComposer
              receiverId={selectedUser.id}
              onMessageSent={handleMessageSent}
            />
          </div>
        </div>
      </div>
    )
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2 className="modal-title">New Message</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input"
            style={{ marginBottom: '16px' }}
          />
          
          {loading ? (
            <div className="text-center" style={{ padding: '32px' }}>Loading users...</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredUsers.length === 0 ? (
                <div className="text-center" style={{ padding: '32px', color: '#999' }}>
                  No users found
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => handleUserSelect(user)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f9f9f9'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{user.full_name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{user.email}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}




