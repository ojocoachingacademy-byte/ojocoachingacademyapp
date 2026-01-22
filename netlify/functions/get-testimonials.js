/**
 * Netlify Function: Get Published Testimonials
 * API endpoint for website to fetch published testimonials
 * 
 * Usage: GET /.netlify/functions/get-testimonials
 * Query params:
 *   - featured: true/false (only featured testimonials)
 *   - limit: number (max testimonials to return)
 */

const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    // Validate environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )

    // Parse query parameters
    const { featured, limit } = event.queryStringParameters || {}
    const featuredOnly = featured === 'true'
    const limitNum = limit ? parseInt(limit) : null

    // Build query - fetch testimonials first, then get student profiles separately
    let query = supabase
      .from('testimonials')
      .select('id, testimonial_text, rating, video_url, featured, submitted_at, student_id')
      .eq('status', 'published')
      .order('featured', { ascending: false })
      .order('submitted_at', { ascending: false })

    if (featuredOnly) {
      query = query.eq('featured', true)
    }

    if (limitNum) {
      query = query.limit(limitNum)
    }

    const { data: testimonials, error } = await query

    if (error) {
      console.error('Error fetching testimonials:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch testimonials', details: error.message })
      }
    }

    if (!testimonials || testimonials.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          testimonials: [],
          count: 0
        })
      }
    }

    // Get unique student IDs
    const studentIds = [...new Set(testimonials.map(t => t.student_id).filter(Boolean))]
    
    // Fetch student profiles using explicit foreign key
    let studentMap = new Map()
    if (studentIds.length > 0) {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          profiles!students_id_fkey(full_name)
        `)
        .in('id', studentIds)
      
      if (!studentsError && students) {
        students.forEach(student => {
          if (student.profiles) {
            studentMap.set(student.id, student.profiles.full_name)
          }
        })
      }
    }

    // Transform data for website
    const formatted = testimonials.map(t => ({
      id: t.id,
      name: studentMap.get(t.student_id) || 'Anonymous',
      text: t.testimonial_text,
      rating: t.rating,
      videoUrl: t.video_url,
      featured: t.featured,
      date: t.submitted_at
    }))

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        testimonials: formatted,
        count: formatted.length
      })
    }

  } catch (error) {
    console.error('Error in get-testimonials function:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}

