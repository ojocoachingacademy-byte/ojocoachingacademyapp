const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  // Verify webhook is from Cal.com
  const signature = event.headers['x-cal-signature']
  // TODO: Verify signature with Cal.com webhook secret if configured
  // const webhookSecret = process.env.CALCOM_WEBHOOK_SECRET
  // if (webhookSecret && !verifySignature(event.body, signature, webhookSecret)) {
  //   return { statusCode: 401, body: 'Unauthorized' }
  // }
  
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
      .single()

    if (lessonError) {
      console.error('Error creating lesson:', lessonError)
      return { 
        statusCode: 500, 
        body: JSON.stringify({ error: 'Failed to create lesson: ' + lessonError.message }) 
      }
    }

    console.log('Lesson created successfully:', lesson.id)

    // Deduct credit from student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('lesson_credits')
      .eq('id', studentId)
      .single()

    if (studentError) {
      console.error('Error fetching student:', studentError)
      // Don't fail the webhook if we can't deduct credit - lesson is already created
    } else if (student && student.lesson_credits > 0) {
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
      await supabase
        .from('notifications')
        .insert([{
          user_id: studentId,
          type: 'lesson_booked',
          title: 'Lesson Booked! 🎾',
          body: `Your lesson is scheduled for ${new Date(startTime).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
          link: '/dashboard'
        }])
      console.log('Notification created for student')
    } catch (notifError) {
      console.error('Error creating notification:', notifError)
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




