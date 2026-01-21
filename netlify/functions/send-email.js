// Netlify Function to send emails via SendGrid or similar service
// This is a template - you'll need to configure your email service

exports.handler = async (event, context) => {
  // CORS headers for browser requests
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse body - handle both string and object
    let bodyData
    if (typeof event.body === 'string') {
      bodyData = JSON.parse(event.body)
    } else {
      bodyData = event.body
    }

    const { to, subject, html, text } = bodyData

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, and html/text are required' })
      }
    }

    // Send email via SendGrid
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL

    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      console.error('SendGrid not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'SendGrid not configured' })
      }
    }

    const emailData = {
      personalizations: [{
        to: [{ email: to }],
        subject: subject
      }],
      from: { email: SENDGRID_FROM_EMAIL },
      content: [{
        type: 'text/html',
        value: html || text
      }]
    }

    if (text && html) {
      emailData.content.push({
        type: 'text/plain',
        value: text
      })
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', response.status, errorText)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to send email', details: errorText })
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Email sent successfully' 
      })
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}




