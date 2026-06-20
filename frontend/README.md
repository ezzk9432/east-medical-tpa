# Frontend — East Medical TPA

React + Vite + TypeScript + Tailwind v4 + TanStack Query + Zustand.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. API calls to `/api/*` and `/uploads/*` are proxied to the backend at `http://localhost:4000` (see `vite.config.ts`) — **make sure the backend is running first** (`cd ../backend && npm run dev`).

## Demo login

After seeding the backend (`npm run seed` in `backend/`):

| Email | Role | Password |
|---|---|---|
| layla.hassan@eastmedical.test | ADMIN | Password123! |
| sarah.mansour@eastmedical.test | CASE_MANAGER | Password123! |
| karim.adel@eastmedical.test | FINANCE | Password123! |

## Structure

```
src/
├── api/          API client + per-resource request functions
├── components/   Reusable UI primitives (Button, Card, Input...) + feature components
├── hooks/        React Query hooks for case detail data
├── layouts/      App shell (sidebar nav + topbar)
├── pages/        Route-level pages
├── store/        Zustand auth store (real JWT session, replacing the old "Acting as" demo switcher)
└── types/        Shared TypeScript types matching backend Prisma models
```

## Pages implemented

- **Login** — real authentication against the backend
- **Dashboard** — live stats from `/api/reports/dashboard` (not static numbers)
- **Cases** — list with search/filter/pagination, detail view, new case form
- **Case detail** — patient info, case services (with real financial calculation), document upload, notes, status workflow
- **Providers** — list + create
- **Contracts** — list + create
- **Money Process (Payments)** — payment status workflow (Pending → Processed → Paid)
- **Users & Roles** — admin-only user creation + permissions matrix reference

## What's not built yet

- Editing patient info / medical info (diagnosis, ICD codes) after case creation
- Invoice PDF download UI (backend endpoint exists: `POST /api/case-services/:id/invoice`)
- Financial/case-aging report pages (backend endpoints exist: `/api/reports/case-aging`, `/api/reports/financial-summary`)
- Payment groups UI (backend endpoint exists: `POST /api/payments/groups`)
- Real-time session timeout warning (30-min token expiry is enforced server-side already)

## Build

```bash
npm run build
```

Type-checks (`tsc -b`) then bundles with Vite into `dist/`.
