# Security Checklist - OJO Coaching Academy App

## ✅ Completed Security Improvements

### 1. API Key Security
- ✅ Moved Anthropic API calls to Netlify Functions (serverless)
- ✅ Removed `dangerouslyAllowBrowser` flag from Anthropic client
- ✅ API key now stored as `ANTHROPIC_API_KEY` in Netlify environment variables (not exposed to frontend)
- ✅ Removed `@anthropic-ai/sdk` from frontend dependencies

### 2. Row-Level Security (RLS) Policies

#### Profiles Table
- ✅ Users can only read/update their own profile
- ✅ Coaches can read all profiles

#### Students Table
- ✅ Users can only read their own student record
- ✅ Coaches can read all student records
- ✅ Users can insert their own student record

#### Lessons Table
- ✅ Students can only read their own lessons
- ✅ Coaches can read all lessons
- ✅ Coaches can create lessons
- ✅ Authenticated users can update lessons (for coach feedback and student learnings)

#### Hitting Partners Table
- ✅ Users can only read/update their own hitting partner profile
- ✅ Authenticated users can read all active hitting partners (for directory)

#### Development Focus Areas Table (if used)
- ✅ Students can only read their own development plans
- ✅ Coaches can read/update all development plans

## 🔒 Testing RLS Permissions

### Test Plan: Verify Students Cannot Access Other Students' Data

#### Test 1: Profile Access
```sql
-- As Student A, try to access Student B's profile
-- Should FAIL with RLS policy violation
SELECT * FROM profiles WHERE id = 'student-b-uuid';
```

#### Test 2: Student Record Access
```sql
-- As Student A, try to access Student B's student record
-- Should FAIL with RLS policy violation
SELECT * FROM students WHERE id = 'student-b-uuid';
```

#### Test 3: Lesson Access
```sql
-- As Student A, try to access Student B's lessons
-- Should FAIL with RLS policy violation
SELECT * FROM lessons WHERE student_id = 'student-b-uuid';
```

#### Test 4: Development Plan Access
```sql
-- As Student A, try to access Student B's development plan
-- Should FAIL with RLS policy violation
SELECT * FROM development_focus_areas WHERE student_id = 'student-b-uuid';
```

### Manual Testing Steps

1. **Create Two Student Accounts**
   - Create Student A account (student-a@test.com)
   - Create Student B account (student-b@test.com)

2. **Login as Student A**
   - Verify Student A can see their own dashboard
   - Verify Student A can see their own lessons
   - Verify Student A can see their own development plan

3. **Attempt Cross-Access (Should Fail)**
   - Using browser dev tools, try to query Student B's data
   - Should receive RLS policy violation errors
   - Frontend should not be able to access other students' data

4. **Coach Access Verification**
   - Login as coach
   - Verify coach can see all students
   - Verify coach can see all lessons
   - Verify coach can create/update lessons for any student

## 🔐 Environment Variables Setup

### Netlify Environment Variables
Set in Netlify Dashboard → Site Settings → Environment Variables:
- `ANTHROPIC_API_KEY` - Your Anthropic API key (DO NOT use VITE_ prefix)

### Local Development
For local development with Netlify Functions:
- Use `netlify dev` command to run functions locally
- Set `ANTHROPIC_API_KEY` in `.env` file (or Netlify CLI will use environment variables)

### Removed from Frontend
- ❌ `VITE_ANTHROPIC_API_KEY` - No longer needed in frontend
- ✅ All API calls now go through Netlify Functions

## 📋 Deployment Checklist

Before deploying to production:

1. ✅ Move Anthropic SDK to serverless functions
2. ✅ Set `ANTHROPIC_API_KEY` in Netlify environment variables
3. ✅ Verify RLS policies are enabled on all tables
4. ✅ Test that students cannot access other students' data
5. ✅ Remove any API keys from frontend code
6. ✅ Verify `.env` is in `.gitignore`
7. ✅ Test Netlify Functions locally with `netlify dev`
8. ✅ Deploy and verify functions work in production

## 🚨 Security Notes

- API keys are now server-side only (never exposed to browsers)
- RLS policies provide database-level security
- Supabase handles authentication and RLS enforcement
- Netlify Functions run in a secure serverless environment
- All API calls are server-side (no client-side API key exposure)



