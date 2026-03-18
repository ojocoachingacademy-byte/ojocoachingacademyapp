/**
 * Process Referral Reward
 * When someone gets a referral, automatically add 1 lesson credit
 */

import { supabase } from '../supabaseClient'
import { addBonusCredit } from './creditUtils'

/**
 * Award referral credit to a referrer
 * @param {string} referrerStudentId - The student ID of the person who made the referral
 * @param {string} referredStudentId - The student ID of the person who was referred
 * @returns {Promise<Object>} Result object with success status
 */
export async function awardReferralCredit(referrerStudentId, referredStudentId) {
  try {
    await addBonusCredit(referrerStudentId, supabase, 'Referral reward')

    // Create a payment transaction record for tracking (non-fatal)
    try {
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          student_id: referrerStudentId,
          payment_date: new Date().toISOString().split('T')[0],
          amount_paid: 0, // Free credit
          package_size: 1, // 1 credit
          transaction_type: 'referral_reward',
          metadata: {
            referred_student_id: referredStudentId,
            reward_type: 'lesson_credit',
            credits_awarded: 1
          }
        })

      if (transactionError) {
        console.error('Error creating referral reward transaction:', transactionError)
      }
    } catch (txErr) {
      console.error('Error creating referral reward transaction:', txErr)
    }

    const { data: student } = await supabase.from('students').select('lesson_credits').eq('id', referrerStudentId).single()
    const newCredits = student?.lesson_credits ?? 0
    console.log(`✅ Referral reward: Added 1 credit to student ${referrerStudentId} (new total: ${newCredits})`)
    
    return {
      success: true,
      newCredits,
      referrerStudentId,
      referredStudentId
    }
  } catch (error) {
    console.error('Error awarding referral credit:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Process referral rewards for all students who have been referred
 * This can be called periodically or when a student signs up
 */
export async function processPendingReferralRewards() {
  try {
    // Get all students who have been referred but haven't had rewards processed yet
    const { data: students, error } = await supabase
      .from('students')
      .select('id, referred_by_student_id')
      .not('referred_by_student_id', 'is', null)

    if (error) throw error

    const results = []
    for (const student of students || []) {
      // Check if reward has already been processed (by checking for referral_reward transaction)
      const { data: existingReward } = await supabase
        .from('payment_transactions')
        .select('id')
        .eq('student_id', student.referred_by_student_id)
        .eq('transaction_type', 'referral_reward')
        .eq('metadata->>referred_student_id', student.id)
        .limit(1)

      // Only process if reward doesn't exist yet
      if (!existingReward || existingReward.length === 0) {
        const result = await awardReferralCredit(student.referred_by_student_id, student.id)
        results.push(result)
      }
    }

    return {
      success: true,
      processed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  } catch (error) {
    console.error('Error processing pending referral rewards:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

