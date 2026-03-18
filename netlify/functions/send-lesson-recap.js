/**
 * Netlify Scheduled Function: Send Lesson Recap Emails
 * Runs every Monday at 12pm PST (8pm UTC)
 * Sends recap emails to students after their lessons
 * Recaps previous Sunday's lessons
 * Trigger: After coach completes lesson feedback
 */

const { createClient } = require('@supabase/supabase-js')

export const handler = async (event, context) => {
  // This function can be called:
  // 1. On a schedule (Monday 12pm PST = 8pm UTC) - sends recaps for previous Sunday's lessons
  // 2. Manually triggered after coach submits feedback
  
  console.log('=== LESSON RECAP EMAILS STARTED ===')
  console.log('Time:', new Date().toISOString())

  try {
    // Validate environment variables
    if (!process.env.BREVO_API_KEY || !process.env.BREVO_FROM_EMAIL) {
      console.error('Brevo configuration missing')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Brevo configuration missing' })
      }
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      }
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get today's date (Sunday) or use date from event body if manually triggered
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)

    // Fetch completed lessons from today that have coach feedback
    // First get lessons without joins to avoid relationship ambiguity
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, lesson_date, lesson_plan, student_lesson_plan, coach_feedback, practice_plan, practice_plan_time_estimate, student_id')
      .eq('status', 'completed')
      .not('coach_feedback', 'is', null)
      .gte('lesson_date', todayStart.toISOString())
      .lte('lesson_date', todayEnd.toISOString())
    
    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch lessons', details: lessonsError.message })
      }
    }

    if (!lessons || lessons.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'No completed lessons with feedback found for today',
          sent: 0,
          failed: 0
        })
      }
    }

    // Get unique student IDs
    const studentIds = [...new Set(lessons.map(l => l.student_id))]
    
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
      .not('profiles', 'is', null)
    
    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch students', details: studentsError.message })
      }
    }

    // Create a map of student_id to student data
    const studentMap = new Map()
    students.forEach(student => {
      if (student.profiles) {
        studentMap.set(student.id, student)
      }
    })

    // Combine lessons with student data
    const completedLessons = lessons
      .map(lesson => {
        const student = studentMap.get(lesson.student_id)
        if (!student || !student.profiles) {
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

    console.log(`Found ${completedLessons.length} completed lessons with valid student profiles`)


    const BREVO_API_KEY = process.env.BREVO_API_KEY
    const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL || process.env.SENDGRID_FROM_EMAIL
    const BREVO_FROM_NAME = process.env.BREVO_FROM_NAME || 'Coach Tobi - OJO Coaching Academy'
    const BREVO_REPLY_TO = process.env.BREVO_REPLY_TO

    let sentCount = 0
    let errorCount = 0
    const errors = []

    // Send recap email to each student
    for (const lesson of completedLessons) {
      try {
        const studentEmail = lesson.students.profiles.email
        const studentName = lesson.students.profiles.full_name
        const firstName = studentName.split(' ')[0]

        console.log(`Processing lesson recap for: ${firstName} (${studentEmail})`)

        // Build email HTML
        const emailHtml = buildRecapEmailTemplate(
          firstName,
          lesson.lesson_plan || lesson.student_lesson_plan || 'No lesson plan provided',
          lesson.coach_feedback,
          lesson.practice_plan,
          lesson.practice_plan_time_estimate,
          lesson.lesson_date
        )

        // Send email via Brevo
        const emailData = {
          sender: { name: BREVO_FROM_NAME, email: BREVO_FROM_EMAIL },
          to: [{ email: studentEmail, name: studentName }],
          subject: `Great Lesson Today, ${firstName}! 🎾`,
          htmlContent: emailHtml,
          ...(BREVO_REPLY_TO && { replyTo: { email: BREVO_REPLY_TO } })
        }

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': BREVO_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        })

        if (response.ok) {
          console.log(`Recap email sent successfully to ${studentEmail}`)
          sentCount++
        } else {
          const errorText = await response.text()
          console.error(`Failed to send recap email to ${studentEmail}:`, response.status, errorText)
          errorCount++
          errors.push({ studentEmail, error: errorText })
        }

      } catch (error) {
        console.error(`Error processing lesson ${lesson.id}:`, error)
        errorCount++
        errors.push({ lessonId: lesson.id, error: error.message })
      }
    }

    console.log(`=== RECAP EMAILS COMPLETE ===`)
    console.log(`Sent: ${sentCount}, Errors: ${errorCount}`)

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Sent ${sentCount} lesson recap emails`,
        sent: sentCount,
        failed: errorCount,
        errors: errors.length > 0 ? errors : undefined
      })
    }

  } catch (error) {
    console.error('Error in send-lesson-recap:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      })
    }
  }
}

function buildRecapEmailTemplate(name, lessonPlan, coachNotes, practicePlan, practicePlanTime, lessonDate) {
  const lessonDateFormatted = new Date(lessonDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%);
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .content {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 0 0 12px 12px;
        }
        .section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section-title {
          color: #4B2C6C;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .practice-plan-section {
          background: linear-gradient(135deg, #E9E3FF 0%, #F3F0FF 100%);
          border: 3px solid #6A4C8C;
          padding: 20px;
          border-radius: 12px;
          margin: 20px 0;
        }
        .practice-plan-content {
          background: white;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .time-badge {
          background: white;
          padding: 12px 20px;
          border-radius: 20px;
          display: inline-block;
          font-weight: 600;
          color: #4B2C6C;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .cta-button {
          background: linear-gradient(135deg, #4B2C6C 0%, #6A4C8C 100%);
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          display: inline-block;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Great Lesson Today, ${name}! 🎾</h1>
        <p>${lessonDateFormatted}</p>
      </div>
      
      <div class="content">
        <div class="section">
          <div class="section-title">What We Worked On:</div>
          <p style="line-height: 1.6; color: #333; white-space: pre-wrap;">${lessonPlan}</p>
        </div>
        
        <div class="section">
          <div class="section-title">My Notes:</div>
          <p style="line-height: 1.6; color: #333; white-space: pre-wrap;">${coachNotes}</p>
        </div>
        
        ${practicePlan ? `
          <div class="practice-plan-section">
            <div class="section-title">🎯 Your Practice Plan This Week</div>
            <div class="practice-plan-content">
              <p style="line-height: 1.6; color: #333; font-size: 16px; margin: 0;">
                ${practicePlan}
              </p>
            </div>
            <div class="time-badge">
              ⏱️ Estimated Time: ${practicePlanTime || 15} minutes
            </div>
            <p style="margin-top: 15px; font-style: italic; color: #666;">
              Check it off in your app once completed - I'll ask about it next lesson!
            </p>
          </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="https://ojocoachingacademyapp.netlify.app/dashboard" class="cta-button">
            View in App
          </a>
        </div>
        
        <div class="footer">
          <p>See you next Sunday!</p>
          <p><strong>- Coach Tobi</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
}


