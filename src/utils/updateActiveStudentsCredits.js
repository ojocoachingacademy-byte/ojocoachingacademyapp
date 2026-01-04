import { supabase } from '../supabaseClient'

// Active students with their correct credits
const activeStudentsData = [
  { name: 'David', credits: 3, notes: 'most recent: 10 bought, 7 taken' },
  { name: 'Gideon', credits: 4, notes: 'most recent: 5 bought, 1 taken' },
  { name: 'Eric', credits: 4, notes: 'most recent: 5 bought, 1 taken' },
  { name: 'Ariel', credits: 5, notes: '5 bought, 0 taken' },
  { name: 'Tharak', credits: 18, notes: 'most recent: 20 bought, 2 taken' },
  { name: 'Garrett', credits: 10, notes: 'most recent: 10 bought, 0 taken' },
  { name: 'Tom', credits: 5, notes: 'most recent: 5 bought, 0 taken' },
  { name: 'Karen', credits: 5, notes: 'most recent: 5 bought, 0 taken' },
  { name: 'Kathy and Kelly', credits: 5, notes: 'most recent: 5 bought, 0 taken' },
  { name: 'Chang', credits: 5, notes: 'most recent: 5 bought, 0 taken' },
  { name: 'Hanna', credits: 20, notes: '20 bought, 0 taken' },
  { name: 'Ryan', credits: 3, notes: 'most recent: 5 bought, 2 taken' },
  { name: 'Yang', credits: 3, notes: '3 bought, 0 taken' },
  { name: 'Amrita', credits: 5, notes: '5 bought, 0 taken' },
  { name: 'Todd Z', credits: 0, notes: '0 credits' },
  { name: 'Kaitlin and Matt', credits: 0, notes: '0 credits' },
  { name: 'Jeanmarie', credits: 1, notes: '1 credit' }
]

export async function updateActiveStudentsCredits() {
  console.log('🔄 Updating active students credits and status...')
  
  try {
    // First, get all students (fetch separately to avoid relationship ambiguity)
    const { data: allStudents, error: fetchError } = await supabase
      .from('students')
      .select('id')
    
    if (fetchError) {
      throw new Error(`Failed to fetch students: ${fetchError.message}`)
    }
    
    console.log(`Found ${allStudents.length} total students in database`)
    
    // Get all profile IDs for matching
    const studentIds = allStudents.map(s => s.id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds)
    
    const profileMap = new Map()
    profiles.forEach(p => {
      profileMap.set(p.id, p.full_name)
    })
    
    // Create a map of students by name (case-insensitive)
    const studentsByName = new Map()
    allStudents.forEach(s => {
      const name = profileMap.get(s.id) || ''
      const nameLower = name.toLowerCase().trim()
      if (!studentsByName.has(nameLower)) {
        studentsByName.set(nameLower, [])
      }
      studentsByName.get(nameLower).push({ ...s, full_name: name })
    })
    
    let updatedCount = 0
    let notFoundCount = 0
    let errorCount = 0
    
    // First, mark all students as inactive
    const { error: inactiveError } = await supabase
      .from('students')
      .update({ is_active: false })
    
    if (inactiveError) {
      console.error('Error marking all students inactive:', inactiveError.message)
    } else {
      console.log(`✅ Marked all students as inactive (will reactivate active ones)`)
    }
    
    // Update each active student
    for (const activeStudent of activeStudentsData) {
      try {
        const searchName = activeStudent.name.toLowerCase().trim()
        
        // Try exact match first
        let matchedStudents = studentsByName.get(searchName) || []
        
        // Try partial matches for names like "Kathy and Kelly" or "Kaitlin and Matt"
        if (matchedStudents.length === 0) {
          for (const [dbName, students] of studentsByName.entries()) {
            if (dbName.includes(searchName) || searchName.includes(dbName.split(' ')[0])) {
              matchedStudents = students
              break
            }
          }
        }
        
        if (matchedStudents.length === 0) {
          console.log(`⚠️ Not found: ${activeStudent.name}`)
          notFoundCount++
          continue
        }
        
        // Use first match (or handle multiple matches)
        const student = matchedStudents[0]
        
        if (matchedStudents.length > 1) {
          console.log(`⚠️ Multiple matches for ${activeStudent.name}, using first: ${student.full_name}`)
        }
        
        // Update student
        const { error: updateError } = await supabase
          .from('students')
          .update({
            lesson_credits: activeStudent.credits,
            is_active: true
          })
          .eq('id', student.id)
        
        if (updateError) {
          console.error(`❌ Error updating ${activeStudent.name}:`, updateError.message)
          errorCount++
        } else {
          console.log(`✅ Updated ${student.full_name}: ${activeStudent.credits} credits, active`)
          updatedCount++
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error processing ${activeStudent.name}:`, error.message)
        errorCount++
      }
    }
    
    
    console.log(`\n✅ Update complete!`)
    console.log(`  Updated: ${updatedCount}`)
    console.log(`  Not found: ${notFoundCount}`)
    console.log(`  Errors: ${errorCount}`)
    
    return { 
      success: true, 
      updatedCount, 
      notFoundCount, 
      errorCount 
    }
    
  } catch (error) {
    console.error('❌ Update failed:', error)
    return { success: false, error: error.message }
  }
}

