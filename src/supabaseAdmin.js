import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Service role client - bypasses RLS, use ONLY in coach components
// WARNING: Using service role key client-side is a security risk
// Ideally, admin operations should be done via Netlify functions

// Create admin client with proper error handling
let supabaseAdminInstance = null

if (!supabaseUrl) {
  console.error('VITE_SUPABASE_URL is missing. Supabase admin client will fallback to regular client.')
  console.error('Please set VITE_SUPABASE_URL in your environment variables.')
  supabaseAdminInstance = supabase // Fallback to regular client
} else if (!supabaseServiceKey) {
  console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY is missing. Admin operations will use regular client (may fail due to RLS).')
  console.warn('Note: Service role key should typically only be used in Netlify functions, not client-side code.')
  console.warn('For production, set VITE_SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables.')
  supabaseAdminInstance = supabase // Fallback to regular client
} else {
  // Both URL and service key are available - create admin client
  try {
    supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
    console.log('Supabase admin client initialized successfully')
  } catch (e) {
    console.error('Error creating supabase admin client:', e)
    supabaseAdminInstance = supabase // Fallback to regular client
  }
}

export const supabaseAdmin = supabaseAdminInstance
