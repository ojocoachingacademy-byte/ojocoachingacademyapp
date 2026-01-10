// Netlify Function to send emails via SendGrid or similar service
// This is a template - you'll need to configure your email service

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { to, subject, html, text } = JSON.parse(event.body)

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return {
        statusCode: 400,
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Email sent successfully' 
      })
    }
  } catch (error) {
    console.error('Error sending email:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}




