import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { ArrowLeft, Send } from 'lucide-react'
import MessageComposer from './MessageComposer'
import './MessageThread.css'

export default function MessageThread({ conversation, onBack, onMessageSent }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    fetchUser()
    fetchMessages()
    
    // Set up realtime subscription for new messages in this conversation
    const messagesSubscription = supabase
      .channel(`conversation-${conversation.id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new])
          scrollToBottom()
          markAsRead(payload.new)
        }
      )
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversation.id}`
        },
        (payload) => {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new : msg
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [conversation.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            email
          ),
          receiver:profiles!messages_receiver_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: true })

      if (error) throw error

      setMessages(data || [])
      setLoading(false)

      // Mark messages as read
      markAsReadBatch(data || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      setLoading(false)
    }
  }

  const markAsReadBatch = async (messageList) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const unreadMessages = messageList.filter(
        msg => msg.receiver_id === user.id && !msg.read
      )

      if (unreadMessages.length === 0) return

      const messageIds = unreadMessages.map(msg => msg.id)

      const { error } = await supabase
        .from('messages')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .in('id', messageIds)

      if (error) throw error

      // Update local state
      setMessages(prev => prev.map(msg => 
        messageIds.includes(msg.id) ? { ...msg, read: true } : msg
      ))
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const markAsRead = async (message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (message.receiver_id === user.id && !message.read) {
        const { error } = await supabase
          .from('messages')
          .update({ 
            read: true, 
            read_at: new Date().toISOString() 
          })
          .eq('id', message.id)

        if (error) throw error

        setMessages(prev => prev.map(msg => 
          msg.id === message.id ? { ...msg, read: true } : msg
        ))
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleMessageSent = (newMessage) => {
    setMessages(prev => [...prev, newMessage])
    if (onMessageSent) onMessageSent()
  }

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
  }

  if (loading) {
    return (
      <div className="message-thread">
        <div className="spinner"></div>
        <p className="text-center" style={{ color: '#666', marginTop: '16px' }}>Loading messages...</p>
      </div>
    )
  }

  return (
    <div className="message-thread">
      <div className="message-thread-header">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <div className="thread-participant-info">
          <div className="thread-avatar">
            {conversation.otherParticipant?.full_name 
              ? conversation.otherParticipant.full_name.charAt(0).toUpperCase()
              : '?'}
          </div>
          <div>
            <h2 className="thread-participant-name">
              {conversation.otherParticipant?.full_name || 'Unknown User'}
            </h2>
            <p className="thread-participant-email">
              {conversation.otherParticipant?.email || ''}
            </p>
          </div>
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="empty-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isOwnMessage = message.sender_id === user?.id
            const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id
            const showTimestamp = index === messages.length - 1 || 
              new Date(messages[index + 1].created_at) - new Date(message.created_at) > 300000 // 5 minutes

            return (
              <div key={message.id} className={`message-wrapper ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                {!isOwnMessage && showAvatar && (
                  <div className="message-avatar">
                    {message.sender?.full_name 
                      ? message.sender.full_name.charAt(0).toUpperCase()
                      : '?'}
                  </div>
                )}
                <div className="message-bubble-wrapper">
                  <div className={`message-bubble ${isOwnMessage ? 'sent' : 'received'}`}>
                    <p className="message-content">{message.content}</p>
                    {showTimestamp && (
                      <span className="message-time">
                        {formatMessageTime(message.created_at)}
                        {isOwnMessage && message.read && (
                          <span className="read-indicator">✓✓</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer 
        conversationId={conversation.id}
        receiverId={conversation.otherParticipantId}
        onMessageSent={handleMessageSent}
      />
    </div>
  )
}
