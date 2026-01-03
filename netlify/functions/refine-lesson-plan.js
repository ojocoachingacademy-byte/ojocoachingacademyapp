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
    const { currentPlan, feedback } = JSON.parse(event.body)

    // Validate required fields
    if (!currentPlan || !feedback) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: currentPlan and feedback are required' })
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

    // Build prompt for refinement
    const prompt = `Here's the current lesson plan:

${currentPlan}

The coach wants to refine it with this feedback: ${feedback}

Generate an updated plan that incorporates this feedback while keeping the same structure. Remove all markdown formatting - just provide clean, readable text with proper line breaks.`

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

    const refinedPlan = message.content[0].text

    // Return the refined plan
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ lessonPlan: refinedPlan })
    }
  } catch (error) {
    console.error('Error refining lesson plan:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    }
  }
}



