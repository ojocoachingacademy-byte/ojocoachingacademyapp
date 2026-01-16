// Netlify Function to notify student when their first lesson plan is ready

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { studentId, studentName, studentEmail, lessonId, lessonDate, lessonPlan } = JSON.parse(event.body)

    // Validate required fields
    if (!studentId || !studentEmail || !lessonId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: studentId, studentEmail, lessonId' })
      }
    }

    // Check if this is the student's first lesson plan
    // We'll check this in the calling code, but include it here for safety
    const isFirstLessonPlan = true // Assume it's the first if this function is called

    if (!isFirstLessonPlan) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true,
          message: 'Not first lesson plan, skipping notification'
        })
      }
    }

    // Format lesson date
    const formattedDate = lessonDate 
      ? new Date(lessonDate).toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })
      : 'your upcoming lesson'

    // Get lesson plan preview (first 200 chars)
    const planPreview = lessonPlan 
      ? (lessonPlan.length > 200 ? lessonPlan.substring(0, 200) + '...' : lessonPlan)
      : 'Your lesson plan is now available in the app.'

    const emailSubject = 'Your First Lesson Plan is Ready!'
    const emailBody = `
      <h2>Hi ${studentName || 'there'}! 🎾</h2>
      <p>Great news! Your lesson plan for <strong>${formattedDate}</strong> is now available in the app.</p>
      
      <div style="background: #F3F0FF; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p style="margin: 0; font-style: italic;">"${planPreview}"</p>
      </div>
      
      <p>You can view the full lesson plan, practice tips, and everything you need to prepare by opening the Ojo Coaching Academy app.</p>
      
      <p style="margin-top: 2rem;">
        <a href="https://ojocoachingacademyapp.netlify.app/dashboard" 
           style="background: #4B2C6C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Open App →
        </a>
      </p>
      
      <p style="margin-top: 2rem; color: #666; font-size: 0.9rem;">
        Keep building your skills! 💪<br>
        - Coach Tobi
      </p>
    `

    // Send email via send-email function
    const sendEmailResponse = await fetch(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: studentEmail,
        subject: emailSubject,
        html: emailBody,
        text: emailBody.replace(/<[^>]*>/g, '')
      })
    })

    if (!sendEmailResponse.ok) {
      throw new Error('Failed to send email')
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Lesson plan notification sent successfully'
      })
    }
  } catch (error) {
    console.error('Error sending lesson plan notification:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
