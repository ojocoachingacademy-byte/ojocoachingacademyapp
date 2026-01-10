/**
 * Netlify Scheduled Function: Send Lesson Reminders
 * Runs every Thursday at 2pm
 * Sends reminder emails to students with upcoming lessons (Friday-Monday)
 */

const { createClient } = require('@supabase/supabase-js')

// Milestone constants
const GOAL_OPTIONS = [
  { value: 'start_hobby', label: 'Start a new hobby that gets me outside and exercising' },
  { value: 'rally_with_friend', label: 'Be able to rally with my partner/friend and actually know what I\'m doing' },
  { value: 'build_confidence', label: 'Build my confidence to play again after a long break' },
  { value: 'join_doubles', label: 'Join a weekly doubles group' },
  { value: 'usta_league', label: 'Play in a USTA league or tournament' }
]

const MILESTONES = [
  { number: 1, name: "First Contact", description: "Hit 3 forehands over the net in a row" },
  { number: 2, name: "Both Wings", description: "Hit 3 backhands over the net in a row" },
  { number: 3, name: "Rally Baby", description: "Rally 5 balls back and forth with coach" },
  { number: 4, name: "Service Box", description: "Get a serve into the service box" },
  { number: 5, name: "Volley Touch", description: "Hit 5 forehand volleys in a row at net" },
  { number: 6, name: "Ten Streak", description: "Hit 10 forehands in a row over the net" },
  { number: 7, name: "Backhand Builder", description: "Hit 10 backhands in a row over the net" },
  { number: 8, name: "First Rally", description: "Rally 15 balls baseline to baseline" },
  { number: 9, name: "Service Progress", description: "Get 3 out of 10 serves in" },
  { number: 10, name: "Cross Court", description: "Hit 10 cross-court forehands in a row" },
  { number: 11, name: "Rally Champion", description: "Rally 25 balls without an error" },
  { number: 12, name: "Backhand Control", description: "Hit 10 cross-court backhands in a row" },
  { number: 13, name: "Service Consistency", description: "Get 6 out of 10 serves in" },
  { number: 14, name: "Down the Line", description: "Hit 5 down-the-line forehands in a row" },
  { number: 15, name: "Volley Victory", description: "Hit 5 backhand volleys in a row at the net" },
  { number: 16, name: "The Thirty", description: "Rally 30 balls without an error" },
  { number: 17, name: "Serve Zones", description: "Hit right and left side of service box on both sides (4 serves in a row)" },
  { number: 18, name: "Approach Shot", description: "Hit approach and finish point at net 3 times" },
  { number: 19, name: "Consistent Server", description: "Hold a service game in practice (4 points)" },
  { number: 20, name: "Game Winner", description: "Win a practice game to 4 points" },
  { number: 21, name: "The Fifty", description: "Rally 50 balls without an error" },
  { number: 22, name: "Serve Pressure", description: "Get 10 serves in a row into the box" },
  { number: 23, name: "Return Winner", description: "Win 3 points off return of serve in practice game" },
  { number: 24, name: "Break Point", description: "Break serve in a practice game" },
  { number: 25, name: "Set Player", description: "Complete a full practice set (win or lose)" },
  { number: 26, name: "Love Hold", description: "Hold serve without losing a point (4-0 game)" },
  { number: 27, name: "The Comeback", description: "Win a game after being down 0-40" },
  { number: 28, name: "Set Winner", description: "Win a practice set 6-4 or better" },
  { number: 29, name: "Match Player", description: "Win a full practice match (2 sets)" },
  { number: 30, name: "The Ace", description: "Hit an ace in a real match situation" }
]

