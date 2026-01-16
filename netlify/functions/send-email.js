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

    // TODO: Configure your email service (SendGrid, AWS SES, etc.)
    // Example with SendGrid:
    /*
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    const msg = {
      to: to,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@ojocoachingacademy.com',
      subject: subject,
      text: text || html.replace(/<[^>]*>/g, ''),
      html: html || text
    }

    await sgMail.send(msg)
    */

    // For now, just log (replace with actual email service)
    console.log('Email would be sent:', { to, subject })

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




