-- Add HR Interview additional fields to applicants table
ALTER TABLE applicants
ADD COLUMN IF NOT EXISTS tattoo text,
ADD COLUMN IF NOT EXISTS relative_in_ecrc text,
ADD COLUMN IF NOT EXISTS relationship_ecrc text,
ADD COLUMN IF NOT EXISTS relative_in_other_casino text,
ADD COLUMN IF NOT EXISTS relationship_other_casino text,
ADD COLUMN IF NOT EXISTS source_of_application text,
ADD COLUMN IF NOT EXISTS referred_by text;

-- Create source of application options table
CREATE TABLE IF NOT EXISTS public.source_of_application_options (
  id serial primary key,
  name text not null unique
);

-- Seed default options
INSERT INTO public.source_of_application_options (name) VALUES
  ('Online Ad'),
  ('Friend/Family'),
  ('Job Fair'),
  ('Walk-in'),
  ('Social Media'),
  ('Agency'),
  ('Others')
ON CONFLICT (name) DO NOTHING;
