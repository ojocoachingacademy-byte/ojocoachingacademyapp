/**
 * Testimonial Email Service
 * Handles sending emails for testimonial requests and notifications
 */

import { supabase } from '../supabaseClient'

// Email service configuration
// Uses Netlify Function to send emails via SendGrid (server-side)
const EMAIL_SERVICE_ENABLED = true
const NETLIFY_FUNCTION_URL = import.meta.env.VITE_NETLIFY_FUNCTION_URL || '/.netlify/functions/send-testimonial-email'

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
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'request',
        to: studentEmail,
        name: studentName,
        lessonCount: lessonCount || 5
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send email')
    }

    const result = await response.json()
    return {
      success: true,
      sent: true,
      message: 'Email sent successfully'
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
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'thankyou',
        to: studentEmail,
        name: studentName
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send email')
    }

    const result = await response.json()
    return {
      success: true,
      sent: true,
      message: 'Email sent successfully'
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
    const response = await fetch(NETLIFY_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'coach_notification',
        to: coachEmail,
        name: studentName
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send email')
    }

    const result = await response.json()
    return {
      success: true,
      sent: true,
      message: 'Email sent successfully'
    }
  } catch (error) {
    console.error('Error sending coach notification email:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// Email templates are now handled server-side in the Netlify function

