import { supabase } from '../supabaseClient'
import studentsData from '../data/historicalStudents.json'

function generateEmail(name) {
  const cleaned = name.toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
  return `${cleaned}@historical.student`
}

// Generate a UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
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
          errorCount
        })
      }
      
      console.log(`[${i + 1}/${allStudents.length}] Importing ${student.name}...`)
      
      // Generate email and UUID
      const email = generateEmail(student.name)
      const newUserId = generateUUID()
      
      // Check if student already exists by email
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()
      
      if (existingProfile) {
        console.log(`⏭ ${student.name} already exists, skipping...`)
        skippedCount++
        continue
      }
      
      // Determine if current student (has active credits)
      const isCurrent = studentsData.current_students.find(s => s.name === student.name)
      
      // Insert profile directly (bypassing auth)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: newUserId,
          email: email,
          full_name: student.name,
          account_type: 'student',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (profileError) {
        console.error(`Profile error for ${student.name}:`, profileError)
        throw new Error(`Profile: ${profileError.message}`)
      }
      
      // Create student record
      const { error: studentError } = await supabase
        .from('students')
        .insert({
          id: newUserId,
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
        // Try to clean up the profile we just created
        await supabase.from('profiles').delete().eq('id', newUserId)
        throw new Error(`Student: ${studentError.message}`)
      }
      
      // Create payment transactions if student has packages (for current students)
      if (student.packages && student.packages.length > 0) {
        for (const pkg of student.packages) {
          if (pkg.amount > 0 || pkg.size > 0) {
            const { error: txError } = await supabase
              .from('payment_transactions')
              .insert({
                student_id: newUserId,
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
            student_id: newUserId,
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
      console.log(`✓ ${student.name}`)
      
      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 50))
      
    } catch (error) {
      errorCount++
      errors.push({ student: student.name, error: error.message })
      console.error(`✗ ${student.name}:`, error.message)
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
      .ilike('email', '%@historical.student')
    
    return {
      imported: count > 0,
      count: count || 0
    }
  } catch (error) {
    console.error('Error checking import status:', error)
    return { imported: false, count: 0 }
  }
}

// Function to get summary of imported data
export async function getImportSummary() {
  try {
    const { data: historicalProfiles, count: historicalCount } = await supabase
      .from('profiles')
      .select('id, full_name, email', { count: 'exact' })
      .ilike('email', '%@historical.student')
    
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
