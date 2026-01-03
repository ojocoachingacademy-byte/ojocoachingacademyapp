import { supabase } from '../supabaseClient'
import studentsData from '../data/historicalStudents.json'

// Helper delay function to avoid rate limits
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function generateEmail(name) {
  const cleaned = name.toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
  return `${cleaned}@ojo-historical.com`
}

function generatePassword() {
  return `Hist${Math.random().toString(36).slice(2, 10)}!${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function importHistoricalData(onProgress) {
  console.log('🚀 Starting historical data import...')
  console.log(`📊 Current students: ${studentsData.current_students.length}`)
  console.log(`📊 Historical students: ${studentsData.historical_students.length}`)
  
  const allStudents = [
    ...studentsData.current_students,
    ...studentsData.historical_students
  ]
  
  console.log(`📊 Total students to import: ${allStudents.length}`)
  
  let successCount = 0
  let errorCount = 0
  let skippedCount = 0
  const errors = []
  
  for (let i = 0; i < allStudents.length; i++) {
    const student = allStudents[i]
    
    try {
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: allStudents.length,
          studentName: student.name,
          successCount,
          errorCount,
          skippedCount
        })
      }
      
      console.log(`[${i + 1}/${allStudents.length}] Checking ${student.name}...`)
      
      // Generate email and password
      const email = generateEmail(student.name)
      const password = generatePassword()
      
      // Check if student already exists by email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existingProfile) {
        console.log(`⏭ ${student.name} already exists, skipping...`)
        skippedCount++
        continue  // No delay needed for skips
      }
      
      console.log(`[${i + 1}/${allStudents.length}] Importing ${student.name}...`)
      
      // Create auth user (email confirmation is disabled in Supabase settings)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: student.name,
            role: 'student',
            account_type: 'student'
          }
        }
      })

      // Check if signup succeeded
      if (authError) {
        console.error(`Auth error for ${student.name}:`, authError.message)
        throw new Error(`Auth signup failed: ${authError.message}`)
      }

      if (!authData.user) {
        console.error(`No user created for ${student.name}`)
        throw new Error('No user object returned from signup')
      }

      const userId = authData.user.id
      console.log(`✓ Created auth user for ${student.name} with ID: ${userId}`)

      // Wait for auth trigger to create profile
      await delay(1000)

      // Check if profile was created by trigger
      const { data: createdProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (!createdProfile) {
        console.log(`Profile not auto-created, creating manually for ${student.name}`)
        
        // Create profile manually
        const { error: profileInsertError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: student.name,
            account_type: 'student'
          })
        
        if (profileInsertError) {
          throw new Error(`Profile insert failed: ${profileInsertError.message}`)
        }
      } else {
        console.log(`Profile exists for ${student.name}, updating...`)
      }

      // Update profile with correct data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: student.name,
          account_type: 'student'
        })
        .eq('id', userId)

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`)
      }
      
      // Determine if current student (has active credits)
      const isCurrent = studentsData.current_students.find(s => s.name === student.name)
      
      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: userId,
          lesson_credits: student.current_credits || 0,
          total_revenue: student.revenue || 0,
          total_lessons_purchased: student.total_lessons_purchased || 0,
          private_coach_notes: isCurrent 
            ? `Active student - imported ${new Date().toLocaleDateString()}`
            : `Historical student - imported ${new Date().toLocaleDateString()}`,
          created_at: new Date().toISOString()
        })
      
      if (studentError) {
        console.error(`Student error for ${student.name}:`, studentError)
        throw new Error(`Student: ${studentError.message}`)
      }
      
      // Create payment transactions if student has packages (for current students)
      if (student.packages && student.packages.length > 0) {
        for (const pkg of student.packages) {
          if (pkg.amount > 0 || pkg.size > 0) {
            const { error: txError } = await supabase
              .from('payment_transactions')
              .insert({
                student_id: userId,
                payment_date: pkg.date,
                amount: pkg.amount || 0,
                lesson_credits: pkg.size || 0,
                payment_method: 'Historical',
                notes: `Historical import - ${pkg.size} lesson package`
              })
            
            if (txError) {
              console.warn(`Transaction warning for ${student.name}:`, txError.message)
            }
          }
        }
      } else if (student.revenue > 0) {
        // For historical students without package details, create one summary transaction
        const { error: txError } = await supabase
          .from('payment_transactions')
          .insert({
            student_id: userId,
            payment_date: '2024-01-01',
            amount: student.revenue,
            lesson_credits: student.total_lessons_purchased,
            payment_method: 'Historical',
            notes: 'Historical data - detailed dates not available'
          })
        
        if (txError) {
          console.warn(`Transaction warning for ${student.name}:`, txError.message)
        }
      }
      
      successCount++
      console.log(`✓ ${student.name} - COMPLETE`)
      
      // Add 3-second delay to avoid rate limits (only if more students to process)
      if (i < allStudents.length - 1) {
        console.log(`⏳ Waiting 3 seconds to avoid rate limit...`)
        await delay(3000)
      }
      
    } catch (error) {
      errorCount++
      errors.push({ student: student.name, error: error.message })
      console.error(`✗ ${student.name}:`, error.message)
      
      // Still delay on error to avoid rate limits
      if (i < allStudents.length - 1) {
        console.log(`⏳ Waiting 3 seconds after error...`)
        await delay(3000)
      }
    }
  }
  
  console.log(`\n✅ Import complete!`)
  console.log(`   Success: ${successCount}/${allStudents.length}`)
  console.log(`   Skipped: ${skippedCount}`)
  console.log(`   Errors: ${errorCount}`)
  
  if (errors.length > 0) {
    console.log('\nErrors:')
    errors.forEach(e => console.log(`  - ${e.student}: ${e.error}`))
  }
  
  return { 
    success: errorCount === 0, 
    successCount, 
    skippedCount,
    errorCount,
    errors,
    total: allStudents.length
  }
}

// Function to check if import has already been done
export async function checkImportStatus() {
  try {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .ilike('email', '%@ojo-historical.com')
    
    const totalStudents = studentsData.current_students.length + studentsData.historical_students.length
    const remaining = totalStudents - (count || 0)
    
    return {
      imported: count > 0,
      count: count || 0,
      total: totalStudents,
      remaining: remaining,
      complete: remaining === 0
    }
  } catch (error) {
    console.error('Error checking import status:', error)
    return { imported: false, count: 0, total: 0, remaining: 0, complete: false }
  }
}

// Function to get summary of imported data
export async function getImportSummary() {
  try {
    const { data: historicalProfiles, count: historicalCount } = await supabase
      .from('profiles')
      .select('id, full_name, email', { count: 'exact' })
      .ilike('email', '%@ojo-historical.com')
    
    const { data: students } = await supabase
      .from('students')
      .select('total_revenue, total_lessons_purchased, lesson_credits')
    
    const totalRevenue = students?.reduce((sum, s) => sum + (parseFloat(s.total_revenue) || 0), 0) || 0
    const totalLessons = students?.reduce((sum, s) => sum + (s.total_lessons_purchased || 0), 0) || 0
    const totalCredits = students?.reduce((sum, s) => sum + (s.lesson_credits || 0), 0) || 0
    
    return {
      historicalStudentCount: historicalCount || 0,
      totalStudents: students?.length || 0,
      totalRevenue,
      totalLessons,
      totalCredits
    }
  } catch (error) {
    console.error('Error getting import summary:', error)
    return null
  }
}
