import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ajjqhksdufotifsyejjg.supabase.co'
const supabaseKey = 'sb_publishable_BNRwUcCpy4ZZfXfmC8NzVw_JBCEgI2Y'

export const supabase = createClient(supabaseUrl, supabaseKey)