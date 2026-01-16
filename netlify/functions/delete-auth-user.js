import { createClient } from '@supabase/supabase-js'

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

    if (!supabaseUrl) {
      console.error('Missing SUPABASE_URL or VITE_SUPABASE_URL environment variable')
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Supabase URL not configured. Please set SUPABASE_URL or VITE_SUPABASE_URL in Netlify environment variables.'
        })
      }
    }

    if (!serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'Server configuration error', 
          details: 'Supabase service role key not configured. Please set SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.'
        })
      }
    }

    console.log('Deleting user:', userId)
    console.log('Using Supabase URL:', supabaseUrl.replace(/\/\/.*@/, '//***@')) // Mask credentials in logs

    // Use SERVICE ROLE KEY for admin operations
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey
    )

    // Delete related records FIRST (in correct order)
    console.log('Deleting related records for user:', userId)
    
    try {
      // 1. Delete messages first (must be deleted before conversations due to foreign key)
      // Get all conversation IDs where this user is a participant
      const { data: userConversations, error: convFetchError } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      
      if (convFetchError) {
        console.warn('Error fetching conversations:', convFetchError.message)
      } else if (userConversations && userConversations.length > 0) {
        // Delete messages in these conversations
        const conversationIds = userConversations.map(c => c.id)
        const { error: messagesError } = await supabaseAdmin
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds)
        if (messagesError) console.warn('Error deleting messages:', messagesError.message)
      }
      
      // Also delete any messages where user is directly sender or receiver (fallback)
      const { error: senderMessagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('sender_id', userId)
      if (senderMessagesError && !senderMessagesError.message?.includes('does not exist')) {
        console.warn('Error deleting messages (sender):', senderMessagesError.message)
      }
      
      const { error: receiverMessagesError } = await supabaseAdmin
        .from('messages')
        .delete()
        .eq('receiver_id', userId)
      if (receiverMessagesError && !receiverMessagesError.message?.includes('does not exist')) {
        console.warn('Error deleting messages (receiver):', receiverMessagesError.message)
      }
      
      // 2. Delete conversations (CASCADE will handle messages, but we already deleted them)
      const { error: conversationsError } = await supabaseAdmin
        .from('conversations')
        .delete()
        .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
      if (conversationsError) console.warn('Error deleting conversations:', conversationsError.message)
      
      // 3. Delete notifications
      const { error: notificationsError } = await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
      if (notificationsError) console.warn('Error deleting notifications:', notificationsError.message)
      
      // 4. Delete testimonial requests
      const { error: testimonialRequestsError } = await supabaseAdmin.from('testimonial_requests').delete().eq('student_id', userId)
      if (testimonialRequestsError) console.warn('Error deleting testimonial requests:', testimonialRequestsError.message)
      
      // 5. Delete testimonials
      const { error: testimonialsError } = await supabaseAdmin.from('testimonials').delete().eq('student_id', userId)
      if (testimonialsError) console.warn('Error deleting testimonials:', testimonialsError.message)
      
      // 6. Delete hitting_partners
      const { error: hittingPartnersError } = await supabaseAdmin.from('hitting_partners').delete().eq('id', userId)
      if (hittingPartnersError) console.warn('Error deleting hitting partners:', hittingPartnersError.message)
      
      // 6.5. Delete scheduled notifications that reference this student (check metadata)
      // First fetch notifications that might reference this student, then delete them
      try {
        const { data: scheduledNotifications } = await supabaseAdmin
          .from('scheduled_notifications')
          .select('id, metadata')
          .is('sent_at', null) // Only check unsent notifications
        
        if (scheduledNotifications) {
          const notificationsToDelete = scheduledNotifications.filter(notif => {
            try {
              const metadata = typeof notif.metadata === 'string' 
                ? JSON.parse(notif.metadata) 
                : notif.metadata
              return metadata?.studentId === userId || metadata?.student_id === userId
            } catch {
              return false
            }
          })
          
          if (notificationsToDelete.length > 0) {
            const idsToDelete = notificationsToDelete.map(n => n.id)
            const { error: scheduledNotificationsError } = await supabaseAdmin
              .from('scheduled_notifications')
              .delete()
              .in('id', idsToDelete)
            if (scheduledNotificationsError) {
              console.warn('Error deleting scheduled notifications:', scheduledNotificationsError.message)
            }
          }
        }
      } catch (e) {
        // Table might not exist or query failed, ignore
        console.log('Could not delete scheduled notifications:', e.message)
      }
      
      // 6.6. Delete practice plans if table exists
      try {
        const { error: practicePlansError } = await supabaseAdmin
          .from('practice_plans')
          .delete()
          .eq('student_id', userId)
        if (practicePlansError && !practicePlansError.message?.includes('does not exist')) {
          console.warn('Error deleting practice plans:', practicePlansError.message)
        }
      } catch (e) {
        // Table might not exist, ignore
        console.log('Practice plans table may not exist, skipping deletion')
      }
      
      // 7. Delete student-related data (in dependency order)
      const { error: skillProgressError } = await supabaseAdmin.from('skill_progress_snapshots').delete().eq('student_id', userId)
      if (skillProgressError) console.warn('Error deleting skill progress:', skillProgressError.message)
      
      const { error: milestonesError } = await supabaseAdmin.from('student_milestones').delete().eq('student_id', userId)
      if (milestonesError) console.warn('Error deleting milestones:', milestonesError.message)
      
      const { error: homeworkError } = await supabaseAdmin.from('lesson_homework').delete().eq('student_id', userId)
      if (homeworkError) console.warn('Error deleting homework:', homeworkError.message)
      
      const { error: paymentTransactionsError } = await supabaseAdmin.from('payment_transactions').delete().eq('student_id', userId)
      if (paymentTransactionsError) console.warn('Error deleting payment transactions:', paymentTransactionsError.message)
      
      const { error: lessonTransactionsError } = await supabaseAdmin.from('lesson_transactions').delete().eq('student_id', userId)
      if (lessonTransactionsError) console.warn('Error deleting lesson transactions:', lessonTransactionsError.message)
      
      const { error: lessonsError } = await supabaseAdmin.from('lessons').delete().eq('student_id', userId)
      if (lessonsError) console.warn('Error deleting lessons:', lessonsError.message)
      
      const { error: studentsError } = await supabaseAdmin.from('students').delete().eq('id', userId)
      if (studentsError) console.warn('Error deleting students:', studentsError.message)
      
      // 8. Clear referral references (set referred_by_student_id to null)
      const { error: referralUpdateError } = await supabaseAdmin.from('students')
        .update({ referred_by_student_id: null })
        .eq('referred_by_student_id', userId)
      if (referralUpdateError) console.warn('Error updating referrals:', referralUpdateError.message)
      
      // 9. Delete profiles (NOTE: profiles.id references auth.users.id, so this should work)
      // But if it has ON DELETE CASCADE, we might not need to delete it manually
      const { error: profilesError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
      if (profilesError) {
        console.warn('Error deleting profiles:', profilesError.message)
        // If profiles deletion fails, it might have CASCADE, so continue
      } else {
        console.log('Profiles deleted successfully')
      }
      
      // 10. Finally delete auth user
      console.log('Deleting auth user:', userId)
      
      // Check if user exists in auth first
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (getUserError && getUserError.message?.includes('not found')) {
        console.warn('Auth user not found, may have already been deleted:', userId)
        // User doesn't exist in auth, but we've cleaned up DB records, so consider it successful
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'User not found in auth (may have been deleted), but all database records were cleaned up'
          })
        }
      }
      
      if (getUserError) {
        console.error('Error checking if user exists:', getUserError)
        // Continue anyway to try deletion
      } else {
        console.log('User exists in auth, proceeding with deletion')
      }
      
      // Try to delete auth user
      // Note: If this fails with "Database error deleting user", it usually means
      // there are still foreign key references in the database that need to be cleaned up
      const { data: deleteData, error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError)
        console.error('Error details:', JSON.stringify(authDeleteError, null, 2))
        
        // If it's a database error, it might be due to remaining foreign key references
        // Check if we can identify which table might still have references
        if (authDeleteError.message?.includes('Database error') || authDeleteError.code === 'unexpected_failure') {
          console.warn('Database error during auth deletion - checking for remaining references...')
          
          // Query to find all foreign key constraints pointing to auth.users
          const fkQuery = `
            SELECT 
              tc.table_name, 
              kcu.column_name,
              tc.constraint_name
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND ccu.table_name = 'users'
              AND ccu.table_schema = 'auth'
          `
          
          let fkTables = []
          try {
            const { data: fkData, error: fkError } = await supabaseAdmin.rpc('exec_sql', { 
              query: fkQuery 
            }).catch(() => ({ data: null, error: { message: 'RPC not available' } }))
            
            if (!fkError && fkData) {
              fkTables = fkData.map(fk => `${fk.table_name}.${fk.column_name}`)
              console.log('Foreign keys to auth.users found:', fkTables)
            } else {
              console.warn('Could not query foreign keys directly:', fkError?.message)
            }
          } catch (e) {
            console.warn('Error querying foreign keys:', e.message)
          }
          
          // Try to identify remaining references by checking common tables
          const referenceChecks = [
            { table: 'profiles', column: 'id' },
            { table: 'students', column: 'id' },
            { table: 'conversations', column: 'participant_1_id' },
            { table: 'conversations', column: 'participant_2_id' },
            { table: 'messages', column: 'sender_id' },
            { table: 'messages', column: 'receiver_id' },
            { table: 'notifications', column: 'user_id' },
            { table: 'hitting_partners', column: 'id' },
            { table: 'testimonials', column: 'student_id' },
            { table: 'testimonial_requests', column: 'student_id' },
            { table: 'practice_plans', column: 'student_id' }
          ]
          
          const remainingRefs = []
          console.log('Checking for remaining references in tables...')
          
          for (const check of referenceChecks) {
            try {
              const { count, error } = await supabaseAdmin
                .from(check.table)
                .select('*', { count: 'exact', head: true })
                .eq(check.column, userId)
              
              if (error) {
                console.warn(`Error checking ${check.table}.${check.column}:`, error.message)
              } else {
                const refCount = count || 0
                console.log(`Checked ${check.table}.${check.column}: ${refCount} references found`)
                if (refCount > 0) {
                  remainingRefs.push(`${check.table}.${check.column} (${refCount} records)`)
                }
              }
            } catch (checkError) {
              console.warn(`Exception checking ${check.table}.${check.column}:`, checkError.message)
            }
          }
          
          console.log('Remaining references found:', remainingRefs.length > 0 ? remainingRefs.join(', ') : 'None')
          
          // The real issue might be that we need to delete profiles LAST, not before auth user
          // Or there's a constraint without CASCADE. Let's try deleting profiles again just before auth deletion
          if (remainingRefs.length === 0) {
            console.log('No references found, but deletion still failed. Attempting to delete profiles again...')
            const { error: profilesRetryError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
            if (profilesRetryError) {
              console.warn('Error deleting profiles on retry:', profilesRetryError.message)
            } else {
              console.log('Profiles deleted on retry, attempting auth deletion again...')
              // Try one more time
              const { error: retryAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
              if (!retryAuthError) {
                console.log('Auth user deleted successfully on retry!')
                return {
                  statusCode: 200,
                  body: JSON.stringify({ success: true, message: 'User deleted successfully after retry' })
                }
              } else {
                console.error('Auth deletion still failed on retry:', retryAuthError.message)
              }
            }
          }
          
          if (remainingRefs.length > 0) {
            return {
              statusCode: 500,
              body: JSON.stringify({ 
                error: 'Failed to delete auth user due to remaining database references', 
                details: `The following tables still have references: ${remainingRefs.join(', ')}. This may indicate a foreign key constraint issue.`,
                remainingReferences: remainingRefs,
                foreignKeyConstraints: fkTables.length > 0 ? fkTables : undefined,
                code: authDeleteError.code || 'database_constraint_error'
              })
            }
          } else {
            console.warn('No remaining references found in checked tables, but auth deletion still failed.')
            console.warn('This might indicate a foreign key constraint in a table we did not check, or a database trigger preventing deletion.')
          }
        }
        
        // Check for specific error types
        let errorDetails = authDeleteError.message || 'Unknown error'
        if (authDeleteError.status) errorDetails += ` (Status: ${authDeleteError.status})`
        if (authDeleteError.code) errorDetails += ` (Code: ${authDeleteError.code})`
        
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to delete auth user', 
            details: errorDetails,
            code: authDeleteError.status || authDeleteError.code,
            fullError: process.env.NODE_ENV === 'development' ? authDeleteError : undefined
          })
        }
      }
      
      console.log('Auth user deleted successfully:', deleteData)
      
      console.log('Successfully deleted user:', userId)
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: 'User and all related records deleted successfully' })
      }
    } catch (dbError) {
      console.error('Error during database cleanup:', dbError)
      // If database cleanup fails, still try to delete auth user
      try {
        console.log('Attempting to delete auth user despite cleanup errors:', userId)
        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (authDeleteError) {
          throw authDeleteError
        }
        console.log('Auth user deleted successfully despite cleanup errors')
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'User deleted, but some related records may not have been cleaned up',
            warning: dbError.message 
          })
        }
      } catch (authError) {
        console.error('Failed to delete auth user after cleanup error:', authError)
        return {
          statusCode: 500,
          body: JSON.stringify({ 
            error: 'Failed to delete user', 
            details: `Database cleanup failed: ${dbError.message}. Auth deletion also failed: ${authError.message}`
          })
        }
      }
    }
  } catch (error) {
    console.error('Unhandled error in delete-auth-user function:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error message:', error.message)
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        type: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}
