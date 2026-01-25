/**
 * VALIDATION SCRIPT: Check Delete Function Completeness
 * 
 * Run this script to check if the delete-auth-user function is missing any tables
 * 
 * Usage: node scripts/check-delete-function.js
 * 
 * This script will:
 * 1. Query the database for all foreign key relationships
 * 2. Compare against the tables listed in delete-auth-user.js
 * 3. Report any missing tables
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:')
  console.error('   SUPABASE_URL or VITE_SUPABASE_URL')
  console.error('   SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nSet these in your .env file or environment')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

// Read the delete function to extract known tables
function extractKnownTables() {
  const deleteFunctionPath = join(__dirname, '..', 'netlify', 'functions', 'delete-auth-user.js')
  const content = readFileSync(deleteFunctionPath, 'utf-8')
  
  // Extract tables from the knownTables array in the validation function
  const knownTablesMatch = content.match(/const knownTables = \[([^\]]+)\]/)
  if (knownTablesMatch) {
    return knownTablesMatch[1]
      .split(',')
      .map(t => t.trim().replace(/['"]/g, ''))
      .filter(t => t)
  }
  
  // Fallback: extract from comments
  const tables = []
  const commentMatch = content.match(/Current tables being deleted.*?Auth user/s)
  if (commentMatch) {
    const lines = commentMatch[0].split('\n')
    lines.forEach(line => {
      const tableMatch = line.match(/\d+\.\s+(\w+)/)
      if (tableMatch) {
        tables.push(tableMatch[1])
      }
    })
  }
  
  return [...new Set(tables)] // Remove duplicates
}

async function checkAllForeignKeys() {
  console.log('🔍 Checking for all foreign key relationships...\n')
  
  const knownTables = extractKnownTables()
  console.log(`✓ Found ${knownTables.length} known tables in delete function:\n   ${knownTables.join(', ')}\n`)
  
  // Common tables to check (expand this list as you add features)
  const allPossibleTables = [
    { table: 'messages', columns: ['sender_id', 'receiver_id', 'conversation_id'] },
    { table: 'conversations', columns: ['participant_1_id', 'participant_2_id'] },
    { table: 'notifications', columns: ['user_id'] },
    { table: 'testimonial_requests', columns: ['student_id'] },
    { table: 'testimonials', columns: ['student_id'] },
    { table: 'hitting_partners', columns: ['id'] },
    { table: 'scheduled_notifications', columns: [] }, // Check metadata
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
    { table: 'students', columns: ['id', 'referred_by_student_id'] },
    { table: 'profiles', columns: ['id'] }
  ]
  
  const missing = []
  const found = []
  
  for (const tableInfo of allPossibleTables) {
    for (const column of tableInfo.columns) {
      try {
        // Check if table exists and has the column
        const { data, error, count } = await supabaseAdmin
          .from(tableInfo.table)
          .select(column, { count: 'exact', head: true })
          .limit(0)
        
        if (error) {
          if (error.message?.includes('does not exist') || error.code?.includes('42P01')) {
            // Table doesn't exist, skip
            continue
          }
          console.warn(`⚠️  Error checking ${tableInfo.table}.${column}: ${error.message}`)
          continue
        }
        
        // Table exists and has this column
        found.push(`${tableInfo.table}.${column}`)
        
        // Check if it's in our known tables list
        if (!knownTables.includes(tableInfo.table)) {
          missing.push({
            table: tableInfo.table,
            column: column,
            reason: 'Table exists but not in delete function'
          })
        }
      } catch (err) {
        // Ignore errors for non-existent tables
        if (!err.message?.includes('does not exist')) {
          console.warn(`⚠️  Exception checking ${tableInfo.table}.${column}: ${err.message}`)
        }
      }
    }
  }
  
  console.log(`✓ Checked ${found.length} foreign key relationships\n`)
  
  if (missing.length > 0) {
    console.error('❌ MISSING TABLES IN DELETE FUNCTION:\n')
    missing.forEach(({ table, column, reason }) => {
      console.error(`   - ${table}.${column}`)
      console.error(`     Reason: ${reason}`)
      console.error(`     Action: Add deletion code for this table in delete-auth-user.js\n`)
    })
    console.error('⚠️  The delete function will fail if these tables have foreign key constraints!')
    process.exit(1)
  } else {
    console.log('✅ All foreign key relationships are handled in the delete function!')
    process.exit(0)
  }
}

// Run the check
checkAllForeignKeys().catch(error => {
  console.error('❌ Error running validation:', error)
  process.exit(1)
})
