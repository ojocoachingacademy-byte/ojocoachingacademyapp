import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Search, Plus } from 'lucide-react'
import './MessageCenter.css'
import MessageThread from './MessageThread'
import NewConversationModal from './NewConversationModal'

export default function MessageCenter() {
  const [conversations, setConversations] = useState([])
  const [filteredConversations, setFilteredConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [user, setUser] = useState(null)
  const [showNewConversation, setShowNewConversation] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUser()
    fetchConversations()
    
    // Set up realtime subscription for new messages
    const messagesSubscription = supabase
      .channel('messages-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          fetchConversations() // Refresh conversations when new message arrives
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [])

  useEffect(() => {
    filterConversations()
  }, [conversations, searchQuery])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch conversations where user is a participant
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (
            id,
            content,
            sender_id,
            receiver_id,
            created_at,
            read
          ),
          participant_1:profiles!conversations_participant_1_id_fkey (
            id,
            full_name,
            email
          ),
          participant_2:profiles!conversations_participant_2_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      if (error) throw error

      // Process conversations to get unread counts and last message
      const processedConversations = (data || []).map(conv => {
        const otherParticipant = conv.participant_1_id === user.id 
          ? conv.participant_2 
          : conv.participant_1
        const otherParticipantProfile = conv.participant_1_id === user.id
          ? conv.participant_2
          : conv.participant_1

        // Get unread count
        const unreadCount = (conv.messages || []).filter(
          msg => msg.receiver_id === user.id && !msg.read
        ).length

        // Get last message
        const messages = conv.messages || []
        const lastMessage = messages.length > 0 
          ? messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
          : null

        return {
          ...conv,
          otherParticipant: otherParticipantProfile,
          otherParticipantId: conv.participant_1_id === user.id 
            ? conv.participant_2_id 
            : conv.participant_1_id,
          unreadCount,
          lastMessage
        }
      })

      setConversations(processedConversations)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setLoading(false)
    }
  }

  const filterConversations = () => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = conversations.filter(conv => 
      conv.otherParticipant?.full_name?.toLowerCase().includes(query) ||
      conv.otherParticipant?.email?.toLowerCase().includes(query) ||
      conv.lastMessage?.content?.toLowerCase().includes(query)
    )
    setFilteredConversations(filtered)
  }

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation)
    // Mark messages as read when conversation is opened
    markConversationAsRead(conversation.id)
  }

  const markConversationAsRead = async (conversationId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Update all unread messages in this conversation
      const { error } = await supabase
        .from('messages')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('conversation_id', conversationId)
        .eq('receiver_id', user.id)
        .eq('read', false)

      if (error) throw error

      // Refresh conversations to update unread counts
      fetchConversations()
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const handleNewConversation = () => {
    setShowNewConversation(true)
  }

  if (selectedConversation) {
    return (
      <MessageThread 
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
        onMessageSent={fetchConversations}
      />
    )
  }

  if (loading) {
    return (
      <div className="message-center">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666', marginTop: '16px' }}>Loading conversations...</p>
      </div>
    )
  }

  return (
    <div className="message-center">
      <div className="message-center-header">
        <h1 className="page-title">Messages</h1>
        <button 
          className="btn btn-primary"
          onClick={handleNewConversation}
        >
          <Plus size={18} />
          New Message
        </button>
      </div>

      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="conversations-list">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            <MessageSquare size={48} style={{ color: '#ccc', marginBottom: '16px' }} />
            <p>No conversations yet</p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '8px' }}>
              Start a conversation by sending a message to a student or coach
            </p>
          </div>
        ) : (
          filteredConversations.map(conversation => (
            <div
              key={conversation.id}
              className={`conversation-item ${conversation.unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => handleConversationSelect(conversation)}
            >
              <div className="conversation-avatar">
                {conversation.otherParticipant?.full_name 
                  ? conversation.otherParticipant.full_name.charAt(0).toUpperCase()
                  : '?'}
              </div>
              <div className="conversation-content">
                <div className="conversation-header">
                  <h3 className="conversation-name">
                    {conversation.otherParticipant?.full_name || 'Unknown User'}
                  </h3>
                  {conversation.lastMessage && (
                    <span className="conversation-time">
                      {new Date(conversation.lastMessage.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        ...(new Date(conversation.lastMessage.created_at).toDateString() === new Date().toDateString() 
                          ? { hour: '2-digit', minute: '2-digit' }
                          : {})
                      })}
                    </span>
                  )}
                </div>
                <div className="conversation-preview">
                  <p className="conversation-last-message">
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="unread-badge">{conversation.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
      />
    </div>
  )
}
