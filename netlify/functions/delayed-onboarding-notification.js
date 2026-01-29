// Netlify Function to schedule delayed onboarding notification (30 minutes after signup)
// Stores notification in database to be processed by scheduled function

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { studentId, studentName, studentEmail, studentPhone, developmentPlan, signupTimestamp } = JSON.parse(event.body)

    // Validate required fields
    if (!studentId || !studentName || !studentEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: studentId, studentName, studentEmail' })
      }
    }

    // Calculate scheduled time: 30 minutes from now
    const scheduledTime = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    // Parse development plan
    const plan = typeof developmentPlan === 'string' ? JSON.parse(developmentPlan) : developmentPlan
    const section1 = plan?.section1 || {}
    const section2 = plan?.section2 || {}

    // Get goal text
    let goalText = 'Not specified'
    if (section1.bigGoal && section1.bigGoal !== 'custom') {
      const GOAL_OPTIONS = [
        { value: 'start_hobby', label: 'Start a new hobby that gets me outside and exercising' },
        { value: 'rally_with_friend', label: 'Be able to rally with my partner/friend and actually know what I\'m doing' },
        { value: 'build_confidence', label: 'Build my confidence to play again after a long break' },
        { value: 'join_doubles', label: 'Join a weekly doubles group' },
        { value: 'usta_league', label: 'Play in a USTA league or tournament' }
      ]
      const goal = GOAL_OPTIONS.find(g => g.value === section1.bigGoal)
      goalText = goal ? goal.label : section1.bigGoal
    } else if (section1.customGoal) {
      goalText = section1.customGoal
    }

    // Get skill ratings
    const skillRatings = section2?.skillRatings || {}
    const skillRatingsText = Object.entries(skillRatings)
      .filter(([_, rating]) => rating !== null && rating !== undefined)
      .map(([skill, rating]) => `${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${rating}/10`)
      .join(', ') || 'Not rated'

    // Prepare email content
    const emailSubject = `New Student Signup: ${studentName}`
    const emailBody = `
      <h2>New Student Signup</h2>
      <p><strong>Student Name:</strong> ${studentName}</p>
      <p><strong>Email:</strong> ${studentEmail}</p>
      <p><strong>Phone:</strong> ${studentPhone}</p>
      <p><strong>Signup Time:</strong> ${new Date(signupTimestamp).toLocaleString()}</p>
      <hr>
      <h3>Development Plan</h3>
      <p><strong>Goal:</strong> ${goalText}</p>
      <p><strong>Trigger Reason:</strong> ${section1.triggerReason || 'Not provided'}</p>
      <p><strong>Sunday Vision:</strong> ${section1.sundayVision || 'Not provided'}</p>
      <p><strong>Skill Ratings:</strong> ${skillRatingsText}</p>
      <hr>
      <p><a href="https://ojocoachingacademyapp.netlify.app/students/${studentId}">View Student Profile →</a></p>
    `

    // Store notification in database for scheduled processing
    // Create a table called 'scheduled_notifications' if it doesn't exist
    // Table structure: id, type, to_email, subject, html_body, text_body, scheduled_for, sent_at, created_at
    const { error: storeError } = await supabase
      .from('scheduled_notifications')
      .insert({
        type: 'onboarding_delayed',
        to_email: 'tobi@ojocoachingacademy.com',
        subject: emailSubject,
        html_body: emailBody,
        text_body: emailBody.replace(/<[^>]*>/g, ''),
        scheduled_for: scheduledTime,
        metadata: JSON.stringify({
          studentId,
          studentName,
          studentEmail,
          studentPhone,
          signupTimestamp
        }),
        created_at: new Date().toISOString()
      })

    if (storeError) {
      // If table doesn't exist, log error but don't fail
      console.error('Error storing scheduled notification (table may not exist):', storeError)
      // Fallback: send immediately if table doesn't exist
      const sendEmailUrl = `${process.env.URL || 'http://localhost:8888'}/.netlify/functions/send-email`
      await fetch(sendEmailUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'tobi@ojocoachingacademy.com',
          subject: emailSubject,
          html: emailBody,
          text: emailBody.replace(/<[^>]*>/g, '')
        })
      })
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Delayed notification scheduled for 30 minutes',
        scheduledFor: scheduledTime
      })
    }
  } catch (error) {
    console.error('Error scheduling delayed notification:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
