import { createClient } from '@supabase/supabase-js'

/**
 * SIMPLIFIED DELETE STUDENT FUNCTION
 * 
 * With CASCADE foreign keys properly configured, this function only needs to:
 * 1. Clear self-referencing relationships (referred_by, paired_with)
 * 2. Delete the auth user
 * 3. Everything else cascades automatically!
 * 
 * If you add a new table with a foreign key to students/profiles/auth.users,
 * just add CASCADE to the foreign key and it will automatically be cleaned up.
 */

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { userId } = JSON.parse(event.body)

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId required' }) }
    }

    // Validate environment variables
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing required environment variables')
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Supabase credentials not configured'
        })
      }
    }

    console.log('Deleting user:', userId)

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    // STEP 1: Clear self-referencing foreign keys (these can't CASCADE)
    console.log('Clearing self-referencing relationships...')
    
    const { error: referralUpdateError } = await supabaseAdmin
      .from('students')
      .update({ referred_by_student_id: null })
      .eq('referred_by_student_id', userId)
    
    if (referralUpdateError) {
      console.warn('Error clearing referrals:', referralUpdateError.message)
    } else {
      console.log('? Referral references cleared')
    }

    const { error: pairingUpdateError } = await supabaseAdmin
      .from('students')
      .update({ 
        paired_with_id: null,
        is_primary_for_pair: false
      })
      .eq('paired_with_id', userId)
    
    if (pairingUpdateError) {
      console.warn('Error clearing pairings:', pairingUpdateError.message)
    } else {
      console.log('? Pairing references cleared')
    }

    // STEP 2: Delete auth user (CASCADE handles everything else)
    console.log('Deleting auth user (CASCADE will handle all related records)...')
    
    // Check if user exists first
    const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (getUserError?.message?.includes('not found')) {
      console.warn('Auth user already deleted')
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'User already deleted'
        })
      }
    }

    // Try API deletion
    const { error: apiDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (apiDeleteError) {
      console.log('?? API deletion failed, using SQL fallback...')
      
      // Fallback to SQL function
      const { error: sqlError } = await supabaseAdmin.rpc('force_delete_auth_user', {
        user_id: userId
      })
      
      if (sqlError) {
        console.error('? SQL deletion failed:', sqlError)
        
        // Last resort: try deleting profile first
        console.log('Trying profile deletion first...')
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .delete()
          .eq('id', userId)
        
        if (!profileError) {
          // Retry auth deletion
          const { error: retryError } = await supabaseAdmin.auth.admin.deleteUser(userId)
          if (!retryError) {
            console.log('? User deleted after profile removal')
            return {
              statusCode: 200,
              body: JSON.stringify({ 
                success: true, 
                message: 'User deleted successfully'
              })
            }
          }
        }
        
        // If we get here, all methods failed
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to delete auth user',
            details: sqlError.message,
            code: sqlError.code
          })
        }
      }
      
      console.log('? User deleted via SQL fallback')
    } else {
      console.log('? User deleted via API')
    }

    // Verify deletion worked
    const { data: verifyUser } = await supabaseAdmin.auth.admin
      .getUserById(userId)
      .catch(() => ({ data: null }))
    
    if (verifyUser?.user) {
      throw new Error('User still exists after deletion!')
    }

    console.log('? User and all related records deleted successfully')
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'User and all related records deleted successfully via CASCADE'
      })
    }

  } catch (error) {
    console.error('Unhandled error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message
      })
    }
  }
}
