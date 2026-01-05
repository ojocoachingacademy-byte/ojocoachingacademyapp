/**
 * Export Testimonials Utility
 * Export testimonials for display on website
 */

import { supabase } from '../supabaseClient'

/**
 * Get published testimonials for website display
 * @param {Object} options - Export options
 * @param {boolean} options.featuredOnly - Only return featured testimonials
 * @param {number} options.limit - Maximum number of testimonials to return
 * @returns {Promise<Array>} Array of testimonials formatted for website
 */
export async function getPublishedTestimonials(options = {}) {
  try {
    const { featuredOnly = false, limit = null } = options

    let query = supabase
      .from('testimonials')
      .select(`
        id,
        testimonial_text,
        rating,
        video_url,
        featured,
        submitted_at,
        students!inner(
          profiles!inner(full_name)
        )
      `)
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('submitted_at', { ascending: false })

    if (featuredOnly) {
      query = query.eq('featured', true)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) throw error

    // Transform data for website
    const formatted = (data || []).map(t => ({
      id: t.id,
      name: t.students?.profiles?.full_name || 'Anonymous',
      text: t.testimonial_text,
      rating: t.rating,
      videoUrl: t.video_url,
      featured: t.featured,
      date: t.submitted_at
    }))

    return formatted
  } catch (error) {
    console.error('Error fetching published testimonials:', error)
    return []
  }
}

/**
 * Get testimonials as JSON for API endpoint
 * @param {Object} options - Export options
 * @returns {Promise<string>} JSON string of testimonials
 */
export async function getTestimonialsJSON(options = {}) {
  const testimonials = await getPublishedTestimonials(options)
  return JSON.stringify(testimonials, null, 2)
}

/**
 * Get testimonials formatted for HTML display
 * @param {Object} options - Export options
 * @returns {Promise<string>} HTML string
 */
export async function getTestimonialsHTML(options = {}) {
  const testimonials = await getPublishedTestimonials(options)

  if (testimonials.length === 0) {
    return '<p>No testimonials available.</p>'
  }

  let html = '<div class="testimonials-container">\n'

  testimonials.forEach(testimonial => {
    const stars = '★'.repeat(testimonial.rating) + '☆'.repeat(5 - testimonial.rating)
    const featuredClass = testimonial.featured ? ' featured' : ''
    
    html += `  <div class="testimonial${featuredClass}">\n`
    html += `    <div class="testimonial-header">\n`
    html += `      <div class="testimonial-name">${testimonial.name}</div>\n`
    html += `      <div class="testimonial-rating">${stars}</div>\n`
    html += `    </div>\n`
    html += `    <div class="testimonial-text">${testimonial.text}</div>\n`
    if (testimonial.videoUrl) {
      html += `    <a href="${testimonial.videoUrl}" class="testimonial-video-link" target="_blank">Watch Video Testimonial</a>\n`
    }
    html += `  </div>\n`
  })

  html += '</div>'

  return html
}

