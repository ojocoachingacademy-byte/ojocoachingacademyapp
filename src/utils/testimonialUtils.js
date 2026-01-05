/**
 * Testimonial Utility Functions
 * Simple utility functions for requesting and approving testimonials
 */

import { supabase } from '../supabaseClient'

/**
 * After a student completes 5+ lessons, prompt for testimonial
 * Creates a testimonial request and notification
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student name
 * @returns {Promise<Object>} Result object
 */
export const requestTestimonial = async (studentId, studentName) => {
  try {
    // Get student profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', studentId)
      .single()

    if (!profile) {
      return {
        success: false,
        error: 'Student profile not found'
      }
    }

    // Count completed lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('status', 'completed')

    if (lessonsError) throw lessonsError

    const completedLessonsCount = lessons?.length || 0

    // Only request if 5+ lessons completed
    if (completedLessonsCount < 5) {
      return {
        success: false,
        error: `Student has only completed ${completedLessonsCount} lessons. Need 5+ to request testimonial.`
      }
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('testimonial_requests')
      .select('id')
      .eq('student_id', studentId)
      .in('status', ['pending', 'submitted'])
      .limit(1)

    if (existingRequest && existingRequest.length > 0) {
      return {
        success: false,
        error: 'Testimonial request already exists for this student'
      }
    }

    // Create testimonial request
    const { data: request, error: requestError } = await supabase
      .from('testimonial_requests')
      .insert({
        student_id: studentId,
        lesson_count_at_request: completedLessonsCount,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) throw requestError

    // Create notification for the student
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert({
        user_id: studentId,
        type: 'testimonial_request',
        title: 'Share Your Experience!',
        message: `You've completed ${completedLessonsCount} lessons! We'd love to hear about your experience.`,
        action_url: '/testimonials/submit'
      })

    if (notificationError) {
      console.warn('Failed to create notification:', notificationError)
      // Don't fail the whole request if notification fails
    }

    return {
      success: true,
      request: request,
      studentName: profile.full_name,
      completedLessons: completedLessonsCount
    }
  } catch (error) {
    console.error('Error requesting testimonial:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Submit a testimonial (when student submits)
 * Creates testimonial with approved=false for coach to review
 * @param {string} studentId - Student ID
 * @param {string} studentName - Student name
 * @param {string} testimonialText - Testimonial text content
 * @param {number} rating - Rating (1-5)
 * @param {string} videoUrl - Optional video URL
 * @returns {Promise<Object>} Result object
 */
export const submitTestimonial = async (studentId, studentName, testimonialText, rating, videoUrl = null) => {
  try {
    // Count completed lessons at time of submission
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'completed')

    const lessonCount = lessons?.length || 0

    // Create testimonial with approved=false (coach approves in dashboard)
    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        student_id: studentId,
        testimonial_text: testimonialText,
        rating: rating,
        video_url: videoUrl,
        status: 'pending', // Coach approves in dashboard
        lesson_count_when_submitted: lessonCount,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // Update testimonial request status if exists
    const { data: request } = await supabase
      .from('testimonial_requests')
      .select('id')
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .limit(1)
      .single()

    if (request) {
      await supabase
        .from('testimonial_requests')
        .update({ 
          status: 'submitted',
          testimonial_id: data.id
        })
        .eq('id', request.id)
    }

    return {
      success: true,
      testimonial: data
    }
  } catch (error) {
    console.error('Error submitting testimonial:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Coach dashboard: Approve testimonials
 * Updates testimonial status to 'approved'
 * @param {string} testimonialId - Testimonial ID
 * @returns {Promise<Object>} Result object
 */
export const approveTestimonial = async (testimonialId) => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({ 
        status: 'approved',
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      testimonial: data
    }
  } catch (error) {
    console.error('Error approving testimonial:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Publish testimonial (make it public on website)
 * @param {string} testimonialId - Testimonial ID
 * @returns {Promise<Object>} Result object
 */
export const publishTestimonial = async (testimonialId) => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({ 
        status: 'published',
        published_at: new Date().toISOString(),
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      testimonial: data
    }
  } catch (error) {
    console.error('Error publishing testimonial:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Reject testimonial
 * @param {string} testimonialId - Testimonial ID
 * @returns {Promise<Object>} Result object
 */
export const rejectTestimonial = async (testimonialId) => {
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .update({ 
        status: 'rejected',
        updated_at: new Date().toISOString()
      })
      .eq('id', testimonialId)
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      testimonial: data
    }
  } catch (error) {
    console.error('Error rejecting testimonial:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

