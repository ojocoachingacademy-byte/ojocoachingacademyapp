// Netlify Function to notify student when their lesson plan is ready

import { createClient } from '@supabase/supabase-js'

export const handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    const { studentId, studentName, studentEmail, lessonId, lessonDate, lessonPlan } = JSON.parse(event.body)

    // Validate required fields
    if (!studentId || !studentEmail || !lessonId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: studentId, studentEmail, lessonId' })
      }
    }

    // Initialize Supabase client
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase configuration missing')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Check if this is the student's first lesson plan
    const { count: lessonPlanCount, error: countError } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .not('lesson_plan', 'is', null)

    if (countError) {
      console.error('Error counting lesson plans:', countError)
      // Continue anyway, default to not first
    }

    const isFirstLessonPlan = (lessonPlanCount || 0) <= 1

    // Get achieved milestones for caption
    const { data: achievedMilestones, error: milestonesError } = await supabase
      .from('student_milestones')
      .select('milestone_number')
      .eq('student_id', studentId)

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
    }

    const totalAchieved = (achievedMilestones || []).length

    // Build base site URL from event headers (works in local and production)
    let baseSiteUrl
    if (event.headers && event.headers.host) {
      const proto = event.headers['x-forwarded-proto'] || 'http'
      baseSiteUrl = `${proto}://${event.headers.host}`
    } else if (process.env.URL) {
      // process.env.URL already includes protocol (e.g., "https://site.netlify.app")
      baseSiteUrl = process.env.URL
    } else {
      baseSiteUrl = 'http://localhost:8888'
    }

    // Build image URL, app URL, and send-email URL
    const imageUrl = `${baseSiteUrl}/email/tennis-mountain-journey.png`
    const appUrl = `${baseSiteUrl}/dashboard`
    const sendEmailUrl = `${baseSiteUrl}/.netlify/functions/send-email`

    console.log('Base site URL:', baseSiteUrl)
    console.log('Image URL:', imageUrl)
    console.log('App URL:', appUrl)
    console.log('Send email URL:', sendEmailUrl)

    // Format lesson date
    let formattedDate = 'your upcoming lesson'
    if (lessonDate) {
      try {
        const dateStr = lessonDate.split('T')[0]
        const [year, month, day] = dateStr.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        formattedDate = date.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
        })
      } catch (error) {
        console.error('Error formatting lesson date:', error)
        formattedDate = lessonDate
      }
    }

    // Get lesson plan preview
    const planPreview = lessonPlan 
      ? (lessonPlan.length > 200 ? lessonPlan.substring(0, 200) + '...' : lessonPlan)
      : 'Your lesson plan is now available in the app.'

    // Set email subject based on whether it's first lesson plan
    const emailSubject = isFirstLessonPlan 
      ? 'Your First Lesson Plan is Ready!'
      : 'Your Lesson Plan is Ready!'

    // Build email body with email-safe HTML (table-based layout)
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 12px;">
                <!-- Header -->
                <tr>
                  <td style="padding: 40px 40px 20px 40px; text-align: center;">
                    <h2 style="margin: 0 0 10px 0; font-size: 24px; font-weight: 700; color: #1F2937;">Hi ${studentName || 'there'}! 🎾</h2>
                    <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.5;">Great news! Your lesson plan for <strong>${formattedDate}</strong> is now available in the app.</p>
                  </td>
                </tr>
                
                <!-- Lesson Plan Preview -->
                <tr>
                  <td style="padding: 0 40px 20px 40px;">
                    <div style="background: #F3F0FF; padding: 20px; border-radius: 8px;">
                      <p style="margin: 0; font-style: italic; font-size: 14px; color: #4B2C6C; line-height: 1.6;">"${planPreview}"</p>
                    </div>
                  </td>
                </tr>
                
                <!-- Main Content -->
                <tr>
                  <td style="padding: 0 40px 30px 40px;">
                    <p style="margin: 0 0 30px 0; font-size: 16px; color: #374151; line-height: 1.6;">You can view the full lesson plan, practice tips, and everything you need to prepare by opening the Ojo Coaching Academy app.</p>
                    
                    <!-- Open App Button -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="padding: 20px 0;">
                          <a href="${appUrl}" 
                             style="display: inline-block; background: #4B2C6C; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                            Open App →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                
                <!-- Coach's View: Tennis Mountain -->
                <tr>
                  <td style="padding: 0 40px 40px 40px;">
                    <div style="background: #F9FAFB; padding: 30px; border-radius: 12px; border: 1px solid #E5E7EB;">
                      <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1F2937; font-weight: 600; text-align: center;">🏔️ Coach's View: Your Tennis Mountain Journey</h3>
                      
                      <!-- Tennis Mountain Image -->
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                        <tr>
                          <td align="center" style="padding: 0 0 20px 0;">
                            <img src="${imageUrl}" 
                                 alt="Tennis Mountain Journey" 
                                 width="560" 
                                 border="0"
                                 style="width: 100%; max-width: 560px; height: auto; border-radius: 12px; display: block; margin: 0 auto;" />
                            <p style="margin: 12px 0 0 0; font-size: 13px; color: #6B7280; line-height: 1.4;">
                              Open the app to view your Tennis Mountain
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding: 0;">
                            <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5;">
                              <strong>${totalAchieved} of 30</strong> milestones achieved • Keep climbing 💪
                            </p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; color: #6B7280;">
                              If you can't see the image, <a href="${appUrl}" style="color: #4B2C6C; text-decoration: underline;">open the app</a> to view your Tennis Mountain progress.
                            </p>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0 0 0; font-size: 12px; color: #9CA3AF; text-align: center; line-height: 1.5;">
                        Keep climbing! Each milestone brings you closer to your tennis goals. 💪
                      </p>
                    </div>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="padding: 0 40px 40px 40px; text-align: center;">
                    <p style="margin: 0; color: #6B7280; font-size: 14px; line-height: 1.6;">
                      Keep building your skills! 💪<br>
                      - Coach Tobi
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `

    console.log('Calling send-email function at:', sendEmailUrl)
    console.log('Email details:', { to: studentEmail, subject: emailSubject, isFirstLessonPlan })

    const sendEmailResponse = await fetch(sendEmailUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: studentEmail,
        subject: emailSubject,
        html: emailBody,
        text: emailBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
        category: 'lesson-plan-ready'
      })
    })

    if (!sendEmailResponse.ok) {
      const errorText = await sendEmailResponse.text()
      console.error('Send-email function failed:', {
        status: sendEmailResponse.status,
        statusText: sendEmailResponse.statusText,
        error: errorText
      })
      throw new Error(`Failed to send email: ${sendEmailResponse.status} - ${errorText}`)
    }
    
    const emailResult = await sendEmailResponse.json()
    console.log('Email sent successfully:', emailResult)

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        success: true,
        message: 'Lesson plan notification sent successfully',
        isFirstLessonPlan
      })
    }
  } catch (error) {
    console.error('Error sending lesson plan notification:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}
