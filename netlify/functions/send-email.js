// Netlify Function to send emails via Brevo (formerly Sendinblue)

export const handler = async (event, context) => {
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

    // Send email via Brevo
    const BREVO_API_KEY = process.env.BREVO_API_KEY
    const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL
    const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Coach Tobi'
    const BREVO_REPLY_TO = process.env.BREVO_REPLY_TO

    if (!BREVO_API_KEY || !BREVO_FROM_EMAIL) {
      console.error('Brevo not configured')
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Brevo not configured' })
      }
    }

    const emailData = {
      sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
      to: [{ email: to }],
      subject,
      ...(html ? { htmlContent: html } : { textContent: text }),
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
      console.error('Brevo error:', response.status, errorText)
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




