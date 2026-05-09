-- Add original_position column to stage_results to store the position before reprofile

alter table stage_results
add column if not exists original_position text,
add column if not exists original_department text,
add column if not exists original_experience_level text;