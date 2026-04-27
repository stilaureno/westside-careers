-- Migration 0004: Table Column Visibility for Applicants Tab
-- Adds location column to visible_fields and seeds applicants table column entries

-- Add location column to differentiate between applicant modal fields and table columns
ALTER TABLE public.visible_fields ADD COLUMN IF NOT EXISTS location text DEFAULT 'applicant_modal';

-- Update existing visible_fields to have location
UPDATE public.visible_fields SET location = 'applicant_modal' WHERE location IS NULL OR location = '';

-- Seed applicants table columns (all visible by default)
-- Only Reference No and Name are protected and always visible
INSERT INTO visible_fields (field_key, field_label, is_visible, display_order, location) VALUES
  ('applicants_table_created_at', 'Application Date', true, 1, 'applicants_table'),
  ('applicants_table_reference_no', 'Reference No', true, 2, 'applicants_table'),
  ('applicants_table_displayName', 'Name', true, 3, 'applicants_table'),
  ('applicants_table_position_applied', 'Position', true, 4, 'applicants_table'),
  ('applicants_table_experience_level', 'Experience', true, 5, 'applicants_table'),
  ('applicants_table_current_stage', 'Current Stage', true, 6, 'applicants_table'),
  ('applicants_table_application_status', 'Status', true, 7, 'applicants_table'),
  ('applicants_table_height_cm', 'Height', true, 8, 'applicants_table'),
  ('applicants_table_initialScreeningResult', 'Initial Screening', true, 9, 'applicants_table'),
  ('applicants_table_mathExamResult', 'Math Exam', true, 10, 'applicants_table'),
  ('applicants_table_tableTestResult', 'Table Test', true, 11, 'applicants_table'),
  ('applicants_table_sweatyPalmResult', 'Sweaty Palm', true, 12, 'applicants_table'),
  ('applicants_table_finalInterviewResult', 'Final Interview', true, 13, 'applicants_table'),
  ('applicants_table_remarks', 'Remarks', true, 14, 'applicants_table')
ON CONFLICT (field_key) DO NOTHING;

-- Create index for faster lookup by location
CREATE INDEX IF NOT EXISTS idx_visible_fields_location ON visible_fields(location);