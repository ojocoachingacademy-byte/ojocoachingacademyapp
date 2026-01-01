import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Send } from 'lucide-react'
import './MessageComposer.css'

export default function MessageComposer({ conversationId, receiverId, onMessageSent }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    
    if (!message.trim() || sending) return

    setSending(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get or create conversation if conversationId not provided
      let convId = conversationId
      if (!convId && receiverId) {
        // Ensure consistent ordering (smaller UUID first)
        const participant1 = user.id < receiverId ? user.id : receiverId
        const participant2 = user.id < receiverId ? receiverId : user.id
        
        // Try to find existing conversation
        const { data: existingConv, error: findError } = await supabase
          .from('conversations')
          .select('id')
          .eq('participant_1_id', participant1)
          .eq('participant_2_id', participant2)
          .single()

        if (findError && findError.code !== 'PGRST116') {
          // PGRST116 is "not found" - that's okay, we'll create
          console.error('Error finding conversation:', findError)
        }

        if (existingConv) {
          convId = existingConv.id
        } else {
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
      }

      if (!convId) throw new Error('No conversation ID')

      // Insert message
      const { data: newMessage, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          receiver_id: receiverId,
          content: message.trim(),
          message_type: 'text'
        })
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
        .single()

      if (error) throw error

      setMessage('')
      if (onMessageSent) {
        onMessageSent(newMessage)
      }

      // Create notification for receiver
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      await supabase
        .from('notifications')
        .insert({
          user_id: receiverId,
          type: 'message',
          title: 'New Message',
          body: `${receiverProfile?.full_name || 'Someone'} sent you a message`,
          link: `/messages`,
          read: false
        })

    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message: ' + error.message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend(e)
    }
  }

  return (
    <div className="message-composer">
      <form onSubmit={handleSend} className="composer-form">
        <textarea
          className="composer-input"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          disabled={sending}
        />
        <button
          type="submit"
          className="send-button"
          disabled={!message.trim() || sending}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  )
}
