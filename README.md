# OJO Coaching Academy App

A comprehensive coaching management platform for tennis instructors and students.

## Features

- **Student Dashboard**: View lessons, development plans, and submit learnings
- **Coach Dashboard**: Manage students, create lessons, generate AI-powered lesson plans
- **Development Plans**: Track student skill progress and goals
- **Hitting Partner Directory**: Connect students and players
- **Lesson Management**: Schedule, track, and manage tennis lessons

## Tech Stack

- React 19
- Vite
- Supabase (Authentication & Database)
- Anthropic Claude AI (Lesson Plan Generation)
- React Router DOM

## Setup

1. Clone the repository:
```bash
git clone https://github.com/ojocoachingacademy-byte/ojocoachingacademyapp.git
cd ojocoachingacademyapp
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

## Database Setup

Run the SQL scripts in your Supabase SQL Editor:

1. `supabase_rls_fix.sql` - Sets up Row-Level Security policies
2. `lessons_rls_policies.sql` - Lesson-specific RLS policies
3. `students_table_update.sql` - Adds development plan columns
4. `development_focus_areas_table.sql` - Development focus areas table (if needed)

## Build

Build for production:
```bash
npm run build
```

The build output will be in the `dist` directory.

## Deployment

### Vercel

The app is configured for Vercel deployment. Just connect your GitHub repository to Vercel and it will automatically:
- Build command: `npm run build`
- Output directory: `dist`

Make sure to add your environment variables in Vercel's dashboard.

### Netlify

The app is also configured for Netlify. Deploy by:
1. Connect your GitHub repository to Netlify
2. Netlify will auto-detect the settings from `netlify.toml`
3. Add environment variables in Netlify's dashboard

## Environment Variables

### Required for Local Development

Create a `.env` file in the root directory with:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Required for Production (Netlify)

**CRITICAL**: Environment variables must be set in Netlify's dashboard, not just in a local `.env` file.

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** > **Environment variables**
3. Add the following variables:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key
   - `VITE_SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for admin operations)
   - `VITE_ANTHROPIC_API_KEY` - Your Anthropic API key
   - `SUPABASE_SERVICE_ROLE_KEY` - Same as above (for Netlify functions)

4. **Redeploy** your site after adding variables (Vite embeds env vars at build time)

**Note**: If you see "Missing Supabase environment variables" error:
- Check that variables are set in Netlify (not just locally)
- Ensure variable names start with `VITE_` for client-side access
- Redeploy the site after adding/changing variables
- Variables are embedded at BUILD TIME, not runtime

## License

Private - OJO Coaching Academy
