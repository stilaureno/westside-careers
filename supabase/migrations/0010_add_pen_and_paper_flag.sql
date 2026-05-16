-- Add pen_and_paper flag to track if exam was taken via pen and paper test
ALTER TABLE public.math_exam_results ADD COLUMN IF NOT EXISTS pen_and_paper boolean DEFAULT false;

-- Add attempt_count column if not exists (ensure it's properly added)
ALTER TABLE public.math_exam_results ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1;