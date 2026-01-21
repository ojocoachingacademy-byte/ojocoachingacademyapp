import { createClient } from '@supabase/supabase-js'

// CRITICAL: Never hardcode credentials in source code
// These should ONLY come from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  // Provide helpful debugging information
  const envKeys = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'))
  const errorMessage = `
Missing Supabase environment variables!

Required variables:
- VITE_SUPABASE_URL: ${supabaseUrl ? '✓ Set' : '✗ Missing'}
- VITE_SUPABASE_ANON_KEY: ${supabaseKey ? '✓ Set' : '✗ Missing'}

Available VITE_ environment variables: ${envKeys.length > 0 ? envKeys.join(', ') : 'None found'}

For local development:
1. Create a .env file in the project root
2. Add: VITE_SUPABASE_URL=your_url
3. Add: VITE_SUPABASE_ANON_KEY=your_key
4. Restart the dev server

For production (Netlify):
1. Go to Site settings > Environment variables
2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
3. Redeploy the site

Note: Environment variables must be available at BUILD TIME for Vite to embed them.
  `.trim()
  
  console.error(errorMessage)
  throw new Error(errorMessage)
}

export const supabase = createClient(supabaseUrl, supabaseKey)