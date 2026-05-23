-- Change date_of_availability from date to text to allow free-text entries
ALTER TABLE applicants
ALTER COLUMN date_of_availability TYPE text USING date_of_availability::text;
