-- Create stage_result_versions table to track all edits to stage results

CREATE TABLE IF NOT EXISTS stage_result_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_result_id UUID REFERENCES stage_results(id) ON DELETE CASCADE NOT NULL,
  version_number INT NOT NULL,
  result_status TEXT,
  score INT,
  passing_score INT,
  max_score INT,
  remarks TEXT,
  evaluated_by TEXT,
  evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  edit_reason TEXT
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_stage_result_versions_stage_result_id 
ON stage_result_versions(stage_result_id);

-- Enable RLS
ALTER TABLE stage_result_versions ENABLE ROW LEVEL SECURITY;

-- Policy for full access (adjust as needed for your app)
CREATE POLICY "Allow full access to stage_result_versions" ON stage_result_versions
  FOR ALL USING (true);