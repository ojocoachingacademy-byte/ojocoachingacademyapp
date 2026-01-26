#!/usr/bin/env node

/**
 * Pre-commit hook script
 * Checks if database schema changed and regenerates delete function if needed
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

// Load .env file
function loadEnv() {
  const envPath = path.join(rootDir, '.env')
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  No .env file found, skipping schema check')
    return false
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const lines = envContent.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=')
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim()
        const value = trimmed.substring(equalIndex + 1).trim()
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '')
        process.env[key] = cleanValue
      }
    }
  }
  
  return true
}

// Check if credentials are available
function hasCredentials() {
  return !!(process.env.VITE_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Get schema hash
function getSchemaHash() {
  const schemaPath = path.join(rootDir, '.schema-cache.json')
  if (!fs.existsSync(schemaPath)) {
    return 'none'
  }
  
  try {
    const schemaCache = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
    return schemaCache.hash || 'none'
  } catch (e) {
    return 'none'
  }
}

// Get previous hash from git
function getPreviousHash() {
  try {
    const result = execSync('git show HEAD:.schema-cache.json', { 
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
      cwd: rootDir
    })
    const schemaCache = JSON.parse(result)
    return schemaCache.hash || 'none'
  } catch (e) {
    return 'none'
  }
}

// Run npm script
function runNpmScript(script) {
  try {
    execSync(`npm run ${script}`, {
      stdio: 'inherit',
      cwd: rootDir
    })
    return true
  } catch (e) {
    return false
  }
}

// Stage files for commit
function stageFiles(files) {
  try {
    execSync(`git add ${files.join(' ')}`, {
      stdio: 'ignore',
      cwd: rootDir
    })
    return true
  } catch (e) {
    return false
  }
}

// Main execution
async function main() {
  // Load .env file
  const envLoaded = loadEnv()
  
  // Only run schema check if credentials are available
  if (!hasCredentials()) {
    console.log('⚠️  Supabase credentials not available, skipping schema check')
    process.exit(0)
  }

  console.log('🔍 Checking if database schema changed...')

  const schemaCachePath = path.join(rootDir, '.schema-cache.json')
  
  // Check if .schema-cache.json exists
  if (!fs.existsSync(schemaCachePath)) {
    console.log('⚠️  No schema cache found, generating...')
    if (runNpmScript('generate-delete-function')) {
      stageFiles(['netlify/functions/delete-auth-user.js', '.schema-cache.json'])
      console.log('✅ Delete function generated and added to commit')
    } else {
      console.log('⚠️  Could not generate delete function')
    }
    process.exit(0)
  }

  // Analyze current schema
  if (!runNpmScript('analyze-schema')) {
    console.log('⚠️  Could not analyze schema, skipping...')
    process.exit(0)
  }

  // Get current and previous hashes
  const currentHash = getSchemaHash()
  const previousHash = getPreviousHash()

  if (currentHash !== previousHash) {
    console.log(`📝 Schema changed (${previousHash} → ${currentHash}), regenerating delete function...`)
    if (runNpmScript('generate-delete-function')) {
      stageFiles(['netlify/functions/delete-auth-user.js', '.schema-cache.json'])
      console.log('✅ Delete function updated automatically')
    } else {
      console.log('⚠️  Could not regenerate delete function')
    }
  } else {
    console.log('✅ Schema unchanged, no regeneration needed')
  }

  // Check if delete function or schema files were manually modified
  try {
    const stagedFiles = execSync('git diff --cached --name-only', {
      encoding: 'utf-8',
      cwd: rootDir
    }).trim().split('\n').filter(f => f)

    const relevantFiles = stagedFiles.filter(f => 
      f.includes('delete-auth-user.js') || 
      f.endsWith('.sql') || 
      f.includes('supabase/migrations')
    )

    if (relevantFiles.length > 0) {
      console.log('⚠️  Delete function or database schema files modified. Running validation...')
      if (!runNpmScript('check-delete')) {
        console.log('❌ Delete function validation failed. Please fix issues before committing.')
        process.exit(1)
      }
    }
  } catch (e) {
    // Ignore errors in checking staged files
  }

  process.exit(0)
}

main().catch((error) => {
  console.error('Error in pre-commit hook:', error)
  process.exit(1)
})
