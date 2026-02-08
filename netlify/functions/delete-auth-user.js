import { createClient } from '@supabase/supabase-js'

/**
 * DELETE STUDENT FUNCTION - AUTO-GENERATED
 * 
 * ⚠️ THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
 * 
 * To regenerate:
 *   npm run generate-delete-function
 * 
 * Or it will regenerate automatically on git commit if schema changed.
 */

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function deleteUserRecords(userId) {
  console.log('Deleting related records for user:', userId)

  // Helper function to safely delete
  const safeDelete = async (table, condition) => {
    try {
      const { error } = await supabaseAdmin.from(table).delete().match(condition)
      if (error) {
        console.error(`Error deleting from ${table}:`, error.message)
      } else {
        console.log(`✓ Deleted from ${table}`)
      }
    } catch (err) {
      console.error(`Error deleting from ${table}:`, err.message)
    }
  }

  // Delete in correct order - children before parents

  // 1. Hitting partner interactions (references hitting_partners)
  await safeDelete('hitting_partner_interactions', { requester_id: userId })
  await safeDelete('hitting_partner_interactions', { partner_id: userId })

  // 2. Messages and conversations (reference profiles)
  const { error: msgError } = await supabaseAdmin
    .from('messages')
    .delete()
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
  if (msgError) console.error('Error deleting messages:', msgError.message)
  else console.log('✓ Deleted from messages')

  const { error: convError } = await supabaseAdmin
    .from('conversations')
    .delete()
    .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
  if (convError) console.error('Error deleting conversations:', convError.message)
  else console.log('✓ Deleted from conversations')

  // 3. Other profile-dependent tables
  await safeDelete('notifications', { user_id: userId })
  await safeDelete('analytics_events', { user_id: userId })

  // 4. Student-related tables
  await safeDelete('lesson_homework', { student_id: userId })
  await safeDelete('student_milestones', { student_id: userId })
  await safeDelete('student_focus_areas', { student_id: userId })
  await safeDelete('skill_assessments', { student_id: userId })
  await safeDelete('skill_progress_snapshots', { student_id: userId })

  // 5. Testimonials
  await safeDelete('testimonial_requests', { student_id: userId })
  await safeDelete('testimonials', { student_id: userId })
  await safeDelete('public_testimonials', { student_id: userId })

  // 6. Financial tables
  await safeDelete('lesson_transactions', { student_id: userId })
  await safeDelete('payment_transactions', { student_id: userId })
  await safeDelete('student_packages', { student_id: userId })

  // 7. Lessons
  await safeDelete('lessons', { student_id: userId })
  await safeDelete('lessons_archive', { student_id: userId })

  // 8. Delete hitting_partners BEFORE students (students might reference it)
  await safeDelete('hitting_partners', { id: userId })

  // 9. Delete students BEFORE profiles
  await safeDelete('students', { id: userId })

  // 10. Delete profiles LAST (before auth)
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .delete()
    .eq('id', userId)

  if (profileError) {
    console.error('Error deleting profile:', profileError.message)
    throw new Error(`Failed to delete profile: ${profileError.message}`)
  }
  console.log('✓ Deleted from profiles')
}

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    const { userId } = body

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      }
    }

    console.log('Deleting user:', userId)

    await deleteUserRecords(userId)

    // Then delete auth user
    console.log('Deleting auth user...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Auth deletion error:', authError)
      // Return partial success if all app data is deleted
      const { count: studentCount } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)
      
      const { count: profileCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)

      if (studentCount === 0 && profileCount === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            partial: true,
            message: 'All app data deleted, but auth user deletion failed',
            warning: 'Auth user may need to be deleted manually from Supabase dashboard'
          })
        }
      }

      throw new Error(`Auth deletion failed: ${authError.message}`)
    }

    console.log('✅ User deleted successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete user',
        details: error.message
      })
    }
  }
}
