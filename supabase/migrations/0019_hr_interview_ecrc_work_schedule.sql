-- Add additional HR Interview fields to applicants table
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS first_time_apply_ecrc text,
ADD COLUMN IF NOT EXISTS work_environment text,
ADD COLUMN IF NOT EXISTS schedule text;
