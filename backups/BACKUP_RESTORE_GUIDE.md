=== DATABASE BACKUP & RESTORE GUIDE ===
Generated: 2026-04-30
Project ID: eodgowpdhsdsuwukepsz

=== OPTION 1: SUPABASE DASHBOARD BACKUP (Recommended) ===
1. Go to: https://supabase.com/dashboard/project/eodgowpdhsdsuwukepsz
2. Click "Database" in left sidebar
3. Click "Backups" tab
4. Click "Create Backup" button
5. Name: "westside-careers-backup-YYYYMMDD"
6. Wait for backup to complete (can take several minutes for large DBs)
7. To restore: Find the backup in list > Click "Restore" button

=== OPTION 2: MANUAL RESTORE VIA SQL (If you need to restore specific data) ===

To restore applicants table from backup:
```sql
-- Run this in Supabase SQL Editor to insert a single applicant
INSERT INTO applicants (
  reference_no, last_name, first_name, middle_name, birthdate, age, gender,
  contact_number, email_address, height_cm, weight_kg, bmi_value,
  position_applied, experience_level, current_stage, application_status,
  department, created_at
) VALUES (
  'APP-NEW-00001', 'LastName', 'FirstName', 'MiddleName', '1990-01-01',
  34, 'Male', '09123456789', 'email@test.com', 170, 70, '24.0',
  'Dealer', 'Non-Experienced Dealer', 'Initial Screening', 'Pending',
  'Table Games', NOW()
);
```

=== OPTION 3: RESTORE FULL BACKUP VIA SUPABASE CLI === 

In terminal:
```bash
# Create backup
npx supabase db dump -p eodgowpdhsdsuwukepsz

# Restore from backup file
npx supabase db restore -p eodgowpdhsdsuwukepsz < backup.sql
```

=== CURRENT DATABASE SCHEMA ===

APPLICANTS TABLE:
- id (uuid, PK)
- applicant_id (text)
- reference_no (text, unique)
- last_name, first_name, middle_name (text)
- birthdate (date), age (integer)
- gender (text)
- contact_number, email_address (text)
- height_cm, weight_kg, bmi_value (numeric)
- position_applied (text)
- experience_level (text)
- current_stage (text)
- application_status (text)
- department (text)
- created_at, updated_at (timestamp)

STAGE_RESULTS TABLE:
- id (uuid, PK)
- reference_no (text, FK)
- stage_name (text)
- result_status (text)
- created_at (timestamp)

=== CURRENT TABLE STATS ===
- applicants: 534 rows
- stage_results: 1319 rows
- applicant_games: 169 rows
- applicant_notifications: 1881 rows
- config: 3 rows
- positions: 44 rows
- position_stages: 190 rows

=== NOTE ===
For full database backup/restore, use Supabase Dashboard's built-in backup feature.
This guide is for quick reference and manual restore if needed.