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

    // Step 1: Delete records referencing auth.users
    try {
      const { error } = await supabaseAdmin
        .from('messages')
        .delete()
        .or('sender_id.eq.$${userId},receiver_id.eq.$${userId}')
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from messages:', error.message)
      } else {
        console.log('✓ Deleted from messages')
      }
    } catch (error) {
      console.error('Error deleting from messages:', error.message)
    }
    try {
      const { error } = await supabaseAdmin
        .from('conversations')
        .delete()
        .or('participant_1_id.eq.$${userId},participant_2_id.eq.$${userId}')
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from conversations:', error.message)
      } else {
        console.log('✓ Deleted from conversations')
      }
    } catch (error) {
      console.error('Error deleting from conversations:', error.message)
    }
    try {
      const { error } = await supabaseAdmin
        .from('notifications')
        .delete()
        .eq('user_id', userId)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from notifications:', error.message)
      } else {
        console.log('✓ Deleted from notifications')
      }
    } catch (error) {
      console.error('Error deleting from notifications:', error.message)
    }
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from profiles:', error.message)
      } else {
        console.log('✓ Deleted from profiles')
      }
    } catch (error) {
      console.error('Error deleting from profiles:', error.message)
    }

    // Step 3: Clear self-referencing fields in students table

    // Step 4: Delete main records
    try {
      const { error } = await supabaseAdmin
        .from('students')
        .delete()
        .eq('id', userId)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from students:', error.message)
      } else {
        console.log('✓ Deleted from students')
      }
    } catch (error) {
      console.error('Error deleting from students:', error.message)
    }
    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from profiles:', error.message)
      } else {
        console.log('✓ Deleted from profiles')
      }
    } catch (error) {
      console.error('Error deleting from profiles:', error.message)
    }


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
