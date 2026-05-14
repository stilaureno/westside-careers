# SQL Migration 0008: Add application_feedback Table

Run this SQL query on your remote Supabase database (via Supabase dashboard SQL editor):

```sql
-- Create application_feedback table for storing applicant feedback
CREATE TABLE IF NOT EXISTS application_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_no TEXT NOT NULL,
  last_name TEXT,
  first_name TEXT,
  email TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE application_feedback ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for admin viewing)
CREATE POLICY "Allow public read access to application_feedback"
  ON application_feedback FOR SELECT
  TO anon
  USING (true);

-- Allow public insert access (for applicants to submit feedback)
CREATE POLICY "Allow public insert access to application_feedback"
  ON application_feedback FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create index for faster lookups by reference_no
CREATE INDEX IF NOT EXISTS idx_application_feedback_reference_no
  ON application_feedback(reference_no);
```