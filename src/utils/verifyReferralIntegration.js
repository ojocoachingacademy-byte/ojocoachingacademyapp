/**
 * Verification Script for Referral Integration
 * Run this to verify the integration is working correctly
 * 
 * Usage: Import and call verifyIntegration() from browser console or a test component
 */

import { supabase } from '../supabaseClient'
import { 
  getWebsiteReferrals, 
  getWebsiteReferralStats, 
  getCombinedReferralStats 
} from './referralDataSync'

/**
 * Verify the referral integration setup
 * Checks if tables exist and queries work
 */
export async function verifyIntegration() {
  console.log('🔍 Verifying Referral Integration...\n')
  
  const results = {
    tablesExist: false,
    canReadBookings: false,
    canReadReferrals: false,
    canReadRedemptions: false,
    statsWork: false,
    combinedStatsWork: false,
    errors: []
  }

  try {
    // Test 1: Check if bookings table exists and is readable
    console.log('1. Testing bookings table...')
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('id')
        .limit(1)

      if (error) {
        results.errors.push(`Bookings table error: ${error.message}`)
        console.error('   ❌ Error:', error.message)
      } else {
        results.canReadBookings = true
        results.tablesExist = true
        console.log('   ✅ Bookings table is accessible')
      }
    } catch (error) {
      results.errors.push(`Bookings test failed: ${error.message}`)
      console.error('   ❌ Failed:', error.message)
    }

    // Test 2: Check if referrals table exists
    console.log('2. Testing referrals table...')
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select('id')
        .limit(1)

      if (error) {
        results.errors.push(`Referrals table error: ${error.message}`)
        console.error('   ❌ Error:', error.message)
      } else {
        results.canReadReferrals = true
        console.log('   ✅ Referrals table is accessible')
      }
    } catch (error) {
      results.errors.push(`Referrals test failed: ${error.message}`)
      console.error('   ❌ Failed:', error.message)
    }

    // Test 3: Check if referral_redemptions table exists
    console.log('3. Testing referral_redemptions table...')
    try {
      const { data, error } = await supabase
        .from('referral_redemptions')
        .select('id')
        .limit(1)

      if (error) {
        results.errors.push(`Referral_redemptions table error: ${error.message}`)
        console.error('   ❌ Error:', error.message)
      } else {
        results.canReadRedemptions = true
        console.log('   ✅ Referral_redemptions table is accessible')
      }
    } catch (error) {
      results.errors.push(`Referral_redemptions test failed: ${error.message}`)
      console.error('   ❌ Failed:', error.message)
    }

    // Test 4: Test utility functions
    console.log('4. Testing utility functions...')
    try {
      const websiteReferrals = await getWebsiteReferrals()
      console.log(`   ✅ getWebsiteReferrals() - Found ${websiteReferrals.length} referrals`)
      
      const stats = await getWebsiteReferralStats()
      console.log(`   ✅ getWebsiteReferralStats() - Total: ${stats.totalReferrals} referrals, $${stats.totalRevenue} revenue`)
      
      results.statsWork = true
    } catch (error) {
      results.errors.push(`Utility functions error: ${error.message}`)
      console.error('   ❌ Utility functions failed:', error.message)
    }

    // Test 5: Test combined stats
    console.log('5. Testing combined stats...')
    try {
      const combined = await getCombinedReferralStats()
      console.log(`   ✅ getCombinedReferralStats() - Combined: ${combined.combined.totalReferrals} referrals`)
      results.combinedStatsWork = true
    } catch (error) {
      results.errors.push(`Combined stats error: ${error.message}`)
      console.error('   ❌ Combined stats failed:', error.message)
    }

    // Summary
    console.log('\n📊 Verification Summary:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`Tables Exist:        ${results.tablesExist ? '✅' : '❌'}`)
    console.log(`Can Read Bookings:   ${results.canReadBookings ? '✅' : '❌'}`)
    console.log(`Can Read Referrals:  ${results.canReadReferrals ? '✅' : '❌'}`)
    console.log(`Can Read Redemptions:${results.canReadRedemptions ? '✅' : '❌'}`)
    console.log(`Stats Functions:     ${results.statsWork ? '✅' : '❌'}`)
    console.log(`Combined Stats:      ${results.combinedStatsWork ? '✅' : '❌'}`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    if (results.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:')
      results.errors.forEach(err => console.log(`   - ${err}`))
    }

    if (results.tablesExist && results.canReadBookings) {
      console.log('\n✅ Integration appears to be working!')
      console.log('💡 Next steps:')
      console.log('   1. Make a test booking on your website with a referral code')
      console.log('   2. Check if it appears in Supabase bookings table')
      console.log('   3. Verify data shows up in the app')
    } else {
      console.log('\n❌ Integration needs setup:')
      console.log('   1. Run supabase_referral_integration.sql in Supabase SQL Editor')
      console.log('   2. Verify RLS policies are correct')
      console.log('   3. Check environment variables')
    }

    return results

  } catch (error) {
    console.error('\n❌ Verification failed:', error)
    results.errors.push(`Verification failed: ${error.message}`)
    return results
  }
}

/**
 * Quick test - just check if tables exist
 */
export async function quickVerify() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('count')
      .limit(1)

    if (error) {
      console.error('❌ Tables not set up:', error.message)
      return false
    }

    console.log('✅ Tables exist!')
    return true
  } catch (error) {
    console.error('❌ Verification failed:', error.message)
    return false
  }
}

