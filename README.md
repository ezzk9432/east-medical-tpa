# East Medical Assistance System

**Full-stack TPA (Third Party Administrator) case management system for international medical assistance.**

> Built with: Node.js 20 · Express 5 · Prisma · PostgreSQL · React 19 · Vite · TypeScript · Tailwind CSS 4

---

## Quick start — first time on a new machine

You need two things installed: **Node.js 20+** and **PostgreSQL**.
Nothing else. Follow the steps below exactly.

---

### Step 1 — Install Node.js

Go to https://nodejs.org and download the **LTS** version. Install it, then confirm:
```bash
node --version   # should print v20.x.x or higher
npm --version    # should print 10.x.x or higher
```

---

### Step 2 — Get a PostgreSQL database

**Easiest (no install, free, 2 minutes):** Create a free database on [Neon.tech](https://neon.tech):
1. Sign up → Create project → name it `east-medical-tpa`
2. Copy the connection string — it looks like:
   `postgresql://user:password@ep-xxx.us-east-1.aws.neon.tech/east-medical-tpa?sslmode=require`

**Or run locally with Docker (if Docker is installed):**
```bash
docker run --name tpa-db \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=east_medical_tpa \
  -p 5432:5432 -d postgres:16
```
Connection string: `postgresql://postgres:password@localhost:5432/east_medical_tpa`

---

### Step 3 — Clone the project

```bash
git clone https://github.com/ezzk9432/east-medical-tpa.git
cd east-medical-tpa
```

---

### Step 4 — Generate your secrets

Run these commands and **copy the output** — you'll paste them in the next step:
```bash
openssl rand -base64 48   # paste this as JWT_ACCESS_SECRET
openssl rand -base64 48   # paste this as JWT_REFRESH_SECRET (run again, get different value)
openssl rand -base64 32   # paste this as ENCRYPTION_KEY
```

> **Windows without openssl?** Use Git Bash (installed with Git for Windows), or go to https://www.random.org/strings/ and generate 3 long random strings instead.

---

### Step 5 — Configure the backend

```bash
cd backend
cp .env.example .env
```

Open `.env` in any text editor and fill in these lines:
```env
DATABASE_URL=postgresql://...   ← paste your connection string from Step 2
JWT_ACCESS_SECRET=...           ← paste first key from Step 4
JWT_REFRESH_SECRET=...          ← paste second key from Step 4
ENCRYPTION_KEY=...              ← paste third key from Step 4
```
Leave everything else as-is for now.

---

### Step 6 — Set up and start the backend

```bash
# Still inside east-medical-tpa/backend/
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

You should see:
```
East Medical TPA backend listening on port 4000
```

Confirm it works:
```bash
curl http://localhost:4000/health
# → {"status":"ok","version":"1.0.0"}
```

---

### Step 7 — Start the frontend

Open a **second terminal** (keep the backend running):
```bash
cd east-medical-tpa/frontend
npm install
npm run dev
```

You should see:
```
VITE ready in Xs
➜  Local: http://localhost:5173/
```

---

### Step 8 — Open the app

Go to **http://localhost:5173** in your browser.

Log in with any of these accounts (all use password `Password123!`):

| Email | Role | What they can do |
|---|---|---|
| layla.hassan@eastmedical.test | ADMIN | Everything |
| sarah.mansour@eastmedical.test | CASE_MANAGER | Create/manage cases |
| karim.adel@eastmedical.test | FINANCE | Payments, invoices, reports |
| omar.naguib@eastmedical.test | CASE_MANAGER | Create/manage cases |

---

### What to try first

1. **Dashboard** — overview of all cases, payments, and urgent flags
2. **Cases → New Case** — create a case: fill patient info, contract, caller info, diagnosis
3. Open the case → **Add Service** (provider + price in/out) → **Generate Invoice** → downloads a real PDF
4. **Reports** → Export CSV or Excel of aging/financial data
5. **Users & Roles** (admin only) → create a user, assign role, test RBAC
6. **Security (2FA)** → enable MFA, log out, log back in — it will ask for the 6-digit code

---

## Run with Docker instead (everything at once)

If you have Docker and Docker Compose installed:
```bash
cd east-medical-tpa
cp .env.example .env
# Fill in .env: DB_PASSWORD, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, ENCRYPTION_KEY
docker compose up --build
```
App at `http://localhost` · API at `http://localhost:4000`

First run only:
```bash
docker compose exec backend npm run seed
```

---

## Project structure

```
east-medical-tpa/
│
├── backend/                      Node.js + Express + Prisma
│   ├── prisma/
│   │   ├── schema.prisma         Database schema (all tables)
│   │   └── seed.ts               Demo data loader
│   └── src/
│       ├── app.ts                Express app setup
│       ├── server.ts             Entry point
│       ├── config/
│       │   ├── env.ts            All environment variables (typed)
│       │   └── prisma.ts         Prisma client singleton
│       ├── controllers/          One file per feature domain
│       ├── routes/               Express router per domain
│       ├── services/
│       │   ├── encryption.service.ts   AES-256-GCM patient PII
│       │   ├── mfa.service.ts          TOTP / 2FA
│       │   ├── invoicePdf.service.ts   PDF invoice generation
│       │   ├── retention.service.ts    GDPR data purge cron
│       │   └── financial.service.ts    Pricing calculations
│       ├── middleware/           auth, RBAC, error handling
│       └── utils/                JWT, password hashing
│
├── frontend/                     React 19 + Vite + Tailwind 4
│   └── src/
│       ├── pages/                One file per screen
│       ├── components/           Shared UI components
│       ├── api/                  All backend API calls
│       ├── hooks/                useIdleTimeout, useCase
│       ├── store/                Zustand auth store
│       └── utils/                CSV/Excel export helpers
│
├── docker-compose.yml            Production-like local stack
├── .env.example                  Template for all secrets
└── SYSTEM_SUMMARY.md             Detailed feature/gap analysis
```

---

## API reference (quick)

All routes require `Authorization: Bearer <token>` except `/api/auth/login` and `/api/auth/refresh`.

| Method | Route | Role needed | What it does |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login, returns tokens (or MFA challenge) |
| POST | `/api/auth/mfa/verify` | — | Complete MFA step after login |
| GET | `/api/auth/mfa/setup` | any | Generate QR code for 2FA |
| POST | `/api/auth/mfa/verify-setup` | any | Confirm and enable 2FA |
| GET | `/api/cases` | any | List cases (search + filter + paginate) |
| POST | `/api/cases` | CASE_MANAGER | Create case + inline patient |
| GET | `/api/cases/:id` | any | Full case with services, docs, notes |
| PATCH | `/api/cases/:id` | CASE_MANAGER | Update status, contract, assignment |
| POST | `/api/cases/:id/notes` | CASE_MANAGER, MEDICAL_STAFF | Add note |
| POST | `/api/cases/:id/clone` | CASE_MANAGER | Clone case as template |
| GET | `/api/providers` | any | List providers |
| POST | `/api/providers` | CASE_MANAGER | Create provider |
| GET | `/api/contracts` | any | List contracts |
| POST | `/api/contracts` | CASE_MANAGER | Create contract |
| POST | `/api/case-services` | CASE_MANAGER, FINANCE | Add service to case |
| POST | `/api/case-services/:id/invoice` | FINANCE | Generate invoice (creates PDF) |
| POST | `/api/payments` | FINANCE | Create payment record |
| PATCH | `/api/payments/:id/status` | FINANCE | Update payment status |
| GET | `/api/reports/dashboard` | any | Dashboard summary stats |
| GET | `/api/reports/case-aging` | any | Open cases by age |
| GET | `/api/reports/financial-summary` | FINANCE, ADMIN | P&L summary |
| GET | `/api/reports/export/case-aging?format=xlsx\|csv\|pdf` | any | Download report file |
| GET | `/api/reports/export/financial?format=xlsx\|csv\|pdf` | FINANCE | Download financial report |
| POST | `/api/documents` | any | Upload document (multipart) |
| POST | `/api/integrations/webhooks/stripe` | — | Stripe payment webhook |
| POST | `/api/integrations/webhooks/paymob` | — | Paymob payment webhook |
| POST | `/api/integrations/hospital/submit-claim` | CASE_MANAGER | Submit claim to hospital system |

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for access tokens (15 min lifetime) |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens (7 days) |
| `ENCRYPTION_KEY` | ⚠️ | AES-256 key (base64, 32 bytes). Without it PII is plaintext |
| `PORT` | no | Backend port, default 4000 |
| `CORS_ORIGIN` | no | Frontend URL for CORS, default http://localhost:5173 |
| `MFA_ISSUER` | no | Name shown in authenticator apps |
| `RETENTION_DAYS` | no | Days before closed cases are anonymised, default 2555 (7 years) |
| `STRIPE_WEBHOOK_SECRET` | no | From Stripe dashboard — for payment webhooks |
| `PAYMOB_HMAC_SECRET` | no | From Paymob dashboard → Developers → HMAC Secret |
| `HOSPITAL_API_URL` | no | Hospital system base URL — falls back to mock if empty |
| `HOSPITAL_API_KEY` | no | Hospital system API key |

---

## Troubleshooting

**`prisma migrate dev` fails — "connection refused"**
→ PostgreSQL is not running, or `DATABASE_URL` is wrong. Double-check the connection string.

**`npm install` fails on `node-gyp` / `bcrypt`**
→ You need Python 3 and build tools. On Windows: `npm install --global windows-build-tools`. On Mac: `xcode-select --install`.

**Port 4000 already in use**
→ Change `PORT=4001` in `backend/.env` and update the `proxy` target in `frontend/vite.config.ts`.

**Frontend shows blank page / white screen**
→ Open browser DevTools → Console. Usually a missing env var on the backend. Check `http://localhost:4000/health` — if that 404s, the backend crashed.

**`openssl rand` not found on Windows**
→ Use Git Bash, or paste any long random string (50+ characters). They just need to be secret and unpredictable.

---

## Security notes

- Patient PII (passport, policy number, phone, email) is AES-256-GCM encrypted in the database — requires `ENCRYPTION_KEY`
- MFA (TOTP) is available per user from Security → 2FA settings
- All write endpoints are rate-limited; login is limited to 20 attempts / 15 min
- Sessions auto-expire after 30 minutes of inactivity (frontend idle detection)
- Webhook signatures are verified (Stripe HMAC-SHA256, Paymob HMAC-SHA512)
- Full audit trail on all create/update/delete/login events

---

*For the full feature analysis vs the SRS and gap breakdown, see [SYSTEM_SUMMARY.md](./SYSTEM_SUMMARY.md)*
