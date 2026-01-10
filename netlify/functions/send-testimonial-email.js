/**
 * Netlify Function: Send Testimonial Emails
 * Server-side email sending using SendGrid
 * 
 * Usage: POST /.netlify/functions/send-testimonial-email
 * Body: {
 *   type: 'request' | 'thankyou' | 'coach_notification',
 *   to: 'email@example.com',
 *   name: 'Student Name',
 *   lessonCount: 5 (optional, for request emails)
 * }
 */

exports.handler = async (event, context) => {
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
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SendGrid configuration missing' })
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

    // Import SendGrid (you'll need to install @sendgrid/mail in website repo)
    // For now, we'll use fetch to SendGrid API directly
    const sendGridUrl = 'https://api.sendgrid.com/v3/mail/send'

    let emailData = {}

    switch (type) {
      case 'request':
        emailData = {
          personalizations: [{
            to: [{ email: to, name: name }],
            subject: "We'd Love to Hear From You!"
          }],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'Coach Tobi - OJO Coaching Academy'
          },
          content: [{
            type: 'text/html',
            value: getTestimonialRequestEmailTemplate(name, lessonCount || 5)
          }]
        }
        break

      case 'thankyou':
        emailData = {
          personalizations: [{
            to: [{ email: to, name: name }],
            subject: 'Thank You for Your Testimonial!'
          }],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'Coach Tobi - OJO Coaching Academy'
          },
          content: [{
            type: 'text/html',
            value: getThankYouEmailTemplate(name)
          }]
        }
        break

      case 'coach_notification':
        emailData = {
          personalizations: [{
            to: [{ email: to }],
            subject: 'New Testimonial Submitted'
          }],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'OJO Coaching Academy'
          },
          content: [{
            type: 'text/html',
            value: getCoachNotificationEmailTemplate(name)
          }]
        }
        break

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid email type' })
        }
    }

    // Send email via SendGrid API
    const response = await fetch(sendGridUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', errorText)
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


