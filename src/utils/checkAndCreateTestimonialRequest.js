/**
 * Check and Create Testimonial Request
 * Called when lessons are completed to automatically create testimonial requests
 */

import { supabase } from '../supabaseClient'
import { shouldRequestTestimonial, createTestimonialRequest } from './testimonialRequests'
import { sendTestimonialRequestEmail } from './testimonialEmailService'

/**
 * Check if student should get a testimonial request and create it
 * @param {string} studentId - Student ID
 * @param {number} completedLessonsCount - Number of completed lessons
 * @returns {Promise<Object>} Result object
 */
export async function checkAndCreateTestimonialRequest(studentId, completedLessonsCount) {
  try {
    // Check if student should be requested
    const shouldRequest = await shouldRequestTestimonial(studentId, completedLessonsCount)

    if (!shouldRequest) {
      return {
        success: true,
        requested: false,
        reason: 'Not eligible or already requested'
      }
    }

    // Create the request
    const result = await createTestimonialRequest(studentId, completedLessonsCount)

    if (result.success) {
      // Get student profile for email
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', studentId)
        .single()

      // Send testimonial request email
      if (profile?.email && profile?.full_name) {
        await sendTestimonialRequestEmail(
          profile.email,
          profile.full_name,
          completedLessonsCount
        )
      }

      return {
        success: true,
        requested: true,
        request: result.request
      }
    }

    return result
  } catch (error) {
    console.error('Error checking/creating testimonial request:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

