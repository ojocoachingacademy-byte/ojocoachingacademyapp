# Setup Messages Database Tables

## Quick Fix
The messages feature requires database tables that haven't been created yet. Follow these steps:

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New query"**

### Step 2: Run the Schema Script
1. Open the file `phase1_messaging_schema.sql` in this project
2. Copy the **ENTIRE** contents of that file
3. Paste it into the Supabase SQL Editor
4. Click **"Run"** (or press Ctrl+Enter)

### Step 3: Verify Tables Were Created
After running the script, verify the tables exist:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('conversations', 'messages', 'notifications')
ORDER BY table_name;
```

You should see:
- `conversations`
- `messages`
- `notifications`

### Step 4: Refresh Your App
1. Go back to your app
2. Refresh the page (F5)
3. Click "Messages" again
4. It should now work! (You'll see "No conversations yet" which is normal)

## What This Creates
- ✅ `conversations` table - Stores conversation threads between users
- ✅ `messages` table - Stores individual messages (enhanced with conversation_id)
- ✅ `notifications` table - Stores user notifications
- ✅ RLS (Row Level Security) policies - Ensures users can only see their own data
- ✅ Indexes - For performance
- ✅ Triggers - To update last_message_at automatically

## Troubleshooting
If you get errors when running the script:
- Make sure you're copying the ENTIRE file content
- Check if any tables already exist (they might have been partially created)
- If tables exist but policies don't, you can drop and recreate:
  ```sql
  DROP TABLE IF EXISTS messages CASCADE;
  DROP TABLE IF EXISTS conversations CASCADE;
  DROP TABLE IF EXISTS notifications CASCADE;
  ```
  Then run the full script again.

## After Setup
Once the tables are created:
- The Messages page will load
- You'll see "No conversations yet" (normal for a new install)
- You can start conversations by clicking "New Message"
- Notifications will work
- Real-time updates will work




