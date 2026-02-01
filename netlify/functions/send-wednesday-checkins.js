const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function getNextSunday() {
  const now = new Date()
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7
  const nextSunday = new Date(now)
  nextSunday.setDate(now.getDate() + daysUntilSunday)
  nextSunday.setHours(0, 0, 0, 0)
  return nextSunday
}

export const handler = async (event, context) => {
  // This function runs on a schedule: Wednesday at 12pm PST
  // Cron: 0 20 * * 3 (12pm PST = 8pm UTC Wednesday)
  
  // Test mode: Add ?test=true to the URL or set DRY_RUN=true in environment
  const isTestMode = event.queryStringParameters?.test === 'true' || process.env.DRY_RUN === 'true'
  
  // Filter by specific students: Add ?students=matt,kaitlin,karen,ryan (case insensitive)
  const studentsFilter = event.queryStringParameters?.students
  const targetStudentNames = studentsFilter 
    ? studentsFilter.split(',').map(name => name.trim().toLowerCase())
    : null
  
  console.log('=== WEDNESDAY CHECK-IN EMAILS STARTED ===')
  console.log('Time:', new Date().toISOString())
  console.log(`Mode: ${isTestMode ? 'TEST/DRY-RUN (no emails will be sent)' : 'PRODUCTION'}`)
  if (targetStudentNames) {
    console.log(`Filter: Only sending to: ${targetStudentNames.join(', ')}`)
  }

  try {
    // Get all students with upcoming Sunday lessons
    const nextSunday = getNextSunday()
    const nextSundayEnd = new Date(nextSunday)
    nextSundayEnd.setHours(23, 59, 59, 999)
    
    console.log('Looking for lessons on:', nextSunday.toISOString())
    
    // Fetch lessons first
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, lesson_date, practice_plan, practice_plan_time_estimate, practice_plan_completed, student_id, status')
      .gte('lesson_date', nextSunday.toISOString())
      .lte('lesson_date', nextSundayEnd.toISOString())
      .eq('status', 'scheduled')
    
    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
      throw lessonsError
    }

    console.log(`Found ${lessons?.length || 0} upcoming Sunday lessons`)
    
    // Debug: Log all lesson IDs and student IDs found
    if (lessons && lessons.length > 0) {
      console.log('Lesson details:')
      lessons.forEach(lesson => {
        console.log(`  - Lesson ID: ${lesson.id}, Student ID: ${lesson.student_id}, Date: ${lesson.lesson_date}, Status: ${lesson.status || 'N/A'}`)
      })
    }

    if (!lessons || lessons.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No upcoming Sunday lessons found' })
      }
    }

    // Get unique student IDs
    const studentIds = [...new Set(lessons.map(l => l.student_id))]
    console.log(`Unique student IDs: ${studentIds.join(', ')}`)
    
    // Fetch students with profiles using explicit foreign key
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        profiles!students_id_fkey(
          full_name,
          email
        )
      `)
      .in('id', studentIds)
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      throw studentsError
    }

    console.log(`Fetched ${students?.length || 0} students with profile data`)
    
    // Debug: Log student profile status
    if (students && students.length > 0) {
      console.log('Student profile status:')
      students.forEach(student => {
        const hasProfile = !!student.profiles
        const hasEmail = hasProfile && !!student.profiles.email
        const hasName = hasProfile && !!student.profiles.full_name
        console.log(`  - Student ID: ${student.id}, Has Profile: ${hasProfile}, Has Email: ${hasEmail}, Has Name: ${hasName}, Email: ${student.profiles?.email || 'N/A'}, Name: ${student.profiles?.full_name || 'N/A'}`)
      })
    }

    // Create a map of student_id to student data
    const studentMap = new Map()
    students.forEach(student => {
      if (student.profiles) {
        studentMap.set(student.id, student)
      } else {
        console.log(`WARNING: Student ${student.id} has no profile data`)
      }
    })

    // Combine lessons with student data
    const upcomingLessons = lessons
      .map(lesson => {
        const student = studentMap.get(lesson.student_id)
        if (!student || !student.profiles) {
          console.log(`WARNING: Lesson ${lesson.id} (Student ${lesson.student_id}) has no valid student profile`)
          return null
        }
        if (!student.profiles.email) {
          console.log(`WARNING: Lesson ${lesson.id} (Student ${lesson.student_id}, Name: ${student.profiles.full_name}) has no email`)
          return null
        }
        return {
          ...lesson,
          students: {
            id: student.id,
            profiles: student.profiles
          }
        }
      })
      .filter(Boolean) // Remove lessons without valid student profiles

    console.log(`Found ${upcomingLessons.length} lessons with valid student profiles`)
    
    // Debug: Log which students will receive emails
    if (upcomingLessons.length > 0) {
      console.log('Students who will receive emails:')
      upcomingLessons.forEach(lesson => {
        console.log(`  - ${lesson.students.profiles.full_name} (${lesson.students.profiles.email})`)
      })
    }
    
    // Debug: Log which students are missing
    const processedStudentIds = new Set(upcomingLessons.map(l => l.student_id))
    const missingStudentIds = studentIds.filter(id => !processedStudentIds.has(id))
    if (missingStudentIds.length > 0) {
      console.log(`WARNING: ${missingStudentIds.length} student(s) will NOT receive emails: ${missingStudentIds.join(', ')}`)
    }

    if (upcomingLessons.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No lessons with valid student profiles found' })
      }
    }

    // Get SendGrid configuration
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY
    const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL

    if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
      console.error('SendGrid not configured')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SendGrid not configured' })
      }
    }

    let sentCount = 0
    let errorCount = 0

    // Send email to each student
    for (const lesson of upcomingLessons) {
      try {
        const studentEmail = lesson.students.profiles.email
        const fullName = lesson.students.profiles.full_name
        const studentName = fullName.split(' ')[0]
        const fullNameLower = fullName.toLowerCase()
        
        // Filter by student names if specified
        if (targetStudentNames) {
          const matchesFilter = targetStudentNames.some(filterName => {
            // Check if first name or full name matches (case insensitive)
            return fullNameLower.includes(filterName) || 
                   studentName.toLowerCase() === filterName ||
                   fullNameLower === filterName
          })
          
          if (!matchesFilter) {
            console.log(`Skipping ${fullName} - not in filter list`)
            continue
          }
        }
        
        console.log(`Processing student: ${studentName} (${studentEmail})`)

        // Get last lesson for context
        const { data: lastLesson } = await supabase
          .from('lessons')
          .select('coach_feedback, student_learnings, lesson_date')
          .eq('student_id', lesson.student_id)
          .eq('status', 'completed')
          .order('lesson_date', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Build email content
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4B2C6C;">Midweek Check-In 👋</h2>
            
            <p style="line-height: 1.8; color: #333;">Hey ${studentName},</p>
            
            <p style="line-height: 1.8; color: #333;">Hope your week is going well!</p>
            
            ${lastLesson?.coach_feedback ? `
              <div style="background: #E8F5E9; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                <h3 style="color: #2E7D32; margin-top: 0;">🌟 Quick Win from Sunday:</h3>
                <p style="line-height: 1.6; color: #333;">${lastLesson.coach_feedback.substring(0, 200)}${lastLesson.coach_feedback.length > 200 ? '...' : ''}</p>
              </div>
            ` : ''}
            
            ${lesson.practice_plan ? `
              <div style="background: linear-gradient(135deg, #E9E3FF 0%, #F3F0FF 100%); padding: 20px; border-radius: 12px; margin: 20px 0; border: 3px solid #6A4C8C;">
                <h3 style="color: #4B2C6C; margin-top: 0;">🎯 THIS WEEK'S PRACTICE FOCUS</h3>
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0;">
                  <p style="line-height: 1.6; color: #333; font-size: 16px; margin: 0;">
                    ${lesson.practice_plan}
                  </p>
                </div>
                <div style="background: white; padding: 12px; border-radius: 8px; display: inline-block;">
                  <span style="font-weight: 600; color: #4B2C6C;">⏱️ ${lesson.practice_plan_time_estimate || 15} minutes</span>
                </div>
              </div>
            ` : ''}
            
            <div style="background: #F3F0FF; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <h3 style="color: #4B2C6C; margin-top: 0;">👀 Looking Ahead:</h3>
              <p style="line-height: 1.6; color: #333;">See you this Sunday for your lesson! We'll build on what we worked on last time.</p>
            </div>
            
            <div style="background: #FFF9C4; padding: 15px; border-radius: 8px; margin: 20px 0; border: 2px solid #F9A825;">
              <p style="margin: 0; color: #333; font-size: 15px;">
                <strong>Quick check-in:</strong> Have you had a chance to try the practice focus yet? 
                Even 5 minutes makes a difference! 💪
              </p>
              <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
                Hit reply and let me know how it's going!
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="https://ojocoachingacademyapp.netlify.app/dashboard" style="background: linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                Mark Practice as Complete
              </a>
            </div>
            
            <p style="color: #666; margin-top: 30px; line-height: 1.6;">
              Questions? Just hit reply!<br><br>
              - Coach Tobi
            </p>
          </div>
        `

        // Send email via SendGrid
        const emailData = {
          personalizations: [{
            to: [{ email: studentEmail }],
            subject: `Midweek Check-In - ${studentName}`
          }],
          from: { email: SENDGRID_FROM_EMAIL },
          content: [{
            type: 'text/html',
            value: emailHtml
          }]
        }

        if (isTestMode) {
          // Test mode: Just log what would be sent
          console.log(`[TEST MODE] Would send email to ${studentEmail}`)
          console.log(`[TEST MODE] Subject: ${emailData.personalizations[0].subject}`)
          console.log(`[TEST MODE] Student: ${studentName}`)
          sentCount++
        } else {
          // Production mode: Actually send the email
          const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SENDGRID_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailData)
          })

          if (response.ok) {
            console.log(`Email sent successfully to ${studentEmail}`)
            sentCount++
          } else {
            const errorText = await response.text()
            console.error(`Failed to send email to ${studentEmail}:`, response.status, errorText)
            errorCount++
          }
        }

      } catch (error) {
        console.error(`Error processing student ${lesson.student_id}:`, error)
        errorCount++
      }
    }

    console.log(`=== CHECK-IN EMAILS COMPLETE ===`)
    if (isTestMode) {
      console.log(`[TEST MODE] Would have sent: ${sentCount}, Errors: ${errorCount}`)
    } else {
      console.log(`Sent: ${sentCount}, Errors: ${errorCount}`)
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: isTestMode 
          ? `[TEST MODE] Would have sent ${sentCount} midweek check-in emails (no emails actually sent)`
          : `Sent ${sentCount} midweek check-in emails`,
        sent: sentCount,
        errors: errorCount,
        testMode: isTestMode
      })
    }

  } catch (error) {
    console.error('Error sending midweek emails:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send emails', message: error.message })
    }
  }
}


