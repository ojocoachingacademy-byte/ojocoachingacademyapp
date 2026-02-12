const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { student_id } = JSON.parse(event.body || '{}')

    if (!student_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'student_id required' })
      }
    }

    // Use service role client (has admin privileges)
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Security: Verify requester is a coach
    const authHeader = event.headers.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' })
      }
    }

    // Check if user is a coach
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('account_type')
      .eq('id', user.id)
      .single()

    if (profile?.account_type !== 'coach') {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Only coaches can impersonate students' })
      }
    }

    // Get student's auth user
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(student_id)

    if (userError || !authUser?.user) {
      console.error('Error fetching student auth user:', userError)
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Student not found' })
      }
    }

    const studentEmail = authUser.user.email
    if (!studentEmail) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Student has no email' })
      }
    }

    // Generate a magic link for the student
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: studentEmail
    })

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Error generating link:', linkError)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to generate session' })
      }
    }

    // Exchange hashed_token for a session using verifyOtp
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink'
    })

    if (sessionError || !sessionData?.session) {
      console.error('Error verifying OTP:', sessionError)
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Failed to generate session' })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session: {
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token
        }
      })
    }
  } catch (error) {
    console.error('Impersonation error:', error)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' })
    }
  }
}