const ADVANCED_MILESTONES = [
  { number: 1, name: "Depth Master", description: "Hit 15 groundstrokes in a row landing beyond service line" },
  { number: 2, name: "Serve Zones", description: "Place 8/10 serves in specific corners" },
  { number: 3, name: "Volley Reflex", description: "React to 10 quick volleys at net without errors" },
  { number: 4, name: "Return Positioning", description: "Return 8/10 serves landing in the deep third of the court" },
  { number: 5, name: "Rally Endurance", description: "Rally 75 balls without an unforced error" },
  { number: 6, name: "Service Hold", description: "Hold serve 4 games in a row in practice match" },
  { number: 7, name: "Break Through", description: "Break serve 3 times in one practice set" },
  { number: 8, name: "Dominant Win", description: "Win a practice set 6-2 or better" },
  { number: 9, name: "Three-Setter", description: "Complete a full best-of-3 match" },
  { number: 10, name: "The Comeback", description: "Win a set after losing the first set" },
  { number: 11, name: "Topspin Rally", description: "Rally 20 balls cross-court with ball landing in back half of court" },
  { number: 12, name: "Slice Mastery", description: "Execute 4 different slices: defensive, approach, drop, short angle (forehand and backhand)" },
  { number: 13, name: "Kick Serve", description: "Hit 6/10 kick serves with good bounce" },
  { number: 14, name: "Drop Shot", description: "Win 3 points with drop shots in practice match" },
  { number: 15, name: "Overhead Dominance", description: "Win 5 points in a row finishing with overheads" },
  { number: 16, name: "Pattern Player", description: "Execute a 3-shot pattern 5 times successfully" },
  { number: 17, name: "Weakness Hunter", description: "Identify and exploit opponent's weakness for a game" },
  { number: 18, name: "Surface Adapt", description: "Play on a different surface and win" },
  { number: 19, name: "Doubles Dynamics", description: "Win a doubles match with strong net positioning" },
  { number: 20, name: "Tournament Entry", description: "Win your first local tournament match" },
  { number: 21, name: "Tournament Run", description: "Win 3 rounds at a tournament" },
  { number: 22, name: "Tournament Winner", description: "Win a local tournament (any level)" },
  { number: 23, name: "Level Up", description: "Beat a 4.0 rated player in match play" },
  { number: 24, name: "Season Player", description: "Play 8 USTA matches in a year" },
  { number: 25, name: "Mental Game", description: "Win a match after being match point down" },
  { number: 26, name: "League Champion", description: "Win your USTA league season" },
  { number: 27, name: "Tournament Finals", description: "Reach finals of a sanctioned tournament" },
  { number: 28, name: "Elite Victory", description: "Beat a 4.5 or 5.0 rated player" },
  { number: 29, name: "Tournament Circuit", description: "Play 5+ sanctioned tournaments in a year" },
  { number: 30, name: "Rating Bump", description: "Your rating gets bumped up a level" }
]

function getGoalLabel(goalValue) {
  const goal = GOAL_OPTIONS.find(g => g.value === goalValue)
  return goal ? goal.label : goalValue
}

function getMilestoneName(milestoneNumber, playerLevel) {
  const milestones = playerLevel === 'advanced' ? ADVANCED_MILESTONES : MILESTONES
  const milestone = milestones.find(m => m.number === milestoneNumber)
  return milestone ? milestone.name : 'Unknown'
}

