/**
 * Testimonial Request Utility
 * Automatically request testimonials from students after X lessons completed
 */

import { supabase } from '../supabaseClient'

const LESSONS_THRESHOLD = 5 // Request testimonial after 5 completed lessons

/**
 * Check if student should be requested for a testimonial
 * @param {string} studentId - Student ID
 * @param {number} completedLessonsCount - Number of completed lessons
 * @returns {Promise<boolean>} True if testimonial should be requested
 */
export async function shouldRequestTestimonial(studentId, completedLessonsCount) {
  try {
    // Only request if student has completed at least the threshold
    if (completedLessonsCount < LESSONS_THRESHOLD) {
      return false
    }

    // Check if student already has a pending or submitted testimonial request
    const { data: existingRequest } = await supabase
      .from('testimonial_requests')
      .select('id, status')
      .eq('student_id', studentId)
      .in('status', ['pending', 'submitted'])
      .limit(1)

    if (existingRequest && existingRequest.length > 0) {
      return false // Already requested
    }

    // Check if student already submitted a testimonial
    const { data: existingTestimonial } = await supabase
      .from('testimonials')
      .select('id')
      .eq('student_id', studentId)
      .limit(1)

    if (existingTestimonial && existingTestimonial.length > 0) {
      return false // Already submitted
    }

    return true
  } catch (error) {
    console.error('Error checking testimonial request eligibility:', error)
    return false
  }
}

/**
 * Create a testimonial request for a student
 * @param {string} studentId - Student ID
 * @param {number} lessonCount - Number of completed lessons
 * @returns {Promise<Object>} Result object
 */
export async function createTestimonialRequest(studentId, lessonCount) {
  try {
    const { data, error } = await supabase
      .from('testimonial_requests')
      .insert({
        student_id: studentId,
        lesson_count_at_request: lessonCount,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error

    return {
      success: true,
      request: data
    }
  } catch (error) {
    console.error('Error creating testimonial request:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Process testimonial requests for all eligible students
 * Called after lessons are completed
 * @param {Array} students - Array of students with completed lesson counts
 * @returns {Promise<Object>} Result object
 */
export async function processTestimonialRequests(students) {
  const results = {
    requested: 0,
    skipped: 0,
    errors: []
  }

  for (const student of students) {
    try {
      const shouldRequest = await shouldRequestTestimonial(
        student.id,
        student.completedLessonsCount || 0
      )

      if (shouldRequest) {
        const result = await createTestimonialRequest(
          student.id,
          student.completedLessonsCount || 0
        )

        if (result.success) {
          results.requested++
        } else {
          results.errors.push({
            studentId: student.id,
            error: result.error
          })
        }
      } else {
        results.skipped++
      }
    } catch (error) {
      results.errors.push({
        studentId: student.id,
        error: error.message
      })
    }
  }

  return results
}

