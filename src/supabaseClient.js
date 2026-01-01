import { createClient } from '@supabase/supabase-js'

// Use environment variables with fallback for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'

export const supabase = createClient(supabaseUrl, supabaseKey)