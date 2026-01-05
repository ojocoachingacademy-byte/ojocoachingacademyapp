/**
 * Referral Data Sync Utility
 * Fetches referral data from Supabase bookings table (website data)
 * and integrates with app's referral tracking system
 */

import { supabase } from '../supabaseClient'

/**
 * Get all bookings with referral codes from website
 * @returns {Promise<Array>} Array of bookings with referral codes
 */
export async function getWebsiteReferrals() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .not('referral_code', 'is', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching website referrals:', error)
    return []
  }
}

/**
 * Get referral statistics from website bookings
 * @returns {Promise<Object>} Statistics object with referral counts and revenue
 */
export async function getWebsiteReferralStats() {
  try {
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('referral_code, price')
      .not('referral_code', 'is', null)

    if (error) throw error

    // Calculate stats by referral code
    const statsByCode = {}
    bookings.forEach(booking => {
      const code = booking.referral_code
      if (!statsByCode[code]) {
        statsByCode[code] = {
          referralCode: code,
          count: 0,
          totalRevenue: 0
        }
      }
      statsByCode[code].count++
      statsByCode[code].totalRevenue += parseFloat(booking.price || 0)
    })

    // Convert to array and sort by revenue
    const stats = Object.values(statsByCode).sort((a, b) => b.totalRevenue - a.totalRevenue)

    return {
      totalReferrals: bookings.length,
      totalRevenue: bookings.reduce((sum, b) => sum + parseFloat(b.price || 0), 0),
      uniqueCodes: stats.length,
      topReferrers: stats.slice(0, 10)
    }
  } catch (error) {
    console.error('Error fetching website referral stats:', error)
    return {
      totalReferrals: 0,
      totalRevenue: 0,
      uniqueCodes: 0,
      topReferrers: []
    }
  }
}

/**
 * Get bookings for a specific referral code
 * @param {string} referralCode - The referral code to lookup
 * @returns {Promise<Array>} Array of bookings for that code
 */
export async function getBookingsByReferralCode(referralCode) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('referral_code', referralCode)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching bookings by referral code:', error)
    return []
  }
}

/**
 * Get all referral redemptions with booking details
 * @returns {Promise<Array>} Array of referral redemptions with booking info
 */
export async function getReferralRedemptions() {
  try {
    const { data, error } = await supabase
      .from('referral_redemptions')
      .select(`
        *,
        bookings (
          customer_first_name,
          customer_last_name,
          customer_email,
          package_name,
          price,
          created_at
        )
      `)
      .order('redeemed_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching referral redemptions:', error)
    return []
  }
}

/**
 * Get combined referral statistics (app referrals + website referrals)
 * @returns {Promise<Object>} Combined stats object
 */
export async function getCombinedReferralStats() {
  try {
    // Get app referrals (from students table)
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select(`
        id,
        referred_by_student_id,
        total_revenue
      `)

    if (studentsError) throw studentsError

    // Fetch profiles separately
    let students = studentsData || []
    if (students.length > 0) {
      const studentIds = students.map(s => s.id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)

      // Merge students with profiles
      students = students.map(student => ({
        ...student,
        profiles: profilesData?.find(p => p.id === student.id)
      }))
    }

    // Calculate app referral stats
    const appReferrerMap = {}
    students.forEach(student => {
      if (student.referred_by_student_id) {
        const referrer = students.find(s => s.id === student.referred_by_student_id)
        if (!appReferrerMap[student.referred_by_student_id]) {
          appReferrerMap[student.referred_by_student_id] = {
            id: student.referred_by_student_id,
            name: referrer?.profiles?.full_name || 'Unknown',
            count: 0,
            revenue: 0
          }
        }
        appReferrerMap[student.referred_by_student_id].count++
        appReferrerMap[student.referred_by_student_id].revenue += parseFloat(student.total_revenue || 0)
      }
    })

    // Get website referral stats
    const websiteStats = await getWebsiteReferralStats()

    return {
      appReferrals: {
        totalReferrals: Object.values(appReferrerMap).reduce((sum, r) => sum + r.count, 0),
        totalRevenue: Object.values(appReferrerMap).reduce((sum, r) => sum + r.revenue, 0),
        uniqueReferrers: Object.keys(appReferrerMap).length,
        topReferrers: Object.values(appReferrerMap)
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)
      },
      websiteReferrals: websiteStats,
      combined: {
        totalReferrals: Object.values(appReferrerMap).reduce((sum, r) => sum + r.count, 0) + websiteStats.totalReferrals,
        totalRevenue: Object.values(appReferrerMap).reduce((sum, r) => sum + r.revenue, 0) + websiteStats.totalRevenue,
        uniqueReferrers: Object.keys(appReferrerMap).length + websiteStats.uniqueCodes
      }
    }
  } catch (error) {
    console.error('Error fetching combined referral stats:', error)
    return {
      appReferrals: { totalReferrals: 0, totalRevenue: 0, uniqueReferrers: 0, topReferrers: [] },
      websiteReferrals: { totalReferrals: 0, totalRevenue: 0, uniqueCodes: 0, topReferrers: [] },
      combined: { totalReferrals: 0, totalRevenue: 0, uniqueReferrers: 0 }
    }
  }
}

