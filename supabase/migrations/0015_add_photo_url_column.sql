-- migration: 0015_add_photo_url_column
-- purpose: add photo_url column to applicants table for selfie feature

alter table public.applicants add column if not exists photo_url text;