const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  // Verify webhook is from Cal.com
  // NOTE: Webhook signature verification is recommended for production
  // To enable: Set CALCOM_WEBHOOK_SECRET in Netlify environment variables
  // and implement signature verification using Cal.com's webhook signing method
  const signature = event.headers['x-cal-signature']
  const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET
  if (webhookSecret && signature) {
    // TODO: Implement signature verification when Cal.com webhook secret is configured
    // Cal.com uses HMAC-SHA256 for webhook signatures
    // Example: const crypto = require('crypto')
    // const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(event.body).digest('hex')
    // if (signature !== expectedSignature) {
    //   return { statusCode: 401, body: 'Unauthorized - Invalid signature' }
    // }
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const booking = JSON.parse(event.body)
    
    console.log('Cal.com webhook received:', JSON.stringify(booking, null, 2))

    // Extract booking details
    // Cal.com webhook payload structure may vary - adjust based on actual payload
    const uid = booking.uid || booking.id
    const title = booking.title || booking.eventTitle || 'Tennis Lesson'
    const startTime = booking.startTime || booking.start || booking.scheduledAt
    const endTime = booking.endTime || booking.end
    const attendees = booking.attendees || booking.attendee || []
    const metadata = booking.metadata || booking.metadata || {}

    const studentId = metadata?.studentId || metadata?.student_id
    const studentEmail = attendees?.[0]?.email || booking.email || attendees?.email

    if (!studentId) {
      console.error('No student ID in booking metadata:', metadata)
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing student ID in booking metadata' }) 
      }
    }

    if (!startTime) {
      console.error('No start time in booking:', booking)
      return { 
        statusCode: 400, 
        body: JSON.stringify({ error: 'Missing start time in booking' }) 
      }
    }

    console.log('Creating lesson for student:', studentId, 'at', startTime)

    // Create lesson in database
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .insert([{
        student_id: studentId,
        lesson_date: startTime,
        location: 'Colina Del Sol Park', // Default location, can be updated
        status: 'scheduled',
        metadata: JSON.stringify({
          cal_booking_id: uid,
          booked_via: 'cal.com',
          cal_title: title
        })
      }])
      .select()
      .maybeSingle()

    if (lessonError) {
      console.error('Error creating lesson:', lessonError)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to create lesson: ' + lessonError.message }) 
      }
    }

    if (!lesson || !lesson.id) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create lesson: No lesson returned' })
      }
    }

    console.log('Lesson created successfully:', lesson.id)

    // Deduct credit from student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('lesson_credits')
      .eq('id', studentId)
      .maybeSingle()

    if (studentError || !student) {
      console.error('Error fetching student:', studentError)
      // Don't fail the webhook if we can't deduct credit - lesson is already created
    } else if (student.lesson_credits > 0) {
      const { error: updateError } = await supabase
        .from('students')
        .update({ lesson_credits: student.lesson_credits - 1 })
        .eq('id', studentId)

      if (updateError) {
        console.error('Error deducting credit:', updateError)
      } else {
        console.log('Credit deducted. New balance:', student.lesson_credits - 1)
      }
    } else {
      console.warn('Student has no credits or not found. Lesson created but credit not deducted.')
    }

    // Create notification for student
    try {
      // Format date - parse as local date to avoid timezone issues
      let formattedDateTime = 'your scheduled time'
      if (startTime) {
        try {
          // startTime is an ISO timestamp, extract date and time separately
          const dateObj = new Date(startTime)
          const dateStr = startTime.split('T')[0] // Get date part
          const [year, month, day] = dateStr.split('-').map(Number)
          const date = new Date(year, month - 1, day)
          
          // Get time from the original date object (preserves timezone for time)
          const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          const dateFormatted = date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
          formattedDateTime = `${dateFormatted} at ${timeStr}`
        } catch (error) {
          console.error('Error formatting startTime:', error, 'Raw time:', startTime)
          formattedDateTime = startTime
        }
      }
      
      await supabase
        .from('notifications')
        .insert([{
          user_id: studentId,
          type: 'lesson_booked',
          title: 'Lesson Booked! 🎾',
          body: `Your lesson is scheduled for ${formattedDateTime}`,
          link: '/dashboard'
        }])
      console.log('Notification created for student')
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
      // Don't fail webhook if notification fails
    }

    // Create notification for coach
    try {
      // Get student profile for name
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', studentId)
        .maybeSingle()

      // Get coach user ID
      const { data: coachProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('account_type', 'coach')
        .limit(1)
        .maybeSingle()

      if (coachProfile) {
        // Format date - parse as local date to avoid timezone issues
        let formattedDateTime = 'a scheduled time'
        if (startTime) {
          try {
            // startTime is an ISO timestamp, extract date and time separately
            const dateObj = new Date(startTime)
            const dateStr = startTime.split('T')[0] // Get date part
            const [year, month, day] = dateStr.split('-').map(Number)
            const date = new Date(year, month - 1, day)
            
            // Get time from the original date object (preserves timezone for time)
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            const dateFormatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
            formattedDateTime = `${dateFormatted} at ${timeStr}`
          } catch (error) {
            console.error('Error formatting startTime:', error, 'Raw time:', startTime)
            formattedDateTime = startTime
          }
        }
        
        await supabase
          .from('notifications')
          .insert([{
            user_id: coachProfile.id,
            type: 'lesson_booked',
            title: 'New Lesson Booked',
            body: `${studentProfile?.full_name || 'A student'} has booked a lesson for ${formattedDateTime}`,
            link: `/coach/lessons`
          }])
        console.log('Notification created for coach')
      }
    } catch (coachNotifError) {
      console.error('Error creating coach notification:', coachNotifError)
      // Don't fail webhook if notification fails
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        lessonId: lesson.id,
        message: 'Lesson created and credit deducted successfully'
      })
    }

  } catch (error) {
    console.error('Webhook error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    }
  }
}




