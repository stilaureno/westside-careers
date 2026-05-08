-- Add reprofile_department and reprofile_position columns to stage_results
-- These fields store the new department and position when admin reprofiles an applicant

alter table stage_results
add column if not exists reprofile_department text,
add column if not exists reprofile_position text;