const Anthropic = require('@anthropic-ai/sdk')

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // Parse request body
    const { studentName, ntrpLevel, goals, pastLessons } = JSON.parse(event.body)

    // Validate required fields
    if (!studentName || !ntrpLevel) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: studentName and ntrpLevel are required' })
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

    // Build prompt
    const prompt = `You are an expert tennis coach. Generate a detailed 60-minute lesson plan.

STUDENT INFO:
Name: ${studentName}
Level: ${ntrpLevel}
Goals: ${goals || 'Not specified'}
Recent lessons: ${pastLessons || 'No past lessons'}

LESSON PLAN FORMAT:

Warm-up (5-10 min): [Specific activities]
Technical Work (20 min): [Main drill with progressions]
Live Ball Practice (20 min): [Match-situation drill]
Tactical/Strategy (10 min): [Point play or pattern work]
Cool Down (5 min): [Final activity]

For each section include specific drills, key coaching points, and progressions.
Keep it concise and actionable. Remove all markdown formatting - just provide clean, readable text with proper line breaks.`

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const generatedPlan = message.content[0].text

    // Return the generated plan
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lessonPlan: generatedPlan })
    }
  } catch (error) {
    console.error('Error generating lesson plan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}

