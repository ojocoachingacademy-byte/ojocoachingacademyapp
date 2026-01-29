// Netlify Function to notify student when their lesson plan is ready

const { createClient } = require('@supabase/supabase-js')

// Milestone constants (matching MilestonesConstants.js)
const MILESTONES = [
  { number: 1, name: "First Contact", description: "Hit 3 forehands over the net in a row", category: "Rookie" },
  { number: 2, name: "Both Wings", description: "Hit 3 backhands over the net in a row", category: "Rookie" },
  { number: 3, name: "Rally Baby", description: "Rally 5 balls back and forth with coach", category: "Rookie" },
  { number: 4, name: "Service Box", description: "Get a serve into the service box", category: "Rookie" },
  { number: 5, name: "Hit an Overhead", description: "Hit an overhead", category: "Rookie" },
  { number: 6, name: "5 Forehand Volleys", description: "Hit 5 forehand volleys in a row", category: "Rookie" },
  { number: 7, name: "10 Forehands", description: "Hit 10 forehands in a row over the net", category: "Learner" },
  { number: 8, name: "10 Backhands", description: "Hit 10 backhands in a row over the net", category: "Learner" },
  { number: 9, name: "5 Backhand Volleys", description: "Hit 5 backhand volleys in a row", category: "Learner" },
  { number: 10, name: "Baseline Rally", description: "Rally 15 balls baseline to baseline", category: "Learner" },
  { number: 11, name: "First Serves", description: "Get 3 out of 10 serves in", category: "Learner" },
  { number: 12, name: "Cross Court Forehand", description: "Hit 10 cross-court forehands in a row", category: "Learner" },
  { number: 13, name: "Cross Court Backhand", description: "Hit 10 backhands cross court in a row", category: "Competitor" },
  { number: 14, name: "Rally Champion", description: "Rally 25 balls without an error", category: "Competitor" },
  { number: 15, name: "Service Progress", description: "Get 6 out of 10 serves in", category: "Competitor" },
  { number: 16, name: "Down the Line", description: "Hit 5 down the line forehands in a row", category: "Competitor" },
  { number: 17, name: "Serve Zones", description: "Hit right and left side of service box on both sides (4 serves in a row)", category: "Advanced Beginner" },
  { number: 18, name: "Approach Shot", description: "Hit approach and finish point at net 3 times", category: "Advanced Beginner" },
  { number: 19, name: "Consistent Server", description: "Hold a service game in practice (4 points)", category: "Advanced Beginner" },
  { number: 20, name: "Game Winner", description: "Win a practice game to 4 points", category: "Advanced Beginner" },
  { number: 21, name: "The Fifty", description: "Rally 50 balls without an error", category: "Early Intermediate" },
  { number: 22, name: "Serve Pressure", description: "Get 10 serves in a row into the box", category: "Early Intermediate" },
  { number: 23, name: "Return Winner", description: "Win 3 points off return of serve in practice game", category: "Early Intermediate" },
  { number: 24, name: "Break Point", description: "Break serve in a practice game", category: "Early Intermediate" },
  { number: 25, name: "Set Player", description: "Complete a full practice set (win or lose)", category: "Early Intermediate" },
  { number: 26, name: "Love Hold", description: "Hold serve without losing a point (4-0 game)", category: "Match Ready" },
  { number: 27, name: "The Comeback", description: "Win a game after being down 0-40", category: "Match Ready" },
  { number: 28, name: "Set Winner", description: "Win a practice set 6-4 or better", category: "Match Ready" },
  { number: 29, name: "Match Player", description: "Win a full practice match (2 sets)", category: "Competitive" },
  { number: 30, name: "The Ace", description: "Hit an ace in a real match situation", category: "Competitive" },
]

// Camp definitions
const CAMPS = {
  rookie: { start: 1, end: 6, name: "Rookie", icon: "🌟" },
  learner: { start: 7, end: 12, name: "Learner", icon: "📚" },
  competitor: { start: 13, end: 18, name: "Competitor", icon: "🎯" },
  advanced: { start: 19, end: 24, name: "Advanced", icon: "💎" },
  elite: { start: 25, end: 30, name: "Elite", icon: "👑" }
}

