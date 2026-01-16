-- Create table for scheduled email notifications
-- This table stores emails that need to be sent at a specific time

CREATE TABLE IF NOT EXISTS scheduled_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL, -- e.g., 'onboarding_delayed', 'lesson_reminder', etc.
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT,
  text_body TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  metadata JSONB, -- Store additional data like studentId, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient querying of due notifications
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_due 
  ON scheduled_notifications(scheduled_for, sent_at) 
  WHERE sent_at IS NULL;

-- Create index for type queries
CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_type 
  ON scheduled_notifications(type);

-- Add comment
COMMENT ON TABLE scheduled_notifications IS 'Stores email notifications scheduled for future delivery';
