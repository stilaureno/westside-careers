-- Add HR Interview fields to applicants table
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS position_being_considered text,
ADD COLUMN IF NOT EXISTS expected_salary text,
ADD COLUMN IF NOT EXISTS date_of_availability date;
