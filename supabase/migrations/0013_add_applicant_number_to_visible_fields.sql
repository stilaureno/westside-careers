-- Add Applicant ID column to visible_fields for applicants table
INSERT INTO public.visible_fields (field_key, field_label, is_visible, display_order, location)
SELECT 'applicants_table_applicant_number', 'Applicant ID', true, 15, 'applicants_table'
WHERE NOT EXISTS (SELECT 1 FROM public.visible_fields WHERE field_key = 'applicants_table_applicant_number' AND location = 'applicants_table');