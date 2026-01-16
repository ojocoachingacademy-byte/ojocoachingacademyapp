import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Service role client - bypasses RLS, use ONLY in coach components
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
