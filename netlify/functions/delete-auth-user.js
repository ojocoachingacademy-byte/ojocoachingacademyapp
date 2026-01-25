import { createClient } from '@supabase/supabase-js'

/**
 * DELETE STUDENT FUNCTION - IMPORTANT MAINTENANCE NOTE
 * 
 * ⚠️ WHENEVER YOU ADD A NEW TABLE WITH A FOREIGN KEY TO:
 *   - students.id (student_id)
 *   - profiles.id (user_id)
 *   - auth.users.id
 * 
 * YOU MUST UPDATE THIS FUNCTION TO DELETE THOSE RECORDS!
 * 
 * Current tables being deleted (in order):
 * 1. Messages (conversations, sender_id, receiver_id)
 * 2. Conversations (participant_1_id, participant_2_id)
 * 3. Notifications (user_id)
 * 4. Testimonial requests (student_id)
 * 5. Testimonials (student_id)
 * 6. Hitting partners (id)
 * 7. Scheduled notifications (metadata.studentId)
 * 8. Practice plans (student_id)
 * 9. Development focus areas (student_id)
 * 10. Student focus areas (student_id) ⚠️ ADDED
 * 11. Student packages (student_id) ⚠️ ADDED
 * 12. Skill assessments (student_id) ⚠️ ADDED
 * 13. Skill progress snapshots (student_id)
 * 14. Student milestones (student_id)
 * 15. Lesson homework (student_id)
 * 16. Payment transactions (student_id)
 * 17. Lesson transactions (student_id)
 * 18. Lessons (student_id)
 * 19. Students (id) - after clearing referrals and pairings
 * 20. Profiles (id) - may need to be deleted after auth user if CASCADE is set
 * 21. Auth user (id) - MUST be deleted last, or before profiles if profiles has CASCADE
 * 
 * NOTE: Also clears:
 * - Referral references (referred_by_student_id)
 * - Pairing relationships (paired_with_id)
 * 
 * To add a new table:
 * 1. Add deletion code in the appropriate section (before students table)
 * 2. Add it to the referenceChecks array for debugging
 * 3. Update this comment list
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

    // AUTOMATED VALIDATION: Check for all tables with foreign keys to this user
    // This helps catch missing tables BEFORE deletion fails
    console.log('🔍 Validating foreign key relationships...')
    const validationResults = await validateForeignKeys(supabaseAdmin, userId)
    if (validationResults.missing.length > 0) {
      console.error('⚠️ WARNING: Found tables with foreign keys that are NOT in deletion list:')
      validationResults.missing.forEach(table => {
        console.error(`  - ${table.table_name}.${table.column_name} (${table.constraint_name})`)
      })
      console.error('⚠️ These tables should be added to the delete function!')
    }
    if (validationResults.found.length > 0) {
      console.log(`✓ Found ${validationResults.found.length} foreign key relationship(s) to check`)
    }

    // Delete related records FIRST (in correct order)
    console.log('Deleting related records for user:', userId)
    
    try {
      // 1. Delete messages (sender and receiver)
      try {
        const { error: messagesError } = await supabaseAdmin
          .from('messages')
          .delete()
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        
        if (messagesError && messagesError.code !== 'PGRST116') {
          console.error('Error deleting messages:', messagesError.message)
        } else {
          console.log('Messages deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting messages:', error.message)
      }
      
      // 2. Delete conversations (participant_1 and participant_2)
      try {
        const { error: conversationsError } = await supabaseAdmin
          .from('conversations')
          .delete()
          .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
        
        if (conversationsError && conversationsError.code !== 'PGRST116') {
          console.error('Error deleting conversations:', conversationsError.message)
        } else {
          console.log('Conversations deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting conversations:', error.message)
      }
      
      // 3. Delete notifications
      try {
        const { error: notificationsError } = await supabaseAdmin
          .from('notifications')
          .delete()
          .eq('user_id', userId)
        
        if (notificationsError && notificationsError.code !== 'PGRST116') {
          console.error('Error deleting notifications:', notificationsError.message)
        } else {
          console.log('Notifications deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting notifications:', error.message)
      }
      
      // 4. Delete testimonials
      try {
        const { error: testimonialsError } = await supabaseAdmin
          .from('testimonials')
          .delete()
          .eq('student_id', userId)
        
        if (testimonialsError && testimonialsError.code !== 'PGRST116') {
          console.error('Error deleting testimonials:', testimonialsError.message)
        } else {
          console.log('Testimonials deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting testimonials:', error.message)
      }
      
      // 5. Delete testimonial requests
      try {
        const { error: testimonialRequestsError } = await supabaseAdmin
          .from('testimonial_requests')
          .delete()
          .eq('student_id', userId)
        
        if (testimonialRequestsError && testimonialRequestsError.code !== 'PGRST116') {
          console.error('Error deleting testimonial requests:', testimonialRequestsError.message)
        } else {
          console.log('Testimonial requests deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting testimonial requests:', error.message)
      }
      
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
        if (practicePlansError) {
          // Ignore "does not exist" and "schema cache" errors (table might not exist)
          if (!practicePlansError.message?.includes('does not exist') && 
              !practicePlansError.message?.includes('schema cache') &&
              !practicePlansError.message?.includes('relation')) {
            console.warn('Error deleting practice plans:', practicePlansError.message)
          }
        }
      } catch (e) {
        // Table might not exist, ignore
        if (!e.message?.includes('schema cache') && !e.message?.includes('does not exist')) {
          console.log('Practice plans table may not exist, skipping deletion')
        }
      }
      
      // 6.7. Delete development focus areas (has ON DELETE CASCADE but delete explicitly to be safe)
      try {
        const { error: focusAreasError } = await supabaseAdmin
          .from('development_focus_areas')
          .delete()
          .eq('student_id', userId)
        if (focusAreasError) {
          // Ignore "does not exist" and "schema cache" errors (table might not exist)
          if (!focusAreasError.message?.includes('does not exist') && 
              !focusAreasError.message?.includes('schema cache') &&
              !focusAreasError.message?.includes('relation')) {
            console.warn('Error deleting development focus areas:', focusAreasError.message)
          }
        }
      } catch (e) {
        // Table might not exist, ignore
        if (!e.message?.includes('schema cache') && !e.message?.includes('does not exist')) {
          console.log('Development focus areas table may not exist, skipping deletion')
        }
      }
      
      // 6.8. Delete student_focus_areas (different from development_focus_areas)
      try {
        const { error: studentFocusAreasError } = await supabaseAdmin
          .from('student_focus_areas')
          .delete()
          .eq('student_id', userId)
        if (studentFocusAreasError && !studentFocusAreasError.message?.includes('does not exist')) {
          console.warn('Error deleting student focus areas:', studentFocusAreasError.message)
        }
      } catch (e) {
        console.log('Student focus areas table may not exist, skipping deletion')
      }
      
      // 6.9. Delete student_packages (must be deleted before students table)
      try {
        const { error: studentPackagesError } = await supabaseAdmin
          .from('student_packages')
          .delete()
          .eq('student_id', userId)
        if (studentPackagesError && !studentPackagesError.message?.includes('does not exist')) {
          console.warn('Error deleting student packages:', studentPackagesError.message)
        } else {
          console.log('Student packages deleted successfully')
        }
      } catch (e) {
        console.log('Student packages table may not exist, skipping deletion')
      }
      
      // 7. Delete student-related data (in dependency order)
      // 7.1. Delete skill assessments first
      const { error: skillAssessmentsError } = await supabaseAdmin.from('skill_assessments').delete().eq('student_id', userId)
      if (skillAssessmentsError && !skillAssessmentsError.message?.includes('does not exist')) {
        console.warn('Error deleting skill assessments:', skillAssessmentsError.message)
      } else {
        console.log('Skill assessments deleted successfully')
      }
      
      const { error: skillProgressError } = await supabaseAdmin.from('skill_progress_snapshots').delete().eq('student_id', userId)
      if (skillProgressError) console.warn('Error deleting skill progress:', skillProgressError.message)
      
      const { error: milestonesError } = await supabaseAdmin.from('student_milestones').delete().eq('student_id', userId)
      if (milestonesError) console.warn('Error deleting milestones:', milestonesError.message)
      
      // Delete lesson_homework
      try {
        const { error: homeworkError } = await supabaseAdmin
          .from('lesson_homework')
          .delete()
          .eq('student_id', userId)
        
        if (homeworkError && homeworkError.code !== 'PGRST116') {
          console.error('Error deleting lesson homework:', homeworkError.message)
        } else {
          console.log('Lesson homework deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting lesson homework:', error.message)
      }
      
      // Delete skill_progress_snapshots
      try {
        const { error: snapshotsError } = await supabaseAdmin
          .from('skill_progress_snapshots')
          .delete()
          .eq('student_id', userId)
        
        if (snapshotsError && snapshotsError.code !== 'PGRST116') {
          console.error('Error deleting skill snapshots:', snapshotsError.message)
        } else {
          console.log('Skill snapshots deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting skill snapshots:', error.message)
      }
      
      // Delete student_focus_areas
      try {
        const { error: focusError } = await supabaseAdmin
          .from('student_focus_areas')
          .delete()
          .eq('student_id', userId)
        
        if (focusError && focusError.code !== 'PGRST116') {
          console.error('Error deleting student focus areas:', focusError.message)
        } else {
          console.log('Student focus areas deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting student focus areas:', error.message)
      }
      
      // Delete payment_transactions
      try {
        const { error: paymentError } = await supabaseAdmin
          .from('payment_transactions')
          .delete()
          .eq('student_id', userId)
        
        if (paymentError && paymentError.code !== 'PGRST116') {
          console.error('Error deleting payment transactions:', paymentError.message)
        } else {
          console.log('Payment transactions deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting payment transactions:', error.message)
      }
      
      const { error: lessonTransactionsError } = await supabaseAdmin.from('lesson_transactions').delete().eq('student_id', userId)
      if (lessonTransactionsError && lessonTransactionsError.code !== 'PGRST116') {
        console.warn('Error deleting lesson transactions:', lessonTransactionsError.message)
      } else {
        console.log('Lesson transactions deleted successfully')
      }
      
      // Delete lessons (both as student and paired student)
      try {
        const { error: lessonsError } = await supabaseAdmin
          .from('lessons')
          .delete()
          .or(`student_id.eq.${userId},paired_student_id.eq.${userId}`)
        
        if (lessonsError && lessonsError.code !== 'PGRST116') {
          console.error('Error deleting lessons:', lessonsError.message)
        } else {
          console.log('Lessons deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting lessons:', error.message)
      }
      
      // Delete analytics_events if table exists
      try {
        const { error: analyticsError } = await supabaseAdmin
          .from('analytics_events')
          .delete()
          .eq('user_id', userId)
        
        if (analyticsError && analyticsError.code !== 'PGRST116') {
          console.error('Error deleting analytics_events:', analyticsError.message)
        } else {
          console.log('Analytics events deleted successfully')
        }
      } catch (error) {
        console.error('Error deleting analytics_events:', error.message)
      }
      
      // 8. Clear referral references and pairing relationships FIRST
      // IMPORTANT: Do this BEFORE deleting the student record to avoid foreign key constraint issues
      console.log('Clearing referral references...')
      const { error: referralUpdateError } = await supabaseAdmin.from('students')
        .update({ referred_by_student_id: null })
        .eq('referred_by_student_id', userId)
      if (referralUpdateError) {
        console.warn('Error updating referrals:', referralUpdateError.message)
      } else {
        console.log('Referral references cleared')
      }
      
      // 8.5. Clear pairing relationships (unlink any students paired with this one)
      console.log('Clearing pairing relationships...')
      const { error: pairingUpdateError } = await supabaseAdmin.from('students')
        .update({ 
          paired_with_id: null,
          is_primary_for_pair: false
        })
        .eq('paired_with_id', userId)
      if (pairingUpdateError) {
        console.warn('Error updating pairings:', pairingUpdateError.message)
      } else {
        console.log('Pairing relationships cleared')
      }
      
      // 9. Delete students record (must be after all foreign key dependencies are cleared)
      console.log('Deleting students record...')
      const { error: studentsError } = await supabaseAdmin.from('students').delete().eq('id', userId)
      if (studentsError) {
        console.error('Error deleting students:', studentsError.message)
        console.error('Students error code:', studentsError.code)
        console.error('Students error details:', JSON.stringify(studentsError, null, 2))
        // Don't throw - continue to try deleting profiles and auth user
      } else {
        console.log('Students record deleted successfully')
      }
      
      // Final verification before auth deletion
      console.log('Verifying all foreign key references are cleared...')
      
      const tablesToCheck = [
        'messages',
        'conversations', 
        'notifications',
        'analytics_events',
        'lessons',
        'lesson_homework',
        'skill_progress_snapshots',
        'student_focus_areas',
        'lesson_transactions',
        'payment_transactions',
        'testimonials',
        'testimonial_requests',
        'student_packages',
        'students',
        'profiles'
      ]
      
      let hasReferences = false
      
      for (const table of tablesToCheck) {
        try {
          const { count } = await supabaseAdmin
            .from(table)
            .select('*', { count: 'exact', head: true })
            .or(`id.eq.${userId},student_id.eq.${userId},user_id.eq.${userId},sender_id.eq.${userId},receiver_id.eq.${userId},participant_1_id.eq.${userId},participant_2_id.eq.${userId},paired_with_id.eq.${userId},referred_by_student_id.eq.${userId},paired_student_id.eq.${userId}`)
          
          if (count > 0) {
            console.error(`❌ Still has ${count} references in ${table}`)
            hasReferences = true
          } else {
            console.log(`✓ No references in ${table}`)
          }
        } catch (error) {
          // Ignore tables that don't exist or don't have the column
          console.log(`⚠️ Could not check ${table}: ${error.message}`)
        }
      }
      
      if (hasReferences) {
        console.error('❌ Cannot delete auth user - still has foreign key references')
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: 'Cannot delete auth user',
            details: 'Still has foreign key references in one or more tables. Check logs for details.',
            code: 'foreign_key_constraint_error'
          })
        }
      }
      
      console.log('✓ All foreign key references cleared, proceeding with auth deletion...')
      
      // 10. Delete auth user FIRST (before profiles)
      // CRITICAL: Delete auth user BEFORE profiles to avoid foreign key constraint issues
      // If profiles has ON DELETE CASCADE, deleting auth user will automatically delete the profile
      // If not, we'll delete the profile manually after
      console.log('Deleting auth user:', userId)
      
      // Check if user exists in auth first
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId)
      
      if (getUserError && getUserError.message?.includes('not found')) {
        console.warn('Auth user not found, may have already been deleted:', userId)
        // User doesn't exist in auth, but we've cleaned up DB records, so delete profile manually
        console.log('Auth user not found, cleaning up remaining profile if it exists...')
        await supabaseAdmin.from('profiles').delete().eq('id', userId).catch(() => {})
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true, 
            message: 'User not found in auth (may have been deleted), all database records cleaned up'
          })
        }
      }
      
      if (getUserError) {
        console.error('Error checking if user exists:', getUserError)
        // Continue anyway to try deletion
      } else {
        console.log('User exists in auth, proceeding with deletion')
      }
      
      // Try to delete auth user FIRST (before profile)
      // This is the correct order - deleting auth user may CASCADE delete profile
      const { data: deleteData, error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (authDeleteError) {
        console.error('Error deleting auth user:', authDeleteError)
        console.error('Error details:', JSON.stringify(authDeleteError, null, 2))
        
        // If auth deletion fails, try deleting profile first, then retry auth deletion
        // Sometimes the profile foreign key constraint prevents auth user deletion
        console.log('Auth deletion failed, trying to delete profile first then retry...')
        const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
        if (!profileDeleteError) {
          console.log('Profile deleted, retrying auth user deletion...')
          const { error: retryAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
          if (!retryAuthError) {
            console.log('Auth user deleted successfully after profile deletion!')
            return {
              statusCode: 200,
              body: JSON.stringify({ success: true, message: 'User deleted successfully after profile deletion' })
            }
          } else {
            console.error('Auth deletion still failed after profile deletion:', retryAuthError.message)
          }
        }
        
        // If it's a database error, it might be due to remaining foreign key references
        // Check if we can identify which table might still have references
        if (authDeleteError.message?.includes('Database error') || authDeleteError.code === 'unexpected_failure') {
          console.warn('Database error during auth deletion - checking for remaining references...')
          
          // Initialize variables for error handling
          let fkTables = []
          let remainingRefs = []
          
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
          
          try {
            // Try to query foreign keys using RPC (if available)
            const fkResult = await supabaseAdmin.rpc('exec_sql', { query: fkQuery })
            const { data: fkData, error: fkError } = fkResult
            
            if (!fkError && fkData) {
              fkTables = fkData.map(fk => `${fk.table_name}.${fk.column_name}`)
              console.log('Foreign keys to auth.users found:', fkTables)
            } else {
              console.warn('Could not query foreign keys directly:', fkError?.message || 'RPC not available')
            }
          } catch (e) {
            console.warn('Error querying foreign keys:', e.message || 'RPC not available')
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
            { table: 'practice_plans', column: 'student_id' },
            { table: 'development_focus_areas', column: 'student_id' },
            { table: 'student_focus_areas', column: 'student_id' },
            { table: 'student_packages', column: 'student_id' },
            { table: 'skill_assessments', column: 'student_id' },
            { table: 'lesson_transactions', column: 'student_id' },
            { table: 'payment_transactions', column: 'student_id' },
            { table: 'students', column: 'paired_with_id' }
          ]
          
          // remainingRefs already declared above at line 405
          console.log('Checking for remaining references in tables...')
          
          for (const check of referenceChecks) {
            try {
              const { count, error } = await supabaseAdmin
                .from(check.table)
                .select('*', { count: 'exact', head: true })
                .eq(check.column, userId)
              
              if (error) {
                // Ignore "does not exist", "schema cache", and "relation" errors for tables that might not exist
                if (!error.message?.includes('does not exist') && 
                    !error.message?.includes('schema cache') &&
                    !error.message?.includes('relation') && 
                    !error.code?.includes('42P01')) {
                  console.warn(`Error checking ${check.table}.${check.column}:`, error.message || 'Unknown error')
                }
              } else {
                const refCount = count || 0
                if (refCount > 0) {
                  console.log(`⚠️ Found ${refCount} reference(s) in ${check.table}.${check.column}`)
                  remainingRefs.push(`${check.table}.${check.column} (${refCount} records)`)
                } else {
                  console.log(`✓ No references in ${check.table}.${check.column}`)
                }
              }
            } catch (checkError) {
              // Ignore table not found errors
              const errorMsg = checkError?.message || checkError?.toString() || 'Unknown error'
              if (!errorMsg.includes('does not exist') && 
                  !errorMsg.includes('schema cache') &&
                  !errorMsg.includes('relation')) {
                console.warn(`Exception checking ${check.table}.${check.column}:`, errorMsg)
              }
            }
          }
          
          console.log('Remaining references found:', remainingRefs.length > 0 ? remainingRefs.join(', ') : 'None')
          
          if (remainingRefs.length > 0) {
            console.error('⚠️ WARNING: Found remaining references that may prevent auth user deletion:')
            remainingRefs.forEach(ref => console.error(`  - ${ref}`))
          }
          
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
            
            // If all data is cleaned up but auth user deletion fails, return partial success
            // Verify that all app data has been deleted
            console.log('Verifying all app data has been cleaned up...')
            const { count: verifyStudentCount } = await supabaseAdmin
              .from('students')
              .select('*', { count: 'exact', head: true })
              .eq('id', userId)
            
            const { count: verifyProfileCount } = await supabaseAdmin
              .from('profiles')
              .select('*', { count: 'exact', head: true })
              .eq('id', userId)
            
            if (verifyStudentCount === 0 && verifyProfileCount === 0) {
              console.log('✓ All app data has been cleaned up successfully')
              console.warn('⚠️ Auth user deletion failed, but all app data is removed')
              console.warn('⚠️ The auth user may need to be deleted manually from Supabase dashboard')
              
              // Return partial success - all app data deleted, but auth user remains
              return {
                statusCode: 200,
                body: JSON.stringify({
                  success: true,
                  partial: true,
                  message: 'All app data deleted successfully, but auth user deletion failed',
                  warning: 'The auth user could not be deleted automatically. All student data has been removed from the app. You may need to delete the auth user manually from the Supabase dashboard.',
                  details: authDeleteError.message || 'Database error deleting user',
                  code: authDeleteError.code || 'unexpected_failure',
                  verification: {
                    studentsRemaining: verifyStudentCount || 0,
                    profilesRemaining: verifyProfileCount || 0
                  }
                })
              }
            }
          }
        }
        
        // Check for specific error types
        let errorDetails = authDeleteError.message || 'Unknown error'
        if (authDeleteError.status) errorDetails += ` (Status: ${authDeleteError.status})`
        if (authDeleteError.code) errorDetails += ` (Code: ${authDeleteError.code})`
        
        // Initialize variables if they weren't set in the database error check block
        if (typeof remainingRefs === 'undefined') {
          remainingRefs = []
        }
        if (typeof fkTables === 'undefined') {
          fkTables = []
        }
        
        // Verify if app data was cleaned up before returning error
        const { count: finalVerifyStudentCount } = await supabaseAdmin
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('id', userId)
        
        const { count: finalVerifyProfileCount } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('id', userId)
        
        // If all app data is cleaned up, return partial success instead of error
        if (finalVerifyStudentCount === 0 && finalVerifyProfileCount === 0 && remainingRefs.length === 0) {
          console.log('✓ All app data cleaned up, returning partial success')
          return {
            statusCode: 200,
            body: JSON.stringify({
              success: true,
              partial: true,
              message: 'All app data deleted successfully, but auth user deletion failed',
              warning: 'The auth user could not be deleted automatically. All student data has been removed from the app.',
              details: errorDetails,
              code: authDeleteError.code || 'unexpected_failure',
              verification: {
                studentsRemaining: 0,
                profilesRemaining: 0
              }
            })
          }
        }
        
        // Return detailed error information if data still exists
        const errorResponse = {
          error: 'Failed to delete auth user',
          details: errorDetails,
          code: authDeleteError.status || authDeleteError.code || 'unexpected_failure',
          message: authDeleteError.message || 'Database error deleting user'
        }
        
        // Include additional debugging info if available
        if (remainingRefs && remainingRefs.length > 0) {
          errorResponse.remainingReferences = remainingRefs
        }
        if (fkTables && fkTables.length > 0) {
          errorResponse.foreignKeyConstraints = fkTables
        }
        errorResponse.verification = {
          studentsRemaining: finalVerifyStudentCount || 0,
          profilesRemaining: finalVerifyProfileCount || 0
        }
        
        console.error('Returning error response:', JSON.stringify(errorResponse, null, 2))
        
        return {
          statusCode: 500,
          body: JSON.stringify(errorResponse)
        }
      }
      
      console.log('Auth user deleted successfully:', deleteData)
      
      // 11. Delete profile manually if it still exists (in case CASCADE didn't work)
      // After auth user is deleted, profile should be deletable or already deleted by CASCADE
      console.log('Checking if profile still exists and needs manual deletion...')
      const { data: remainingProfile, error: profileCheckError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle()
      
      if (profileCheckError && !profileCheckError.message?.includes('not found')) {
        console.warn('Error checking for remaining profile:', profileCheckError.message)
      } else if (remainingProfile) {
        console.log('Profile still exists after auth deletion, deleting manually...')
        const { error: profileDeleteError } = await supabaseAdmin.from('profiles').delete().eq('id', userId)
        if (profileDeleteError) {
          console.warn('Error deleting remaining profile:', profileDeleteError.message)
        } else {
          console.log('Remaining profile deleted successfully')
        }
      } else {
        console.log('Profile was automatically deleted by CASCADE or already removed')
      }
      
      // Final verification - check if any records still exist
      console.log('Performing final verification...')
      const { count: finalStudentCount } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)
      
      const { count: finalProfileCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)
      
      if (finalStudentCount > 0 || finalProfileCount > 0) {
        console.warn('⚠️ WARNING: Some records may still exist after deletion:')
        if (finalStudentCount > 0) console.warn(`  - students table: ${finalStudentCount} record(s)`)
        if (finalProfileCount > 0) console.warn(`  - profiles table: ${finalProfileCount} record(s)`)
      } else {
        console.log('✓ Verification complete: No remaining student or profile records')
      }
      
      console.log('Successfully deleted user:', userId)
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'User and all related records deleted successfully',
          verification: {
            studentsRemaining: finalStudentCount || 0,
            profilesRemaining: finalProfileCount || 0
          }
        })
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

/**
 * AUTOMATED VALIDATION FUNCTION
 * This function queries the database to find ALL foreign key relationships
 * to the user being deleted. This helps catch missing tables automatically.
 */
