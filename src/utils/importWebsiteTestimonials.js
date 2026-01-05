/**
 * Import Website Testimonials to App
 * 
 * This utility imports existing testimonials from your website
 * into the Supabase testimonials table.
 * 
 * Usage:
 * 1. Export testimonials from website as JSON
 * 2. Format them according to the expected structure
 * 3. Call importWebsiteTestimonials(testimonialsData)
 */

import { supabase } from '../supabaseClient'

/**
 * Import testimonials from website
 * @param {Array} websiteTestimonials - Array of testimonial objects from website
 * @param {Object} options - Import options
 * @returns {Promise<Object>} Import result
 */
export async function importWebsiteTestimonials(websiteTestimonials, options = {}) {
  const {
    defaultStatus = 'published', // 'pending', 'approved', 'published'
    defaultFeatured = false,
    skipDuplicates = true
  } = options

  console.log(`📥 Importing ${websiteTestimonials.length} testimonials from website...`)

  let imported = 0
  let skipped = 0
  let errors = 0
  const errorsList = []

  for (const testimonial of websiteTestimonials) {
    try {
      // Map website testimonial structure to app structure
      const mappedTestimonial = mapWebsiteTestimonial(testimonial)

      // Check for duplicates (by student name or email)
      if (skipDuplicates) {
        const { data: existing } = await supabase
          .from('testimonials')
          .select('id')
          .eq('student_id', mappedTestimonial.student_id)
          .limit(1)

        if (existing && existing.length > 0) {
          console.log(`⏭️  Skipping duplicate: ${mappedTestimonial.student_name}`)
          skipped++
          continue
        }
      }

      // Insert testimonial
      const { data, error } = await supabase
        .from('testimonials')
        .insert({
          student_id: mappedTestimonial.student_id,
          testimonial_text: mappedTestimonial.text_content,
          rating: mappedTestimonial.rating,
          video_url: mappedTestimonial.video_url,
          status: defaultStatus,
          is_featured: mappedTestimonial.featured || defaultFeatured,
          submitted_at: mappedTestimonial.submitted_at || new Date().toISOString(),
          approved_at: defaultStatus === 'approved' || defaultStatus === 'published' 
            ? new Date().toISOString() 
            : null,
          published_at: defaultStatus === 'published' 
            ? new Date().toISOString() 
            : null
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      console.log(`✅ Imported: ${mappedTestimonial.student_name}`)
      imported++

    } catch (error) {
      console.error(`❌ Error importing testimonial:`, error)
      errors++
      errorsList.push({
        testimonial: testimonial.student_name || 'Unknown',
        error: error.message
      })
    }
  }

  console.log(`\n📊 Import Summary:`)
  console.log(`   ✅ Imported: ${imported}`)
  console.log(`   ⏭️  Skipped: ${skipped}`)
  console.log(`   ❌ Errors: ${errors}`)

  return {
    success: errors === 0,
    imported,
    skipped,
    errors,
    errorsList
  }
}

/**
 * Map website testimonial structure to app structure
 * @param {Object} websiteTestimonial - Testimonial from website
 * @returns {Object} Mapped testimonial for app
 */
async function mapWebsiteTestimonial(websiteTestimonial) {
  // Expected website structure (adjust based on your actual data):
  // {
  //   name: "Student Name",
  //   email: "student@example.com", // optional
  //   text: "Testimonial text...",
  //   rating: 5,
  //   videoUrl: "https://...",
  //   date: "2024-01-15",
  //   featured: true
  // }

  const studentName = websiteTestimonial.name || websiteTestimonial.student_name || websiteTestimonial.studentName
  const studentEmail = websiteTestimonial.email || websiteTestimonial.student_email || websiteTestimonial.studentEmail

  // Find or create student in database
  let studentId = null

  if (studentEmail) {
    // Try to find by email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', studentEmail)
      .single()

    if (profile) {
      studentId = profile.id
    }
  }

  if (!studentId && studentName) {
    // Try to find by name
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .ilike('full_name', `%${studentName}%`)
      .limit(1)

    if (profiles && profiles.length > 0) {
      studentId = profiles[0].id
    }
  }

  // If student not found, create a placeholder or use a default
  // For now, we'll require the student to exist
  if (!studentId) {
    throw new Error(`Student not found: ${studentName || studentEmail}. Please create student first or provide email.`)
  }

  return {
    student_id: studentId,
    student_name: studentName,
    text_content: websiteTestimonial.text || websiteTestimonial.testimonial_text || websiteTestimonial.text_content,
    rating: websiteTestimonial.rating || 5,
    video_url: websiteTestimonial.videoUrl || websiteTestimonial.video_url || websiteTestimonial.videoURL,
    featured: websiteTestimonial.featured || websiteTestimonial.is_featured || false,
    submitted_at: websiteTestimonial.date 
      ? new Date(websiteTestimonial.date).toISOString()
      : websiteTestimonial.submitted_at 
        ? new Date(websiteTestimonial.submitted_at).toISOString()
        : new Date().toISOString()
  }
}

/**
 * Example usage function
 * Call this from browser console or create a button in coach dashboard
 */
export async function importExampleWebsiteTestimonials() {
  // Example data structure - replace with your actual website testimonials
  const websiteTestimonials = [
    {
      name: "John Doe",
      email: "john@example.com", // optional
      text: "Amazing coaching experience!",
      rating: 5,
      videoUrl: "https://example.com/video1.mp4",
      date: "2024-01-15",
      featured: true
    },
    {
      name: "Jane Smith",
      email: "jane@example.com",
      text: "Best tennis coach ever!",
      rating: 5,
      videoUrl: "https://example.com/video2.mp4",
      date: "2024-02-20",
      featured: false
    }
  ]

  const result = await importWebsiteTestimonials(websiteTestimonials, {
    defaultStatus: 'published',
    defaultFeatured: false,
    skipDuplicates: true
  })

  if (result.success) {
    alert(`✅ Successfully imported ${result.imported} testimonials!`)
  } else {
    alert(`⚠️ Imported ${result.imported} testimonials with ${result.errors} errors. Check console for details.`)
  }

  return result
}

