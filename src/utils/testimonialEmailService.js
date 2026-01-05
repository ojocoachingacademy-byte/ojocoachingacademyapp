/**
 * Testimonial Email Service
 * Handles sending emails for testimonial requests and notifications
 */

import { supabase } from '../supabaseClient'

// Email service configuration
// You can integrate with SendGrid, Resend, or your preferred email service
const EMAIL_SERVICE_ENABLED = false // Set to true when email service is configured

/**
 * Send testimonial request email to student
 * @param {string} studentEmail - Student email address
 * @param {string} studentName - Student name
 * @param {number} lessonCount - Number of lessons completed
 * @returns {Promise<Object>} Result object
 */
export async function sendTestimonialRequestEmail(studentEmail, studentName, lessonCount) {
  if (!EMAIL_SERVICE_ENABLED) {
    console.log('Email service not enabled. Would send testimonial request email to:', studentEmail)
    return { success: true, sent: false, reason: 'Email service not configured' }
  }

  try {
    // TODO: Integrate with your email service (SendGrid, Resend, etc.)
    // Example with SendGrid:
    /*
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: studentEmail, name: studentName }],
          subject: 'We\'d Love to Hear From You!'
        }],
        from: { email: 'coach@ojocoachingacademy.com', name: 'Coach Tobi' },
        content: [{
          type: 'text/html',
          value: getTestimonialRequestEmailTemplate(studentName, lessonCount)
        }]
      })
    })
    */

    // For now, log the email that would be sent
    console.log('Testimonial request email template:', {
      to: studentEmail,
      subject: "We'd Love to Hear From You!",
      template: getTestimonialRequestEmailTemplate(studentName, lessonCount)
    })

    return {
      success: true,
      sent: false, // Set to true when email is actually sent
      message: 'Email queued for sending'
    }
  } catch (error) {
    console.error('Error sending testimonial request email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send thank you email after testimonial submission
 * @param {string} studentEmail - Student email address
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} Result object
 */
export async function sendThankYouEmail(studentEmail, studentName) {
  if (!EMAIL_SERVICE_ENABLED) {
    console.log('Email service not enabled. Would send thank you email to:', studentEmail)
    return { success: true, sent: false, reason: 'Email service not configured' }
  }

  try {
    // TODO: Integrate with email service
    console.log('Thank you email template:', {
      to: studentEmail,
      subject: 'Thank You for Your Testimonial!',
      template: getThankYouEmailTemplate(studentName)
    })

    return {
      success: true,
      sent: false,
      message: 'Email queued for sending'
    }
  } catch (error) {
    console.error('Error sending thank you email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send notification email to coach when new testimonial is submitted
 * @param {string} coachEmail - Coach email address
 * @param {string} studentName - Student name who submitted
 * @returns {Promise<Object>} Result object
 */
export async function sendCoachNotificationEmail(coachEmail, studentName) {
  if (!EMAIL_SERVICE_ENABLED) {
    console.log('Email service not enabled. Would send coach notification to:', coachEmail)
    return { success: true, sent: false, reason: 'Email service not configured' }
  }

  try {
    // TODO: Integrate with email service
    console.log('Coach notification email template:', {
      to: coachEmail,
      subject: 'New Testimonial Submitted',
      template: getCoachNotificationEmailTemplate(studentName)
    })

    return {
      success: true,
      sent: false,
      message: 'Email queued for sending'
    }
  } catch (error) {
    console.error('Error sending coach notification email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get testimonial request email template
 */
function getTestimonialRequestEmailTemplate(studentName, lessonCount) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4B2C6C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
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
          <a href="${window.location.origin}/dashboard" class="button">Submit Your Testimonial</a>
          <p>Thank you for being part of the OJO Coaching Academy family!</p>
          <p>Best regards,<br>Coach Tobi</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get thank you email template
 */
function getThankYouEmailTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
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
          <p>Best regards,<br>Coach Tobi</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Get coach notification email template
 */
function getCoachNotificationEmailTemplate(studentName) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .button { display: inline-block; padding: 12px 24px; background: #4B2C6C; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
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
          <a href="${window.location.origin}/coach/testimonials" class="button">Review Testimonials</a>
        </div>
      </div>
    </body>
    </html>
  `
}

