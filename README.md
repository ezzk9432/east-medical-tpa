# East Medical Assistance System (TPA)

A Third Party Administrator (TPA) system for managing international medical assistance cases — full-stack: React frontend + Node/Express/TypeScript backend + PostgreSQL.

For a detailed, audited breakdown of what's implemented (and what was found broken and fixed along the way), see **[SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md)**.

## Project structure
```
east-medical-tpa/
├── backend/     Node + Express + TypeScript + Prisma API
└── frontend/    React + Vite + TypeScript + Tailwind
```

---

## Run it on your machine

You need: **Node.js 18+**, **npm**, and a **PostgreSQL database** (local install, Docker, or a free cloud one like Supabase/Neon).

### Option A — Docker (easiest, runs everything at once)
```bash
git clone https://github.com/ezzk9432/east-medical-tpa.git
cd east-medical-tpa
cp .env.example .env
# generate secrets and paste them into .env — see "Generating secrets" below
docker compose up --build
```
Frontend at `http://localhost`, backend at `http://localhost:4000`.

### Option B — Run backend and frontend separately (better for development)

**1. Install Node.js** if you don't have it: https://nodejs.org (get the LTS version).

**2. Get a Postgres database.** Easiest: [Neon](https://neon.tech) or [Supabase](https://supabase.com) — free tier, no install, ~2 minutes. Copy the connection string. (Or run locally: `docker run --name tpa-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=east_medical_tpa -p 5432:5432 -d postgres:16`.)

**3. Backend setup:**
```bash
git clone https://github.com/ezzk9432/east-medical-tpa.git
cd east-medical-tpa/backend
cp .env.example .env
```
Edit `.env`:
- `DATABASE_URL` → your Postgres connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → run `openssl rand -base64 48` twice, paste each
- `ENCRYPTION_KEY` → run `openssl rand -base64 32`, paste it (without this, patient PII is stored unencrypted — fine for local testing only)
- Leave `STRIPE_WEBHOOK_SECRET`, `PAYMOB_*`, `HOSPITAL_*` blank unless testing those — they fall back to mock mode

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Backend runs on `http://localhost:4000`. Check: `curl http://localhost:4000/health`.

**4. Frontend setup (new terminal):**
```bash
cd east-medical-tpa/frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`, proxies API calls to the backend automatically.

**5. Log in at `http://localhost:5173`:**

| Email | Role | Password |
|---|---|---|
| layla.hassan@eastmedical.test | ADMIN | Password123! |
| sarah.mansour@eastmedical.test | CASE_MANAGER | Password123! |
| karim.adel@eastmedical.test | FINANCE | Password123! |

---

## Generating secrets
```bash
openssl rand -base64 48   # JWT secrets — run twice
openssl rand -base64 32   # Encryption key — must be exactly this
```
No `openssl` on Windows? Use Git Bash (comes with Git for Windows) or WSL.

---

## What to click through to test it
1. Log in as ADMIN
2. **Dashboard** — live counts (small/zero until you add data)
3. **Cases → New case** — fill patient info, case type, caller info, submit
4. Open the case → add a diagnosis, add a case service (provider + price in/out), **generate an invoice** (real PDF download), upload a document
5. **Reports** → switch tabs, try **Export CSV** / **Export Excel**
6. **Users & Roles** (admin only) → create a user, assign a role; log out and back in as them to confirm RBAC
7. **Security (2FA)** → set up MFA, log out, log back in — should prompt for a 6-digit code before granting access

## Status
See [SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md) for the full audited breakdown.