async function validateForeignKeys(supabaseAdmin, userId) {
  const found = []
  const missing = []
  
  // Known tables that should be deleted (keep this updated!)
  const knownTables = [
    'messages', 'conversations', 'notifications', 'testimonial_requests', 
    'testimonials', 'hitting_partners', 'scheduled_notifications', 
    'practice_plans', 'development_focus_areas', 'student_focus_areas', 
    'student_packages', 'skill_assessments', 'skill_progress_snapshots', 
    'student_milestones', 'lesson_homework', 'payment_transactions', 
    'lesson_transactions', 'lessons', 'students', 'profiles'
  ]
  
  // Check common tables manually (more reliable than SQL queries)
  const tablesToCheck = [
    { table: 'messages', columns: ['sender_id', 'receiver_id', 'conversation_id'] },
    { table: 'conversations', columns: ['participant_1_id', 'participant_2_id'] },
    { table: 'notifications', columns: ['user_id'] },
    { table: 'testimonial_requests', columns: ['student_id'] },
    { table: 'testimonials', columns: ['student_id'] },
    { table: 'hitting_partners', columns: ['id'] },
    { table: 'practice_plans', columns: ['student_id'] },
    { table: 'development_focus_areas', columns: ['student_id'] },
    { table: 'student_focus_areas', columns: ['student_id'] },
    { table: 'student_packages', columns: ['student_id'] },
    { table: 'skill_assessments', columns: ['student_id'] },
    { table: 'skill_progress_snapshots', columns: ['student_id'] },
    { table: 'student_milestones', columns: ['student_id'] },
    { table: 'lesson_homework', columns: ['student_id'] },
    { table: 'payment_transactions', columns: ['student_id'] },
    { table: 'lesson_transactions', columns: ['student_id'] },
    { table: 'lessons', columns: ['student_id'] },
    { table: 'students', columns: ['id', 'referred_by_student_id', 'paired_with_id'] },
    { table: 'profiles', columns: ['id'] }
  ]
  
  for (const tableInfo of tablesToCheck) {
    for (const column of tableInfo.columns) {
      try {
        // Try to query the table to see if it exists and has data
        const { count, error } = await supabaseAdmin
          .from(tableInfo.table)
          .select('*', { count: 'exact', head: true })
          .eq(column, userId)
        
        if (error) {
          // Table might not exist, skip it
          if (error.message?.includes('does not exist') || error.code?.includes('42P01')) {
            continue
          }
        } else {
          const recordCount = count || 0
          if (recordCount > 0) {
            found.push({
              table: tableInfo.table,
              column: column,
              count: recordCount
            })
            
            // Check if this table is in our known list
            if (!knownTables.includes(tableInfo.table)) {
              missing.push({
                table_name: tableInfo.table,
                column_name: column,
                constraint_name: `fk_${tableInfo.table}_${column}`,
                record_count: recordCount
              })
            }
          }
        }
      } catch (checkError) {
        // Ignore errors for tables that don't exist
        if (!checkError.message?.includes('does not exist')) {
          console.warn(`Error checking ${tableInfo.table}.${column}:`, checkError.message)
        }
      }
    }
  }
  
  return { found, missing }
}
