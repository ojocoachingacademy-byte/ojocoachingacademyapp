const Anthropic = require('@anthropic-ai/sdk')

// Milestone constants
const MILESTONES = [
  { number: 1, name: "First Contact", description: "Hit 3 forehands over the net in a row", category: "Day 1 Beginner" },
  { number: 2, name: "Both Wings", description: "Hit 3 backhands over the net in a row", category: "Day 1 Beginner" },
  { number: 3, name: "Rally Baby", description: "Rally 5 balls back and forth with coach", category: "Day 1 Beginner" },
  { number: 4, name: "Service Box", description: "Get a serve into the service box", category: "Day 1 Beginner" },
  { number: 5, name: "Volley Touch", description: "Hit 5 forehand volleys in a row at net", category: "Day 1 Beginner" },
  { number: 6, name: "Ten Streak", description: "Hit 10 forehands in a row over the net", category: "Early Beginner" },
  { number: 7, name: "Backhand Builder", description: "Hit 10 backhands in a row over the net", category: "Early Beginner" },
  { number: 8, name: "First Rally", description: "Rally 15 balls baseline to baseline", category: "Early Beginner" },
  { number: 9, name: "Service Progress", description: "Get 3 out of 10 serves in", category: "Early Beginner" },
  { number: 10, name: "Cross Court", description: "Hit 10 cross-court forehands in a row", category: "Early Beginner" },
  { number: 11, name: "Rally Champion", description: "Rally 25 balls without an error", category: "Solid Beginner" },
  { number: 12, name: "Backhand Control", description: "Hit 10 cross-court backhands in a row", category: "Solid Beginner" },
  { number: 13, name: "Service Consistency", description: "Get 6 out of 10 serves in", category: "Solid Beginner" },
  { number: 14, name: "Down the Line", description: "Hit 5 down-the-line forehands in a row", category: "Solid Beginner" },
  { number: 15, name: "Volley Victory", description: "Hit 5 backhand volleys in a row at the net", category: "Solid Beginner" },
  { number: 16, name: "The Thirty", description: "Rally 30 balls without an error", category: "Advanced Beginner" },
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

const ADVANCED_MILESTONES = [
  { number: 1, name: "Depth Master", description: "Hit 15 groundstrokes in a row landing beyond service line", category: "Consistency & Control" },
  { number: 2, name: "Serve Zones", description: "Place 8/10 serves in specific corners", category: "Consistency & Control" },
  { number: 3, name: "Volley Reflex", description: "React to 10 quick volleys at net without errors", category: "Consistency & Control" },
  { number: 4, name: "Return Positioning", description: "Return 8/10 serves landing in the deep third of the court", category: "Consistency & Control" },
  { number: 5, name: "Rally Endurance", description: "Rally 75 balls without an unforced error", category: "Consistency & Control" },
  { number: 6, name: "Service Hold", description: "Hold serve 4 games in a row in practice match", category: "Match Play Fundamentals" },
  { number: 7, name: "Break Through", description: "Break serve 3 times in one practice set", category: "Match Play Fundamentals" },
  { number: 8, name: "Dominant Win", description: "Win a practice set 6-2 or better", category: "Match Play Fundamentals" },
  { number: 9, name: "Three-Setter", description: "Complete a full best-of-3 match", category: "Match Play Fundamentals" },
  { number: 10, name: "The Comeback", description: "Win a set after losing the first set", category: "Match Play Fundamentals" },
  { number: 11, name: "Topspin Rally", description: "Rally 20 balls cross-court with ball landing in back half of court", category: "Advanced Technique" },
  { number: 12, name: "Slice Mastery", description: "Execute 4 different slices: defensive, approach, drop, short angle (forehand and backhand)", category: "Advanced Technique" },
  { number: 13, name: "Kick Serve", description: "Hit 6/10 kick serves with good bounce", category: "Advanced Technique" },
  { number: 14, name: "Drop Shot", description: "Win 3 points with drop shots in practice match", category: "Advanced Technique" },
  { number: 15, name: "Overhead Dominance", description: "Win 5 points in a row finishing with overheads", category: "Advanced Technique" },
  { number: 16, name: "Pattern Player", description: "Execute a 3-shot pattern 5 times successfully", category: "Tactical Development" },
  { number: 17, name: "Weakness Hunter", description: "Identify and exploit opponent's weakness for a game", category: "Tactical Development" },
  { number: 18, name: "Surface Adapt", description: "Play on a different surface and win", category: "Tactical Development" },
  { number: 19, name: "Doubles Dynamics", description: "Win a doubles match with strong net positioning", category: "Tactical Development" },
  { number: 20, name: "Tournament Entry", description: "Win your first local tournament match", category: "Tactical Development" },
  { number: 21, name: "Tournament Run", description: "Win 3 rounds at a tournament", category: "Competitive Play" },
  { number: 22, name: "Tournament Winner", description: "Win a local tournament (any level)", category: "Competitive Play" },
  { number: 23, name: "Level Up", description: "Beat a 4.0 rated player in match play", category: "Competitive Play" },
  { number: 24, name: "Season Player", description: "Play 8 USTA matches in a year", category: "Competitive Play" },
  { number: 25, name: "Mental Game", description: "Win a match after being match point down", category: "Competitive Play" },
  { number: 26, name: "League Champion", description: "Win your USTA league season", category: "Advanced Competition" },
  { number: 27, name: "Tournament Finals", description: "Reach finals of a sanctioned tournament", category: "Advanced Competition" },
  { number: 28, name: "Elite Victory", description: "Beat a 4.5 or 5.0 rated player", category: "Advanced Competition" },
  { number: 29, name: "Tournament Circuit", description: "Play 5+ sanctioned tournaments in a year", category: "Advanced Competition" },
  { number: 30, name: "Rating Bump", description: "Your rating gets bumped up a level", category: "Advanced Competition" },
]

// Helper function to get goal label
const getGoalLabel = (goalValue) => {
  const goalOptions = [
    { value: 'start_hobby', label: 'Start a new hobby that gets me outside and exercising' },
    { value: 'rally_with_friend', label: 'Be able to rally with my partner/friend and actually know what I\'m doing' },
    { value: 'build_confidence', label: 'Build my confidence to play again after a long break' },
    { value: 'join_doubles', label: 'Join a weekly doubles group' },
    { value: 'usta_league', label: 'Play in a USTA league or tournament' }
  ]
  const goal = goalOptions.find(g => g.value === goalValue)
  return goal ? goal.label : goalValue
}

// Helper function to get milestone name
function getMilestoneName(milestoneNumber, playerLevel) {
  const milestones = playerLevel === 'advanced' ? ADVANCED_MILESTONES : MILESTONES
  const milestone = milestones.find(m => m.number === milestoneNumber)
  return milestone ? milestone.name : 'Unknown'
}

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse request body with new structure
    const { 
      studentName, 
      playerLevel = 'beginner',
      developmentPlan,
      currentMilestones = [],
      nextMilestone,
      lastLessonLearnings,
      pastLessonPlans = []
    } = JSON.parse(event.body)

    // Validate required fields
    if (!studentName || !playerLevel) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: studentName and playerLevel are required' })
      }
    }

    // Get API key from environment variable
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables')
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      }
    }

    // Initialize Anthropic client (server-side, no dangerouslyAllowBrowser needed)
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    // Parse development plan if it's a string
    let plan = developmentPlan
    if (typeof developmentPlan === 'string') {
      try {
        plan = JSON.parse(developmentPlan)
      } catch (e) {
        console.error('Error parsing development plan:', e)
        plan = null
      }
    }

    // Build prompt
    const prompt = `You are an expert tennis coach creating a personalized 60-minute lesson plan.

STUDENT CONTEXT:
Name: ${studentName}
Level: ${playerLevel === 'advanced' ? 'Advanced (3.5+ NTRP)' : 'Beginner/Intermediate'}

STUDENT'S GOAL:
${plan?.section1?.bigGoal ? 
  `Primary Goal: ${getGoalLabel(plan.section1.bigGoal)}
   Vision: ${plan.section1.sundayVision || 'Not specified'}
   Trigger: ${plan.section1.triggerReason || 'Not specified'}` 
  : 'Goal not set'}

PROGRESS TOWARD GOAL:
${currentMilestones.length > 0 
  ? `You've completed ${currentMilestones.length} milestones, most recently Milestone #${currentMilestones[currentMilestones.length - 1]}: ${getMilestoneName(currentMilestones[currentMilestones.length - 1], playerLevel)}`
  : 'No milestones completed yet'}
