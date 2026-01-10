# Fix: Add development_plan_notes Column

## Issue
The app is trying to save `development_plan_notes` to the `students` table, but the column doesn't exist, causing the error:
```
Could not find the 'development_plan_notes' column of 'students' in the schema cache
```

## Solution
Run the SQL migration to add the missing column.

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Run the Migration
1. Open the file `add_development_plan_notes_column.sql` from this project
2. Copy the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify
After running the script, verify the column exists:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name = 'development_plan_notes';
```

You should see:
- `column_name`: `development_plan_notes`
- `data_type`: `text`

## What This Adds
- Adds `development_plan_notes` TEXT column to `students` table
- This column stores coach notes and overall assessment for student development plans
- Used in:
  - DevelopmentPlanForm (when saving development plans)
  - StudentDetailPage (when editing coach notes)
  - StudentDashboard (when displaying coach notes)




