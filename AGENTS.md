# Westside Careers - Google Apps Script Project

## Architecture

This is a Google Apps Script web application managing casino job applicant recruitment. It uses Google Sheets as the data store.

**Spreadsheet:** `1m83qsK3UmuffDyr2QJMoUe__TiwUmtChVn5Hnm7B1Do`

**Sheets:**
- `Applicants` - Main applicant records
- `ApplicantGames` - Game proficiency records
- `StageResults` - Interview/assessment stage results
- `ApplicantNotifications` - In-app notifications
- `Config` - Configuration key-value pairs
- `Questionnaire` - Grouped questionnaire data
- `Math Exam Result` - Math exam attempts and scores

**Entry Points (Code.gs):**
- `doGet(e)` - Serves HTML based on `e.parameter.cmd`
- `doPost(e)` - Handles form submissions

**HTML Frontends:**
- `Index.html` - Public applicant portal
- `Admin.html` - Admin dashboard
- `MathExam.html` - Math proficiency test

## Key Constants

```javascript
const EXAM_DURATION_MINUTES = 10;
const PASSING_SCORE = 8;
const ALLOWED_GAMES = ['MB','BJ','RL','CRAPS'];
const POSITIONS = ['Dealer','Pit Supervisor','Pit Manager','Operations Manager'];
```

## Development

- Edit directly in Google Apps Script editor (script.google.com)
- Test via "Deploy > Test deployments"
- Changes are live immediately on redeploy
- No local build/test cycle - runs entirely in Google's cloud

## Caching

The app uses `CacheService` for performance:
- `DASHBOARD_CACHE_KEY` - Dashboard data (60s TTL)
- `QUESTIONNAIRE_CACHE_KEY` - Questionnaire (300s TTL)
- `applicantAdminCacheKey_` - Per-applicant cache (60s TTL)

Clear cache by calling `clearDashboardCache_()` or `clearApplicantAdminCache_(referenceNo)`.