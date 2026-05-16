-- Add applicant_number column to applicants table for manual entry by interviewer
ALTER TABLE public.applicants ADD COLUMN IF NOT EXISTS applicant_number integer;

-- Add unique constraint to prevent duplicates (nullable to allow initial NULL values)
ALTER TABLE public.applicants ADD CONSTRAINT unique_applicant_number UNIQUE (applicant_number) INCLUDE (applicant_number);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_applicants_applicant_number ON public.applicants(applicant_number) WHERE applicant_number IS NOT NULL;