exports.handler = async (event, context) => {
  // Scheduled function - runs every Thursday at 2pm
  
  try {
    // Validate environment variables
    if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
      console.error('SendGrid configuration missing')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'SendGrid configuration missing' })
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

    // Get current date and 4 days from now
    const now = new Date()
    const fourDaysFromNow = new Date()
    fourDaysFromNow.setDate(fourDaysFromNow.getDate() + 4)

    // Query for upcoming lessons (Friday-Monday)
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select(`
        *,
        students!students_id_fkey(*)
      `)
      .eq('status', 'scheduled')
      .gte('lesson_date', now.toISOString())
      .lte('lesson_date', fourDaysFromNow.toISOString())
      .order('lesson_date', { ascending: true })

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
          message: 'No upcoming lessons found',
          sent: 0,
          failed: 0
        })
      }
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    }

    // Process each lesson
    for (const lesson of lessons) {
      try {
        const studentId = lesson.student_id
        
        // Fetch student profile for email
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', studentId)
          .single()

        if (profileError || !profile) {
          console.error(`Error fetching profile for student ${studentId}:`, profileError)
          results.failed++
          results.errors.push({ lessonId: lesson.id, error: 'Profile not found' })
          continue
        }

        // Fetch student data for development plan and player level
        const { data: student, error: studentError } = await supabase
          .from('students')
          .select('development_plan, player_level')
          .eq('id', studentId)
          .single()

        // Fetch incomplete homework
        const { data: homework, error: homeworkError } = await supabase
          .from('lesson_homework')
          .select('*')
          .eq('student_id', studentId)
          .eq('completed', false)
          .order('created_at', { ascending: false })

        // Fetch last lesson's learnings
        const { data: lastLesson, error: lastLessonError } = await supabase
          .from('lessons')
          .select('student_learnings')
          .eq('student_id', studentId)
          .eq('status', 'completed')
          .not('student_learnings', 'is', null)
          .order('lesson_date', { ascending: false })
          .limit(1)
          .single()

        // Parse learnings
        let learnings = []
        if (lastLesson && lastLesson.student_learnings) {
          // Parse numbered list: "1. learning\n2. learning\n3. learning"
          const lines = lastLesson.student_learnings.split('\n')
          learnings = lines
            .filter(line => line.trim().match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, '').trim())
            .slice(0, 3)
        }

        // Get next milestone
        let nextMilestone = null
        let goalText = null
        
        if (student && student.development_plan) {
          let plan = student.development_plan
          if (typeof plan === 'string') {
            try {
              plan = JSON.parse(plan)
            } catch (e) {
              console.error('Error parsing development plan:', e)
            }
          }

          if (plan?.section1?.bigGoal) {
            goalText = getGoalLabel(plan.section1.bigGoal)
          }

          // Get achieved milestones
          const playerLevel = student.player_level || 'beginner'
          const milestones = playerLevel === 'advanced' ? ADVANCED_MILESTONES : MILESTONES
          
          const { data: achievedMilestones } = await supabase
            .from('student_milestones')
            .select('milestone_number')
            .eq('student_id', studentId)
            .eq('milestone_level', playerLevel)

          const achievedNumbers = (achievedMilestones || []).map(m => m.milestone_number)
          
          // Find next unachieved milestone
          for (const milestone of milestones) {
            if (!achievedNumbers.includes(milestone.number)) {
              nextMilestone = milestone
              break
            }
          }
        }

        // Format lesson date
        const lessonDate = new Date(lesson.lesson_date)
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const dayName = dayNames[lessonDate.getDay()]
        const timeStr = lessonDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })

        // Build email
        const emailSubject = `Ready for ${dayName}'s Lesson? 🎾`
        const emailBody = buildEmailTemplate(
          profile.full_name || 'Student',
          dayName,
          timeStr,
          learnings,
          homework || [],
          nextMilestone,
          goalText
        )

        // Send email via SendGrid
        const sendGridUrl = 'https://api.sendgrid.com/v3/mail/send'
        const emailData = {
          personalizations: [{
            to: [{ email: profile.email, name: profile.full_name || 'Student' }],
            subject: emailSubject
          }],
          from: {
            email: process.env.SENDGRID_FROM_EMAIL,
            name: 'Coach Tobi - OJO Coaching Academy'
          },
          content: [{
            type: 'text/html',
            value: emailBody
          }]
        }

        const response = await fetch(sendGridUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`SendGrid error for lesson ${lesson.id}:`, errorText)
          results.failed++
          results.errors.push({ lessonId: lesson.id, error: errorText })
        } else {
          results.sent++
          console.log(`Email sent successfully for lesson ${lesson.id} to ${profile.email}`)
        }

      } catch (error) {
        console.error(`Error processing lesson ${lesson.id}:`, error)
        results.failed++
        results.errors.push({ lessonId: lesson.id, error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Processed ${lessons.length} lessons`,
        sent: results.sent,
        failed: results.failed,
        errors: results.errors
      })
    }

  } catch (error) {
    console.error('Error in send-lesson-reminders:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      })
    }
  }
}

// Email template function
function buildEmailTemplate(name, dayName, timeStr, learnings, homework, nextMilestone, goalText) {
  // Build learnings HTML
  let learningsHTML = ''
  if (learnings.length > 0) {
    learningsHTML = learnings.map(learning => 
      `<div style="margin: 8px 0; color: #333;">✓ ${learning}</div>`
    ).join('')
  } else {
    learningsHTML = '<div style="margin: 8px 0; color: #999; font-style: italic;">No previous learnings</div>'
  }

  // Build homework HTML
  let homeworkHTML = ''
  if (homework && homework.length > 0) {
    homeworkHTML = homework.map(hw => {
      const checkbox = hw.completed ? '✓' : '☐'
      const style = hw.completed 
        ? 'color: #9ca3af; text-decoration: line-through;' 
        : 'color: #333;'
      return `<div style="margin: 8px 0; ${style}">[${checkbox}] ${hw.homework_text}</div>`
    }).join('')
  } else {
    homeworkHTML = '<div style="margin: 8px 0; color: #999; font-style: italic;">No homework assigned</div>'
  }

  // Build milestone HTML
  let milestoneHTML = ''
  if (nextMilestone) {
    milestoneHTML = `<div style="margin: 8px 0; color: #333;">
      We're working toward Milestone #${nextMilestone.number}: <strong>${nextMilestone.name}</strong>
    </div>`
  } else {
    milestoneHTML = '<div style="margin: 8px 0; color: #999; font-style: italic;">No milestone set</div>'
  }

  // Build goal HTML
  let goalHTML = ''
  if (goalText) {
    goalHTML = `<div style="margin: 8px 0; color: #333;">Your goal: <strong>${goalText}</strong></div>`
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4B2C6C; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
        .section { margin: 20px 0; padding: 16px; background: white; border-radius: 6px; border-left: 4px solid #4B2C6C; }
        .section-title { font-size: 18px; font-weight: bold; color: #4B2C6C; margin-bottom: 12px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>OJO Coaching Academy 🎾</h1>
        </div>
        <div class="content">
          <h2>Hey ${name}!</h2>
          <p>Your lesson is coming up: <strong>${dayName} at ${timeStr}</strong></p>
          
          <div class="section">
            <div class="section-title">Last Time You Learned:</div>
            ${learningsHTML}
          </div>

          <div class="section">
            <div class="section-title">Your Homework:</div>
            ${homeworkHTML}
          </div>

          <div class="section">
            <div class="section-title">Next Up:</div>
            ${milestoneHTML}
            ${goalHTML}
          </div>

          <p style="margin-top: 24px;">See you ${dayName}!</p>
          <p>Best regards,<br><strong>Coach Tobi</strong></p>
        </div>
        <div class="footer">
          <p>OJO Coaching Academy | Tennis Coaching Excellence</p>
        </div>
      </div>
    </body>
    </html>
  `
}

