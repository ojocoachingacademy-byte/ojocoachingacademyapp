-- Testimonials System: Supabase Schema
-- Run this in your Supabase SQL Editor to set up testimonials tables

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  testimonial_text TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  video_url TEXT,
  video_storage_path TEXT, -- For Supabase Storage
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
  featured BOOLEAN DEFAULT FALSE,
  lesson_count_when_submitted INTEGER, -- Track how many lessons student had completed
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create testimonial requests table (track automated requests)
CREATE TABLE IF NOT EXISTS testimonial_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lesson_count_at_request INTEGER, -- Lessons completed when requested
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'declined', 'reminded')),
  reminder_sent_at TIMESTAMP WITH TIME ZONE,
  testimonial_id UUID REFERENCES testimonials(id) ON DELETE SET NULL
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_testimonials_student_id ON testimonials(student_id);
CREATE INDEX IF NOT EXISTS idx_testimonials_status ON testimonials(status);
CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials(featured);
CREATE INDEX IF NOT EXISTS idx_testimonial_requests_student_id ON testimonial_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_testimonial_requests_status ON testimonial_requests(status);

-- Enable Row Level Security (RLS)
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonial_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for testimonials
-- Students can read their own testimonials and create new ones
CREATE POLICY "Students can view own testimonials" ON testimonials
  FOR SELECT USING (
    auth.uid() = student_id OR
    auth.role() = 'authenticated'
  );

CREATE POLICY "Students can create testimonials" ON testimonials
  FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own testimonials" ON testimonials
  FOR UPDATE USING (auth.uid() = student_id);

-- Coaches/admins can manage all testimonials
CREATE POLICY "Authenticated users can manage testimonials" ON testimonials
  FOR ALL USING (auth.role() = 'authenticated');

-- Service role can manage testimonials (for automated requests)
CREATE POLICY "Service role can manage testimonials" ON testimonials
  FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for testimonial_requests
-- Students can view their own requests
CREATE POLICY "Students can view own requests" ON testimonial_requests
  FOR SELECT USING (auth.uid() = student_id OR auth.role() = 'authenticated');

-- Service role and authenticated users can create requests
CREATE POLICY "Authenticated users can create requests" ON testimonial_requests
  FOR INSERT WITH CHECK (auth.role() IN ('authenticated', 'service_role'));

-- Authenticated users can update requests
CREATE POLICY "Authenticated users can update requests" ON testimonial_requests
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_testimonials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for testimonials table
DROP TRIGGER IF EXISTS update_testimonials_updated_at ON testimonials;
CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_testimonials_updated_at();

-- Create storage bucket for testimonial videos (run this in Supabase Storage)
-- Note: You'll need to create this bucket manually in Supabase Dashboard → Storage
-- Bucket name: 'testimonial-videos'
-- Public: false (private)
-- File size limit: 100MB
-- Allowed MIME types: video/mp4, video/webm, video/quicktime

-- SQL to create bucket (run in SQL Editor):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'testimonial-videos',
--   'testimonial-videos',
--   false,
--   104857600, -- 100MB in bytes
--   ARRAY['video/mp4', 'video/webm', 'video/quicktime']
-- )
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for testimonial videos (students can upload their own)
-- CREATE POLICY "Students can upload own testimonial videos"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'testimonial-videos' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- CREATE POLICY "Students can view own testimonial videos"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'testimonial-videos' AND
--   (auth.uid()::text = (storage.foldername(name))[1] OR auth.role() = 'authenticated')
-- );

