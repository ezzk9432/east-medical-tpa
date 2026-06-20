# East Medical Assistance System (TPA)

A Third Party Administrator (TPA) system for managing international medical assistance cases, rebuilt as a real full-stack application (React frontend + Node/Express/TypeScript backend + PostgreSQL) replacing the earlier Lovable no-code prototype.

## Project structure

```
east-medical-tpa/
├── backend/     Node + Express + TypeScript + Prisma API
└── frontend/    React + Vite + TypeScript (coming next)
```

## Status

This is being built incrementally. Current state:

- [x] Database schema (Prisma) covering all SRS entities: users/roles, cases, patients, contracts, providers, medical info, case services, documents, invoices, payments, audit logs
- [x] Real JWT authentication (access + refresh tokens), bcrypt password hashing
- [x] Server-enforced RBAC middleware (Case Manager, Medical Staff, Finance, Admin, Viewer)
- [x] Audit logging on create/update/view/login actions
- [x] Case management API (create/list/get/update/notes) with server-generated case numbers
- [x] Rate limiting, helmet security headers
- [x] Seed script with demo data
- [ ] Providers, Contracts, Documents, Payment Groups APIs
- [ ] Financial calculation engine (pricing, currency conversion, invoicing)
- [ ] Document storage (file upload)
- [ ] Reporting/analytics endpoints
- [ ] React frontend
- [ ] Deployment config

## Backend setup

See [backend/README.md](./backend/README.md) for full setup instructions.

Quick start:

```bash
cd backend
cp .env.example .env
# edit .env with your real DATABASE_URL and JWT secrets
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend runs on `http://localhost:4000` by default. Health check: `GET /health`.
