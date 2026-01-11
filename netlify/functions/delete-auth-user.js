const { createClient } = require('@supabase/supabase-js')

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { userId } = JSON.parse(event.body)

    if (!userId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'userId required' }) }
    }

    // Use SERVICE ROLE KEY for admin operations
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Delete related records FIRST (in correct order)
    console.log('Deleting related records for user:', userId)
    
    // 1. Delete messages (must be deleted before conversations)
    await supabaseAdmin.from('messages').delete()
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    
    // 2. Delete conversations
    await supabaseAdmin.from('conversations').delete()
      .or(`participant_1_id.eq.${userId},participant_2_id.eq.${userId}`)
    
    // 3. Delete notifications
    await supabaseAdmin.from('notifications').delete().eq('user_id', userId)
    
    // 4. Delete testimonial requests
    await supabaseAdmin.from('testimonial_requests').delete().eq('student_id', userId)
    
    // 5. Delete testimonials
    await supabaseAdmin.from('testimonials').delete().eq('student_id', userId)
    
    // 6. Delete hitting_partners
    await supabaseAdmin.from('hitting_partners').delete().eq('id', userId)
    
    // 7. Delete student-related data (in dependency order)
    await supabaseAdmin.from('skill_progress_snapshots').delete().eq('student_id', userId)
    await supabaseAdmin.from('student_milestones').delete().eq('student_id', userId)
    await supabaseAdmin.from('lesson_homework').delete().eq('student_id', userId)
    await supabaseAdmin.from('payment_transactions').delete().eq('student_id', userId)
    await supabaseAdmin.from('lesson_transactions').delete().eq('student_id', userId)
    await supabaseAdmin.from('lessons').delete().eq('student_id', userId)
    await supabaseAdmin.from('students').delete().eq('id', userId)
    
    // 8. Clear referral references (set referred_by_student_id to null)
    await supabaseAdmin.from('students')
      .update({ referred_by_student_id: null })
      .eq('referred_by_student_id', userId)
    
    // 9. Delete profiles
    await supabaseAdmin.from('profiles').delete().eq('id', userId)
    
    // 10. Finally delete auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (error) {
      console.error('Error deleting auth user:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to delete auth user', details: error.message })
      }
    }

    console.log('Successfully deleted user:', userId)
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    }
  } catch (error) {
    console.error('Error:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    }
  }
}
