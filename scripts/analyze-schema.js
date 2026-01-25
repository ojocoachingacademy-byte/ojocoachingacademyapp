import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('   Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function analyzeSchema() {
  console.log('🔍 Analyzing database schema...')

  try {
    // Use raw SQL query to get foreign key relationships
    // This is more reliable than trying to query information_schema directly
    const query = `
      SELECT 
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND (
          (ccu.table_schema = 'auth' AND ccu.table_name = 'users' AND ccu.column_name = 'id')
          OR (ccu.table_name = 'profiles' AND ccu.column_name = 'id')
          OR (ccu.table_name = 'students' AND ccu.column_name = 'id')
        )
      ORDER BY tc.table_name, kcu.column_name;
    `

    // Try using RPC if available, otherwise use direct query
    let foreignKeys = []
    
    try {
      // Try direct query first (PostgREST might support it)
      const { data, error } = await supabase.rpc('exec_sql', { query })
      
      if (error || !data) {
        // Fallback: query each table individually
        console.log('⚠️  RPC not available, using fallback method...')
        foreignKeys = await fallbackSchemaQuery()
      } else {
        foreignKeys = data
      }
    } catch (e) {
      console.log('⚠️  RPC failed, using fallback method...')
      foreignKeys = await fallbackSchemaQuery()
    }

    return processSchema(foreignKeys)
  } catch (error) {
    console.error('Error analyzing schema:', error)
    return null
  }
}

async function fallbackSchemaQuery() {
  // Fallback: manually check known tables
  // This is less ideal but works if RPC isn't available
  const knownTables = [
    { table: 'messages', columns: ['sender_id', 'receiver_id'], refs: ['auth.users.id'] },
    { table: 'conversations', columns: ['participant_1_id', 'participant_2_id'], refs: ['auth.users.id'] },
    { table: 'notifications', columns: ['user_id'], refs: ['auth.users.id'] },
    { table: 'profiles', columns: ['id'], refs: ['auth.users.id'] },
    { table: 'students', columns: ['id'], refs: ['profiles.id'] },
    { table: 'lessons', columns: ['student_id'], refs: ['students.id'] },
    { table: 'lesson_homework', columns: ['student_id'], refs: ['students.id'] },
    { table: 'skill_progress_snapshots', columns: ['student_id'], refs: ['students.id'] },
    { table: 'student_focus_areas', columns: ['student_id'], refs: ['students.id'] },
    { table: 'lesson_transactions', columns: ['student_id'], refs: ['students.id'] },
    { table: 'payment_transactions', columns: ['student_id'], refs: ['students.id'] },
    { table: 'testimonials', columns: ['student_id'], refs: ['students.id'] },
    { table: 'testimonial_requests', columns: ['student_id'], refs: ['students.id'] },
    { table: 'student_packages', columns: ['student_id'], refs: ['students.id'] },
    { table: 'skill_assessments', columns: ['student_id'], refs: ['students.id'] },
    { table: 'students', columns: ['paired_with_id'], refs: ['students.id'] },
    { table: 'students', columns: ['referred_by_student_id'], refs: ['students.id'] }
  ]

  return knownTables.flatMap(({ table, columns, refs }) => {
    return columns.map(column => {
      const ref = refs[0]
      const [refSchema, refTable, refColumn] = ref.split('.')
      return {
        table_name: table,
        column_name: column,
        foreign_table_schema: refSchema,
        foreign_table_name: refTable,
        foreign_column_name: refColumn
      }
    })
  })
}

function processSchema(foreignKeys) {
  // Group by referenced table
  const schema = {
    auth_users: [],
    profiles: [],
    students: []
  }

  foreignKeys.forEach(fk => {
    const entry = {
      table: fk.table_name || fk.table,
      column: fk.column_name || fk.column
    }

    const foreignTable = fk.foreign_table_name || fk.foreign_table
    const foreignColumn = fk.foreign_column_name || fk.foreign_column
    const foreignSchema = fk.foreign_table_schema || fk.foreign_schema

    if (foreignSchema === 'auth' && foreignTable === 'users' && foreignColumn === 'id') {
      schema.auth_users.push(entry)
    } else if (foreignTable === 'profiles' && foreignColumn === 'id') {
      schema.profiles.push(entry)
    } else if (foreignTable === 'students' && foreignColumn === 'id') {
      schema.students.push(entry)
    }
  })

  // Create hash of schema for change detection
  const schemaString = JSON.stringify(schema, null, 2)
  const schemaHash = crypto.createHash('md5').update(schemaString).digest('hex')

  return { schema, schemaHash, schemaString }
}

async function run() {
  const result = await analyzeSchema()
  
  if (!result) {
    console.error('❌ Failed to analyze schema')
    process.exit(1)
  }

  // Save schema snapshot
  const schemaPath = path.join(process.cwd(), '.schema-cache.json')
  fs.writeFileSync(schemaPath, JSON.stringify({
    hash: result.schemaHash,
    timestamp: new Date().toISOString(),
    schema: result.schema
  }, null, 2))

  console.log('✅ Schema analyzed successfully')
  console.log(`📊 Hash: ${result.schemaHash}`)
  console.log(`📁 Saved to: ${schemaPath}`)
  
  return result
}

// Export for use in other scripts
export { analyzeSchema, processSchema }

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
  run().catch(error => {
    console.error('Error:', error)
    process.exit(1)
  })
}
