-- Add Math Score column to visible_fields for applicants table
INSERT INTO public.visible_fields (field_key, field_label, is_visible, display_order, location)
VALUES ('applicants_table_mathExamScore', 'Score', true, 12, 'applicants_table')
ON CONFLICT (field_key, location) DO NOTHING;