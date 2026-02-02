const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  console.log('=== SCHEDULED CALENDAR SYNC STARTED ===')
  console.log('Time:', new Date().toISOString())

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
    const timeMin = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()  // 7 days ago
    const timeMax = new Date(Date.now() + 42 * 24 * 60 * 60 * 1000).toISOString()  // 6 weeks ahead

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
    let cancelledCount = 0

    // Collect all Google Calendar event IDs from fetched events
    const activeEventIds = new Set(lessonEvents.map(event => event.id))

    // Find and cancel lessons that no longer exist in Google Calendar
    // Check both scheduled AND completed lessons (completed lessons might have been moved/deleted)
    const { data: allLessonsWithCalendarId } = await supabase
      .from('lessons')
      .select('id, metadata, student_id, status, lesson_date')
      .in('status', ['scheduled', 'completed'])
      .not('metadata', 'is', null)

    console.log(`Checking ${allLessonsWithCalendarId?.length || 0} lessons with metadata for cancellation`)

    if (allLessonsWithCalendarId) {
      for (const lesson of allLessonsWithCalendarId) {
        try {
          const metadata = typeof lesson.metadata === 'string' 
            ? JSON.parse(lesson.metadata) 
            : lesson.metadata
          
          const googleCalendarId = metadata?.google_calendar_id
          
          if (googleCalendarId && !activeEventIds.has(googleCalendarId)) {
            // This lesson's Google Calendar event no longer exists
            if (lesson.status === 'scheduled') {
              // Mark scheduled lessons as cancelled
              const { error: cancelError } = await supabase
                .from('lessons')
                .update({ status: 'cancelled' })
                .eq('id', lesson.id)

              if (cancelError) {
                console.error(`Error cancelling scheduled lesson ${lesson.id}:`, cancelError)
                errorCount++
              } else {
                console.log(`Cancelled scheduled lesson ${lesson.id} - no longer in Google Calendar`)
                cancelledCount++
              }
            } else if (lesson.status === 'completed') {
              // For completed lessons, check if the lesson_date is more than 7 days old
              // If so, it was likely moved/deleted and we should note it
              const lessonDate = new Date(lesson.lesson_date)
              const now = new Date()
              const daysSinceLesson = (now - lessonDate) / (1000 * 60 * 60 * 24)
              
              if (daysSinceLesson > 7) {
                // Lesson is old and no longer in calendar - log it but don't change status
                console.log(`Completed lesson ${lesson.id} (${daysSinceLesson.toFixed(1)} days old) no longer in Google Calendar - may have been moved/deleted`)
              } else {
                console.log(`Completed lesson ${lesson.id} (${daysSinceLesson.toFixed(1)} days old) no longer in Google Calendar - recent, may have been moved`)
              }
            }
          }
        } catch (e) {
          console.error(`Error processing lesson ${lesson.id} for cancellation check:`, e)
        }
      }
    }

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
          // Also check for lessons on similar dates (within 1 day) that might be the same lesson moved
          const { data: allStudentLessons } = await supabase
            .from('lessons')
            .select('id, lesson_date, location, metadata')
            .eq('student_id', studentId)
            .limit(50) // Get more lessons to search through

          let existingLesson = null
          if (allStudentLessons) {
            // First, try to find by google_calendar_id
            existingLesson = allStudentLessons.find(lesson => {
              try {
                const metadata = typeof lesson.metadata === 'string' 
                  ? JSON.parse(lesson.metadata) 
                  : lesson.metadata
                return metadata?.google_calendar_id === event.id
              } catch {
                return false
              }
            })
            
            // If not found by google_calendar_id, check for lessons on similar dates (within 1 day)
            // This handles cases where a lesson was created manually and then moved in Google Calendar
            if (!existingLesson) {
              const newDate = lessonDate
              existingLesson = allStudentLessons.find(lesson => {
                const lessonDateObj = new Date(lesson.lesson_date)
                const timeDiff = Math.abs(newDate.getTime() - lessonDateObj.getTime())
                const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
                
                // If lesson is within 1 day of the new date, it might be the same lesson
                // Also check if it doesn't have a google_calendar_id (manually created)
                if (daysDiff <= 1) {
                  try {
                    const metadata = typeof lesson.metadata === 'string' 
                      ? JSON.parse(lesson.metadata) 
                      : lesson.metadata
                    // If it doesn't have google_calendar_id, it's likely the same lesson that was moved
                    return !metadata?.google_calendar_id
                  } catch {
                    return false
                  }
                }
                return false
              })
              
              if (existingLesson) {
                console.log(`Found existing lesson for ${studentName} on similar date (${new Date(existingLesson.lesson_date).toISOString()}) - will update with google_calendar_id`)
              }
            }
          }

          if (existingLesson) {
            // Get the full lesson to check status
            const { data: fullLesson } = await supabase
              .from('lessons')
              .select('status, lesson_date, location')
              .eq('id', existingLesson.id)
              .single()
            
            // Lesson exists - check if time or location has changed
            const existingDate = new Date(existingLesson.lesson_date)
            const newDate = lessonDate
            const existingLocation = existingLesson.location || 'Colina Del Sol Park'
            const newLocation = event.location || 'Colina Del Sol Park'
            
            // Compare dates more carefully (ignore milliseconds for comparison)
            const existingDateMs = Math.floor(existingDate.getTime() / 1000) * 1000
            const newDateMs = Math.floor(newDate.getTime() / 1000) * 1000
            const dateChanged = existingDateMs !== newDateMs
            const locationChanged = existingLocation !== newLocation
            
            if (dateChanged || locationChanged) {
              // Update the lesson (regardless of status - completed lessons can be moved too)
              const updateData = {}
              if (dateChanged) {
                updateData.lesson_date = newDate.toISOString()
                console.log(`Time changed for ${studentName} (status: ${fullLesson?.status || 'unknown'}): ${existingDate.toISOString()} -> ${newDate.toISOString()}`)
              }
              if (locationChanged) {
                updateData.location = newLocation
                console.log(`Location changed for ${studentName}: ${existingLocation} -> ${newLocation}`)
              }
              
              // Update metadata with new sync time
              try {
                const existingMetadata = typeof existingLesson.metadata === 'string' 
                  ? JSON.parse(existingLesson.metadata) 
                  : existingLesson.metadata
                
                updateData.metadata = {
                  ...existingMetadata,
                  synced_at: new Date().toISOString(),
                  google_calendar_link: event.htmlLink,
                  original_title: event.summary
                }
              } catch (e) {
                // If metadata parsing fails, create new metadata
                updateData.metadata = {
                  source: 'google_calendar',
                  google_calendar_id: event.id,
                  google_calendar_link: event.htmlLink,
                  synced_at: new Date().toISOString(),
                  original_title: event.summary,
                  is_semi_private: studentNames.length > 1
                }
              }

              const { error: updateError } = await supabase
                .from('lessons')
                .update(updateData)
                .eq('id', existingLesson.id)

              if (updateError) {
                console.error(`Error updating lesson for ${studentName}:`, updateError)
                errorCount++
              } else {
                console.log(`Updated lesson for ${studentName} on ${newDate.toISOString()}`)
                syncedCount++
                
                // After updating a lesson that was moved, check for and delete old duplicate lessons
                // that might exist on the old date (within 7 days) for the same student
                // These are likely the same lesson that was created manually or from a previous sync
                if (dateChanged) {
                  const oldDate = existingDate
                  const daysSinceOldDate = (newDate.getTime() - oldDate.getTime()) / (1000 * 60 * 60 * 24)
                  
                  // Only check if the date changed by more than 1 day (actual move, not just time adjustment)
                  if (Math.abs(daysSinceOldDate) > 1) {
                    // Find lessons on the old date (within 1 day window) that don't have google_calendar_id
                    // These are likely duplicates that should be deleted
                    const oldDateStart = new Date(oldDate)
                    oldDateStart.setHours(0, 0, 0, 0)
                    const oldDateEnd = new Date(oldDate)
                    oldDateEnd.setHours(23, 59, 59, 999)
                    
                    const { data: oldLessons } = await supabase
                      .from('lessons')
                      .select('id, metadata')
                      .eq('student_id', studentId)
                      .gte('lesson_date', oldDateStart.toISOString())
                      .lte('lesson_date', oldDateEnd.toISOString())
                      .neq('id', existingLesson.id) // Don't delete the one we just updated
                    
                    if (oldLessons && oldLessons.length > 0) {
                      for (const oldLesson of oldLessons) {
                        try {
                          const oldMetadata = typeof oldLesson.metadata === 'string' 
                            ? JSON.parse(oldLesson.metadata) 
                            : oldLesson.metadata
                          
                          // Only delete if it doesn't have a google_calendar_id (manually created duplicate)
                          if (!oldMetadata?.google_calendar_id) {
                            const { error: deleteError } = await supabase
                              .from('lessons')
                              .delete()
                              .eq('id', oldLesson.id)
                            
                            if (deleteError) {
                              console.error(`Error deleting old duplicate lesson ${oldLesson.id}:`, deleteError)
                            } else {
                              console.log(`Deleted old duplicate lesson ${oldLesson.id} for ${studentName} on old date ${oldDate.toISOString()}`)
                            }
                          }
                        } catch (e) {
                          console.error(`Error processing old lesson ${oldLesson.id} for deletion:`, e)
                        }
                      }
                    }
                  }
                }
              }
            } else {
              console.log(`Lesson already exists and unchanged for ${studentName} on ${lessonDate.toISOString()}`)
              skippedCount++
            }
            continue
          }

          // Create new lesson for this student
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

    console.log('=== SYNC COMPLETE ===')
    console.log(`Synced: ${syncedCount}, Skipped: ${skippedCount}, Cancelled: ${cancelledCount}, Errors: ${errorCount}`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        synced: syncedCount,
        skipped: skippedCount,
        cancelled: cancelledCount,
        errors: errorCount,
        total: lessonEvents.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error) {
    console.error('=== SYNC ERROR ===')
    console.error(error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to sync calendar',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }
}

