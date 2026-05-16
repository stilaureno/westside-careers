-- migration: 0014_add_duplicate_check_indexes
-- purpose: Add indexes for duplicate applicant detection performance

create index if not exists idx_applicants_last_name_birthdate 
on applicants (lower(last_name), birthdate);

create index if not exists idx_applicants_email_lower
on applicants (lower(email_address)) where email_address is not null;