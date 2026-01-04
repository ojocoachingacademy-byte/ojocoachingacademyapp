import { supabase } from '../supabaseClient'

export async function parseCsvAndCreateLessonTransactions() {
  console.log('🚀 Parsing CSV and creating lesson transactions...')
  
  try {
    // Read the CSV file from /tmp (in browser, this would be from a file input or public folder)
    // Since we can't read from /tmp in browser, we'll need to use a file input
    // For now, let's try to fetch from public folder or use a file input approach
    
    // Try to fetch from public folder first
    let csvText
    try {
      const response = await fetch('/Lesson Log-Table 1.csv')
      if (!response.ok) {
        throw new Error('CSV file not found in public folder')
      }
      csvText = await response.text()
    } catch (fetchError) {
      // If file doesn't exist in public, return error message
      return {
        success: false,
        error: 'CSV file not found. Please place "Lesson Log-Table 1.csv" in the public folder.'
      }
    }
    
    // Parse CSV
    const lines = csvText.split('\n').filter(line => line.trim())
    const entries = []
    
    // Skip header row, process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      
      // Split by comma, handling quoted fields
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
      if (!matches || matches.length < 4) continue
      
      const name = matches[0].replace(/"/g, '').trim()
      const date = matches[1].replace(/"/g, '').trim()
      const amount = parseFloat(matches[2].replace(/[^0-9.]/g, '')) || 0
      const hours = parseFloat(matches[3].replace(/[^0-9.]/g, '')) || 0
      
      if (name && date) {
        entries.push({ name, date, amount, hours })
      }
    }
    
    console.log(`📄 Parsed ${entries.length} entries from CSV`)
    
    if (entries.length === 0) {
      return { success: false, error: 'No entries found in CSV file' }
    }
    
    // Reverse entries to go from oldest to newest
    entries.reverse()
    
    // Assign years working backwards from December 2025
    let currentYear = 2025
    let lastMonth = 11 // December (0-indexed)
    
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    entries.forEach(entry => {
      // Extract month from date string
      const monthMatch = entry.date.match(/([A-Za-z]+)/)
      if (!monthMatch) return
      
      const monthName = monthMatch[1]
      const monthIndex = monthNames.findIndex(m => 
        m.toLowerCase().startsWith(monthName.toLowerCase())
      )
      
      if (monthIndex === -1) return
      
      // If we see a later month while going backwards, we've crossed a year boundary
      if (monthIndex > lastMonth) {
        currentYear--
      }
      
      lastMonth = monthIndex
      
      // Extract day from date string
      const dayMatch = entry.date.match(/(\d+)/)
      const day = dayMatch ? parseInt(dayMatch[1]) : 1
      
      // Create ISO date string
      const month = (monthIndex + 1).toString().padStart(2, '0')
      const dayStr = day.toString().padStart(2, '0')
      entry.fullDate = `${currentYear}-${month}-${dayStr}`
      entry.year = currentYear
    })
    
    // Reverse back to newest first
    entries.reverse()
    
    console.log('📅 Assigned years to all entries')
    if (entries.length > 0) {
      console.log(`Date range: ${entries[entries.length - 1].fullDate} to ${entries[0].fullDate}`)
    }
    
    // Group entries by student name
    const studentEntries = {}
    entries.forEach(entry => {
      const cleanName = cleanStudentName(entry.name)
      if (!studentEntries[cleanName]) {
        studentEntries[cleanName] = []
      }
      studentEntries[cleanName].push(entry)
    })
    
    console.log(`👥 Found ${Object.keys(studentEntries).length} unique students`)
    
    // Create lesson_taken transactions for each student
    let successCount = 0
    let errorCount = 0
    let skippedCount = 0
    
    for (const [studentName, studentLessons] of Object.entries(studentEntries)) {
      try {
        // Find student in database - try multiple matching strategies
        const cleanNameUpper = cleanStudentName(studentName).split(' ').map(n => n.charAt(0).toUpperCase() + n.slice(1)).join(' ')
        
        const { data: profiles, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .ilike('full_name', `%${cleanNameUpper}%`)
        
        let profile = profiles && profiles.length > 0 ? profiles[0] : null
        
        // If not found, try with email pattern
        if (!profile) {
          const email = generateEmail(studentName)
          const { data: profilesByEmail } = await supabase
            .from('profiles')
            .select('id, full_name')
            .ilike('email', `%${email}%`)
          profile = profilesByEmail && profilesByEmail.length > 0 ? profilesByEmail[0] : null
        }
        
        if (!profile) {
          console.log(`❌ ${studentName}: Not found in database`)
          errorCount++
          continue
        }
        
        // Get unique lesson dates (filter out package purchases which have amount > 0)
        const lessonDates = [...new Set(studentLessons
          .filter(lesson => lesson.hours > 0) // Only count actual lessons
          .map(lesson => lesson.fullDate)
        )]
        
        if (lessonDates.length === 0) {
          console.log(`⚠️ ${studentName}: No lesson dates found`)
          skippedCount++
          continue
        }
        
        // Check if transactions already exist (using payment_transactions table with transaction_type)
        // Or check if lesson_transactions table exists
        let existing = []
        try {
          const { data: lessonTransactions } = await supabase
            .from('lesson_transactions')
            .select('transaction_date')
            .eq('student_id', profile.id)
            .eq('transaction_type', 'lesson_taken')
          
          existing = lessonTransactions || []
        } catch (tableError) {
          // Table might not exist, try payment_transactions instead
          const { data: paymentTransactions } = await supabase
            .from('payment_transactions')
            .select('id')
            .eq('student_id', profile.id)
            .limit(1)
          
          existing = paymentTransactions || []
        }
        
        if (existing && existing.length > 0) {
          console.log(`⏭️ ${studentName}: Already has ${existing.length} transactions, skipping`)
          skippedCount++
          continue
        }
        
        // Create lesson_taken transactions
        // Try lesson_transactions table first, fallback to payment_transactions
        const transactions = lessonDates.map(date => ({
          student_id: profile.id,
          transaction_date: date,
          transaction_type: 'lesson_taken',
          amount_paid: 0,
          package_size: 0
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
        
        if (insertError) {
          console.error(`❌ ${studentName}:`, insertError.message)
          errorCount++
        } else {
          console.log(`✅ ${studentName}: Created ${transactions.length} lesson transactions`)
          successCount++
        }
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50))
        
      } catch (error) {
        console.error(`❌ ${studentName}:`, error.message)
        errorCount++
      }
    }
    
    console.log('\n✅ Complete!')
    console.log(`Success: ${successCount} students`)
    console.log(`Skipped: ${skippedCount} students`)
    console.log(`Errors: ${errorCount} students`)
    
    return { success: true, successCount, skippedCount, errorCount }
    
  } catch (error) {
    console.error('❌ Script failed:', error)
    return { success: false, error: error.message }
  }
}

function cleanStudentName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s&]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function generateEmail(name) {
  const cleaned = name.toLowerCase()
    .replace(/[^a-z0-9\s&]/g, '')
    .replace(/\s+/g, '-')
    .replace(/&/g, 'and')
  return `${cleaned}@ojo-historical.com`
}

