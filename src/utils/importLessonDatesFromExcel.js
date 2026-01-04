import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'

export async function importLessonDatesFromExcel(file) {
  console.log('📅 Importing lesson dates from Excel...')
  
  try {
    // Read Excel file
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(worksheet)
    
    console.log(`Total rows in Excel: ${rows.length}`)
    
    // Extract lessons
    const lessons = []
    const leadSourceMap = {}
    
    for (const row of rows) {
      const title = row.Title || ''
      const startDate = row.Start
      
      if (!title.toLowerCase().includes('lesson with')) {
        continue
      }
      
      // Extract student name (after "Lesson with" and before $)
      const nameMatch = title.match(/lesson with\s+([^$\d\/]+)/i)
      if (!nameMatch) continue
      
      let name = nameMatch[1].trim()
      
      // Clean up name
      name = name.replace(/\s+/g, ' ')
      
      // Extract lead source
      let leadSource = null
      const titleLower = title.toLowerCase()
      if (titleLower.includes('groupon')) leadSource = 'Groupon'
      else if (titleLower.includes('findtennislessons')) leadSource = 'Findtennislessons'
      else if (titleLower.includes('playyourcourt')) leadSource = 'Playyourcourt'
      else if (titleLower.includes('thumbtack')) leadSource = 'Thumbtack'
      else if (titleLower.includes('teachme')) leadSource = 'TeachMe'
      
      if (leadSource) {
        leadSourceMap[name] = leadSource
      }
      
      // Parse date
      let lessonDate
      if (startDate instanceof Date) {
        lessonDate = startDate.toISOString().split('T')[0]
      } else if (typeof startDate === 'string') {
        lessonDate = new Date(startDate).toISOString().split('T')[0]
      } else {
        continue
      }
      
      lessons.push({
        name: name,
        date: lessonDate
      })
    }
    
    console.log(`Extracted ${lessons.length} lesson entries`)
    console.log(`Found ${Object.keys(leadSourceMap).length} students with lead sources`)
    
    // Group by student
    const studentLessons = {}
    for (const lesson of lessons) {
      if (!studentLessons[lesson.name]) {
        studentLessons[lesson.name] = []
      }
      studentLessons[lesson.name].push(lesson.date)
    }
    
    console.log(`Unique students in Excel: ${Object.keys(studentLessons).length}`)
    
    // Match Excel names to database names and create transactions
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    for (const [excelName, dates] of Object.entries(studentLessons)) {
      try {
        // Remove duplicates and sort
        const uniqueDates = [...new Set(dates)].sort()
        
        // Try to find student in database
        // Try multiple matching strategies
        const { data: profiles, error: searchError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .or(`full_name.ilike.%${excelName}%,full_name.ilike.${excelName.split(' ')[0]}%`)
          .limit(5)
        
        if (searchError) throw searchError
        
        let matchedProfile = null
        
        // Try exact match first
        matchedProfile = profiles?.find(p => 
          p.full_name.toLowerCase() === excelName.toLowerCase()
        )
        
        // Try fuzzy match
        if (!matchedProfile && profiles?.length > 0) {
          matchedProfile = profiles[0]
        }
        
        if (!matchedProfile) {
          console.log(`⚠️ No match found for: ${excelName}`)
          errorCount++
          continue
        }
        
        console.log(`✓ Matched "${excelName}" → ${matchedProfile.full_name}`)
        
        // Check if lesson transactions already exist
        // Try lesson_transactions table first, fallback to payment_transactions
        let existing = []
        try {
          const { data: lessonTransactions } = await supabase
            .from('lesson_transactions')
            .select('id')
            .eq('student_id', matchedProfile.id)
            .eq('transaction_type', 'lesson_taken')
            .limit(1)
          
          existing = lessonTransactions || []
        } catch (tableError) {
          // Table doesn't exist, try payment_transactions
          const { data: paymentTransactions } = await supabase
            .from('payment_transactions')
            .select('id')
            .eq('student_id', matchedProfile.id)
            .limit(1)
          
          existing = paymentTransactions || []
        }
        
        if (existing && existing.length > 0) {
          console.log(`  Already has lesson transactions, skipping`)
          skippedCount++
          continue
        }
        
        // Create lesson_taken transactions
        const transactions = uniqueDates.map(date => ({
          student_id: matchedProfile.id,
          transaction_date: date,
          amount_paid: 0,
          package_size: 0,
          transaction_type: 'lesson_taken'
        }))
        
        let insertError = null
        try {
          const { error } = await supabase
            .from('lesson_transactions')
            .insert(transactions)
          insertError = error
        } catch (tableError) {
          // Table doesn't exist, use payment_transactions with metadata
          const { error } = await supabase
            .from('payment_transactions')
            .insert(transactions.map(t => ({
              student_id: t.student_id,
              created_at: t.transaction_date,
              amount: 0,
              lesson_credits: 0,
              notes: `Lesson taken on ${t.transaction_date}`,
              metadata: { transaction_type: 'lesson_taken' }
            })))
          insertError = error
        }
        
        if (insertError) throw insertError
        
        // Update lead_source if found
        const leadSource = leadSourceMap[excelName]
        if (leadSource) {
          await supabase
            .from('students')
            .update({ lead_source: leadSource })
            .eq('id', matchedProfile.id)
          
          console.log(`  Set lead_source: ${leadSource}`)
        }
        
        console.log(`  Created ${transactions.length} lesson transactions`)
        successCount++
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.error(`❌ Error for ${excelName}:`, error.message)
        errorCount++
      }
    }
    
    console.log(`\n✅ Import complete!`)
    console.log(`  Success: ${successCount}`)
    console.log(`  Skipped: ${skippedCount}`)
    console.log(`  Errors: ${errorCount}`)
    
    return { success: true, successCount, skippedCount, errorCount }
    
  } catch (error) {
    console.error('❌ Import failed:', error)
    return { success: false, error: error.message }
  }
}

