/**
 * Netlify Function: Send Testimonial Emails
 * Server-side email sending using Brevo
 * 
 * Usage: POST /.netlify/functions/send-testimonial-email
 * Body: {
 *   type: 'request' | 'thankyou' | 'coach_notification',
 *   to: 'email@example.com',
 *   name: 'Student Name',
 *   lessonCount: 5 (optional, for request emails)
 * }
 */

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Validate environment variables
    const BREVO_API_KEY = process.env.BREVO_API_KEY
    const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL
    const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Coach Tobi - OJO Coaching Academy'
    const BREVO_REPLY_TO = process.env.BREVO_REPLY_TO

    if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Brevo configuration missing' })
      }
    }

    const { type, to, name, lessonCount } = JSON.parse(event.body)

    if (!type || !to || !name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: type, to, name' })
      }
    }

    let subject, htmlContent, senderName
    switch (type) {
      case 'request':
        subject = "We'd Love to Hear From You!"
        htmlContent = getTestimonialRequestEmailTemplate(name, lessonCount || 5)
        senderName = 'Coach Tobi - OJO Coaching Academy'
        break
      case 'thankyou':
        subject = 'Thank You for Your Testimonial!'
        htmlContent = getThankYouEmailTemplate(name)
        senderName = 'Coach Tobi - OJO Coaching Academy'
        break
      case 'coach_notification':
        subject = 'New Testimonial Submitted'
        htmlContent = getCoachNotificationEmailTemplate(name)
        senderName = 'OJO Coaching Academy'
        break
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email type' })
        }
    }

    const emailData = {
      sender: { name: senderName, email: BREVO_FROM_EMAIL },
      to: type === 'coach_notification' ? [{ email: to }] : [{ email: to, name }],
      subject,
      htmlContent,
      ...(BREVO_REPLY_TO && { replyTo: { email: BREVO_REPLY_TO } })
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Brevo error:', errorText)
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: 'Failed to send email', details: errorText })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    }

  } catch (error) {
    console.error('Error sending email:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}

// Email templates
function getTestimonialRequestEmailTemplate(studentName, lessonCount) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4B2C6C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OJO Coaching Academy</h1>
        </div>
        <div class="content">
          <h2>Hi ${studentName}!</h2>
          <p>Congratulations on completing ${lessonCount} lessons with us! 🎾</p>
          <p>We'd love to hear about your experience. Your feedback helps us improve and helps other players discover great coaching.</p>
          <p>Would you mind taking a moment to share your experience?</p>
          <div style="text-align: center;">
            <a href="https://app.ojocoachingacademy.com/dashboard" class="button">Submit Your Testimonial</a>
          </div>
          <p>Thank you for being part of the OJO Coaching Academy family!</p>
          <p>Best regards,<br><strong>Coach Tobi</strong></p>
        </div>
        <div class="footer">
          <p>OJO Coaching Academy | Tennis Coaching Excellence</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getThankYouEmailTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OJO Coaching Academy</h1>
        </div>
        <div class="content">
          <h2>Thank You, ${studentName}!</h2>
          <p>We received your testimonial and truly appreciate you taking the time to share your experience.</p>
          <p>Your feedback means the world to us and helps us continue to provide excellent coaching.</p>
          <p>We'll review your testimonial and may feature it on our website to help other players discover OJO Coaching Academy.</p>
          <p>Keep up the great work on the court! 🎾</p>
          <p>Best regards,<br><strong>Coach Tobi</strong></p>
        </div>
        <div class="footer">
          <p>OJO Coaching Academy | Tennis Coaching Excellence</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function getCoachNotificationEmailTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #4B2C6C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Testimonial Submitted</h1>
        </div>
        <div class="content">
          <p><strong>${studentName}</strong> has submitted a new testimonial!</p>
          <p>Review and approve it in your dashboard.</p>
          <div style="text-align: center;">
            <a href="https://app.ojocoachingacademy.com/coach/testimonials" class="button">Review Testimonials</a>
          </div>
        </div>
        <div class="footer">
          <p>OJO Coaching Academy | Tennis Coaching Excellence</p>
        </div>
      </div>
    </body>
    </html>
  `
}