Next up: Milestone #${nextMilestone?.number || 'N/A'} - ${nextMilestone?.name || 'Not set'}: ${nextMilestone?.description || 'No milestone set'}
This gets you closer to your goal: ${getGoalLabel(plan?.section1?.bigGoal) || 'No goal set'}

LAST LESSON LEARNINGS:
${lastLessonLearnings || 'First lesson - no previous learnings'}

SKILL RATINGS (Current → Target):
${Object.entries(plan?.section2?.skillRatings || {}).map(([skill, rating]) => {
  const target = plan?.section2?.targetRatings?.[skill] || rating
  return `${skill.charAt(0).toUpperCase() + skill.slice(1)}: ${rating}/10 → ${target}/10`
}).join('\n') || 'No skill ratings available'}

RECENT LESSON HISTORY:
${pastLessonPlans?.slice(0, 2).join('\n---\n') || 'First lesson'}

---

CREATE TWO VERSIONS OF THE LESSON PLAN:

VERSION 1 - STUDENT VIEW (no coaching points):

# Where We Are on Tennis Mountain 🎾

**Last Lesson Recap:**
${lastLessonLearnings || 'First lesson - no previous learnings'}

**Your Progress:**
${currentMilestones.length > 0 
  ? `You've completed ${currentMilestones.length} milestones, most recently Milestone #${currentMilestones[currentMilestones.length - 1]}: ${getMilestoneName(currentMilestones[currentMilestones.length - 1], playerLevel)}`
  : 'Just getting started on your tennis journey'}
