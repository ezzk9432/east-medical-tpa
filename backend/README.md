# Backend — East Medical TPA API

Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Setup

### 1. Get a PostgreSQL database

Pick one:
- **Local**: install Postgres, or run `docker run --name tpa-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=east_medical_tpa -p 5432:5432 -d postgres:16`
- **Cloud (free tier)**: [Supabase](https://supabase.com), [Neon](https://neon.tech), or [Railway](https://railway.app) — create a Postgres instance and copy the connection string.

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
- `DATABASE_URL` — your Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with `openssl rand -base64 48`

### 3. Install and generate

```bash
npm install
npx prisma generate
```

### 4. Run migrations

```bash
npx prisma migrate dev --name init
```

This creates all tables (users, cases, patients, contracts, providers, medical_info, case_services, documents, invoices, payments, audit_logs, refresh_tokens).

### 5. Seed demo data

```bash
npm run seed
```

Creates 4 demo users (all password `Password123!`):
- `layla.hassan@eastmedical.test` — ADMIN
- `sarah.mansour@eastmedical.test` — CASE_MANAGER
- `karim.adel@eastmedical.test` — FINANCE
- `omar.naguib@eastmedical.test` — CASE_MANAGER

Plus one demo contract, provider, patient, and case.

### 6. Run the dev server

```bash
npm run dev
```

API available at `http://localhost:4000`. Try:

```bash
curl http://localhost:4000/health

curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"layla.hassan@eastmedical.test","password":"Password123!"}'
```

## Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run prisma:studio` | Open Prisma Studio (visual DB browser) |
| `npm run prisma:migrate` | Create/apply a new migration |
| `npm run seed` | Re-run the seed script |

## API endpoints (so far)

| Method | Path | Auth | Role |
|---|---|---|---|
| POST | `/api/auth/login` | none | — |
| POST | `/api/auth/refresh` | none | — |
| POST | `/api/auth/logout` | required | any |
| POST | `/api/auth/users` | required | ADMIN |
| POST | `/api/cases` | required | CASE_MANAGER, ADMIN |
| GET | `/api/cases` | required | any |
| GET | `/api/cases/:id` | required | any |
| PATCH | `/api/cases/:id` | required | CASE_MANAGER, ADMIN |
| POST | `/api/cases/:id/notes` | required | CASE_MANAGER, MEDICAL_STAFF, ADMIN |

More routes (providers, contracts, documents, financial engine, reports) are coming in the next phases.

## Notes

- Passwords are hashed with bcrypt (12 rounds).
- Every login attempt (success/failure), case create/update/view, and user creation is written to `audit_logs` — append-only, no update/delete exposed via the API.
- RBAC is enforced server-side via middleware (`requireRole`), not just hidden in the UI — this was the biggest gap in the original Lovable prototype.
- Case numbers are generated server-side (`YYYY` + 7-digit sequence), not client-generated.
