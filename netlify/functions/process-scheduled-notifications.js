// Scheduled Netlify Function to process delayed notifications
// Runs every 5 minutes (configure in netlify.toml)
// Checks for notifications where scheduled_for <= now() and sends them

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  const startTime = Date.now()
  console.log('=== PROCESSING SCHEDULED NOTIFICATIONS ===')
  console.log('Time:', new Date().toISOString())

  try {
    const now = new Date().toISOString()

    // Find all notifications that are due to be sent
    // Only select needed fields to minimize data transfer
    const { data: dueNotifications, error: fetchError } = await supabase
      .from('scheduled_notifications')
      .select('id, to_email, subject, html_body, text_body')
      .lte('scheduled_for', now)
      .is('sent_at', null)
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process up to 50 at a time

    if (fetchError) {
      console.error('Error fetching scheduled notifications:', fetchError)
      // If table doesn't exist, that's okay - just return success
      if (fetchError.code === 'PGRST116' || fetchError.message.includes('does not exist')) {
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true,
            message: 'No scheduled_notifications table found, skipping',
            processed: 0
          })
        }
      }
      throw fetchError
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      const executionTime = Date.now() - startTime
      console.log(`No notifications due. Execution time: ${executionTime}ms`)
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'No notifications due',
          processed: 0,
          executionTimeMs: executionTime
        })
      }
    }

    console.log(`Found ${dueNotifications.length} notifications to process`)

    let processed = 0
    let failed = 0

    // Process each notification
    for (const notification of dueNotifications) {
      try {
        // Send email via send-email function
        const sendEmailUrl = `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/send-email`
        const sendEmailResponse = await fetch(sendEmailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: notification.to_email,
            subject: notification.subject,
            html: notification.html_body,
            text: notification.text_body
          })
        })

        if (sendEmailResponse.ok) {
          // Mark as sent
          await supabase
            .from('scheduled_notifications')
            .update({ 
              sent_at: new Date().toISOString() 
            })
            .eq('id', notification.id)

          processed++
          console.log(`Sent notification ${notification.id} to ${notification.to_email}`)
        } else {
          const errorText = await sendEmailResponse.text()
          console.error(`Failed to send notification ${notification.id}:`, errorText)
          failed++
        }
      } catch (error) {
        console.error(`Error processing notification ${notification.id}:`, error)
        failed++
      }
    }

    const executionTime = Date.now() - startTime
    console.log(`Completed: ${processed} sent, ${failed} failed. Execution time: ${executionTime}ms`)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: `Processed ${processed} notifications, ${failed} failed`,
        processed,
        failed,
        executionTimeMs: executionTime
      })
    }
  } catch (error) {
    console.error('Error processing scheduled notifications:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
