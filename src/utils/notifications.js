import { supabaseAdmin } from '../supabaseAdmin'

/**
 * Get the coach user ID
 * @returns {Promise<string|null>} Coach user ID or null if not found
 */
export async function getCoachUserId() {
  try {
    const { data: coachProfile, error } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('account_type', 'coach')
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching coach profile:', error)
      return null
    }

    return coachProfile?.id || null
  } catch (error) {
    console.error('Error in getCoachUserId:', error)
    return null
  }
}

/**
 * Create a notification for the coach
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.type - Notification type
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {string} notificationData.link - Optional link
 * @returns {Promise<boolean>} Success status
 */
export async function createCoachNotification({ type, title, body, link = '/coach' }) {
  try {
    const coachUserId = await getCoachUserId()
    
    if (!coachUserId) {
      console.warn('No coach user found, skipping notification')
      return false
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: coachUserId,
        type: type,
        title: title,
        body: body,
        link: link,
        read: false
      })

    if (error) {
      console.error('Error creating coach notification:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in createCoachNotification:', error)
    return false
  }
}
