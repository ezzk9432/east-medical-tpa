# East Medical Assistance System (TPA)

A Third Party Administrator (TPA) system for managing international medical assistance cases — a real full-stack application (React frontend + Node/Express/TypeScript backend + PostgreSQL) replacing the earlier Lovable no-code prototype.

## Project structure

```
east-medical-tpa/
├── backend/     Node + Express + TypeScript + Prisma API
└── frontend/    React + Vite + TypeScript + Tailwind
```

## Status

- [x] Database schema (Prisma) covering all SRS entities: users/roles, cases, patients, contracts, providers, medical info, case services, documents, invoices, payments, audit logs
- [x] Real JWT authentication (access + refresh tokens), bcrypt password hashing
- [x] Server-enforced RBAC middleware (Case Manager, Medical Staff, Finance, Admin, Viewer)
- [x] Audit logging on create/update/view/login actions
- [x] Case management API (create/list/get/update/notes) with server-generated case numbers
- [x] Providers API (CRUD)
- [x] Contracts API (CRUD)
- [x] Case Services API + real financial calculation engine (pricing, currency conversion, discounts, deductibles, guaranteed amount cap)
- [x] Invoice generation
- [x] Payments / Money Process workflow + payment groups
- [x] Document upload (local disk storage, versioned, soft-delete) — swap to S3 for production
- [x] Reporting endpoints (dashboard summary, case aging, financial summary)
- [x] Rate limiting, helmet security headers
- [x] Seed script with demo data
- [x] **React frontend** — login, dashboard, cases (list/detail/create), providers, contracts, money process, users & roles
- [x] **Gap-closing vs. real-world TPA standard** (benchmarked against a production Dynamics 365 TPA system): case type/case type detail taxonomy, caller/intake info, geo detail (country/province/county), warranty tracking, document checklist (Yes/No flags), structured multi-diagnosis with ICD codes, case cloning, auto-generated activity timeline, documents linked to specific case services
- [ ] Deployment config
- [ ] MFA, field-level encryption, data retention rules (Phase 6 hardening)
- [ ] External integrations (payment providers, hospital systems)
- [ ] Record-level (per-case-owner) permission enforcement — currently role-level only
- [ ] Per-case PDF report export ("Run Report") — JSON endpoint exists, PDF rendering not yet built

## Quick start (both servers)

### 1. Backend

```bash
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL to a real Postgres instance, generate JWT secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000`. Health check: `GET /health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` + `/uploads` to the backend.

### 3. Log in

Open `http://localhost:5173`, log in with:

| Email | Role | Password |
|---|---|---|
| layla.hassan@eastmedical.test | ADMIN | Password123! |

See [backend/README.md](./backend/README.md) and [frontend/README.md](./frontend/README.md) for full details.
