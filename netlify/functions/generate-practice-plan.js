const Anthropic = require('@anthropic-ai/sdk')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { studentName, goals, skillLevel, todayLessonPlan, todayNotes, recentLessons } = JSON.parse(event.body)
    
    // Use server-side environment variable only (NOT VITE_ prefixed)
    const apiKey = process.env.ANTHROPIC_API_KEY
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Anthropic API key not configured' })
      }
    }
    
    const anthropic = new Anthropic({
      apiKey: apiKey
    })

    const prompt = `You are an expert tennis coach helping create a personalized weekly practice plan.

STUDENT CONTEXT:
Name: ${studentName}
Skill Level: ${skillLevel || 'Not specified'}
Goals: ${goals || 'Not specified'}

TODAY'S LESSON:
Lesson Plan: ${todayLessonPlan || 'Not provided'}
Coach Notes: ${todayNotes || 'Not provided'}

RECENT LESSONS (last 3):
${recentLessons && recentLessons.length > 0 ? recentLessons.map((lesson, i) => `
Lesson ${i + 1}:
Plan: ${lesson.lesson_plan || 'Not provided'}
Notes: ${lesson.coach_notes || lesson.coach_feedback || 'Not provided'}
`).join('\n') : 'No recent lessons'}

TASK:
Generate ONE focused practice item for this week based on:
1. What we worked on today
2. Student's goals and skill level
3. What will have biggest impact on their development

GUIDELINES:
- ONE clear focus only (not multiple items)
- Can be tennis-specific OR general fitness (e.g., "Go on a 3-mile run to build endurance")
- Must be achievable in 5-30 minutes
- Be specific and actionable
- Use motivating, encouraging language
- Consider what will most help them toward their goals

FORMAT YOUR RESPONSE AS JSON:
{
  "practicePlan": "Specific description of the practice focus",
  "estimatedTime": "15" (just the number in minutes, between 5-30)
}

Example outputs:
{
  "practicePlan": "Focus on serve toss consistency - do 50 tosses in front of a mirror, keeping your toss arm relaxed. Goal: ball lands in the same spot every time.",
  "estimatedTime": "15"
}

{
  "practicePlan": "Go on a 3-mile run at conversational pace to build your endurance for longer rallies. This will help with your goal of playing tournament matches.",
  "estimatedTime": "30"
}

Generate the practice plan now:`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].text
    
    // Try to parse JSON from response
    let practicePlanData
    try {
      // Extract JSON from response (might have markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        practicePlanData = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch {
      // If response isn't valid JSON, extract manually
      practicePlanData = {
        practicePlan: responseText.trim(),
        estimatedTime: "15"
      }
    }

    // Validate and ensure estimatedTime is between 5-30
    if (practicePlanData.estimatedTime) {
      const time = parseInt(practicePlanData.estimatedTime)
      if (time < 5) practicePlanData.estimatedTime = "5"
      if (time > 30) practicePlanData.estimatedTime = "30"
    } else {
      practicePlanData.estimatedTime = "15"
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(practicePlanData)
    }

  } catch (error) {
    console.error('Error generating practice plan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate practice plan', message: error.message })
    }
  }
}


