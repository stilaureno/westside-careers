# Westside Careers — Next.js + Supabase

## Stack

- **Framework**: Next.js 15 (App Router, TypeScript, SSR)
- **Database**: Supabase (Postgres, RLS policies)
- **Auth**: Cookie-based admin sessions (`admin_session` cookie), not Supabase Auth
- **Styling**: Inline styles / plain CSS (no Tailwind, no CSS-in-JS library)
- **Env vars**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Developer Commands

```sh
npm run dev          # Start dev server (port 3000)
npm run build       # Production build
npm run lint        # next lint
npm run typecheck   # tsc --noEmit
npm run db:migrate  # supabase db push
npm run db:seed    # supabase db seed
```

Lint → typecheck → build is the standard order for pre-commit checks.

## Database

- **Production**: Remote Supabase (`eodgowpdhsdsuwukepsz.supabase.co`) — configured via `.env.local`
- **Local dev**: `supabase/config.toml` — connects to local Supabase (`127.0.0.1:54321`)
- **Migrations**: `supabase/migrations/0001_initial_schema.sql`, `0002_seed_questionnaire.sql`

> **Important**: The app uses the remote database by default. To use local DB, modify `.env.local` to point to `http://127.0.0.1:54321` and start local Supabase with `npx supabase start`.

### Query Remote DB

Use the Supabase MCP server (`supabase_execute_sql`) to query the production database directly:

```typescript
// Example: get all applicants with status
supabase_execute_sql({
  project_id: "eodgowpdhsdsuwukepsz",
  query: "SELECT reference_no, last_name, first_name, application_status FROM applicants LIMIT 10"
})
```

Project ID: `eodgowpdhsdsuwukepsz`

### Tables

| Table | Purpose |
|---|---|
| `applicants` | Main applicant records |
| `applicant_games` | Game proficiency (MB, BJ, RL, CRAPS) |
| `stage_results` | Per-stage interview/assessment results |
| `applicant_notifications` | In-app notifications |
| `config` | KV config (e.g. `ADMIN_PASSWORD=TGHR2026`) |
| `questionnaire` | Math exam questions (grouped by set) |
| `math_exam_results` | Exam attempts, scores, answers |

### Exam Constants (`src/types/index.ts`)

```typescript
EXAM_DURATION_MINUTES = 10
PASSING_SCORE = 8
MAX_MATH_EXAM_SCORE = 10
ALLOWED_GAMES = ['MB', 'BJ', 'RL', 'CRAPS']
POSITIONS = ['Dealer', 'Pit Supervisor', 'Pit Manager', 'Operations Manager']
EXPERIENCE_LEVELS = ['Non-Experienced Dealer', 'Experienced Dealer']
FINAL_INTERVIEW_RESULTS = ['Passed', 'Reprofile', 'For Pooling', 'Not Recommended']
```

### Auth

- No Supabase Auth used. Admin login via `/api/admin-login` (POST) sets cookies.
- Two admin tiers: `admin_session` (standard) and `super_admin_session` (super admin).
- All `/admin/*` routes protected by `src/lib/supabase/middleware.ts`.
- Public routes: `/`, `/apply`, `/status`, `/exam` — no auth required.

### Per-Admin Department Access

- Multiple admin passwords supported via config keys: `ADMIN_PASSWORD`, `ADMIN_PASSWORD2`, `ADMIN_PASSWORD3`, etc.
- Each admin password has its own `allowed_departments` (text array in `config` table).
- Super admin (`SUPER_ADMIN_PASSWORD`) sees all departments by default.
- Configure in Settings → "Admin Passwords & Department Access" (super admin only).
- Filters apply to Applicant List and Dashboard.

## Key Routes

| Route | Purpose |
|---|---|
| `/` | Public landing page |
| `/apply` | Applicant registration form |
| `/status` | Check application status by reference no. |
| `/exam` | Math proficiency exam |
| `/admin/login` | Admin login |
| `/admin/dashboard` | Admin dashboard |
| `/admin/applicants` | Applicant list |
| `/admin/applicants/[referenceNo]` | Applicant detail |
| `/api/exam` | Exam API (start, submit, heartbeat) |
| `/api/admin-login` | Admin login handler |

## Project Structure

```
src/
  app/
    page.tsx                  # Landing
    apply/page.tsx            # Application form
    status/page.tsx           # Status check
    exam/page.tsx              # Math exam (client component)
    admin/
      login/page.tsx
      dashboard/page.tsx
      applicants/page.tsx
      applicants/[referenceNo]/page.tsx
      logout/route.ts
      layout.tsx
    api/
      exam/route.ts
      admin-login/route.ts
  lib/
    supabase/
      client.ts    # createBrowserClient
      server.ts  # createServerClient (for server actions)
      middleware.ts  # Route protection
    db/
      applicants.ts
      stages.ts
      exam.ts
    actions/
      applicant.ts
      admin.ts
    admin-session.ts  # Cookie constants and helpers
  types/index.ts
supabase/
  config.toml
  migrations/
```

### Application Statuses

```typescript
// Applicant.status: ApplicationStatus = 'Pending' | 'Ongoing' | 'Completed' | 'Not Recommended' | 'Passed' | 'Failed' | 'Reprofile' | 'For Pooling'
// Stage result: ResultStatus = 'Passed' | 'Failed' | 'In Progress'
// Exam attempt: AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED'
```

## Exam Flow

1. Applicant enters reference number on `/exam`
2. Server verifies eligibility (stage check) via `/api/exam` POST
3. Exam starts with 10-minute timer (JS `setInterval`)
4. Answers auto-saved every 15s + heartbeat every 15s
5. Tab blur / visibility change → auto-submit with termination reason
6. Score ≥ 8 → Passed; else Failed
7. One attempt per applicant (re-attempts show previous score)

## CSV Data Files

`public/csv/` contains imported historical data (applicants, stage results, games, notifications) from Google Sheets. These are reference data only — not used by the app.

## Supabase Local CLI

```sh
npx supabase start       # Start local instance
npx supabase stop      # Stop
npx supabase db reset  # Reset + reseed local DB
```