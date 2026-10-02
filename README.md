# TCC FacilityTrack

**A Web-Based School Facilities Assessment, Monitoring, and Improvement Management System for Talisay City College**

This is the IT component of the research. The study found that students rate
internet connectivity and computer laboratory facilities lowest, and that these
facilities affect their learning experience. This system turns that finding into
a working tool: students rate facilities using the same indicators from the
research, report problems, and administrators monitor, prioritise, and act on them.

---

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Backend | Supabase (Postgres + PostgREST) |
| Auth | None by design — admin writes are gated by a passphrase checked in Postgres |

## Features mapped to the research

| Research requirement | Where it lives |
|---|---|
| Student facilities feedback (same indicators) | `src/pages/StudentFeedback.tsx` |
| Facility condition assessment | `src/pages/FacilityCondition.tsx` |
| Issue/concern reporting | `src/pages/ReportConcern.tsx` |
| Administrative dashboard with charts | `src/pages/Dashboard.tsx` |
| Priority recommendation (High/Moderate/Low) | `v_facility_priority` view + Dashboard + Reports |
| Downloadable reports | `src/pages/Reports.tsx` |
| Feedback-to-action monitoring | `src/pages/Monitoring.tsx` |

## 1. Set up the database

The Supabase project's `public` schema is empty. Run these two files in order.

**Supabase Dashboard → SQL Editor → New query**, paste, then Run.

1. `supabase/schema.sql` — tables, enums, triggers, analytics views, RLS policies, admin RPCs
2. `supabase/seed.sql` — 12 facilities, 9 indicators, condition metrics, ~290 demo assessments and 5 demo concerns

The seed uses `setseed()` so the demo data is reproducible. It is safe to re-run.

## 2. Run the app

```bash
npm install
cp .env.example .env.local     # already filled in for this project
npm run dev
```

`.env.local` is gitignored. The publishable key is designed to be public and is
protected by Row Level Security in Postgres, which is why the RPCs verify the
admin passphrase rather than trusting the client.

## 3. Build and deploy

```bash
npm run build      # typechecks, then bundles to dist/
npm run preview    # serve the production build locally
```

Deploy `dist/` to any static host (Vercel, Netlify, Cloudflare Pages, GitHub
Pages). Add a rewrite to `index.html` so client-side routes resolve on refresh:

```
/*  /index.html  200
```

## Admin passphrase

The default is `change-me-in-rpc`. Change it in two places:

1. `supabase/schema.sql` — the `stored_hash` constants in `set_concern_status` and
   `update_facility_condition`
2. Recompute the hash:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('your-new-passphrase').digest('base64'))"
```

The passphrase is held in memory for the browser tab only. It is never stored, and
it is never trusted from the client — Postgres rejects the call if the hash does
not match.

## Priority rules

Defined in the `v_facility_priority` view, highest condition first:

- **High** — at least one open high-severity concern, **or** mean rating below 3.0
- **Moderate** — at least one open concern, **or** mean rating below 4.0
- **Low** — mean rating 4.0 or above with no unresolved concerns

Each row carries a `rationale` string explaining why it was classified that way,
which is what the panel will ask about.

## Data model

```
facilities ──< assessments ──< assessment_ratings >── dimensions
     │                │
     │                └── one submission = one student rating one facility
     ├──< facility_conditions      (objective condition metrics)
     └──< concerns ──< concern_events   (status audit trail)
```

`assessment_ratings` uses a composite primary key on
`(assessment_id, dimension_key)`, so one rating per indicator per submission is
enforced by the database rather than the UI.

## Notes for the defense

The system is a working implementation of the study's findings, not just a
dashboard over static numbers. Student submissions flow into the aggregates that
drive the priority list, and status changes flow back out into the monitoring
timeline — the feedback-to-action loop the paper describes.

Two things to be ready to discuss:

- **No login.** Deliberate, to keep the demo frictionless. The tradeoff is that any
  visitor can submit feedback and concerns; only admin *writes* are protected. Adding
  Supabase Auth later means tightening four RLS policies and deleting the two RPCs.
- **Demo data.** The seed inserts synthetic responses so charts are populated on
  defense day. Delete them before real collection starts:

```sql
truncate assessments, assessment_ratings, concerns, concern_events cascade;
```