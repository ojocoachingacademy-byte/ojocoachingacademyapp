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
  const [error, setError] = useState(null)
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

  const fetchConversations = async (showRetry = false) => {
    try {
      setError(null)
      setLoading(true)

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('[MessageCenter] Error getting user:', userError)
        setLoading(false)
        setConversations([])
        return
      }
      
      if (!user) {
        console.log('[MessageCenter] No user found')
        setLoading(false)
        setConversations([])
        return
      }

      console.log('[MessageCenter] Fetching conversations for user:', user.id)

      // First, test if conversations table exists with a simple count query
      console.log('[MessageCenter] Testing conversations table access...')
      const { count: testCount, error: testError } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
      
      console.log('[MessageCenter] Table test result:', { testCount, testError })
      
      if (testError) {
        console.error('[MessageCenter] Conversations table test failed:', testError)
        console.error('[MessageCenter] Error code:', testError.code)
        console.error('[MessageCenter] Error message:', testError.message)
        console.error('[MessageCenter] Error details:', testError.details)
        console.error('[MessageCenter] Error hint:', testError.hint)
        // Gracefully degrade - just show empty state
        setConversations([])
        setLoading(false)
        return
      }

      // Simplified query - just fetch conversations first (no joins)
      console.log('[MessageCenter] Fetching conversations...')
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false, nullsFirst: false })

      console.log('[MessageCenter] Conversations query result:', { 
        dataLength: data?.length || 0, 
        error: error ? {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        } : null
      })

      if (error) {
        console.error('[MessageCenter] Supabase error details:', error)
        console.error('[MessageCenter] Error code:', error.code)
        console.error('[MessageCenter] Error message:', error.message)
        console.error('[MessageCenter] Error details:', error.details)
        console.error('[MessageCenter] Error hint:', error.hint)
        // Gracefully degrade - just show empty state
        setConversations([])
        setLoading(false)
        return
      }

      console.log('[MessageCenter] Successfully fetched', data?.length || 0, 'conversations')

      // If no conversations, just show empty state
      if (!data || data.length === 0) {
        console.log('[MessageCenter] No conversations found')
        setConversations([])
        setLoading(false)
        return
      }

      // Fetch messages for these conversations
      console.log('[MessageCenter] Fetching messages for conversations...')
      const conversationIds = data.map(c => c.id)
      
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('id, conversation_id, content, sender_id, receiver_id, created_at, read')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })

      if (messagesError) {
        console.error('[MessageCenter] Error fetching messages:', messagesError)
        // Continue without messages - conversations will still show
      } else {
        console.log('[MessageCenter] Fetched', messagesData?.length || 0, 'messages')
      }

      // Fetch profiles for all participants
      const participantIds = new Set()
      data.forEach(conv => {
        participantIds.add(conv.participant_1_id)
        participantIds.add(conv.participant_2_id)
      })

      console.log('[MessageCenter] Fetching profiles for', participantIds.size, 'participants')
      let profilesMap = new Map()
      if (participantIds.size > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(participantIds))

        if (profilesError) {
          console.error('[MessageCenter] Error fetching profiles:', profilesError)
          // Continue without profile data - conversations will still show
        } else {
          profilesMap = new Map(profilesData?.map(p => [p.id, p]) || [])
          console.log('[MessageCenter] Fetched', profilesMap.size, 'profiles')
        }
      }

      // Process conversations with messages and profiles
      const messagesByConversation = new Map()
      if (messagesData) {
        messagesData.forEach(msg => {
          if (!messagesByConversation.has(msg.conversation_id)) {
            messagesByConversation.set(msg.conversation_id, [])
          }
          messagesByConversation.get(msg.conversation_id).push(msg)
        })
      }

      const processedConversations = data.map(conv => {
        const messages = messagesByConversation.get(conv.id) || []
        const otherParticipantProfile = conv.participant_1_id === user.id
          ? profilesMap.get(conv.participant_2_id)
          : profilesMap.get(conv.participant_1_id)

        // Get unread count
        const unreadCount = messages.filter(
          msg => msg.receiver_id === user.id && !msg.read
        ).length

        // Get last message (already sorted by created_at DESC)
        const lastMessage = messages.length > 0 ? messages[0] : null

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

      console.log('[MessageCenter] Processed', processedConversations.length, 'conversations')
      setConversations(processedConversations)
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('[MessageCenter] Caught unexpected error:', err)
      console.error('[MessageCenter] Error stack:', err.stack)
      // Gracefully degrade - just show empty state
      setConversations([])
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
      <div className="message-center" style={{ padding: '40px', textAlign: 'center' }}>
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
            <p style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>No conversations yet</p>
            <p style={{ fontSize: '14px', color: '#999', marginTop: '8px', marginBottom: '24px' }}>
              Start a conversation by sending a message to a student or coach
            </p>
            <button 
              className="btn btn-primary"
              onClick={handleNewConversation}
            >
              <Plus size={18} />
              Start Your First Conversation
            </button>
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
