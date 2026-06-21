# East Medical Assistance System — Verified Status

**Last updated:** June 2026
**Stack:** Node.js + Express + TypeScript + Prisma + PostgreSQL (backend) · React + Vite + TypeScript + Tailwind v4 + TanStack Query + Zustand (frontend)

> This document reflects what has been **read, traced end-to-end, and compiled/built successfully** — not just written. Multiple AI agents have contributed to this repo across sessions; earlier drafts of this file claimed some features were "complete" when the code existed but was never wired in. This version only marks something ✅ once it's been traced from the real call site.

## How to verify this yourself
```bash
cd backend && npm install && npx prisma generate && npx tsc --noEmit
cd frontend && npm install && npm run build
```
Both complete with zero errors (the backend will show 4 errors about `@prisma/client` exports *only* if you skip `npx prisma generate` first — expected, not a bug).

---

## ✅ Verified working

### Authentication & sessions
- Email + password login, bcrypt (12 rounds)
- JWT access tokens (15 min) + refresh tokens (7 days, revocable, DB-stored)
- Auto-refresh on 401 via Axios interceptor
- Rate limiting on login (20 req / 15 min per IP)
- **TOTP-based MFA**, properly enforced at login: if `mfaEnabled` is true, login returns a 5-minute challenge token instead of real credentials; the frontend shows a 6-digit code screen; only `POST /api/auth/mfa/verify` with a valid TOTP code issues real access + refresh tokens.
- Idle session timeout: 30 minutes of inactivity → warning banner with 60-second countdown and "stay signed in" → auto-logout.

### RBAC
Five roles (`ADMIN`, `CASE_MANAGER`, `MEDICAL_STAFF`, `FINANCE`, `VIEWER`), enforced server-side via `requireRole()` middleware on every route.

### Case management
Server-generated case numbers · case type/detail/arrival-channel classification · caller/intake info · geo detail (country/province/county/district) · warranty tracking · document checklist (Yes/No flags) · structured multi-diagnosis list with ICD codes · case cloning · auto-generated activity timeline.

### Financial engine
Price In/Out, discount %, deductible %, exchange rate calculation, server-side. Guaranteed-amount cap logic against contract limits. Multi-currency (EUR/EGP/USD/GBP).

### Documents
Upload with category, versioning, soft-delete. Can be linked to a specific case service, not just the case.

### Invoicing
**Real PDF generation** (pdfkit) — letterhead, bill-to/case info, line items, totals, deductible breakdown. Generated once, cached (`pdfUrl` on the Invoice record), downloadable from the case detail page.

### Reporting
Live dashboard · case aging report (overdue flag at 30 days) · financial summary (date-range filterable) · **CSV and Excel export** on both report types (client-side, no extra backend round-trip).

### Security
- Field-level AES-256-GCM encryption for patient PII (passport, policy number, phone, email), wired into every create/read path
- Append-only audit log on create/update/view/login
- Helmet headers, CORS allowlist
- **Stripe webhook**: real signature scheme (`t=timestamp.rawBody` HMAC-SHA256, per Stripe's actual spec), 5-minute replay-window check, length-safe comparison
- **Paymob webhook**: HMAC-SHA512 verification using Paymob's documented 19-field concatenation order, rejects unsigned/invalid requests
- Data retention/anonymization service for closed cases past a configurable period

### Integrations
Hospital claim submission/status endpoints (mock mode when unconfigured, real HTTP via native `fetch` otherwise). Stripe + Paymob payment webhooks.

### Deployment
Dockerfiles for backend/frontend, `docker-compose.yml` (Postgres + backend + frontend + nginx).

### Frontend pages
Login (with MFA step) · Dashboard · Cases (list/detail/create) · Providers · Contracts · Money Process · Reports (with export) · Users & Roles · MFA Setup.

---

## ⚠️ How this got here — for transparency

Two different AI agents independently found and fixed **the same 4 critical bugs** in roughly the same session, working from the same starting commit without knowing about each other:

1. **Patient PII encryption was never called** — the service existed, the schema had comments claiming it was active, but `case.controller.ts` never imported or invoked it. PII was stored in plaintext.
2. **MFA was decorative** — `login()` never checked `user.mfaEnabled`, so enabling MFA gave zero actual protection.
3. **Stripe webhook crashed on every real call** — `crypto.timingSafeEqual()` throws on length-mismatched buffers, and the signature format being compared was wrong in the first place (not Stripe's real `t=/v1=` scheme).
4. **Paymob webhook had zero signature verification** — anyone who found the URL could forge a "payment succeeded" event and mark any payment as PAID. Direct financial fraud vector, not a style issue.

When the two fixes collided as separate commits, they were compared line-by-line before merging. The second agent's implementation of the Stripe/Paymob fixes was more complete (correct field names, proper Stripe timestamp-signing scheme, replay protection) and was kept as the base; the invoice PDF generation, session idle-timeout, and report export work from the first pass were layered on top of it.

**Lesson applied:** a feature is only "done" once it's traced from where it's actually called, not just because the file exists in the repo. This applies doubly to security-relevant code.

---

## ❌ Not yet built
- Record-level (per-case-owner) permission enforcement — currently role-level only
- MFA backup codes are generated at setup but not yet consumable as a login fallback
- No automated test suite
- No CI/CD pipeline
- `xlsx` (SheetJS) has a known, unpatched advisory (prototype pollution / ReDoS) when *parsing* untrusted files — low risk here since this codebase only *writes* export files from trusted data, but worth knowing before using it elsewhere
