# Preso — Queue & Appointment Booking Platform

> _Your spot. Secured._

Preso is a full-stack booking platform for queue- and appointment-based businesses — barbers,
salons, clinics, studios, tutors, and similar. Clients search for a business, pick a staff member,
see the times that staff member actually has free, and book. Businesses manage their staff,
services, hours, and appointment diary from the same app. One codebase, one deployment, three
role-gated portals.

Built as a full-stack engineering assignment, covering: relational database design, row-level
security, concurrency-safe booking, server-rendered UI, and real-time notifications.

**Live demo:** https://preso-eta.vercel.app

---

## Table of contents

- [Overview](#overview)
- [Key features](#key-features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Roles](#roles)
- [Getting started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Install dependencies](#1-install-dependencies)
  - [2. Configure environment variables](#2-configure-environment-variables)
  - [3. Run the app](#3-run-the-app)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Scripts reference](#scripts-reference)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Overview

Preso renders three portals from a single Next.js codebase, gated by role rather than split
across separate apps:

| Portal | For | Covers |
|---|---|---|
| **Client portal** | clients | search & discovery, booking, waitlist, appointment history, notifications |
| **Business portal** | business owners & staff | business details, hours, services, staff roster, join requests, appointment diary, waitlist |
| **Admin console** | internally-provisioned admins | user management, reports/moderation |

The one architectural rule everything else follows:

```
bookable slots =
      employee_availability_rules   (weekly windows, date overrides, vacations, blocks)
    − existing appointments         (status ≠ CANCELLED)
    sliced by services.duration_minutes (+ buffer)
```

Availability is **computed on demand**, never stored — a single Postgres function derives it from
an employee's own rules and existing bookings. Because the app runs as concurrent, stateless
serverless functions with no shared memory, the "no double-booking" guarantee cannot live in
application code — it's enforced by a PostgreSQL `EXCLUDE USING gist` constraint on the
`appointments` table, with all writes routed through transactional `security definer` database
functions.

## Key features

- **Search & discovery** — find a business by name, owner, category, or area
- **Employee-scoped booking** — services and availability belong to the staff member, not the
  business; picking a slot always reflects that specific person's real calendar
- **Concurrency-safe booking** — a database-level exclusion constraint makes double-booking
  structurally impossible, even under concurrent requests; a lost race returns `409`, not `500`
- **Waitlist with auto-match** — join a waitlist for a full slot; everyone eligible is notified the
  moment a matching cancellation frees it up
- **In-app notifications** — a live notification bell backed by Supabase Realtime, no external
  email provider
- **Staff & join-request workflow** — a business owner approves staff join requests; any active
  employee can then manage the shared business settings
- **Row Level Security everywhere** — every table enforces access control at the database layer,
  independent of any route-handler logic
- **Admin console** — user suspension and a reports/moderation queue

## Tech stack

| Layer | Choice |
|---|---|
| Framework | [Next.js](https://nextjs.org) (App Router), TypeScript (strict) |
| Backend / data | [Supabase](https://supabase.com) — PostgreSQL, Auth, Realtime |
| Validation | [Zod](https://zod.dev) |
| Forms | React Hook Form |
| Data fetching / caching | TanStack Query |
| Styling / UI | Tailwind CSS v4, shadcn/ui (Radix primitives) |
| Dates & time zones | date-fns / date-fns-tz |
| Testing | Vitest (unit + integration), pgTAP (database), Playwright (e2e) |
| Hosting | Vercel |

## Architecture

**Availability lives on the employee, not the business.** Services and working hours belong to an
individual staff member (`employees` is a *position*, so a one-person business still gets exactly
one such row — growing to more staff is zero migration). A booking wizard selecting a different
staff member always resets the chosen service and slot rather than filtering stale data
client-side.

**No-double-booking cannot be enforced in application code.** The app runs on Vercel as concurrent,
stateless serverless functions with no shared memory, so two requests racing for the same slot
can't "know" about each other at the application layer. Correctness is instead enforced by a
PostgreSQL exclusion constraint (`EXCLUDE USING gist` on `(employee_id, slot)`) checked at
`COMMIT`, with every write to `appointments` routed through one of three transactional,
`security definer` database functions (`book_appointment`, `cancel_appointment`,
`reschedule_appointment`). Losing that race returns a `409 Conflict`, not a `500`.

**Two layers of authorization.** Every table has Row Level Security enabled, so a business can
never read another business's data even if a route-handler check were missing — RLS is a second,
independent enforcement layer under the application's own role gates.

**Notifications are in-app only.** A `notifications` table plus a Supabase Realtime subscription
drive a bell icon in the header — no external email or SMS provider.

## Roles

| Role | Created how | Can do |
|---|---|---|
| **Client** | self sign-up | search & browse, book/cancel appointments, join waitlists, manage their own profile |
| **Business** | self sign-up | create or join a business (becomes a staff/`employees` row once approved); any active staff member can manage the business's shared details, hours, services, and appointment diary |
| **Admin** | provisioned internally only, never via sign-up | everything a business account can reach, plus the admin console — user suspension and the reports/moderation queue |

## Getting started

### Prerequisites

- Node.js `24.19.0` (pinned via [Volta](https://volta.sh) in `package.json` — if Volta is
  installed, the correct version is picked up automatically)
- npm (this repo commits `package-lock.json`)
- A [Supabase](https://supabase.com) project (hosted, free tier is sufficient)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/), **only** if you intend to run
  the local Supabase stack (required for the database and integration test suites — see
  [Testing](#testing))

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env` from your Supabase project's dashboard (**Settings → API**):

| Variable | Where to find it | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API | public, RLS-bound |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API | **server-only** — bypasses Row Level Security |
| `NEXT_PUBLIC_SITE_URL` | — | `http://localhost:3000` for local dev |
| `CRON_SECRET` | — | any string; only needed to call `GET /api/cron/*` locally |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | Google Cloud Console | optional, only needed for Google sign-in |

`npm run dev` runs against your **hosted** Supabase project directly (not a local Docker stack) —
use the real project URL and keys above, not `127.0.0.1:54321`.

To enable Google sign-in, configure the provider on the **hosted** project (Authentication →
Providers → Google), using `https://<your-project-ref>.supabase.co/auth/v1/callback` as the
redirect URI in Google Cloud Console, and add `http://localhost:3000/**` to the project's Redirect
URLs allow-list (Authentication → URL Configuration).

### 3. Run the app

Apply the database schema to your Supabase project (all migrations under `supabase/migrations/`)
via the Supabase CLI, then start the dev server:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up for a client or business account to
get started — a fresh project has no seed data.

## Testing

Unit tests run standalone:

```bash
npm run test:unit
```

Integration tests and pgTAP database tests run against a **local** Supabase/Docker stack (they
connect to Postgres directly and cannot run against a hosted project):

```bash
npx supabase start   # starts the local stack (first run pulls Docker images)
npm run db:reset      # applies all migrations + supabase/seed.sql to the local stack
npm run test:int       # integration tests
npm run test:db        # pgTAP assertions
```

`supabase/seed.sql` provides demo accounts (password `demo-password`) and fixture data for the
**local** stack only — never run it against a hosted project, as it is idempotent and will
silently recreate its fixture businesses there.

End-to-end tests:

```bash
npm run test:e2e
```

Run the full suite (lint, typecheck, unit, integration, database, e2e):

```bash
npm run verify
```

## Project structure

```
├── supabase/
│   ├── migrations/         schema, constraints, RPCs, triggers, RLS — applied in order
│   ├── seed.sql            local-only demo fixtures
│   └── tests/               pgTAP test suite
├── src/
│   ├── app/                 Next.js App Router — route groups per portal:
│   │                        (public), (auth), (client), (business), (admin)
│   ├── components/          UI components, grouped by portal + shared primitives
│   ├── server/
│   │   ├── actions/          server actions (form-driven mutations)
│   │   ├── queries/          typed, RLS-scoped read helpers
│   │   └── guards.ts          session/role guards
│   ├── lib/                  Supabase clients, validation schemas, error taxonomy, utilities
│   ├── hooks/                 client-side hooks
│   └── types/                 generated + hand-written domain types
└── tests/                  unit, integration, and e2e suites
```

## Scripts reference

| Script | Description |
|---|---|
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run start` | run a production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | type generation + `tsc --noEmit` |
| `npm run test:unit` | Vitest unit suite |
| `npm run test:int` | Vitest integration suite (requires local Supabase stack) |
| `npm run test:db` | pgTAP database suite (requires local Supabase stack) |
| `npm run test:e2e` | Playwright end-to-end suite |
| `npm run db:reset` | reset the local stack and re-apply migrations + seed data |
| `npm run db:types` | regenerate `src/types/database.types.ts` from the local stack's schema |
| `npm run verify` | run the entire test/lint/typecheck pipeline |

## Deployment

The app is designed to deploy on [Vercel](https://vercel.com) against a hosted Supabase project.
A single Vercel Cron job is configured in [`vercel.json`](vercel.json) for the daily
appointment-reminder sweep. Set the same environment variables listed above in the Vercel project
settings, pointed at your production Supabase project.

## Known limitations

- Business photos are stored as pasted URLs rather than uploaded to Supabase Storage — no storage
  bucket is provisioned yet.
- Notifications are in-app only (bell + Realtime); there is no external email/SMS delivery.
- No active rate limiting on API routes.
