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

Required environment variables:
- `VITE_ANTHROPIC_API_KEY` - Your Anthropic API key for AI lesson plan generation

## License

Private - OJO Coaching Academy
