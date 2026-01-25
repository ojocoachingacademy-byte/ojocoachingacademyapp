import { analyzeSchema } from './analyze-schema.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function generateDeletionCode(schema) {
  let code = ''
  
  code += '    // AUTO-GENERATED - DO NOT EDIT MANUALLY\n'
  code += '    // Regenerate with: npm run generate-delete-function\n'
  code += '    // Or automatically on git commit\n\n'

  code += '    console.log("Deleting related records for user:", userId)\n\n'

  // Step 1: Delete from tables referencing auth.users
  if (schema.auth_users.length > 0) {
    code += '    // Step 1: Delete records referencing auth.users\n'
    const authUserTables = new Map()
    schema.auth_users.forEach(({ table, column }) => {
      if (!authUserTables.has(table)) {
        authUserTables.set(table, [])
      }
      authUserTables.get(table).push(column)
    })
    
    authUserTables.forEach((columns, table) => {
      if (columns.length === 1) {
        code += generateDeleteBlock(table, columns[0])
      } else {
        // Multiple columns in same table - use .or()
        code += generateDeleteBlockMultiple(table, columns)
      }
    })
  }

  // Step 2: Delete from tables referencing students
  if (schema.students.length > 0) {
    code += '\n    // Step 2: Delete records referencing students\n'
    const studentTables = new Map()
    schema.students.forEach(({ table, column }) => {
      // Skip self-references (will handle separately)
      if (table === 'students' && (column === 'paired_with_id' || column === 'referred_by_student_id')) {
        return
      }
      if (!studentTables.has(table)) {
        studentTables.set(table, [])
      }
      studentTables.get(table).push(column)
    })
    
    studentTables.forEach((columns, table) => {
      if (columns.length === 1) {
        code += generateDeleteBlock(table, columns[0])
      } else {
        // Multiple columns in same table - use .or()
        code += generateDeleteBlockMultiple(table, columns)
      }
    })
  }

  // Step 3: Clear self-references in students table
  code += '\n    // Step 3: Clear self-referencing fields in students table\n'
  const selfRefs = schema.students.filter(({ table, column }) => 
    table === 'students' && (column === 'paired_with_id' || column === 'referred_by_student_id')
  )
  
  selfRefs.forEach(({ column }) => {
    code += generateUpdateBlock('students', column)
  })

  // Step 4: Delete main records
  code += '\n    // Step 4: Delete main records\n'
  code += generateDeleteBlock('students', 'id')
  code += generateDeleteBlock('profiles', 'id')

  return code
}

function generateDeleteBlock(table, column) {
  return `    try {
      const { error } = await supabaseAdmin
        .from('${table}')
        .delete()
        .eq('${column}', userId)
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from ${table}:', error.message)
      } else {
        console.log('✓ Deleted from ${table}')
      }
    } catch (error) {
      console.error('Error deleting from ${table}:', error.message)
    }
`
}

function generateDeleteBlockMultiple(table, columns) {
  const orConditions = columns.map(col => `${col}.eq.${userId}`).join(',')
  return `    try {
      const { error } = await supabaseAdmin
        .from('${table}')
        .delete()
        .or('${orConditions}')
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error deleting from ${table}:', error.message)
      } else {
        console.log('✓ Deleted from ${table}')
      }
    } catch (error) {
      console.error('Error deleting from ${table}:', error.message)
    }
`
}

function generateUpdateBlock(table, column) {
  return `    try {
      const { error } = await supabaseAdmin
        .from('${table}')
        .update({ ${column}: null })
        .eq('${column}', userId)
      
      if (error) {
        console.error('Error clearing ${table}.${column}:', error.message)
      } else {
        console.log('✓ Cleared ${table}.${column}')
      }
    } catch (error) {
      console.error('Error clearing ${table}.${column}:', error.message)
    }
`
}

function generateFunction(deletionCode) {
  return `import { createClient } from '@supabase/supabase-js'

/**
 * DELETE STUDENT FUNCTION - AUTO-GENERATED
 * 
 * ⚠️ THIS FILE IS AUTO-GENERATED - DO NOT EDIT MANUALLY
 * 
 * To regenerate:
 *   npm run generate-delete-function
 * 
 * Or it will regenerate automatically on git commit if schema changed.
 */

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    const { userId } = body

    if (!userId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userId is required' })
      }
    }

    console.log('Deleting user:', userId)

${deletionCode}

    // Finally delete auth user
    console.log('Deleting auth user...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('Auth deletion error:', authError)
      // Return partial success if all app data is deleted
      const { count: studentCount } = await supabaseAdmin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)
      
      const { count: profileCount } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId)

      if (studentCount === 0 && profileCount === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            partial: true,
            message: 'All app data deleted, but auth user deletion failed',
            warning: 'Auth user may need to be deleted manually from Supabase dashboard'
          })
        }
      }

      throw new Error(\`Auth deletion failed: \${authError.message}\`)
    }

    console.log('✅ User deleted successfully')

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User deleted successfully'
      })
    }
  } catch (error) {
    console.error('Error deleting user:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to delete user',
        details: error.message
      })
    }
  }
}
`
}

async function run() {
  console.log('🔧 Generating delete function...')

  const result = await analyzeSchema()
  
  if (!result) {
    console.error('❌ Schema analysis failed')
    process.exit(1)
  }

  const deletionCode = generateDeletionCode(result.schema)
  const fullFunction = generateFunction(deletionCode)

  // Write to netlify functions
  const outputPath = path.join(process.cwd(), 'netlify', 'functions', 'delete-auth-user.js')
  const outputDir = path.dirname(outputPath)
  
  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }
  
  fs.writeFileSync(outputPath, fullFunction)

  console.log('✅ Generated delete-auth-user.js')
  console.log(`📁 ${outputPath}`)
  console.log(`📊 Schema hash: ${result.schemaHash}`)
}

run().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