Next up: Milestone #${nextMilestone?.number || 'N/A'} - ${nextMilestone?.name || 'Not set'}: ${nextMilestone?.description || 'No milestone set'}
This gets you closer to your goal: ${getGoalLabel(plan?.section1?.bigGoal) || 'No goal set'}

**Today's Focus:**
[1-2 sentences on what this lesson builds toward and why]

---

## Lesson Plan (60 minutes)

**Section 1 (15 min): [Drill Name]**
[Clear description of what we're doing and why - be specific about the drill format]

**Section 2 (15 min): [Drill Name]**
[Building on Section 1, slightly more challenging - be specific]

**Section 3 (15 min): [Drill Name]**
[More advanced variation with SPECIFIC scenarios/consequences - don't be vague]

**Section 4 (15 min): Match Play**
[Game/point play with SPECIFIC tactical focus - e.g., "target opponent's backhand," "serve wide then approach net"]
${playerLevel === 'advanced' ? '[Competitive drills or practice games with specific patterns]' : '[Structured game play using today\'s focus]'}

---

VERSION 2 - COACH VIEW (with coaching points):

# Where We Are on Tennis Mountain 🎾

**Last Lesson Recap:**
${lastLessonLearnings || 'First lesson - no previous learnings'}

**Your Progress:**
${currentMilestones.length > 0 
  ? `You've completed ${currentMilestones.length} milestones, most recently Milestone #${currentMilestones[currentMilestones.length - 1]}: ${getMilestoneName(currentMilestones[currentMilestones.length - 1], playerLevel)}`
  : 'Just getting started'}
Next up: Milestone #${nextMilestone?.number || 'N/A'} - ${nextMilestone?.name || 'Not set'}: ${nextMilestone?.description || 'No milestone set'}
This gets you closer to your goal: ${getGoalLabel(plan?.section1?.bigGoal) || 'No goal set'}

**Today's Focus:**
[1-2 sentences on what this lesson builds toward]

---

## Lesson Plan (60 minutes)

**Section 1 (15 min): [Drill Name]**
[Clear description of drill]

**Coaching Point:**
- [ONLY the most relevant or important point for this section - one bullet max]

**Section 2 (15 min): [Drill Name]**
[Building on Section 1]

**Coaching Point:**
- [ONLY the most relevant or important point for this section - one bullet max]

**Section 3 (15 min): [Drill Name]**
[More advanced - include SPECIFIC consequences like "miss = 5 pushups" or SPECIFIC scenarios like "serve at 30-30, then deuce, then break point"]

**Coaching Point:**
- [ONLY the most relevant or important point for this section - one bullet max]

**Section 4 (15 min): Match Play**
[Game/point play with SPECIFIC tactics - e.g., "Play games where you must serve to backhand on first serve, then approach net on weak return"]

**Coaching Point:**
- [ONLY the most relevant or important point for this section - one bullet max]

---

IMPORTANT GUIDELINES:
1. Focus MUST tie directly to their weakest skill area (lowest current rating) OR the skill needed for their next milestone
2. If one skill needs major work, spend all 60 mins on it with 4 different drills that progress in difficulty
3. Section 4 ALWAYS involves match simulation - points, games, or competitive drills with SPECIFIC tactical instructions
4. Reference their milestone explicitly in "Today's Focus"
5. Build progressively: easier → harder across the 4 sections
6. Keep student version motivating and clear; coach version tactical and detailed
7. Use their actual goal as context throughout
8. Each coaching point is ONE bullet point per section - only include the most relevant or important coaching point for that section
9. Section 3 MUST include specific consequences or scenarios (e.g., "miss = run to net and back" or "serve at different game scores: 15-15, 30-30, deuce")
10. Section 4 MUST include specific tactical focus (e.g., "serve wide to forehand, follow to net," NOT generic "play practice games")
11. Be concrete and actionable in every section - avoid vague language

Generate both versions now.`

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const fullResponse = message.content[0].text

    // Parse both versions from the response
    let extractedStudentVersion = ''
    let extractedCoachVersion = ''

    // Split on version headers
    const version1Index = fullResponse.indexOf('VERSION 1')
    const version2Index = fullResponse.indexOf('VERSION 2')

    if (version1Index !== -1 && version2Index !== -1) {
      // Extract VERSION 1 (student view)
      extractedStudentVersion = fullResponse.substring(version1Index, version2Index).replace(/^VERSION 1[:\-\s]*/i, '').trim()
      
      // Extract VERSION 2 (coach view)
      extractedCoachVersion = fullResponse.substring(version2Index).replace(/^VERSION 2[:\-\s]*/i, '').trim()
    } else {
      // Fallback: if versions aren't clearly separated, try alternative parsing
      // Look for common patterns
      const studentPattern = /# Where We Are on Tennis Mountain|Last Lesson Recap|Your Progress|Today's Focus/i
      const coachPattern = /Coaching Points:/i
      
      if (studentPattern.test(fullResponse)) {
        // Try to extract student version (everything before "Coaching Points" sections)
        const coachStart = fullResponse.search(/VERSION 2|COACH|Coaching Points:/i)
        if (coachStart > 0) {
          extractedStudentVersion = fullResponse.substring(0, coachStart).trim()
          extractedCoachVersion = fullResponse.substring(coachStart).replace(/^VERSION 2[:\-\s]*/i, '').trim()
        } else {
          extractedStudentVersion = fullResponse
          extractedCoachVersion = fullResponse
        }
      } else {
        // No clear structure, return full response for both
        extractedStudentVersion = fullResponse
        extractedCoachVersion = fullResponse
      }
    }

    // Return both versions
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        studentPlan: extractedStudentVersion,
        coachPlan: extractedCoachVersion 
      })
    }
  } catch (error) {
    console.error('Error generating lesson plan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}



