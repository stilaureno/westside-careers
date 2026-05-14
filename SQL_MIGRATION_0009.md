# SQL Migration 0009: Add Experienced Dealer Required Games Config

Run this SQL query on your remote Supabase database (via Supabase dashboard SQL editor):

```sql
INSERT INTO config (key, value) 
VALUES ('EXPERIENCED_DEALER_REQUIRED_GAMES', '2')
ON CONFLICT (key) DO NOTHING;
```

This initializes the configuration value for the required number of games experienced dealers must select on the application form. The default is set to 2 games.

You can update this value anytime via the Settings page → "Application Settings" section.