// Pyramid layout: 1-2-3 structure
const PYRAMID_LAYOUT = [
  { start: 5, count: 1 }, // Top: [6]
  { start: 3, count: 2 }, // Middle: [4,5]
  { start: 0, count: 3 }, // Base: [1,2,3]
]

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

    // Get student data to determine player level
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('player_level')
      .eq('id', studentId)
      .single()

    const playerLevel = student?.player_level || 'beginner'

    // Get achieved milestones
    const { data: achievedMilestones, error: milestonesError } = await supabase
      .from('student_milestones')
      .select('milestone_number')
      .eq('student_id', studentId)
      .eq('milestone_level', playerLevel)

    if (milestonesError) {
      console.error('Error fetching milestones:', milestonesError)
    }

    const achievedNumbers = new Set((achievedMilestones || []).map(m => m.milestone_number))
    const totalAchieved = achievedNumbers.size
    const nextMilestoneNumber = totalAchieved + 1

    // Determine current camp
    let currentCamp = null
    let campProgress = null

    for (const [key, camp] of Object.entries(CAMPS)) {
      const campMilestones = MILESTONES.slice(camp.start - 1, camp.end)
      const achieved = campMilestones.filter(m => achievedNumbers.has(m.number)).length
      const total = campMilestones.length
      const isComplete = achieved === total
      const isCurrent = achieved > 0 && !isComplete

      if (isCurrent || (achieved === 0 && nextMilestoneNumber >= camp.start && nextMilestoneNumber <= camp.end)) {
        currentCamp = { ...camp, key }
        campProgress = { achieved, total, isComplete, isCurrent }
        break
      }
    }

    // If no current camp found, default to first incomplete camp or rookie
    if (!currentCamp) {
      for (const [key, camp] of Object.entries(CAMPS)) {
        const campMilestones = MILESTONES.slice(camp.start - 1, camp.end)
        const achieved = campMilestones.filter(m => achievedNumbers.has(m.number)).length
        const total = campMilestones.length
        if (achieved < total) {
          currentCamp = { ...camp, key }
          campProgress = { achieved, total, isComplete: false, isCurrent: achieved > 0 }
          break
        }
      }
      if (!currentCamp) {
        currentCamp = CAMPS.rookie
        campProgress = { achieved: 0, total: 6, isComplete: false, isCurrent: false }
      }
    }

    // Generate pyramid HTML for coach's view
    const generatePyramidHTML = (campStart, campEnd) => {
      const campMilestones = MILESTONES.slice(campStart - 1, campEnd)
      let html = '<div style="text-align: center; margin: 20px 0;">'
      
      PYRAMID_LAYOUT.forEach((rowConfig, rowIndex) => {
        const { start, count } = rowConfig
        const rowMilestones = campMilestones.slice(start, start + count)
        
        html += '<div style="display: flex; justify-content: center; gap: 12px; margin-bottom: 16px;">'
        
        rowMilestones.forEach(milestone => {
          const isAchieved = achievedNumbers.has(milestone.number)
          const isNextUp = !isAchieved && milestone.number === nextMilestoneNumber
          
          let circleStyle = 'width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px;'
          
          if (isAchieved) {
            circleStyle += 'background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: 2px solid #10b981;'
            html += `<div style="${circleStyle}" title="${milestone.name}">✓</div>`
          } else if (isNextUp) {
            circleStyle += 'background: white; color: #fbbf24; border: 3px solid #fbbf24;'
            html += `<div style="${circleStyle}" title="${milestone.name}">${milestone.number}</div>`
          } else {
            circleStyle += 'background: white; color: #6b7280; border: 2px solid #d1d5db;'
            html += `<div style="${circleStyle}" title="${milestone.name}">${milestone.number}</div>`
          }
        })
        
        html += '</div>'
      })
      
      html += '</div>'
      return html
    }

    const pyramidHTML = generatePyramidHTML(currentCamp.start, currentCamp.end)

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

    // Build email body with coach's view section
    const emailBody = `
      <h2>Hi ${studentName || 'there'}! 🎾</h2>
      <p>Great news! Your lesson plan for <strong>${formattedDate}</strong> is now available in the app.</p>
      
      <div style="background: #F3F0FF; padding: 1rem; border-radius: 8px; margin: 1.5rem 0;">
        <p style="margin: 0; font-style: italic;">"${planPreview}"</p>
      </div>
      
      <p>You can view the full lesson plan, practice tips, and everything you need to prepare by opening the Ojo Coaching Academy app.</p>
      
      <p style="margin-top: 2rem;">
        <a href="https://ojocoachingacademyapp.netlify.app/dashboard" 
           style="background: #4B2C6C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
          Open App →
        </a>
      </p>
      
      <!-- Coach's View: Tennis Mountain Progress -->
      <div style="margin-top: 3rem; padding: 24px; background: #F9FAFB; border-radius: 12px; border: 1px solid #E5E7EB;">
        <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1F2937; font-weight: 600;">🏔️ Coach's View: Your Tennis Mountain Progress</h3>
        <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 16px;">
          <div style="text-align: center; margin-bottom: 16px;">
            <div style="font-size: 24px; margin-bottom: 8px;">${currentCamp.icon}</div>
            <h4 style="margin: 0 0 4px 0; font-size: 18px; color: #1F2937; font-weight: 700;">${currentCamp.name.toUpperCase()} CAMP</h4>
            <p style="margin: 0; font-size: 14px; color: #6B7280;">Milestones ${currentCamp.start}-${currentCamp.end} • ${campProgress.achieved}/${campProgress.total} Complete</p>
          </div>
          ${pyramidHTML}
          <div style="text-align: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #E5E7EB;">
            <p style="margin: 0; font-size: 13px; color: #6B7280;">
              <strong>${totalAchieved} of 30</strong> milestones achieved
              ${nextMilestoneNumber <= 30 ? `• Next up: Milestone #${nextMilestoneNumber}` : '• All milestones complete! 🎉'}
            </p>
          </div>
        </div>
        <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-align: center;">
          Keep climbing! Each milestone brings you closer to your tennis goals. 💪
        </p>
      </div>
      
      <p style="margin-top: 2rem; color: #666; font-size: 0.9rem;">
        Keep building your skills! 💪<br>
        - Coach Tobi
      </p>
    `

    // Send email via send-email function
    const rawBase =
      process.env.DEPLOY_PRIME_URL ||
      process.env.URL ||
      'http://localhost:8888';

    const baseUrl = rawBase.startsWith('http')
      ? rawBase
      : `https://${rawBase}`;

    const sendEmailUrl = `${baseUrl}/.netlify/functions/send-email`;

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
        text: emailBody.replace(/<[^>]*>/g, '')
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
