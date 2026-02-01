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
    const emailPayload = {
      to: studentEmail,
      subject: emailSubject,
      html: emailBody,
      text: emailBody.replace(/<[^>]*>/g, '')
    }

    let emailResult

    // In local dev, calling localhost from inside a function often fails ("fetch failed").
    // Invoke the send-email handler directly to avoid the HTTP round-trip.
    const baseUrl = process.env.DEPLOY_PRIME_URL
      ? `https://${process.env.DEPLOY_PRIME_URL}`
      : (process.env.URL || 'http://localhost:8888')
    const isLocalDev = baseUrl.includes('localhost') || process.env.NETLIFY_DEV === 'true'

    if (isLocalDev) {
      const { handler: sendEmailHandler } = await import('./send-email.js')
      const mockEvent = {
        httpMethod: 'POST',
        body: JSON.stringify(emailPayload)
      }
      const result = await sendEmailHandler(mockEvent, {})
      if (result.statusCode !== 200) {
        const errBody = typeof result.body === 'string' ? result.body : JSON.stringify(result.body)
        let errMsg = errBody
        try {
          const parsed = JSON.parse(errBody)
          errMsg = parsed.error || parsed.details || errBody
        } catch (_) { /* use errBody */ }
        console.error('Send-email (direct) failed:', result.statusCode, errMsg)
        throw new Error(errMsg)
      }
      emailResult = typeof result.body === 'string' ? JSON.parse(result.body) : result.body
      console.log('Email sent successfully (direct):', emailResult)
    } else {
      const sendEmailUrl = `${baseUrl}/.netlify/functions/send-email`
      console.log('Calling send-email function at:', sendEmailUrl)
      console.log('Email details:', { to: studentEmail, subject: emailSubject })

      const sendEmailResponse = await fetch(sendEmailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailPayload)
      })

      if (!sendEmailResponse.ok) {
        const errorText = await sendEmailResponse.text()
        console.error('Send-email function failed:', {
          status: sendEmailResponse.status,
          statusText: sendEmailResponse.statusText,
          error: errorText
        })
        throw new Error(`Failed to send email: ${sendEmailResponse.status} - ${errorText}`)
      }
      emailResult = await sendEmailResponse.json()
      console.log('Email sent successfully:', emailResult)
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
    const message = error.message || 'Internal server error'
    const hint = message === 'fetch failed'
      ? ' (Check SendGrid env vars SENDGRID_API_KEY / SENDGRID_FROM_EMAIL, or invoke send-email directly.)'
      : ''
    return {
      statusCode: 500,
      body: JSON.stringify({ error: message + hint })
    }
  }
}
