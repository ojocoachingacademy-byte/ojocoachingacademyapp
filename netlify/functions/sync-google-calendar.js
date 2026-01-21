const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Initialize Google Calendar API with service account
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/calendar.readonly']
    })

    const calendar = google.calendar({ version: 'v3', auth })

    // Fetch events from next 6 weeks (42 days)
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString()

    const response = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    })

    const events = response.data.items || []
    console.log(`Fetched ${events.length} events from Google Calendar`)

    // Filter for "lesson with" events (case insensitive)
    const lessonEvents = events.filter(event => {
      const title = (event.summary || '').toLowerCase()
      return title.includes('lesson with')
    })

    console.log(`Found ${lessonEvents.length} lesson events`)

    // Get all students to match names
    const { data: studentsData } = await supabase
      .from('students')
      .select('id')
      .eq('is_active', true)

    const studentIds = (studentsData || []).map(s => s.id)
    
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)

    // Create map of full names to student IDs (case insensitive)
    const studentNameMap = new Map()
    if (profilesData) {
      profilesData.forEach(profile => {
        if (profile.full_name) {
          studentNameMap.set(profile.full_name.toLowerCase().trim(), profile.id)
        }
      })
    }

    let syncedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const event of lessonEvents) {
      try {
        // Extract student name(s) from "lesson with John Smith" or "lesson with John Smith and Jane Doe" format
        // Also handles titles like "lesson with John Smith (findtennislessons)"
        // Strategy: Extract only the name part (first name + last name) and ignore everything after
        const title = event.summary || ''
        const match = title.match(/lesson with (.+)/i)
        
        if (!match) {
          console.log(`Skipping event - no name found: ${title}`)
          skippedCount++
          continue
        }

        // Get everything after "lesson with"
        let namesPart = match[1].trim()
        console.log(`Original names part: "${namesPart}"`)
        
        // Remove everything in parentheses FIRST (e.g., "(findtennislessons)")
        namesPart = namesPart.replace(/\([^)]*\)/g, '').trim()
        
        // Remove everything in brackets
        namesPart = namesPart.replace(/\[[^\]]*\]/g, '').trim()
        
        // Remove everything after first occurrence of: dash, colon, or other punctuation
        // This handles cases like "John Smith - note" or "John Smith: note"
        namesPart = namesPart.split(/[-:–—]/)[0].trim()
        
        // Split by "and" to handle multiple students in semi-private lessons
        // For each student, extract only first name + last name (first 2 words)
        const studentNames = namesPart.split(/\s+and\s+/i).map(name => {
          // Remove any remaining parentheses/brackets
          let cleaned = name.replace(/[\(\[].*?[\)\]]/g, '').trim()
          
          // Extract only first 2 words (first name + last name)
          // This handles: "John Smith (findtennislessons)" -> "John Smith"
          const words = cleaned.split(/\s+/)
          if (words.length >= 2) {
            cleaned = `${words[0]} ${words[1]}`.trim()
          } else if (words.length === 1) {
            cleaned = words[0].trim()
          }
          
          return cleaned.toLowerCase()
        }).filter(name => name.length > 0 && name.split(/\s+/).length <= 2) // Only keep names with 1-2 words
        
        console.log(`Extracted student names:`, studentNames)

        // Parse lesson date/time (same for all students in this event)
        const lessonDate = new Date(event.start.dateTime || event.start.date)

        // Process each student name
        for (const studentName of studentNames) {
          const studentId = studentNameMap.get(studentName)

          if (!studentId) {
            console.log(`No student found for name: ${studentName}`)
            errorCount++
            continue
          }

          // Check if lesson already exists for THIS student with THIS google_calendar_id
          const { data: existingLessons } = await supabase
            .from('lessons')
            .select('id, metadata')
            .eq('student_id', studentId)
            .eq('lesson_date', lessonDate.toISOString())
            .limit(5)

          let existingLesson = null
          if (existingLessons) {
            existingLesson = existingLessons.find(lesson => {
              try {
                const metadata = typeof lesson.metadata === 'string' 
                  ? JSON.parse(lesson.metadata) 
                  : lesson.metadata
                return metadata?.google_calendar_id === event.id
              } catch {
                return false
              }
            })
          }

          if (existingLesson) {
            console.log(`Lesson already exists for ${studentName} on ${lessonDate.toISOString()}`)
            skippedCount++
            continue
          }

          // Create lesson for this student
          const { error: insertError } = await supabase
            .from('lessons')
            .insert([{
              student_id: studentId,
              lesson_date: lessonDate.toISOString(),
              location: event.location || 'Colina Del Sol Park',
              status: 'scheduled',
              metadata: {
                source: 'google_calendar',
                google_calendar_id: event.id,
                google_calendar_link: event.htmlLink,
                synced_at: new Date().toISOString(),
                original_title: event.summary,
                is_semi_private: studentNames.length > 1
              }
            }])

          if (insertError) {
            console.error(`Error creating lesson for ${studentName}:`, insertError)
            errorCount++
          } else {
            console.log(`Created lesson for ${studentName} on ${lessonDate.toISOString()}`)
            syncedCount++
          }
        }

      } catch (eventError) {
        console.error('Error processing event:', eventError)
        errorCount++
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
        total: lessonEvents.length
      })
    }

  } catch (error) {
    console.error('Sync error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to sync calendar',
        message: error.message 
      })
    }
  }
}

