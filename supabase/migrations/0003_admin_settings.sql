-- Migration 0003: Admin Settings Tables
-- Creates departments, positions, and visible_fields tables for admin settings

-- Departments table
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Positions table
CREATE TABLE IF NOT EXISTS public.positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid REFERENCES departments(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Visible fields table
CREATE TABLE IF NOT EXISTS public.visible_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  field_label text NOT NULL,
  is_visible boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visible_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "departments_all_authenticated" ON public.departments FOR ALL USING (true);
CREATE POLICY "positions_all_authenticated" ON public.positions FOR ALL USING (true);
CREATE POLICY "visible_fields_all_authenticated" ON public.visible_fields FOR ALL USING (true);

-- Seed visible fields (all hidden by default)
INSERT INTO visible_fields (field_key, field_label, is_visible, display_order) VALUES
  ('email_address', 'Email', false, 1),
  ('contact_number', 'Contact', false, 2),
  ('birthdate', 'Birthdate', false, 3)
ON CONFLICT (field_key) DO NOTHING;

-- Seed super admin password
INSERT INTO config (key, value) VALUES ('SUPER_ADMIN_PASSWORD', 'm@ster@dm1n')
ON CONFLICT (key) DO NOTHING;

-- Seed default departments
INSERT INTO departments (name, is_active) VALUES
  ('Dealer', true),
  ('Pit Supervisor', true),
  ('Pit Manager', true),
  ('Operations Manager', true)
ON CONFLICT (name) DO NOTHING;

-- Seed default positions per department
INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Dealer', true FROM departments d WHERE d.name = 'Dealer'
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Senior Dealer', true FROM departments d WHERE d.name = 'Dealer'
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Pit Supervisor', true FROM departments d WHERE d.name = 'Pit Supervisor'
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Senior Pit Supervisor', true FROM departments d WHERE d.name = 'Pit Supervisor'
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Pit Manager', true FROM departments d WHERE d.name = 'Pit Manager'
ON CONFLICT DO NOTHING;

INSERT INTO positions (department_id, name, is_active)
SELECT d.id, 'Operations Manager', true FROM departments d WHERE d.name = 'Operations Manager'
ON CONFLICT DO NOTHING;