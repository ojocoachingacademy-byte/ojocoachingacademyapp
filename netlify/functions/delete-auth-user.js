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

    // AUTO-GENERATED - DO NOT EDIT MANUALLY
    // Regenerate with: npm run generate-delete-function
    // Or automatically on git commit

    console.log("Deleting related records for user:", userId)

    // Delete child tables first (referencing students/profiles)

    try {
      const { error } = await supabaseAdmin
        .from('hitting_partner_interactions')
        .delete()
        .or(`requester_id.eq.${userId},partner_id.eq.${userId}`)
      if (error && error.code !== 'PGRST116') console.error('Error deleting hitting_partner_interactions:', error.message)
      else console.log('✓ Deleted from hitting_partner_interactions')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('lesson_homework').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting lesson_homework:', error.message)
      else console.log('✓ Deleted from lesson_homework')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('student_milestones').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting student_milestones:', error.message)
      else console.log('✓ Deleted from student_milestones')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('student_focus_areas').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting student_focus_areas:', error.message)
      else console.log('✓ Deleted from student_focus_areas')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('skill_assessments').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting skill_assessments:', error.message)
      else console.log('✓ Deleted from skill_assessments')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('skill_progress_snapshots').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting skill_progress_snapshots:', error.message)
      else console.log('✓ Deleted from skill_progress_snapshots')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('testimonial_requests').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting testimonial_requests:', error.message)
      else console.log('✓ Deleted from testimonial_requests')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('testimonials').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting testimonials:', error.message)
      else console.log('✓ Deleted from testimonials')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('public_testimonials').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting public_testimonials:', error.message)
      else console.log('✓ Deleted from public_testimonials')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('lesson_transactions').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting lesson_transactions:', error.message)
      else console.log('✓ Deleted from lesson_transactions')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('payment_transactions').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting payment_transactions:', error.message)
      else console.log('✓ Deleted from payment_transactions')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('student_packages').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting student_packages:', error.message)
      else console.log('✓ Deleted from student_packages')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('lessons').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting lessons:', error.message)
      else console.log('✓ Deleted from lessons')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('lessons_archive').delete().eq('student_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting lessons_archive:', error.message)
      else console.log('✓ Deleted from lessons_archive')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('messages').delete().eq('sender_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting messages:', error.message)
      else console.log('✓ Deleted from messages')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('conversations').delete().or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      if (error && error.code !== 'PGRST116') console.error('Error deleting conversations:', error.message)
      else console.log('✓ Deleted from conversations')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting notifications:', error.message)
      else console.log('✓ Deleted from notifications')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('analytics_events').delete().eq('user_id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting analytics_events:', error.message)
      else console.log('✓ Deleted from analytics_events')
    } catch (error) { console.error('Error:', error.message) }

    // Delete parent tables

    try {
      const { error } = await supabaseAdmin.from('hitting_partners').delete().eq('id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting hitting_partners:', error.message)
      else console.log('✓ Deleted from hitting_partners')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('students').delete().eq('id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting students:', error.message)
      else console.log('✓ Deleted from students')
    } catch (error) { console.error('Error:', error.message) }

    try {
      const { error } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (error && error.code !== 'PGRST116') console.error('Error deleting profiles:', error.message)
      else console.log('✓ Deleted from profiles')
    } catch (error) { console.error('Error:', error.message) }

    // Finally delete auth user
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
