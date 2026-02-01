#!/usr/bin/env node

/**
 * Backfill profiles with phone, full_name, ntrp_level from auth user_metadata.
 * Use when profiles were created by a trigger without metadata (e.g. before EmailConfirmed fix).
 *
 * Requires: SUPABASE_URL or VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 * Usage: node scripts/backfill-profile-from-auth.js
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

function loadEnv() {
  const envPath = join(rootDir, '.env')
  if (!existsSync(envPath)) return
  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const i = trimmed.indexOf('=')
      if (i > 0) {
        const key = trimmed.slice(0, i).trim()
        let value = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
        process.env[key] = value
      }
    }
  }
}
loadEnv()

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function main() {
  console.log('Fetching all profiles...')
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, phone, ntrp_level')
    .order('id')

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError.message)
    process.exit(1)
  }

  if (!profiles?.length) {
    console.log('No profiles found.')
    process.exit(0)
  }

  console.log(`Found ${profiles.length} profile(s). Checking auth user_metadata for missing phone/name/ntrp...\n`)

  let updated = 0
  let skipped = 0
  let errors = 0

  for (const profile of profiles) {
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(profile.id)

    if (userError || !user) {
      console.warn(`  ⚠ ${profile.id}: could not get auth user (${userError?.message || 'not found'})`)
      errors++
      continue
    }

    const meta = user.user_metadata || {}
    const metaPhone = meta.phone ? String(meta.phone).replace(/\D/g, '').slice(0, 10) : null
    const metaFullName = meta.full_name ? String(meta.full_name).trim() : null
    const metaNtrp = meta.ntrp_level != null ? String(meta.ntrp_level) : null

    const needsPhone = !profile.phone && metaPhone
    const needsName = !profile.full_name?.trim() && metaFullName
    const needsNtrp = !profile.ntrp_level && metaNtrp

    if (!needsPhone && !needsName && !needsNtrp) {
      skipped++
      continue
    }

    const updates = {}
    if (needsPhone) updates.phone = metaPhone
    if (needsName) updates.full_name = metaFullName
    if (needsNtrp) updates.ntrp_level = metaNtrp

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id)

    if (updateError) {
      console.warn(`  ❌ ${profile.id}: update failed: ${updateError.message}`)
      errors++
      continue
    }

    updated++
    console.log(`  ✓ ${profile.id}: updated ${Object.keys(updates).join(', ')}`)
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
