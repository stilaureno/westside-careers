-- Add attempt_count column to track retakes for Math Exam
alter table public.math_exam_results add column if not exists attempt_count integer default 1;