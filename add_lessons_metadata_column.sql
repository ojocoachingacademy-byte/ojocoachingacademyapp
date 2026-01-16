-- Add metadata column to lessons table for storing Google Calendar sync info and other lesson metadata
-- This column stores JSON data including:
--   - google_calendar_id: The Google Calendar event ID for deduplication
--   - google_calendar_link: Link to the event in Google Calendar
--   - synced_at: When the lesson was synced
--   - original_title: Original calendar event title
--   - source: Where the lesson came from (google_calendar, manual, etc.)

ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

COMMENT ON COLUMN lessons.metadata IS 'Stores additional lesson data like Google Calendar sync info, source, custom fields, etc.';

-- Create an index on metadata->>'google_calendar_id' for faster lookups during sync
CREATE INDEX IF NOT EXISTS idx_lessons_metadata_google_calendar_id 
ON lessons ((metadata->>'google_calendar_id'))
WHERE metadata->>'google_calendar_id' IS NOT NULL;


